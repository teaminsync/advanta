import { useState, useEffect } from 'react';

/**
 * Detects if the device is in low power mode or battery saver mode.
 * Returns true if:
 * - Battery level is below 20% and not charging (iOS Low Power Mode likely)
 * - Connection is slow (saveData enabled)
 * - Device has limited memory
 */
export const useLowPowerMode = () => {
  const [isLowPowerMode, setIsLowPowerMode] = useState(false);

  useEffect(() => {
    const detectLowPowerMode = async () => {
      let lowPowerIndicators = 0;

      // Check 1: Battery API (if available)
      if ('getBattery' in navigator) {
        try {
          const battery = await navigator.getBattery();
          // Low battery and not charging suggests power saving mode
          if (battery.level < 0.2 && !battery.charging) {
            lowPowerIndicators++;
          }
        } catch (error) {
          // Battery API not available or blocked
        }
      }

      // Check 2: Network Information API - Data Saver mode
      if ('connection' in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection?.saveData === true) {
          lowPowerIndicators++;
        }
      }

      // Check 3: Device Memory (if very low, likely power saving)
      if ('deviceMemory' in navigator) {
        // Less than 2GB RAM suggests low-end device or power saving
        if (navigator.deviceMemory < 2) {
          lowPowerIndicators++;
        }
      }

      // If 2 or more indicators, consider it low power mode
      setIsLowPowerMode(lowPowerIndicators >= 2);
    };

    detectLowPowerMode();

    // Re-check when page becomes visible (user might have changed settings)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        detectLowPowerMode();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isLowPowerMode;
};
