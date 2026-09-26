package expo.modules.usagestats

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Restarts the watcher after a reboot or an app update, when alerts were on. */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED && intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
    if (!Prefs.getAlertsEnabled(context) || !Permissions.hasUsageAccess(context)) return
    // A refused background start is fine: the app restarts the watcher when it is next opened.
    WatcherService.start(context)
  }
}
