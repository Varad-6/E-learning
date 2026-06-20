import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, User, LogOut } from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle/ThemeToggle';
import { Button } from '../Button/Button';
import './Navbar.css';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const email = localStorage.getItem('isLoggedInEmail');
    setUserEmail(email);
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedInEmail');
    localStorage.removeItem('isLoggedInRole');
    localStorage.removeItem('isLoggedInDept');
    setUserEmail(null);
    navigate('/');
  };

  return (
    <header className="navbar-header glass-panel">
      <div className="navbar-container container">
        <Link to="/" className="navbar-logo">
          <BookOpen className="logo-icon" size={24} />
          <span className="logo-text">Knowva</span>
        </Link>

        <nav className="navbar-links">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            Home
          </Link>
          {userEmail && (
            <Link to="/dashboard" className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
              Dashboard
            </Link>
          )}
        </nav>

        <div className="navbar-actions">
          <ThemeToggle />

          {userEmail ? (
            <div className="user-profile-menu">
              <span className="user-badge" title={userEmail}>
                <User size={16} />
                <span className="username-text">{userEmail.split('@')[0]}</span>
              </span>
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
