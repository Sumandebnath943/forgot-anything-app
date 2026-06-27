import { useState, useEffect } from 'react';
import { ReminderMode, TriggerType, TripSettings, DailySettings, NotificationTimingSettings } from '@/types/reminder';
import { useReminderService } from '@/hooks/useReminderService';
import { FirstTimeSetup } from '@/components/FirstTimeSetup';

import { BottomNav, TabType } from '@/components/BottomNav';
import { HomeTab } from '@/components/tabs/HomeTab';
import { SettingsTab } from '@/components/tabs/SettingsTab';
import { AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'forgetmenot_settings';

const DEFAULT_RADIUS_METERS = 100;
const DEFAULT_NOTIFICATION_TIMING = {
  style: 'burst' as const,
  followUpDelaySeconds: 45,
  thirdDelaySeconds: 105,
};

interface StoredSettings {
  mode: ReminderMode;
  tripSettings: TripSettings;
  dailySettings: DailySettings;
}

const loadSettings = (): StoredSettings | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      if (parsed.tripSettings?.startDate) {
        parsed.tripSettings.startDate = new Date(parsed.tripSettings.startDate);
      }
      if (parsed.tripSettings?.endDate) {
        parsed.tripSettings.endDate = new Date(parsed.tripSettings.endDate);
      }
      return parsed;
    }
  } catch (e) {
    console.error('Error loading settings:', e);
  }
  return null;
};

const saveSettings = (settings: StoredSettings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings:', e);
  }
};

