export type ReminderMode = 'trip' | 'daily';

export type TriggerType = 'location' | 'wifi' | 'both';

export type NotificationStyle = 'single' | 'burst';

export interface NotificationTimingSettings {
  style: NotificationStyle;
  /** Used when style === 'burst' */
  followUpDelaySeconds: number;
  /** Used when style === 'burst' */
  thirdDelaySeconds: number;
}

export interface ReminderItem {
  id: string;
  name: string;
  icon: string;
  category: 'essentials' | 'tech' | 'personal' | 'work' | 'custom';
}

export interface HomeCoordinates {
  latitude: number;
  longitude: number;
}

export interface TripSettings {
  startDate: Date | null;
  endDate: Date | null;
  homeLocation: string;
  homeCoordinates: HomeCoordinates | null;
  homeWifi: string;
  selectedItems: string[];
  trigger: TriggerType;
  isActive: boolean;
  geofenceRadiusMeters: number;
  notificationTiming: NotificationTimingSettings;
}

export interface DailySettings {
  selectedItems: string[];
  trigger: TriggerType;
  homeLocation: string;
  homeCoordinates: HomeCoordinates | null;
  homeWifi: string;
  isActive: boolean;
  geofenceRadiusMeters: number;
  notificationTiming: NotificationTimingSettings;
}

