import { useCallback, useEffect, useRef, useState } from 'react';

export const useVideoLoadingState = (src) => {
  const [isVideoLoading, setIsVideoLoading] = useState(Boolean(src));
  const loadingTimeoutRef = useRef(null);
  const hasEverLoadedRef = useRef(false);

  useEffect(() => {
    setIsVideoLoading(Boolean(src));
    hasEverLoadedRef.current = false;

    const fallbackTimeout = setTimeout(() => {
      hasEverLoadedRef.current = true;
      setIsVideoLoading(false);
    }, 8000);

    return () => {
      clearTimeout(fallbackTimeout);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [src]);

  const handleVideoLoaded = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    hasEverLoadedRef.current = true;
    setIsVideoLoading(false);
  }, []);

  const handleVideoWaiting = useCallback(() => {
    if (hasEverLoadedRef.current) return;

    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    loadingTimeoutRef.current = setTimeout(() => {
      setIsVideoLoading(true);
      loadingTimeoutRef.current = null;
    }, 250);
  }, []);

  return {
    isVideoLoading,
    videoLoadingHandlers: {
      onLoadedData: handleVideoLoaded,
      onCanPlay: handleVideoLoaded,
      onCanPlayThrough: handleVideoLoaded,
      onPlaying: handleVideoLoaded,
      onWaiting: handleVideoWaiting,
      onStalled: handleVideoWaiting,
      onEmptied: handleVideoWaiting,
      onSeeking: handleVideoWaiting,
      onSuspend: handleVideoWaiting,
    },
  };
};