const Index = () => {
  const storedSettings = loadSettings();

  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [mode, setMode] = useState<ReminderMode>(storedSettings?.mode || 'daily');

  const [tripSettings, setTripSettings] = useState<TripSettings>(
    storedSettings?.tripSettings
      ? {
          geofenceRadiusMeters: DEFAULT_RADIUS_METERS,
          ...storedSettings.tripSettings,
          notificationTiming: {
            ...DEFAULT_NOTIFICATION_TIMING,
            ...(storedSettings.tripSettings as any).notificationTiming,
          },
        }
      : {
          startDate: null,
          endDate: null,
          homeLocation: '',
          homeCoordinates: null,
          homeWifi: '',
          selectedItems: [],
          trigger: 'both',
          isActive: false,
          geofenceRadiusMeters: DEFAULT_RADIUS_METERS,
          notificationTiming: DEFAULT_NOTIFICATION_TIMING,
        }
  );

  const [dailySettings, setDailySettings] = useState<DailySettings>(
    storedSettings?.dailySettings
      ? {
          geofenceRadiusMeters: DEFAULT_RADIUS_METERS,
          ...storedSettings.dailySettings,
          notificationTiming: {
            ...DEFAULT_NOTIFICATION_TIMING,
            ...(storedSettings.dailySettings as any).notificationTiming,
          },
        }
      : {
          selectedItems: ['keys', 'wallet', 'phone'],
          trigger: 'wifi',
          homeLocation: '',
          homeCoordinates: null,
          homeWifi: '',
          isActive: true,
          geofenceRadiusMeters: DEFAULT_RADIUS_METERS,
          notificationTiming: DEFAULT_NOTIFICATION_TIMING,
        }
  );

  // Save settings whenever they change
  useEffect(() => {
    saveSettings({ mode, tripSettings, dailySettings });
  }, [mode, tripSettings, dailySettings]);

  const currentSettings = mode === 'trip' ? tripSettings : dailySettings;

  // Initialize reminder service with current settings
  const {
    notificationPermission,
    locationPermission,
    testNotification,
    currentPosition,
    isAtHome,
    isConnectedToHomeWifi,
    connectionStatus,
    isBackgroundActive,
    status,
  } = useReminderService({
    selectedItems: currentSettings.selectedItems,
    trigger: currentSettings.trigger,
    homeLocation: currentSettings.homeCoordinates,
    homeWifiSSID: currentSettings.homeWifi,
    isActive: currentSettings.isActive,
    mode,
    geofenceRadiusMeters: currentSettings.geofenceRadiusMeters,
    notificationTiming: currentSettings.notificationTiming,
    tripStartDate: tripSettings.startDate,
    tripEndDate: tripSettings.endDate
  });

  const handleToggleItem = (id: string) => {
    if (mode === 'trip') {
      setTripSettings((prev) => ({
        ...prev,
        selectedItems: prev.selectedItems.includes(id)
          ? prev.selectedItems.filter((item) => item !== id)
          : [...prev.selectedItems, id],
      }));
    } else {
      setDailySettings((prev) => ({
        ...prev,
        selectedItems: prev.selectedItems.includes(id)
          ? prev.selectedItems.filter((item) => item !== id)
          : [...prev.selectedItems, id],
      }));
    }
  };

  const handleTriggerChange = (trigger: TriggerType) => {
    if (mode === 'trip') {
      setTripSettings((prev) => ({ ...prev, trigger }));
    } else {
      setDailySettings((prev) => ({ ...prev, trigger }));
    }
  };

  const handleToggleActive = () => {
    if (mode === 'trip') {
      setTripSettings((prev) => ({ ...prev, isActive: !prev.isActive }));
    } else {
      setDailySettings((prev) => ({ ...prev, isActive: !prev.isActive }));
    }
  };

  const handleCoordinatesChange = (coords: { latitude: number; longitude: number }) => {
    if (mode === 'trip') {
      setTripSettings((prev) => ({ ...prev, homeCoordinates: coords }));
    } else {
      setDailySettings((prev) => ({ ...prev, homeCoordinates: coords }));
    }
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-background">
      {/* First-time setup guide */}
      <FirstTimeSetup />
    
      {/* Background */}
      <div
        className="fixed inset-0 -z-20 bg-[url('/assets/bg-compass.png')] bg-cover bg-center"
      />
      {/* Plain dark scrim (no backdrop-blur): a full-screen blur layer here forced
          every glass chip to composite through a second nested blur, which is the
          main source of scroll/jank on mobile. The chips keep their own glass. */}
      <div className="fixed inset-0 -z-10 bg-black/30" />
      
      <div className="container py-8 pb-28 max-w-lg mx-auto relative z-10">
        <AnimatePresence mode="wait">
          {currentTab === 'home' ? (
            <HomeTab 
              key="home"
              mode={mode}
              setMode={setMode}
              currentSettings={currentSettings}
              handleToggleActive={handleToggleActive}
              handleToggleItem={handleToggleItem}
              onSettingsClick={() => setCurrentTab('settings')}
              status={status}
            />
          ) : (
            <SettingsTab 
              key="settings"
              mode={mode}
              tripSettings={tripSettings}
              dailySettings={dailySettings}
              setTripSettings={setTripSettings}
              setDailySettings={setDailySettings}
              currentSettings={currentSettings}
              handleTriggerChange={handleTriggerChange}
              handleCoordinatesChange={handleCoordinatesChange}
              notificationPermission={notificationPermission}
              locationPermission={locationPermission}
              testNotification={testNotification}
              currentPosition={currentPosition}
              isAtHome={isAtHome}
              isConnectedToHomeWifi={isConnectedToHomeWifi}
              connectionStatus={connectionStatus}
              isBackgroundActive={isBackgroundActive}
            />
          )}
        </AnimatePresence>
      </div>

      <BottomNav currentTab={currentTab} onChangeTab={setCurrentTab} />

      {/* Filmic finish — ON TOP of the whole UI (pointer-events-none so taps pass
          through). Vignette darkens the edges to pull focus; grain adds texture
          over the cards themselves so nothing reads as flat digital color.
          Both are static — zero scroll cost. */}
      <div className="pointer-events-none fixed inset-0 z-[55] bg-vignette" />
      <div className="pointer-events-none fixed inset-0 z-[55] bg-grain" />
    </div>
  );
};

export default Index;