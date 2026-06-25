# Product Bible: Forget Anything?

## 1. Project Overview
**Forget Anything?** is a cross-platform mobile application built with React, Vite, and Capacitor. Its primary goal is to ensure users never leave home without their essentials (keys, wallet, phone, etc.). By leveraging a combination of geofencing and WiFi disconnection events, the app proactively sends push notifications when the user departs from their defined "home" environment.

## 2. Core Value Proposition & Features
- **Proactive Reminders:** Triggers reminders right when the user leaves home, rather than at a fixed time.
- **Dual Triggers:**
  - **Location-based (Geofencing):** Triggers when the user exits a set radius (default 100m) from their home coordinates.
  - **Network-based (WiFi):** Triggers when the device disconnects from the designated home WiFi network.
  - **Combined Mode:** Requires *both* conditions to be met for maximum accuracy and fewer false positives.
- **Two Distinct Modes:**
  - **Daily Mode:** For everyday routines (work, school) with persistent, day-to-day items.
  - **Trip Mode:** For vacations or business travel, featuring date ranges and customized packing lists.
- **Notification Styles:** Supports "Single" and "Burst" (multiple follow-up reminders if the user hasn't acknowledged them).
- **Offline & Privacy-First:** All location tracking is done purely on-device. No data is sent to external servers.

## 3. Technology Stack
- **Frontend Framework:** React 18
- **Build Tool:** Vite
- **Mobile Container:** Capacitor v8 (Android targeted currently)
- **Styling:** Tailwind CSS with a custom design system
- **UI Components:** Radix UI primitives (shadcn/ui), Lucide React (icons)
- **Animations:** Framer Motion
- **State Management:** React state + Custom Hooks + LocalStorage (`forgetmenot_settings`)
- **Native Plugins:** 
  - `@capacitor/geolocation`
  - `@capacitor/network`
  - `@capacitor/local-notifications`
  - `@capacitor-community/background-geolocation`
  - Custom Native Bridge (`ReminderPlugin`)

## 4. Design System (Royal Emerald & Gold)
The application utilizes a highly polished, premium "Royal Emerald & Gold" aesthetic. 
- **Color Palette:**
  - Backgrounds: Deep emeralds (`#022c22` to `#064e3b`) with abstract patterns.
  - Accents: Gold gradients (`#A67C00` to `#FCF6BA`).
  - Text: High-contrast white and muted gold.
- **Key CSS Classes / Tokens:**
  - `card-glass`: Implements glassmorphism with white/5 backgrounds, backdrop-blur, and subtle borders.
  - `btn-gold`: Buttons featuring a premium gold gradient background, dark text, and subtle shadows.
  - `input-premium`: Form inputs with glass-like styling and gold-tinted borders on focus.
  - `gradient-primary`: Used for active states and highlights.
- **Visual Vibe:** Expensive, reliable, elegant. No flat/plain components; everything incorporates depth, glow effects, or glassmorphism.

## 5. Architecture & Data Flow
### 5.1 Storage
All user preferences are persisted to `localStorage` under the key `forgetmenot_settings`. The schema (`StoredSettings`) includes:
- `mode`: 'daily' | 'trip'
- `tripSettings`: Configuration specific to trips (dates, custom items).
- `dailySettings`: Everyday configuration.

### 5.2 The Orchestrator (`useReminderService`)
This hook is the brain of the app. It consumes settings from the UI and:
1. Initializes `useLocationMonitor` and `useNetworkMonitor`.
2. Evaluates the "Both" gate (requiring both WiFi drop AND Geofence exit).
3. Triggers `useNotifications` to schedule local notifications.
4. Debounces and syncs settings to the Android native layer via `ReminderPlugin`.

### 5.3 Native Background Processing
Because mobile OSs kill background webviews, the app relies heavily on Capacitor plugins:
- Background Geolocation runs an Android foreground service with a persistent notification ("Monitoring your location").
- `ReminderPlugin.ts` acts as the bridge for syncing settings (items, radius, triggers) directly to native Android code, ensuring reminders trigger even if the JS runtime is suspended.

## 6. Component Hierarchy (Key Files)
- **`App.tsx` & `main.tsx`:** App shell, routing, global providers (QueryClient, Toaster).
- **`Index.tsx`:** The main view. Loads settings, initializes `useReminderService`, and renders tabs.
- **`FirstTimeSetup.tsx`:** Guides Android users through critical permissions (Location "Always Allow" and disabling Battery Optimization).
- **`HomeTab.tsx` / `SettingsTab.tsx`:** Primary UI views for selecting items and configuring the app.
- **`ItemGrid.tsx` & `ItemCard.tsx`:** Highly optimized (using `React.memo` and `Set` lookups) grid for selecting essentials.
- **`DebugPanel.tsx`:** A comprehensive diagnostic UI showing GPS coords, distance to home, WiFi status, and background service state.

## 7. Performance Considerations
- **Memoization:** UI components like `ItemCard` are wrapped in `React.memo` to prevent cascading re-renders when toggling a single item.
- **Debouncing:** Rapid UI updates (like slider drags for Geofence Radius) are debounced before syncing across the Capacitor native bridge to prevent frame drops.
- **Animation Limits:** Continuous CSS animations (like bouncing icons) are avoided to preserve GPU/battery life.

## 8. Current State & Limitations
- **Android First:** The app is fully optimized for Android, including background services and battery optimization handling. Web serves primarily as a preview. iOS is not currently configured.
- **WiFi SSID Detection:** Due to Android OS restrictions, auto-detecting the WiFi SSID requires Location permissions.

---
*End of Product Bible.*
