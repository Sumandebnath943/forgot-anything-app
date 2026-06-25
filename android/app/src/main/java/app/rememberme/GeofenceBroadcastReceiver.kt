package app.rememberme

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingEvent
import android.app.NotificationManager
import android.app.NotificationChannel
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.core.app.NotificationCompat
import java.util.Random

class GeofenceBroadcastReceiver : BroadcastReceiver() {
    private val reminderChannelId = "reminders_high"
    private val random = Random()

    private val DAILY_GENERAL = arrayOf(
        "🚪 Going out?", "⚡ One last thing!", "🏠 Leaving home?", "👋 Hey there!", "🔔 Reminder check!"
    )
    private val DAILY_SNARKY = arrayOf(
        "🤔 Be honest...", "😅 Again?", "🙈 Just checking...", "🎯 Pro tip:", "💭 Quick thought:"
    )
    private val TRIP_TEMPLATES = arrayOf(
        "✈️ Trip check!", "🧳 Before you go...", "🗺️ Adventure awaits!", "🎒 Travel reminder", "🚀 Ready to go?"
    )

    override fun onReceive(context: Context, intent: Intent) {
        val geofencingEvent = GeofencingEvent.fromIntent(intent)
        if (geofencingEvent == null || geofencingEvent.hasError()) {
            Log.e("GEOFENCE", "Error receiving geofence transition")
            return
        }

        val geofenceTransition = geofencingEvent.geofenceTransition
        
        // We only care about exiting the home geofence
        if (geofenceTransition == Geofence.GEOFENCE_TRANSITION_EXIT) {
            Log.i("GEOFENCE", "Exited home geofence!")
            triggerReminders(context)
        }
    }

    private fun triggerReminders(context: Context) {
        val prefs = context.getSharedPreferences("service_prefs", Context.MODE_PRIVATE)
        val isActive = prefs.getBoolean("isActive", false)
        val trigger = prefs.getString("trigger", "both") ?: "both"

        // Ensure location triggers are enabled
        if (!isActive || (trigger != "location" && trigger != "both")) return

        val items = prefs.getString("items", "") ?: ""
        val mode = prefs.getString("mode", "daily") ?: "daily"
        val timingStyle = prefs.getString("timingStyle", "burst") ?: "burst"
        val followUpDelay = prefs.getInt("followUpDelaySeconds", 45)
        val thirdDelay = prefs.getInt("thirdDelaySeconds", 105)

        val itemsList = items.split(",").filter { it.isNotEmpty() }
        val itemsLine = if (itemsList.isNotEmpty()) "\n📋 " + itemsList.joinToString(", ") else ""

        val now = System.currentTimeMillis()
        val baseId = (now % 1000000).toInt()

        val title1 = if (mode == "daily") DAILY_GENERAL[random.nextInt(DAILY_GENERAL.size)] else TRIP_TEMPLATES[random.nextInt(TRIP_TEMPLATES.size)]
        val body1 = "Quick check before you go!" + itemsLine
        
        sendNotification(context, baseId, title1, body1)

        if (timingStyle == "burst") {
            val title2 = if (mode == "daily") "🤔 Did you forget something?" else TRIP_TEMPLATES[random.nextInt(TRIP_TEMPLATES.size)]
            val body2 = "Don't forget your essentials!" + itemsLine
            
            Handler(Looper.getMainLooper()).postDelayed({
                sendNotification(context, baseId + 1, title2, body2)
            }, followUpDelay * 1000L)

            if (mode == "daily") {
                val title3 = DAILY_SNARKY[random.nextInt(DAILY_SNARKY.size)]
                val body3 = "Is your wallet still on the table?" + itemsLine
                
                Handler(Looper.getMainLooper()).postDelayed({
                    sendNotification(context, baseId + 2, title3, body3)
                }, thirdDelay * 1000L)
            }
        }
    }

    private fun sendNotification(context: Context, id: Int, title: String, message: String) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val reminder = NotificationChannel(reminderChannelId, "Reminders", NotificationManager.IMPORTANCE_HIGH)
            reminder.enableVibration(true)
            nm.createNotificationChannel(reminder)
        }

        val notification = NotificationCompat.Builder(context, reminderChannelId)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setAutoCancel(true)
            .build()

        nm.notify(id, notification)
    }
}
