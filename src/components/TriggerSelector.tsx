import { TriggerType } from '@/types/reminder';
import { cn } from '@/lib/utils';
import { MapPin, Wifi, Combine } from 'lucide-react';

interface TriggerSelectorProps {
  trigger: TriggerType;
  onTriggerChange: (trigger: TriggerType) => void;
}

const triggers = [
  {
    id: 'location' as TriggerType,
    name: 'Location Change',
    description: 'Trigger when you leave your home area',
    icon: MapPin,
  },
  {
    id: 'wifi' as TriggerType,
    name: 'WiFi Disconnect',
    description: 'Trigger when disconnected from home WiFi',
    icon: Wifi,
  },
  {
    id: 'both' as TriggerType,
    name: 'Combined (More Accurate)',
    description: 'Trigger when both conditions are met',
    icon: Combine,
  },
];

export function TriggerSelector({ trigger, onTriggerChange }: TriggerSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Trigger Method
      </h3>
      <div className="grid gap-3">
        {triggers.map((t) => (
          <div
            key={t.id}
            onClick={() => onTriggerChange(t.id)}
            className={cn('trigger-option', trigger === t.id && 'selected')}
          >
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
                trigger === t.id
                  ? 'gradient-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <t.icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">{t.name}</p>
              <p className="text-sm text-muted-foreground">{t.description}</p>
            </div>
            <div
              className={cn(
                'w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center',
                trigger === t.id
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground'
              )}
            >
              {trigger === t.id && (
                <div className="w-2 h-2 rounded-full bg-primary-foreground" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
