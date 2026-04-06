import React, { useEffect, useState, useRef } from 'react';
import { useLanguage, useGameState } from '../context/LanguageContext';
import './ChallengeIntroPage.css';
import './TransitionVideoPage.css';
import './ChallengePage.css';
import { APP_VIDEOS, getPreferredVideoSrc } from '../config/media';
import { APP_IMAGES } from '../config/media';
import HappinessMeter from '../components/HappinessMeter';
import SettingsMenu from '../components/SettingsMenu';
import { useManagedVideoPlayback } from '../hooks/useManagedVideoPlayback';

const ChallengeIntroPage = ({ isActive = true, onStart, onPrevious, onRestartGame, happinessScore, initialSeekTime = 0, navigationMode = 'flow', shouldStartUnmuted = false }) => {
  const videoRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const { isIOSLikeDevice } = useLanguage();
  const { shouldMuteAll, isPageVisible, isMuted, setIsMuted, setIsGamePaused, hasUserInteracted } = useGameState();
  const shouldMuteVideo = shouldMuteAll || !hasUserInteracted;
  const shouldStartMuted = !shouldStartUnmuted;
  const shouldMuteNow = shouldMuteAll || shouldStartMuted;
  const videoSrc = getPreferredVideoSrc(APP_VIDEOS.challengeIntro, isIOSLikeDevice);

  // Reset video ready state when video source changes
  useEffect(() => {
    setIsVideoReady(false);
  }, [videoSrc]);

  useManagedVideoPlayback({
    videoRef,
    isPageVisible,
    shouldPlay: !isPaused && isVideoReady,
    shouldMute: shouldMuteNow,
  });

  const handleVideoEnd = () => {
    if (navigationMode === 'browse') {
      return;
    }

    onStart();
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

  const applyInitialSeekTime = () => {
    const videoElement = videoRef.current;

    if (!videoElement || initialSeekTime <= 0) return;

    if (Math.abs(videoElement.currentTime - initialSeekTime) < 0.2) return;

    try {
      videoElement.currentTime = initialSeekTime;
    } catch {
      // Ignore transient seek errors until metadata is fully ready.
    }
  };

  const handleStartClick = () => {
    if (isPaused) return; // Don't allow navigation while paused
    onStart();
  };

  return (
    <div className={`page challenge-intro-video-page ${isActive ? 'active' : ''}`}>
      <video
        ref={videoRef}
        className="challenge-intro-video"
        style={{ opacity: isVideoReady ? 1 : 0, transition: 'opacity 0.3s ease-in-out' }}
        src={videoSrc}
        autoPlay
        controls={false}
        muted={shouldStartMuted}
        playsInline
        disablePictureInPicture
        preload="auto"
        onLoadedMetadata={applyInitialSeekTime}
        onCanPlay={() => {
          setIsVideoReady(true);
          applyInitialSeekTime();
        }}
        onEnded={handleVideoEnd}
        onError={() => {}}
      />

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
