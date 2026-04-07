/**
 * VideoPool - Instagram/TikTok/YouTube Shorts style video management
 * 
 * HOW IT WORKS:
 * 1. Pre-creates 3 persistent video elements at app init
 * 2. Loads videos into hidden elements BEFORE they're needed
 * 3. Swaps visibility (not src) for instant transitions
 * 4. Maintains previous/current/next videos in memory
 * 5. Zero black screens - always has a frame ready to show
 */

class VideoPool {
  constructor() {
    this.pool = [];
    this.container = null;
    this.activeSlot = null;
    this.initialized = false;
  }

  /**
   * Initialize the pool - call this ONCE at app start
   * Creates 3 video elements that will be reused throughout the app
   */
  init() {
    if (this.initialized) {
      return;
    }


    // Create hidden container
    this.container = document.createElement('div');
    this.container.id = 'video-pool-container';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);

    // Create 3 video slots (previous, current, next)
    for (let i = 0; i < 3; i++) {
      const slot = this.createSlot(i);
      this.pool.push(slot);
      this.container.appendChild(slot.element);
    }

    this.initialized = true;
  }

  createSlot(index) {
    const video = document.createElement('video');
    
    // CRITICAL: Set all attributes for iOS/Android compatibility
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.preload = 'auto';
    video.disablePictureInPicture = true;
    video.controls = false;
    
    // Start hidden with smooth transition capability
    video.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transition: opacity 0.2s ease-in-out;
      z-index: -1;
    `;

    return {
      element: video,
      src: null,
      status: 'idle', // idle, loading, ready, active
      index,
      listeners: new Map(),
    };
  }

  /**
   * Get a slot by src (if already loaded)
   */
  getSlotBySrc(src) {
    return this.pool.find(slot => slot.src === src);
  }

  /**
   * Get the best available slot for loading a new video
   */
  getBestSlot() {
    // NEVER use the active slot
    const protectedSlots = new Set();
    
    if (this.activeSlot) {
      protectedSlots.add(this.activeSlot);
    }
    
    // Also protect slots that are currently loading (not idle)
    this.pool.forEach(slot => {
      if (slot.status === 'loading' && slot.src) {
        protectedSlots.add(slot);
      }
    });

    // Find an idle slot (not protected)
    let slot = this.pool.find(s => !protectedSlots.has(s) && s.status === 'idle');
    if (slot) {
      return slot;
    }

    // Find a ready slot (not protected, not active)
    slot = this.pool.find(s => !protectedSlots.has(s) && s.status === 'ready');
    if (slot) {
      return slot;
    }

    // Last resort: use the oldest non-protected slot
    slot = this.pool.find(s => !protectedSlots.has(s));
    if (slot) {
      return slot;
    }
    
    // Absolute last resort: use slot 0 (should never happen with 3 slots)
    console.warn(`⚠️ All slots protected! Using slot 0 anyway`);
    return this.pool[0];
  }

  /**
   * Preload a video into a slot without showing it
   * This is what makes Instagram/TikTok instant - videos are loaded BEFORE needed
   */
  preload(src, priority = 'normal') {
    if (!this.initialized) this.init();
    if (!src) return Promise.resolve(false);

    const videoName = src.substring(src.lastIndexOf('/') + 1, src.lastIndexOf('.'));

    // Already loaded or loading?
    const existing = this.getSlotBySrc(src);
    if (existing) {
      if (existing.element.readyState >= 3) {
        return Promise.resolve(true);
      }
      // Still loading, return existing promise
      return new Promise((resolve) => {
        existing.element.addEventListener('canplaythrough', () => {
          resolve(true);
        }, { once: true });
      });
    }

    // Get a slot and start loading
    const slot = this.getBestSlot();
    
    
    // Clean up previous assignment
    this.cleanupSlot(slot);
    
    slot.src = src;
    slot.status = 'loading';
    slot.element.style.opacity = '0';
    slot.element.style.zIndex = '0';

    return new Promise((resolve) => {
      const onReady = () => {
        if (slot.src === src) {
          slot.status = 'ready';
        }
        resolve(true);
      };

      const onError = () => {
        console.error(`❌ Video load error: ${videoName} (slot ${slot.index})`);
        slot.status = 'idle';
        slot.src = null;
        resolve(false);
      };

      slot.element.addEventListener('canplaythrough', onReady, { once: true });
      slot.element.addEventListener('error', onError, { once: true });
      
      slot.element.src = src;
      slot.element.load();
    });
  }

  /**
   * Activate a video for visible playback.
   * Returns a controller with robust pause/resume that cancels ALL pending
   * async play operations (seeked, canplay, setTimeout retries) when paused.
   */
  activate(src, options = {}) {
    if (!this.initialized) this.init();

    const {
      muted = true,
      startTime = 0,
      onEnded = null,
      onReady = null,
      fadeIn = true,
    } = options;

    const videoName = src.substring(src.lastIndexOf('/') + 1, src.lastIndexOf('.'));

    // ─── Controller-scoped pause state ────────────────────────────────────────
    // Every async callback (seeked, canplay, setTimeout) reads this flag
    // before calling play(). Setting it to true makes all pending operations
    // no-ops, regardless of when they fire.
    let controllerPaused = false;

    // Track pending cleanup so we can cancel them on pause or unmount.
    let pendingRetryTimeout = null;
    let pendingSeekHandler = null;
    let pendingCanplayHandler = null;

    /**
     * Cancel all in-flight async play operations.
     * Safe to call multiple times.
     */
    const cancelPendingPlay = () => {
      if (pendingRetryTimeout !== null) {
        clearTimeout(pendingRetryTimeout);
        pendingRetryTimeout = null;
      }
      if (pendingSeekHandler !== null) {
        slot.element.removeEventListener('seeked', pendingSeekHandler);
        pendingSeekHandler = null;
      }
      if (pendingCanplayHandler !== null) {
        slot.element.removeEventListener('canplay', pendingCanplayHandler);
        pendingCanplayHandler = null;
      }
    };

    // ──────────────────────────────────────────────────────────────────────────

    // Find the slot with this video
    let slot = this.getSlotBySrc(src);

    if (!slot) {
      console.warn(`⚠️ Video not preloaded: ${videoName} - loading now (may cause delay)`);
      slot = this.getBestSlot();
      this.cleanupSlot(slot);
      slot.src = src;
      slot.status = 'loading';
      slot.element.src = src;
      slot.element.load();
    } else {
    }

    // Hide previous active slot
    if (this.activeSlot && this.activeSlot !== slot) {
      const prevVideoName = this.activeSlot.src
        ? this.activeSlot.src.substring(this.activeSlot.src.lastIndexOf('/') + 1, this.activeSlot.src.lastIndexOf('.'))
        : 'unknown';
      this.activeSlot.element.style.opacity = '0';
      this.activeSlot.element.style.zIndex = '-1';
      this.activeSlot.element.pause();
      if (this.activeSlot.status === 'active') {
        this.activeSlot.status = 'ready';
      }
    }

    // Activate this slot
    this.activeSlot = slot;
    slot.status = 'active';
    slot.element.muted = muted;

    if (muted) {
      slot.element.setAttribute('muted', '');
    } else {
      slot.element.removeAttribute('muted');
    }

    // Set up ended callback
    if (onEnded) {
      const existingHandlers = slot.element._endedHandlers || [];
      existingHandlers.forEach(handler => {
        slot.element.removeEventListener('ended', handler);
      });

      const endedHandler = () => {
        onEnded();
        slot.element.removeEventListener('ended', endedHandler);
        const idx = (slot.element._endedHandlers || []).indexOf(endedHandler);
        if (idx > -1) slot.element._endedHandlers.splice(idx, 1);
      };

      if (!slot.element._endedHandlers) slot.element._endedHandlers = [];
      slot.element._endedHandlers.push(endedHandler);
      slot.element.addEventListener('ended', endedHandler, { once: true });
    }

    // ─── attemptPlay ──────────────────────────────────────────────────────────
    // Central play function. Always checks controllerPaused before doing
    // anything. All async paths funnel through here.
    const attemptPlay = () => {
      
      // THE KEY GUARD: if paused at any point, abort.
      if (controllerPaused) {
        return;
      }

      slot.element.style.zIndex = '1000';

      if (fadeIn) {
        requestAnimationFrame(() => {
          // Double-check: user may have paused between rAF scheduling and fire
          if (!controllerPaused) {
            slot.element.style.opacity = '1';
          } else {
          }
        });
      } else {
        slot.element.style.opacity = '1';
      }

      const playPromise = slot.element.play();
      if (playPromise) {
        playPromise
          .then(() => {
            if (onReady) onReady();
          })
          .catch((err) => {
            console.error(`❌ Play error for ${videoName}:`, err.name);
            if (err.name === 'AbortError' && !controllerPaused) {
              // Store the timeout ID so pause() can cancel it
              pendingRetryTimeout = setTimeout(() => {
                pendingRetryTimeout = null;
                if (slot.status === 'active' && !controllerPaused) {
                  slot.element.play().catch(() => {});
                }
              }, 200);
            }
          });
      }
    };

    // ──────────────────────────────────────────────────────────────────────────

    // ─── seekAndPlay ──────────────────────────────────────────────────────────
    const seekAndPlay = (targetTime) => {
      // Check if already at target position
      // This handles both forward navigation (already at 0) and backward navigation (already seeked)
      const distanceFromCurrent = Math.abs(slot.element.currentTime - targetTime);
      
      if (distanceFromCurrent < 0.05) {
        // Already at the right position - no seek needed
        if (slot.element.readyState >= 3) {
          attemptPlay();
        } else {
          // Store handler so pause() can remove it
          pendingCanplayHandler = () => {
            pendingCanplayHandler = null;
            attemptPlay(); // guarded inside
          };
          slot.element.addEventListener('canplay', pendingCanplayHandler, { once: true });
        }
        return;
      }

      // Need to seek to target position
      // This handles: revisiting videos, backward navigation to specific timestamps
      
      // Store handler so pause() can remove it before it fires
      pendingSeekHandler = () => {
        pendingSeekHandler = null;
        attemptPlay(); // guarded inside
      };

      slot.element.addEventListener('seeked', pendingSeekHandler, { once: true });
      slot.element.currentTime = targetTime;
    };

    // ──────────────────────────────────────────────────────────────────────────

    seekAndPlay(startTime);

    // ─── Returned controller ──────────────────────────────────────────────────
    return {
      element: slot.element,
      pause: () => {
        controllerPaused = true;
        // Cancel everything that could call attemptPlay later
        cancelPendingPlay();
        slot.element.pause();
      },
      play: () => {
        if (!controllerPaused) {
          // Already playing (or trying to) — no-op to avoid double play
          return;
        }
        controllerPaused = false;
        // Resume from wherever the video currently is
        // Make sure video is visible before playing
        slot.element.style.zIndex = '1000';
        slot.element.style.opacity = '1';
        slot.element.play().catch(err => {
          console.error(`❌ Resume play error for ${videoName}:`, err.name);
        });
      },
      seek: (time) => {
        // Cancel any in-flight seek/play sequence before starting a new one
        cancelPendingPlay();
        slot.element.currentTime = time;
      },
      setMuted: (val) => {
        slot.element.muted = val;
        if (val) {
          slot.element.setAttribute('muted', '');
        } else {
          slot.element.removeAttribute('muted');
        }
      },
      hide: () => {
        // Full teardown: cancel pending ops, pause, hide
        controllerPaused = true;
        cancelPendingPlay();
        slot.element.style.opacity = '0';
        slot.element.style.zIndex = '-1';
        slot.element.pause();
      },
    };
    // ──────────────────────────────────────────────────────────────────────────
  }

  /**
   * Preload a sequence of videos (previous, current, next)
   * This is the Instagram/TikTok strategy
   */
  preloadSequence(allVideos, currentIndex) {
    const promises = [];

    // Current (highest priority)
    if (allVideos[currentIndex]) {
      promises.push(this.preload(allVideos[currentIndex], 'high'));
    }

    // Next (high priority)
    if (allVideos[currentIndex + 1]) {
      promises.push(this.preload(allVideos[currentIndex + 1], 'high'));
    }

    // Previous (medium priority)
    if (currentIndex > 0 && allVideos[currentIndex - 1]) {
      promises.push(this.preload(allVideos[currentIndex - 1], 'medium'));
    }

    return Promise.all(promises);
  }

  /**
   * Clean up a slot for reuse
   */
  cleanupSlot(slot) {
    slot.element.pause();
    slot.element.currentTime = 0; // Reset to start so reused videos begin fresh
    slot.element.removeAttribute('src');
    slot.element.load();
    slot.src = null;
    slot.status = 'idle';
    slot.element.style.opacity = '0';
    slot.element.style.zIndex = '-1';
  }

  /**
   * Get current pool status (for debugging)
   */
  getStatus() {
    return this.pool.map(slot => ({
      index: slot.index,
      status: slot.status,
      src: slot.src ? slot.src.substring(slot.src.lastIndexOf('/') + 1) : null,
      readyState: slot.element.readyState,
      currentTime: slot.element.currentTime.toFixed(2),
    }));
  }

  /**
   * Pause all videos
   */
  pauseAll() {
    this.pool.forEach(slot => slot.element.pause());
  }

  /**
   * Resume active video
   */
  resumeActive() {
    if (this.activeSlot) {
      this.activeSlot.element.play().catch(() => {});
    }
  }
}

// Singleton instance
const videoPool = new VideoPool();

export default videoPool;
