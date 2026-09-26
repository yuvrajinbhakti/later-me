package expo.modules.usagestats

import android.app.AppOpsManager
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.os.PowerManager
import android.os.Process

object Permissions {
  fun hasUsageAccess(context: Context): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= 29) {
      appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    } else {
      @Suppress("DEPRECATION")
      appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  /** A muted app or callout channel would swallow gentle callouts silently; a missing channel is fine. */
  fun canPostCallouts(context: Context): Boolean {
    val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (!nm.areNotificationsEnabled()) return false
    if (Build.VERSION.SDK_INT >= 26) {
      val channel = nm.getNotificationChannel(WatcherService.CALLOUT_CHANNEL_ID)
      if (channel != null && channel.importance == NotificationManager.IMPORTANCE_NONE) return false
    }
    return true
  }

  /** Doze and OEM battery savers stop the watcher service unless the app is exempt. */
  fun isBatteryUnrestricted(context: Context): Boolean {
    val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    return pm.isIgnoringBatteryOptimizations(context.packageName)
  }
}
