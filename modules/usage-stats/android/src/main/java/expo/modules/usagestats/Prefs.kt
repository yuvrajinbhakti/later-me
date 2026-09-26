package expo.modules.usagestats

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

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
  fun hasConfig(context: Context): Boolean = sp(context).contains(KEY_CONFIG)

  /** Raw JSON, so the service can skip re-parsing when nothing changed. */
  fun getConfigRaw(context: Context): String? = sp(context).getString(KEY_CONFIG, null)

  fun parseConfig(raw: String?): WatcherConfig {
    if (raw == null) return WatcherConfig()
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
) {
  val watchedSet: Set<String> = watchedPackages.toSet()
}

data class RoastPools(val tiers: List<List<String>>, val limit: List<String>)
