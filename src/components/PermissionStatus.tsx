import { useState, useEffect } from 'react';
import { Shield, MapPin, Wifi, Bell } from 'lucide-react';

interface PermissionStatusProps {
  notificationPermission: boolean;
  locationPermission: boolean | null; // null = not applicable (wifi-only or web)
  onTestNotification: () => void;
}

// Cache platform check
let isNativeCached: boolean | null = null;

export const PermissionStatus = ({
  notificationPermission,
  locationPermission,
  onTestNotification
}: PermissionStatusProps) => {
  const [isNative, setIsNative] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPlatform = async () => {
      if (isNativeCached !== null) {
        setIsNative(isNativeCached);
        setIsLoading(false);
        return;
      }
      try {
        const { Capacitor } = await import('@capacitor/core');
        isNativeCached = Capacitor.isNativePlatform();
        setIsNative(isNativeCached);
      } catch {
        isNativeCached = false;
        setIsNative(false);
      }
      setIsLoading(false);
    };
    checkPlatform();
  }, []);

  if (isLoading) {
    return (
      <div className="card-glass rounded-2xl p-5 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-display font-bold text-lg">App Permissions</span>
        </div>
        <div className="h-32 bg-white/5 rounded-xl" />
      </div>
    );
  }

  const getBadgeStyle = (granted: boolean | null) => {
    if (granted === null) return 'bg-white/10 text-muted-foreground';
    return granted
      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
      : 'bg-red-500/20 text-red-400 border border-red-500/30';
  };

  return (
    <div className="space-y-4">
      {!isNative && (
        <div className="card-glass rounded-xl p-3 text-sm">
          <p className="font-medium text-foreground mb-1">Running in Web Mode</p>
          <p className="text-muted-foreground">Native features like push notifications and location monitoring require building as a mobile app.</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="card-glass rounded-xl flex flex-col items-center gap-2 p-3">
          <Bell className="w-5 h-5 text-primary" />
          <span className="text-xs text-muted-foreground">Notifications</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getBadgeStyle(notificationPermission)}`}>
            {isNative ? (notificationPermission ? 'Granted' : 'Denied') : 'Web'}
          </span>
        </div>
        
        <div className="card-glass rounded-xl flex flex-col items-center gap-2 p-3">
          <MapPin className="w-5 h-5 text-primary" />
          <span className="text-xs text-muted-foreground">Location</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getBadgeStyle(locationPermission)}`}>
            {locationPermission === null
              ? 'N/A'
              : locationPermission
              ? 'Granted'
              : 'Denied'}
          </span>
        </div>
        
        <div className="card-glass rounded-xl flex flex-col items-center gap-2 p-3">
          <Wifi className="w-5 h-5 text-primary" />
          <span className="text-xs text-muted-foreground">Network</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getBadgeStyle(true)}`}>
            {isNative ? 'Available' : 'Web'}
          </span>
        </div>
      </div>

      <button 
        onClick={onTestNotification} 
        className="btn-gold w-full rounded-2xl py-3 text-sm font-bold tracking-wide"
      >
        <span className="flex items-center justify-center gap-2">
          <Bell className="w-4 h-4" />
          {isNative ? 'Test Notification' : 'Test Web Notification'}
        </span>
      </button>
      
      {isNative && (
        <p className="text-xs text-muted-foreground text-center">
          Tap to send a test notification to verify your setup
        </p>
      )}
    </div>
  );
};
