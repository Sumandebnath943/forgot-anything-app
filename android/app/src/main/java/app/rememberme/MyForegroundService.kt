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
import android.location.LocationManager
import java.util.Random
import com.google.android.gms.location.GeofencingClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingRequest
import androidx.core.content.ContextCompat

class MyForegroundService : Service() {

    private val foregroundChannelId = "foreground_service_channel"
    
    private var wakeLock: PowerManager.WakeLock? = null
    
    // Preferences variables
    private var mode = "daily"
    private var trigger = "both"
    private var isActive = false
    private var homeLat: Double = 0.0
    private var homeLng: Double = 0.0
    private var homeRadius = 100f
    private var items = ""
    private var timingStyle = "burst"
    private var followUpDelay = 45
    private var thirdDelay = 105

    private val random = Random()

    private val DAILY_GENERAL = arrayOf("🚪 Going out?", "⚡ One last thing!", "🏠 Leaving home?", "👋 Hey there!", "🔔 Reminder check!")
    private val DAILY_SNARKY = arrayOf("🤔 Be honest...", "😅 Again?", "🙈 Just checking...", "🎯 Pro tip:", "💭 Quick thought:")
    private val TRIP_TEMPLATES = arrayOf("✈️ Trip check!", "🧳 Before you go...", "🗺️ Adventure awaits!", "🎒 Travel reminder", "🚀 Ready to go?")

    private lateinit var connectivityManager: ConnectivityManager
    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    private var hasNotifiedWifi = false

