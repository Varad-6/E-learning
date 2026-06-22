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
    localStorage.setItem('access_token', 'mock-demo-access-token');
    localStorage.setItem('refresh_token', 'mock-demo-refresh-token');
    
    const nameMap: { [key: string]: string } = {
      'learner@company.com': 'Alice Smith',
      'creator@company.com': 'Dr. Evelyn C.',
      'admin@company.com': 'Systems Administrator'
    };
    const codeMap: { [key: string]: string } = {
      'learner@company.com': 'EMP-3041',
      'creator@company.com': 'MGR-1042',
      'admin@company.com': 'ADM-0001'
    };
    localStorage.setItem('profileName', nameMap[email] || 'Alice Smith');
    localStorage.setItem('profileEmpId', codeMap[email] || 'EMP-3041');

    if (role === 'Manager') {
      navigate('/creator/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="landing-page container">
      {/* Main Professional Landing Content - Optimized two-column layout for desktops */}
      <section className="landing-hero animate-slide-left" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%', maxWidth: '800px', margin: '40px auto 0 auto' }}>
        <div className="hero-left-content" style={{ alignItems: 'center' }}>
          <div className="hero-brand-row">
            <BookOpen size={36} className="quote-icon" />
            <h1 className="landing-title">Kiezen</h1>
          </div>
          
          <blockquote className="educational-quote" style={{ borderLeft: 'none', borderTop: '3px solid var(--accent-color)', borderBottom: '3px solid var(--accent-color)', padding: '20px 0', width: '100%' }}>
            "Excellence is not an act, but a habit of continuous improvement through daily choices."
            <cite style={{ marginTop: '12px' }}>— Aristotle</cite>
          </blockquote>

          <p className="landing-lead-text">
            Welcome to the Kiezen workspace portal. Select one of the quick-login gateways below to log in as a Learner, Course Creator, or System Administrator, or proceed to the custom login screen.
          </p>

          <Button 
            variant="primary" 
            onClick={() => navigate('/login')} 
            className="go-to-login-btn tooltip-trigger"
            data-tooltip="Proceed to custom login form with your credentials"
            rightIcon={<ArrowRight size={18} />}
            style={{ alignSelf: 'center' }}
          >
            Go to Credentials Form
          </Button>
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
              className="portal-login-btn tooltip-trigger"
              data-tooltip="Instant login as Learner (Employee)"
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
              className="portal-login-btn tooltip-trigger"
              data-tooltip="Instant login as Course Creator (Manager)"
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
              className="portal-login-btn tooltip-trigger"
              data-tooltip="Instant login as System Administrator"
            >
              Enter Admin Dashboard
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
