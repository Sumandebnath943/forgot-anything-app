import { TriggerSelector } from '@/components/TriggerSelector';
import { HomeSettings } from '@/components/HomeSettings';
import { DateRangePicker } from '@/components/DateRangePicker';
import { GeofenceRadiusControl } from '@/components/GeofenceRadiusControl';
import { NotificationTimingControl } from '@/components/NotificationTimingControl';
import { PermissionStatus } from '@/components/PermissionStatus';
import { DebugPanel } from '@/components/DebugPanel';
import { Separator } from '@/components/ui/separator';
import { ReminderMode, TriggerType, TripSettings, DailySettings, NotificationTimingSettings } from '@/types/reminder';
import { motion } from 'framer-motion';

interface SettingsTabProps {
  mode: ReminderMode;
  tripSettings: TripSettings;
  dailySettings: DailySettings;
  setTripSettings: React.Dispatch<React.SetStateAction<TripSettings>>;
  setDailySettings: React.Dispatch<React.SetStateAction<DailySettings>>;
  currentSettings: TripSettings | DailySettings;
  handleTriggerChange: (trigger: TriggerType) => void;
  handleCoordinatesChange: (coords: { latitude: number; longitude: number }) => void;
  notificationPermission: string;
  locationPermission: string;
  testNotification: () => void;
  currentPosition: any;
  isAtHome: boolean;
  isConnectedToHomeWifi: boolean;
  connectionStatus: string;
  isBackgroundActive: boolean;
}

export function SettingsTab({
  mode,
  tripSettings,
  dailySettings,
  setTripSettings,
  setDailySettings,
  currentSettings,
  handleTriggerChange,
  handleCoordinatesChange,
  notificationPermission,
  locationPermission,
  testNotification,
  currentPosition,
  isAtHome,
  isConnectedToHomeWifi,
  connectionStatus,
  isBackgroundActive,
}: SettingsTabProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pb-24"
    >
      {/* Settings Header with App Logo */}
      <div className="pt-2 flex items-center gap-4">
        <div className="relative">
          <div
            className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg"
            style={{
              boxShadow: '0 0 20px rgba(212, 175, 55, 0.3)',
              border: '2px solid rgba(212, 175, 55, 0.4)',
            }}
          >
            <img src="/logo.png" alt="App Logo" className="w-full h-full object-cover" />
          </div>
          {/* Golden glow ring */}
          <div
            className="absolute -inset-1 rounded-2xl -z-10 opacity-40"
            style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.3) 0%, transparent 70%)' }}
          />
        </div>
        <div>
          <h2 className="font-display text-3xl font-extrabold mb-0.5">Settings</h2>
          <p className="text-muted-foreground text-sm">Configure your perfect tracking setup.</p>
        </div>
      </div>

      {/* Gold divider */}
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.5) 50%, transparent 100%)' }} />

      <div className="glass shadow-glass rounded-3xl p-6 space-y-6">
        <h3 className="font-display font-bold text-lg text-primary flex items-center gap-2">
          <span className="w-1 h-6 rounded-full" style={{ background: 'linear-gradient(180deg, #BF953F, #FCF6BA)' }} />
          📍 Location & Triggers
        </h3>
        
        {mode === 'trip' && (
          <DateRangePicker
            startDate={tripSettings.startDate}
            endDate={tripSettings.endDate}
            onStartDateChange={(date) =>
              setTripSettings((prev) => ({ ...prev, startDate: date || null }))
            }
            onEndDateChange={(date) =>
              setTripSettings((prev) => ({ ...prev, endDate: date || null }))
            }
          />
        )}

        <TriggerSelector
          trigger={currentSettings.trigger}
          onTriggerChange={handleTriggerChange}
        />

        <HomeSettings
          homeLocation={mode === 'trip' ? tripSettings.homeLocation : dailySettings.homeLocation}
          homeWifi={mode === 'trip' ? tripSettings.homeWifi : dailySettings.homeWifi}
          homeCoordinates={mode === 'trip' ? tripSettings.homeCoordinates : dailySettings.homeCoordinates}
          onLocationChange={(value) => {
            if (mode === 'trip') {
              setTripSettings((prev) => ({ ...prev, homeLocation: value }));
            } else {
              setDailySettings((prev) => ({ ...prev, homeLocation: value }));
            }
          }}
          onWifiChange={(value) => {
            if (mode === 'trip') {
              setTripSettings((prev) => ({ ...prev, homeWifi: value }));
            } else {
              setDailySettings((prev) => ({ ...prev, homeWifi: value }));
            }
          }}
          onCoordinatesChange={handleCoordinatesChange}
        />

        {(currentSettings.trigger === 'location' || currentSettings.trigger === 'both') && (
          <GeofenceRadiusControl
            radiusMeters={currentSettings.geofenceRadiusMeters}
            onRadiusChange={(value) => {
              if (mode === 'trip') {
                setTripSettings((prev) => ({ ...prev, geofenceRadiusMeters: value }));
              } else {
                setDailySettings((prev) => ({ ...prev, geofenceRadiusMeters: value }));
              }
            }}
          />
        )}
      </div>

      {/* Gold divider */}
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.3) 50%, transparent 100%)' }} />

      <div className="glass shadow-glass rounded-3xl p-6 space-y-6">
        <h3 className="font-display font-bold text-lg text-accent flex items-center gap-2">
          <span className="w-1 h-6 rounded-full" style={{ background: 'linear-gradient(180deg, #FCF6BA, #BF953F)' }} />
          ⏱️ Timings & Delays
        </h3>
        <NotificationTimingControl
          settings={currentSettings.notificationTiming}
          onChange={(settings: NotificationTimingSettings) => {
            if (mode === 'trip') {
              setTripSettings((prev) => ({ ...prev, notificationTiming: settings }));
            } else {
              setDailySettings((prev) => ({ ...prev, notificationTiming: settings }));
            }
          }}
        />
      </div>

      {/* Gold divider */}
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.3) 50%, transparent 100%)' }} />

      <div className="glass shadow-glass rounded-3xl p-6 space-y-6">
        <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
          <span className="w-1 h-6 rounded-full" style={{ background: 'linear-gradient(180deg, #BF953F, #A67C00)' }} />
          ⚙️ Diagnostics
        </h3>
        <PermissionStatus
          notificationPermission={notificationPermission}
          locationPermission={locationPermission}
          onTestNotification={testNotification}
        />

        <DebugPanel
          homeCoordinates={currentSettings.homeCoordinates}
          currentPosition={currentPosition}
          isAtHome={isAtHome}
          isConnectedToHomeWifi={isConnectedToHomeWifi}
          connectionStatus={connectionStatus}
          notificationPermission={notificationPermission}
          locationPermission={locationPermission}
          isActive={currentSettings.isActive}
          trigger={currentSettings.trigger}
          isBackgroundActive={isBackgroundActive}
        />
      </div>

      {/* App version footer */}
      <div className="flex justify-center pt-2 pb-4">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-muted-foreground"
          style={{
            background: 'rgba(0, 25, 15, 0.4)',
            border: '1px solid rgba(212, 175, 55, 0.2)',
          }}
        >
          <img src="/logo.png" alt="" className="w-4 h-4 rounded" />
          Forget Anything? v1.0
        </div>
      </div>
    </motion.div>
  );
}
