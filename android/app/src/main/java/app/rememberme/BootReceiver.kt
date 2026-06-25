package app.rememberme

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_LOCKED_BOOT_COMPLETED) {
            
            val prefs = context.getSharedPreferences("service_prefs", Context.MODE_PRIVATE)
            val isActive = prefs.getBoolean("isActive", false)
            
            if (isActive) {
                val serviceIntent = Intent(
                    context,
                    MyForegroundService::class.java
                )

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }
            }
        }
    }
}
