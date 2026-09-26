package expo.modules.usagestats

import org.junit.Assert.assertEquals
import org.junit.Test

class UsageMathTest {
  private val min = 60_000L
  private val midnight = 1_000 * min
  private fun r(pkg: String, ts: Long) = FgEvent(FgKind.RESUMED, pkg, "A", ts)
  private fun p(pkg: String, ts: Long) = FgEvent(FgKind.PAUSED, pkg, "A", ts)

  @Test fun sessionStartedBeforeMidnightCountsOnlyAfterIt() {
    val events = listOf(r("ig", midnight - 10 * min), p("ig", midnight + 20 * min))
    assertEquals(20 * min, UsageMath.trackedMsBetween(events, midnight, midnight + 60 * min, setOf("ig")))
  }

  @Test fun openSessionCountsUntilTheWindowEnd() {
    val events = listOf(r("ig", midnight + 5 * min))
    assertEquals(10 * min, UsageMath.trackedMsBetween(events, midnight, midnight + 15 * min, setOf("ig")))
  }

  @Test fun untrackedAppsAndOrphanPausesAreIgnored() {
    val events = listOf(p("ig", midnight + min), r("yt", midnight + 2 * min), p("yt", midnight + 9 * min))
    assertEquals(0L, UsageMath.trackedMsBetween(events, midnight, midnight + 60 * min, setOf("ig")))
  }

  @Test fun duplicateResumeKeepsTheFirstStart() {
    val events = listOf(r("ig", midnight + min), r("ig", midnight + 3 * min), p("ig", midnight + 6 * min))
    assertEquals(5 * min, UsageMath.trackedMsBetween(events, midnight, midnight + 60 * min, setOf("ig")))
  }
}
