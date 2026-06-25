import { useEffect, useCallback, useState, useRef } from 'react';
import { ReminderMode, NotificationTimingSettings } from '@/types/reminder';
import { reminderItems } from '@/data/items';

// Notification templates for daily mode
const DAILY_GENERAL_TEMPLATES = [
  { title: "🚪 Going out?", body: "Quick check before you step out!" },
  { title: "⚡ One last thing!", body: "Did you take everything you need?" },
  { title: "🏠 Leaving home?", body: "Make sure you've got all your stuff!" },
  { title: "👋 Hey there!", body: "Don't forget to grab your essentials!" },
  { title: "🔔 Reminder check!", body: "Got everything? Double-check now!" },
];

const DAILY_SNARKY_TEMPLATES = [
  { title: "🤔 Be honest...", body: "Is your wallet still on the table?" },
  { title: "😅 Again?", body: "Double-check those keys!" },
  { title: "🙈 Just checking...", body: "You didn't forget anything, right?" },
  { title: "🎯 Pro tip:", body: "Check your pockets before you leave!" },
  { title: "💭 Quick thought:", body: "When did you last see your phone?" },
];

// Notification templates for trip mode
const TRIP_TEMPLATES = [
  { title: "✈️ Trip check!", body: "Do you have everything packed?" },
  { title: "🧳 Before you go...", body: "Quick packing verification!" },
  { title: "🗺️ Adventure awaits!", body: "Make sure you've got all essentials!" },
  { title: "🎒 Travel reminder", body: "Final check before departure!" },
  { title: "🚀 Ready to go?", body: "Confirm you've packed everything!" },
];

// Item-specific templates (for daily mode)
const getItemSpecificTemplate = (items: { name: string; icon: string }[]) => {
  if (items.length === 0) return null;

  const templates = [
    (item: { name: string; icon: string }) => ({
      title: `${item.icon} Did you take your ${item.name}?`,
      body: "Quick check before you go!"
    }),
    (item: { name: string; icon: string }) => ({
      title: `🤔 ${item.name} check!`,
      body: `Don't forget your ${item.icon} ${item.name.toLowerCase()}!`
    }),
    (item: { name: string; icon: string }) => ({
      title: `${item.icon} Hey!`,
      body: `Your ${item.name.toLowerCase()} might be waiting for you at home!`
    }),
  ];

  const randomItem = items[Math.floor(Math.random() * items.length)];
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
  return randomTemplate(randomItem);
};

const getRandomTemplate = (templates: { title: string; body: string }[]) => {
  return templates[Math.floor(Math.random() * templates.length)];
};

export interface NotificationPayload {
  mode: ReminderMode;
  reason: 'location' | 'wifi' | 'both';
  selectedItemIds: string[];
  timingSettings?: NotificationTimingSettings;
}

// Note: We intentionally avoid a time-based cooldown; the location/wifi monitors
// already ensure "one notification per leave" using their own state.

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

const ANDROID_REMINDER_CHANNEL = {
  id: 'reminders_high',
  name: 'Important Reminders',
  description: 'High priority reminders when leaving home',
  importance: 5, // MAX importance
  visibility: 1, // PUBLIC
  sound: 'default',
  vibration: true,
  lights: true,
  lightColor: '#FF6B6B',
} as const;

/**
 * Capacitor LocalNotifications uses numeric IDs.
 * Keep IDs safely within signed 32-bit range to avoid silent failures on Android.
 */
const generateBaseNotificationId = () => {
  const MAX_INT32 = 2_147_483_647;
  // Leave some headroom for +1/+2 in burst mode
  const headroom = 10;
  const base = Date.now() % (MAX_INT32 - headroom);
  const jitter = Math.floor(Math.random() * 7); // 0..6
  return Math.floor(base) + jitter;
};

const ensureAndroidChannel = async () => {
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  try {
    await LocalNotifications.createChannel(ANDROID_REMINDER_CHANNEL);
    return true;
  } catch (err) {
    // Often throws if it already exists; treat as OK.
    return false;
  }
};

