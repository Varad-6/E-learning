/**
 * Comprehensive YouTube URL parser and Embed URL generator.
 * Supports:
 *  - Standard watch URLs: https://www.youtube.com/watch?v=VIDEO_ID
 *  - URLs with multiple parameters: https://www.youtube.com/watch?feature=shared&v=VIDEO_ID&t=10s
 *  - Shortened URLs: https://youtu.be/VIDEO_ID?t=10s
 *  - Shorts URLs: https://www.youtube.com/shorts/VIDEO_ID
 *  - Embed URLs: https://www.youtube.com/embed/VIDEO_ID or youtube-nocookie.com/embed/VIDEO_ID
 *  - Live URLs: https://www.youtube.com/live/VIDEO_ID
 *  - Mobile URLs: https://m.youtube.com/watch?v=VIDEO_ID
 *  - URLs with timestamps & extra parameters: ?t=90, &t=1m30s, &feature=shared
 *  - Bare 11-character video IDs
 */

/**
 * Extracts standard 11-character YouTube Video ID from any known URL format.
 */
export const extractYouTubeId = (url: string | null | undefined): string | null => {
  if (!url || typeof url !== 'string') return null;
  const clean = url.trim();
  if (!clean) return null;

  // Direct 11-char ID (alphanumeric, dash, underscore)
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }

  try {
    // Normalise protocol for URL parser
    const normalizedUrl = clean.startsWith('http://') || clean.startsWith('https://')
      ? clean
      : `https://${clean}`;

    const parsed = new URL(normalizedUrl);
    const hostname = parsed.hostname.toLowerCase();

    // 1. youtu.be/VIDEO_ID
    if (hostname === 'youtu.be' || hostname.endsWith('.youtu.be')) {
      const pathname = parsed.pathname.replace(/^\/+/, '').split('/')[0];
      if (pathname && /^[a-zA-Z0-9_-]{11}$/.test(pathname)) {
        return pathname;
      }
    }

    // 2. youtube.com or youtube-nocookie.com (desktop or mobile)
    if (hostname.includes('youtube.com') || hostname.includes('youtube-nocookie.com')) {
      // Check query parameter ?v=...
      const v = parsed.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) {
        return v;
      }

      // Check path prefixes: /embed/ID, /shorts/ID, /live/ID, /v/ID
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      const prefix = pathParts[0]?.toLowerCase();
      if (prefix === 'embed' || prefix === 'shorts' || prefix === 'live' || prefix === 'v') {
        const id = pathParts[1];
        if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) {
          return id;
        }
      }
    }
  } catch {
    // Fall back to regex if URL parsing throws
  }

  // Regex fallbacks for non-standard / query-embedded URLs
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/,
    /\/watch\?.*[?&]v=([a-zA-Z0-9_-]{11})/
  ];

  for (const regex of patterns) {
    const match = clean.match(regex);
    if (match && match[1] && match[1].length === 11) {
      return match[1];
    }
  }

  return null;
};

/**
 * Checks whether a given string is a valid YouTube video link.
 */
export const isValidYouTubeUrl = (url: string | null | undefined): boolean => {
  return extractYouTubeId(url) !== null;
};

/**
 * Builds clean privacy-enhanced embed URL:
 * https://www.youtube-nocookie.com/embed/VIDEO_ID
 * Never puts raw watch URLs in iframes to avoid X-Frame-Options blocking.
 */
export const getYouTubeEmbedUrl = (
  urlOrId: string | null | undefined,
  options: {
    autoplay?: boolean;
    rel?: number;
    controls?: number;
    enableJsApi?: boolean;
    startTime?: number;
  } = {}
): string | null => {
  const videoId = extractYouTubeId(urlOrId);
  if (!videoId) return null;

  const params = new URLSearchParams();
  if (options.rel !== undefined) {
    params.set('rel', options.rel.toString());
  } else {
    params.set('rel', '0');
  }

  if (options.controls !== undefined) {
    params.set('controls', options.controls.toString());
  }

  if (options.autoplay) {
    params.set('autoplay', '1');
  }

  if (options.startTime && options.startTime > 0) {
    params.set('start', Math.floor(options.startTime).toString());
  }

  if (options.enableJsApi) {
    params.set('enablejsapi', '1');
    if (typeof window !== 'undefined' && window.location?.origin) {
      params.set('origin', window.location.origin);
    }
  }

  const queryString = params.toString();
  return `https://www.youtube.com/embed/${videoId}${queryString ? `?${queryString}` : ''}`;
};

/**
 * Backwards compatibility helper for existing callers.
 */
export const buildYouTubeEmbedUrl = (
  urlOrId: string | null | undefined,
  options: {
    autoplay?: boolean;
    startTime?: number;
    enableJsApi?: boolean;
    rel?: number;
  } = {}
): string | null => {
  return getYouTubeEmbedUrl(urlOrId, {
    autoplay: options.autoplay,
    startTime: options.startTime,
    enableJsApi: options.enableJsApi,
    rel: options.rel
  });
};

/**
 * Direct link to open the video on youtube.com if embedding is blocked or restricted.
 */
export const buildYouTubeWatchUrl = (urlOrId: string | null | undefined): string => {
  const videoId = extractYouTubeId(urlOrId);
  if (!videoId) return urlOrId || 'https://www.youtube.com';
  return `https://www.youtube.com/watch?v=${videoId}`;
};

/**
 * Formats time in seconds to mm:ss or hh:mm:ss.
 */
export const formatVideoTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const totalSecs = Math.floor(seconds);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};
