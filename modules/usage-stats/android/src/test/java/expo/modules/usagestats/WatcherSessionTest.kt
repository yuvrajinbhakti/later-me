package expo.modules.usagestats

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class WatcherSessionTest {
  private val tracked = listOf("ig", "yt")
  private fun session() = WatcherSession().apply { start(0) }
  private fun WatcherSession.tick(now: Long, fg: String?, screenOff: Boolean = false, day: String = "d1") =
    onTick(now, fg, screenOff, day, tracked, "me")

  @Test fun accumulatesWhileOnTheSameTrackedApp() {
    val s = session()
    s.tick(5_000, "ig"); s.tick(10_000, "ig")
    assertEquals(5_000L, s.continuousMs)
    assertEquals("ig", s.currentPkg)
  }

  @Test fun switchingTrackedAppsStartsFresh() {
    val s = session()
    s.tick(5_000, "ig"); s.tick(10_000, "ig"); s.onCallout(10_000, 60_000)
    s.tick(15_000, "yt")
    assertEquals(0L, s.continuousMs)
    assertEquals(0, s.sessionTriggers)
    assertEquals("yt", s.currentPkg)
  }

  @Test fun leavingForAnUntrackedAppResets() {
    val s = session()
    s.tick(5_000, "ig"); s.tick(10_000, "ig"); s.tick(15_000, "launcher")
    assertNull(s.currentPkg)
    assertEquals(0L, s.continuousMs)
  }

  @Test fun ownPackageKeepsTheSessionWithoutCounting() {
    val s = session()
    s.tick(5_000, "ig"); s.tick(10_000, "ig"); s.tick(15_000, "me"); s.tick(20_000, "ig")
    assertEquals("ig", s.currentPkg)
    assertEquals(10_000L, s.continuousMs)
  }

  @Test fun briefUnknownForegroundKeepsAndCounts() {
    val s = session()
    s.tick(5_000, "ig"); s.tick(10_000, null); s.tick(15_000, "ig")
    assertEquals(10_000L, s.continuousMs)
  }

  @Test fun thirtySecondsOfUnknownForegroundResets() {
    val s = session()
    s.tick(5_000, "ig"); s.tick(10_000, null); s.tick(40_000, null)
    assertNull(s.currentPkg)
    assertEquals(0L, s.continuousMs)
  }

  @Test fun screenOffResetsAtOnce() {
    val s = session()
    s.tick(5_000, "ig"); s.tick(10_000, "ig"); s.onCallout(10_000, 60_000)
    s.tick(15_000, null, screenOff = true)
    assertNull(s.currentPkg)
    assertEquals(0L, s.continuousMs)
    assertEquals(0, s.sessionTriggers)
  }

  @Test fun newDayResets() {
    val s = session()
    s.tick(5_000, "ig"); s.tick(10_000, "ig"); s.onCallout(10_000, 60_000)
    s.tick(15_000, "ig", day = "d2")
    assertEquals(0L, s.continuousMs)
    assertEquals(0, s.sessionTriggers)
    assertEquals("ig", s.currentPkg)
  }

  @Test fun calloutEscalatesAndStartsCooldown() {
    val s = session()
    s.onCallout(30_000, 120_000)
    assertEquals(1, s.sessionTriggers)
    assertEquals(150_000L, s.cooldownUntilMs)
  }

  @Test fun limitCalloutStartsCooldownWithoutEscalating() {
    val s = session()
    s.onLimitCallout(30_000, 60_000)
    assertEquals(0, s.sessionTriggers)
    assertEquals(90_000L, s.cooldownUntilMs)
  }

  @Test fun dismissRestartsCooldownButKeepsContinuousTime() {
    val s = session()
    s.tick(5_000, "ig"); s.tick(65_000, "ig"); s.onCallout(65_000, 60_000)
    s.onDismiss(80_000, 60_000)
    assertEquals(60_000L, s.continuousMs)
    assertEquals(140_000L, s.cooldownUntilMs)
    assertEquals(1, s.sessionTriggers)
  }

  @Test fun leaveResetsAndStartsCooldown() {
    val s = session()
    s.tick(5_000, "ig"); s.onCallout(5_000, 60_000)
    s.onLeave(9_000, 120_000)
    assertNull(s.currentPkg)
    assertEquals(0, s.sessionTriggers)
    assertEquals(129_000L, s.cooldownUntilMs)
  }
}
