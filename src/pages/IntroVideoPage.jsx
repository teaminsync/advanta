import React, { useRef, useState, useEffect, useCallback } from 'react';
import './IntroVideoPage.css';
import { APP_VIDEOS, getPreferredVideoSrc } from '../config/media';
import { useLanguage } from '../context/LanguageContext';
import { useGameState } from '../context/LanguageContext';
import { useManagedVideoPlayback } from '../hooks/useManagedVideoPlayback';
import { useVideoLoadingState } from '../hooks/useVideoLoadingState';

const INTRO_TIMEOUT_MS = 30_000; // 30s fallback timeout

const IntroVideoPage = ({ isActive = true, onComplete }) => {
  const videoRef = useRef(null);
  const hasCompletedRef = useRef(false);
  const fallbackTimerRef = useRef(null);
  const durationKnownRef = useRef(false);
  
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  
  const { isIOSLikeDevice, isLowPowerMode } = useLanguage();
  const videoSrc = getPreferredVideoSrc(APP_VIDEOS.intro, isIOSLikeDevice);
  const { isPageVisible, hasUserInteracted } = useGameState();
  const { isVideoLoading, videoLoadingHandlers } = useVideoLoadingState(videoSrc);

  // Guard: call onComplete exactly once
  const complete = useCallback(() => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    clearTimeout(fallbackTimerRef.current);
    onComplete();
  }, [onComplete]);

  // Fallback timer scheduler
  const scheduleFallback = useCallback((ms) => {
    clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = setTimeout(complete, ms);
  }, [complete]);

  // On iOS, ensure muted is set as DOM property immediately (React bug workaround)
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.defaultMuted = true;
    }
  }, []);

  // Start initial fallback timer and show skip button after 3s
  useEffect(() => {
    scheduleFallback(INTRO_TIMEOUT_MS);
    const skipTimer = setTimeout(() => setShowSkip(true), 3_000);
    return () => {
      clearTimeout(fallbackTimerRef.current);
      clearTimeout(skipTimer);
    };
  }, [scheduleFallback]);

  // Once we know real duration, reschedule with actual duration + 2s buffer
  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    const duration = v.duration;
    if (duration && isFinite(duration) && !durationKnownRef.current) {
      durationKnownRef.current = true;
      scheduleFallback((duration + 2) * 1_000);
    }
    videoLoadingHandlers.onLoadedData();
  };

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
    complete();
  };

  // Secondary completion path: timeupdate near end
  // Catches browsers that skip 'ended' event when video stalls
  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    if (v.currentTime >= v.duration - 0.3) {
      complete();
    }
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
        onLoadedMetadata={handleLoadedMetadata}
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
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleVideoEnd}
        onError={() => {
          if (videoLoadingHandlers?.onCanPlay) videoLoadingHandlers.onCanPlay();
        }}
      />
      
      {showSkip && (
        <button
          className="intro-skip-btn"
          onClick={complete}
          aria-label="Skip intro"
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            padding: '10px 20px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            zIndex: 1000,
          }}
        >
          Skip ▶
        </button>
      )}
    </div>
  );
};

export default IntroVideoPage;
