import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Play, Pause, Volume2, Volume1, VolumeX, Maximize, Minimize, Lock,
  CheckCircle, ExternalLink, RotateCcw, 
  Clock, ShieldAlert, Check
} from 'lucide-react';
import { 
  extractYouTubeId, 
  buildYouTubeWatchUrl, 
  formatVideoTime 
} from '../../utils/youtube';
import { Button } from '../Button/Button';
import './YouTubePlayer.css';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  videoUrl: string;
  contentId?: string;
  title?: string;
  isCompleted?: boolean;
  onComplete?: () => void;
  onEnded?: () => void;
  onProgress?: (percent: number, currentTime: number, duration: number) => void;
  readOnly?: boolean; // For preview simulators where completion shouldn't trigger
  autoResume?: boolean;
  completionThreshold?: number; // e.g. 0.90 (90%)
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoUrl,
  contentId = 'default_yt',
  title = 'Video Lecture',
  isCompleted = false,
  onComplete,
  onEnded,
  onProgress,
  readOnly = false,
  autoResume = true,
  completionThreshold = 0.90
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeMountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const pollIntervalRef = useRef<any>(null);
  const completedTriggeredRef = useRef(isCompleted);
  const maxWatchedTimeRef = useRef<number>(0);

  // Store volatile callbacks in refs to prevent player re-initialization on parent re-renders
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const isCompletedRef = useRef(isCompleted);
  isCompletedRef.current = isCompleted;
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;
  const thresholdRef = useRef(completionThreshold);
  thresholdRef.current = completionThreshold;

  const [hasEmbedError, setHasEmbedError] = useState(false);
  const [resumeMessage, setResumeMessage] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [bufferedProgress, setBufferedProgress] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);
  const [localCompleted, setLocalCompleted] = useState(isCompleted);
  const [isPlaying, setIsPlaying] = useState(false);
  const [, setIsBuffering] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [volume, setVolume] = useState<number>(100);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const videoId = extractYouTubeId(videoUrl);

  // Sync external completed state
  useEffect(() => {
    setLocalCompleted(isCompleted);
    completedTriggeredRef.current = isCompleted;
  }, [isCompleted]);

  // Clean up polling interval
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const handleVideoCompleted = useCallback(() => {
    if (completedTriggeredRef.current) return;
    completedTriggeredRef.current = true;
    setLocalCompleted(true);
    if (!readOnlyRef.current && onCompleteRef.current) {
      onCompleteRef.current();
    }
  }, []);

  // Controls Handlers
  const togglePlayPause = useCallback(() => {
    if (!playerRef.current) return;
    try {
      if (typeof playerRef.current.getPlayerState !== 'function') return;
      const state = playerRef.current.getPlayerState();
      if (state === 1) { // 1 = playing
        if (typeof playerRef.current.pauseVideo === 'function') {
          playerRef.current.pauseVideo();
        }
        setIsPlaying(false);
      } else {
        if (typeof playerRef.current.playVideo === 'function') {
          playerRef.current.playVideo();
        }
        setIsPlaying(true);
      }
    } catch (err) {
      console.warn('Failed to toggle play/pause:', err);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!playerRef.current) return;
    try {
      if (isMuted) {
        if (typeof playerRef.current.unMute === 'function') playerRef.current.unMute();
        setIsMuted(false);
        if (volume === 0 && typeof playerRef.current.setVolume === 'function') {
          playerRef.current.setVolume(50);
          setVolume(50);
        }
      } else {
        if (typeof playerRef.current.mute === 'function') playerRef.current.mute();
        setIsMuted(true);
      }
    } catch (err) {
      console.warn('Failed to toggle mute:', err);
    }
  }, [isMuted, volume]);

  const handleVolumeChange = useCallback((newVol: number) => {
    if (!playerRef.current) return;
    try {
      if (typeof playerRef.current.setVolume === 'function') playerRef.current.setVolume(newVol);
      setVolume(newVol);
      if (newVol > 0 && isMuted) {
        if (typeof playerRef.current.unMute === 'function') playerRef.current.unMute();
        setIsMuted(false);
      } else if (newVol === 0 && !isMuted) {
        if (typeof playerRef.current.mute === 'function') playerRef.current.mute();
        setIsMuted(true);
      }
    } catch (err) {
      console.warn('Failed to change volume:', err);
    }
  }, [isMuted]);

  const handleToggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Failed to toggle fullscreen:', err);
    }
  }, []);

  // Fullscreen state listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard shortcut protection: Disable seeking shortcuts (Arrow keys, J/L seeking, Number keys 0-9)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName?.toLowerCase();
        if (
          tag === 'input' || 
          tag === 'textarea' || 
          tag === 'select' || 
          target.isContentEditable ||
          target.getAttribute('role') === 'textbox'
        ) {
          return;
        }
      }

      const key = e.key;
      const code = e.code || '';

      const isSeekKey = 
        key === 'ArrowLeft' || 
        key === 'ArrowRight' || 
        key === 'j' || key === 'J' || 
        key === 'l' || key === 'L' ||
        key === 'Home' || key === 'End' ||
        key === '<' || key === '>' ||
        key === ',' || key === '.';

      const isNumberKey = /^[0-9]$/.test(key) || code.startsWith('Digit') || code.startsWith('Numpad');

      if (isSeekKey || isNumberKey) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  // Pause video immediately when tab loses focus or window blurs
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && playerRef.current) {
        try {
          if (typeof playerRef.current.getPlayerState === 'function') {
            const state = playerRef.current.getPlayerState();
            if (state === 1) { // 1 = PLAYING
              playerRef.current.pauseVideo();
              setIsPlaying(false);
            }
          }
        } catch {}
      }
    };

    const handleWindowBlur = () => {
      if (playerRef.current) {
        try {
          if (typeof playerRef.current.getPlayerState === 'function') {
            const state = playerRef.current.getPlayerState();
            if (state === 1) {
              playerRef.current.pauseVideo();
              setIsPlaying(false);
            }
          }
        } catch {}
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  // Player initialization - runs once per videoId
  useEffect(() => {
    if (!videoId) return;

    completedTriggeredRef.current = isCompleted;

    // Load YouTube IFrame API script once if not already present
    const loadAPI = () => {
      if (!window.YT || !window.YT.Player) {
        const existingScript = document.getElementById('youtube-iframe-api-script');
        if (!existingScript) {
          const tag = document.createElement('script');
          tag.id = 'youtube-iframe-api-script';
          tag.src = 'https://www.youtube.com/iframe_api';
          const firstScriptTag = document.getElementsByTagName('script')[0];
          firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
        }
      }
    };

    loadAPI();

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;

      const mountParent = iframeMountRef.current;
      if (!mountParent) return;

      // Clean existing instance
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }

      // Re-create a fresh target div inside the stable mountParent
      mountParent.innerHTML = '';
      const targetDiv = document.createElement('div');
      targetDiv.id = `yt-mount-${Math.random().toString(36).substring(2, 9)}`;
      targetDiv.style.width = '100%';
      targetDiv.style.height = '100%';
      mountParent.appendChild(targetDiv);

      // Check saved resume time
      const storageKey = `yt_resume_${contentId}`;
      let initialStartTime = 0;
      if (autoResume) {
        try {
          const savedTime = localStorage.getItem(storageKey);
          if (savedTime) {
            const parsed = parseFloat(savedTime);
            if (!isNaN(parsed) && parsed > 5) {
              initialStartTime = Math.floor(parsed);
              maxWatchedTimeRef.current = initialStartTime;
            }
          }
        } catch {}
      }

      try {
        playerRef.current = new window.YT.Player(targetDiv.id, {
          videoId,
          host: 'https://www.youtube-nocookie.com',
          playerVars: {
            controls: 1,        // Native YouTube player controls allow seamless play/pause without browser autoplay block
            disablekb: 1,       // Disable keyboard seeking
            fs: 1,              // Enable native fullscreen
            modestbranding: 1,  // Minimize branding
            rel: 0,             // Restrict related videos
            iv_load_policy: 3,  // Disable video annotations
            playsinline: 1,     // Play inline on mobile
            enablejsapi: 1,     // Enable JS API for anti-seek snap-back and tracking
            start: initialStartTime > 0 ? initialStartTime : undefined
          },
          events: {
            onReady: (event: any) => {
              try {
                setIsReady(true);
                const duration = event.target.getDuration();
                if (duration > 0) setVideoDuration(duration);

                // Enforce 1x playback rate
                if (typeof event.target.setPlaybackRate === 'function') {
                  event.target.setPlaybackRate(1);
                }

                // Sync volume / mute state
                if (typeof event.target.getVolume === 'function') {
                  setVolume(event.target.getVolume());
                }
                if (typeof event.target.isMuted === 'function') {
                  setIsMuted(event.target.isMuted());
                }

                if (initialStartTime > 0) {
                  maxWatchedTimeRef.current = initialStartTime;
                  setResumeMessage(`Resumed from ${formatVideoTime(initialStartTime)}`);
                  setTimeout(() => setResumeMessage(null), 3500);
                }
              } catch {}
            },
            onPlaybackRateChange: (event: any) => {
              // Immediately revert if playback rate changed away from 1x
              try {
                if (event.data !== 1 && typeof event.target.setPlaybackRate === 'function') {
                  event.target.setPlaybackRate(1);
                }
              } catch (e) {
                console.warn('Could not reset playback rate:', e);
              }
            },
            onStateChange: (event: any) => {
              const state = event.data;

              // PLAYING = 1
              if (state === 1) {
                setIsPlaying(true);
                setIsBuffering(false);
                stopPolling();

                pollIntervalRef.current = setInterval(() => {
                  try {
                    if (!playerRef.current) return;

                    // Enforce 1x speed lock
                    if (typeof playerRef.current.getPlaybackRate === 'function') {
                      if (playerRef.current.getPlaybackRate() !== 1) {
                        playerRef.current.setPlaybackRate(1);
                      }
                    }

                    if (typeof playerRef.current.getCurrentTime !== 'function') return;
                    const cur = playerRef.current.getCurrentTime() || 0;
                    const dur = playerRef.current.getDuration() || 0;

                    // STRICT OPTION A ANTI-SEEK GUARD:
                    // If user attempts to drag or skip forward past what they've already watched:
                    // Immediately snap them back to maxWatchedTime!
                    if (!completedTriggeredRef.current && cur > maxWatchedTimeRef.current + 2.5) {
                      playerRef.current.seekTo(maxWatchedTimeRef.current, true);
                      setVideoCurrentTime(maxWatchedTimeRef.current);
                      return;
                    } else if (cur > maxWatchedTimeRef.current) {
                      maxWatchedTimeRef.current = cur;
                    }

                    setVideoCurrentTime(cur);

                    if (dur > 0) {
                      setVideoDuration(dur);
                      const pct = Math.min(100, Math.round((cur / dur) * 100));
                      setCurrentProgress(pct);

                      if (onProgressRef.current) {
                        onProgressRef.current(pct, cur, dur);
                      }

                      // Update buffered progress
                      if (typeof playerRef.current.getVideoLoadedFraction === 'function') {
                        const fraction = playerRef.current.getVideoLoadedFraction() || 0;
                        setBufferedProgress(Math.min(100, Math.round(fraction * 100)));
                      }

                      // Save resume position
                      if (!readOnlyRef.current && cur > 3) {
                        try {
                          localStorage.setItem(storageKey, cur.toString());
                        } catch {}
                      }

                      // Mark completed at required threshold (default 90%)
                      if (cur >= dur * thresholdRef.current && !completedTriggeredRef.current) {
                        handleVideoCompleted();
                      }
                    }
                  } catch {}
                }, 400);
              } else if (state === 2) {
                // PAUSED = 2
                setIsPlaying(false);
                setIsBuffering(false);
                stopPolling();
              } else if (state === 3) {
                // BUFFERING = 3
                setIsBuffering(true);
              } else if (state === 0) {
                // ENDED = 0 (Video reached end)
                setIsPlaying(false);
                setIsBuffering(false);
                stopPolling();
                setCurrentProgress(100);
                handleVideoCompleted();
                if (onEndedRef.current) {
                  onEndedRef.current();
                }
              }
            },
            onError: (event: any) => {
              console.warn('YouTube Player Error code:', event.data);
              // Fallback to standard responsive iframe if embedding restricted
              setHasEmbedError(true);
              stopPolling();
            }
          }
        });
      } catch (err) {
        console.error('Failed to instantiate YouTube player:', err);
        setHasEmbedError(true);
      }
    };

    let checkInterval: any = null;
    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkInterval);
          initPlayer();
        }
      }, 150);

      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (checkInterval) clearInterval(checkInterval);
        if (prevCallback) prevCallback();
        initPlayer();
      };
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      stopPolling();
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
    };
  }, [videoId, contentId, autoResume, stopPolling, handleVideoCompleted]);

  // Fallback view if embedding restricted by YouTube or owner
  if (!videoId || hasEmbedError) {
    const directWatchUrl = buildYouTubeWatchUrl(videoUrl);

    return (
      <div className="youtube-player-container">
        {/* Direct Embed Iframe fallback with privacy domain */}
        {videoId ? (
          <div className="youtube-player-aspect-wrapper">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        ) : (
          <div className="youtube-error-fallback">
            <div className="youtube-error-icon-circle">
              <ShieldAlert size={28} />
            </div>
            <h3 className="youtube-error-title">Embedded Playback Restricted</h3>
            <p className="youtube-error-desc">
              The video owner or YouTube restrictions prevent playing this video directly within third-party frames.
            </p>
            <div className="youtube-error-actions">
              <a href={directWatchUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <Button variant="primary" leftIcon={<ExternalLink size={16} />}>
                  Watch on YouTube
                </Button>
              </a>
              {!readOnly && !localCompleted && (
                <Button 
                  variant="outline" 
                  leftIcon={<CheckCircle size={16} />}
                  onClick={handleVideoCompleted}
                >
                  Mark as Watched
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Read-Only Anti-Seek Progress Bar */}
        <div className="youtube-readonly-progressbar-container">
          <div className="youtube-readonly-progressbar-track">
            <div 
              className="youtube-readonly-progressbar-fill"
              style={{ width: `${currentProgress}%` }}
            />
          </div>
        </div>

        {/* Status Bar */}
        <div className="youtube-custom-controls">
          <div className="youtube-controls-left">
            <div className={`youtube-progress-badge ${localCompleted ? 'completed' : 'watching'}`}>
              {localCompleted ? (
                <>
                  <Check size={14} /> Completed
                </>
              ) : (
                <>
                  <Clock size={14} /> {currentProgress}% Watched
                </>
              )}
            </div>
            <span style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.82rem' }}>{title}</span>
          </div>

          <div className="youtube-controls-right">
            <div className="youtube-lock-pill" title="Forward-seeking is locked">
              <Lock size={12} />
              <span>{Math.round(completionThreshold * 100)}% Watch Required</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`youtube-player-container ${isFullscreen ? 'fullscreen-mode' : ''}`}
      ref={containerRef}
      tabIndex={0}
      aria-label="YouTube Lecture Video Player"
    >
      {/* Resume Toast notification */}
      {resumeMessage && (
        <div className="youtube-resume-toast animate-fade-in">
          <RotateCcw size={14} />
          <span>{resumeMessage}</span>
        </div>
      )}

      {/* 16:9 Aspect Ratio IFrame Container */}
      <div className="youtube-player-aspect-wrapper">
        <div ref={iframeMountRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Read-Only Progress Bar (strictly display-only, user cannot click or drag to seek) */}
      <div 
        className="youtube-readonly-progressbar-container"
        title="Mandatory Video Progress: Forward seeking is disabled"
        aria-label="Video watch progress"
        role="progressbar"
        aria-valuenow={currentProgress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="youtube-readonly-progressbar-track">
          <div 
            className="youtube-readonly-progressbar-buffered"
            style={{ width: `${bufferedProgress}%` }}
          />
          <div 
            className="youtube-readonly-progressbar-fill"
            style={{ width: `${currentProgress}%` }}
          />
        </div>
      </div>

      {/* Custom Minimal Status & Controls Bar under the video */}
      <div className="youtube-custom-controls">
        <div className="youtube-controls-left">
          {/* Play / Pause button */}
          <button
            type="button"
            className="youtube-control-btn youtube-play-btn"
            onClick={togglePlayPause}
            disabled={!isReady}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" />
            )}
          </button>

          {/* Volume controls */}
          <div className="youtube-volume-group">
            <button
              type="button"
              className="youtube-control-btn youtube-volume-btn"
              onClick={toggleMute}
              disabled={!isReady}
              title={isMuted ? 'Unmute (m)' : 'Mute (m)'}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX size={18} />
              ) : volume < 50 ? (
                <Volume1 size={18} />
              ) : (
                <Volume2 size={18} />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="youtube-volume-slider"
              title="Volume"
              aria-label="Volume slider"
              disabled={!isReady}
            />
          </div>

          {/* Time display: Current Time / Total Duration */}
          <div className="youtube-time-display">
            <span className="youtube-time-current">{formatVideoTime(videoCurrentTime)}</span>
            <span className="youtube-time-divider">/</span>
            <span className="youtube-time-duration">{formatVideoTime(videoDuration)}</span>
          </div>
        </div>

        <div className="youtube-controls-right">
          {/* Watch required pill */}
          <div className="youtube-lock-pill" title="Seeking and forward-skipping are disabled for mandatory training">
            <Lock size={12} />
            <span>{Math.round(completionThreshold * 100)}% Watch Required</span>
          </div>

          {/* Status Badge */}
          <div className={`youtube-progress-badge ${localCompleted ? 'completed' : 'watching'}`}>
            {localCompleted ? (
              <>
                <CheckCircle size={15} /> Lesson Completed
              </>
            ) : (
              <>
                <Clock size={15} /> {currentProgress}% Watched
              </>
            )}
          </div>

          {/* Fullscreen button */}
          <button
            type="button"
            className="youtube-control-btn youtube-fullscreen-btn"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen (f)' : 'Fullscreen (f)'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};
