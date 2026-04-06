import React, { useRef, useState, useEffect } from 'react';
import './IntroVideoPage.css';
import { APP_VIDEOS, getPreferredVideoSrc } from '../config/media';
import { useLanguage } from '../context/LanguageContext';
import { useGameState } from '../context/LanguageContext';
import { useManagedVideoPlayback } from '../hooks/useManagedVideoPlayback';
import { useVideoLoadingState } from '../hooks/useVideoLoadingState';

const IntroVideoPage = ({ isActive = true, onComplete }) => {
  const videoRef = useRef(null);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const { isIOSLikeDevice, isLowPowerMode } = useLanguage();
  const videoSrc = getPreferredVideoSrc(APP_VIDEOS.intro, isIOSLikeDevice);
  const { isPageVisible, hasUserInteracted } = useGameState();
  const { isVideoLoading, videoLoadingHandlers } = useVideoLoadingState(videoSrc);

  // On iOS, ensure muted is set as DOM property immediately (React bug workaround)
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.defaultMuted = true;
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
    onComplete();
  };

  const handleManualPlay = () => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  };

  const handleVideoPlaying = () => {
    setHasStartedPlaying(true);
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
        disablePictureInPicture
        preload="auto"
        onLoadStart={() => {}}
        onLoadedMetadata={() => {}}
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
