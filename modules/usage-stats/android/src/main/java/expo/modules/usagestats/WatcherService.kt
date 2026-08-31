package expo.modules.usagestats

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import kotlin.random.Random

/**
 * Foreground service that polls the current foreground app every POLL_MS and,
 * once a watched app has been continuously in front for the configured
 * threshold, slaps a full-screen sarcastic overlay on top of it.
 *
 * Runs entirely natively — no JS needed — so it survives the RN app being
 * swiped away from recents.
 */
class WatcherService : Service() {

  companion object {
    @Volatile var isRunning = false
      private set

    private const val POLL_MS = 5000L
    private const val CHANNEL_ID = "later_me_watcher"
    private const val NOTIFICATION_ID = 4242
  }

  private val handler = Handler(Looper.getMainLooper())
  private var overlayView: View? = null

  // Session tracking
  private var currentWatched: String? = null
  private var continuousMs = 0L
  private var lastTickAt = 0L
  private var cooldownUntil = 0L
  private var sessionTriggers = 0

  private val ticker = object : Runnable {
    override fun run() {
      try {
        tick()
      } finally {
        handler.postDelayed(this, POLL_MS)
      }
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    isRunning = true
    createChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    startInForeground()
    lastTickAt = System.currentTimeMillis()
    handler.removeCallbacks(ticker)
    handler.post(ticker)
    return START_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacks(ticker)
    removeOverlay()
    isRunning = false
    super.onDestroy()
  }

  // ---- Core loop ----

  private fun tick() {
    val now = System.currentTimeMillis()
    val config = Prefs.getConfig(this)

    // "Not today" pause: stand down completely.
    if (Prefs.getPausedUntil(this) > now) {
      resetSession()
      removeOverlay()
      return
    }

    val fg = try {
      UsageQueries.foregroundApp(this)
    } catch (e: Exception) {
      null // usage access revoked mid-run, etc.
    }
    android.util.Log.d("LaterMe", "tick fg=$fg watched=$currentWatched continuousMs=$continuousMs")

    if (fg != null && fg in config.watchedPackages) {
      if (fg == currentWatched) {
        continuousMs += now - lastTickAt
      } else {
        currentWatched = fg
        continuousMs = 0L
        sessionTriggers = 0
      }
      val thresholdMs = config.thresholdSeconds * 1000L
      if (continuousMs >= thresholdMs && now >= cooldownUntil && overlayView == null) {
        showOverlay(config)
      }
    } else if (fg != null && fg != packageName) {
      // User genuinely left the watched app for another app — session over.
      // (Our own overlay does not change the foreground app, and `fg == null`
      // just means no recent events, so both leave the session alone.)
      resetSession()
      removeOverlay()
    }
    lastTickAt = now
  }

  private fun resetSession() {
    currentWatched = null
    continuousMs = 0L
    sessionTriggers = 0
  }

  // ---- Overlay ----

  private fun showOverlay(config: WatcherConfig) {
    val wm = getSystemService(WINDOW_SERVICE) as WindowManager

    val tier = minOf(sessionTriggers, 2)
    sessionTriggers += 1
    val roast = pickRoast(tier)

    val dp = resources.displayMetrics.density
    fun pad(v: Int) = (v * dp).toInt()

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setBackgroundColor(Color.parseColor("#F20B0B10"))
      setPadding(pad(28), pad(28), pad(28), pad(28))
    }

    fun text(value: String, sizeSp: Float, color: Int, bold: Boolean = false, topMargin: Int = 0) =
      TextView(this).apply {
        text = value
        setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
        setTextColor(color)
        gravity = Gravity.CENTER
        if (bold) typeface = Typeface.DEFAULT_BOLD
        layoutParams = LinearLayout.LayoutParams(
          LinearLayout.LayoutParams.MATCH_PARENT,
          LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { setMargins(0, pad(topMargin), 0, 0) }
      }

    val sessionMin = (continuousMs / 60000L).toInt().coerceAtLeast(1)
    val headline = when (tier) {
      0 -> "👀 Still here?"
      1 -> "🙃 Again."
      else -> "💀 Okay. Intervention."
    }

    root.addView(text(headline, 30f, Color.WHITE, bold = true))
    root.addView(
      text(
        roast.replace("{sessionMinutes}", sessionMin.toString()),
        19f, Color.parseColor("#E8E8F0"), topMargin = 20
      )
    )
    if (config.goalLabel.isNotBlank()) {
      root.addView(
        text(
          "Remember: “${config.goalLabel}”",
          14f, Color.parseColor("#9A9AAE"), topMargin = 16
        )
      )
    }

    // Primary: leave the app.
    val leaveBtn = text("Fine, I'm out →", 18f, Color.parseColor("#0B0B10"), bold = true, topMargin = 32).apply {
      setBackgroundColor(Color.parseColor("#7CF29C"))
      setPadding(pad(20), pad(14), pad(20), pad(14))
      setOnClickListener {
        removeOverlay()
        resetSession()
        cooldownUntil = System.currentTimeMillis() + config.cooldownSeconds * 1000L
        startActivity(
          Intent(Intent.ACTION_MAIN)
            .addCategory(Intent.CATEGORY_HOME)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
      }
    }
    root.addView(leaveBtn)

    // Secondary: dismiss, with shame.
    val dismissLabel = when (tier) {
      0 -> "5 more minutes (sure)"
      1 -> "keep scrolling, I guess"
      else -> "I have made my choice"
    }
    val dismissBtn = text(dismissLabel, 14f, Color.parseColor("#8888A0"), topMargin = 18).apply {
      setPadding(pad(12), pad(10), pad(12), pad(10))
      setOnClickListener {
        removeOverlay()
        // Keep the session counter — next trigger escalates.
        continuousMs = 0L
        cooldownUntil = System.currentTimeMillis() + config.cooldownSeconds * 1000L
      }
    }
    root.addView(dismissBtn)

    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.MATCH_PARENT,
      if (Build.VERSION.SDK_INT >= 26) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE,
      WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
      PixelFormat.TRANSLUCENT
    )

    try {
      wm.addView(root, params)
      overlayView = root
    } catch (e: Exception) {
      // Overlay permission revoked — nothing to do until re-granted.
    }
  }

  private fun removeOverlay() {
    val view = overlayView ?: return
    overlayView = null
    try {
      (getSystemService(WINDOW_SERVICE) as WindowManager).removeView(view)
    } catch (e: Exception) {
      // Already detached.
    }
  }

  private fun pickRoast(tier: Int): String {
    val tiers = Prefs.getRoastTiers(this)
    val fallback = "That's {sessionMinutes} min of scrolling. Your goal sends its regards."
    if (tiers.isEmpty()) return fallback
    val lines = tiers.getOrNull(tier.coerceAtMost(tiers.size - 1)) ?: return fallback
    if (lines.isEmpty()) return fallback
    return lines[Random.nextInt(lines.size)]
  }

  // ---- Foreground notification ----

  private fun createChannel() {
    if (Build.VERSION.SDK_INT >= 26) {
      val channel = NotificationChannel(
        CHANNEL_ID, "Distraction watcher", NotificationManager.IMPORTANCE_LOW
      ).apply { description = "Persistent notification while Later Me is watching for doom-scrolling." }
      (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(channel)
    }
  }

  private fun startInForeground() {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val contentIntent = launchIntent?.let {
      PendingIntent.getActivity(
        this, 0, it,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }

    val builder = if (Build.VERSION.SDK_INT >= 26) {
      Notification.Builder(this, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION") Notification.Builder(this)
    }
    val notification = builder
      .setContentTitle("Later Me is watching 👀")
      .setContentText("Doom-scroll and find out.")
      .setSmallIcon(applicationInfo.icon)
      .setContentIntent(contentIntent)
      .setOngoing(true)
      .build()

    if (Build.VERSION.SDK_INT >= 34) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }
}
