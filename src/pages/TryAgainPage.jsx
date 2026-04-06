import React, { useRef, useEffect } from 'react';
import { useLanguage, useGameState } from '../context/LanguageContext';
import { APP_IMAGES } from '../config/media';
import './TryAgainPage.css';

const TryAgainPage = ({ onRetry }) => {
  const { t } = useLanguage();
  const { shouldMuteAll } = useGameState();
  
  // Play buzz sound when page mounts
  const buzzAudioRef = useRef(typeof Audio !== 'undefined' ? new Audio("https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg") : null);

  useEffect(() => {
    if (buzzAudioRef.current) {
        buzzAudioRef.current.muted = shouldMuteAll;
    }

    if (buzzAudioRef.current && !shouldMuteAll) {
        buzzAudioRef.current.currentTime = 0;
        buzzAudioRef.current.play().catch(e => console.error(e));
    }

    return () => {
      if (buzzAudioRef.current) {
        buzzAudioRef.current.pause();
      }
    };
  }, [shouldMuteAll]);

  return (
    <div className="page active try-again-container">
      <img src={APP_IMAGES.bgFallbackCropped} alt="background" className="fluid-bg" />
      <div className="try-content-wrapper">
        <div className="try-frame-container">
          <div className="try-frame-content">
            <h1 className="wrong-text">
                {t.wrongAnswerTitle}
            </h1>
            <button className="try-btn" onClick={onRetry}>{t.tryAgainBtn}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TryAgainPage;
