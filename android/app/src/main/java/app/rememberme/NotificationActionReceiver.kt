package app.rememberme

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Handles the "✅ Got everything!" notification action.
 *
 * Records an acknowledgement timestamp so any pending burst follow-ups in
 * [ReminderEngine] abort, and clears the currently visible burst notifications.
 */
class NotificationActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ReminderEngine.ACTION_ACK) return

        val prefs = context.getSharedPreferences(ReminderEngine.PREFS, Context.MODE_PRIVATE)
        prefs.edit().putLong("ackAtMs", System.currentTimeMillis()).apply()

        val baseId = intent.getIntExtra("baseId", -1)
        if (baseId >= 0) {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.cancel(baseId)
            nm.cancel(baseId + 1)
            nm.cancel(baseId + 2)
        }
        Log.i("ReminderEngine", "User acknowledged reminder (baseId=$baseId)")
    }
}
