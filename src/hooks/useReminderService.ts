import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useNotifications, NotificationPayload } from './useNotifications';
import { useLocationMonitor } from './useLocationMonitor';
import { useNetworkMonitor } from './useNetworkMonitor';
import { useAppLifecycle } from './useAppLifecycle';
import { TriggerType, ReminderMode, NotificationTimingSettings } from '@/types/reminder';

interface HomeLocation {
  latitude: number;
  longitude: number;
}

interface UseReminderServiceOptions {
  selectedItems: string[];
  trigger: TriggerType;
  homeLocation: HomeLocation | null;
  homeWifiSSID?: string;
  isActive: boolean;
  mode: ReminderMode;
  geofenceRadiusMeters: number;
  notificationTiming: NotificationTimingSettings;
  /** Trip window — only enforced in trip mode. */
  tripStartDate?: Date | null;
  tripEndDate?: Date | null;
}

export const useReminderService = ({
  selectedItems,
  trigger,
  homeLocation,
  homeWifiSSID,
  isActive,
  mode,
  geofenceRadiusMeters,
  notificationTiming,
  tripStartDate,
  tripEndDate
}: UseReminderServiceOptions) => {
  const {
    sendReminderNotification,
    permissionGranted: notificationPermission,
    testNotification,
    cancelAllScheduledNotifications
  } = useNotifications();

  const prevIsActiveRef = useRef(isActive);

  // On native, the Android foreground service (ReminderEngine) is the single
  // source of truth for firing notifications. The JS monitors still run to
  // surface live status in the UI, but they must NOT also fire notifications
  // (that caused duplicate reminders and an inconsistent second "both" gate).
  const isNativeRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    import('@capacitor/core')
      .then(({ Capacitor }) => {
        if (!cancelled) isNativeRef.current = Capacitor.isNativePlatform();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // --- "Both" trigger gate ---
  // When trigger === "both", we require BOTH conditions (wifi disconnected
  // AND outside geofence) before sending a notification.  Each monitor
  // updates its own "away" flag, then we evaluate the combined state.
  const wifiAwayRef = useRef(false);
  const locationAwayRef = useRef(false);
  const bothHasNotifiedRef = useRef(false);
  const triggerRef = useRef(trigger);
  triggerRef.current = trigger;

  const sendNotification = useCallback((reason: 'location' | 'wifi' | 'both') => {
    if (!isActive) {
      console.log('[ReminderService] sendNotification called but monitoring is inactive');
      return;
    }
    if (isNativeRef.current) {
      // Native foreground service handles firing; JS stays status-only to avoid duplicates.
      console.log(`[ReminderService] (native) skipping JS notification, reason: ${reason} — handled by ReminderEngine`);
      return;
    }
    if (selectedItems.length > 0) {
      console.log(`[ReminderService] Sending notification, reason: ${reason}, mode: ${mode}, items:`, selectedItems);
      const payload: NotificationPayload = {
        mode,
        reason,
        selectedItemIds: selectedItems,
        timingSettings: notificationTiming
      };
      sendReminderNotification(payload);
    }
  }, [selectedItems, mode, sendReminderNotification, isActive, notificationTiming]);

  /**
   * Evaluate the combined "both" gate.  Called whenever either monitor
   * reports a state change.  Only fires once until the user returns home
   * (i.e. at least one condition goes back to "home").
   */
  const evaluateBothGate = useCallback(() => {
    if (bothHasNotifiedRef.current) return;

    if (wifiAwayRef.current && locationAwayRef.current) {
      console.log('[ReminderService] BOTH gate: wifi=away, location=away → firing notification');
      bothHasNotifiedRef.current = true;
      sendNotification('both');
    } else {
      console.log(`[ReminderService] BOTH gate: wifi=${wifiAwayRef.current ? 'away' : 'home'}, location=${locationAwayRef.current ? 'away' : 'home'} → waiting`);
    }
  }, [sendNotification]);

  // Handlers called by the individual monitors
  const handleWifiDisconnect = useCallback(() => {
    if (triggerRef.current === 'both') {
      wifiAwayRef.current = true;
      evaluateBothGate();
    } else {
      // wifi-only mode: fire immediately
      sendNotification('wifi');
    }
  }, [evaluateBothGate, sendNotification]);

  const handleLocationLeave = useCallback(() => {
    if (triggerRef.current === 'both') {
      locationAwayRef.current = true;
      evaluateBothGate();
    } else {
      // location-only mode: fire immediately
      sendNotification('location');
    }
  }, [evaluateBothGate, sendNotification]);

  const shouldMonitorLocation = trigger === 'location' || trigger === 'both';
  const shouldMonitorNetwork = trigger === 'wifi' || trigger === 'both';

  const {
    currentPosition,
    isAtHome,
    permissionGranted: locationPermission,
    getCurrentLocation,
    checkPermissionStatus,
    resetNotificationState: resetLocationNotification,
    isBackgroundActive
  } = useLocationMonitor({
    homeLocation,
    threshold: geofenceRadiusMeters,
    onLeaveHome: handleLocationLeave,
    enabled: isActive && shouldMonitorLocation,
    useBackground: true
  });

  const {
    isConnectedToHomeWifi,
    connectionStatus,
    checkCurrentConnection,
    resetNotificationState: resetNetworkNotification
  } = useNetworkMonitor({
    onDisconnectFromWifi: handleWifiDisconnect,
    enabled: isActive && shouldMonitorNetwork,
    homeWifiSSID
  });

  // Keep "both" gate in sync with reconnections / returning home.
  // When the user reconnects to WiFi or re-enters the geofence, reset
  // the corresponding away flag and the "has notified" latch so the
  // next departure can fire again.
  useEffect(() => {
    if (trigger !== 'both') return;

    if (isConnectedToHomeWifi) {
      wifiAwayRef.current = false;
    }
    if (isAtHome) {
      locationAwayRef.current = false;
    }
    // Reset notification latch when at least one condition returns to "home"
    if (isConnectedToHomeWifi || isAtHome) {
      bothHasNotifiedRef.current = false;
    }
  }, [trigger, isConnectedToHomeWifi, isAtHome]);

  // Cancel scheduled notifications when deactivated
  useEffect(() => {
    if (prevIsActiveRef.current && !isActive) {
      console.log('Monitoring deactivated - cancelling scheduled notifications');
      cancelAllScheduledNotifications();
    }

    // Reset notification states when activated
    if (!prevIsActiveRef.current && isActive) {
      console.log('Monitoring activated - resetting notification states');
      resetLocationNotification();
      resetNetworkNotification();
      wifiAwayRef.current = false;
      locationAwayRef.current = false;
      bothHasNotifiedRef.current = false;
    }

    prevIsActiveRef.current = isActive;
  }, [isActive, cancelAllScheduledNotifications, resetLocationNotification, resetNetworkNotification]);

  // Sync settings to native Android Plugin (debounced to avoid hammering on rapid changes)
  useEffect(() => {
    const timer = setTimeout(() => {
      const syncToNative = async () => {
        try {
          const { ReminderPlugin } = await import('@/integrations/ReminderPlugin');
          await ReminderPlugin.syncSettings({
            mode,
            trigger,
            isActive,
            homeLat: homeLocation?.latitude || 0,
            homeLng: homeLocation?.longitude || 0,
            radius: geofenceRadiusMeters,
            homeWifiSSID: homeWifiSSID || '',
            items: selectedItems.join(','),
            timingStyle: notificationTiming.style,
            followUpDelaySeconds: notificationTiming.followUpDelaySeconds,
            thirdDelaySeconds: notificationTiming.thirdDelaySeconds,
            // Trip window: only meaningful in trip mode; end-of-day on the end date.
            tripStartMs: mode === 'trip' && tripStartDate ? new Date(tripStartDate).setHours(0, 0, 0, 0) : 0,
            tripEndMs: mode === 'trip' && tripEndDate ? new Date(tripEndDate).setHours(23, 59, 59, 999) : 0
          });
          console.log('Settings synced to native plugin');
        } catch (err) {
          console.log('Could not sync settings to native plugin (are you on web?)', err);
        }
      };
      syncToNative();
    }, 500);
    return () => clearTimeout(timer);
  }, [selectedItems, trigger, homeLocation, homeWifiSSID, isActive, mode, geofenceRadiusMeters, notificationTiming, tripStartDate, tripEndDate]);

  // App lifecycle - refresh permissions/status on resume
  useAppLifecycle({
    onResume: useCallback(() => {
      console.log('[ReminderService] App resumed, refreshing status');
      checkPermissionStatus();
      checkCurrentConnection();
    }, [checkPermissionStatus, checkCurrentConnection])
  });

  const status = useMemo(() => {
    if (!isActive) return 'inactive';

    if (trigger === 'both') {
      if (!isAtHome && !isConnectedToHomeWifi) {
        return 'away';
      }
      return 'home';
    }

    if (trigger === 'location') {
      return isAtHome ? 'home' : 'away';
    }

    if (trigger === 'wifi') {
      return isConnectedToHomeWifi ? 'home' : 'away';
    }

    return 'unknown';
  }, [isActive, trigger, isAtHome, isConnectedToHomeWifi]);

  return {
    status,
    isAtHome,
    isConnectedToHomeWifi,
    connectionStatus,
    notificationPermission,
    locationPermission,
    getCurrentLocation,
    currentPosition,
    isBackgroundActive,
    testNotification: () => testNotification(mode, selectedItems, notificationTiming)
  };
};

