import { Capacitor } from '@capacitor/core';

export const requestAlwaysLocationPermission = async (): Promise<boolean> => {
  if (Capacitor.getPlatform() !== 'android') {
    return true; // Not applicable for web
  }

  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    
    // First, check current permission
    const currentPermission = await Geolocation.checkPermissions();
    
    if (currentPermission.location === 'granted') {
      // Already have "while using", now guide to "always allow"
      alert(
        '⚠️ Background Location Required\n\n' +
        'For reminders to work when the app is closed:\n\n' +
        '1. Tap OK\n' +
        '2. Tap "Permissions"\n' +
        '3. Tap "Location"\n' +
        '4. Select "Allow all the time"\n\n' +
        'This ensures notifications work even when the app is closed.'
      );
      
      // Open app settings
      const { NativeSettings } = await import('capacitor-native-settings');
      await NativeSettings.open({
        optionAndroid: 'application_details',
      });
      
      return false; // User needs to manually grant
    } else {
      // Request initial permission
      const permission = await Geolocation.requestPermissions();
      return permission.location === 'granted';
    }
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};

export const requestBatteryOptimizationExemption = async (): Promise<void> => {
  if (Capacitor.getPlatform() !== 'android') {
    return;
  }

  alert(
    '🔋 Battery Optimization Required\n\n' +
    'To ensure background tracking works:\n\n' +
    '1. Tap OK\n' +
    '2. Find "Forget-Me-Not" in the list\n' +
    '3. Tap it and select "Don\'t optimize"\n\n' +
    'This prevents Android from stopping location tracking.'
  );

  try {
    const { NativeSettings } = await import('capacitor-native-settings');
    await NativeSettings.open({
      optionAndroid: 'ignore_battery_optimization',
    });
  } catch (error) {
    console.error('Error opening battery settings:', error);
  }
};