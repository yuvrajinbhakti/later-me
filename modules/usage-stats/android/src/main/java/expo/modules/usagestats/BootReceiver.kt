package expo.modules.usagestats

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/** Restarts the watcher after a reboot or an app update, when alerts were on. */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED && intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
    if (!Prefs.getAlertsEnabled(context) || !Permissions.hasUsageAccess(context)) return
    val service = Intent(context, WatcherService::class.java)
    try {
      if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(service) else context.startService(service)
    } catch (e: Exception) {
      // The platform may refuse a background start; the app restarts the watcher when opened.
    }
  }
}
