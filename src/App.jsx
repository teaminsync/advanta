import React, { useState, useEffect, useRef } from 'react';
import { LanguageProvider, useLanguage, useGameState } from './context/LanguageContext';
import IntroVideoPage from './pages/IntroVideoPage';
import LanguagePage from './pages/LanguagePage';
import FormPage from './pages/FormPage';
import InstructionPage from './pages/InstructionPage';
import ChallengeIntroPage from './pages/ChallengeIntroPage';
import ChallengePage from './pages/ChallengePage';
import TransitionVideoPage from './pages/TransitionVideoPage';
import EndPage from './pages/EndPage';
import FinalAnimationPage from './pages/FinalAnimationPage';
import { APP_AUDIO, APP_IMAGES, APP_VIDEOS, LEVEL_TRANSITION_VIDEOS, LEVEL_BACKGROUNDS, getPreferredVideoSrc } from './config/media';
import { preloadVideo } from './utils/preloadMedia';

const SHEET_URL = 'https://script.google.com/macros/s/AKfycbwRxfr0E97JmFltogq6PzfLLhe3XnjLLwzqCUvQsw-HNkvloF50oGGozU6FkghVilUF/exec';
const NORMAL_FRAME_9_VIDEO = APP_VIDEOS.transitionQ5;
const PREVIOUS_TRANSITION_CONFIG = {
  0: { page: 'challengeIntroPage', startTime: 7.2 },
  1: { videoSrc: APP_VIDEOS.transitionQ2, level: 0, startTime: 4 },
  2: { videoSrc: APP_VIDEOS.transitionQ3, level: 1, startTime: 7.5 },
  3: { videoSrc: APP_VIDEOS.transitionQ4, level: 2, startTime: 5 },
};

