const API_BASE_URL = 'http://127.0.0.1:8000';

export interface UserDetail {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  department_id: string | null;
  is_active: boolean;
  must_change_password: boolean;
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
 * manages token refresh/rotation if an unauthorized (401) error is returned.
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
    headers,
  });

  // Handle token expiration (401 Unauthorized)
  if (response.status === 401 && endpoint !== '/api/auth/login' && endpoint !== '/api/auth/refresh') {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      // Retry request with the newly set access token
      const newAccessToken = localStorage.getItem('access_token');
      headers.set('Authorization', `Bearer ${newAccessToken}`);
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
    } else {
      // Token refresh failed or token is revoked - invalidate session
      handleLogoutLocal();
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }
  }

  return response;
};

/**
 * Attempt to obtain a new JWT pair using the refresh token.
 */
const attemptTokenRefresh = async (): Promise<boolean> => {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return false;

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
};

/**
 * Clean up local storage authentication keys on logout or session expiration.
 */
export const handleLogoutLocal = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('isLoggedInEmail');
  localStorage.removeItem('isLoggedInRole');
  localStorage.removeItem('isLoggedInDept');
  localStorage.removeItem('profileName');
  localStorage.removeItem('profileEmpId');
};
