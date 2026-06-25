import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Bell, BellRing } from 'lucide-react';
import { NotificationStyle, NotificationTimingSettings } from '@/types/reminder';

interface NotificationTimingControlProps {
  settings: NotificationTimingSettings;
  onChange: (settings: NotificationTimingSettings) => void;
}

export function NotificationTimingControl({
  settings,
  onChange,
}: NotificationTimingControlProps) {
  const handleStyleChange = (style: NotificationStyle) => {
    onChange({ ...settings, style });
  };

  const handleFollowUpChange = (values: number[]) => {
    onChange({ ...settings, followUpDelaySeconds: values[0] });
  };

  const handleThirdChange = (values: number[]) => {
    onChange({ ...settings, thirdDelaySeconds: values[0] });
  };

  return (
    <div className="space-y-4">
      <Label className="flex items-center gap-2 text-foreground">
        <Bell className="w-4 h-4 text-primary" />
        Notification Style
      </Label>

      <RadioGroup
        value={settings.style}
        onValueChange={(v) => handleStyleChange(v as NotificationStyle)}
        className="grid grid-cols-2 gap-3"
      >
        <label
          htmlFor="single"
          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300 ${
            settings.style === 'single'
              ? 'card-glass shadow-[0_0_15px_rgba(212,175,55,0.2)]'
              : 'card-glass opacity-70 hover:opacity-100'
          }`}
          style={settings.style === 'single' ? { borderColor: 'rgba(212, 175, 55, 0.5)' } : {}}
        >
          <RadioGroupItem value="single" id="single" />
          <div>
            <div className="font-medium text-sm text-foreground">Single</div>
            <div className="text-xs text-muted-foreground">One notification</div>
          </div>
        </label>
        <label
          htmlFor="burst"
          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300 ${
            settings.style === 'burst'
              ? 'card-glass shadow-[0_0_15px_rgba(212,175,55,0.2)]'
              : 'card-glass opacity-70 hover:opacity-100'
          }`}
          style={settings.style === 'burst' ? { borderColor: 'rgba(212, 175, 55, 0.5)' } : {}}
        >
          <RadioGroupItem value="burst" id="burst" />
          <div>
            <div className="font-medium text-sm text-foreground flex items-center gap-1">
              Burst <BellRing className="w-3 h-3" />
            </div>
            <div className="text-xs text-muted-foreground">Multiple reminders</div>
          </div>
        </label>
      </RadioGroup>

      {settings.style === 'burst' && (
        <div className="space-y-4 p-4 rounded-xl card-glass animate-fade-in">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">2nd notification after</span>
              <span
                className="font-bold px-2 py-0.5 rounded-full text-xs"
                style={{
                  background: 'linear-gradient(135deg, rgba(191,149,63,0.2), rgba(252,246,186,0.1))',
                  border: '1px solid rgba(212,175,55,0.3)',
                  color: '#FCF6BA',
                }}
              >
                {settings.followUpDelaySeconds}s
              </span>
            </div>
            <Slider
              value={[settings.followUpDelaySeconds]}
              onValueChange={handleFollowUpChange}
              min={15}
              max={120}
              step={5}
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">3rd notification after</span>
              <span
                className="font-bold px-2 py-0.5 rounded-full text-xs"
                style={{
                  background: 'linear-gradient(135deg, rgba(191,149,63,0.2), rgba(252,246,186,0.1))',
                  border: '1px solid rgba(212,175,55,0.3)',
                  color: '#FCF6BA',
                }}
              >
                {settings.thirdDelaySeconds}s
              </span>
            </div>
            <Slider
              value={[settings.thirdDelaySeconds]}
              onValueChange={handleThirdChange}
              min={60}
              max={300}
              step={15}
            />
          </div>
        </div>
      )}
    </div>
  );
}
