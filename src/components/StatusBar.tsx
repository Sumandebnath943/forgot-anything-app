import { cn } from '@/lib/utils';
import { Bell, BellOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface StatusBarProps {
  isActive: boolean;
  selectedCount: number;
  onToggleActive: () => void;
  mode: 'trip' | 'daily';
}

export function StatusBar({ isActive, selectedCount, onToggleActive, mode }: StatusBarProps) {
  const handleToggle = async () => {
    try {
      await Haptics.impact({ style: isActive ? ImpactStyle.Light : ImpactStyle.Medium });
    } catch (e) {
      // Ignore if haptics aren't available (e.g. web)
    }
    onToggleActive();
  };

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-4">
      {/* Giant Animated Pill Toggle */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleToggle}
        className={cn(
          "relative w-full h-24 rounded-[3rem] p-2 overflow-hidden flex items-center transition-all duration-500",
          "border-2 shadow-xl backdrop-blur-xl",
          isActive 
            ? "border-primary/50 bg-primary/10 shadow-glow" 
            : "border-white/10 bg-black/30 shadow-sm hover:border-white/20"
        )}
      >
        {/* Background glow when active */}
        {isActive && (
          <motion.div 
            layoutId="active-bg"
            className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            exit={{ opacity: 0 }}
          />
        )}

        {/* Sliding Indicator */}
        <motion.div
          animate={{ x: isActive ? '100%' : '0%' }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={cn(
            "absolute left-2 w-[calc(50%-8px)] h-[calc(100%-16px)] rounded-full z-10 flex items-center justify-center gap-2",
            isActive ? "bg-[image:var(--gradient-primary)] shadow-[0_0_20px_rgba(250,204,21,0.5)] border border-white/20" : "bg-black/50 border border-white/10 shadow-inner"
          )}
        >
          {isActive ? (
            <>
              <span className="font-bold text-lg text-primary-foreground">ON</span>
              <Bell className="w-6 h-6 text-primary-foreground" />
            </>
          ) : (
            <>
              <BellOff className="w-6 h-6 text-white/50" />
              <span className="font-bold text-lg text-white/50">OFF</span>
            </>
          )}
        </motion.div>

        {/* Text Labels for the empty space */}
        <div className="relative z-20 w-full flex justify-between px-10 pointer-events-none">
          <span className={cn(
            "font-bold text-lg transition-colors duration-300 w-1/2 text-left pl-2",
            isActive ? "text-primary-foreground/0" : "text-muted-foreground/30 opacity-0"
          )}>
            {/* Empty space when slider is on OFF */}
          </span>
          <span className={cn(
            "font-bold text-lg transition-colors duration-300 w-1/2 text-right pr-2",
            isActive ? "opacity-0" : "text-muted-foreground/30"
          )}>
            ON
          </span>
        </div>
        <div className="absolute inset-0 z-20 w-full flex justify-between px-10 pointer-events-none items-center">
          <span className={cn(
            "font-bold text-lg transition-colors duration-300 w-1/2 text-left pl-2",
            isActive ? "text-primary/40" : "opacity-0"
          )}>
            OFF
          </span>
        </div>
      </motion.button>
      
      <motion.p 
        animate={{ opacity: isActive ? 1 : 0.5, y: isActive ? 0 : 5 }}
        className="text-sm font-medium text-center"
      >
        {isActive ? (
          <span className="text-primary font-bold tracking-wide uppercase">Tracking Active • {selectedCount} items</span>
        ) : (
          <span className="text-muted-foreground">Tracking is paused</span>
        )}
      </motion.p>
    </div>
  );
}