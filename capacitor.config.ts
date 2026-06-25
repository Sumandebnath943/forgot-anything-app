import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.rememberme',
  appName: 'Forget Anything?',
  webDir: 'dist',
  // Remove server.url for production builds - loads from bundled assets
  // Uncomment below for development hot-reload:
  // server: {
  //   url: 'http://localhost:8080',
  //   cleartext: true
  // },
  android: {
    // Required for background-geolocation to work properly after 5 min
    useLegacyBridge: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    LocalNotifications: {
      smallIcon: 'ic_launcher',
      iconColor: '#488AFF',
      sound: 'beep.wav'
    },
    // Add BackgroundGeolocation configuration
    BackgroundGeolocation: {
      notificationChannelName: "Location Tracking",
      notificationTitle: "Forget-Me-Not Active",
      notificationText: "Monitoring your location for reminders"
    }
  }
};

export default config;