function AppContent() {
  const { t, isIOSLikeDevice } = useLanguage();

  const [page, setPage] = useState('introVideo');
  const [prevPage, setPrevPage] = useState(null);
  const [currentUser, setCurrentUser] = useState({ name: '', phone: '', district: '', state: '' });
  const [currentLevel, setCurrentLevel] = useState(0);
  const [happinessScore, setHappinessScore] = useState(50);
  const [bubbleTrail, setBubbleTrail] = useState([]);
  const [transitionVideoSrc, setTransitionVideoSrc] = useState('');
  const [videoNavigationMode, setVideoNavigationMode] = useState('flow');
  const [challengeIntroStartTime, setChallengeIntroStartTime] = useState(0);
  const [transitionVideoStartTime, setTransitionVideoStartTime] = useState(0);
  const [shouldUnmuteTransitionVideo, setShouldUnmuteTransitionVideo] = useState(false);
  const [shouldUnmuteChallengeIntro, setShouldUnmuteChallengeIntro] = useState(false);
  const [isOnVideoPage, setIsOnVideoPage] = useState(false);
  const levelStartScoresRef = useRef({});

  // Track when we're on a video page (for background music muting)
  useEffect(() => {
    const videoPages = ['challengeIntroPage', 'transitionVideo', 'finalTransitionVideo', 'postAnimationTransitionVideo'];
    const isVideoPage = videoPages.includes(page);
    setIsOnVideoPage(isVideoPage);
  }, [page]);

  // Smooth page transition - no loading overlay needed with proper CSS transitions
  const transitionToPage = (newPage) => {
    setPage(newPage);
  };

  const submitUserToSheet = async (userData, status) => {
    if (typeof window === 'undefined') return;

    try {
      const payload = {
        name: userData.name || '',
        phone: userData.phone || '',
        phoneNumber: userData.phone || '',
        district: userData.district || '',
        state: userData.state || '',
        status: status || 'lose',
      };

      // Use fetch with no-cors mode to avoid CORS issues
      // The script will still receive and process the data
      await fetch(SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      // no-cors mode doesn't return response, so we assume success
    } catch (error) {
      // Silently fail - don't block user experience
      // Data submission is not critical for gameplay
    }
  };

  useEffect(() => {
    const syncViewportHeight = () => {
      const viewportUnit = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--app-vh', `${viewportUnit}px`);
    };

    syncViewportHeight();
    window.addEventListener('resize', syncViewportHeight);
    window.addEventListener('orientationchange', syncViewportHeight);

    return () => {
      window.removeEventListener('resize', syncViewportHeight);
      window.removeEventListener('orientationchange', syncViewportHeight);
    };
  }, []);



  useEffect(() => {
    const upcomingVideoSources = [];
    const upcomingImages = [];

    // Preload Frame 5 (challengeIntro) when user is on form page
    if (page === 'formPage') {
      upcomingVideoSources.push(APP_VIDEOS.challengeIntro);
      upcomingImages.push(LEVEL_BACKGROUNDS[0]); // First challenge background
    }

    if (page === 'challengeIntroPage' || page === 'challengePage') {
      // Preload next transition video
      upcomingVideoSources.push(LEVEL_TRANSITION_VIDEOS[currentLevel]);
      
      // Preload next challenge background
      if (currentLevel + 1 < t.levels.length) {
        upcomingImages.push(LEVEL_BACKGROUNDS[currentLevel + 1]);
      }
      
      if (currentLevel + 1 >= t.levels.length) {
        upcomingVideoSources.push(APP_VIDEOS.finalTransition);
      }
    }

    if (page === 'transitionVideo') {
      // Preload next challenge background
      if (currentLevel + 1 < t.levels.length) {
        upcomingImages.push(LEVEL_BACKGROUNDS[currentLevel + 1]);
      }
      
      // Preload next transition video
      if (currentLevel + 2 < t.levels.length) {
        upcomingVideoSources.push(LEVEL_TRANSITION_VIDEOS[currentLevel + 1]);
      } else if (currentLevel + 2 >= t.levels.length) {
        upcomingVideoSources.push(APP_VIDEOS.finalTransition, APP_VIDEOS.postAnimationTransition);
      }
    }

    if (page === 'finalTransitionVideo') {
      upcomingVideoSources.push(NORMAL_FRAME_9_VIDEO);
    }

    if (page === 'finalAnimationPage') {
      upcomingVideoSources.push(APP_VIDEOS.postAnimationTransition, APP_VIDEOS.end);
    }

    // Preload videos
    upcomingVideoSources.filter(Boolean).forEach((src) => {
      const preferredSrc = getPreferredVideoSrc(src, isIOSLikeDevice);
      preloadVideo(preferredSrc);
    });

    // Preload images
    upcomingImages.filter(Boolean).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [currentLevel, page, t.levels.length, isIOSLikeDevice]);

  const handleIntroVideoComplete = () => {
    transitionToPage('languagePage');
  };

  const handleLanguageComplete = () => {
    transitionToPage('instructionPage');
  };

  const handleInstructionNext = () => {
    transitionToPage('formPage');
  };

  const handleFormSubmit = (userData) => {
    setCurrentUser(userData);
    submitUserToSheet(userData, 'lose');

    startGame();
  };

  const startGame = () => {
    setShouldUnmuteChallengeIntro(true); // User gesture context
    setCurrentLevel(0);
    setBubbleTrail([]);
    setHappinessScore(50);
    levelStartScoresRef.current = {};
    setChallengeIntroStartTime(0);
    transitionToPage('challengeIntroPage');
    
    // Preload all challenge transition videos at game start
    LEVEL_TRANSITION_VIDEOS.forEach((videoSrc) => {
      if (videoSrc) {
        const preferredSrc = getPreferredVideoSrc(videoSrc, isIOSLikeDevice);
        preloadVideo(preferredSrc);
      }
    });
    
    // Preload all level backgrounds at game start
    LEVEL_BACKGROUNDS.forEach((bgSrc) => {
      if (bgSrc) {
        const img = new Image();
        img.src = bgSrc;
      }
    });
  };

  const handleIntroComplete = () => {
    setShouldUnmuteChallengeIntro(false); // Reset flag
    setVideoNavigationMode('flow');
    setChallengeIntroStartTime(0);
    transitionToPage('challengePage');
  };

  const handleChallengeIntroPrevious = () => {
    transitionToPage('formPage');
  };

  const goToTransitionVideoAt = (videoIndex) => {
    const targetVideoSrc = LEVEL_TRANSITION_VIDEOS[videoIndex];
    if (!targetVideoSrc) return false;

    setCurrentLevel(videoIndex);
    setTransitionVideoSrc(targetVideoSrc);
    setTransitionVideoStartTime(0);
    setVideoNavigationMode('browse');
    transitionToPage('transitionVideo');
    return true;
  };

  const rewindProgressToLevel = (targetLevel) => {
    const normalizedLevel = Math.max(targetLevel, 0);
    const restoredScore = levelStartScoresRef.current[normalizedLevel] ?? 50;

    setBubbleTrail((prev) => prev.map((item, index) => (index < normalizedLevel ? item : null)));

    Object.keys(levelStartScoresRef.current).forEach((levelKey) => {
      if (Number(levelKey) >= normalizedLevel) {
        delete levelStartScoresRef.current[levelKey];
      }
    });

    setHappinessScore(restoredScore);
  };

  const handlePreviousVideo = () => {
    rewindProgressToLevel(currentLevel);

    if (page === 'transitionVideo') {
      const currentVideoIndex = LEVEL_TRANSITION_VIDEOS.indexOf(transitionVideoSrc);
      const previousConfig = PREVIOUS_TRANSITION_CONFIG[currentVideoIndex];

      if (previousConfig?.page === 'challengeIntroPage') {
        setChallengeIntroStartTime(previousConfig.startTime);
        setVideoNavigationMode('rewind');
        transitionToPage('challengeIntroPage');
        return;
      }

      if (previousConfig?.videoSrc) {
        setCurrentLevel(previousConfig.level);
        setTransitionVideoSrc(previousConfig.videoSrc);
        setTransitionVideoStartTime(previousConfig.startTime);
        setVideoNavigationMode('rewind');
        transitionToPage('transitionVideo');
        return;
      }

      setCurrentLevel(0);
      setVideoNavigationMode('flow');
      transitionToPage('challengeIntroPage');
      return;
    }

    if (page === 'finalTransitionVideo') {
      setCurrentLevel(3);
      setTransitionVideoSrc(NORMAL_FRAME_9_VIDEO);
      setTransitionVideoStartTime(4);
      setVideoNavigationMode('rewind');
      transitionToPage('transitionVideo');
      return;
    }

    if (page === 'postAnimationTransitionVideo') {
      setTransitionVideoSrc(APP_VIDEOS.finalTransition);
      setVideoNavigationMode('browse');
      transitionToPage('finalTransitionVideo');
    }
  };

  const handleNextVideo = () => {
    if (page === 'transitionVideo') {
      setVideoNavigationMode('flow');
      setCurrentLevel((prev) => prev + 1);
      transitionToPage('challengePage');
      return;
    }

    if (page === 'finalTransitionVideo') {
      setVideoNavigationMode('flow');
      transitionToPage('finalAnimationPage');
      return;
    }

    if (page === 'postAnimationTransitionVideo') {
      setVideoNavigationMode('flow');
      handleGameComplete();
    }
  };

  const handleRestartGame = () => {
    setPage('introVideo');
    setCurrentUser({ name: '', phone: '', district: '', state: '' });
    setCurrentLevel(0);
    setHappinessScore(50);
    setBubbleTrail([]);
    levelStartScoresRef.current = {};
    setTransitionVideoSrc('');
    setTransitionVideoStartTime(0);
    setVideoNavigationMode('flow');
    setChallengeIntroStartTime(0);
  };

  useEffect(() => {
    if (page !== 'challengePage') return;

    if (levelStartScoresRef.current[currentLevel] === undefined) {
      levelStartScoresRef.current[currentLevel] = happinessScore;
    }
  }, [page, currentLevel, happinessScore]);

  const handleWrongAnswer = () => {
    setHappinessScore((prev) => Math.max(prev - 10, 0));
  };

  const handleCorrectAnswer = () => {
    // Score and delay are handled in ChallengePage for immediate feedback.
  };

  const handleLevelComplete = () => {
    // Set flag to unmute video - this happens in user gesture context
    setShouldUnmuteTransitionVideo(true);
    
    if (currentLevel + 1 >= t.levels.length) {
      setTransitionVideoSrc(APP_VIDEOS.finalTransition);
      setTransitionVideoStartTime(0);
      setVideoNavigationMode('flow');
      transitionToPage('finalTransitionVideo');
      return;
    }

    const videoSrc = currentLevel === 3 ? NORMAL_FRAME_9_VIDEO : LEVEL_TRANSITION_VIDEOS[currentLevel];
    if (videoSrc) {
      setTransitionVideoSrc(videoSrc);
      setTransitionVideoStartTime(0);
      setVideoNavigationMode('flow');
      transitionToPage('transitionVideo');
      return;
    }

    setCurrentLevel((prev) => prev + 1);
  };

  const handlePreviousQuestion = () => {
    if (page === 'transitionVideo' || page === 'finalTransitionVideo' || page === 'postAnimationTransitionVideo') {
      rewindProgressToLevel(currentLevel);
      transitionToPage('challengePage');
      return;
    }

    if (page === 'challengePage' && currentLevel > 0) {
      const previousLevel = Math.max(currentLevel - 1, 0);
      rewindProgressToLevel(previousLevel);
      setCurrentLevel(previousLevel);
      transitionToPage('challengePage');
    }
  };

  const handleSkipVideo = () => {
    if (currentLevel + 1 >= t.levels.length) {
      transitionToPage('finalAnimationPage');
      return;
    }

    setCurrentLevel((prev) => prev + 1);
    transitionToPage('challengePage');
  };

  const handleTransitionVideoComplete = () => {
    if (videoNavigationMode === 'browse') {
      return;
    }

    setShouldUnmuteTransitionVideo(false); // Reset flag
    setTransitionVideoStartTime(0);
    setVideoNavigationMode('flow');
    setCurrentLevel((prev) => prev + 1);
    transitionToPage('challengePage');
  };

  const handleFinalTransitionVideoComplete = () => {
    if (videoNavigationMode === 'browse') {
      return;
    }

    setShouldUnmuteTransitionVideo(false); // Reset flag
    setTransitionVideoStartTime(0);
    transitionToPage('finalAnimationPage');
  };

  const handleFinalAnimationComplete = () => {
    setShouldUnmuteTransitionVideo(true); // User just watched animation - set flag for next video
    setTransitionVideoSrc(APP_VIDEOS.postAnimationTransition);
    setTransitionVideoStartTime(0);
    setVideoNavigationMode('flow');
    transitionToPage('postAnimationTransitionVideo');
  };

  const handlePostAnimationVideoComplete = () => {
    if (videoNavigationMode === 'browse') {
      return;
    }

    setShouldUnmuteTransitionVideo(false); // Reset flag
    handleGameComplete();
  };

  const handleGameComplete = () => {
    transitionToPage('endPage');
  };

  const renderPage = (pageName, isActive) => {
    switch (pageName) {
      case 'introVideo':
        return <IntroVideoPage key="introVideo" isActive={isActive} onComplete={handleIntroVideoComplete} />;
      case 'languagePage':
        return <LanguagePage key="languagePage" isActive={isActive} onComplete={handleLanguageComplete} />;
      case 'instructionPage':
        return <InstructionPage key="instructionPage" isActive={isActive} onStart={handleInstructionNext} />;
      case 'formPage':
        return <FormPage key="formPage" isActive={isActive} onSubmit={handleFormSubmit} />;
      case 'challengeIntroPage':
        return (
          <ChallengeIntroPage
            key="challengeIntroPage"
            isActive={isActive}
            currentLevel={currentLevel}
            happinessScore={happinessScore}
            initialSeekTime={challengeIntroStartTime}
            navigationMode={videoNavigationMode}
            shouldStartUnmuted={shouldUnmuteChallengeIntro}
            onStart={handleIntroComplete}
            onPrevious={handleChallengeIntroPrevious}
            onRestartGame={handleRestartGame}
          />
        );
      case 'challengePage':
        return (
          <ChallengePage
            key={`challengePage-${currentLevel}`}
            isActive={isActive}
            currentLevel={currentLevel}
            happinessScore={happinessScore}
            setHappinessScore={setHappinessScore}
            onWrongAnswer={handleWrongAnswer}
            onCorrectAnswer={handleCorrectAnswer}
            onLevelComplete={handleLevelComplete}
            onGameComplete={handleGameComplete}
            onSkipVideo={handleSkipVideo}
            onPreviousQuestion={handlePreviousQuestion}
            onNextQuestion={handleLevelComplete}
            onRestartGame={handleRestartGame}
            bubbleTrail={bubbleTrail}
            setBubbleTrail={setBubbleTrail}
          />
        );
      case 'transitionVideo':
        return (
          <TransitionVideoPage
            key={`transitionVideo-${transitionVideoSrc}`}
            isActive={isActive}
            videoSrc={transitionVideoSrc}
            initialSeekTime={transitionVideoStartTime}
            shouldStartUnmuted={shouldUnmuteTransitionVideo}
            onComplete={handleTransitionVideoComplete}
            onSkipVideo={handleSkipVideo}
            onPreviousQuestion={handlePreviousVideo}
            onNextQuestion={handleNextVideo}
            bubbleTrail={bubbleTrail}
            happinessScore={happinessScore}
            showControls
            onRestartGame={handleRestartGame}
          />
        );
      case 'finalTransitionVideo':
        return (
          <TransitionVideoPage
            key="finalTransitionVideo"
            isActive={isActive}
            videoSrc={transitionVideoSrc}
            initialSeekTime={transitionVideoStartTime}
            shouldStartUnmuted={shouldUnmuteTransitionVideo}
            onComplete={handleFinalTransitionVideoComplete}
            onSkipVideo={handleSkipVideo}
            onPreviousQuestion={handlePreviousVideo}
            onNextQuestion={handleNextVideo}
            bubbleTrail={bubbleTrail}
            happinessScore={happinessScore}
            showControls
            onRestartGame={handleRestartGame}
          />
        );
      case 'finalAnimationPage':
        return <FinalAnimationPage key="finalAnimationPage" isActive={isActive} onComplete={handleFinalAnimationComplete} />;
      case 'postAnimationTransitionVideo':
        return (
          <TransitionVideoPage
            key="postAnimationTransitionVideo"
            isActive={isActive}
            videoSrc={transitionVideoSrc}
            initialSeekTime={transitionVideoStartTime}
            shouldStartUnmuted={shouldUnmuteTransitionVideo}
            onComplete={handlePostAnimationVideoComplete}
            onPreviousQuestion={handlePreviousVideo}
            onNextQuestion={handleNextVideo}
            showArrows={false}
          />
        );
      case 'endPage':
        return <EndPage key="endPage" isActive={isActive} onProceed={() => { window.location.href = 'https://wa.me/919887091390'; }} />;
      default:
        return null;
    }
  };

  // Update prevPage when page changes
  useEffect(() => {
    if (page !== prevPage) {
      setPrevPage(page);
    }
  }, [page, prevPage]);

  return (
    <>
      {/* Render both previous and current page for seamless transition */}
      {prevPage && prevPage !== page && renderPage(prevPage, false)}
      {renderPage(page, true)}
      {/* Pass isOnVideoPage to App component */}
      <div style={{ display: 'none' }} data-is-on-video-page={isOnVideoPage} />
    </>
  );
}

function App() {
  const audioRef = useRef(null);
  const { shouldMuteAll, isGamePaused, hasUserInteracted, setOnFirstInteractionCallback } = useGameState();
  const { isIOSLikeDevice } = useLanguage();
  const [isOnVideoPage, setIsOnVideoPage] = useState(false);

  // Watch for page changes via the hidden div
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const videoPageIndicator = document.querySelector('[data-is-on-video-page]');
      if (videoPageIndicator) {
        const isVideoPage = videoPageIndicator.getAttribute('data-is-on-video-page') === 'true';
        setIsOnVideoPage(isVideoPage);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => observer.disconnect();
  }, []);

  // All videos now have merged background music, so we mute BGM during video pages on all platforms
  // Background music plays unmuted during non-video pages (gaps between videos)
  const shouldMuteBGM = shouldMuteAll || isOnVideoPage;

  // Register callback to start background music on first interaction
  useEffect(() => {
    const callback = () => {
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => {
          // Silently handle autoplay restrictions
        });
      }
    };
    
    setOnFirstInteractionCallback(callback);
  }, [setOnFirstInteractionCallback]);

  // Initialize audio element properties
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) {
      return;
    }

    audioElement.volume = 0.1;
    audioElement.preload = 'auto';
    audioElement.loop = true;
    audioElement.load();
    
    // Monitor for forced pauses (iOS behavior) and resume automatically
    const handleForcedPause = () => {
      if (!audioRef.current || !hasUserInteracted) return;
      
      // Resume after a short delay to let the video settle
      setTimeout(() => {
        if (!audioRef.current || !hasUserInteracted) return;
        
        // Apply correct mute state based on current page
        const currentShouldMute = shouldMuteAll || isOnVideoPage;
        audioRef.current.muted = currentShouldMute;
        
        audioRef.current.play().catch(() => {
          // Silently handle playback errors
        });
      }, 100);
    };
    
    audioElement.addEventListener('pause', handleForcedPause);
    
    // Expose global function to start background music
    window.startBackgroundMusic = () => {
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => {
          // Silently handle autoplay restrictions
        });
      }
    };
    
    return () => {
      audioElement.removeEventListener('pause', handleForcedPause);
      delete window.startBackgroundMusic;
    };
  }, [isIOSLikeDevice, hasUserInteracted, shouldMuteAll, isOnVideoPage]);

  // Control audio playback based on game state
  useEffect(() => {
    if (!audioRef.current) return;

    // Mute during video pages (videos have merged BGM) but keep playing to fill gaps
    // Unmute during non-video pages (challenge page, forms, etc.)
    audioRef.current.muted = shouldMuteBGM;

    // Only pause if user hasn't interacted yet
    if (!hasUserInteracted) {
      audioRef.current.pause();
      return;
    }

    // Keep background music playing (but muted during videos)
    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => {
        // Silently handle autoplay restrictions - will retry on next user interaction
      });
    }
  }, [shouldMuteBGM, hasUserInteracted, isOnVideoPage]);

  return (
    <>
      <AppContent />
      <audio ref={audioRef} src={APP_AUDIO.music} loop preload="auto" />
    </>
  );
}

function AppWithProviders() {
  return (
    <LanguageProvider>
      <App />
    </LanguageProvider>
  );
}

export default AppWithProviders;
