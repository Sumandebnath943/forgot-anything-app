/**
 * WiFi Info utilities for getting SSID on native platforms.
 * Uses @capgo/capacitor-wifi for Android SSID detection.
 * 
 * Note: On iOS, this requires the "Access WiFi Information" capability.
 * On Android, this requires location permission (fine location).
 */

// Cache platform check
let isNativePlatformCached: boolean | null = null;
let platformCached: string | null = null;

const checkIsNativePlatform = async (): Promise<boolean> => {
  if (isNativePlatformCached !== null) {
    return isNativePlatformCached;
  }
  try {
    const { Capacitor } = await import('@capacitor/core');
    isNativePlatformCached = Capacitor.isNativePlatform();
    platformCached = Capacitor.getPlatform();
    return isNativePlatformCached;
  } catch {
    isNativePlatformCached = false;
    return false;
  }
};

export interface WifiInfo {
  ssid: string | null;
  bssid?: string | null;
  isConnected: boolean;
}

/**
 * Get current WiFi SSID using capacitor-wifi plugin on Android.
 * Returns null if not connected to WiFi or unable to determine SSID.
 */
export const getCurrentWifiSSID = async (): Promise<WifiInfo> => {
  try {
    const isNative = await checkIsNativePlatform();
    
    if (!isNative) {
      console.log('[WiFi Info] Not on native platform, SSID unavailable');
      return { ssid: null, isConnected: true };
    }

    // First check if we're on WiFi using the Network plugin
    const { Network } = await import('@capacitor/network');
    const status = await Network.getStatus();
    
    if (status.connectionType !== 'wifi') {
      console.log('[WiFi Info] Not connected to WiFi');
      return { ssid: null, isConnected: false };
    }

    // Try to get SSID using @capgo/capacitor-wifi (Android only)
    if (platformCached === 'android') {
      try {
        const { CapacitorWifi } = await import('@capgo/capacitor-wifi');
        
        // Request permissions first (needed for WiFi SSID on Android)
        const permResult = await CapacitorWifi.checkPermissions();
        console.log('[WiFi Info] Permission status:', permResult);
        
        if (permResult.location !== 'granted') {
          const reqResult = await CapacitorWifi.requestPermissions();
          console.log('[WiFi Info] Permission request result:', reqResult);
          
          if (reqResult.location !== 'granted') {
            console.log('[WiFi Info] Location permission denied, cannot get SSID');
            return { ssid: null, isConnected: true };
          }
        }
        
        // Get current connection info
        const connectionInfo = await CapacitorWifi.getSsid();
        console.log('[WiFi Info] Got SSID:', connectionInfo);
        
        if (connectionInfo && connectionInfo.ssid) {
          // Remove quotes if present (Android sometimes wraps SSID in quotes)
          const cleanSSID = connectionInfo.ssid.replace(/^"|"$/g, '');
          return {
            ssid: cleanSSID || null,
            isConnected: true
          };
        }
      } catch (wifiError) {
        console.warn('[WiFi Info] Error using capacitor-wifi plugin:', wifiError);
        // Fall through to connected but no SSID
      }
    }

    // iOS or fallback: connected to WiFi but can't get SSID
    console.log('[WiFi Info] Connected to WiFi but SSID unavailable (platform:', platformCached, ')');
    return { ssid: null, isConnected: true };
  } catch (error) {
    console.error('[WiFi Info] Error getting WiFi info:', error);
    return { ssid: null, isConnected: false };
  }
};

/**
 * Check if we're likely connected to a specific WiFi network.
 * If homeSSID is empty/null, any WiFi connection is considered "home".
 * If we can't get current SSID but we're on WiFi, assume match (graceful degradation).
 */
export const isConnectedToHomeWifi = async (homeSSID: string | null): Promise<{
  isHome: boolean;
  currentSSID: string | null;
  reason: string;
}> => {
  const wifiInfo = await getCurrentWifiSSID();
  
  // Not connected to any WiFi
  if (!wifiInfo.isConnected) {
    return {
      isHome: false,
      currentSSID: null,
      reason: 'not_connected'
    };
  }
  
  // No home SSID configured = any WiFi is "home"
  if (!homeSSID || homeSSID.trim() === '') {
    return {
      isHome: true,
      currentSSID: wifiInfo.ssid,
      reason: 'no_home_ssid_configured'
    };
  }
  
  // Can't determine current SSID but we're on WiFi
  // Gracefully assume we're home to avoid false triggers
  if (!wifiInfo.ssid) {
    return {
      isHome: true,
      currentSSID: null,
      reason: 'ssid_unavailable'
    };
  }
  
  // Compare SSIDs (case-insensitive, trimmed)
  const normalizedHome = homeSSID.trim().toLowerCase();
  const normalizedCurrent = wifiInfo.ssid.trim().toLowerCase();
  const isMatch = normalizedHome === normalizedCurrent;
  
  return {
    isHome: isMatch,
    currentSSID: wifiInfo.ssid,
    reason: isMatch ? 'ssid_match' : 'ssid_mismatch'
  };
};
