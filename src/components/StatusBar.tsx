import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Bell, BellOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

type ReminderStatus = 'inactive' | 'home' | 'away' | 'unknown';

interface StatusBarProps {
  isActive: boolean;
  selectedCount: number;
  onToggleActive: () => void;
  mode: 'trip' | 'daily';
  status?: ReminderStatus;
}

export function StatusBar({ isActive, selectedCount, onToggleActive, mode, status = 'inactive' }: StatusBarProps) {
  // One-shot "arming" pulse — increments each time tracking flips ON so the
  // lock-in ring re-triggers. Purely cosmetic; keyed to retrigger the animation.
  const [armCount, setArmCount] = useState(0);
  const prevActiveRef = useRef(isActive);

  useEffect(() => {
    if (isActive && !prevActiveRef.current) {
      setArmCount((c) => c + 1);
    }
    prevActiveRef.current = isActive;
  }, [isActive]);

  const handleToggle = async () => {
    try {
      // A firmer "thunk" when arming, a light tick when disarming.
      await Haptics.impact({ style: isActive ? ImpactStyle.Light : ImpactStyle.Heavy });
    } catch (e) {
      // Ignore if haptics aren't available (e.g. web)
    }
    onToggleActive();
  };

  // Living status copy — reflects whether you're actually home or out.
  const subtitle = !isActive
    ? { text: 'Tracking is paused', cls: 'text-muted-foreground' }
    : status === 'away'
      ? { text: "You're out · I'll remind you", cls: 'text-accent' }
      : status === 'home'
        ? { text: "You're home · you're covered", cls: 'text-emerald-400' }
        : { text: 'Armed · watching for you', cls: 'text-primary' };

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-4">
      {/* Toggle + living aura */}
      <div className="relative w-full">
        {/* Breathing aura — only when active, conveys "actively watching".
            CSS keyframe (compositor-driven, off the JS thread); the global
            prefers-reduced-motion rule freezes it for users who opt out. */}
        {isActive && (
          <div
            aria-hidden
            className="absolute -inset-3 rounded-[3.5rem] pointer-events-none animate-aura"
            style={{ background: 'radial-gradient(closest-side, hsl(var(--primary) / 0.35), transparent 80%)' }}
          />
        )}

        {/* Signature arming moment — a thick gold ring snaps inward and a bright
            flash washes over the pill once, like a vault locking. Runs only on
            the OFF→ON transition (keyed to armCount so it re-triggers each time). */}
        <AnimatePresence>
          {armCount > 0 && (
            <motion.div
              key={`ring-${armCount}`}
              aria-hidden
              className="absolute -inset-2 rounded-[3.5rem] pointer-events-none border-[3px] border-primary"
              initial={{ scale: 1.45, opacity: 0 }}
              animate={{ scale: 1, opacity: [0, 1, 0] }}
              transition={{ duration: 0.85, ease: 'easeOut' }}
              style={{ boxShadow: '0 0 36px hsl(var(--primary) / 0.85), inset 0 0 18px hsl(var(--primary) / 0.5)' }}
            />
          )}
        </AnimatePresence>

        {/* Giant Animated Pill Toggle */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleToggle}
          className={cn(
            "relative w-full h-24 rounded-[3rem] p-2 overflow-hidden flex items-center transition-all duration-500",
            "border-2 shadow-xl backdrop-blur-md",
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

          {/* One-shot gold flash across the pill on arming */}
          <AnimatePresence>
            {armCount > 0 && (
              <motion.div
                key={`flash-${armCount}`}
                aria-hidden
                className="absolute inset-0 z-30 pointer-events-none bg-[image:var(--gradient-primary)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.75, 0] }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
              />
            )}
          </AnimatePresence>

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
      </div>

      {/* Living status line */}
      <AnimatePresence mode="wait">
        <motion.p
          key={subtitle.text}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
          className="text-sm font-bold text-center tracking-wide uppercase flex items-center gap-2"
        >
          <span className={subtitle.cls}>{subtitle.text}</span>
          {isActive && (
            <span className="text-muted-foreground/70 normal-case font-medium">
              · <span className="text-primary font-bold tabular-nums">{selectedCount}</span> items
            </span>
          )}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
