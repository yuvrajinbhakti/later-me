package expo.modules.usagestats

import org.junit.Assert.assertEquals
import org.junit.Test

class CalloutTextTest {
  @Test fun fillsEveryPlaceholder() =
    assertEquals(
      "7 minutes in, 42 minutes today, 91 days left.",
      CalloutText.fill("{sessionMinutes} minutes in, {todayMinutes} minutes today, {daysLeft} days left.", 7, 42, 91),
    )

  @Test fun singularMinute() =
    assertEquals("1 minute of reels.", CalloutText.fill("{sessionMinutes} minutes of reels.", 1, 0, 0))

  @Test fun singularDay() =
    assertEquals("1 day left.", CalloutText.fill("{daysLeft} days left.", 0, 0, 1))

  @Test fun elevenStaysPlural() =
    assertEquals("11 minutes and 21 days.", CalloutText.fill("{sessionMinutes} minutes and {daysLeft} days.", 11, 0, 21))

  @Test fun abbreviationsAreUntouched() =
    assertEquals("1 min of reels.", CalloutText.fill("{sessionMinutes} min of reels.", 1, 0, 0))
}
