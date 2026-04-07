import { useEffect, useRef } from 'react';

/**
 * useManagedVideoPlayback - Optimized for mobile video playback
 * 
 * KEY FIXES:
 * 1. Set muted BEFORE calling play() (iOS autoplay requirement)
 * 2. Serialized retry logic to prevent race conditions
 * 3. Proper cleanup of pending operations
 * 4. Guards against playing ended videos (prevents restart bug)
 * 5. readyState check prevents play() on unready videos
 * 6. Debouncing prevents AbortError cascades on Samsung Internet
 */
export const useManagedVideoPlayback = ({ videoRef, isPageVisible, shouldPlay = true, shouldMute = false }) => {
  const retryTimeoutRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const isMountedRef = useRef(true);
  
  // Keep latest props in ref to avoid stale closures
  const propsRef = useRef({ isPageVisible, shouldPlay, shouldMute });
  useEffect(() => {
    propsRef.current = { isPageVisible, shouldPlay, shouldMute };
  });

  // Cleanup helper
  const cancelPendingRetry = () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cancelPendingRetry();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Cancel any pending retry from previous effect run
    cancelPendingRetry();

    const syncPlayback = () => {
      const currentVideo = videoRef.current;
      if (!currentVideo || !isMountedRef.current) return;

      const { isPageVisible: visible, shouldPlay: play, shouldMute: mute } = propsRef.current;

      // CRITICAL FIX: Set muted BEFORE any play() call
      // iOS requires muted to be set before play() for autoplay to work
      currentVideo.muted = mute;
      currentVideo.defaultMuted = mute;
      
      if (mute) {
        currentVideo.setAttribute('muted', '');
      } else {
        currentVideo.removeAttribute('muted');
      }
      
      currentVideo.autoplay = true;
      currentVideo.controls = false;
      currentVideo.disablePictureInPicture = true;
      currentVideo.playsInline = true;
      currentVideo.setAttribute('playsinline', '');
      currentVideo.setAttribute('webkit-playsinline', '');

      // Pause if we shouldn't be playing
      if (!play || !visible) {
        if (!currentVideo.paused) {
          currentVideo.pause();
        }
        return;
      }

      // FIX: Don't play ended videos (prevents restart bug)
      if (currentVideo.ended) return;

      // FIX: Wait for enough data (Samsung Internet needs readyState >= 2)
      if (currentVideo.readyState < 2) {
        return; // Event listeners will retry when ready
      }

      // Already playing - don't interrupt
      if (!currentVideo.paused) {
        return;
      }

      // Attempt play
      const playPromise = currentVideo.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Success - clear any pending retries
            cancelPendingRetry();
          })
          .catch((err) => {
            if (!isMountedRef.current) return;
            
            // Handle AbortError (play interrupted) - retry with longer backoff
            if (err.name === 'AbortError') {
              cancelPendingRetry();
              retryTimeoutRef.current = setTimeout(() => {
                const v2 = videoRef.current;
                if (!v2 || !isMountedRef.current) return;
                if (!propsRef.current.shouldPlay || !propsRef.current.isPageVisible) return;
                if (v2.ended || !v2.paused) return;
                
                // Re-apply muted state before retry
                v2.muted = propsRef.current.shouldMute;
                const retryPromise = v2.play();
                if (retryPromise) {
                  retryPromise.catch(() => {});
                }
              }, 400); // Longer backoff for Samsung Internet
            }
            // NotAllowedError = no user gesture yet; will retry on next interaction
            // NotSupportedError = codec/src issue; nothing we can do
          });
      }
    };

    // Debounce sync to prevent rapid play() calls
    const debouncedSync = () => {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(syncPlayback, 50);
    };

    debouncedSync();

    // Listen for readiness events
    const replayReadyEvents = ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough'];
    replayReadyEvents.forEach((eventName) => {
      video.addEventListener(eventName, debouncedSync);
    });

    return () => {
      cancelPendingRetry();
      replayReadyEvents.forEach((eventName) => {
        video.removeEventListener(eventName, debouncedSync);
      });
    };
  }, [videoRef, isPageVisible, shouldPlay, shouldMute]);
};
