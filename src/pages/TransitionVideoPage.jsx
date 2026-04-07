import { useEffect, useRef, useState } from 'react';
import { useLanguage, useGameState } from '../context/LanguageContext';
import HappinessMeter from '../components/HappinessMeter';
import SettingsMenu from '../components/SettingsMenu';
import './TransitionVideoPage.css';
import './ChallengePage.css';
import { APP_IMAGES, APP_VIDEOS, getPreferredVideoSrc } from '../config/media';
import videoPool from '../utils/videoPool';

/**
 * TransitionVideoPage - Instagram/TikTok/YouTube Shorts style
 * 
 * ZERO BLACK SCREENS - Uses video pool with pre-loaded videos
 * Videos are ready BEFORE navigation happens
 */
const TransitionVideoPage = ({ isActive = true, videoSrc, onComplete, onSkipVideo, onPreviousQuestion, onNextQuestion, bubbleTrail, happinessScore, showArrows = true, showControls = false, onRestartGame, initialSeekTime = 0, shouldStartUnmuted = false }) => {
  const controllerRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const hasCompletedRef = useRef(false); // Prevent multiple onComplete calls
  const { isIOSLikeDevice } = useLanguage();
  const { shouldMuteAll, isPageVisible, isMuted, setIsMuted, setIsGamePaused } = useGameState();
  const preferredVideoSrc = getPreferredVideoSrc(videoSrc, isIOSLikeDevice);
  
  // Mute logic
  const shouldStartMuted = !shouldStartUnmuted;
  const shouldMuteNow = shouldMuteAll || shouldStartMuted;
  
  const replayStartTimeByVideo = {
    [APP_VIDEOS.transitionQ2]: 6,
    [APP_VIDEOS.transitionQ3]: 8,
    [APP_VIDEOS.transitionQ4]: 8,
    [APP_VIDEOS.transitionQ5]: 4.2,
  };
  const replayStartTime = replayStartTimeByVideo[videoSrc] ?? 0;
  const visibleBubbleTrail = bubbleTrail?.filter(Boolean) || [];

  // INSTAGRAM-STYLE VIDEO ACTIVATION
  // Video is already loaded in the pool - just activate it (INSTANT)
  useEffect(() => {
    // Reset completion flag when video changes
    hasCompletedRef.current = false;
    
    if (!preferredVideoSrc || !isActive) {
      return;
    }

    // Activate the video from the pool (instant - no loading!)
    const controller = videoPool.activate(preferredVideoSrc, {
      muted: shouldMuteNow,
      startTime: initialSeekTime,
      onEnded: () => {
        if (isActive && !hasCompletedRef.current) {
          hasCompletedRef.current = true; // Mark as completed
          onComplete();
        }
      },
      onReady: () => {
        // Video is ready and playing
      },
      fadeIn: true, // Smooth fade in (no black screen)
    });

    controllerRef.current = controller;

    return () => {
      // Hide video when component unmounts or becomes inactive
      if (controller) {
        controller.hide();
      }
    };
  }, [preferredVideoSrc, isActive, initialSeekTime, shouldMuteNow, onComplete]);

  // Handle pause/resume
  useEffect(() => {
    if (!controllerRef.current) return;

    if (isPaused || !isPageVisible) {
      controllerRef.current.pause();
    } else {
      controllerRef.current.play();
    }
  }, [isPaused, isPageVisible]);

  // Handle mute changes
  useEffect(() => {
    if (!controllerRef.current) return;
    controllerRef.current.setMuted(shouldMuteNow);
  }, [shouldMuteNow]);

  const handleTogglePause = () => {
    setIsPaused((prev) => !prev);
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

  const handleReplayCurrentVideo = () => {
    if (isPaused) return;

    if (showControls && onPreviousQuestion) {
      onPreviousQuestion();
      return;
    }

    if (controllerRef.current) {
      controllerRef.current.seek(replayStartTime);
      controllerRef.current.play();
    } else {
      onPreviousQuestion?.();
    }
  };

  const handleNextQuestion = () => {
    if (isPaused) return;
    
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
      {/* Video is rendered by the pool - we just control it */}
      {/* No video element here - pool manages everything */}

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
