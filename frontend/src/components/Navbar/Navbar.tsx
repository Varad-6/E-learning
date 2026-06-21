import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, User, LogOut } from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle/ThemeToggle';
import { Button } from '../Button/Button';
import { apiCall, handleLogoutLocal } from '../../services/api';
import './Navbar.css';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const email = localStorage.getItem('isLoggedInEmail');
    setUserEmail(email);
  }, [location]);

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

  return (
    <header className="navbar-header glass-panel">
      <div className="navbar-container container">
        <Link to="/" className="navbar-logo tooltip-trigger" data-tooltip="Kiezen Continuous Improvement Hub">
          <BookOpen className="logo-icon" size={24} />
          <span className="logo-text">Kiezen</span>
        </Link>

        <nav className="navbar-links">
          <Link to="/" className={`nav-link tooltip-trigger ${location.pathname === '/' ? 'active' : ''}`} data-tooltip="Kiezen Homepage">
            Home
          </Link>
          {userEmail && (
            <Link to="/dashboard" className={`nav-link tooltip-trigger ${location.pathname === '/dashboard' ? 'active' : ''}`} data-tooltip="Go to My Workspace Dashboard">
              Dashboard
            </Link>
          )}
        </nav>

        <div className="navbar-actions">
          <ThemeToggle />

          {userEmail ? (
            <div className="user-profile-menu">
              <Link to="/dashboard?tab=profile" className="user-badge tooltip-trigger" data-tooltip="View My Profile Info & Training Report">
                <User size={16} />
                <span className="username-text">{userEmail.split('@')[0]}</span>
              </Link>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="logout-btn tooltip-trigger"
                data-tooltip="Sign out of Kiezen session"
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
