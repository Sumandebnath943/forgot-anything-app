import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Settings2 } from 'lucide-react';

interface HeroGreetingProps {
  onSettingsClick?: () => void;
}

export function HeroGreeting({ onSettingsClick }: HeroGreetingProps) {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="pt-2 pb-4 flex flex-col items-start relative w-full"
    >
      <div 
        className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none" 
        style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.2) 0%, transparent 70%)' }}
      />
      
      {/* Native App Bar feel */}
      <div className="w-full flex justify-between items-center mb-6">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring" }}
          className="inline-flex items-center gap-1.5 text-primary text-sm font-bold tracking-wide"
        >
          <Sparkles className="w-4 h-4 fill-primary/20" />
          FORGET ANYTHING
        </motion.div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onSettingsClick}
          className="w-9 h-9 rounded-full flex items-center justify-center border shadow-sm transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, rgba(0,25,15,0.6), rgba(0,25,15,0.3))',
            borderColor: 'rgba(212, 175, 55, 0.4)',
            boxShadow: '0 0 12px rgba(212, 175, 55, 0.15)',
          }}
        >
          <Settings2 className="w-4 h-4 text-primary" />
        </motion.button>
      </div>
      
      <h1 className="text-[2.6rem] font-display font-extrabold tracking-[-0.02em] text-foreground leading-[1.02]">
        {greeting},<br />
        <span
          className="text-transparent bg-clip-text bg-gradient-to-br from-primary via-accent to-primary"
          style={{ filter: 'drop-shadow(0 2px 10px hsl(var(--primary) / 0.25))' }}
        >
          Ready to go?
        </span>
      </h1>

      <p className="mt-3 text-muted-foreground font-medium text-sm leading-relaxed">
        Tap the items you need and turn on tracking.
      </p>
    </motion.div>
  );
}
