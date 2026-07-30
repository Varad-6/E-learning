import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  User, LogOut, Bell, Trash2, CheckCircle2, X,
  BookOpen, Award, FileText, CheckCircle, AlertTriangle, Settings, Info
} from 'lucide-react';
import { Button } from '../Button/Button';
import { apiCall, handleLogoutLocal } from '../../services/api';
import './Navbar.css';

interface AppNotification {
  id: string;
  message: string;
  title: string;
  type: string;
  relatedEntityId?: string;
  isRead: boolean;
  timestamp: string;
}

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const safeNavigate = async (path: string, isLogoutClick: boolean = false) => {
    const activeExamId = sessionStorage.getItem('active_exam_id');
    if (activeExamId) {
      const confirm = window.confirm("This may lead to exiting the exam. Your answers will be saved. Do you still want to exit?");
      if (!confirm) {
        return;
      }

      // Auto submit answers
      const answersStr = sessionStorage.getItem('active_exam_answers') || '{}';
      const filesStr = sessionStorage.getItem('active_exam_files') || '{}';

      let finalAnswers: any = {};
      try {
        finalAnswers = JSON.parse(answersStr);
      } catch (e) {
        console.error(e);
      }

      try {
        const uploadedFiles = JSON.parse(filesStr);
        Object.keys(uploadedFiles).forEach(qId => {
          finalAnswers[qId] = JSON.stringify(uploadedFiles[qId]);
        });
      } catch (e) {
        console.error(e);
      }

      try {
        await apiCall(`/api/exams/${activeExamId}/submit`, {
          method: 'POST',
          body: JSON.stringify(finalAnswers),
          keepalive: true
        });
      } catch (err) {
        console.error("Exit-submit failed:", err);
      }

      sessionStorage.removeItem('active_exam_id');
      sessionStorage.removeItem('active_exam_answers');
      sessionStorage.removeItem('active_exam_files');
    }

    if (isLogoutClick) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          await apiCall('/api/auth/logout', {
            method: 'POST',
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
        } catch (err) {
          console.error('Logout API call failed:', err);
        }
      }
      handleLogoutLocal();
      setUserEmail(null);
      navigate('/');
    } else {
      navigate(path);
    }
  };
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('Employee');
  const [userDept, setUserDept] = useState<string>('AI');
  const [profileName, setProfileName] = useState<string>('');
  
  // Notification states
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadBadgeCount, setUnreadBadgeCount] = useState<number>(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const fetchNotificationsBackend = async () => {
    const email = localStorage.getItem('isLoggedInEmail');
    if (!email) return;

    try {
      const [resNotifs, resUnread] = await Promise.all([
        apiCall('/api/notifications?limit=20'),
        apiCall('/api/notifications/unread-count')
      ]);

      if (resNotifs.ok) {
        const data = await resNotifs.json();
        const clearedAt = parseInt(localStorage.getItem('kaizen_notifications_cleared_at') || '0', 10);
        const mapped: AppNotification[] = data
          .filter((n: any) => !clearedAt || (n.created_at && new Date(n.created_at).getTime() > clearedAt))
          .map((n: any) => ({
            id: n.id,
            message: n.message,
            title: n.title,
            type: n.type,
            relatedEntityId: n.related_entity_id,
            isRead: n.is_read,
            timestamp: n.created_at
          }));
        setNotifications(mapped);
      }

      if (resUnread.ok) {
        const unreadData = await resUnread.json();
        setUnreadBadgeCount(unreadData.unread_count);
      }
    } catch {
      // Silently ignore — backend may be temporarily unreachable
    }
  };

  const loadNotificationsAndProfile = async () => {
    const email = localStorage.getItem('isLoggedInEmail');
    let role = localStorage.getItem('isLoggedInRole') || 'Employee';
    const dept = localStorage.getItem('isLoggedInDept') || 'AI';
    let name = localStorage.getItem('profileName') || (email ? email.split('@')[0] : '');

    setUserEmail(email);
    setUserRole(role);
    setUserDept(dept);
    setProfileName(name);

    if (email) {
      fetchNotificationsBackend();
      // Sync user profile & role from database
      try {
        const res = await apiCall('/api/auth/profile');
        if (res.ok) {
          const user = await res.json();
          const roles: string[] = user.roles ? user.roles.map((r: any) => r.name) : [];
          localStorage.setItem('rawRoles', JSON.stringify(roles));
          
          let mappedRole = 'Employee';
          if (roles.includes('SYSTEM_ADMIN')) mappedRole = 'Admin';
          else if (roles.includes('HR_ADMIN')) mappedRole = 'HR Admin';
          else if (roles.includes('COURSE_MANAGER')) mappedRole = 'Manager';

          if (mappedRole !== role) {
            localStorage.setItem('isLoggedInRole', mappedRole);
            setUserRole(mappedRole);
          }
          if (user.first_name) {
            const fullName = `${user.first_name} ${user.last_name}`.trim();
            localStorage.setItem('profileName', fullName);
            setProfileName(fullName);
          }
        }
      } catch {
        // Silently ignore network hiccup
      }
    }
  };

  useEffect(() => {
    loadNotificationsAndProfile();

    let intervalId: any;
    if (localStorage.getItem('isLoggedInEmail')) {
      intervalId = setInterval(() => {
        fetchNotificationsBackend();
      }, 60000); // Poll every 60 seconds
    }

    const handleNotifChange = () => {
      loadNotificationsAndProfile();
    };

    window.addEventListener('kaizen_notifications_changed', handleNotifChange);
    window.addEventListener('kaizen_role_updated', handleNotifChange);
    return () => {
      window.removeEventListener('kaizen_notifications_changed', handleNotifChange);
      window.removeEventListener('kaizen_role_updated', handleNotifChange);
      if (intervalId) clearInterval(intervalId);
    };
  }, [location]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.notif-badge-trigger-wrapper')) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener('click', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isNotifOpen]);

  const handleLogout = async () => {
    await safeNavigate('/', true);
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'enrollment':
        return <BookOpen size={16} style={{ color: 'var(--accent-color)' }} />;
      case 'completion':
        return <Award size={16} style={{ color: 'var(--accent-color)' }} />;
      case 'exam_submitted':
      case 'exam_submission_pending':
      case 'exam_pending':
        return <FileText size={16} style={{ color: 'var(--accent-color)' }} />;
      case 'exam_graded':
      case 'exam_approved':
        return <CheckCircle size={16} style={{ color: 'var(--accent-color)' }} />;
      case 'course_submitted':
      case 'course_pending':
        return <FileText size={16} style={{ color: 'var(--accent-color)' }} />;
      case 'course_approved':
        return <CheckCircle size={16} style={{ color: 'var(--accent-color)' }} />;
      case 'course_rejected':
      case 'exam_rejected':
        return <AlertTriangle size={16} style={{ color: 'var(--neon-coral)' }} />;
      case 'role_update':
        return <Settings size={16} style={{ color: 'var(--accent-color)' }} />;
      case 'provisioning':
      default:
        return <Info size={16} style={{ color: 'var(--accent-color)' }} />;
    }
  };

  const getRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (60 * 1000));
      const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
      const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return 'recent';
    }
  };

  const filteredNotifs = notifications;
  const unreadCount = typeof unreadBadgeCount === 'number' ? unreadBadgeCount : filteredNotifs.filter(n => !n.isRead).length;

  const handleNotifClick = async (notif: AppNotification) => {
    try {
      await apiCall(`/api/notifications/${notif.id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
      setUnreadBadgeCount(prev => Math.max(0, prev - (notif.isRead ? 0 : 1)));
    } catch (err) {
      console.error(err);
    }
    setIsNotifOpen(false);
    setShowHistoryModal(false);

    // Navigate to related views
    if (notif.type.includes('course')) {
      if (userRole === 'Employee') {
        safeNavigate('/dashboard?tab=my-courses');
      } else {
        safeNavigate('/creator/dashboard?tab=my_courses');
      }
    } else if (notif.type.includes('exam') || notif.type.includes('review')) {
      if (userRole === 'Employee') {
        safeNavigate('/exams');
      } else {
        safeNavigate('/creator/dashboard?tab=approvals');
      }
    } else if (notif.type.includes('manager')) {
      safeNavigate('/creator/dashboard?tab=approvals');
    } else {
      safeNavigate('/dashboard');
    }
  };

  const handleDismissNotif = async (notifId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiCall(`/api/notifications/${notifId}`, { method: 'DELETE' });
      setNotifications(prev => prev.filter(n => n.id !== notifId));
      setUnreadBadgeCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiCall('/api/notifications/read-all', { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadBadgeCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAllNotifs = async () => {
    localStorage.setItem('kaizen_notifications_cleared_at', Date.now().toString());
    try {
      await apiCall('/api/notifications/clear-all', { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to clear notifications on backend', err);
    }
    setNotifications([]);
    setUnreadBadgeCount(0);
  };
  const handleToggleNotifDropdown = async () => {
    const nextState = !isNotifOpen;
    setIsNotifOpen(nextState);
    if (nextState) {
      setUnreadBadgeCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      try {
        await apiCall('/api/notifications/read-all', { method: 'PATCH' });
      } catch (err) {
        console.error('Failed auto-marking notifications read on dropdown open:', err);
      }
    }
  };

  return (
    <header className="navbar-header glass-panel">
      <div className="navbar-container">
        <div 
          onClick={() => safeNavigate('/')} 
          className="navbar-logo" 
          style={{ cursor: 'pointer' }}
          role="button"
        >
          <span className="logo-text" style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.5px' }}>KAIZEN</span>
        </div>

        <nav className="navbar-links">
          {!userEmail && (
            <div 
              onClick={() => safeNavigate('/')} 
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} 
              style={{ cursor: 'pointer' }}
              role="button"
            >
              Home
            </div>
          )}
          {userEmail && (
            <>
              <div 
                onClick={() => safeNavigate('/dashboard')} 
                className={`nav-link ${location.pathname === '/dashboard' && !location.search.includes('tab=my-courses') ? 'active' : ''}`} 
                style={{ cursor: 'pointer' }}
                role="button"
              >
                Dashboard
              </div>
              {userRole === 'Employee' && (
                <>
                  <div 
                    onClick={() => safeNavigate('/dashboard?tab=my-courses')} 
                    className={`nav-link ${location.pathname === '/dashboard' && location.search.includes('tab=my-courses') ? 'active' : ''}`} 
                    style={{ cursor: 'pointer' }}
                    role="button"
                  >
                    My Courses
                  </div>
                  <div 
                    onClick={() => safeNavigate('/exams')} 
                    className={`nav-link ${location.pathname === '/exams' ? 'active' : ''}`} 
                    style={{ cursor: 'pointer' }}
                    role="button"
                  >
                    Attempt Exam
                  </div>
                </>
              )}
            </>
          )}
          {userEmail && (() => {
            const rawRolesStr = localStorage.getItem('rawRoles');
            const rawRoles = rawRolesStr ? JSON.parse(rawRolesStr) : [];
            const hasAccess = rawRoles.includes('SYSTEM_ADMIN') || rawRoles.includes('COURSE_MANAGER') || rawRoles.includes('HR_ADMIN');
            if (!hasAccess) return null;
            return (
              <div 
                onClick={() => safeNavigate('/creator/dashboard')} 
                className={`nav-link ${location.pathname.startsWith('/creator') ? 'active' : ''}`} 
                style={{ cursor: 'pointer' }}
                role="button"
              >
                Creator Studio
              </div>
            );
          })()}
          {userEmail && (() => {
            const rawRolesStr = localStorage.getItem('rawRoles') || '[]';
            let rawRoles: string[] = [];
            try { rawRoles = JSON.parse(rawRolesStr); } catch {}
            const isAdminRole = userRole === 'Admin' || userRole === 'HR Admin' || userRole === 'HR Manager' || userRole === 'HR' || rawRoles.includes('SYSTEM_ADMIN') || rawRoles.includes('HR_ADMIN');
            if (!isAdminRole) return null;
            return (
              <div 
                onClick={() => safeNavigate('/admin/users')} 
                className={`nav-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`} 
                style={{ cursor: 'pointer' }}
                role="button"
              >
                User Studio
              </div>
            );
          })()}
          {userEmail && (userRole === 'Admin' || userRole === 'HR Admin' || userRole === 'HR Manager' || userRole === 'HR' || userRole === 'Manager') && (
            <div 
              onClick={() => safeNavigate('/reporting')} 
              className={`nav-link ${location.pathname.startsWith('/reporting') ? 'active' : ''}`} 
              style={{ cursor: 'pointer' }}
              role="button"
            >
              Reporting
            </div>
          )}
          {userEmail && (
            <div 
              onClick={() => safeNavigate('/leaderboard')} 
              className={`nav-link ${location.pathname.startsWith('/leaderboard') ? 'active' : ''}`} 
              style={{ cursor: 'pointer' }}
              role="button"
            >
              Leaderboard
            </div>
          )}
        </nav>

        <div className="navbar-actions">
          {userEmail && (
            /* Global Notifications Bell Widget */
            <div className="notif-badge-trigger-wrapper">
              <button 
                className={`notif-bell-btn ${unreadCount > 0 ? 'bell-active' : ''}`}
                onClick={handleToggleNotifDropdown}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="bell-badge-count">{unreadCount}</span>
                )}
              </button>

              {isNotifOpen && (
                <div className="notif-dropdown-card glass-panel" style={{ right: 0, top: '46px' }}>
                  <div className="notif-dropdown-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Bell size={14} style={{ color: 'var(--accent-color)' }} />
                      <span>Notifications</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} className="notif-header-action-btn">Mark read</button>
                      )}
                      {filteredNotifs.length > 0 && (
                        <button onClick={handleClearAllNotifs} className="notif-header-action-btn red-hover">Clear</button>
                      )}
                    </div>
                  </div>

                  <div className="notif-dropdown-body scroll-bar-styled">
                    {filteredNotifs.length === 0 ? (
                      <div className="notif-empty-state">
                        <CheckCircle2 size={28} style={{ opacity: 0.3, marginBottom: '8px', color: 'var(--accent-color)' }} />
                        <p style={{ fontSize: '0.8rem' }}>No active alerts.</p>
                      </div>
                    ) : (
                      filteredNotifs.slice(0, 5).map(notif => (
                        <div 
                          key={notif.id} 
                          className={`notif-feed-item ${notif.isRead ? 'read' : 'unread'}`}
                          onClick={() => handleNotifClick(notif)}
                        >
                          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                            <div style={{ marginTop: '2px', flexShrink: 0 }}>
                              {getNotifIcon(notif.type)}
                            </div>
                            <div className="notif-feed-content">
                              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>
                                {notif.title || 'Notification'}
                              </span>
                              <p className="notif-message-text" style={{ fontSize: '0.78rem', margin: 0 }}>{notif.message}</p>
                              <div className="notif-meta-row" style={{ marginTop: '4px' }}>
                                <span className="notif-time">{getRelativeTime(notif.timestamp)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <button 
                      onClick={() => {
                        setIsNotifOpen(false);
                        setShowHistoryModal(true);
                      }} 
                      className="notif-header-action-btn"
                      style={{ width: '100%', padding: '6px', fontWeight: 'bold' }}
                    >
                      View All Notifications
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {userEmail ? (
            <div className="user-profile-menu">
              <div 
                onClick={() => safeNavigate('/dashboard?tab=profile')} 
                className="user-badge" 
                style={{ cursor: 'pointer' }}
                role="button"
              >
                <User size={16} />
                <span className="username-text">{userEmail.split('@')[0]}</span>
              </div>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="logout-btn"
                leftIcon={<LogOut size={16} />}
              >
                Logout
              </Button>
            </div>
          ) : (
            <Button variant="primary" onClick={() => safeNavigate('/login')} className="signin-btn">
              Sign In
            </Button>
          )}
        </div>
      </div>

      {showHistoryModal && (
        <div className="notif-history-modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="notif-history-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="notif-history-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={20} style={{ color: 'var(--accent-color)' }} />
                <h3>All Notifications</h3>
              </div>
              <button 
                onClick={() => setShowHistoryModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="notif-history-modal-body scroll-bar-styled">
              {filteredNotifs.length === 0 ? (
                <div className="notif-empty-state" style={{ padding: '80px 0' }}>
                  <CheckCircle2 size={40} style={{ opacity: 0.3, marginBottom: '12px', color: 'var(--accent-color)' }} />
                  <p>You have no notifications yet.</p>
                </div>
              ) : (
                filteredNotifs.map(notif => (
                  <div 
                    key={notif.id}
                    className={`notif-history-item ${notif.isRead ? 'read' : 'unread'}`}
                    onClick={() => handleNotifClick(notif)}
                  >
                    <div style={{ marginTop: '2px', flexShrink: 0 }}>
                      {getNotifIcon(notif.type)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {notif.title}
                        </h4>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {getRelativeTime(notif.timestamp)}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        {notif.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