    private lateinit var geofencingClient: GeofencingClient
    private val GEOFENCE_ID = "HOME_GEOFENCE"

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
        
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
        val prefs = getSharedPreferences("service_prefs", Context.MODE_PRIVATE)
        mode = prefs.getString("mode", "daily") ?: "daily"
        trigger = prefs.getString("trigger", "both") ?: "both"
        isActive = prefs.getBoolean("isActive", false)
        homeLat = java.lang.Double.longBitsToDouble(prefs.getLong("home_lat", 0L))
        homeLng = java.lang.Double.longBitsToDouble(prefs.getLong("home_lng", 0L))
        homeRadius = prefs.getFloat("home_radius", 100f)
        items = prefs.getString("items", "") ?: ""
        timingStyle = prefs.getString("timingStyle", "burst") ?: "burst"
        followUpDelay = prefs.getInt("followUpDelaySeconds", 45)
        thirdDelay = prefs.getInt("thirdDelaySeconds", 105)
    }

    private fun setupListeners() {
        teardownListeners()
        
        if (!isActive) return

        if (trigger == "wifi" || trigger == "both") {
            setupWifiListener()
        }
        
        if (trigger == "location" || trigger == "both") {
            setupGeofence()
        }
    }

    private fun teardownListeners() {
        // Teardown WiFi
        networkCallback?.let {
            try { connectivityManager.unregisterNetworkCallback(it) } catch (e: Exception) {}
            networkCallback = null
        }
        
        // Teardown Geofence
        geofencingClient.removeGeofences(listOf(GEOFENCE_ID))
    }

    private fun setupWifiListener() {
        hasNotifiedWifi = false
        val request = NetworkRequest.Builder()
            .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
            .build()

        networkCallback = object : ConnectivityManager.NetworkCallback() {
            override fun onLost(network: Network) {
                super.onLost(network)
                Log.i("WIFI_TRACKING", "WiFi Lost!")
                
                if (trigger == "wifi") {
                    if (!hasNotifiedWifi) {
                        triggerReminders()
                        hasNotifiedWifi = true
                    }
                } else if (trigger == "both") {
                    if (hasNotifiedWifi) return
                    
                    if (ContextCompat.checkSelfPermission(this@MyForegroundService, android.Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                        val fusedLocationClient = LocationServices.getFusedLocationProviderClient(this@MyForegroundService)
                        fusedLocationClient.lastLocation.addOnSuccessListener { location: Location? ->
                            if (location != null) {
                                val results = FloatArray(1)
                                Location.distanceBetween(homeLat, homeLng, location.latitude, location.longitude, results)
                                if (results[0] > homeRadius) {
                                    triggerReminders()
                                    hasNotifiedWifi = true
                                } else {
                                    Log.i("WIFI_TRACKING", "WiFi lost but still in geofence (lastLocation). Ignoring.")
                                }
                            } else {
                                // lastLocation is null — request a fresh fix instead of blindly firing
                                Log.i("WIFI_TRACKING", "WiFi lost, lastLocation null — requesting fresh location")
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
                                                val dist = FloatArray(1)
                                                Location.distanceBetween(homeLat, homeLng, freshLoc.latitude, freshLoc.longitude, dist)
                                                if (dist[0] > homeRadius && !hasNotifiedWifi) {
                                                    triggerReminders()
                                                    hasNotifiedWifi = true
                                                } else {
                                                    Log.i("WIFI_TRACKING", "WiFi lost but fresh location confirms still in geofence. Ignoring.")
                                                }
                                            }
                                        },
                                        Looper.getMainLooper()
                                    )
                                } catch (e: Exception) {
                                    Log.e("WIFI_TRACKING", "Fresh location request failed, skipping notification", e)
                                }
                            }
                        }
                    } else {
                        // No location permission in "both" mode — cannot confirm user left, skip
                        Log.w("WIFI_TRACKING", "WiFi lost but no location permission in 'both' mode. Skipping notification.")
                    }
                }
            }

            override fun onAvailable(network: Network) {
                super.onAvailable(network)
                Log.i("WIFI_TRACKING", "WiFi Connected!")
                hasNotifiedWifi = false
            }
        }
        
        try {
            connectivityManager.registerNetworkCallback(request, networkCallback!!)
        } catch (e: Exception) {
            Log.e("WIFI_TRACKING", "Failed to register network callback", e)
        }
    }

    private fun getGeofencePendingIntent(): PendingIntent {
        val intent = Intent(this, GeofenceBroadcastReceiver::class.java)
        // FLAG_MUTABLE or FLAG_UPDATE_CURRENT based on OS
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        return PendingIntent.getBroadcast(this, 0, intent, flags)
    }

    private fun setupGeofence() {
        if (homeLat == 0.0 || homeLng == 0.0) return
        
        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            return
        }

        val geofence = Geofence.Builder()
            .setRequestId(GEOFENCE_ID)
            .setCircularRegion(homeLat, homeLng, homeRadius)
            .setExpirationDuration(Geofence.NEVER_EXPIRE)
            .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_EXIT)
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

    private fun triggerReminders() {
        val itemsList = items.split(",").filter { it.isNotEmpty() }
        val itemsLine = if (itemsList.isNotEmpty()) "\n📋 " + itemsList.joinToString(", ") else ""

        val now = System.currentTimeMillis()
        val baseId = (now % 1000000).toInt()

        val title1 = if (mode == "daily") DAILY_GENERAL[random.nextInt(DAILY_GENERAL.size)] else TRIP_TEMPLATES[random.nextInt(TRIP_TEMPLATES.size)]
        val body1 = "Quick check before you go!" + itemsLine
        
        sendNotification(baseId, title1, body1)

        if (timingStyle == "burst") {
            val title2 = if (mode == "daily") "🤔 Did you forget something?" else TRIP_TEMPLATES[random.nextInt(TRIP_TEMPLATES.size)]
            val body2 = "Don't forget your essentials!" + itemsLine
            
            Handler(Looper.getMainLooper()).postDelayed({
                sendNotification(baseId + 1, title2, body2)
            }, followUpDelay * 1000L)

            if (mode == "daily") {
                val title3 = DAILY_SNARKY[random.nextInt(DAILY_SNARKY.size)]
                val body3 = "Is your wallet still on the table?" + itemsLine
                
                Handler(Looper.getMainLooper()).postDelayed({
                    sendNotification(baseId + 2, title3, body3)
                }, thirdDelay * 1000L)
            }
        }
    }

    private fun sendNotification(id: Int, title: String, message: String) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val notification = NotificationCompat.Builder(this, reminderChannelId)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setAutoCancel(true)
            .build()

        nm.notify(id, notification)
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

    private val reminderChannelId = "reminders_high_v2"

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val fg = NotificationChannel(foregroundChannelId, "Foreground Service", NotificationManager.IMPORTANCE_LOW)
            val reminder = NotificationChannel(reminderChannelId, "Reminders", NotificationManager.IMPORTANCE_HIGH)
            reminder.enableVibration(true)
            
            val soundUri = android.net.Uri.parse("android.resource://" + packageName + "/raw/alert")
            val audioAttributes = android.media.AudioAttributes.Builder()
                .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                .build()
            reminder.setSound(soundUri, audioAttributes)
            
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(fg)
            nm.createNotificationChannel(reminder)
        }
    }
}
