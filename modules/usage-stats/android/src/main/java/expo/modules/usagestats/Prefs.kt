package expo.modules.usagestats

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

/**
 * Shared state between the JS-facing module and the WatcherService.
 * Everything the service needs must live here (as primitives/JSON) so the
 * service can run with no JS runtime alive.
 */
object Prefs {
  private const val NAME = "later_me_watcher"

  const val KEY_CONFIG = "config_json"
  const val KEY_ROASTS = "roasts_json"
  const val KEY_PAUSED_UNTIL = "paused_until"

  fun sp(context: Context): SharedPreferences =
    context.getSharedPreferences(NAME, Context.MODE_PRIVATE)

  fun setConfig(context: Context, json: String) =
    sp(context).edit().putString(KEY_CONFIG, json).apply()

  fun getConfig(context: Context): WatcherConfig {
    val raw = sp(context).getString(KEY_CONFIG, null) ?: return WatcherConfig()
    return try {
      val obj = JSONObject(raw)
      val pkgs = mutableListOf<String>()
      val arr = obj.optJSONArray("watchedPackages") ?: JSONArray()
      for (i in 0 until arr.length()) pkgs.add(arr.getString(i))
      WatcherConfig(
        watchedPackages = pkgs,
        thresholdSeconds = obj.optInt("thresholdSeconds", 600),
        cooldownSeconds = obj.optInt("cooldownSeconds", 120),
        goalLabel = obj.optString("goalLabel", ""),
      )
    } catch (e: Exception) {
      WatcherConfig()
    }
  }

  fun setRoasts(context: Context, json: String) =
    sp(context).edit().putString(KEY_ROASTS, json).apply()

  /** Roasts are a JSON array of arrays: tiers[tier][line]. Already template-filled by JS. */
  fun getRoastTiers(context: Context): List<List<String>> {
    val raw = sp(context).getString(KEY_ROASTS, null) ?: return emptyList()
    return try {
      val tiers = mutableListOf<List<String>>()
      val arr = JSONArray(raw)
      for (i in 0 until arr.length()) {
        val tierArr = arr.getJSONArray(i)
        val lines = mutableListOf<String>()
        for (j in 0 until tierArr.length()) lines.add(tierArr.getString(j))
        tiers.add(lines)
      }
      tiers
    } catch (e: Exception) {
      emptyList()
    }
  }

  fun setPausedUntil(context: Context, epochMs: Long) =
    sp(context).edit().putLong(KEY_PAUSED_UNTIL, epochMs).apply()

  fun getPausedUntil(context: Context): Long = sp(context).getLong(KEY_PAUSED_UNTIL, 0L)
}

data class WatcherConfig(
  val watchedPackages: List<String> = listOf("com.instagram.android"),
  val thresholdSeconds: Int = 600,
  val cooldownSeconds: Int = 120,
  val goalLabel: String = "",
)

/** UsageStatsManager queries shared by the module and the service. */
object UsageQueries {

  private fun usm(context: Context): UsageStatsManager =
    context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

  /**
   * The package currently in the foreground, derived from the most recent
   * ACTIVITY_RESUMED event in the last hour. Null if nothing found.
   *
   * Only RESUMED/PAUSED are considered. ACTIVITY_STOPPED is deliberately
   * ignored: during in-app activity transitions (and app switches) the old
   * activity's STOPPED arrives AFTER the new activity's RESUMED, so treating
   * it as "left the app" produces false nulls. PAUSED always precedes the
   * next RESUMED in the lifecycle, so it is safe as a "maybe left" marker.
   */
  fun foregroundApp(context: Context): String? {
    val now = System.currentTimeMillis()
    val events = usm(context).queryEvents(now - 60 * 60 * 1000L, now)
    val event = UsageEvents.Event()
    var lastResumed: String? = null
    var lastResumedClass: String? = null
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      when (event.eventType) {
        UsageEvents.Event.ACTIVITY_RESUMED -> {
          lastResumed = event.packageName
          lastResumedClass = event.className
        }
        UsageEvents.Event.ACTIVITY_PAUSED ->
          if (event.packageName == lastResumed && event.className == lastResumedClass) {
            lastResumed = null
            lastResumedClass = null
          }
      }
    }
    return lastResumed
  }

  /**
   * Foreground milliseconds per package since local midnight, computed from
   * resume/pause event intervals (the daily buckets from queryUsageStats are
   * notoriously inaccurate).
   */
  fun usageTodayMs(context: Context, packages: Set<String>): Map<String, Long> {
    val cal = Calendar.getInstance().apply {
      set(Calendar.HOUR_OF_DAY, 0)
      set(Calendar.MINUTE, 0)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }
    val begin = cal.timeInMillis
    val end = System.currentTimeMillis()

    val totals = HashMap<String, Long>()
    val openedAt = HashMap<String, Long>()
    val events = usm(context).queryEvents(begin, end)
    val event = UsageEvents.Event()
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      val pkg = event.packageName ?: continue
      if (packages.isNotEmpty() && pkg !in packages) continue
      // STOPPED is ignored: it trails the next activity's RESUMED during
      // same-package transitions and would double-close intervals.
      when (event.eventType) {
        UsageEvents.Event.ACTIVITY_RESUMED ->
          if (pkg !in openedAt) openedAt[pkg] = event.timeStamp
        UsageEvents.Event.ACTIVITY_PAUSED -> {
          val start = openedAt.remove(pkg)
          if (start != null) totals[pkg] = (totals[pkg] ?: 0L) + (event.timeStamp - start)
        }
      }
    }
    // Anything still open counts up to "now".
    for ((pkg, start) in openedAt) {
      totals[pkg] = (totals[pkg] ?: 0L) + (end - start)
    }
    return totals
  }
}
