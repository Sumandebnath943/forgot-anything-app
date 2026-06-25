package app.rememberme;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ReminderPlugin")
public class ReminderPlugin extends Plugin {

    @PluginMethod
    public void syncSettings(PluginCall call) {
        Log.e("ReminderPlugin", "syncSettings called");
        try {
            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences("service_prefs", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();

            // Extract values
            String mode = call.getString("mode", "daily");
            String trigger = call.getString("trigger", "both");
            boolean isActive = call.getBoolean("isActive", false);
            
            Double homeLat = call.getDouble("homeLat", 0.0);
            Double homeLng = call.getDouble("homeLng", 0.0);
            Float radius = call.getFloat("radius", 100f);
            
            String homeWifiSSID = call.getString("homeWifiSSID", "");
            
            // Items as a comma separated string is easiest for SharedPreferences
            // Alternatively use StringSet
            String items = call.getString("items", ""); 

            // Timing settings
            String timingStyle = call.getString("timingStyle", "burst");
            int followUpDelay = call.getInt("followUpDelaySeconds", 45);
            int thirdDelay = call.getInt("thirdDelaySeconds", 105);

            // Save to SharedPreferences
            editor.putString("mode", mode);
            editor.putString("trigger", trigger);
            editor.putBoolean("isActive", isActive);
            
            editor.putLong("home_lat", Double.doubleToRawLongBits(homeLat != null ? homeLat : 0.0));
            editor.putLong("home_lng", Double.doubleToRawLongBits(homeLng != null ? homeLng : 0.0));
            editor.putFloat("home_radius", radius != null ? radius : 100f);
            
            editor.putString("homeWifiSSID", homeWifiSSID);
            editor.putString("items", items);

            editor.putString("timingStyle", timingStyle);
            editor.putInt("followUpDelaySeconds", followUpDelay);
            editor.putInt("thirdDelaySeconds", thirdDelay);

            editor.apply();

            Log.e("ReminderPlugin", "Settings saved successfully: isActive=" + isActive + ", trigger=" + trigger);
            
            if (isActive) {
                // Prevent Android 14 SecurityException on reinstall where SharedPreferences were backed up
                // but runtime permissions were revoked.
                boolean hasLocation = androidx.core.content.ContextCompat.checkSelfPermission(context, android.Manifest.permission.ACCESS_COARSE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED ||
                                      androidx.core.content.ContextCompat.checkSelfPermission(context, android.Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED;
                
                if (!hasLocation) {
                    Log.e("ReminderPlugin", "Location permission missing. Forcing isActive to false to prevent FGS crash.");
                    isActive = false;
                    editor.putBoolean("isActive", false);
                    editor.apply();
                }
            }

            Intent intent = new Intent(context, MyForegroundService.class);
            if (isActive) {
                // Restart the service so it reloads settings and listeners
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    context.startForegroundService(intent);
                } else {
                    context.startService(intent);
                }
            } else {
                // Stop the service if it's no longer active
                context.stopService(intent);
            }
            
            call.resolve();
        } catch (Exception e) {
            Log.e("ReminderPlugin", "Error syncing settings", e);
            call.reject("Error syncing settings", e);
        }
    }
}
