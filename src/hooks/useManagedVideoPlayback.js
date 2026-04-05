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

      const playPromise = currentVideo.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          retryTimeoutId = window.setTimeout(() => {
            if (!videoRef.current || !shouldPlay || !isPageVisible) return;
            videoRef.current.play().catch(() => {});
          }, 150);
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
