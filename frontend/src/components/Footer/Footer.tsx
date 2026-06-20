import React from 'react';
import './Footer.css';

export const Footer: React.FC = () => {
  return (
    <footer className="main-footer">
      <div className="footer-container container">
        <nav className="footer-support-nav">
          <a href="#docs" className="footer-link">Documentation</a>
          <a href="#help" className="footer-link">Help Center</a>
          <a href="#contact" className="footer-link">Contact Us</a>
        </nav>
        <div className="footer-bottom">
          <p className="copyright-text">
            &copy; {new Date().getFullYear()} Kiezen: Continuous Improvement Hub. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
