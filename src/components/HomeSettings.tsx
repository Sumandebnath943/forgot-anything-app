import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Wifi, Loader2, CheckCircle, Save } from 'lucide-react';
import { toast } from 'sonner';

interface HomeCoordinates {
  latitude: number;
  longitude: number;
}

interface HomeSettingsProps {
  homeLocation: string;
  homeWifi: string;
  homeCoordinates: HomeCoordinates | null;
  onLocationChange: (value: string) => void;
  onWifiChange: (value: string) => void;
  onCoordinatesChange: (coords: HomeCoordinates) => void;
}

// Cache platform check
let isNativeCached: boolean | null = null;

export function HomeSettings({
  homeLocation,
  homeWifi,
  homeCoordinates,
  onLocationChange,
  onWifiChange,
  onCoordinatesChange,
}: HomeSettingsProps) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isGettingWifi, setIsGettingWifi] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [currentWifiStatus, setCurrentWifiStatus] = useState<string>('');

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

  // Check current WiFi status periodically
  useEffect(() => {
    const checkWifiStatus = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) {
          setCurrentWifiStatus('Web mode');
          return;
        }
        
        const { Network } = await import('@capacitor/network');
        const status = await Network.getStatus();
        
        if (status.connectionType === 'wifi') {
          setCurrentWifiStatus('Connected to WiFi');
        } else if (status.connected) {
          setCurrentWifiStatus(`Connected (${status.connectionType})`);
        } else {
          setCurrentWifiStatus('Not connected');
        }
      } catch {
        setCurrentWifiStatus('Unknown');
      }
    };
    
    checkWifiStatus();
    const interval = setInterval(checkWifiStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUseCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const { Capacitor } = await import('@capacitor/core');
      
      if (!Capacitor.isNativePlatform()) {
        // For web preview, use browser geolocation
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const coords = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              };
              onCoordinatesChange(coords);
              onLocationChange(`${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`);
              toast.success('Home location set!', {
                description: `GPS: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
              });
              setIsGettingLocation(false);
            },
            (error) => {
              console.error('Browser geolocation error:', error);
              toast.error('Could not get location', {
                description: 'Please enable location access in your browser.',
              });
              setIsGettingLocation(false);
            },
            { enableHighAccuracy: true }
          );
          return;
        }
        toast.error('Location not available in browser preview');
        setIsGettingLocation(false);
        return;
      }

      const { Geolocation } = await import('@capacitor/geolocation');
      
      // Request permission first
      const permission = await Geolocation.requestPermissions();
      if (permission.location !== 'granted') {
        toast.error('Location permission denied', {
          description: 'Please allow location access in your device settings.',
        });
        setIsGettingLocation(false);
        return;
      }

      // Get current position
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
      });

      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      onCoordinatesChange(coords);
      onLocationChange(`${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`);
      
      toast.success('Home location set!', {
        description: `GPS: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      toast.error('Failed to get location', {
        description: 'Please check your location settings and try again.',
      });
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSaveCurrentWifi = async () => {
    setIsGettingWifi(true);
    try {
      const { Capacitor } = await import('@capacitor/core');
      const isNative = Capacitor.isNativePlatform();
      const platform = Capacitor.getPlatform();
      
      if (!isNative) {
        // For web, just mark as "any WiFi"
        onWifiChange('');
        toast.info('WiFi SSID detection', {
          description: 'In web mode, reminders trigger on any WiFi disconnect.',
        });
        return;
      }

      const { Network } = await import('@capacitor/network');
      const status = await Network.getStatus();
      
      if (status.connectionType !== 'wifi') {
        toast.error('Not connected to WiFi', {
          description: 'Please connect to your home WiFi first.',
        });
        return;
      }

      // Try to auto-detect SSID on Android
      let detectedSSID: string | null = null;
      
      if (platform === 'android') {
        try {
          const { CapacitorWifi } = await import('@capgo/capacitor-wifi');
          
          // Request permissions
          const permResult = await CapacitorWifi.checkPermissions();
          if (permResult.location !== 'granted') {
            const reqResult = await CapacitorWifi.requestPermissions();
            if (reqResult.location !== 'granted') {
              toast.error('Location permission required', {
                description: 'Please allow location access to detect WiFi SSID.',
              });
            }
          }
          
          // Get current SSID
          const connectionInfo = await CapacitorWifi.getSsid();
          if (connectionInfo?.ssid) {
            // Remove quotes if present
            detectedSSID = connectionInfo.ssid.replace(/^"|"$/g, '');
          }
        } catch (e) {
          console.warn('[HomeSettings] Error detecting SSID:', e);
        }
      }

      if (detectedSSID) {
        // Auto-detected SSID - confirm with user
        const confirmSave = window.confirm(
          `Detected WiFi network: "${detectedSSID}"\n\nSave this as your home network?`
        );
        
        if (confirmSave) {
          onWifiChange(detectedSSID);
          toast.success('Home WiFi saved!', {
            description: `Network: "${detectedSSID}"`,
          });
        }
      } else {
        // Fallback to manual entry (iOS or detection failed)
        const ssidPrompt = window.prompt(
          'Enter your home WiFi network name (SSID):\n\n' +
          'This helps ensure reminders only trigger when leaving YOUR home network.\n\n' +
          'Leave empty to trigger on any WiFi disconnect.',
          homeWifi || ''
        );

        if (ssidPrompt === null) {
          // User cancelled
          return;
        }

        onWifiChange(ssidPrompt.trim());
        
        if (ssidPrompt.trim()) {
          toast.success('Home WiFi saved!', {
            description: `Network: "${ssidPrompt.trim()}"`,
          });
        } else {
          toast.success('WiFi trigger set', {
            description: 'Reminders will trigger on any WiFi disconnect.',
          });
        }
      }
    } catch (error) {
      console.error('Error getting WiFi info:', error);
      toast.error('Failed to get WiFi info');
    } finally {
      setIsGettingWifi(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Home Configuration
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="location" className="flex items-center gap-2 text-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            Home Location
          </Label>
          <div className="flex gap-2">
            <Input
              id="location"
              placeholder="Tap button to set GPS"
              value={homeLocation}
              onChange={(e) => onLocationChange(e.target.value)}
              className="input-premium rounded-xl flex-1"
              readOnly
            />
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isGettingLocation}
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 card-glass"
              style={{ borderColor: 'rgba(212, 175, 55, 0.3)' }}
              title="Use current GPS location"
            >
              {isGettingLocation ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : homeCoordinates ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <MapPin className="w-4 h-4 text-primary" />
              )}
            </button>
          </div>
          {homeCoordinates && (
            <p className="text-xs text-emerald-400">
              ✓ GPS coordinates saved
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="wifi" className="flex items-center gap-2 text-foreground">
            <Wifi className="w-4 h-4 text-primary" />
            Home WiFi Network
          </Label>
          <div className="flex gap-2">
            <Input
              id="wifi"
              placeholder={homeWifi || 'Any WiFi (tap to set)'}
              value={homeWifi}
              onChange={(e) => onWifiChange(e.target.value)}
              className="input-premium rounded-xl flex-1"
            />
            <button
              type="button"
              onClick={handleSaveCurrentWifi}
              disabled={isGettingWifi}
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 card-glass"
              style={{ borderColor: 'rgba(212, 175, 55, 0.3)' }}
              title="Set home WiFi network"
            >
              {isGettingWifi ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : homeWifi ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <Save className="w-4 h-4 text-primary" />
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {homeWifi 
              ? `✓ Only triggers when leaving "${homeWifi}"`
              : `Current: ${currentWifiStatus} • Any WiFi disconnect triggers`
            }
          </p>
        </div>
      </div>
    </div>
  );
}
