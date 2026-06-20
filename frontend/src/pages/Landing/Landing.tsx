import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, UserCheck, Edit3, Key, ArrowRight } from 'lucide-react';
import { Button } from '../../components/Button/Button';
import './Landing.css';

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  const handlePortalLogin = (role: string, email: string, dept: string) => {
    localStorage.setItem('isLoggedInEmail', email);
    localStorage.setItem('isLoggedInRole', role);
    localStorage.setItem('isLoggedInDept', dept);
    navigate('/dashboard');
  };

  return (
    <div className="landing-page container">
      {/* Main Professional Landing Content - Optimized two-column layout for desktops */}
      <section className="landing-hero animate-slide-left">
        <div className="hero-left-content">
          <div className="hero-brand-row">
            <BookOpen size={36} className="quote-icon" />
            <h1 className="landing-title">Knowva</h1>
          </div>
          
          <blockquote className="educational-quote">
            "Education is the most powerful weapon which you can use to change the world."
            <cite>— Nelson Mandela</cite>
          </blockquote>

          <p className="landing-lead-text">
            Welcome to the Knowva workspace portal. Select one of the quick-login gateways below to log in as a Learner, Course Creator, or System Administrator, or proceed to the custom login screen.
          </p>

          <Button 
            variant="primary" 
            onClick={() => navigate('/login')} 
            className="go-to-login-btn"
            rightIcon={<ArrowRight size={18} />}
          >
            Go to Credentials Form
          </Button>
        </div>

        <div className="hero-right-preview glass-panel animate-fade-in">
          <div className="preview-header">
            <div className="live-indicator">
              <span className="pulse-dot"></span>
              <span className="live-text">Live Platform Monitor</span>
            </div>
            <span className="dept-badge">Operations Node</span>
          </div>
          
          <div className="preview-stats-grid">
            <div className="stat-card">
              <p className="stat-val">12,482</p>
              <p className="stat-label">Assigned Modules</p>
            </div>
            <div className="stat-card">
              <p className="stat-val">98.4%</p>
              <p className="stat-label">Compliance Rate</p>
            </div>
          </div>

          <div className="preview-activity-feed">
            <h4>Recent Activity Log</h4>
            <div className="activity-item">
              <span className="activity-dot active"></span>
              <div className="activity-details">
                <p className="activity-title">ABAP NetWeaver Dev assigned</p>
                <p className="activity-time">2 mins ago • Engineering Dept</p>
              </div>
            </div>
            <div className="activity-item">
              <span className="activity-dot completed"></span>
              <div className="activity-details">
                <p className="activity-title">SAP FICO Ledger completed</p>
                <p className="activity-time">45 mins ago • Finance Dept</p>
              </div>
            </div>
            <div className="activity-item">
              <span className="activity-dot pending"></span>
              <div className="activity-details">
                <p className="activity-title">New Course Schema published</p>
                <p className="activity-time">3 hours ago • Operations</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Simplified Demo Portals Area */}
      <section className="portal-gateways-section">
        <h2 className="portals-title">Select Your Workspace</h2>
        <p className="portals-subtitle">Access different views of the platform using preset demo profiles:</p>
        
        <div className="portals-compact-grid">
          {/* LEARNER GATEWAY */}
          <div className="portal-compact-card learner-card glass-panel glow-hover animate-fade-in">
            <div className="portal-header-row">
              <div className="portal-icon-box learner">
                <UserCheck size={22} />
              </div>
              <div>
                <h3>Learner Login</h3>
                <p className="portal-role-info">Role: Employee (Engineering)</p>
              </div>
            </div>
            <p className="portal-short-desc">
              Log in as a standard employee. View assigned courses, track module progress, and review certifications.
            </p>
            <Button
              variant="primary"
              onClick={() => handlePortalLogin('Employee', 'learner@company.com', 'Engineering')}
              className="portal-login-btn"
            >
              Enter Learner Dashboard
            </Button>
          </div>

          {/* CREATOR GATEWAY */}
          <div className="portal-compact-card creator-card glass-panel glow-hover animate-fade-in">
            <div className="portal-header-row">
              <div className="portal-icon-box creator">
                <Edit3 size={22} />
              </div>
              <div>
                <h3>Creator Login</h3>
                <p className="portal-role-info">Role: Manager (Product)</p>
              </div>
            </div>
            <p className="portal-short-desc">
              Log in as a course creator. View department rosters, assign courses to teams, and trace employee compliance progress.
            </p>
            <Button
              variant="purple"
              onClick={() => handlePortalLogin('Manager', 'creator@company.com', 'Product')}
              className="portal-login-btn"
            >
              Enter Creator Dashboard
            </Button>
          </div>

          {/* ADMINISTRATOR GATEWAY */}
          <div className="portal-compact-card admin-card glass-panel glow-hover animate-fade-in">
            <div className="portal-header-row">
              <div className="portal-icon-box administrator">
                <Key size={22} />
              </div>
              <div>
                <h3>Admin Login</h3>
                <p className="portal-role-info">Role: Admin (Operations)</p>
              </div>
            </div>
            <p className="portal-short-desc">
              Log in as system administrator. Full database access to system audit logs, department registries, and dashboard analytics.
            </p>
            <Button
              variant="coral"
              onClick={() => handlePortalLogin('Admin', 'admin@company.com', 'Operations')}
              className="portal-login-btn"
            >
              Enter Admin Dashboard
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
