package expo.modules.usagestats

enum class FgKind { RESUMED, PAUSED, SCREEN_OFF, SCREEN_ON }

data class FgEvent(val kind: FgKind, val pkg: String, val cls: String?, val ts: Long)

/**
 * Foreground app maintained incrementally from usage events. No new events means nothing changed,
 * which is what lets a long single-activity scroll (Reels) stay "in the app" indefinitely.
 */
class ForegroundTracker {
  var current: String? = null
    private set
  var screenOff = false
    private set
  private var currentCls: String? = null

  fun apply(events: List<FgEvent>) {
    for (e in events.sortedBy { it.ts }) {
      when (e.kind) {
        FgKind.RESUMED -> {
          current = e.pkg
          currentCls = e.cls
        }
        // Only the activity we believe is in front may clear it: another activity's pause is a stale hop.
        FgKind.PAUSED -> if (e.pkg == current && e.cls == currentCls) {
          current = null
          currentCls = null
        }
        FgKind.SCREEN_OFF -> {
          current = null
          currentCls = null
          screenOff = true
        }
        FgKind.SCREEN_ON -> screenOff = false
      }
    }
  }
}
