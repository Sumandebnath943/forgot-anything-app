package app.rememberme

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import java.util.Random

/**
 * Single source of truth for firing reminder notifications on the native side.
 *
 * Both entry points — the WiFi listener inside [MyForegroundService] and the
 * [GeofenceBroadcastReceiver] — funnel through [fire] so the "why did this fire"
 * copy, the trip-window gate, the one-shot "away" latch and the burst/ack logic
 * all live in exactly one place.
 */
object ReminderEngine {

    const val PREFS = "service_prefs"
    const val CHANNEL_ID = "reminders_high_v2"
    const val ACTION_ACK = "app.rememberme.ACK_REMINDER"

    private const val TAG = "ReminderEngine"
    private val random = Random()

    private val DAILY_GENERAL = arrayOf("🚪 Going out?", "⚡ One last thing!", "🏠 Leaving home?", "👋 Hey there!", "🔔 Reminder check!")
    private val DAILY_SNARKY = arrayOf("🤔 Be honest...", "😅 Again?", "🙈 Just checking...", "🎯 Pro tip:", "💭 Quick thought:")
    private val TRIP_TEMPLATES = arrayOf("✈️ Trip check!", "🧳 Before you go...", "🗺️ Adventure awaits!", "🎒 Travel reminder", "🚀 Ready to go?")

    fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    // ---------------------------------------------------------------------
    // WiFi / SSID helpers
    // ---------------------------------------------------------------------

    /** Reads the SSID of the currently connected WiFi, or null if unavailable. */
    fun getCurrentSsid(context: Context): String? {
        return try {
            val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            @Suppress("DEPRECATION")
            val raw = wifiManager.connectionInfo?.ssid
            if (raw == null || raw == "<unknown ssid>") return null
            val cleaned = raw.removePrefix("\"").removeSuffix("\"").trim()
            if (cleaned.isBlank()) null else cleaned
        } catch (e: Exception) {
            Log.w(TAG, "Could not read SSID", e)
            null
        }
    }

    /**
     * True when the saved home SSID is empty (any-WiFi mode) OR the currently
     * connected WiFi matches the saved home network name.
     */
    fun isOnHomeWifi(context: Context): Boolean {
        val home = prefs(context).getString("homeWifiSSID", "")?.trim() ?: ""
        if (home.isEmpty()) return true // any-WiFi mode
        val current = getCurrentSsid(context) ?: return false
        return current == home
    }

    /** True only when actively connected via WiFi AND that WiFi is the home network. */
    fun isCurrentlyConnectedToHomeWifi(context: Context): Boolean {
        return try {
            val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val active = cm.activeNetwork ?: return false
            val caps = cm.getNetworkCapabilities(active) ?: return false
            if (!caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) return false
            isOnHomeWifi(context)
        } catch (e: Exception) {
            false
        }
    }

    // ---------------------------------------------------------------------
    // Trip window gate
    // ---------------------------------------------------------------------

    /** In trip mode, only allow reminders within the configured [start, end] window. */
    fun isWithinTripWindow(context: Context): Boolean {
        val p = prefs(context)
        val mode = p.getString("mode", "daily") ?: "daily"
        if (mode != "trip") return true
        val start = p.getLong("tripStartMs", 0L)
        val end = p.getLong("tripEndMs", 0L)
        if (start == 0L && end == 0L) return true // dates not set → don't gate
        val now = System.currentTimeMillis()
        if (start != 0L && now < start) return false
        if (end != 0L && now > end) return false
        return true
    }

    // ---------------------------------------------------------------------
    // "Away" latch — one notification per departure, shared across both engines
    // ---------------------------------------------------------------------

    fun resetAwayLatch(context: Context) {
        prefs(context).edit().putBoolean("awayLatched", false).apply()
    }

    // ---------------------------------------------------------------------
    // Reason-aware copy
    // ---------------------------------------------------------------------

    private fun reasonLine(reason: String, radiusMeters: Float): String {
        val r = radiusMeters.toInt()
        return when (reason) {
            "wifi" -> "📶 Your home WiFi just disconnected — heading out?"
            "location" -> "📍 You've stepped beyond your ${r}m home zone."
            "both" -> "📶 WiFi dropped and you've left your ${r}m home zone."
            else -> "👋 Heading out?"
        }
    }

    // ---------------------------------------------------------------------
    // The single firing path
    // ---------------------------------------------------------------------

