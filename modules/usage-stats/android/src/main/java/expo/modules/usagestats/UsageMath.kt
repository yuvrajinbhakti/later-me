package expo.modules.usagestats

object UsageMath {
  /**
   * Foreground milliseconds of the given packages inside [fromMs, toMs). Events may start before
   * fromMs so a session opened before midnight is found and clipped instead of dropped.
   */
  fun trackedMsBetween(events: List<FgEvent>, fromMs: Long, toMs: Long, packages: Set<String>): Long {
    var total = 0L
    val openedAt = HashMap<String, Long>()
    fun add(start: Long, end: Long) {
      total += maxOf(0L, minOf(end, toMs) - maxOf(start, fromMs))
    }
    for (e in events.sortedBy { it.ts }) {
      if (e.pkg !in packages) continue
      when (e.kind) {
        FgKind.RESUMED -> openedAt.putIfAbsent(e.pkg, e.ts)
        FgKind.PAUSED -> openedAt.remove(e.pkg)?.let { add(it, e.ts) }
        else -> Unit
      }
    }
    openedAt.values.forEach { add(it, toMs) }
    return total
  }
}
