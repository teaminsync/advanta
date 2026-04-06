import React, { useEffect, useRef, useState } from 'react';
import { useLanguage, useGameState } from '../context/LanguageContext';
import HappinessMeter from '../components/HappinessMeter';
import SettingsMenu from '../components/SettingsMenu';
import './TransitionVideoPage.css';
import './ChallengePage.css';
import { useManagedVideoPlayback } from '../hooks/useManagedVideoPlayback';
import { APP_IMAGES, APP_VIDEOS, getPreferredVideoSrc } from '../config/media';

const TransitionVideoPage = ({ isActive = true, videoSrc, onComplete, onSkipVideo, onPreviousQuestion, onNextQuestion, bubbleTrail, happinessScore, showArrows = true, showControls = false, onRestartGame, initialSeekTime = 0, shouldStartUnmuted = false }) => {
  const videoRef = useRef(null);
  const hasAppliedInitialSeekRef = useRef(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const { isIOSLikeDevice } = useLanguage();
  const { shouldMuteAll, isPageVisible, isMuted, setIsMuted, setIsGamePaused, hasUserInteracted } = useGameState();
  const shouldMuteVideo = shouldMuteAll || !hasUserInteracted;
  const preferredVideoSrc = getPreferredVideoSrc(videoSrc, isIOSLikeDevice);
  
  // If coming from user gesture (shouldStartUnmuted), start unmuted. Otherwise start muted.
  // But always respect shouldMuteAll (user clicked mute button)
  const shouldStartMuted = !shouldStartUnmuted;
  const shouldMuteNow = shouldMuteAll || shouldStartMuted;
  
  // Reset video ready state when video source changes
  useEffect(() => {
    setIsVideoReady(false);
  }, [preferredVideoSrc]);
  
  const replayStartTimeByVideo = {
    [APP_VIDEOS.transitionQ2]: 6,
    [APP_VIDEOS.transitionQ3]: 8,
    [APP_VIDEOS.transitionQ4]: 8,
    [APP_VIDEOS.transitionQ5]: 4.2,
  };
  const replayStartTime = replayStartTimeByVideo[videoSrc] ?? 0;
  const visibleBubbleTrail = bubbleTrail?.filter(Boolean) || [];

  useManagedVideoPlayback({
    videoRef,
    isPageVisible,
    shouldPlay: Boolean(videoSrc) && !isPaused && isVideoReady,
    shouldMute: shouldMuteNow,
  });

  const handleVideoEnd = () => {
    onComplete();
  };

  const handleTogglePause = () => {
    setIsPaused((prev) => {
      const nextIsPaused = !prev;

      if (prev && videoRef.current) {
        videoRef.current.play().catch(() => {});
      }

      return nextIsPaused;
    });
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  useEffect(() => {
    setIsGamePaused(isPaused);

    return () => {
      setIsGamePaused(false);
    };
  }, [isPaused, setIsGamePaused]);

  useEffect(() => {
    hasAppliedInitialSeekRef.current = false;
  }, [videoSrc, initialSeekTime]);

  const applyInitialSeekTime = () => {
    const videoElement = videoRef.current;

    if (!videoElement || initialSeekTime <= 0) {
      return;
    }
    if (hasAppliedInitialSeekRef.current) return;
    if (videoElement.readyState < 1) return;

    if (Math.abs(videoElement.currentTime - initialSeekTime) < 0.2) return;

    try {
      videoElement.pause();
      videoElement.currentTime = initialSeekTime;
      hasAppliedInitialSeekRef.current = true;

      if (!isPaused && isPageVisible) {
        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
      }
    } catch {
      // Ignore transient seek errors until metadata is fully ready.
    }
  };

  useEffect(() => {
    applyInitialSeekTime();
  }, [videoSrc, initialSeekTime, isPaused, isPageVisible]);

  const handleReplayCurrentVideo = () => {
    if (isPaused) return; // Don't allow navigation while paused

    const videoElement = videoRef.current;

    if (showControls && onPreviousQuestion) {
      onPreviousQuestion();
      return;
    }

    if (!videoElement) {
      onPreviousQuestion?.();
      return;
    }

    videoElement.currentTime = replayStartTime;
    const playPromise = videoElement.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
  };

  const handleNextQuestion = () => {
    if (isPaused) return; // Don't allow navigation while paused
    
    if (onNextQuestion) {
      onNextQuestion();
    } else if (onSkipVideo) {
      onSkipVideo();
    } else {
      onComplete();
    }
  };

  return (
    <div className={`page transition-video-page ${isActive ? 'active' : ''}`}>
      <video
        key={`${preferredVideoSrc}-${initialSeekTime}`}
        ref={videoRef}
        className="transition-video"
        style={{ opacity: isVideoReady ? 1 : 0, transition: 'opacity 0.3s ease-in-out' }}
        src={preferredVideoSrc}
        autoPlay
        controls={false}
        muted={shouldStartMuted}
        playsInline
        disablePictureInPicture
        preload="auto"
        onLoadedMetadata={() => {
          applyInitialSeekTime();
        }}
        onLoadedData={() => {
          applyInitialSeekTime();
        }}
        onCanPlay={() => {
          applyInitialSeekTime();
        }}
        onCanPlayThrough={() => {
          setIsVideoReady(true);
          applyInitialSeekTime();
        }}
        onEnded={handleVideoEnd}
        onError={() => {}}
      />

      {showControls && (
        <div className="transition-video-top-hud">
          <div className="hud-left">
            <SettingsMenu
              isMuted={isMuted}
              isPaused={isPaused}
              onTogglePause={handleTogglePause}
              onToggleMute={handleToggleMute}
              onHome={onRestartGame}
            />
          </div>
        </div>
      )}

      {showControls && isPaused && (
        <div className="paused-screen-overlay">
          <button type="button" className="paused-screen-resume-btn" onClick={handleTogglePause}>
            <img src={APP_IMAGES.playIcon} alt="resume game" className="paused-screen-icon" />
          </button>
        </div>
      )}

      {happinessScore !== undefined && (
        <div className="transition-hud">
          <HappinessMeter score={happinessScore} />
        </div>
      )}

      {showArrows && (
        <div className="video-arrow-nav">
          <button
            type="button"
            className="video-arrow-btn"
            onClick={handleReplayCurrentVideo}
            style={{
              opacity: isPaused ? 0.5 : 1,
              pointerEvents: isPaused ? 'none' : 'auto',
            }}
          >
            <img src={APP_IMAGES.arrowIcon} alt="previous question" className="video-arrow-icon" />
          </button>
          <button
            type="button"
            className="video-arrow-btn"
            onClick={handleNextQuestion}
            style={{
              opacity: isPaused ? 0.5 : 1,
              pointerEvents: isPaused ? 'none' : 'auto',
            }}
          >
            <img src={APP_IMAGES.arrowIcon} alt="next question" className="video-arrow-icon mirrored" />
          </button>
        </div>
      )}

      {visibleBubbleTrail.length > 0 && (
        <div className="collected-bubbles-tray transition-collected-tray">
          {visibleBubbleTrail.map((item, index) => (
            <div key={`${item.type}-${index}`} className={item.type === 'correct' ? 'correct-bubble-indicator' : 'wrong-bubble-indicator'}>
              {item.value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransitionVideoPage;
