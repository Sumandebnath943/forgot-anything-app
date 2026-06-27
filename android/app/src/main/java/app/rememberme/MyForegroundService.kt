package app.rememberme

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.IBinder
import android.os.PowerManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import android.os.Handler
import android.os.Looper
import android.location.Location
import com.google.android.gms.location.GeofencingClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingRequest
import androidx.core.content.ContextCompat

class MyForegroundService : Service() {

    private val foregroundChannelId = "foreground_service_channel"

    private var wakeLock: PowerManager.WakeLock? = null

    // Preferences variables
    private var trigger = "both"
    private var isActive = false
    private var homeLat: Double = 0.0
    private var homeLng: Double = 0.0
    private var homeRadius = 100f

    private lateinit var connectivityManager: ConnectivityManager
    private var networkCallback: ConnectivityManager.NetworkCallback? = null

    /** Whether the WiFi we're currently/last connected to is the configured home network. */
    private var wasOnHomeWifi = false

    private lateinit var geofencingClient: GeofencingClient
    private val GEOFENCE_ID = "HOME_GEOFENCE"

    override fun onCreate() {
        super.onCreate()
        createForegroundChannel()
        ReminderEngine.ensureChannel(this)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(1, buildForegroundNotification(), android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else {
            startForeground(1, buildForegroundNotification())
        }

        connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        geofencingClient = LocationServices.getGeofencingClient(this)

        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ForgetAnything::WakeLock")
        wakeLock?.acquire(10 * 60 * 1000L) // mostly legacy

        loadSettings()
        setupListeners()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        loadSettings()
        setupListeners()
        return START_STICKY
    }

    override fun onDestroy() {
        teardownListeners()
        wakeLock?.release()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun loadSettings() {
        val prefs = getSharedPreferences(ReminderEngine.PREFS, Context.MODE_PRIVATE)
        trigger = prefs.getString("trigger", "both") ?: "both"
        isActive = prefs.getBoolean("isActive", false)
        homeLat = java.lang.Double.longBitsToDouble(prefs.getLong("home_lat", 0L))
        homeLng = java.lang.Double.longBitsToDouble(prefs.getLong("home_lng", 0L))
        homeRadius = prefs.getFloat("home_radius", 100f)
    }

    private fun setupListeners() {
        teardownListeners()

        if (!isActive) return

        // Fresh activation/restart: clear the one-shot latch so the next real departure can fire.
        ReminderEngine.resetAwayLatch(this)

        if (trigger == "wifi" || trigger == "both") {
            setupWifiListener()
        }

        if (trigger == "location" || trigger == "both") {
            setupGeofence()
        }
    }

    private fun teardownListeners() {
        networkCallback?.let {
            try { connectivityManager.unregisterNetworkCallback(it) } catch (e: Exception) {}
            networkCallback = null
        }
        geofencingClient.removeGeofences(listOf(GEOFENCE_ID))
    }

    /** Whether home coordinates have actually been configured (guards the 0,0 trap). */
    private fun hasValidHome(): Boolean = homeLat != 0.0 || homeLng != 0.0

    private fun setupWifiListener() {
        // Seed our "home WiFi" state from the current connection.
        wasOnHomeWifi = ReminderEngine.isCurrentlyConnectedToHomeWifi(this)

        val request = NetworkRequest.Builder()
            .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
            .build()

        networkCallback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                super.onAvailable(network)
                val onHome = ReminderEngine.isOnHomeWifi(this@MyForegroundService)
                wasOnHomeWifi = onHome
                Log.i("WIFI_TRACKING", "WiFi connected. isHomeWifi=$onHome (ssid=${ReminderEngine.getCurrentSsid(this@MyForegroundService)})")
                if (onHome) {
                    // Back on home WiFi → returned home, allow the next departure to fire.
                    ReminderEngine.resetAwayLatch(this@MyForegroundService)
                }
            }

            override fun onLost(network: Network) {
                super.onLost(network)

                if (!wasOnHomeWifi) {
                    Log.i("WIFI_TRACKING", "WiFi lost, but it was not the home network. Ignoring.")
                    return
                }
                Log.i("WIFI_TRACKING", "Home WiFi lost!")
                wasOnHomeWifi = false

                when (trigger) {
                    "wifi" -> ReminderEngine.fire(this@MyForegroundService, "wifi", homeRadius)
                    "both" -> confirmLocationAwayThenFire()
                }
            }
        }

        try {
            connectivityManager.registerNetworkCallback(request, networkCallback!!)
        } catch (e: Exception) {
            Log.e("WIFI_TRACKING", "Failed to register network callback", e)
        }
    }

