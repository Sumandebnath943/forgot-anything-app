# AI Companion Handoff Document

Welcome, next AI Companion! You are taking over the **Forget Anything?** project. This document contains 100% of the context, knowledge, and current status of the application so you can pick up exactly where I left off without needing to rediscover everything.

## 1. Project Context
**App:** Forget Anything? (app.rememberme)
**Type:** Capacitor/React mobile application (Android-first).
**Purpose:** Reminds users if they leave home without their essentials (keys, wallet, laptop).
**Trigger Mechanisms:** Background Geolocation (distance from home) and Network Monitoring (WiFi disconnection).
**Design Aesthetic:** "Royal Emerald & Gold". The UI heavily uses glassmorphism, gold gradients, and deep emerald backgrounds. It is designed to feel extremely premium. 

## 2. Directory Structure & Key Files
- `src/App.tsx` & `src/main.tsx`: App shell and React mounting.
- `src/pages/Index.tsx`: The core container. Manages local storage persistence (`forgetmenot_settings`) and initializes the core service hook.
- `src/hooks/useReminderService.ts`: **The Brain.** This orchestrates all triggers and syncs settings to the native layer.
- `src/components/FirstTimeSetup.tsx`: Crucial for Android. Guides the user to set Location to "Always Allow" and to disable Battery Optimization.
- `src/components/tabs/`: Contains `HomeTab.tsx` and `SettingsTab.tsx`.
- `src/types/reminder.ts`: Contains the interfaces (`DailySettings`, `TripSettings`, `NotificationTimingSettings`).
- `src/integrations/ReminderPlugin.ts`: The TypeScript interface for the custom Capacitor native plugin.
- `src/index.css`: Contains the entire custom design system (`.card-glass`, `.btn-gold`, `.input-premium`, etc.). Do not remove these custom utility classes!
- `android/`: The Android native project. Contains the background services and the native implementation of `ReminderPlugin`.
- `capacitor.config.ts`: Capacitor configuration, importantly including Background Geolocation settings and the `useLegacyBridge: true` flag.

## 3. The Core Logic Hooks (Architecture Deep Dive)

The hooks form a layered architecture:
```text
useReminderService (orchestrator)
├── useNotifications (scheduling & templates)
├── useLocationMonitor (foreground GPS)
│   └── useBackgroundGeolocation (background GPS — DISABLED, uses custom foreground service instead)
├── useNetworkMonitor (WiFi detection + debounce)
└── useAppLifecycle (resume/pause events)
```

### 3.1 `useReminderService.ts`
The top-level orchestrator.
- **"Both" trigger gate:** When `trigger === 'both'`, notifications only fire when BOTH WiFi disconnect and location leave are true simultaneously. Uses a one-shot latch (`bothHasNotifiedRef`) — once fired, won't fire again until the user returns (at least one condition resets to "home").
- **Native Settings Sync:** Debounced (500ms) sync of all settings to a custom `ReminderPlugin.syncSettings()` native Android plugin.
- **App Lifecycle:** Refreshes permissions and connection status on app resume.

### 3.2 `useLocationMonitor.ts`
Monitors the user's GPS location relative to a "home" location.
- **Transition detection:** Only fires `onLeaveHome` on a true transition from home → away, not on repeated away readings.
- **One-shot notification:** `hasNotified` ref ensures only one notification per departure cycle.

### 3.3 `useNetworkMonitor.ts`
Monitors WiFi connectivity and fires a callback when the user disconnects.
- **Debounce Logic:** After detecting a WiFi drop, waits 2000ms then re-checks with `Network.getStatus()` to confirm the disconnect is real (filters out network glitches).
- **SSID filtering:** Assumes connected WiFi is home WiFi based on a trust heuristic, tracking via `wasOnHomeWifi` ref.

### 3.4 `useNotifications.ts`
Manages all notification logic: permission requests, channel creation, scheduling single or burst notifications.
- **Burst vs Single:** `style === 'single'` fires immediately. `style === 'burst'` fires an immediate notification, a follow-up at `followUpDelaySeconds`, and a third (snarky) at `thirdDelaySeconds` (daily mode only).
- **Template system:** Pools of general, snarky, and trip-specific templates randomly selected.
- **Android Channel:** `reminders_high` with MAX importance (5), vibration, lights (`#FF6B6B`), and action buttons ("✅ Got everything!").

## 4. Current Status & Recent Fixes
- **Aesthetic Overhaul Complete:** The app was recently refactored from a plain UI to the "Royal Emerald & Gold" theme. All components now use `card-glass` and gold accents.
- **Performance Optimized:** 
  - `ItemCard` is wrapped in `React.memo` and expensive layout props were removed to fix UI lag during item toggling.
  - `ItemGrid` uses a `Set` for O(1) lookups instead of `.includes()`.
  - The native bridge sync in `useReminderService` has a 500ms debounce to prevent frame drops when dragging sliders.
  - Continuous CSS animations (like bouncing bells) were removed to save GPU and battery.
- **Build Status:** The web app builds successfully (`npm run build`). The Android APK builds successfully (`npx cap sync android && cd android && .\gradlew.bat assembleDebug`).

## 5. Developer Instructions for Next Steps
If the user asks you to modify features or fix bugs, keep these constraints in mind:
1. **Do not break the Native Bridge:** Any changes to `TripSettings` or `DailySettings` must be mirrored in the sync payload to `ReminderPlugin.syncSettings()` inside `useReminderService.ts`.
2. **Respect the Theme:** Do not add plain borders, generic Tailwind colors (like `bg-blue-500`), or flat design elements. Stick to `.card-glass`, `.btn-gold`, and the existing emerald palette.
3. **Android Background Limits:** Remember that Android aggressively kills background tasks. The app relies on a Foreground Service and the user disabling battery optimization. Do not attempt to rely purely on `setInterval` or standard JS timeouts for background execution.
4. **Testing Native Features:** Things like push notifications, WiFi SSID reading, and background geolocation will fail or return mock data in a Web Browser. Always remind the user to test these features on a physical Android device or emulator.

## 6. Common Commands
- `npm run dev`: Start local web preview.
- `npm run build`: Build web assets.
- `npx cap sync android`: Sync web assets and plugins to the Android project.
- `cd android ; .\gradlew.bat clean assembleDebug`: Build the Android APK.

Good luck, and build something amazing!
