import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Mail, Users, Building, ShieldAlert } from 'lucide-react';
import { Input } from '../../components/Input/Input';
import { Button } from '../../components/Button/Button';
import './Login.css';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  
  // Sign In states
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Employee');
  const [department, setDepartment] = useState('AI');
  
  // Forgot Password / OTP states
  const [loginMode, setLoginMode] = useState<'signin' | 'forgot_email' | 'forgot_otp' | 'forgot_reset'>('signin');
  const [resetEmail, setResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);

  // Loading and Error states
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  React.useEffect(() => {
    let interval: any;
    if (otpTimer > 0 && loginMode === 'forgot_otp') {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer, loginMode]);

  const validateForm = () => {
    const tempErrors: { [key: string]: string } = {};
    
    if (!employeeCode.trim()) {
      tempErrors.employeeCode = 'Employee Code or Email is required.';
    } else if (employeeCode.length < 3) {
      tempErrors.employeeCode = 'Must be at least 3 characters.';
    }

    if (!password) {
      tempErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      tempErrors.password = 'Password must be at least 6 characters.';
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    
    // Simulate API request to Python backend
    setTimeout(() => {
      setIsLoading(false);
      
      // Save session credentials
      localStorage.setItem('isLoggedInEmail', employeeCode.includes('@') ? employeeCode : `${employeeCode}@company.com`);
      localStorage.setItem('isLoggedInRole', role);
      localStorage.setItem('isLoggedInDept', department);
      
      // Navigate to role-based dashboard
      navigate('/dashboard');
    }, 1200);
  };

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setErrors({ resetEmail: 'Email address is required.' });
      return;
    }
    if (!resetEmail.includes('@')) {
      setErrors({ resetEmail: 'Invalid email address.' });
      return;
    }
    setIsLoading(true);
    setErrors({});
    setTimeout(() => {
      setIsLoading(false);
      setLoginMode('forgot_otp');
      setOtpTimer(30);
      alert('A demo OTP verification code has been dispatched. Enter 123456 to continue.');
    }, 1000);
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setErrors({ otpCode: 'OTP code is required.' });
      return;
    }
    if (otpCode !== '123456') {
      setErrors({ otpCode: 'Incorrect code. Enter 123456 to proceed.' });
      return;
    }
    setIsLoading(true);
    setErrors({});
    setTimeout(() => {
      setIsLoading(false);
      setLoginMode('forgot_reset');
    }, 1000);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const tempErrors: { [key: string]: string } = {};
    if (!newPassword) {
      tempErrors.newPassword = 'New password is required.';
    } else if (newPassword.length < 6) {
      tempErrors.newPassword = 'Must be at least 6 characters.';
    }
    if (newPassword !== confirmPassword) {
      tempErrors.confirmPassword = 'Passwords do not match.';
    }
    if (Object.keys(tempErrors).length > 0) {
      setErrors(tempErrors);
      return;
    }
    setIsLoading(true);
    setErrors({});
    setTimeout(() => {
      setIsLoading(false);
      alert('Password has been successfully updated!');
      setLoginMode('signin');
      setResetEmail('');
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
    }, 1000);
  };

  return (
    <div className="login-page">
      {/* Back Button */}
      <div className="login-header-nav">
        <button onClick={() => navigate('/')} className="back-btn">
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </button>
      </div>

      <div className="login-split-container">
        {/* Left Column - Clean Rebranded Info Side */}
        <div className="login-left-pane">
          <div className="left-pane-overlay"></div>
          <div className="left-pane-content animate-slide-left">
            <span className="left-pane-tag">Knowva</span>
            <h2>Corporate Learning & Development Portal</h2>
            <p>
              Welcome to the unified training system. Sign in with your corporate employee credentials to view assigned pathways, complete modules, and manage compliance.
            </p>

            {/* List of departments info box */}
            <div className="live-preview-widget glass-panel">
              <div className="preview-widget-header">
                <Building size={16} className="widget-icon" />
                <span>Connected L&D Departments</span>
              </div>
              <div className="preview-widget-body">
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  Providing training pathways across AI, Sales & Distribution, Material Management, Production Planning, Basis, FICO, ABAP, Graphic Design, HR & Admin, and Sales.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Inputs Form (50%) */}
        <div className="login-right-pane animate-fade-in">
          <div className="login-form-card glass-panel glow-hover">
            {loginMode === 'signin' && (
              <>
                <div className="form-heading">
                  <h2>Sign In</h2>
                  <p>Enter your credentials to access the Knowva platform.</p>
                </div>

                <form onSubmit={handleLoginSubmit} className="login-form">
                  {/* Employee Code / Email */}
                  <Input
                    label="Employee Code or Email"
                    placeholder="e.g. EMP-2035 or employee@company.com"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    error={errors.employeeCode}
                    leftIcon={<Mail size={18} />}
                  />

                  {/* Password */}
                  <div style={{ position: 'relative' }}>
                    <Input
                      label="Password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      error={errors.password}
                      leftIcon={<Lock size={18} />}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginMode('forgot_email');
                          setErrors({});
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-color)',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-title)',
                          fontWeight: '600',
                          padding: 0
                        }}
                      >
                        Forgot Password?
                      </button>
                    </div>
                  </div>

                  {/* Role Dropdown */}
                  <div className="select-group-container">
                    <label className="select-label">
                      <Users size={14} style={{ marginRight: '6px' }} />
                      Access Role
                    </label>
                    <div className="select-wrapper">
                      <select
                        className="custom-select-field"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      >
                        <option value="Employee">Employee (Learner)</option>
                        <option value="Manager">Manager (Creator)</option>
                        <option value="Admin">Administrator</option>
                      </select>
                    </div>
                  </div>

                  {/* Department Dropdown (Specific options) */}
                  <div className="select-group-container">
                    <label className="select-label">
                      <Building size={14} style={{ marginRight: '6px' }} />
                      Department
                    </label>
                    <div className="select-wrapper">
                      <select
                        className="custom-select-field"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                      >
                        <option value="AI">AI</option>
                        <option value="Sales and Distribution">Sales and Distribution</option>
                        <option value="Material Management">Material Management</option>
                        <option value="Production Planning">Production Planning</option>
                        <option value="Basis">Basis</option>
                        <option value="FICO Finance">FICO Finance</option>
                        <option value="PS">PS (Project System)</option>
                        <option value="ABAP">ABAP</option>
                        <option value="Graphic Design">Graphic Design</option>
                        <option value="HR and Admin">HR and Admin</option>
                        <option value="Sales and Marketing">Sales and Marketing</option>
                      </select>
                    </div>
                  </div>

                  {/* Submit */}
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isLoading}
                    className="login-submit-btn"
                  >
                    Sign In
                  </Button>
                </form>
              </>
            )}

            {loginMode === 'forgot_email' && (
              <>
                <div className="form-heading">
                  <h2>Forgot Password</h2>
                  <p>Enter your corporate email address to receive an OTP verification code.</p>
                </div>

                <form onSubmit={handleSendOTP} className="login-form">
                  <Input
                    label="Corporate Email Address"
                    placeholder="e.g. employee@company.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    error={errors.resetEmail}
                    leftIcon={<Mail size={18} />}
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isLoading}
                    className="login-submit-btn"
                  >
                    Send OTP Verification
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setLoginMode('signin');
                      setErrors({});
                    }}
                    className="login-submit-btn"
                  >
                    Back to Sign In
                  </Button>
                </form>
              </>
            )}

            {loginMode === 'forgot_otp' && (
              <>
                <div className="form-heading">
                  <h2>Verify OTP</h2>
                  <p>We have dispatched a 6-digit verification code to <strong>{resetEmail}</strong>.</p>
                </div>

                <form onSubmit={handleVerifyOTP} className="login-form">
                  <Input
                    label="6-Digit Verification Code"
                    placeholder="Enter 123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    error={errors.otpCode}
                    leftIcon={<Lock size={18} />}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <span>Didn't receive code?</span>
                    {otpTimer > 0 ? (
                      <span>Resend in {otpTimer}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setOtpTimer(30);
                          alert('OTP code has been resent! Enter 123456.');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-color)',
                          fontWeight: '600',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isLoading}
                    className="login-submit-btn"
                  >
                    Verify Code
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setLoginMode('signin');
                      setErrors({});
                    }}
                    className="login-submit-btn"
                  >
                    Back to Sign In
                  </Button>
                </form>
              </>
            )}

            {loginMode === 'forgot_reset' && (
              <>
                <div className="form-heading">
                  <h2>Reset Password</h2>
                  <p>Define a new secure password for your corporate profile.</p>
                </div>

                <form onSubmit={handleResetPassword} className="login-form">
                  <Input
                    label="New Password"
                    type="password"
                    placeholder="Enter new password (min. 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    error={errors.newPassword}
                    leftIcon={<Lock size={18} />}
                  />

                  <Input
                    label="Confirm New Password"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    error={errors.confirmPassword}
                    leftIcon={<Lock size={18} />}
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isLoading}
                    className="login-submit-btn"
                  >
                    Save Password & Sign In
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setLoginMode('signin');
                      setErrors({});
                    }}
                    className="login-submit-btn"
                  >
                    Back to Sign In
                  </Button>
                </form>
              </>
            )}

            <div className="form-info-banner">
              <ShieldAlert size={14} className="info-icon" />
              <span>
                Protected under corporate access policy. Your IP and login sessions are recorded.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
