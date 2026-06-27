package app.rememberme

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingEvent

class GeofenceBroadcastReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val geofencingEvent = GeofencingEvent.fromIntent(intent)
        if (geofencingEvent == null || geofencingEvent.hasError()) {
            Log.e("GEOFENCE", "Error receiving geofence transition")
            return
        }

        when (geofencingEvent.geofenceTransition) {
            Geofence.GEOFENCE_TRANSITION_ENTER -> {
                Log.i("GEOFENCE", "Entered home geofence — clearing away latch")
                ReminderEngine.resetAwayLatch(context)
            }
            Geofence.GEOFENCE_TRANSITION_EXIT -> {
                Log.i("GEOFENCE", "Exited home geofence!")
                handleExit(context)
            }
        }
    }

    private fun handleExit(context: Context) {
        val prefs = context.getSharedPreferences(ReminderEngine.PREFS, Context.MODE_PRIVATE)
        val isActive = prefs.getBoolean("isActive", false)
        val trigger = prefs.getString("trigger", "both") ?: "both"
        val radius = prefs.getFloat("home_radius", 100f)

        if (!isActive || (trigger != "location" && trigger != "both")) return

        if (trigger == "both") {
            // Symmetric "both" gate: location is away (we just exited), so only fire
            // if we are ALSO away from home WiFi. Still on home WiFi → wait.
            if (ReminderEngine.isCurrentlyConnectedToHomeWifi(context)) {
                Log.i("GEOFENCE", "Exited geofence but still on home WiFi. 'both' gate not met — waiting.")
                return
            }
            ReminderEngine.fire(context, "both", radius)
        } else {
            ReminderEngine.fire(context, "location", radius)
        }
    }
}
