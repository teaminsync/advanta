import { createContext, useEffect, useState, useContext, useCallback } from 'react';
import hi from '../locales/hi';
import pa from '../locales/pa';
import { useLowPowerMode } from '../hooks/useLowPowerMode';

const translations = {
  hi,
  pa
};

const StableContext = createContext();
const GameStateContext = createContext();

const detectIOSLikeDevice = () => {
  if (typeof navigator === 'undefined') return false;

  const userAgent = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  return /iPad|iPhone|iPod/i.test(userAgent)
    || (platform === 'MacIntel' && maxTouchPoints > 1);
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('hi');
  const [isMuted, setIsMuted] = useState(false);
  const [isGamePaused, setIsGamePaused] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isIOSLikeDevice] = useState(detectIOSLikeDevice);
  const isLowPowerMode = useLowPowerMode();
  const [isPageVisible, setIsPageVisible] = useState(() => (
    typeof document === 'undefined' ? true : !document.hidden
  ));
  const [onFirstInteractionCallback, setOnFirstInteractionCallback] = useState(null);

  const t = translations[lang];
  const shouldMuteAll = isMuted || !isPageVisible;

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };

    handleVisibilityChange();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (hasUserInteracted) return undefined; // Already interacted, skip setup

    const markInteracted = () => {
      setHasUserInteracted(true);
      
      // Call the callback synchronously within the gesture context
      if (onFirstInteractionCallback) {
        onFirstInteractionCallback();
      }
      
      // Remove all listeners immediately
      interactionEvents.forEach((eventName) => {
        window.removeEventListener(eventName, markInteracted, { capture: true });
      });
    };

    const interactionEvents = ['pointerdown', 'touchstart', 'click', 'keydown'];
    interactionEvents.forEach((eventName) => {
      window.removeEventListener(eventName, markInteracted, { capture: true }); // Clean first
      window.addEventListener(eventName, markInteracted, { capture: true, once: true });
    });

    return () => {
      interactionEvents.forEach((eventName) => {
        window.removeEventListener(eventName, markInteracted, { capture: true });
      });
    };
  }, [onFirstInteractionCallback, hasUserInteracted]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-lang', lang);
  }, [lang]);

  const stableValue = { lang, setLang, t, isIOSLikeDevice, isLowPowerMode };
  
  // Memoize the callback setter to prevent infinite loops
  const setCallbackMemoized = useCallback((callback) => {
    setOnFirstInteractionCallback(() => callback);
  }, []);
  
  const gameStateValue = { 
    isMuted, 
    setIsMuted, 
    isPageVisible, 
    shouldMuteAll, 
    isGamePaused, 
    setIsGamePaused, 
    hasUserInteracted,
    setOnFirstInteractionCallback: setCallbackMemoized
  };

  return (
    <StableContext.Provider value={stableValue}>
      <GameStateContext.Provider value={gameStateValue}>
        {children}
      </GameStateContext.Provider>
    </StableContext.Provider>
  );
}

export function useLanguage() {
  return useContext(StableContext);
}

export function useGameState() {
  return useContext(GameStateContext);
}
