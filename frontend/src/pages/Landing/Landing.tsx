import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, UserCheck, Edit3, Key, ArrowRight } from 'lucide-react';
import { Button } from '../../components/Button/Button';
import './Landing.css';

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  const handlePortalLogin = async (role: string, email: string, dept: string) => {
    console.log(`Portal login for ${email}`);
    let empCode = 'EMP001';
    let password = 'Employee@1234';
    if (role === 'Manager') {
      empCode = 'MGR001';
      password = 'Manager@123';
    } else if (role === 'Admin') {
      empCode = 'ADM001';
      password = 'Temp@123';
    }

    try {
      const res = await fetch('http://127.0.0.1:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employee_code: empCode,
          password: password
        })
      });

      if (!res.ok) {
        alert('Quick login failed. Make sure database is seeded and backend is running.');
        return;
      }

      const data = await res.json();
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('isLoggedInEmail', data.user.email);
      
      const backendRole = data.roles[0] || 'EMPLOYEE';
      let mappedRole = 'Employee';
      if (backendRole === 'MANAGER' || backendRole === 'CREATOR') mappedRole = 'Manager';
      else if (backendRole === 'ADMIN') mappedRole = 'Admin';
      
      localStorage.setItem('isLoggedInRole', mappedRole);
      localStorage.setItem('isLoggedInDept', dept);
      
      const fullName = `${data.user.first_name} ${data.user.last_name}`;
      localStorage.setItem('profileName', fullName);
      localStorage.setItem('profileEmpId', data.user.employee_code);

      if (mappedRole === 'Manager') {
        navigate('/creator/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Quick login connection error:', err);
      alert('Cannot connect to backend server. Make sure it is running on http://127.0.0.1:8000.');
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
                <h3>Department Head Login</h3>
                <p className="portal-role-info">Role: Department Head (Product)</p>
              </div>
            </div>
            <p className="portal-short-desc">
              Log in as a department head. View department rosters, assign courses to teams, and trace employee compliance progress.
            </p>
            <Button
              variant="purple"
              onClick={() => handlePortalLogin('Manager', 'creator@company.com', 'Product')}
              className="portal-login-btn tooltip-trigger"
              data-tooltip="Instant login as Department Head"
            >
              Enter Department Head Dashboard
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