    /**
     * Fires the reminder (and burst follow-ups) for the given [reason].
     * Honours the active flag, the trip window, and the one-shot away latch.
     * Callers are responsible for confirming the *conditions* of [reason] are
     * met (e.g. "both" callers must verify both WiFi-away and location-away).
     */
    fun fire(context: Context, reason: String, radiusMeters: Float) {
        val p = prefs(context)

        if (!p.getBoolean("isActive", false)) {
            Log.i(TAG, "fire($reason) ignored — not active")
            return
        }
        if (!isWithinTripWindow(context)) {
            Log.i(TAG, "fire($reason) ignored — outside trip window")
            return
        }
        if (p.getBoolean("awayLatched", false)) {
            Log.i(TAG, "fire($reason) ignored — already notified this departure")
            return
        }
        p.edit().putBoolean("awayLatched", true).apply()

        ensureChannel(context)

        val mode = p.getString("mode", "daily") ?: "daily"
        val items = p.getString("items", "") ?: ""
        val timingStyle = p.getString("timingStyle", "burst") ?: "burst"
        val followUpDelay = p.getInt("followUpDelaySeconds", 45)
        val thirdDelay = p.getInt("thirdDelaySeconds", 105)

        val itemsList = items.split(",").filter { it.isNotEmpty() }
        val itemsLine = if (itemsList.isNotEmpty()) "\n📋 " + itemsList.joinToString(", ") else ""

        val burstStartMs = System.currentTimeMillis()
        val baseId = (burstStartMs % 1000000).toInt()

        // First notification leads with WHY it fired.
        val title1 = if (mode == "daily") DAILY_GENERAL[random.nextInt(DAILY_GENERAL.size)] else TRIP_TEMPLATES[random.nextInt(TRIP_TEMPLATES.size)]
        val body1 = reasonLine(reason, radiusMeters) + " Don't forget anything!" + itemsLine
        sendNotification(context, baseId, baseId, title1, body1)

        if (timingStyle == "burst") {
            val title2 = if (mode == "daily") "🤔 Did you forget something?" else TRIP_TEMPLATES[random.nextInt(TRIP_TEMPLATES.size)]
            val body2 = "Don't forget your essentials!" + itemsLine
            Handler(Looper.getMainLooper()).postDelayed({
                if (!wasAcknowledged(context, burstStartMs)) sendNotification(context, baseId + 1, baseId, title2, body2)
            }, followUpDelay * 1000L)

            if (mode == "daily") {
                val title3 = DAILY_SNARKY[random.nextInt(DAILY_SNARKY.size)]
                val body3 = "Is your wallet still on the table?" + itemsLine
                Handler(Looper.getMainLooper()).postDelayed({
                    if (!wasAcknowledged(context, burstStartMs)) sendNotification(context, baseId + 2, baseId, title3, body3)
                }, thirdDelay * 1000L)
            }
        }
    }

    /** True if the user tapped "Got everything!" after this burst started. */
    private fun wasAcknowledged(context: Context, burstStartMs: Long): Boolean {
        val ackAt = prefs(context).getLong("ackAtMs", 0L)
        return ackAt >= burstStartMs
    }

    private fun sendNotification(context: Context, id: Int, burstBaseId: Int, title: String, message: String) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // The action cancels the entire burst (baseId..baseId+2), so pass the burst's base id.
        val ackIntent = Intent(context, NotificationActionReceiver::class.java).apply {
            action = ACTION_ACK
            putExtra("baseId", burstBaseId)
        }
        val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val ackPending = PendingIntent.getBroadcast(context, id, ackIntent, pendingFlags)

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setAutoCancel(true)
            .addAction(0, "✅ Got everything!", ackPending)
            .build()

        nm.notify(id, notification)
    }

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = context.getSystemService(NotificationManager::class.java)
            if (nm.getNotificationChannel(CHANNEL_ID) != null) return

            val reminder = NotificationChannel(CHANNEL_ID, "Reminders", NotificationManager.IMPORTANCE_HIGH)
            reminder.enableVibration(true)
            reminder.enableLights(true)
            reminder.lightColor = android.graphics.Color.parseColor("#FF6B6B")

            val soundUri = android.net.Uri.parse("android.resource://" + context.packageName + "/raw/alert")
            val audioAttributes = android.media.AudioAttributes.Builder()
                .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                .build()
            reminder.setSound(soundUri, audioAttributes)

            nm.createNotificationChannel(reminder)
        }
    }
}
