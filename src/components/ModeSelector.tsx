import { ReminderMode } from '@/types/reminder';
import { cn } from '@/lib/utils';
import { Plane, Calendar } from 'lucide-react';

interface ModeSelectorProps {
  mode: ReminderMode;
  onModeChange: (mode: ReminderMode) => void;
}

export function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div
        onClick={() => onModeChange('trip')}
        className={cn('card-glass group relative rounded-2xl p-4 cursor-pointer overflow-hidden transition-all duration-300', mode === 'trip' && 'border-primary/50 shadow-[0_0_20px_rgba(250,204,21,0.2)]')}
      >
        <div className="relative z-10">
          <div
            className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all duration-300',
              mode === 'trip'
                ? 'btn-gold shadow-glow'
                : 'bg-white/10 group-hover:bg-white/20'
            )}
          >
            <Plane
              className={cn(
                'w-7 h-7 transition-all duration-300',
                mode === 'trip' 
                  ? 'text-[#1a1a1a]' 
                  : 'text-white/60 group-hover:text-white'
              )}
            />
          </div>
          <h3 className="font-display text-lg font-bold text-white mb-1">
            Trip Mode
          </h3>
          <p className="text-sm text-white/60">
            Perfect for vacations & travels. Set date ranges and pack confidently.
          </p>
        </div>
        
        {/* Active state gradient overlay */}
        {mode === 'trip' && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#d4af37]/10 via-transparent to-[#d4af37]/20 rounded-2xl" />
        )}
      </div>

      <div
        onClick={() => onModeChange('daily')}
        className={cn('card-glass group relative rounded-2xl p-4 cursor-pointer overflow-hidden transition-all duration-300', mode === 'daily' && 'border-primary/50 shadow-[0_0_20px_rgba(250,204,21,0.2)]')}
      >
        <div className="relative z-10">
          <div
            className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all duration-300',
              mode === 'daily'
                ? 'btn-gold shadow-glow'
                : 'bg-white/10 group-hover:bg-white/20'
            )}
          >
            <Calendar
              className={cn(
                'w-7 h-7 transition-all duration-300',
                mode === 'daily' 
                  ? 'text-[#1a1a1a]' 
                  : 'text-white/60 group-hover:text-white'
              )}
            />
          </div>
          <h3 className="font-display text-lg font-bold text-white mb-1">
            Daily Mode
          </h3>
          <p className="text-sm text-white/60">
            For your everyday routine. Never forget essentials for work or school.
          </p>
        </div>
        
        {/* Active state gradient overlay */}
        {mode === 'daily' && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#d4af37]/10 via-transparent to-[#d4af37]/20 rounded-2xl" />
        )}
      </div>
    </div>
  );
}