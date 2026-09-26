package expo.modules.usagestats

enum class TriggerKind { NONE, CONTINUOUS, DAILY_LIMIT }

enum class Delivery { NOTIFICATION, OVERLAY }

data class TriggerInput(
  val nowMs: Long,
  val inTrackedApp: Boolean,
  val continuousMs: Long,
  val thresholdMs: Long,
  val cooldownUntilMs: Long,
  val overlayShowing: Boolean,
  val todayTrackedMs: Long,
  /** 0 means no daily limit. */
  val dailyLimitMs: Long,
  val dailyLimitFiredToday: Boolean,
  val pausedUntilMs: Long,
)

object TriggerPolicy {
  fun decide(i: TriggerInput): TriggerKind {
    if (i.pausedUntilMs > i.nowMs) return TriggerKind.NONE
    if (!i.inTrackedApp) return TriggerKind.NONE
    if (i.overlayShowing) return TriggerKind.NONE
    if (i.nowMs < i.cooldownUntilMs) return TriggerKind.NONE
    if (i.dailyLimitMs > 0 && i.todayTrackedMs >= i.dailyLimitMs && !i.dailyLimitFiredToday) {
      return TriggerKind.DAILY_LIMIT
    }
    if (i.continuousMs >= i.thresholdMs) return TriggerKind.CONTINUOUS
    return TriggerKind.NONE
  }

  fun delivery(level: String, canOverlay: Boolean): Delivery =
    if (level == "gentle" || !canOverlay) Delivery.NOTIFICATION else Delivery.OVERLAY

  fun tier(sessionTriggers: Int): Int = minOf(sessionTriggers, 2)
}
