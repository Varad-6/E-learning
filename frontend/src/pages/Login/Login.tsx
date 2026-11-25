import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Mail, Building, ShieldAlert } from 'lucide-react';
import { Input } from '../../components/Input/Input';
import { Button } from '../../components/Button/Button';
import { apiCall } from '../../services/api';
import './Login.css';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  
  // Sign In states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [departmentsList, setDepartmentsList] = useState<{ id: string; name: string; code: string }[]>([]);
  
  // Loading and Error states
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showTransition, setShowTransition] = useState(false);

  React.useEffect(() => {
    const fetchDepts = async () => {
      try {
        const response = await apiCall('/api/departments');
        if (response.ok) {
          const data = await response.json();
          setDepartmentsList(data);
        }
      } catch (err) {
        console.error('Failed to fetch departments on login page', err);
      }
    };
    fetchDepts();
  }, []);

  const validateForm = () => {
    const tempErrors: { [key: string]: string } = {};
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!email.trim()) {
      tempErrors.email = 'Corporate Email is required.';
    } else if (!emailRegex.test(email)) {
      tempErrors.email = 'Corporate Email address is invalid (invalid domain or suffix).';
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

    setIsLoading(true);
    setErrors({});
    
    try {
      const response = await apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email,
          password: password,
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
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('profileUserId', data.user.id);
      localStorage.setItem('isLoggedInEmail', data.user.email);
      
      const selectedDept = departmentsList.find(d => d.id === data.user.department_id);
      const isHRDept = Boolean(selectedDept && (selectedDept.code === 'HR' || selectedDept.name.toLowerCase().includes('hr')));

      const rawRolesList = data.roles || [];
      const roleNames: string[] = rawRolesList.map((r: any) => 
        (typeof r === 'object' && r !== null && 'name' in r) ? r.name : String(r)
      );
      const primaryRole = roleNames[0] || 'EMPLOYEE';

      let mappedRole = 'Employee';
      if (roleNames.includes('SYSTEM_ADMIN') || primaryRole === 'SYSTEM_ADMIN') {
        mappedRole = 'Admin';
      } else if (roleNames.includes('HR_ADMIN') || primaryRole === 'HR_ADMIN') {
        mappedRole = 'HR Admin';
      } else if (roleNames.includes('COURSE_MANAGER') || primaryRole === 'COURSE_MANAGER') {
        mappedRole = isHRDept ? 'HR Manager' : 'Manager';
      }
      
      localStorage.setItem('isLoggedInRole', mappedRole);
      localStorage.setItem('rawRoles', JSON.stringify(roleNames.length > 0 ? roleNames : [primaryRole]));
      
      // Sync department info
      if (selectedDept) {
        localStorage.setItem('isLoggedInDept', selectedDept.code);
        localStorage.setItem('profileDeptId', selectedDept.id);
        localStorage.setItem('isLoggedInDeptId', selectedDept.id);
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

  return (
    <div className="login-page">
      {showTransition && (
        <div className="login-transition-overlay">
          <div className="transition-content">
            <img src="/login_transition.gif" alt="Loading Portal" className="transition-gif" />
            <h3 className="transition-text">Establishing Secure Connection...</h3>
            <p className="transition-subtext">Loading Kaizen Training Platform</p>
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
            <span className="left-pane-tag">Kaizen</span>
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
            <div className="form-heading">
              <h2>Sign In</h2>
              <p>Enter your credentials to access the Kaizen platform.</p>
            </div>

            {errors.form && (
              <div className="form-info-banner" style={{ backgroundColor: 'var(--neon-coral-glow)', color: 'var(--neon-coral)', border: '1px solid var(--neon-coral)', marginBottom: '16px' }}>
                <ShieldAlert size={14} className="info-icon" style={{ color: 'var(--neon-coral)', marginRight: '8px' }} />
                <span>{errors.form}</span>
              </div>
            )}
            <form onSubmit={handleLoginSubmit} className="login-form">
              {/* Corporate Email */}
              <Input
                label="Corporate Email Address"
                placeholder="e.g. employee@company.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                leftIcon={<Mail size={18} />}
              />

              {/* Password */}
              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                leftIcon={<Lock size={18} />}
              />

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
