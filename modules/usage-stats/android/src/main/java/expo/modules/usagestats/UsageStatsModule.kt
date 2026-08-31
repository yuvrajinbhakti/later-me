package expo.modules.usagestats

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class UsageStatsModule : Module() {

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("UsageStats")

    // ---- Permissions ----

    Function("hasUsageAccess") {
      val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
      val mode = if (Build.VERSION.SDK_INT >= 29) {
        appOps.unsafeCheckOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName
        )
      } else {
        @Suppress("DEPRECATION")
        appOps.checkOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName
        )
      }
      mode == AppOpsManager.MODE_ALLOWED
    }

    Function("openUsageAccessSettings") {
      context.startActivity(
        Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
    }

    Function("hasOverlayPermission") {
      Settings.canDrawOverlays(context)
    }

    Function("openOverlaySettings") {
      context.startActivity(
        Intent(
          Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
          Uri.parse("package:${context.packageName}")
        ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
    }

    // ---- Usage queries ----

    AsyncFunction("getUsageToday") { packages: List<String> ->
      val totals = UsageQueries.usageTodayMs(context, packages.toSet())
      // JS gets minutes, keyed by package name.
      packages.associateWith { pkg -> (totals[pkg] ?: 0L).toDouble() / 60000.0 }
    }

    AsyncFunction("getForegroundApp") {
      UsageQueries.foregroundApp(context)
    }

    // ---- Watcher service ----

    Function("startWatcher") { configJson: String, roastsJson: String ->
      Prefs.setConfig(context, configJson)
      Prefs.setRoasts(context, roastsJson)
      val intent = Intent(context, WatcherService::class.java)
      if (Build.VERSION.SDK_INT >= 26) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    Function("stopWatcher") {
      context.stopService(Intent(context, WatcherService::class.java))
    }

    Function("isWatcherRunning") {
      WatcherService.isRunning
    }

    /** Refresh roast lines without restarting the service. */
    Function("setRoasts") { roastsJson: String ->
      Prefs.setRoasts(context, roastsJson)
    }

    /** "Not today" switch: silence the watcher until the given epoch millis. 0 resumes. */
    Function("setPausedUntil") { epochMs: Double ->
      Prefs.setPausedUntil(context, epochMs.toLong())
    }

    Function("getPausedUntil") {
      Prefs.getPausedUntil(context).toDouble()
    }
  }
}
