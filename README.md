# Remember Me

A modern location-based reminder application built with React, Vite, Tailwind CSS, Shadcn UI, and Capacitor.

## Prerequisites

- Node.js & npm installed
- iOS / Android development environment (if building for mobile)

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Build for Production**
   ```bash
   npm run build
   ```

## Mobile Development (Capacitor)

To build and run the app on mobile devices:

1. Build the web project
   ```bash
   npm run build
   ```

2. Sync the project to native apps
   ```bash
   npx cap sync
   ```

3. Open in IDE
   ```bash
   npx cap open android
   # or
   npx cap open ios
   ```

## Technologies Used

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase
- Capacitor
