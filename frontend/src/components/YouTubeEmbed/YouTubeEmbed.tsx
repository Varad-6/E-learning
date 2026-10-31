import React, { useState } from 'react';
import { ExternalLink, Video, AlertCircle } from 'lucide-react';
import { getYouTubeEmbedUrl, buildYouTubeWatchUrl, isValidYouTubeUrl } from '../../utils/youtube';
import { Button } from '../Button/Button';
import './YouTubeEmbed.css';

export interface YouTubeEmbedProps {
  videoUrl: string | null | undefined;
  title?: string;
  className?: string;
  showFallbackButton?: boolean;
}

export const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({
  videoUrl,
  title = 'YouTube Video Lecture',
  className = '',
  showFallbackButton = true
}) => {
  const [hasLoadError, setHasLoadError] = useState(false);

  if (!videoUrl || !isValidYouTubeUrl(videoUrl)) {
    return null;
  }

  const embedUrl = getYouTubeEmbedUrl(videoUrl);
  const directWatchUrl = buildYouTubeWatchUrl(videoUrl);

  if (!embedUrl || hasLoadError) {
    return (
      <div className={`youtube-embed-fallback-box ${className}`}>
        <div className="youtube-embed-fallback-content">
          <AlertCircle size={24} style={{ color: '#ef4444' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
              Video Preview Blocked by Provider
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              The video owner restricts third-party embedding. You can still watch it directly on YouTube.
            </div>
          </div>
        </div>
        <a href={directWatchUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <Button variant="outline" size="sm" rightIcon={<ExternalLink size={14} />}>
            Watch on YouTube
          </Button>
        </a>
      </div>
    );
  }

  return (
    <div className={`youtube-embed-container ${className}`}>
      {/* 16:9 Responsive Aspect Ratio Container */}
      <div className="youtube-embed-aspect-ratio">
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          className="youtube-embed-iframe"
          onError={() => setHasLoadError(true)}
        />
      </div>

      {showFallbackButton && (
        <div className="youtube-embed-footer-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <Video size={14} style={{ color: 'var(--accent-color)' }} />
            <span>YouTube Hosted Resource</span>
          </div>
          <a 
            href={directWatchUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="youtube-embed-external-link"
          >
            <span>Watch on YouTube</span>
            <ExternalLink size={13} />
          </a>
        </div>
      )}
    </div>
  );
};
