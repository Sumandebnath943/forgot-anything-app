import { registerPlugin } from '@capacitor/core';

export interface ReminderPluginConfig {
  mode: string;
  trigger: string;
  isActive: boolean;
  homeLat: number;
  homeLng: number;
  radius: number;
  homeWifiSSID: string;
  items: string; // comma separated
  timingStyle: string;
  followUpDelaySeconds: number;
  thirdDelaySeconds: number;
  /** Trip window in epoch millis. 0 = unset (no gating). Only enforced in trip mode. */
  tripStartMs: number;
  tripEndMs: number;
}

export interface ReminderPluginRegistry {
  syncSettings(options: ReminderPluginConfig): Promise<void>;
}

export const ReminderPlugin = registerPlugin<ReminderPluginRegistry>('ReminderPlugin');
