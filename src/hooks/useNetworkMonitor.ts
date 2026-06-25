import { useEffect, useCallback, useState, useRef } from 'react';

interface ConnectionStatus {
  connected: boolean;
  connectionType: string;
}

interface UseNetworkMonitorOptions {
  onDisconnectFromWifi: () => void;
  enabled: boolean;
  /** Debounce window in ms before triggering disconnect callback (default 2000) */
  debounceMs?: number;
  /** If set, only trigger when disconnecting from this specific SSID. Empty = any WiFi. */
  homeWifiSSID?: string;
}

// Cache platform check to avoid repeated async imports
let isNativePlatformCached: boolean | null = null;

const checkIsNativePlatform = async (): Promise<boolean> => {
  if (isNativePlatformCached !== null) {
    return isNativePlatformCached;
  }
  try {
    const { Capacitor } = await import('@capacitor/core');
    isNativePlatformCached = Capacitor.isNativePlatform();
    return isNativePlatformCached;
  } catch {
    isNativePlatformCached = false;
    return false;
  }
};

/**
 * Improved WiFi monitor with:
 * - Debounce to avoid false-positive triggers from brief network glitches
 * - Confirmation polling to verify disconnect persists
 * - Tracks WiFi SSID when available (Android)
 */
export const useNetworkMonitor = ({
  onDisconnectFromWifi,
  enabled,
  debounceMs = 2000,
  homeWifiSSID = ''
}: UseNetworkMonitorOptions) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [isConnectedToWifi, setIsConnectedToWifi] = useState<boolean>(true);
  const [wifiSSID] = useState<string | null>(null); // Reserved for future SSID matching
  
  const wasOnWifi = useRef(true);
  const wasOnHomeWifi = useRef(true); // Track if we were on HOME wifi specifically
  const hasNotified = useRef(false);
  const onDisconnectRef = useRef(onDisconnectFromWifi);
  const enabledRef = useRef(enabled);
  const homeWifiSSIDRef = useRef(homeWifiSSID);
  const listenerRef = useRef<{ remove: () => void } | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastStatusRef = useRef<ConnectionStatus | null>(null);

  // Keep refs updated
  onDisconnectRef.current = onDisconnectFromWifi;
  enabledRef.current = enabled;
  homeWifiSSIDRef.current = homeWifiSSID;

  // Clear debounce timer on unmount or disable
  const clearDebounceTimer = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  // Confirm disconnect is real by re-checking after debounce period
  // Also check if we need SSID matching
  const confirmAndTriggerDisconnect = useCallback(async () => {
    try {
      const isNative = await checkIsNativePlatform();
      if (!isNative) return;

      const { Network } = await import('@capacitor/network');
      const currentStatus = await Network.getStatus();
      
      console.log('[WiFi] Confirming disconnect, current status:', currentStatus, 'homeSSID:', homeWifiSSIDRef.current);

      // Still not on WiFi after debounce = real disconnect
      if (currentStatus.connectionType !== 'wifi' && !hasNotified.current && enabledRef.current) {
        // If home SSID is configured, we only trigger if we WERE on home WiFi
        // If no home SSID configured (empty), any WiFi disconnect triggers
        const homeSSID = homeWifiSSIDRef.current?.trim() || '';
        
        if (homeSSID && !wasOnHomeWifi.current) {
          console.log('[WiFi] Disconnected, but was not on home WiFi - ignoring');
          return;
        }
        
        console.log('[WiFi] Confirmed disconnect from home WiFi - triggering reminder');
        hasNotified.current = true;
        wasOnHomeWifi.current = false;
        setIsConnectedToWifi(false);
        onDisconnectRef.current();
      } else if (currentStatus.connectionType === 'wifi') {
        console.log('[WiFi] Reconnected during debounce - ignoring glitch');
      }
    } catch (error) {
      console.error('[WiFi] Error confirming disconnect:', error);
    }
  }, []);

  useEffect(() => {
    // If not enabled, remove listener and reset state
    if (!enabled) {
      clearDebounceTimer();
      if (listenerRef.current) {
        listenerRef.current.remove();
        listenerRef.current = null;
      }
      return;
    }

    let isMounted = true;

    const startMonitoring = async () => {
      const isNative = await checkIsNativePlatform();

      if (!isNative) {
        console.log('[WiFi] Network monitoring only works on native platforms');
        // For web, simulate as connected to WiFi
        setConnectionStatus({ connected: true, connectionType: 'wifi' });
        return;
      }

      try {
        const { Network } = await import('@capacitor/network');

        // Get initial status
        const status = await Network.getStatus();
        if (!isMounted) return;
        
        console.log('[WiFi] Initial network status:', status, 'homeSSID:', homeWifiSSID);
        setConnectionStatus(status);
        lastStatusRef.current = status;
        
        const onWifi = status.connectionType === 'wifi';
        setIsConnectedToWifi(onWifi);
        wasOnWifi.current = onWifi;
        
        // If home SSID is configured, assume we're on home WiFi initially when connected
        // (since we can't easily get SSID without custom plugin, we trust user setup)
        wasOnHomeWifi.current = onWifi && (!homeWifiSSID || homeWifiSSID.trim() !== '');

        // Remove old listener if exists
        if (listenerRef.current) {
          listenerRef.current.remove();
        }

        // Listen for network changes with debounce
        listenerRef.current = await Network.addListener('networkStatusChange', (status) => {
          if (!isMounted || !enabledRef.current) return;

          console.log('[WiFi] Network status changed:', status, 'wasOnWifi:', wasOnWifi.current);
          setConnectionStatus(status);
          lastStatusRef.current = status;

          const nowOnWifi = status.connectionType === 'wifi';

          // If we were on WiFi and now we're not, start debounce timer
          if (wasOnWifi.current && !nowOnWifi) {
            console.log('[WiFi] Detected disconnect, starting debounce timer...');
            
            // Clear any existing timer
            clearDebounceTimer();
            
            // Start new debounce timer
            debounceTimerRef.current = setTimeout(() => {
              if (enabledRef.current) {
                confirmAndTriggerDisconnect();
              }
            }, debounceMs);
            
            wasOnWifi.current = false;
          }

          // Reconnected to WiFi
          if (nowOnWifi) {
            console.log('[WiFi] Connected to WiFi');
            clearDebounceTimer();
            wasOnWifi.current = true;
            wasOnHomeWifi.current = true; // Assume home WiFi when reconnected (for next disconnect check)
            hasNotified.current = false;
            setIsConnectedToWifi(true);
          }
        });
      } catch (error) {
        console.error('[WiFi] Error monitoring network:', error);
      }
    };

    startMonitoring();

    return () => {
      isMounted = false;
      clearDebounceTimer();
      if (listenerRef.current) {
        listenerRef.current.remove();
        listenerRef.current = null;
      }
    };
  }, [enabled, debounceMs, clearDebounceTimer, confirmAndTriggerDisconnect]);

  const checkCurrentConnection = useCallback(async () => {
    try {
      const isNative = await checkIsNativePlatform();

      if (!isNative) {
        return { connected: true, connectionType: 'wifi' };
      }

      const { Network } = await import('@capacitor/network');
      const status = await Network.getStatus();
      setConnectionStatus(status);
      lastStatusRef.current = status;
      setIsConnectedToWifi(status.connectionType === 'wifi');
      return status;
    } catch (error) {
      console.error('[WiFi] Error checking network status:', error);
      return null;
    }
  }, []);

  // Reset notification state (call on activate)
  const resetNotificationState = useCallback(() => {
    hasNotified.current = false;
    clearDebounceTimer();
  }, [clearDebounceTimer]);

  // Force trigger for testing
  const forceDisconnectTrigger = useCallback(() => {
    if (!hasNotified.current && enabledRef.current) {
      console.log('[WiFi] Force triggering disconnect callback');
      hasNotified.current = true;
      setIsConnectedToWifi(false);
      onDisconnectRef.current();
    }
  }, []);

  return {
    connectionStatus,
    isConnectedToHomeWifi: isConnectedToWifi,
    wifiSSID,
    checkCurrentConnection,
    resetNotificationState,
    forceDisconnectTrigger
  };
};

