import { useEffect } from 'react';

export const useManagedVideoPlayback = ({ videoRef, isPageVisible, shouldPlay = true, shouldMute = false }) => {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let retryTimeoutId;

    const syncPlayback = () => {
      const currentVideo = videoRef.current;
      if (!currentVideo) return;

      currentVideo.muted = shouldMute;
      currentVideo.defaultMuted = shouldMute;
      currentVideo.autoplay = true;
      currentVideo.controls = false;
      currentVideo.disablePictureInPicture = true;
      currentVideo.playsInline = true;
      currentVideo.setAttribute('playsinline', '');
      currentVideo.setAttribute('webkit-playsinline', '');
      if (shouldMute) {
        currentVideo.setAttribute('muted', '');
      } else {
        currentVideo.removeAttribute('muted');
      }

      if (!shouldPlay || !isPageVisible) {
        if (!currentVideo.paused) {
          currentVideo.pause();
        }
        return;
      }

      if (currentVideo.readyState < 2) {
        // Not enough data yet, the loadeddata/canplay event listeners will retry
        return;
      }

      // Don't call play() if already playing - prevents iOS NotAllowedError when unmuting
      // Check AFTER setting muted attribute, as changing muted can briefly pause the video
      if (!currentVideo.paused) {
        return;
      }

      const playPromise = currentVideo.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {})
          .catch((err) => {
            // Handle AbortError (play interrupted) - retry after delay
            if (err.name === 'AbortError') {
              retryTimeoutId = window.setTimeout(() => {
                if (!videoRef.current || !shouldPlay || !isPageVisible) return;
                const retryPromise = videoRef.current.play();
                if (retryPromise) {
                  retryPromise.catch(() => {});
                }
              }, 200);
            }
          });
      }
    };

    syncPlayback();

    const replayReadyEvents = ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough'];
    replayReadyEvents.forEach((eventName) => {
      video.addEventListener(eventName, syncPlayback);
    });

    return () => {
      if (retryTimeoutId) {
        window.clearTimeout(retryTimeoutId);
      }

      replayReadyEvents.forEach((eventName) => {
        video.removeEventListener(eventName, syncPlayback);
      });
    };
  }, [videoRef, isPageVisible, shouldPlay, shouldMute]);
};
