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
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import kotlin.math.roundToLong
import kotlin.random.Random

/**
 * Polls usage events every POLL_MS on its own thread and, when TriggerPolicy says so, delivers a
 * callout as a full-screen overlay or a notification. Runs without JS, so it survives the app
 * being swiped away; BootReceiver restarts it after a reboot or an app update.
 */
class WatcherService : Service() {

  companion object {
    @Volatile var isRunning = false
      private set

    private const val POLL_MS = 5000L
    private const val LIMIT_RECOMPUTE_MS = 60_000L
    private const val DAY_MS = 24 * 60 * 60 * 1000L
    private const val PRIME_WINDOW_MS = 60 * 60 * 1000L
    private const val CHANNEL_ID = "later_me_watcher"
    private const val NOTIFICATION_ID = 4242
    private const val CALLOUT_NOTIFICATION_ID = 5100

    private val BG = Color.parseColor("#F20B0D12")
    private val TEXT = Color.parseColor("#F5F7FA")
    private val TEXT_2 = Color.parseColor("#9AA3B2")
    private val ACCENT = Color.parseColor("#8B7CFF")
    private val ON_ACCENT = Color.parseColor("#0B0D12")
    private val SARCASM = Color.parseColor("#FF7A59")
  }

  private val mainHandler = Handler(Looper.getMainLooper())
  private lateinit var tickThread: HandlerThread
  private lateinit var tickHandler: Handler

  // Touched only on the tick thread.
  private val session = WatcherSession()
  private val tracker = ForegroundTracker()
  private var primed = false
  private var lastQueryMs = 0L
  private var lastTickMs = 0L
  private var todayTrackedMs = 0L
  private var todayTrackedAt = 0L
  private var todayTrackedDay = ""

  // overlayView is touched only on the main thread; overlayShowing is read by the tick thread.
  private var overlayView: View? = null
  @Volatile private var overlayShowing = false

