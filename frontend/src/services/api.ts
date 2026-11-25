export const getApiBaseUrl = (): string => {
  // Priority 1: explicit env override (set VITE_API_BASE_URL in .env.production)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined') {
    // Dev Vite server ports (not Docker) → talk directly to backend on :8000
    const isViteDevServer = ['5174', '5180', '5181', '3000'].includes(window.location.port);
    if (isViteDevServer) {
      return `${window.location.protocol}//${window.location.hostname}:8000`;
    }
    // Docker (port 5173 via nginx) or any production host → use same-origin,
    // nginx proxies /api/* → backend:8000 internally
    return window.location.origin;
  }
  return 'http://127.0.0.1:8000';
};

const API_BASE_URL = getApiBaseUrl();

// Shared in-flight refresh promise prevents concurrent 401 calls from racing on RTR rotation
let refreshInFlight: Promise<boolean> | null = null;

export interface UserDetail {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  department_id: string | null;
  is_active: boolean;
  must_change_password: boolean;
  roles?: { id: string; name: string }[] | string[];
}

export interface LoginResponseData {
  access_token: string;
  refresh_token: string;
  user: UserDetail;
  roles: string[];
  must_change_password: boolean;
}

/**
 * Universal wrapper for API calls to the FastAPI backend.
 * Automatically injects the JWT Bearer Access Token if present, and
 * manages mutex-guarded token refresh/rotation if an unauthorized (401) error is returned.
 */
export const apiCall = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const accessToken = localStorage.getItem('access_token');
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    cache: options.cache || 'no-store',
    headers,
  });

  // Handle token expiration (401 Unauthorized)
  if (response.status === 401 && endpoint !== '/api/auth/login' && endpoint !== '/api/auth/refresh') {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      const newAccessToken = localStorage.getItem('access_token');
      if (newAccessToken) {
        headers.set('Authorization', `Bearer ${newAccessToken}`);
      }
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        cache: options.cache || 'no-store',
        headers,
      });
    } else {
      handleLogoutLocal();
      sessionStorage.setItem('auth_notice', 'Your session has expired. Please log in again.');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please log in again.');
    }
  }

  const method = (options.method || 'GET').toUpperCase();
  if (
    response.ok &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) &&
    !endpoint.startsWith('/api/auth/login') &&
    !endpoint.startsWith('/api/auth/refresh') &&
    !endpoint.startsWith('/api/sync')
  ) {
    window.dispatchEvent(new CustomEvent('kaizen_local_mutation', { detail: { endpoint } }));
  }

  return response;
};

/**
 * Attempt to obtain a new JWT pair using the refresh token.
 * Deduplicates parallel refresh calls across concurrent requests.
 */
export const attemptTokenRefresh = async (): Promise<boolean> => {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return false;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        return true;
      }
    } catch (err) {
      console.error('Error refreshing token:', err);
    }
    return false;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
};

/**
 * Download or open an authenticated backend file URL using the current JWT session.
 */
export const openProtectedFile = async (fileUrl: string, fileName?: string): Promise<void> => {
  if (!fileUrl) return;
  if (!fileUrl.startsWith('/api/')) {
    const target = fileUrl.startsWith('http') ? fileUrl : `${API_BASE_URL}${fileUrl}`;
    window.open(target, '_blank', 'noopener,noreferrer');
    return;
  }
  const res = await apiCall(fileUrl);
  if (!res.ok) {
    throw new Error('Failed to download file.');
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName || 'attachment';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
};

/**
 * Clean up local and session storage authentication keys on logout or session expiration.
 */
export const handleLogoutLocal = () => {
  const theme = localStorage.getItem('theme');
  localStorage.clear();
  sessionStorage.clear();
  if (theme) {
    localStorage.setItem('theme', theme);
  }
  if (typeof document !== 'undefined') {
    document.cookie = 'kaizen_session_active=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }
  window.dispatchEvent(new Event('kaizen_auth_state_changed'));
};
