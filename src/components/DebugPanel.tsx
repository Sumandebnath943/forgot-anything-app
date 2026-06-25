import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, MapPin, Wifi, Bell, Radio, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface HomeCoordinates {
  latitude: number;
  longitude: number;
}

interface DebugPanelProps {
  homeCoordinates: HomeCoordinates | null;
  currentPosition: { coords: { latitude: number; longitude: number } } | null;
  isAtHome: boolean;
  isConnectedToHomeWifi: boolean;
  connectionStatus: { connected: boolean; connectionType: string } | null;
  notificationPermission: boolean;
  locationPermission: boolean | null; // null = not applicable
  isActive: boolean;
  trigger: string;
  isBackgroundActive?: boolean;
}

// Cache platform check
let isNativeCached: boolean | null = null;

export function DebugPanel({
  homeCoordinates,
  currentPosition,
  isAtHome,
  isConnectedToHomeWifi,
  connectionStatus,
  notificationPermission,
  locationPermission,
  isActive,
  trigger,
  isBackgroundActive = false,
}: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [isNative, setIsNative] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const prevPositionRef = useRef<string | null>(null);

  // Check if native platform once
  useEffect(() => {
    const checkPlatform = async () => {
      if (isNativeCached !== null) {
        setIsNative(isNativeCached);
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
    };
    checkPlatform();
  }, []);

  // Calculate distance and track updates
  useEffect(() => {
    if (homeCoordinates && currentPosition) {
      const R = 6371e3;
      const lat1 = (homeCoordinates.latitude * Math.PI) / 180;
      const lat2 = (currentPosition.coords.latitude * Math.PI) / 180;
      const deltaLat = ((currentPosition.coords.latitude - homeCoordinates.latitude) * Math.PI) / 180;
      const deltaLon = ((currentPosition.coords.longitude - homeCoordinates.longitude) * Math.PI) / 180;

      const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      setDistance(Math.round(R * c));
      
      // Track position changes for "last update" display
      const posKey = `${currentPosition.coords.latitude.toFixed(6)},${currentPosition.coords.longitude.toFixed(6)}`;
      if (posKey !== prevPositionRef.current) {
        prevPositionRef.current = posKey;
        setLastUpdate(new Date());
      }
    } else {
      setDistance(null);
    }
  }, [homeCoordinates, currentPosition]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="card-glass rounded-2xl overflow-hidden">
      <button
        className="w-full justify-between p-4 flex items-center gap-2 transition-colors hover:bg-white/5"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Debug Status</span>
          {isNative && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-medium"
              style={{
                background: 'rgba(191,149,63,0.2)',
                border: '1px solid rgba(212,175,55,0.3)',
                color: '#FCF6BA',
              }}
            >
              Native
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 text-sm">
          {/* Platform indicator */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
            <span className="text-xs">Platform:</span>
            <span className={`text-xs font-medium ${isNative ? 'text-emerald-400' : 'text-yellow-400'}`}>
              {isNative ? '📱 Native App' : '🌐 Web Browser'}
            </span>
            {lastUpdate && isNative && (
              <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                {formatTime(lastUpdate)}
              </span>
            )}
          </div>

          {/* Monitoring Status */}
          <div className="flex items-center gap-2">
            <Radio className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-muted-foreground'}`} />
            <span className="text-muted-foreground">Monitoring:</span>
            <span className={isActive ? 'text-emerald-400 font-medium' : 'text-muted-foreground'}>
              {isActive ? 'ACTIVE' : 'OFF'}
            </span>
            <span className="text-muted-foreground">({trigger})</span>
            {isBackgroundActive && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  background: 'rgba(191,149,63,0.2)',
                  border: '1px solid rgba(212,175,55,0.3)',
                  color: '#FCF6BA',
                }}
              >
                BG
              </span>
            )}
          </div>

          {/* Home Coordinates */}
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-primary mt-0.5" />
            <div>
              <span className="text-muted-foreground">Home: </span>
              {homeCoordinates ? (
                <span className="text-foreground font-mono text-xs">
                  {homeCoordinates.latitude.toFixed(6)}, {homeCoordinates.longitude.toFixed(6)}
                </span>
              ) : (
                <span className="text-yellow-400">Not set</span>
              )}
            </div>
          </div>

          {/* Current Position */}
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-blue-400 mt-0.5" />
            <div>
              <span className="text-muted-foreground">Current: </span>
              {currentPosition ? (
                <span className="text-foreground font-mono text-xs">
                  {currentPosition.coords.latitude.toFixed(6)}, {currentPosition.coords.longitude.toFixed(6)}
                </span>
              ) : (
                <span className="text-yellow-400">
                  {isNative ? 'Waiting for GPS...' : 'N/A (web mode)'}
                </span>
              )}
            </div>
          </div>

          {/* Distance */}
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 flex items-center justify-center text-muted-foreground">📏</span>
            <span className="text-muted-foreground">Distance from home:</span>
            {distance !== null ? (
              <span className={`font-medium ${distance > 100 ? 'text-red-400' : 'text-emerald-400'}`}>
                {distance}m {distance > 100 ? '(AWAY)' : '(HOME)'}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>

          {/* Location Status */}
          <div className="flex items-center gap-2">
            <MapPin className={`w-4 h-4 ${isAtHome ? 'text-emerald-400' : 'text-red-400'}`} />
            <span className="text-muted-foreground">Location status:</span>
            <span className={isAtHome ? 'text-emerald-400' : 'text-red-400'}>
              {isNative ? (isAtHome ? 'At Home' : 'Away') : 'N/A (web)'}
            </span>
          </div>

          {/* Network Status */}
          <div className="flex items-center gap-2">
            <Wifi className={`w-4 h-4 ${connectionStatus?.connectionType === 'wifi' ? 'text-emerald-400' : 'text-yellow-400'}`} />
            <span className="text-muted-foreground">Network:</span>
            <span className={connectionStatus?.connectionType === 'wifi' ? 'text-emerald-400' : 'text-yellow-400'}>
              {connectionStatus 
                ? `${connectionStatus.connectionType} (${connectionStatus.connected ? 'connected' : 'disconnected'})` 
                : (isNative ? 'Unknown' : 'N/A (web)')}
            </span>
          </div>

          {/* WiFi Status */}
          <div className="flex items-center gap-2">
            <Wifi className={`w-4 h-4 ${isConnectedToHomeWifi ? 'text-emerald-400' : 'text-red-400'}`} />
            <span className="text-muted-foreground">WiFi trigger:</span>
            <span className={isConnectedToHomeWifi ? 'text-emerald-400' : 'text-red-400'}>
              {isNative 
                ? (isConnectedToHomeWifi ? 'On WiFi' : 'Off WiFi (triggers reminder)') 
                : 'N/A (web)'}
            </span>
          </div>

          {/* Permissions */}
          <div className="flex items-center gap-2">
            <Bell className={`w-4 h-4 ${notificationPermission ? 'text-emerald-400' : 'text-red-400'}`} />
            <span className="text-muted-foreground">Notifications:</span>
            <span className={notificationPermission ? 'text-emerald-400' : 'text-red-400'}>
              {notificationPermission ? 'Granted' : 'Denied'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className={`w-4 h-4 ${locationPermission === null ? 'text-muted-foreground' : locationPermission ? 'text-emerald-400' : 'text-red-400'}`} />
            <span className="text-muted-foreground">Location:</span>
            <span className={locationPermission === null ? 'text-muted-foreground' : locationPermission ? 'text-emerald-400' : 'text-red-400'}>
              {locationPermission === null ? 'N/A (not required)' : locationPermission ? 'Granted' : 'Denied'}
            </span>
          </div>

          {/* Privacy indicator */}
          <div className="pt-3 mt-3" style={{ borderTop: '1px solid rgba(212,175,55,0.15)' }}>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-emerald-400">🔒</span>
              <span className="text-muted-foreground">
                Location data stored locally only — never sent to servers
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