  private val ticker = object : Runnable {
    override fun run() {
      try {
        tick()
      } catch (e: Exception) {
        // A failed tick (revoked access, OEM quirk) must not stop the watcher.
      } finally {
        tickHandler.postDelayed(this, POLL_MS)
      }
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    isRunning = true
    createChannels()
    tickThread = HandlerThread("LaterMeWatcher").also { it.start() }
    tickHandler = Handler(tickThread.looper)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    startInForeground()
    tickHandler.removeCallbacks(ticker)
    tickHandler.post {
      val now = System.currentTimeMillis()
      if (!primed) {
        tracker.apply(UsageQueries.fgEvents(this, now - PRIME_WINDOW_MS, now))
        lastQueryMs = now
        primed = true
      }
      lastTickMs = now
      session.start(now)
    }
    tickHandler.post(ticker)
    return START_STICKY
  }

  override fun onDestroy() {
    tickHandler.removeCallbacksAndMessages(null)
    tickThread.quitSafely()
    hideOverlay()
    isRunning = false
    super.onDestroy()
  }

  // ---- Core loop (tick thread) ----

  private fun tick() {
    val now = System.currentTimeMillis()
    val delta = now - lastTickMs
    lastTickMs = now
    val config = Prefs.getConfig(this)
    val pausedUntil = Prefs.getPausedUntil(this)

    if (pausedUntil > now) {
      session.reset()
      mainHandler.post { hideOverlay() }
      return
    }

    tracker.apply(UsageQueries.fgEvents(this, lastQueryMs, now))
    lastQueryMs = now
    val dayKey = UsageQueries.dayKey(now)
    session.onTick(now, tracker.current, tracker.screenOff, dayKey, config.watchedPackages, packageName)

    val inTracked = session.currentPkg != null
    if (!inTracked && overlayShowing) mainHandler.post { hideOverlay() }

    val limitFiredToday = Prefs.getLimitFiredDay(this) == dayKey
    if (config.dailyLimitMinutes > 0 && inTracked && !limitFiredToday) {
      if (todayTrackedDay != dayKey || now - todayTrackedAt >= LIMIT_RECOMPUTE_MS) {
        todayTrackedMs = UsageQueries.trackedTodayMs(this, config.watchedPackages.toSet(), now)
        todayTrackedAt = now
        todayTrackedDay = dayKey
      } else {
        todayTrackedMs += delta
      }
    }

    val decision = TriggerPolicy.decide(
      TriggerInput(
        nowMs = now,
        inTrackedApp = inTracked,
        continuousMs = session.continuousMs,
        thresholdMs = (config.thresholdSeconds * 1000).roundToLong(),
        cooldownUntilMs = session.cooldownUntilMs,
        overlayShowing = overlayShowing,
        todayTrackedMs = todayTrackedMs,
        dailyLimitMs = config.dailyLimitMinutes * 60_000L,
        dailyLimitFiredToday = limitFiredToday,
        pausedUntilMs = pausedUntil,
      ),
    )
    val cooldownMs = config.cooldownSeconds * 1000L
    val pools = Prefs.getRoastPools(this)

    when (decision) {
      TriggerKind.CONTINUOUS -> {
        val tier = TriggerPolicy.tier(session.sessionTriggers)
        val line = pick(pools.tiers.getOrNull(minOf(tier, pools.tiers.size - 1)))
        deliver(config, headlineFor(tier), line, dismissLabelFor(tier), now)
        session.onCallout(now, cooldownMs)
      }
      TriggerKind.DAILY_LIMIT -> {
        deliver(config, "Daily limit reached.", pick(pools.limit), "I know, keep going", now)
        session.onLimitCallout(now, cooldownMs)
        Prefs.setLimitFiredDay(this, dayKey)
      }
      TriggerKind.NONE -> Unit
    }
  }

  private fun pick(lines: List<String>?): String =
    if (lines.isNullOrEmpty()) "That's {sessionMinutes} minutes of scrolling. Your quest sends its regards."
    else lines[Random.nextInt(lines.size)]

  private fun headlineFor(tier: Int) = when (tier) {
    0 -> "Still here?"
    1 -> "Again."
    else -> "Okay. Intervention."
  }

  private fun dismissLabelFor(tier: Int) = when (tier) {
    0 -> "5 more minutes (sure)"
    1 -> "keep scrolling, I guess"
    else -> "I have made my choice"
  }

  private fun fill(template: String, config: WatcherConfig, now: Long): String {
    val sessionMin = (session.continuousMs / 60_000L).coerceAtLeast(1L)
    val todayMin = UsageQueries.trackedTodayMs(this, config.watchedPackages.toSet(), now) / 60_000L
    // Rounding over midnights absorbs DST's 23/25-hour days.
    val daysLeft = if (config.targetDateMs > 0) {
      Math.round((config.targetDateMs - UsageQueries.localMidnight(now)).toDouble() / DAY_MS).coerceAtLeast(0L)
    } else {
      0L
    }
    return CalloutText.fill(template, sessionMin, todayMin, daysLeft)
  }

  private fun deliver(config: WatcherConfig, headline: String, template: String, dismissLabel: String, now: Long) {
    val text = fill(template, config, now)
    val cooldownMs = config.cooldownSeconds * 1000L
    when (TriggerPolicy.delivery(config.sarcasmLevel, Settings.canDrawOverlays(this))) {
      Delivery.OVERLAY -> {
        overlayShowing = true
        mainHandler.post { showOverlay(headline, text, config.goalLabel, dismissLabel, cooldownMs) }
      }
      Delivery.NOTIFICATION -> postCallout(headline, text)
    }
  }

  // ---- Overlay (main thread) ----

  private fun showOverlay(headline: String, text: String, goalLabel: String, dismissLabel: String, cooldownMs: Long) {
    if (overlayView != null) return
    val wm = getSystemService(WINDOW_SERVICE) as WindowManager
    val dp = resources.displayMetrics.density
    fun px(v: Int) = (v * dp).toInt()

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setBackgroundColor(BG)
      setPadding(px(28), px(28), px(28), px(28))
    }

    fun label(value: String, sizeSp: Float, color: Int, bold: Boolean = false, top: Int = 0) =
      TextView(this).apply {
        this.text = value
        setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
        setTextColor(color)
        gravity = Gravity.CENTER
        if (bold) typeface = Typeface.DEFAULT_BOLD
        setLineSpacing(0f, 1.2f)
        layoutParams = LinearLayout.LayoutParams(
          LinearLayout.LayoutParams.MATCH_PARENT,
          LinearLayout.LayoutParams.WRAP_CONTENT,
        ).apply { setMargins(0, px(top), 0, 0) }
      }

    root.addView(label("Observation", 13f, SARCASM, bold = true).apply { letterSpacing = 0.06f })
    root.addView(label(headline, 30f, TEXT, bold = true, top = 10))
    root.addView(label(text, 18f, TEXT, top = 18))
    if (goalLabel.isNotBlank()) root.addView(label("Focus quest · $goalLabel", 13f, TEXT_2, top = 16))

    root.addView(label("Fine, I'm out", 17f, ON_ACCENT, bold = true, top = 36).apply {
      background = GradientDrawable().apply {
        setColor(ACCENT)
        cornerRadius = 12 * dp
      }
      setPadding(px(20), px(15), px(20), px(15))
      setOnClickListener {
        hideOverlay()
        val at = System.currentTimeMillis()
        tickHandler.post { session.onLeave(at, cooldownMs) }
        startActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
    })

    root.addView(label(dismissLabel, 14f, TEXT_2, top = 14).apply {
      setPadding(px(12), px(12), px(12), px(12))
      setOnClickListener {
        hideOverlay()
        val at = System.currentTimeMillis()
        tickHandler.post { session.onDismiss(at, cooldownMs) }
      }
    })

    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.MATCH_PARENT,
      if (Build.VERSION.SDK_INT >= 26) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE,
      WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
      PixelFormat.TRANSLUCENT,
    )
    try {
      wm.addView(root, params)
      overlayView = root
    } catch (e: Exception) {
      overlayShowing = false
    }
  }

