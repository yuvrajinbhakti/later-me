package expo.modules.usagestats

/**
 * One continuous stretch in a tracked app, and how many callouts it has earned.
 * Pure state so the service's timing rules can be unit-tested without Android.
 */
class WatcherSession {
  companion object {
    /** A foreground we cannot see for this long means the user really left. */
    const val UNKNOWN_GRACE_MS = 30_000L
  }

  var currentPkg: String? = null
    private set
  var continuousMs = 0L
    private set
  var sessionTriggers = 0
    private set
  var cooldownUntilMs = 0L
    private set

  private var lastTickMs = 0L
  private var unknownSinceMs: Long? = null
  private var dayKey: String? = null

  fun start(nowMs: Long) {
    lastTickMs = nowMs
  }

  fun onTick(nowMs: Long, fg: String?, screenOff: Boolean, dayKey: String, tracked: Collection<String>, ownPackage: String) {
    val delta = nowMs - lastTickMs
    lastTickMs = nowMs
    if (this.dayKey != null && this.dayKey != dayKey) reset()
    this.dayKey = dayKey

    when {
      screenOff -> reset()
      fg == null -> {
        if (currentPkg == null) return
        val since = unknownSinceMs ?: nowMs.also { unknownSinceMs = it }
        if (nowMs - since >= UNKNOWN_GRACE_MS) reset() else continuousMs += delta
      }
      fg == ownPackage -> unknownSinceMs = null
      fg in tracked -> {
        unknownSinceMs = null
        if (fg == currentPkg) {
          continuousMs += delta
        } else {
          currentPkg = fg
          continuousMs = 0
          sessionTriggers = 0
        }
      }
      else -> reset()
    }
  }

  fun onCallout(nowMs: Long, cooldownMs: Long) {
    sessionTriggers += 1
    cooldownUntilMs = nowMs + cooldownMs
  }

  fun onLimitCallout(nowMs: Long, cooldownMs: Long) {
    cooldownUntilMs = nowMs + cooldownMs
  }

  /** Continuous time is kept so the next callout escalates once the cooldown passes. */
  fun onDismiss(nowMs: Long, cooldownMs: Long) {
    cooldownUntilMs = nowMs + cooldownMs
  }

  fun onLeave(nowMs: Long, cooldownMs: Long) {
    reset()
    cooldownUntilMs = nowMs + cooldownMs
  }

  fun reset() {
    currentPkg = null
    continuousMs = 0
    sessionTriggers = 0
    unknownSinceMs = null
  }
}
