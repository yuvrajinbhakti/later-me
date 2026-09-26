package expo.modules.usagestats

import android.app.AppOpsManager
import android.app.NotificationManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.os.Process
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

/**
 * Shared state between the JS-facing module, the WatcherService and the BootReceiver.
 * Everything the service needs lives here so it can run with no JS runtime alive.
 */
object Prefs {
  private const val NAME = "later_me_watcher"
  private const val KEY_CONFIG = "config_json"
  private const val KEY_ROASTS = "roasts_json"
  private const val KEY_PAUSED_UNTIL = "paused_until"
  private const val KEY_ALERTS_ENABLED = "alerts_enabled"
  private const val KEY_LIMIT_FIRED_DAY = "limit_fired_day"

  private fun sp(context: Context): SharedPreferences = context.getSharedPreferences(NAME, Context.MODE_PRIVATE)

  fun setConfig(context: Context, json: String) = sp(context).edit().putString(KEY_CONFIG, json).apply()

  fun getConfig(context: Context): WatcherConfig {
    val raw = sp(context).getString(KEY_CONFIG, null) ?: return WatcherConfig()
    return try {
      val obj = JSONObject(raw)
      val arr = obj.optJSONArray("watchedPackages") ?: JSONArray()
      WatcherConfig(
        watchedPackages = List(arr.length()) { arr.getString(it) },
        thresholdSeconds = obj.optDouble("thresholdSeconds", 600.0),
        cooldownSeconds = obj.optInt("cooldownSeconds", 120),
        goalLabel = obj.optString("goalLabel", ""),
        sarcasmLevel = obj.optString("sarcasmLevel", "normal"),
        dailyLimitMinutes = obj.optInt("dailyLimitMinutes", 0),
        targetDateMs = obj.optLong("targetDateMs", 0L),
      )
    } catch (e: Exception) {
      WatcherConfig()
    }
  }

  fun setRoasts(context: Context, json: String) = sp(context).edit().putString(KEY_ROASTS, json).apply()

  /** Accepts `{tiers, limit}` and the Phase 1 array-of-tiers format still stored until the first sync. */
  fun getRoastPools(context: Context): RoastPools {
    val raw = sp(context).getString(KEY_ROASTS, null) ?: return RoastPools(emptyList(), emptyList())
    fun strings(a: JSONArray?) = if (a == null) emptyList() else List(a.length()) { a.getString(it) }
    fun tiers(a: JSONArray?) = if (a == null) emptyList() else List(a.length()) { strings(a.getJSONArray(it)) }
    return try {
      if (raw.trimStart().startsWith("[")) {
        RoastPools(tiers(JSONArray(raw)), emptyList())
      } else {
        val obj = JSONObject(raw)
        RoastPools(tiers(obj.optJSONArray("tiers")), strings(obj.optJSONArray("limit")))
      }
    } catch (e: Exception) {
      RoastPools(emptyList(), emptyList())
    }
  }

  fun setPausedUntil(context: Context, epochMs: Long) = sp(context).edit().putLong(KEY_PAUSED_UNTIL, epochMs).apply()
  fun getPausedUntil(context: Context): Long = sp(context).getLong(KEY_PAUSED_UNTIL, 0L)

  fun setAlertsEnabled(context: Context, enabled: Boolean) =
    sp(context).edit().putBoolean(KEY_ALERTS_ENABLED, enabled).apply()
  fun getAlertsEnabled(context: Context): Boolean = sp(context).getBoolean(KEY_ALERTS_ENABLED, false)

  fun setLimitFiredDay(context: Context, dayKey: String) =
    sp(context).edit().putString(KEY_LIMIT_FIRED_DAY, dayKey).apply()
  fun getLimitFiredDay(context: Context): String? = sp(context).getString(KEY_LIMIT_FIRED_DAY, null)
}

data class WatcherConfig(
  val watchedPackages: List<String> = listOf("com.instagram.android"),
  val thresholdSeconds: Double = 600.0,
  val cooldownSeconds: Int = 120,
  val goalLabel: String = "",
  val sarcasmLevel: String = "normal",
  /** 0 means no daily limit. */
  val dailyLimitMinutes: Int = 0,
  /** Focus quest's target at local midnight; 0 when there is no focus quest. */
  val targetDateMs: Long = 0L,
)

