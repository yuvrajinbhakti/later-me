package expo.modules.usagestats

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class UsageStatsModule : Module() {

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private fun open(intent: Intent) = context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))

  override fun definition() = ModuleDefinition {
    Name("UsageStats")

    // ---- Permissions ----

    Function("hasUsageAccess") { Permissions.hasUsageAccess(context) }

    Function("openUsageAccessSettings") { open(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)) }

    Function("hasOverlayPermission") { Settings.canDrawOverlays(context) }

    Function("openOverlaySettings") {
      open(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}")))
    }

    Function("canPostCallouts") { Permissions.canPostCallouts(context) }

    Function("openNotificationSettings") {
      val intent = if (Build.VERSION.SDK_INT >= 26) {
        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
      } else {
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
      }
      open(intent)
    }

    // ---- Usage queries ----

    AsyncFunction("getUsageToday") { packages: List<String> ->
      val now = System.currentTimeMillis()
      packages.associateWith { pkg -> UsageQueries.trackedTodayMs(context, setOf(pkg), now).toDouble() / 60_000.0 }
    }

    AsyncFunction("getUsageEvents") { beginMs: Double, endMs: Double, packages: List<String> ->
      val (events, historyStart) = UsageQueries.eventsForJs(context, beginMs.toLong(), endMs.toLong(), packages.toSet())
      mapOf("events" to events, "historyStartMs" to historyStart?.toDouble())
    }

    AsyncFunction("getForegroundApp") { UsageQueries.foregroundApp(context) }

    // ---- Watcher service ----

    /** Returns false when the platform refuses to start the service (e.g. from the background). */
    Function("startWatcher") { configJson: String, roastsJson: String ->
      Prefs.setConfig(context, configJson)
      Prefs.setRoasts(context, roastsJson)
      Prefs.setAlertsEnabled(context, true)
      val intent = Intent(context, WatcherService::class.java)
      try {
        if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(intent) else context.startService(intent)
        true
      } catch (e: Exception) {
        false
      }
    }

    Function("stopWatcher") {
      Prefs.setAlertsEnabled(context, false)
      context.stopService(Intent(context, WatcherService::class.java))
    }

    Function("isWatcherRunning") { WatcherService.isRunning }

    /** Refresh callout lines without restarting the service. */
    Function("setRoasts") { roastsJson: String -> Prefs.setRoasts(context, roastsJson) }

    /** "Not today" switch: silence callouts until the given epoch millis. 0 resumes. */
    Function("setPausedUntil") { epochMs: Double -> Prefs.setPausedUntil(context, epochMs.toLong()) }

    Function("getPausedUntil") { Prefs.getPausedUntil(context).toDouble() }
  }
}