export const useNotifications = () => {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [channelCreated, setChannelCreated] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const initializationRef = useRef(false);
  const scheduledNotificationIds = useRef<number[]>([]);

  useEffect(() => {
    // Prevent double initialization
    if (initializationRef.current) return;
    initializationRef.current = true;

    const initNotifications = async () => {
      try {
        const isNativePlatform = await checkIsNativePlatform();
        setIsNative(isNativePlatform);

        // Web fallback - use browser Notification API
        if (!isNativePlatform) {
          console.log('Using web Notification API');
          if ('Notification' in window) {
            if (Notification.permission === 'granted') {
              setPermissionGranted(true);
            } else if (Notification.permission !== 'denied') {
              const permission = await Notification.requestPermission();
              setPermissionGranted(permission === 'granted');
            }
          }
          return;
        }

        const { LocalNotifications } = await import('@capacitor/local-notifications');

        // Check current permission status first
        const currentPermission = await LocalNotifications.checkPermissions();
        console.log('Current notification permission:', currentPermission);

        if (currentPermission.display !== 'granted') {
          // Request permission
          const requestResult = await LocalNotifications.requestPermissions();
          console.log('Permission request result:', requestResult);
          setPermissionGranted(requestResult.display === 'granted');
        } else {
          setPermissionGranted(true);
        }

        // Create high-importance notification channel for Android
        try {
          await ensureAndroidChannel();
          console.log('Notification channel ensured');
        } catch (channelError) {
          console.log('Channel ensure failed:', channelError);
        } finally {
          setChannelCreated(true);
        }

        // Register action types
        try {
          await LocalNotifications.registerActionTypes({
            types: [
              {
                id: 'REMINDER_ACTIONS',
                actions: [
                  {
                    id: 'check',
                    title: '✅ Got everything!'
                  },
                  {
                    id: 'open',
                    title: '📋 Open checklist'
                  }
                ]
              }
            ]
          });
          console.log('Action types registered');
        } catch (actionError) {
          console.log('Action type registration:', actionError);
        }

        // Listen for notification actions
        await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
          console.log('Notification action performed:', notification);
        });

      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };

    initNotifications();

    return () => {
      checkIsNativePlatform().then((isNative) => {
        if (isNative) {
          import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
            LocalNotifications.removeAllListeners();
          }).catch(() => {});
        }
      });
    };
  }, []);

  // Cancel all scheduled notifications
  const cancelAllScheduledNotifications = useCallback(async () => {
    try {
      const isNativePlatform = await checkIsNativePlatform();
      if (!isNativePlatform) return;

      const { LocalNotifications } = await import('@capacitor/local-notifications');

      // Cancel by IDs we tracked
      if (scheduledNotificationIds.current.length > 0) {
        await LocalNotifications.cancel({
          notifications: scheduledNotificationIds.current.map(id => ({ id }))
        });
        console.log('Cancelled scheduled notifications:', scheduledNotificationIds.current);
        scheduledNotificationIds.current = [];
      }

      // Also get pending and cancel all
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map(n => ({ id: n.id }))
        });
        console.log('Cancelled all pending notifications');
      }
    } catch (error) {
      console.error('Error cancelling notifications:', error);
    }
  }, []);

  const sendReminderNotification = useCallback(async (payload: NotificationPayload, bypassCooldown = false) => {
    try {
      const isNativePlatform = await checkIsNativePlatform();
      const timingSettings = payload.timingSettings || {
        style: 'burst' as const,
        followUpDelaySeconds: 45,
        thirdDelaySeconds: 105,
      };

      // Load custom items from localStorage so custom_* IDs can be resolved
      let customItems: { id: string; name: string; icon: string }[] = [];
      try {
        const stored = localStorage.getItem('forgetmenot_custom_items');
        if (stored) customItems = JSON.parse(stored);
      } catch {
        // ignore parse errors
      }

      const selectedItems = payload.selectedItemIds
        .map((id) => {
          // Check static items first
          const item = reminderItems.find((i) => i.id === id);
          if (item) return { name: item.name, icon: item.icon };
          // Check custom items (stored with prefix custom_)
          if (id.startsWith('custom_')) {
            const rawId = id.slice('custom_'.length);
            const custom = customItems.find((c) => c.id === rawId);
            if (custom) return { name: custom.name, icon: custom.icon };
          }
          return null;
        })
        .filter(Boolean) as { name: string; icon: string }[];

      const itemsLine =
        selectedItems.length > 0
          ? `\n📋 ${selectedItems.map((i) => i.name).join(', ')}`
          : '';

      // -------- Web fallback --------
      if (!isNativePlatform) {
        const fireWeb = async (template: { title: string; body: string }) => {
          if (!('Notification' in window)) return;

          if (Notification.permission === 'granted') {
            new Notification(template.title, {
              body: template.body + itemsLine,
              icon: '/favicon.ico',
              tag: 'reminder-notification',
            });
            return;
          }

          if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              new Notification(template.title, {
                body: template.body + itemsLine,
                icon: '/favicon.ico',
                tag: 'reminder-notification',
              });
            }
          }
        };

        const template1 =
          payload.mode === 'daily'
            ? getRandomTemplate(DAILY_GENERAL_TEMPLATES)
            : getRandomTemplate(TRIP_TEMPLATES);

        await fireWeb(template1);

        if (timingSettings.style === 'burst') {
          // 2nd
          const secondTemplate =
            payload.mode === 'daily' && selectedItems.length > 0
              ? getItemSpecificTemplate(selectedItems) || getRandomTemplate(DAILY_GENERAL_TEMPLATES)
              : getRandomTemplate(TRIP_TEMPLATES.filter((t) => t !== template1));

          window.setTimeout(() => {
            fireWeb(secondTemplate);
          }, Math.max(1, timingSettings.followUpDelaySeconds) * 1000);

          // 3rd (daily only)
          if (payload.mode === 'daily') {
            const thirdTemplate = getRandomTemplate(DAILY_SNARKY_TEMPLATES);
            window.setTimeout(() => {
              fireWeb(thirdTemplate);
            }, Math.max(1, timingSettings.thirdDelaySeconds) * 1000);
          }
        }

        return;
      }

      // -------- Native platform --------
      const { LocalNotifications } = await import('@capacitor/local-notifications');

      // Check permission before sending
      const permStatus = await LocalNotifications.checkPermissions();
      if (permStatus.display !== 'granted') {
        console.log('Notification permission not granted, requesting...');
        const result = await LocalNotifications.requestPermissions();
        if (result.display !== 'granted') {
          console.log('User denied notification permission');
          return;
        }
        setPermissionGranted(true);
      }

      // Ensure Android channel exists before scheduling (otherwise Android may drop notifications)
      try {
        await ensureAndroidChannel();
        setChannelCreated(true);
      } catch {}

      const notifications: any[] = [];

      // IMPORTANT: keep IDs within signed 32-bit range; large IDs can break scheduling on Android
      const now = Date.now();
      const baseId = generateBaseNotificationId();

      // First notification - near-immediate
      const template1 =
        payload.mode === 'daily'
          ? getRandomTemplate(DAILY_GENERAL_TEMPLATES)
          : getRandomTemplate(TRIP_TEMPLATES);

      notifications.push({
        title: template1.title,
        body: template1.body + itemsLine,
        id: baseId,
        schedule: { at: new Date(now + 1000) },
        channelId: 'reminders_high',
        actionTypeId: 'REMINDER_ACTIONS',
        sound: 'default',
        extra: {
          mode: payload.mode,
          reason: payload.reason,
          items: payload.selectedItemIds,
        },
      });

      if (timingSettings.style === 'burst') {
        // Second notification
        if (payload.mode === 'daily' && selectedItems.length > 0) {
          const itemTemplate = getItemSpecificTemplate(selectedItems);
          if (itemTemplate) {
            notifications.push({
              title: itemTemplate.title,
              body: itemTemplate.body + itemsLine,
              id: baseId + 1,
              schedule: { at: new Date(now + Math.max(1, timingSettings.followUpDelaySeconds) * 1000) },
              channelId: 'reminders_high',
              actionTypeId: 'REMINDER_ACTIONS',
              sound: 'default',
              extra: {
                mode: payload.mode,
                reason: payload.reason,
                items: payload.selectedItemIds,
              },
            });
          }
        } else if (payload.mode === 'trip') {
          const template2 = getRandomTemplate(TRIP_TEMPLATES.filter((t) => t !== template1));
          notifications.push({
            title: template2.title,
            body: template2.body + itemsLine,
            id: baseId + 1,
            schedule: { at: new Date(now + Math.max(1, timingSettings.followUpDelaySeconds) * 1000) },
            channelId: 'reminders_high',
            actionTypeId: 'REMINDER_ACTIONS',
            sound: 'default',
            extra: {
              mode: payload.mode,
              reason: payload.reason,
              items: payload.selectedItemIds,
            },
          });
        }

        // Third notification - snarky follow-up for daily mode
        if (payload.mode === 'daily') {
          const template3 = getRandomTemplate(DAILY_SNARKY_TEMPLATES);
          notifications.push({
            title: template3.title,
            body: template3.body + itemsLine,
            id: baseId + 2,
            schedule: { at: new Date(now + Math.max(1, timingSettings.thirdDelaySeconds) * 1000) },
            channelId: 'reminders_high',
            actionTypeId: 'REMINDER_ACTIONS',
            sound: 'default',
            extra: {
              mode: payload.mode,
              reason: payload.reason,
              items: payload.selectedItemIds,
            },
          });
        }
      }

      console.log(`Scheduling ${notifications.length} notification(s)...`, {
        style: timingSettings.style,
        followUpDelaySeconds: timingSettings.followUpDelaySeconds,
        thirdDelaySeconds: timingSettings.thirdDelaySeconds,
        bypassCooldown,
      });

      const result = await LocalNotifications.schedule({ notifications });
      console.log('Notifications scheduled:', result);

      // Track scheduled IDs (for cancellation on deactivate)
      scheduledNotificationIds.current = notifications.map((n) => n.id);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }, []);

  // Test helper (respects the current timing settings; can test "burst" reliably)
  const testNotification = useCallback(
    async (
      mode: ReminderMode = 'daily',
      selectedItemIds: string[] = ['keys', 'wallet', 'phone'],
      timingSettings: NotificationTimingSettings = { style: 'single', followUpDelaySeconds: 45, thirdDelaySeconds: 105 }
    ) => {
      console.log('Testing notification, isNative:', isNative, 'timing:', timingSettings);

      await sendReminderNotification(
        {
          mode,
          reason: 'location',
          selectedItemIds,
          timingSettings,
        },
        true
      );
    },
    [sendReminderNotification, isNative]
  );

  return {
    permissionGranted,
    channelCreated,
    isNative,
    sendReminderNotification,
    testNotification,
    cancelAllScheduledNotifications
  };
};

