import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: [
      '@capacitor/core',
      '@capacitor/geolocation',
      '@capacitor/local-notifications',
      '@capacitor/network',
      '@capacitor/push-notifications',
    ],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
}));