    /**
     * For "both" mode on a home-WiFi drop: only fire once GPS confirms we are
     * actually outside the home radius. Bails safely if home isn't configured
     * or location permission is missing.
     */
    private fun confirmLocationAwayThenFire() {
        if (!hasValidHome()) {
            Log.w("WIFI_TRACKING", "Home coordinates not set — cannot confirm 'both'. Skipping.")
            return
        }
        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            Log.w("WIFI_TRACKING", "No fine location permission in 'both' mode. Skipping.")
            return
        }

        val fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        fusedLocationClient.lastLocation.addOnSuccessListener { location: Location? ->
            if (location != null) {
                if (isOutsideHome(location)) {
                    ReminderEngine.fire(this, "both", homeRadius)
                } else {
                    Log.i("WIFI_TRACKING", "WiFi lost but still inside geofence (lastLocation). Ignoring.")
                }
            } else {
                requestFreshLocationThenFire(fusedLocationClient)
            }
        }
    }

    private fun requestFreshLocationThenFire(fusedLocationClient: com.google.android.gms.location.FusedLocationProviderClient) {
        try {
            val locRequest = com.google.android.gms.location.LocationRequest.Builder(
                com.google.android.gms.location.Priority.PRIORITY_HIGH_ACCURACY, 0
            ).setMaxUpdates(1).build()

            fusedLocationClient.requestLocationUpdates(
                locRequest,
                object : com.google.android.gms.location.LocationCallback() {
                    override fun onLocationResult(result: com.google.android.gms.location.LocationResult) {
                        fusedLocationClient.removeLocationUpdates(this)
                        val freshLoc = result.lastLocation ?: return
                        if (isOutsideHome(freshLoc)) {
                            ReminderEngine.fire(this@MyForegroundService, "both", homeRadius)
                        } else {
                            Log.i("WIFI_TRACKING", "Fresh location confirms still inside geofence. Ignoring.")
                        }
                    }
                },
                Looper.getMainLooper()
            )
        } catch (e: Exception) {
            Log.e("WIFI_TRACKING", "Fresh location request failed, skipping notification", e)
        }
    }

    private fun isOutsideHome(location: Location): Boolean {
        val results = FloatArray(1)
        Location.distanceBetween(homeLat, homeLng, location.latitude, location.longitude, results)
        return results[0] > homeRadius
    }

    private fun getGeofencePendingIntent(): PendingIntent {
        val intent = Intent(this, GeofenceBroadcastReceiver::class.java)
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        return PendingIntent.getBroadcast(this, 0, intent, flags)
    }

    private fun setupGeofence() {
        if (!hasValidHome()) {
            Log.w("GEOFENCE", "Home coordinates not set — geofence not registered.")
            return
        }

        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            return
        }

        val geofence = Geofence.Builder()
            .setRequestId(GEOFENCE_ID)
            .setCircularRegion(homeLat, homeLng, homeRadius)
            .setExpirationDuration(Geofence.NEVER_EXPIRE)
            // Track ENTER as well so returning home clears the "away" latch.
            .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER or Geofence.GEOFENCE_TRANSITION_EXIT)
            .build()

        val geofencingRequest = GeofencingRequest.Builder()
            .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_EXIT)
            .addGeofence(geofence)
            .build()

        geofencingClient.addGeofences(geofencingRequest, getGeofencePendingIntent())
            .addOnSuccessListener {
                Log.i("GEOFENCE", "Geofence successfully added")
            }
            .addOnFailureListener { e ->
                Log.e("GEOFENCE", "Geofence add failed", e)
            }
    }

    private fun buildForegroundNotification(): Notification {
        return NotificationCompat.Builder(this, foregroundChannelId)
            .setContentTitle("Forget Anything? Active")
            .setContentText("Monitoring background triggers")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }

    private fun createForegroundChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val fg = NotificationChannel(foregroundChannelId, "Foreground Service", NotificationManager.IMPORTANCE_LOW)
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(fg)
        }
    }
}
