import { useEffect, useCallback, useState, useRef } from 'react';
import { useBackgroundGeolocation } from './useBackgroundGeolocation';

interface HomeLocation {
  latitude: number;
  longitude: number;
}

interface Position {
  coords: {
    latitude: number;
    longitude: number;
  };
}

interface UseLocationMonitorOptions {
  homeLocation: HomeLocation | null;
  threshold?: number; // meters
  onLeaveHome: () => void;
  enabled: boolean;
  useBackground?: boolean; // Enable background tracking when app is closed
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

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const useLocationMonitor = ({
  homeLocation,
  threshold = 100,
  onLeaveHome,
  enabled,
  useBackground = true
}: UseLocationMonitorOptions) => {
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [isAtHome, setIsAtHome] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const watchId = useRef<string | null>(null);
  const hasNotified = useRef(false);
  const wasAtHomeRef = useRef<boolean | null>(null);
  const onLeaveHomeRef = useRef(onLeaveHome);
  const enabledRef = useRef(enabled);

  // Background geolocation for when app is closed
  const {
    resetNotificationState: resetBackgroundNotification,
    isBackgroundActive
  } = useBackgroundGeolocation({
    homeLocation,
    threshold,
    onLeaveHome,
    enabled: false // DISABLED: We use our custom MyForegroundService for background location now
  });

  // Keep callback refs updated
  onLeaveHomeRef.current = onLeaveHome;
  enabledRef.current = enabled;

  const checkIfAtHome = useCallback((position: Position): boolean => {
    if (!homeLocation) return true;

    const distance = calculateDistance(
      position.coords.latitude,
      position.coords.longitude,
      homeLocation.latitude,
      homeLocation.longitude
    );

    return distance <= threshold;
  }, [homeLocation, threshold]);

  // Check permission status (can be called on resume)
  const checkPermissionStatus = useCallback(async () => {
    try {
      const isNative = await checkIsNativePlatform();
      if (!isNative) {
        setPermissionGranted(null); // null = not applicable on web
        return null;
      }

      const { Geolocation } = await import('@capacitor/geolocation');
      const status = await Geolocation.checkPermissions();
      const granted = status.location === 'granted' || status.coarseLocation === 'granted';
      setPermissionGranted(granted);
      return granted;
    } catch (error) {
      console.error('Error checking location permission:', error);
      return false;
    }
  }, []);

  // Start monitoring
  useEffect(() => {
    // If not enabled, don't start monitoring - but do clear any existing watch
    if (!enabled) {
      if (watchId.current) {
        import('@capacitor/geolocation').then(({ Geolocation }) => {
          Geolocation.clearWatch({ id: watchId.current! });
          watchId.current = null;
        }).catch(() => {});
      }
      return;
    }

    if (!homeLocation) {
      return;
    }

    let isMounted = true;

    const startWatching = async () => {
      const isNative = await checkIsNativePlatform();

      if (!isNative) {
        console.log('Location monitoring only works on native platforms');
        setPermissionGranted(null);
        return;
      }

      try {
        const { Geolocation } = await import('@capacitor/geolocation');

        // Check current permission first
        const permCheck = await Geolocation.checkPermissions();
        if (permCheck.location !== 'granted' && permCheck.coarseLocation !== 'granted') {
          // Request permission
          const permission = await Geolocation.requestPermissions();
          if (!isMounted) return;
          const granted = permission.location === 'granted' || permission.coarseLocation === 'granted';
          setPermissionGranted(granted);

          if (!granted) {
            console.log('Location permission not granted');
            return;
          }
        } else {
          if (!isMounted) return;
          setPermissionGranted(true);
        }

        // Get initial position
        try {
          const initialPosition = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 10000
          });
          if (!isMounted) return;
          setCurrentPosition(initialPosition);
          const atHome = checkIfAtHome(initialPosition);
          setIsAtHome(atHome);
          wasAtHomeRef.current = atHome;
        } catch (posError) {
          console.log('Could not get initial position:', posError);
        }

        // Clear any existing watch
        if (watchId.current) {
          await Geolocation.clearWatch({ id: watchId.current });
          watchId.current = null;
        }

        watchId.current = await Geolocation.watchPosition(
          {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 10000 // Allow cached positions up to 10s old for perf
          },
          (position, err) => {
            if (err) {
              console.error('Error watching position:', err);
              return;
            }

            if (!isMounted || !enabledRef.current) return;

            if (position) {
              setCurrentPosition(position);
              const atHome = checkIfAtHome(position);

              // Trigger notification when leaving home (was at home, now not at home)
              if (wasAtHomeRef.current === true && !atHome && !hasNotified.current) {
                console.log('User left home - triggering notification');
                hasNotified.current = true;
                onLeaveHomeRef.current();
              }

              // Reset notification flag when returning home
              if (atHome && wasAtHomeRef.current === false) {
                console.log('User returned home - resetting notification flag');
                hasNotified.current = false;
              }

              wasAtHomeRef.current = atHome;
              setIsAtHome(atHome);
            }
          }
        );
      } catch (error) {
        console.error('Error starting location watch:', error);
      }
    };

    startWatching();

    return () => {
      isMounted = false;
      if (watchId.current) {
        import('@capacitor/geolocation').then(({ Geolocation }) => {
          Geolocation.clearWatch({ id: watchId.current! });
          watchId.current = null;
        }).catch(() => {});
      }
    };
  }, [enabled, homeLocation, checkIfAtHome]);

  const getCurrentLocation = useCallback(async (): Promise<Position | null> => {
    try {
      const isNative = await checkIsNativePlatform();

      if (!isNative) {
        console.log('Getting current location only works on native platforms');
        return null;
      }

      const { Geolocation } = await import('@capacitor/geolocation');
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      setCurrentPosition(position);
      return position;
    } catch (error) {
      console.error('Error getting current position:', error);
      return null;
    }
  }, []);

  // Reset notification state (call on activate)
  const resetNotificationState = useCallback(() => {
    hasNotified.current = false;
    resetBackgroundNotification();
  }, [resetBackgroundNotification]);

  return {
    currentPosition,
    isAtHome,
    permissionGranted,
    getCurrentLocation,
    checkPermissionStatus,
    resetNotificationState,
    isBackgroundActive
  };
};

