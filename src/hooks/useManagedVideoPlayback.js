import { useEffect, useRef } from 'react';

/**
 * useManagedVideoPlayback - Optimized for mobile video playback
 * 
 * KEY FIXES:
 * 1. Set muted BEFORE calling play() (iOS autoplay requirement)
 * 2. Serialized retry logic to prevent race conditions
 * 3. Proper cleanup of pending operations
 */
export const useManagedVideoPlayback = ({ videoRef, isPageVisible, shouldPlay = true, shouldMute = false }) => {
  const retryTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  // Cleanup helper
  const cancelPendingRetry = () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
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

      // CRITICAL FIX: Set muted BEFORE any play() call
      // iOS requires muted to be set before play() for autoplay to work
      currentVideo.muted = shouldMute;
      currentVideo.defaultMuted = shouldMute;
      
      if (shouldMute) {
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
      if (!shouldPlay || !isPageVisible) {
        if (!currentVideo.paused) {
          currentVideo.pause();
        }
        return;
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
            
            // Handle AbortError (play interrupted) - retry with backoff
            if (err.name === 'AbortError') {
              cancelPendingRetry();
              retryTimeoutRef.current = setTimeout(() => {
                const v2 = videoRef.current;
                if (!v2 || !isMountedRef.current) return;
                if (!shouldPlay || !isPageVisible) return;
                if (!v2.paused) return;
                
                // Re-apply muted state before retry
                v2.muted = shouldMute;
                const retryPromise = v2.play();
                if (retryPromise) {
                  retryPromise.catch(() => {});
                }
              }, 300);
            }
            // NotAllowedError = no user gesture yet; will retry on next interaction
            // NotSupportedError = codec/src issue; nothing we can do
          });
      }
    };

    syncPlayback();

    // Listen for readiness events
    const replayReadyEvents = ['loadedmetadata', 'loadeddata', 'canplay'];
    replayReadyEvents.forEach((eventName) => {
      video.addEventListener(eventName, syncPlayback);
    });

    return () => {
      cancelPendingRetry();
      replayReadyEvents.forEach((eventName) => {
        video.removeEventListener(eventName, syncPlayback);
      });
    };
  }, [videoRef, isPageVisible, shouldPlay, shouldMute]);
};
