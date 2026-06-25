import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Battery, CheckCircle2, ChevronRight, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SETUP_COMPLETE_KEY = 'forgetmenot_setup_v2_complete';

export const FirstTimeSetup = () => {
  const [showSetup, setShowSetup] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const setupComplete = localStorage.getItem(SETUP_COMPLETE_KEY);
    
    // Only show on Android and if not completed
    if (Capacitor.getPlatform() === 'android' && !setupComplete) {
      setTimeout(() => setShowSetup(true), 1500); // Wait for splash to finish
    }
  }, []);

  const handleNext = async () => {
    if (currentStep === 0) {
      // Step 1: Initial Geolocation Permission (Foreground)
      try {
        const { Geolocation } = await import('@capacitor/geolocation');
        await Geolocation.requestPermissions();
      } catch (e) {
        console.error('Initial permission error:', e);
      }
      setCurrentStep(1);
    } else if (currentStep === 1) {
      // Step 2: Open settings for "Always Allow"
      try {
        const { NativeSettings } = await import('capacitor-native-settings');
        await NativeSettings.open({ optionAndroid: 'application_details' });
      } catch (e) {
        console.error('Settings open error:', e);
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Step 3: Open battery optimization settings
      try {
        const { NativeSettings } = await import('capacitor-native-settings');
        try {
          await NativeSettings.open({ optionAndroid: 'battery_optimization' as any });
        } catch {
          await NativeSettings.open({ optionAndroid: 'application_details' });
        }
      } catch (e) {
        console.error('Battery settings open error:', e);
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // Finish
      localStorage.setItem(SETUP_COMPLETE_KEY, 'true');
      setShowSetup(false);
    }
  };

  if (!showSetup) return null;

  const steps = [
    {
      id: 'welcome',
      icon: <MapPin className="w-12 h-12 text-primary" />,
      title: "Let's get set up",
      description: "Forget Anything needs a couple permissions to monitor when you leave home.",
      buttonText: "Start Setup",
      bullets: ["Location access", "Background monitoring", "Battery unrestricted"],
    },
    {
      id: 'location',
      icon: <Settings className="w-12 h-12 text-primary" />,
      title: "Always Allow Location",
      description: "We need to track when you leave home even if the app is closed.",
      buttonText: "Open Settings",
      instructions: [
        "Settings will open",
        "Tap Permissions → Location",
        "Select Allow all the time",
        "Come back here"
      ]
    },
    {
      id: 'battery',
      icon: <Battery className="w-12 h-12 text-primary" />,
      title: "Disable Battery Optimization",
      description: "Android might kill the app in the background if this isn't disabled.",
      buttonText: "Open Battery Settings",
      instructions: [
        "Battery settings will open",
        "Find Forget Anything",
        "Select Don't optimize or Unrestricted",
        "Come back here"
      ]
    },
    {
      id: 'done',
      icon: <CheckCircle2 className="w-12 h-12 text-success" />,
      title: "All Set!",
      description: "You're ready to start using Forget Anything. Never leave your essentials behind again.",
      buttonText: "Let's Go",
      bullets: [],
    }
  ];

  const current = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[url('/assets/bg-compass.png')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      
      <div className="relative w-full max-w-sm px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="card-glass rounded-3xl overflow-hidden"
          >
            {/* Progress Bar */}
            <div className="w-full bg-muted h-1">
              <motion.div 
                className="bg-primary h-full"
                initial={{ width: `${(currentStep / steps.length) * 100}%` }}
                animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                {current.icon}
              </div>
              
              <h2 className="text-2xl font-display font-bold mb-3">{current.title}</h2>
              <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                {current.description}
              </p>

              {current.bullets && current.bullets.length > 0 && (
                <ul className="w-full space-y-3 mb-8 text-left text-sm font-medium">
                  {current.bullets.map((bullet, i) => (
                    <motion.li 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      className="flex items-center gap-3 bg-secondary/50 p-3 rounded-xl"
                    >
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      {bullet}
                    </motion.li>
                  ))}
                </ul>
              )}

              {current.instructions && (
                <div className="w-full bg-secondary/30 border border-primary/10 rounded-xl p-5 mb-8 text-left">
                  <p className="text-xs font-bold text-primary mb-3 uppercase tracking-wider">Instructions</p>
                  <ol className="space-y-3">
                    {current.instructions.map((inst, i) => (
                      <motion.li 
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.1 }}
                        className="flex gap-3 text-sm"
                      >
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </span>
                        <span className="pt-0.5">{inst}</span>
                      </motion.li>
                    ))}
                  </ol>
                </div>
              )}

              <Button 
                size="lg" 
                className="btn-gold w-full rounded-2xl h-14 text-base"
                onClick={handleNext}
              >
                {current.buttonText}
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};;