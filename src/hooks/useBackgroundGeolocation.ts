import { useEffect, useCallback, useRef, useState } from 'react';
import { registerPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';

// Register the plugin
const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

interface HomeLocation {
  latitude: number;
  longitude: number;
}

interface BackgroundGeolocationOptions {
  homeLocation: HomeLocation | null;
  threshold: number;
  onLeaveHome: () => void;
  enabled: boolean;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3;
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

// Cache platform check
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

export const useBackgroundGeolocation = ({
  homeLocation,
  threshold,
  onLeaveHome,
  enabled
}: BackgroundGeolocationOptions) => {
  const watcherIdRef = useRef<string | null>(null);
  const wasAtHomeRef = useRef(true);
  const hasNotifiedRef = useRef(false);
  const onLeaveHomeRef = useRef(onLeaveHome);
  const enabledRef = useRef(enabled);
  const [isBackgroundActive, setIsBackgroundActive] = useState(false);

  // Keep refs updated
  onLeaveHomeRef.current = onLeaveHome;
  enabledRef.current = enabled;

  const checkIfAtHome = useCallback((latitude: number, longitude: number): boolean => {
    if (!homeLocation) return true;
    const distance = calculateDistance(
      latitude,
      longitude,
      homeLocation.latitude,
      homeLocation.longitude
    );
    return distance <= threshold;
  }, [homeLocation, threshold]);

  const startBackgroundTracking = useCallback(async () => {
    const isNative = await checkIsNativePlatform();
    if (!isNative) {
      console.log('[BackgroundGeo] Not on native platform, skipping');
      return false;
    }

    if (!homeLocation) {
      console.log('[BackgroundGeo] No home location set');
      return false;
    }

    try {
      // Stop any existing watcher first
      if (watcherIdRef.current) {
        await BackgroundGeolocation.removeWatcher({ id: watcherIdRef.current });
        watcherIdRef.current = null;
      }

      console.log('[BackgroundGeo] Starting background location tracking');

      const watcherId = await BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: 'Forget-Me-Not is tracking your location to send reminders when you leave home',
          backgroundTitle: 'Location Active',
          requestPermissions: true,
          stale: false,
          distanceFilter: Math.max(50, threshold / 2), // Update at least every half-threshold or 50m
        },
        (location, error) => {
          if (error) {
            if (error.code === 'NOT_AUTHORIZED') {
              console.log('[BackgroundGeo] Location permission not authorized');
            } else {
              console.error('[BackgroundGeo] Error:', error);
            }
            return;
          }

          if (!location || !enabledRef.current) return;

          console.log('[BackgroundGeo] Location update:', {
            lat: location.latitude.toFixed(6),
            lng: location.longitude.toFixed(6),
            accuracy: location.accuracy
          });

          const atHome = checkIfAtHome(location.latitude, location.longitude);

          // Trigger notification when leaving home
          if (wasAtHomeRef.current && !atHome && !hasNotifiedRef.current) {
            console.log('[BackgroundGeo] User left home - triggering notification');
            hasNotifiedRef.current = true;
            onLeaveHomeRef.current();
          }

          // Reset when returning home
          if (atHome && !wasAtHomeRef.current) {
            console.log('[BackgroundGeo] User returned home');
            hasNotifiedRef.current = false;
          }

          wasAtHomeRef.current = atHome;
        }
      );

      watcherIdRef.current = watcherId;
      setIsBackgroundActive(true);
      console.log('[BackgroundGeo] Watcher started with ID:', watcherId);
      return true;
    } catch (error) {
      console.error('[BackgroundGeo] Failed to start:', error);
      return false;
    }
  }, [homeLocation, threshold, checkIfAtHome]);

  const stopBackgroundTracking = useCallback(async () => {
    if (!watcherIdRef.current) return;

    try {
      await BackgroundGeolocation.removeWatcher({ id: watcherIdRef.current });
      console.log('[BackgroundGeo] Stopped tracking');
      watcherIdRef.current = null;
      setIsBackgroundActive(false);
    } catch (error) {
      console.error('[BackgroundGeo] Error stopping:', error);
    }
  }, []);

  const resetNotificationState = useCallback(() => {
    hasNotifiedRef.current = false;
    console.log('[BackgroundGeo] Notification state reset');
  }, []);

  // Start/stop based on enabled state
  useEffect(() => {
    if (enabled && homeLocation) {
      startBackgroundTracking();
    } else {
      stopBackgroundTracking();
    }

    return () => {
      stopBackgroundTracking();
    };
  }, [enabled, homeLocation, startBackgroundTracking, stopBackgroundTracking]);

  return {
    startBackgroundTracking,
    stopBackgroundTracking,
    resetNotificationState,
    isBackgroundActive
  };
};
