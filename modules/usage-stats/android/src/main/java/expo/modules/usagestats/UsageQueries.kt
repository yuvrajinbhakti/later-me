package expo.modules.usagestats

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Build
import java.util.Calendar

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

  /** Looks back 12 h before midnight so a session begun yesterday evening is clipped, not dropped. */
  fun trackedTodayMs(context: Context, packages: Set<String>, nowMs: Long): Long {
    val midnight = localMidnight(nowMs)
    return UsageMath.trackedMsBetween(fgEvents(context, midnight - 12 * HOUR_MS, nowMs), midnight, nowMs, packages)
  }

  /** Raw resume/pause events for the given packages, plus the earliest event of any app in range. */
  fun eventsForJs(context: Context, beginMs: Long, endMs: Long, packages: Set<String>): Pair<List<Map<String, Any>>, Long?> {
    val out = ArrayList<Map<String, Any>>()
    var earliest: Long? = null
    val events = usm(context).queryEvents(beginMs, endMs)
    val event = UsageEvents.Event()
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      if (earliest == null) earliest = event.timeStamp
      val fg = toFgEvent(event) ?: continue
      if (fg.pkg !in packages) continue
      val type = when (fg.kind) {
        FgKind.RESUMED -> "resumed"
        FgKind.PAUSED -> "paused"
        else -> continue
      }
      out.add(mapOf("pkg" to fg.pkg, "type" to type, "ts" to fg.ts.toDouble()))
    }
    return Pair(out, earliest)
  }
}
