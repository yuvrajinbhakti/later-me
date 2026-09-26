package expo.modules.usagestats

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ForegroundTrackerTest {
  private fun ev(kind: FgKind, pkg: String = "", cls: String? = null, ts: Long) = FgEvent(kind, pkg, cls, ts)

  @Test fun resumedSetsCurrent() {
    val t = ForegroundTracker()
    t.apply(listOf(ev(FgKind.RESUMED, "ig", "Main", 1)))
    assertEquals("ig", t.current)
  }

  @Test fun matchingPauseClears() {
    val t = ForegroundTracker()
    t.apply(listOf(ev(FgKind.RESUMED, "ig", "Main", 1), ev(FgKind.PAUSED, "ig", "Main", 2)))
    assertNull(t.current)
  }

  @Test fun inAppHopKeepsTheApp() {
    val t = ForegroundTracker()
    t.apply(
      listOf(
        ev(FgKind.RESUMED, "ig", "Feed", 1),
        ev(FgKind.PAUSED, "ig", "Feed", 2),
        ev(FgKind.RESUMED, "ig", "Reels", 3),
      ),
    )
    assertEquals("ig", t.current)
  }

  @Test fun lateStalePauseOfAnotherActivityIsIgnored() {
    val t = ForegroundTracker()
    t.apply(listOf(ev(FgKind.RESUMED, "ig", "Reels", 3), ev(FgKind.PAUSED, "ig", "Feed", 4)))
    assertEquals("ig", t.current)
  }

  @Test fun eventsAreAppliedInTimeOrder() {
    val t = ForegroundTracker()
    t.apply(listOf(ev(FgKind.RESUMED, "yt", "Main", 5), ev(FgKind.RESUMED, "ig", "Main", 1)))
    assertEquals("yt", t.current)
  }

  @Test fun screenOffClearsAndFlags() {
    val t = ForegroundTracker()
    t.apply(listOf(ev(FgKind.RESUMED, "ig", "Main", 1), ev(FgKind.SCREEN_OFF, ts = 2)))
    assertNull(t.current)
    assertTrue(t.screenOff)
  }

  @Test fun screenOnClearsTheFlagOnly() {
    val t = ForegroundTracker()
    t.apply(listOf(ev(FgKind.SCREEN_OFF, ts = 2), ev(FgKind.SCREEN_ON, ts = 3)))
    assertFalse(t.screenOff)
    assertNull(t.current)
  }

  @Test fun noEventsLeavesStateUnchanged() {
    val t = ForegroundTracker()
    t.apply(listOf(ev(FgKind.RESUMED, "ig", "Main", 1)))
    t.apply(emptyList())
    assertEquals("ig", t.current)
  }
}
