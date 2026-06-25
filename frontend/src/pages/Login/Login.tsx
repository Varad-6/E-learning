import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Mail, Users, Building, ShieldAlert } from 'lucide-react';
import { Input } from '../../components/Input/Input';
import { Button } from '../../components/Button/Button';
import { apiCall } from '../../services/api';
import './Login.css';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  
  // Sign In states
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [departmentsList, setDepartmentsList] = useState<{ id: string; name: string; code: string }[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  
  // Forgot Password / OTP states
  const [loginMode, setLoginMode] = useState<'signin' | 'forgot_email' | 'forgot_otp' | 'forgot_reset'>('signin');
  const [resetEmployeeCode, setResetEmployeeCode] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);

  // Loading and Error states
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showTransition, setShowTransition] = useState(false);

  React.useEffect(() => {
    let interval: any;
    if (otpTimer > 0 && loginMode === 'forgot_otp') {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer, loginMode]);

  React.useEffect(() => {
    const fetchDepts = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/departments');
        if (response.ok) {
          const data = await response.json();
          setDepartmentsList(data);
          if (data.length > 0) {
            setSelectedDeptId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch departments on login page', err);
      }
    };
    fetchDepts();
  }, []);

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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!selectedDeptId) {
      setErrors({ form: 'Department selection is required.' });
      return;
    }

    setIsLoading(true);
    setErrors({});
    
    try {
      const response = await apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          employee_code: employeeCode,
          password: password,
          department_id: selectedDeptId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ form: data.detail || 'Login failed. Please verify credentials.' });
        setIsLoading(false);
        return;
      }

      // Save JWT tokens
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);

      // Save session credentials
      localStorage.setItem('isLoggedInEmail', data.user.email);
      
      const backendRole = data.roles[0] || 'EMPLOYEE';
      let mappedRole = 'Employee';
      if (backendRole === 'MANAGER' || backendRole === 'CREATOR') mappedRole = 'Manager';
      else if (backendRole === 'ADMIN') mappedRole = 'Admin';
      
      localStorage.setItem('isLoggedInRole', mappedRole);
      
      // Sync department info
      const selectedDept = departmentsList.find(d => d.id === selectedDeptId);
      if (selectedDept) {
        localStorage.setItem('isLoggedInDept', selectedDept.code);
        localStorage.setItem('profileDeptId', selectedDept.id);
      } else {
        localStorage.setItem('isLoggedInDept', 'General');
      }
      
      // Sync profile details
      const fullName = `${data.user.first_name} ${data.user.last_name}`;
      localStorage.setItem('profileName', fullName);
      localStorage.setItem('profileEmpId', data.user.employee_code);

      setIsLoading(false);
      setShowTransition(true);

      setTimeout(() => {
        if (mappedRole === 'Manager') {
          navigate('/creator/dashboard');
        } else {
          navigate('/dashboard');
        }
      }, 2500);
    } catch (err: any) {
      setIsLoading(false);
      setErrors({ form: err.message || 'Server connection failed. Is the backend running?' });
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmployeeCode.trim()) {
      setErrors({ resetEmployeeCode: 'Employee code is required.' });
      return;
    }
    setIsLoading(true);
    setErrors({});
    try {
      const response = await apiCall('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ employee_code: resetEmployeeCode }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrors({ form: data.detail || 'Failed to dispatch OTP.' });
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
      setLoginMode('forgot_otp');
      setOtpTimer(30);
      alert('A security OTP code has been dispatched to your email.');
    } catch (err: any) {
      setIsLoading(false);
      setErrors({ form: err.message || 'Connection failed.' });
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setErrors({ otpCode: 'OTP code is required.' });
      return;
    }
    setIsLoading(true);
    setErrors({});
    try {
      const response = await apiCall('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          employee_code: resetEmployeeCode,
          otp: otpCode
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrors({ form: data.detail || 'OTP verification failed.' });
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
      setLoginMode('forgot_reset');
    } catch (err: any) {
      setIsLoading(false);
      setErrors({ form: err.message || 'Connection failed.' });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
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
    try {
      const response = await apiCall('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          employee_code: resetEmployeeCode,
          otp: otpCode,
          new_password: newPassword
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrors({ form: data.detail || 'Password reset failed.' });
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
      alert('Password has been successfully updated!');
      setLoginMode('signin');
      setResetEmployeeCode('');
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setIsLoading(false);
      setErrors({ form: err.message || 'Connection failed.' });
    }
  };

  return (
    <div className="login-page">
      {showTransition && (
        <div className="login-transition-overlay">
          <div className="transition-content">
            <img src="/login_transition.gif" alt="Loading Portal" className="transition-gif" />
            <h3 className="transition-text">Establishing Secure Connection...</h3>
            <p className="transition-subtext">Loading Kiezen Training Platform</p>
          </div>
        </div>
      )}
      
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
            <span className="left-pane-tag">Kiezen</span>
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
                  <p>Enter your credentials to access the Kiezen platform.</p>
                </div>

                {errors.form && (
                  <div className="form-info-banner" style={{ backgroundColor: 'var(--neon-coral-glow)', color: 'var(--neon-coral)', border: '1px solid var(--neon-coral)', marginBottom: '16px' }}>
                    <ShieldAlert size={14} className="info-icon" style={{ color: 'var(--neon-coral)', marginRight: '8px' }} />
                    <span>{errors.form}</span>
                  </div>
                )}
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

                  {/* Department select input */}
                  <div className="form-group-spaced" style={{ marginTop: '16px' }}>
                    <label className="form-label-styled" style={{ display: 'block', fontSize: '0.88rem', fontWeight: '600', marginBottom: '8px' }}>
                      Select Department <span className="required-star">*</span>
                    </label>
                    <select
                      className="form-select-styled"
                      value={selectedDeptId}
                      onChange={(e) => setSelectedDeptId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Department --</option>
                      {departmentsList.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
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
                  <p>Enter your employee code to receive an OTP verification email.</p>
                </div>

                {errors.form && (
                  <div className="form-info-banner" style={{ backgroundColor: 'var(--neon-coral-glow)', color: 'var(--neon-coral)', border: '1px solid var(--neon-coral)', marginBottom: '16px' }}>
                    <ShieldAlert size={14} className="info-icon" style={{ color: 'var(--neon-coral)', marginRight: '8px' }} />
                    <span>{errors.form}</span>
                  </div>
                )}
                <form onSubmit={handleSendOTP} className="login-form">
                  <Input
                    label="Employee Code"
                    placeholder="e.g. EMP001"
                    value={resetEmployeeCode}
                    onChange={(e) => setResetEmployeeCode(e.target.value)}
                    error={errors.resetEmployeeCode}
                    leftIcon={<Users size={18} />}
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
                  <p>We have dispatched a 6-digit verification code to your email.</p>
                </div>

                {errors.form && (
                  <div className="form-info-banner" style={{ backgroundColor: 'var(--neon-coral-glow)', color: 'var(--neon-coral)', border: '1px solid var(--neon-coral)', marginBottom: '16px' }}>
                    <ShieldAlert size={14} className="info-icon" style={{ color: 'var(--neon-coral)', marginRight: '8px' }} />
                    <span>{errors.form}</span>
                  </div>
                )}
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

                {errors.form && (
                  <div className="form-info-banner" style={{ backgroundColor: 'var(--neon-coral-glow)', color: 'var(--neon-coral)', border: '1px solid var(--neon-coral)', marginBottom: '16px' }}>
                    <ShieldAlert size={14} className="info-icon" style={{ color: 'var(--neon-coral)', marginRight: '8px' }} />
                    <span>{errors.form}</span>
                  </div>
                )}
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