  private fun hideOverlay() {
    val view = overlayView
    overlayView = null
    overlayShowing = false
    if (view == null) return
    try {
      (getSystemService(WINDOW_SERVICE) as WindowManager).removeView(view)
    } catch (e: Exception) {
      // Already detached.
    }
  }

  // ---- Notifications ----

  private fun createChannels() {
    if (Build.VERSION.SDK_INT < 26) return
    val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
    nm.createNotificationChannel(
      NotificationChannel(CHANNEL_ID, "Distraction watcher", NotificationManager.IMPORTANCE_LOW).apply {
        description = "Persistent notification while Later Me is watching for doom-scrolling."
      },
    )
    nm.createNotificationChannel(
      NotificationChannel(Permissions.CALLOUT_CHANNEL_ID, "Callouts", NotificationManager.IMPORTANCE_HIGH).apply {
        description = "Gentle-level callouts, and callouts when the overlay is not allowed."
      },
    )
  }

  private fun builder(channel: String): Notification.Builder =
    if (Build.VERSION.SDK_INT >= 26) Notification.Builder(this, channel) else @Suppress("DEPRECATION") Notification.Builder(this)

  private fun openAppIntent(): PendingIntent? = packageManager.getLaunchIntentForPackage(packageName)?.let {
    PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun postCallout(headline: String, text: String) {
    if (!Permissions.canPostCallouts(this)) return
    val notification = builder(Permissions.CALLOUT_CHANNEL_ID)
      .setContentTitle(headline)
      .setContentText(text)
      .setStyle(Notification.BigTextStyle().bigText(text))
      .setSmallIcon(applicationInfo.icon)
      .setContentIntent(openAppIntent())
      .setAutoCancel(true)
      .build()
    (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).notify(CALLOUT_NOTIFICATION_ID, notification)
  }

  private fun startInForeground() {
    val notification = builder(CHANNEL_ID)
      .setContentTitle("Later Me is watching")
      .setContentText("Doom-scroll and find out.")
      .setSmallIcon(applicationInfo.icon)
      .setContentIntent(openAppIntent())
      .setOngoing(true)
      .build()
    if (Build.VERSION.SDK_INT >= 34) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }
}
