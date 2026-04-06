import React, { useEffect, useState } from 'react';
import './FinalAnimationPage.css';
import './ChallengePage.css';
import { APP_IMAGES } from '../config/media';

const FinalAnimationPage = ({ isActive = true, onComplete }) => {
  const backgroundSrc = 'https://res.cloudinary.com/doaw2nfrp/image/upload/v1775460333/Frame_10_end_efufdl.png';

  const handleProceed = () => {
    onComplete();
  };

  return (
    <div className={`page final-animation-container ${isActive ? 'active' : ''}`}>
      <img
        src={backgroundSrc}
        alt="background"
        className="fluid-bg"
        loading="lazy"
        decoding="async"
      />


      <div className="logo-container">
        <div className="rotating-glow-final">
          <img
            src={APP_IMAGES.glow}
            alt="Glow effect"
            className="rotating-glow-final-image"
            loading="lazy"
            decoding="async"
          />
        </div>
        <button type="button" className="jumbo-super-logo-button" onClick={handleProceed}>
          <img
            src={APP_IMAGES.logo}
            alt="Jumbo Super Logo"
            className="jumbo-super-logo"
            loading="lazy"
            decoding="async"
          />
        </button>
      </div>
    </div>
  );
};

export default FinalAnimationPage;