data class RoastPools(val tiers: List<List<String>>, val limit: List<String>)

object Permissions {
  const val CALLOUT_CHANNEL_ID = "later_me_callouts"

  fun hasUsageAccess(context: Context): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= 29) {
      appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    } else {
      @Suppress("DEPRECATION")
      appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  /** A muted app or callout channel would swallow gentle callouts silently; a missing channel is fine. */
  fun canPostCallouts(context: Context): Boolean {
    val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (!nm.areNotificationsEnabled()) return false
    if (Build.VERSION.SDK_INT >= 26) {
      val channel = nm.getNotificationChannel(CALLOUT_CHANNEL_ID)
      if (channel != null && channel.importance == NotificationManager.IMPORTANCE_NONE) return false
    }
    return true
  }
}

object UsageQueries {
  private const val HOUR_MS = 60 * 60 * 1000L

  private fun usm(context: Context): UsageStatsManager =
    context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

  fun localMidnight(nowMs: Long): Long = Calendar.getInstance().apply {
    timeInMillis = nowMs
    set(Calendar.HOUR_OF_DAY, 0)
    set(Calendar.MINUTE, 0)
    set(Calendar.SECOND, 0)
    set(Calendar.MILLISECOND, 0)
  }.timeInMillis

  fun dayKey(nowMs: Long): String {
    val c = Calendar.getInstance().apply { timeInMillis = nowMs }
    return "%04d-%02d-%02d".format(c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH))
  }

  private fun toFgEvent(e: UsageEvents.Event): FgEvent? {
    val kind = when (e.eventType) {
      UsageEvents.Event.ACTIVITY_RESUMED -> FgKind.RESUMED
      UsageEvents.Event.ACTIVITY_PAUSED -> FgKind.PAUSED
      else -> when {
        Build.VERSION.SDK_INT >= 28 && e.eventType == UsageEvents.Event.SCREEN_NON_INTERACTIVE -> FgKind.SCREEN_OFF
        Build.VERSION.SDK_INT >= 28 && e.eventType == UsageEvents.Event.SCREEN_INTERACTIVE -> FgKind.SCREEN_ON
        else -> null
      }
    } ?: return null
    return FgEvent(kind, e.packageName ?: "", e.className, e.timeStamp)
  }

  fun fgEvents(context: Context, beginMs: Long, endMs: Long): List<FgEvent> {
    val out = ArrayList<FgEvent>()
    val events = usm(context).queryEvents(beginMs, endMs)
    val event = UsageEvents.Event()
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      toFgEvent(event)?.let { out.add(it) }
    }
    return out
  }

  /** Foreground app right now, from the last hour of events. */
  fun foregroundApp(context: Context): String? {
    val now = System.currentTimeMillis()
    return ForegroundTracker().apply { apply(fgEvents(context, now - HOUR_MS, now)) }.current
  }

  /** Looks back 12 h before midnight so a session begun yesterday evening is clipped, not dropped. */
  fun trackedMsBetween(context: Context, packages: Set<String>, fromMs: Long, toMs: Long): Long =
    UsageMath.trackedMsBetween(fgEvents(context, fromMs - 12 * HOUR_MS, toMs), fromMs, toMs, packages)

  fun trackedTodayMs(context: Context, packages: Set<String>, nowMs: Long): Long =
    trackedMsBetween(context, packages, localMidnight(nowMs), nowMs)

  /** Raw resume/pause events for the given packages, plus the earliest event of any app in range. */
  fun eventsForJs(context: Context, beginMs: Long, endMs: Long, packages: Set<String>): Pair<List<Map<String, Any>>, Long?> {
    val out = ArrayList<Map<String, Any>>()
    var earliest: Long? = null
    val events = usm(context).queryEvents(beginMs, endMs)
    val event = UsageEvents.Event()
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      if (earliest == null) earliest = event.timeStamp
      val pkg = event.packageName ?: continue
      if (pkg !in packages) continue
      val type = when (event.eventType) {
        UsageEvents.Event.ACTIVITY_RESUMED -> "resumed"
        UsageEvents.Event.ACTIVITY_PAUSED -> "paused"
        else -> continue
      }
      out.add(mapOf("pkg" to pkg, "type" to type, "ts" to event.timeStamp.toDouble()))
    }
    return Pair(out, earliest)
  }
}
