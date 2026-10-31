import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiCall, handleLogoutLocal, type UserDetail, type LoginResponseData } from '../services/api';

export interface AuthUser extends UserDetail {
  role: string;
  rawRoles: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  role: string;
  rawRoles: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginResponseData, deptCode?: string) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const mapRolesToDisplayRole = (rolesList: string[], deptCode?: string): string => {
  const upper = rolesList.map(r => r.toUpperCase());
  if (upper.includes('SYSTEM_ADMIN') || upper.includes('ADMIN')) {
    return 'Admin';
  }
  if (upper.includes('HR_ADMIN')) {
    return 'HR Admin';
  }
  if (upper.includes('COURSE_MANAGER')) {
    const isHR = deptCode && (deptCode.toUpperCase() === 'HR' || deptCode.toUpperCase() === 'HR_ADMIN');
    return isHR ? 'HR Manager' : 'Manager';
  }
  return 'Employee';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const deriveAuthUser = (userData: any, deptCode?: string): AuthUser => {
    const rawList: string[] = (userData.roles || []).map((r: any) =>
      typeof r === 'object' && r !== null && 'name' in r ? r.name : String(r)
    );
    const resolvedDeptCode = deptCode || localStorage.getItem('isLoggedInDept') || 'General';
    const primaryRole = mapRolesToDisplayRole(rawList, resolvedDeptCode);

    return {
      id: String(userData.id),
      employee_code: userData.employee_code || '',
      first_name: userData.first_name || '',
      last_name: userData.last_name || '',
      email: userData.email || '',
      department_id: userData.department_id || null,
      is_active: userData.is_active ?? true,
      must_change_password: Boolean(userData.must_change_password),
      role: primaryRole,
      rawRoles: rawList,
    };
  };

  const syncLocalStorage = (authUser: AuthUser, deptCode?: string) => {
    localStorage.setItem('userId', authUser.id);
    localStorage.setItem('profileUserId', authUser.id);
    localStorage.setItem('isLoggedInEmail', authUser.email);
    localStorage.setItem('isLoggedInRole', authUser.role);
    localStorage.setItem('rawRoles', JSON.stringify(authUser.rawRoles));
    localStorage.setItem('profileName', `${authUser.first_name} ${authUser.last_name}`.trim());
    localStorage.setItem('profileEmpId', authUser.employee_code);
    if (authUser.department_id) {
      localStorage.setItem('profileDeptId', authUser.department_id);
      localStorage.setItem('isLoggedInDeptId', authUser.department_id);
    }
    if (deptCode) {
      localStorage.setItem('isLoggedInDept', deptCode);
    }
  };

  const refreshProfile = useCallback(async (): Promise<AuthUser | null> => {
    const token = localStorage.getItem('access_token');
    const refreshTok = localStorage.getItem('refresh_token');
    if (!token && !refreshTok) {
      setUser(null);
      setIsLoading(false);
      return null;
    }

    try {
      const res = await apiCall('/api/auth/profile');
      if (res.ok) {
        const data = await res.json();
        if (!data.is_active || data.is_deleted) {
          handleLogoutLocal();
          sessionStorage.setItem('auth_notice', 'Your account has been deactivated. Please contact an administrator.');
          setUser(null);
          setIsLoading(false);
          return null;
        }

        const authUser = deriveAuthUser(data);
        syncLocalStorage(authUser);
        setUser(authUser);
        setIsLoading(false);
        return authUser;
      } else {
        // Verification failed
        handleLogoutLocal();
        setUser(null);
        setIsLoading(false);
        return null;
      }
    } catch {
      handleLogoutLocal();
      setUser(null);
      setIsLoading(false);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshProfile();

    const handleAuthChange = () => {
      refreshProfile();
    };

    window.addEventListener('kaizen_auth_state_changed', handleAuthChange);
    return () => {
      window.removeEventListener('kaizen_auth_state_changed', handleAuthChange);
    };
  }, [refreshProfile]);

  const login = (data: LoginResponseData, deptCode?: string) => {
    // 1. Wipe out any previous user data completely to avoid session leakage
    handleLogoutLocal();

    // 2. Set tokens
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);

    // 3. Derive and store authenticated user
    const rolesList = data.roles || [];
    const authUser = deriveAuthUser({ ...data.user, roles: rolesList }, deptCode);
    syncLocalStorage(authUser, deptCode);
    setUser(authUser);
    setIsLoading(false);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await apiCall('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch {
        // Silently catch network failures during logout
      }
    }
    handleLogoutLocal();
    setUser(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'Employee',
        rawRoles: user?.rawRoles || [],
        isAuthenticated: !!user && !!localStorage.getItem('access_token'),
        isLoading,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
