import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Trigger content animation after mount
    const contentTimer = setTimeout(() => setShowContent(true), 100);
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 600); // Wait for fade animation
    }, 2500);

    return () => {
      clearTimeout(contentTimer);
      clearTimeout(timer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden transition-all duration-600 bg-[url('/assets/bg-splash.png')] bg-cover bg-center ${
        isVisible ? 'opacity-100' : 'opacity-0 scale-105'
      }`}
    >
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 animate-pulse-slow"
          style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-10 animate-pulse-slow"
          style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)', animationDelay: '1s' }}
        />
      </div>

      <div className={`flex flex-col items-center space-y-8 transition-all duration-700 ${
        showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        {/* Logo with entrance animation */}
        <div className="relative">
          <div 
            className={`w-32 h-32 rounded-3xl flex items-center justify-center shadow-2xl transition-all duration-700 overflow-hidden ${
              showContent ? 'animate-logo-entrance' : 'opacity-0 scale-50'
            }`}
            style={{ animationDelay: '0.2s' }}
          >
            <img src="/logo.png" alt="App Logo" className="w-full h-full object-cover" />
          </div>
          
          {/* Animated glow ring */}
          <div 
            className={`absolute -inset-4 rounded-3xl transition-opacity duration-500 ${
              showContent ? 'opacity-100 animate-glow-pulse' : 'opacity-0'
            }`}
            style={{ 
              background: 'radial-gradient(circle, hsl(0 0% 100% / 0.1) 0%, transparent 70%)',
              animationDelay: '0.5s'
            }}
          />
        </div>

        {/* App Name with staggered animation */}
        <div className="text-center space-y-3">
          <h1 
            className={`font-display text-4xl font-bold text-white drop-shadow-lg transition-all duration-700 ${
              showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ 
              transitionDelay: '0.4s',
              textShadow: '0 4px 20px hsl(0 0% 0% / 0.3)'
            }}
          >
            Forget Anything?
          </h1>
          <p 
            className={`text-white/80 text-lg max-w-xs transition-all duration-700 ${
              showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '0.6s' }}
          >
            Never leave home without your essentials
          </p>
        </div>

        {/* Premium loading indicator */}
        <div 
          className={`mt-8 flex items-center gap-3 transition-all duration-700 ${
            showContent ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionDelay: '0.8s' }}
        >
          <div className="flex space-x-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-white/70 animate-bounce-soft"
                style={{ 
                  animationDelay: `${i * 150}ms`,
                  boxShadow: '0 0 10px hsl(0 0% 100% / 0.2)'
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom decorative gradient */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, hsl(0 0% 0% / 0.2) 0%, transparent 100%)'
        }}
      />
    </div>
  );
}