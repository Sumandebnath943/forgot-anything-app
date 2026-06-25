import { useEffect, useRef } from 'react';

interface UseAppLifecycleOptions {
  onResume?: () => void;
  onPause?: () => void;
}

// Cache platform check
let isNativePlatformCached: boolean | null = null;

const checkIsNativePlatform = async (): Promise<boolean> => {
  if (isNativePlatformCached !== null) {
    return isNativePlatformCached;
  }
  try {
    const { Capacitor } = await import('@capacitor/core');
    isNativePlatformCached = Capacitor.isNativePlatform();
    return isNativePlatformCached;
  } catch {
    isNativePlatformCached = false;
    return false;
  }
};

export const useAppLifecycle = ({ onResume, onPause }: UseAppLifecycleOptions) => {
  const onResumeRef = useRef(onResume);
  const onPauseRef = useRef(onPause);
  const initRef = useRef(false);

  // Keep refs updated
  onResumeRef.current = onResume;
  onPauseRef.current = onPause;

  useEffect(() => {
    if (initRef.current) return;

    let resumeListener: { remove: () => void } | null = null;
    let pauseListener: { remove: () => void } | null = null;

    const setup = async () => {
      const isNative = await checkIsNativePlatform();
      if (!isNative) {
        // Web fallback: use visibilitychange
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            onResumeRef.current?.();
          } else {
            onPauseRef.current?.();
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
      }

      initRef.current = true;

      try {
        const { App } = await import('@capacitor/app');

        resumeListener = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            console.log('[Lifecycle] App resumed');
            onResumeRef.current?.();
          } else {
            console.log('[Lifecycle] App paused');
            onPauseRef.current?.();
          }
        });
      } catch (error) {
        console.error('Error setting up app lifecycle listeners:', error);
      }
    };

    const cleanupPromise = setup();

    return () => {
      cleanupPromise.then((webCleanup) => {
        if (typeof webCleanup === 'function') {
          webCleanup();
        }
      });
      if (resumeListener) resumeListener.remove();
      if (pauseListener) pauseListener.remove();
      initRef.current = false;
    };
  }, []);
};
