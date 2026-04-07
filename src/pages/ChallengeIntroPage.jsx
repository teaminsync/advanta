import { useEffect, useRef, useState, useCallback } from 'react';
import { useLanguage, useGameState } from '../context/LanguageContext';
import './ChallengeIntroPage.css';
import './TransitionVideoPage.css';
import './ChallengePage.css';
import { APP_VIDEOS, APP_IMAGES, getPreferredVideoSrc } from '../config/media';
import HappinessMeter from '../components/HappinessMeter';
import SettingsMenu from '../components/SettingsMenu';
import videoPool from '../utils/videoPool';

/**
 * ChallengeIntroPage - Instagram/TikTok style with video pool
 * 
 * ZERO BLACK SCREENS - Frame 5 loads instantly from the pool
 */
const ChallengeIntroPage = ({ isActive = true, onStart, onRestartGame, happinessScore, initialSeekTime = 0, navigationMode = 'flow', shouldStartUnmuted = false }) => {
  const controllerRef = useRef(null);
  const onStartRef = useRef(onStart);
  const [isPaused, setIsPaused] = useState(false);
  const hasCompletedRef = useRef(false); // Prevent multiple onStart calls
  
  // Keep onStart ref updated
  useEffect(() => {
    onStartRef.current = onStart;
  }, [onStart]);
  const { isIOSLikeDevice } = useLanguage();
  const { shouldMuteAll, isPageVisible, isMuted, setIsMuted, setIsGamePaused } = useGameState();
  const shouldStartMuted = !shouldStartUnmuted;
  const shouldMuteNow = shouldMuteAll || shouldStartMuted;
  const videoSrc = getPreferredVideoSrc(APP_VIDEOS.challengeIntro, isIOSLikeDevice);

  // INSTAGRAM-STYLE VIDEO ACTIVATION
  useEffect(() => {
    // Reset completion flag when video changes
    hasCompletedRef.current = false;
    
    if (!isActive) return;


    const controller = videoPool.activate(videoSrc, {
      muted: shouldMuteNow,
      startTime: initialSeekTime,
      onEnded: () => {
        if (navigationMode === 'browse') return;
        if (isActive && !hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onStartRef.current(); // Use ref to avoid dependency
        }
      },
      onReady: () => {
        // Video is ready and playing
      },
      fadeIn: true,
    });

    controllerRef.current = controller;

    return () => {
      if (controller) {
        controller.hide();
      }
    };
  }, [isActive, videoSrc, initialSeekTime, navigationMode]); // Removed onStart

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

  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, [setIsMuted]);

  useEffect(() => {
    setIsGamePaused(isPaused);
    return () => {
      setIsGamePaused(false);
    };
  }, [isPaused, setIsGamePaused]);

  const handleStartClick = useCallback(() => {
    if (isPaused) return;
    onStart();
  }, [isPaused, onStart]);

  return (
    <div className={`page challenge-intro-video-page ${isActive ? 'active' : ''}`}>
      {/* Video is rendered by the pool - we just control it */}

      <div className="challenge-intro-top-hud">
        <div className="hud-left">
          <SettingsMenu
            isMuted={isMuted}
            isPaused={isPaused}
            onTogglePause={handleTogglePause}
            onToggleMute={handleToggleMute}
            onHome={onRestartGame}
          />
        </div>
        <div className="challenge-intro-meter">
          <HappinessMeter score={happinessScore} />
        </div>
      </div>

      {isPaused && (
        <div className="paused-screen-overlay">
          <button type="button" className="paused-screen-resume-btn" onClick={handleTogglePause}>
            <img src={APP_IMAGES.playIcon} alt="resume game" className="paused-screen-icon" />
          </button>
        </div>
      )}

      <div className="video-arrow-nav challenge-intro-arrow-nav">
        <button 
          type="button" 
          className="video-arrow-btn" 
          onClick={handleStartClick}
          style={{
            opacity: isPaused ? 0.5 : 1,
            pointerEvents: isPaused ? 'none' : 'auto',
          }}
        >
          <img src={APP_IMAGES.arrowIcon} alt="next page" className="video-arrow-icon mirrored" />
        </button>
      </div>
    </div>
  );
};

export default ChallengeIntroPage;
