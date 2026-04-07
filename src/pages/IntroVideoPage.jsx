import { useRef, useEffect } from 'react';
import './IntroVideoPage.css';
import { APP_VIDEOS, getPreferredVideoSrc } from '../config/media';
import { useLanguage } from '../context/LanguageContext';
import { useGameState } from '../context/LanguageContext';
import { useManagedVideoPlayback } from '../hooks/useManagedVideoPlayback';
import { useVideoLoadingState } from '../hooks/useVideoLoadingState';

const IntroVideoPage = ({ isActive = true, onComplete }) => {
  const videoRef = useRef(null);
  const hasCompletedRef = useRef(false);
  
  const { isIOSLikeDevice } = useLanguage();
  const videoSrc = getPreferredVideoSrc(APP_VIDEOS.intro, isIOSLikeDevice);
  const { isPageVisible, hasUserInteracted } = useGameState();
  const { isVideoLoading, videoLoadingHandlers } = useVideoLoadingState(videoSrc);

  // CRITICAL: Set muted as HTML attribute for Android WebView (Realme Browser)
  // WebView requires the attribute, not just the property
  useEffect(() => {
    if (videoRef.current) {
      const v = videoRef.current;
      v.muted = true;
      v.defaultMuted = true;
      v.setAttribute('muted', '');
    }
  }, []);

  // On iOS, trigger video load on first user interaction
  useEffect(() => {
    if (isIOSLikeDevice && hasUserInteracted && videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [hasUserInteracted, isIOSLikeDevice]);

  useManagedVideoPlayback({
    videoRef,
    isPageVisible,
    shouldPlay: !isVideoLoading,
    shouldMute: true,
  });

  const handleVideoEnd = () => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    onComplete();
  };

  const handleVideoPlaying = () => {
    videoLoadingHandlers.onPlaying();
    
    // Try to start background music when video starts playing (has user gesture context)
    if (typeof window !== 'undefined' && window.startBackgroundMusic) {
      window.startBackgroundMusic();
    }
  };

  return (
    <div className={`page intro-video-page ${isActive ? 'active' : ''}`}>
      <video
        ref={videoRef}
        className="intro-video"
        src={videoSrc}
        autoPlay
        controls={false}
        muted
        playsInline
        webkit-playsinline="true"
        disablePictureInPicture
        preload="auto"
        onLoadStart={() => {}}
        onLoadedMetadata={() => {
          videoLoadingHandlers.onLoadedData();
        }}
        onLoadedData={() => {
          videoLoadingHandlers.onLoadedData();
        }}
        onCanPlay={() => {
          videoLoadingHandlers.onCanPlay();
        }}
        onCanPlayThrough={() => {
          videoLoadingHandlers.onCanPlayThrough();
        }}
        onPlaying={handleVideoPlaying}
        onWaiting={() => {
          videoLoadingHandlers.onWaiting();
        }}
        onStalled={() => {
          videoLoadingHandlers.onStalled();
        }}
        onSeeking={() => {
          videoLoadingHandlers.onSeeking();
        }}
        onEmptied={() => {
          videoLoadingHandlers.onEmptied();
        }}
        onSuspend={() => {
          videoLoadingHandlers.onSuspend();
        }}
        onEnded={handleVideoEnd}
        onError={() => {
          if (videoLoadingHandlers?.onCanPlay) videoLoadingHandlers.onCanPlay();
        }}
      />
    </div>
  );
};

export default IntroVideoPage;
