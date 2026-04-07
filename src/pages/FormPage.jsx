import React, { useState, useEffect } from 'react';
import { useLanguage, useGameState } from '../context/LanguageContext';
import './FormPage.css';
import { APP_IMAGES, APP_VIDEOS } from '../config/media';
import { useManagedVideoPlayback } from '../hooks/useManagedVideoPlayback';
import { useRef } from 'react';
import videoPool from '../utils/videoPool';
import assetPreloader from '../utils/assetPreloader';

const FormPage = ({ isActive = true, onSubmit }) => {
  const { t } = useLanguage();
  const { isPageVisible } = useGameState();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('');
  const [isPreloading, setIsPreloading] = useState(true);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const videoRef = useRef(null);

  useManagedVideoPlayback({
    videoRef,
    isPageVisible,
    shouldPlay: true,
    shouldMute: true,
  });

  // Monitor preloading progress
  useEffect(() => {
    if (!isActive) return;

    let mounted = true;
    let progressInterval;

    const checkProgress = () => {
      if (!mounted) return;

      // Simulate progress based on time (smooth UX)
      // Real loading happens in background
      setPreloadProgress(prev => {
        if (prev >= 100) {
          setIsPreloading(false);
          if (progressInterval) clearInterval(progressInterval);
          return 100;
        }
        // Increment by 5% every 100ms (reaches 100% in ~2 seconds)
        return Math.min(prev + 5, 100);
      });
    };

    // Start progress animation
    progressInterval = setInterval(checkProgress, 100);

    // Force complete after 3 seconds max
    const timeout = setTimeout(() => {
      if (mounted) {
        setPreloadProgress(100);
        setIsPreloading(false);
      }
    }, 3000);

    return () => {
      mounted = false;
      if (progressInterval) clearInterval(progressInterval);
      clearTimeout(timeout);
    };
  }, [isActive]);

  const handleSubmit = () => {
    const isValidName = name.trim().length >= 3;
    const phoneRegex = /^[0-9]{10}$/;
    if (!name.trim() || !isValidName) { alert(t.nameError || 'Please enter a valid name.'); return; }
    if (!phone.trim() || !phoneRegex.test(phone.trim())) { alert(t.phoneError || 'Please enter a valid 10 digit number.'); return; }
    if (!district.trim()) { alert('Please enter your district.'); return; }
    if (!stateName.trim()) { alert('Please enter your state.'); return; }
    onSubmit({ name: name.trim(), phone: phone.trim(), district: district.trim(), state: stateName.trim() });
  };

  return (
    <div className={`page form-page-container ${isActive ? 'active' : ''}`}>
      <video
        ref={videoRef}
        className="fluid-bg"
        src={APP_VIDEOS.languageBg}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      />

      <div className="form-content-wrapper">
        <img src={APP_IMAGES.formFarmer} alt="farmer" className="farmer-img-form" loading="lazy" decoding="async" />

        <div className="form-frame-wrapper">
          <img src={APP_IMAGES.frame} alt="" className="form-frame-bg" loading="lazy" decoding="async" />

          <div className="form-board-content">
            <h2 className="form-title">{t.formPageTitle}</h2>

            <div className="form-fields-container">
              <div className="form-input-group">
                <label className="form-label">{t.namePlaceholder}</label>
                <div className="input-bg-container">
                  <img src={APP_IMAGES.inputPanel} alt="" className="input-bg" loading="lazy" decoding="async" />
                  <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              </div>

              <div className="form-input-group">
                <label className="form-label">{t.phonePlaceholder}</label>
                <div className="input-bg-container">
                  <img src={APP_IMAGES.inputPanel} alt="" className="input-bg" loading="lazy" decoding="async" />
                  <input type="tel" maxLength={10} className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>

              <div className="form-input-group">
                <label className="form-label">{t.districtLabel}</label>
                <div className="input-bg-container">
                  <img src={APP_IMAGES.inputPanel} alt="" className="input-bg" loading="lazy" decoding="async" />
                  <input type="text" className="form-input" value={district} onChange={(e) => setDistrict(e.target.value)} />
                </div>
              </div>

              <div className="form-input-group">
                <label className="form-label">{t.stateLabel}</label>
                <div className="input-bg-container">
                  <img src={APP_IMAGES.inputPanel} alt="" className="input-bg" loading="lazy" decoding="async" />
                  <input type="text" className="form-input" value={stateName} onChange={(e) => setStateName(e.target.value)} />
                </div>
              </div>
            </div>

            <button 
              className="submit-action-btn" 
              onClick={handleSubmit}
              disabled={isPreloading}
              style={{ opacity: isPreloading ? 0.6 : 1 }}
            >
              <img src={APP_IMAGES.buttonPrimary} alt="" className="btn-bg" loading="lazy" decoding="async" />
              <span className="btn-text">
                {isPreloading ? `Loading... ${preloadProgress}%` : t.submitBtn}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormPage;
