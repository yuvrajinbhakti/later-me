package expo.modules.usagestats

import org.junit.Assert.assertEquals
import org.junit.Test

class TriggerPolicyTest {
  private fun input(
    inTrackedApp: Boolean = true,
    continuousMs: Long = 0,
    cooldownUntilMs: Long = 0,
    overlayShowing: Boolean = false,
    todayTrackedMs: Long = 0,
    dailyLimitMs: Long = 0,
    dailyLimitFiredToday: Boolean = false,
    pausedUntilMs: Long = 0,
  ) = TriggerInput(
    nowMs = 1_000_000,
    inTrackedApp = inTrackedApp,
    continuousMs = continuousMs,
    thresholdMs = 300_000,
    cooldownUntilMs = cooldownUntilMs,
    overlayShowing = overlayShowing,
    todayTrackedMs = todayTrackedMs,
    dailyLimitMs = dailyLimitMs,
    dailyLimitFiredToday = dailyLimitFiredToday,
    pausedUntilMs = pausedUntilMs,
  )

  @Test fun noneBelowThreshold() =
    assertEquals(TriggerKind.NONE, TriggerPolicy.decide(input(continuousMs = 299_999)))

  @Test fun continuousAtThreshold() =
    assertEquals(TriggerKind.CONTINUOUS, TriggerPolicy.decide(input(continuousMs = 300_000)))

  @Test fun noneDuringCooldown() =
    assertEquals(TriggerKind.NONE, TriggerPolicy.decide(input(continuousMs = 900_000, cooldownUntilMs = 1_000_001)))

  @Test fun noneWhileOverlayShowing() =
    assertEquals(TriggerKind.NONE, TriggerPolicy.decide(input(continuousMs = 900_000, overlayShowing = true)))

  @Test fun noneWhenPaused() =
    assertEquals(TriggerKind.NONE, TriggerPolicy.decide(input(continuousMs = 900_000, pausedUntilMs = 2_000_000)))

  @Test fun noneOutsideTrackedApp() =
    assertEquals(
      TriggerKind.NONE,
      TriggerPolicy.decide(
        input(inTrackedApp = false, continuousMs = 900_000, todayTrackedMs = 9_000_000, dailyLimitMs = 3_600_000),
      ),
    )

  @Test fun dailyLimitFiresAndBeatsContinuous() =
    assertEquals(
      TriggerKind.DAILY_LIMIT,
      TriggerPolicy.decide(input(continuousMs = 900_000, todayTrackedMs = 3_600_000, dailyLimitMs = 3_600_000)),
    )

  @Test fun dailyLimitOnlyOncePerDay() =
    assertEquals(
      TriggerKind.NONE,
      TriggerPolicy.decide(input(todayTrackedMs = 7_200_000, dailyLimitMs = 3_600_000, dailyLimitFiredToday = true)),
    )

  @Test fun zeroDailyLimitMeansNone() =
    assertEquals(TriggerKind.NONE, TriggerPolicy.decide(input(todayTrackedMs = 9_000_000, dailyLimitMs = 0)))

  @Test fun gentleAlwaysNotifies() =
    assertEquals(Delivery.NOTIFICATION, TriggerPolicy.delivery("gentle", true))

  @Test fun normalAndSavageUseOverlay() {
    assertEquals(Delivery.OVERLAY, TriggerPolicy.delivery("normal", true))
    assertEquals(Delivery.OVERLAY, TriggerPolicy.delivery("savage", true))
  }

  @Test fun overlayFallsBackWithoutPermission() =
    assertEquals(Delivery.NOTIFICATION, TriggerPolicy.delivery("savage", false))

  @Test fun tierCapsAtTwo() {
    assertEquals(0, TriggerPolicy.tier(0))
    assertEquals(1, TriggerPolicy.tier(1))
    assertEquals(2, TriggerPolicy.tier(5))
  }
}
