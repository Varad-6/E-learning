import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, LayoutDashboard, ArrowRight, Briefcase } from 'lucide-react';
import './Landing.css';

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container animate-fade-in">
      <main className="landing-hero">
        <h1 className="hero-title">
          Enterprise Learning Management
        </h1>
        <p className="hero-subtitle">
          A professional platform designed for continuous organizational improvement. Streamline training, manage departments, and track employee progress.
        </p>

        <div className="portals-grid">
          <div className="portal-card" onClick={() => navigate('/login')}>
            <div className="portal-icon">
              <Users size={28} />
            </div>
            <h3 className="portal-title">Employee Portal</h3>
            <p className="portal-desc">
              Access your assigned training modules, track your progress, and view your certifications.
            </p>
            <span className="portal-link">
              Sign in to Employee Portal <ArrowRight size={16} className="portal-link-arrow" />
            </span>
          </div>

          <div className="portal-card" onClick={() => navigate('/login')}>
            <div className="portal-icon">
              <LayoutDashboard size={28} />
            </div>
            <h3 className="portal-title">Manager Workspace</h3>
            <p className="portal-desc">
              Create courses, manage department curriculum, and monitor team performance metrics.
            </p>
            <span className="portal-link">
              Sign in to Manager Workspace <ArrowRight size={16} className="portal-link-arrow" />
            </span>
          </div>

          <div className="portal-card" onClick={() => navigate('/login')}>
            <div className="portal-icon">
              <Briefcase size={28} />
            </div>
            <h3 className="portal-title">HR Workspace</h3>
            <p className="portal-desc">
              Manage departments, update user roles, audit training progression, and monitor team benchmarks.
            </p>
            <span className="portal-link">
              Sign in to HR Workspace <ArrowRight size={16} className="portal-link-arrow" />
            </span>
          </div>

          <div className="portal-card" onClick={() => navigate('/login')}>
            <div className="portal-icon">
              <Shield size={28} />
            </div>
            <h3 className="portal-title">Admin Console</h3>
            <p className="portal-desc">
              System configuration, user administration, and global reporting capabilities.
            </p>
            <span className="portal-link">
              Sign in to Admin Console <ArrowRight size={16} className="portal-link-arrow" />
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};
