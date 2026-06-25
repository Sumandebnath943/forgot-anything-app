import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';

interface GeofenceRadiusControlProps {
  radiusMeters: number;
  onRadiusChange: (value: number) => void;
  disabled?: boolean;
}

const RADIUS_OPTIONS = [50, 100, 150, 200, 300, 500];

export function GeofenceRadiusControl({
  radiusMeters,
  onRadiusChange,
  disabled = false,
}: GeofenceRadiusControlProps) {
  const sliderIndex = RADIUS_OPTIONS.findIndex((r) => r >= radiusMeters);
  const currentIndex = sliderIndex === -1 ? RADIUS_OPTIONS.length - 1 : sliderIndex;

  const handleSliderChange = (values: number[]) => {
    const index = values[0];
    onRadiusChange(RADIUS_OPTIONS[index]);
  };

  return (
    <div className="card-glass rounded-xl p-4 space-y-3">
      <Label className="flex items-center gap-2 text-foreground">
        <MapPin className="w-4 h-4 text-primary" />
        Geofence Radius
      </Label>
      <div className="flex items-center gap-4">
        <Slider
          value={[currentIndex]}
          onValueChange={handleSliderChange}
          max={RADIUS_OPTIONS.length - 1}
          step={1}
          disabled={disabled}
          className="flex-1"
        />
        <span
          className="text-sm font-bold min-w-[60px] text-right px-2 py-1 rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(191,149,63,0.2), rgba(252,246,186,0.1))',
            border: '1px solid rgba(212,175,55,0.3)',
            color: '#FCF6BA',
          }}
        >
          {radiusMeters}m
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Distance from home before triggering reminder ({radiusMeters} meters)
      </p>
    </div>
  );
}
