import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, User, LogOut, Bell, Trash2, CheckCircle2 } from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle/ThemeToggle';
import { Button } from '../Button/Button';
import { apiCall, handleLogoutLocal } from '../../services/api';
import './Navbar.css';

interface AppNotification {
  id: string;
  message: string;
  type: 'submission' | 'approval' | 'rejection';
  courseId: string;
  deptName?: string;
  isRead: boolean;
  timestamp: string;
}

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('Employee');
  const [userDept, setUserDept] = useState<string>('AI');
  const [profileName, setProfileName] = useState<string>('');
  
  // Notification states
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const loadNotificationsAndProfile = () => {
    const email = localStorage.getItem('isLoggedInEmail');
    const role = localStorage.getItem('isLoggedInRole') || 'Employee';
    const dept = localStorage.getItem('isLoggedInDept') || 'AI';
    const name = localStorage.getItem('profileName') || (email ? email.split('@')[0] : '');

    setUserEmail(email);
    setUserRole(role);
    setUserDept(dept);
    setProfileName(name);

    const localNotifs = localStorage.getItem('kaizen_notifications');
    if (localNotifs) {
      setNotifications(JSON.parse(localNotifs));
    }
  };

  useEffect(() => {
    loadNotificationsAndProfile();

    // Listen for custom cross-component notification updates
    const handleNotifChange = () => {
      loadNotificationsAndProfile();
    };

    window.addEventListener('kaizen_notifications_changed', handleNotifChange);
    return () => {
      window.removeEventListener('kaizen_notifications_changed', handleNotifChange);
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
  };

  const syncNotifications = (updated: AppNotification[]) => {
    setNotifications(updated);
    localStorage.setItem('kaizen_notifications', JSON.stringify(updated));
    // Dispatch event to sync other loaded components
    window.dispatchEvent(new Event('kaizen_notifications_changed'));
  };

  // Scoped notifications filter
  const localCourses = localStorage.getItem('creator_courses');
  const coursesList = localCourses ? JSON.parse(localCourses) : [];

  const filteredNotifs = notifications.filter(notif => {
    if (notif.type === 'submission') {
      if (userRole === 'Admin') return true;
      if (userRole === 'Manager') return notif.deptName === userDept;
      return false; // Standard employees don't see submissions
    }
    
    // Approval/Rejection alerts are mapped strictly to the creator of that specific course
    const course = coursesList.find((c: any) => c.id === notif.courseId);
    return course ? course.creatorName === profileName : false;
  });

  const unreadCount = filteredNotifs.filter(n => !n.isRead).length;

  const handleNotifClick = (notif: AppNotification) => {
    const updated = notifications.map(n => n.id === notif.id ? { ...n, isRead: true } : n);
    syncNotifications(updated);
    setIsNotifOpen(false);

    const course = coursesList.find((c: any) => c.id === notif.courseId);
    if (notif.type === 'submission' && course && course.status !== 'Pending') {
      alert(`This course (${course.title}) has already been reviewed and is currently ${course.status}.`);
      return;
    }

    if (notif.type === 'submission') {
      // Navigate to Approvals dashboard and open review drawer
      navigate(`/creator/dashboard?tab=approvals&courseId=${notif.courseId}&dept=${notif.deptName || ''}`);
    } else {
      // Navigate to My Courses dashboard and open course list
      navigate(`/creator/dashboard?tab=my_courses&courseId=${notif.courseId}`);
    }
  };

  const handleDismissNotif = (notifId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notifications.filter(n => n.id !== notifId);
    syncNotifications(updated);
  };

  const handleMarkAllRead = () => {
    const updated = notifications.map(n => {
      // Mark as read only if it matches active scoped visible notification feed list
      const isVisible = filteredNotifs.some(vis => vis.id === n.id);
      if (isVisible) {
        return { ...n, isRead: true };
      }
      return n;
    });
    syncNotifications(updated);
  };

  const handleClearAllNotifs = () => {
    // Clear only the visible context notifications, preserving others
    const updated = notifications.filter(n => !filteredNotifs.some(vis => vis.id === n.id));
    syncNotifications(updated);
  };

  return (
    <header className="navbar-header glass-panel">
      <div className="navbar-container container">
        <div 
          onClick={() => navigate('/')} 
          className="navbar-logo" 
          style={{ cursor: 'pointer' }}
          role="button"
        >
          <BookOpen className="logo-icon" size={24} />
          <span className="logo-text">Kaizen</span>
        </div>

        <nav className="navbar-links">
          <div 
            onClick={() => navigate('/')} 
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} 
            style={{ cursor: 'pointer' }}
            role="button"
          >
            Home
          </div>
          {userEmail && (
            <>
              <div 
                onClick={() => navigate('/dashboard')} 
                className={`nav-link ${location.pathname === '/dashboard' && !location.search.includes('tab=my-courses') ? 'active' : ''}`} 
                style={{ cursor: 'pointer' }}
                role="button"
              >
                Dashboard
              </div>
              {userRole === 'Employee' && (
                <div 
                  onClick={() => navigate('/dashboard?tab=my-courses')} 
                  className={`nav-link ${location.pathname === '/dashboard' && location.search.includes('tab=my-courses') ? 'active' : ''}`} 
                  style={{ cursor: 'pointer' }}
                  role="button"
                >
                  My Courses
                </div>
              )}
            </>
          )}
          {userEmail && (() => {
            const rawRolesStr = localStorage.getItem('rawRoles');
            const rawRoles = rawRolesStr ? JSON.parse(rawRolesStr) : [];
            const hasAccess = rawRoles.includes('SYSTEM_ADMIN') || rawRoles.includes('COURSE_MANAGER');
            if (!hasAccess) return null;
            return (
              <div 
                onClick={() => navigate('/creator/dashboard')} 
                className={`nav-link ${location.pathname.startsWith('/creator') ? 'active' : ''}`} 
                style={{ cursor: 'pointer' }}
                role="button"
              >
                Creator Studio
              </div>
            );
          })()}
          {userEmail && userRole === 'Admin' && (
            <div 
              onClick={() => navigate('/admin/users')} 
              className={`nav-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`} 
              style={{ cursor: 'pointer' }}
              role="button"
            >
              User Studio
            </div>
          )}
          {userEmail && (userRole === 'Admin' || userRole === 'Manager') && (
            <div 
              onClick={() => navigate('/view-courses')} 
              className={`nav-link ${location.pathname === '/view-courses' ? 'active' : ''}`} 
              style={{ cursor: 'pointer' }}
              role="button"
            >
              View Courses
            </div>
          )}
        </nav>

        <div className="navbar-actions">
          <ThemeToggle />

          {userEmail && (
            /* Global Notifications Bell Widget */
            <div className="notif-badge-trigger-wrapper">
              <button 
                className={`notif-bell-btn ${unreadCount > 0 ? 'bell-active' : ''}`}
                onClick={() => setIsNotifOpen(!isNotifOpen)}
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
                        <CheckCircle2 size={28} style={{ opacity: 0.3, marginBottom: '8px', color: 'var(--neon-teal)' }} />
                        <p style={{ fontSize: '0.8rem' }}>No active alerts.</p>
                      </div>
                    ) : (
                      filteredNotifs.map(notif => (
                        <div 
                          key={notif.id} 
                          className={`notif-feed-item ${notif.isRead ? 'read' : 'unread'}`}
                          onClick={() => handleNotifClick(notif)}
                        >
                          <div className="notif-feed-content">
                            <p className="notif-message-text">{notif.message}</p>
                            <div className="notif-meta-row">
                              <span className="notif-time">{notif.timestamp}</span>
                              {notif.type === 'submission' && (
                                <span className="notif-action-indicator">Click to Review</span>
                              )}
                            </div>
                          </div>
                          <button 
                            onClick={(e) => handleDismissNotif(notif.id, e)}
                            className="notif-item-dismiss-btn"
                            title="Dismiss alert"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {userEmail ? (
            <div className="user-profile-menu">
              <div 
                onClick={() => navigate('/dashboard?tab=profile')} 
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
            <Button variant="primary" onClick={() => navigate('/login')} className="signin-btn">
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
