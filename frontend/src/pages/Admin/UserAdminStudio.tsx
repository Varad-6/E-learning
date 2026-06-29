import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, Search, Building2, RefreshCw, 
  Shield, CheckCircle2, AlertCircle, Plus, Eye, EyeOff,
  UserCheck, UserX, Trash2
} from 'lucide-react';
import { Button } from '../../components/Button/Button';
import { apiCall } from '../../services/api';
import './UserAdminStudio.css';

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Role {
  id: string;
  name: string;
}

interface UserData {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  department_id: string | null;
  is_active: boolean;
  is_deleted: boolean;
  must_change_password: boolean;
  created_at: string;
  roles: Role[];
  department?: Department | null;
}

interface ToastMsg {
  id: string;
  message: string;
  type: 'success' | 'error';
}

export const UserAdminStudio: React.FC = () => {
  const navigate = useNavigate();
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'registry' | 'create_user'>('registry');

  // Master lists
  const [users, setUsers] = useState<UserData[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Form states
  const [employeeCode, setEmployeeCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['EMPLOYEE']);
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Registry controls
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');

  // Toasts
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  // Authenticate user is admin
  useEffect(() => {
    const savedRole = localStorage.getItem('isLoggedInRole');
    if (savedRole !== 'Admin') {
      navigate('/dashboard');
    } else {
      loadData();
    }
  }, [navigate]);

  const loadData = async () => {
    setIsLoadingUsers(true);
    try {
      // 1. Fetch departments
      const deptsRes = await fetch('http://127.0.0.1:8000/api/departments');
      if (deptsRes.ok) {
        const deptsData = await deptsRes.json();
        setDepartments(deptsData);
      }

      // 2. Fetch users
      const usersRes = await apiCall('/api/admin/users');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users);
      }
    } catch (err) {
      console.error('Failed to load admin studio data', err);
      showToast('Connection to backend failed. Please verify API server status.', 'error');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    const newToast = { id: `toast-${Date.now()}`, message, type };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 4000);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let pass = '';
    // Require at least 1 uppercase, 1 lowercase, 1 digit, 1 special character
    pass += 'A' + 'a' + '9' + '!';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Shuffle the password
    pass = pass.split('').sort(() => 0.5 - Math.random()).join('');
    setPassword(pass);
    showToast('Secure password generated successfully', 'success');
  };

  const handleRoleCheckboxChange = (roleName: string) => {
    if (selectedRoles.includes(roleName)) {
      if (selectedRoles.length > 1) {
        setSelectedRoles(selectedRoles.filter((r) => r !== roleName));
      } else {
        showToast('At least one role must be assigned.', 'error');
      }
    } else {
      setSelectedRoles([...selectedRoles, roleName]);
    }
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!employeeCode.trim()) errors.employeeCode = 'Employee Code is required.';
    if (!firstName.trim()) errors.firstName = 'First Name is required.';
    if (!lastName.trim()) errors.lastName = 'Last Name is required.';
    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Email layout is invalid.';
    }
    if (!password) {
      errors.password = 'Initial Password is required.';
    } else if (password.length < 8) {
      errors.password = 'Password must meet length policy (min. 8 chars).';
    } else if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      errors.password = 'Password must include uppercase, lowercase, and a number.';
    }
    if (selectedRoles.length === 0) {
      errors.roles = 'At least one role is required.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setFormLoading(true);
    try {
      const payload = {
        employee_code: employeeCode,
        first_name: firstName,
        last_name: lastName,
        email: email,
        password: password,
        department_id: selectedDeptId || null,
        roles: selectedRoles
      };

      const res = await apiCall('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.detail || 'Failed to create user profile.', 'error');
        return;
      }

      showToast(`User ${firstName} ${lastName} created successfully!`, 'success');
      
      // Reset form states
      setEmployeeCode('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setSelectedDeptId('');
      setSelectedRoles(['EMPLOYEE']);
      setFormErrors({});

      // Reload registry and switch tabs
      await loadData();
      setActiveTab('registry');
    } catch (err) {
      console.error('Error creating user', err);
      showToast('Connection error. Failed to save user details.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleUserActive = async (userId: string, currentActive: boolean) => {
    try {
      const res = await apiCall(`/api/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({
          is_active: !currentActive
        })
      });

      if (res.ok) {
        setUsers((prev) => 
          prev.map((u) => u.id === userId ? { ...u, is_active: !currentActive } : u)
        );
        showToast(
          `User account status changed to ${!currentActive ? 'Active' : 'Inactive'}`,
          'success'
        );
      } else {
        const err = await res.json();
        showToast(err.detail || 'Failed to update user status.', 'error');
      }
    } catch (error) {
      console.error('Error toggling user status', error);
      showToast('Network error. Failed to toggle user status.', 'error');
    }
  };

  const handleSoftDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user profile?')) return;
    
    try {
      const res = await apiCall(`/api/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({
          is_deleted: true
        })
      });

      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        showToast('User profile deleted successfully.', 'success');
      } else {
        const err = await res.json();
        showToast(err.detail || 'Failed to delete user profile.', 'error');
      }
    } catch (error) {
      console.error('Error deleting user', error);
      showToast('Network error. Failed to delete user.', 'error');
    }
  };

  // Filters logic
  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.employee_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = 
      roleFilter === 'All' || 
      user.roles.some((r) => r.name.toUpperCase() === roleFilter.toUpperCase());

    const matchesDept = 
      deptFilter === 'All' || 
      (user.department && user.department.code === deptFilter) ||
      (deptFilter === 'General' && !user.department_id);

    return matchesSearch && matchesRole && matchesDept;
  });

  return (
    <div className="admin-workspace container">
      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-message ${t.type}`}>
            <span className={`toast-icon ${t.type}`}>
              {t.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            </span>
            <span className="toast-text">{t.message}</span>
          </div>
        ))}
      </div>

      <div className="admin-header">
        <div>
          <h1>User Administration Studio</h1>
          <p>Register new platform nodes, assign corporate departments, and orchestrate RBAC permissions.</p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="admin-stats-row">
        <div className="admin-stat-card glass-panel">
          <div className="stat-icon-wrapper blue">
            <Users size={24} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-val">{users.length}</span>
            <span className="admin-stat-lbl">Total Users</span>
          </div>
        </div>
        <div className="admin-stat-card glass-panel">
          <div className="stat-icon-wrapper green">
            <UserCheck size={24} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-val">{users.filter(u => u.is_active).length}</span>
            <span className="admin-stat-lbl">Active Users</span>
          </div>
        </div>
        <div className="admin-stat-card glass-panel">
          <div className="stat-icon-wrapper purple">
            <Building2 size={24} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-val">{departments.length}</span>
            <span className="admin-stat-lbl">Departments</span>
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="sidebar-tabs-header">
        <button 
          className={`sidebar-tab-btn ${activeTab === 'registry' ? 'active' : ''}`}
          onClick={() => setActiveTab('registry')}
        >
          👤 User Registry ({filteredUsers.length})
        </button>
        <button 
          className={`sidebar-tab-btn ${activeTab === 'create_user' ? 'active' : ''}`}
          onClick={() => setActiveTab('create_user')}
          style={{ borderLeft: '2px solid var(--accent-color)' }}
        >
          <Plus size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          Create New User
        </button>
      </div>

      {/* Content panes */}
      <div className="users-studio-content">
        {/* Tab 1: User Registry Grid */}
        {activeTab === 'registry' && (
          <div className="users-studio-grid">
            <div className="admin-main-pane glass-panel">
              <div className="pane-title">
                <Users size={20} style={{ color: 'var(--accent-color)' }} />
                <span>Active Corporate Directory</span>
              </div>
              <p className="pane-subtitle">Search database entries and toggle account active states</p>

              {/* Table search and filters */}
              <div className="table-controls">
                <div className="search-input-wrapper">
                  <Search size={16} className="search-icon-inside" />
                  <input 
                    type="text" 
                    placeholder="Search by Employee Code, Name, or Email..." 
                    className="search-field"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <select 
                    className="filter-select"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="All">Filter by Role (All)</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="EMPLOYEE">EMPLOYEE</option>
                  </select>

                  <select 
                    className="filter-select"
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                  >
                    <option value="All">Filter by Dept (All)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.code}>{d.name}</option>
                    ))}
                    <option value="General">No Department</option>
                  </select>

                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={loadData}
                    disabled={isLoadingUsers}
                    leftIcon={<RefreshCw size={14} className={isLoadingUsers ? 'spin-animation' : ''} />}
                  >
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Users Registry Table */}
              <div className="registry-table-wrapper">
                {isLoadingUsers ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <RefreshCw className="spin-animation" size={24} style={{ marginBottom: '10px' }} />
                    <p>Loading registry nodes from database...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <AlertCircle size={28} style={{ marginBottom: '10px', color: 'var(--neon-coral)' }} />
                    <p>No user records matched selected query and filters.</p>
                  </div>
                ) : (
                  <table className="registry-table">
                    <thead>
                      <tr>
                        <th>Employee ID</th>
                        <th>Full Name</th>
                        <th>Email Contact</th>
                        <th>Department</th>
                        <th>Assigned RBAC Roles</th>
                        <th>Account Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td><span className="code-badge">{user.employee_code}</span></td>
                          <td style={{ fontWeight: '600' }}>{user.first_name} {user.last_name}</td>
                          <td><code>{user.email}</code></td>
                          <td>
                            {user.department ? (
                              <span style={{ fontSize: '0.85rem' }}>{user.department.name} ({user.department.code})</span>
                            ) : (
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontStyle: 'italic' }}>Unassigned</span>
                            )}
                          </td>
                          <td>
                            {user.roles.map((r) => (
                              <span 
                                key={r.id} 
                                className={`role-tag ${r.name.toLowerCase()}`}
                              >
                                {r.name}
                              </span>
                            ))}
                          </td>
                          <td>
                            <span className="status-indicator">
                              <span className={`status-dot ${user.is_active ? 'active' : 'inactive'}`}></span>
                              <span>{user.is_active ? 'Active' : 'Suspended'}</span>
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <Button 
                                variant="outline"
                                size="sm"
                                title={user.is_active ? 'Suspend Account' : 'Activate Account'}
                                onClick={() => handleToggleUserActive(user.id, user.is_active)}
                                style={{ padding: '6px 8px' }}
                              >
                                {user.is_active ? <UserX size={14} style={{ color: 'var(--neon-coral)' }} /> : <UserCheck size={14} style={{ color: 'var(--neon-teal)' }} />}
                              </Button>
                              <Button 
                                variant="outline"
                                size="sm"
                                title="Delete User"
                                onClick={() => handleSoftDeleteUser(user.id)}
                                style={{ padding: '6px 8px' }}
                              >
                                <Trash2 size={14} style={{ color: 'var(--neon-coral)' }} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Create User Form */}
        {activeTab === 'create_user' && (
          <div className="users-studio-grid split">
            <div className="admin-main-pane glass-panel">
              <div className="pane-title">
                <UserPlus size={20} style={{ color: 'var(--accent-color)' }} />
                <span>Register New Corporate Account</span>
              </div>
              <p className="pane-subtitle">Assign default profiles, select department alignments, and assign security roles.</p>

              <form onSubmit={handleCreateUserSubmit} className="user-form">
                
                {/* Employee Code & Email */}
                <div className="form-row-split">
                  <div>
                    <label className="form-label-styled">Employee Code (Code/ID)<span className="required-star">*</span></label>
                    <input 
                      type="text" 
                      placeholder="e.g. EMP102"
                      className={`form-input-styled ${formErrors.employeeCode ? 'input-error' : ''}`}
                      value={employeeCode}
                      onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                    />
                    {formErrors.employeeCode && <span className="error-text-span" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{formErrors.employeeCode}</span>}
                  </div>
                  <div>
                    <label className="form-label-styled">Corporate Email Address<span className="required-star">*</span></label>
                    <input 
                      type="email" 
                      placeholder="e.g. employee@lms.com"
                      className={`form-input-styled ${formErrors.email ? 'input-error' : ''}`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    {formErrors.email && <span className="error-text-span" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{formErrors.email}</span>}
                  </div>
                </div>

                {/* Names */}
                <div className="form-row-split">
                  <div>
                    <label className="form-label-styled">First Name<span className="required-star">*</span></label>
                    <input 
                      type="text" 
                      placeholder="Enter first name"
                      className={`form-input-styled ${formErrors.firstName ? 'input-error' : ''}`}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                    {formErrors.firstName && <span className="error-text-span" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{formErrors.firstName}</span>}
                  </div>
                  <div>
                    <label className="form-label-styled">Last Name<span className="required-star">*</span></label>
                    <input 
                      type="text" 
                      placeholder="Enter last name"
                      className={`form-input-styled ${formErrors.lastName ? 'input-error' : ''}`}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                    {formErrors.lastName && <span className="error-text-span" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{formErrors.lastName}</span>}
                  </div>
                </div>

                {/* Password Selection */}
                <div>
                  <label className="form-label-styled">Password<span className="required-star">*</span></label>
                  <div className="password-input-container">
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      placeholder="Choose or generate a strong password"
                      className={`form-input-styled ${formErrors.password ? 'input-error' : ''}`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ paddingRight: '120px' }}
                    />
                    <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '6px' }}>
                      <button 
                        type="button" 
                        className="password-generate-btn"
                        onClick={generateRandomPassword}
                      >
                        Generate
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  {formErrors.password ? (
                    <span className="error-text-span" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{formErrors.password}</span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                      Password resets will be required upon first successful login sequence.
                    </span>
                  )}
                </div>

                {/* Department Dropdown */}
                <div>
                  <label className="form-label-styled">Corporate Department Alignment</label>
                  <select 
                    className="form-select-styled"
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                  >
                    <option value="">-- No Department Assignment --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>

                {/* Role Selections */}
                <div>
                  <label className="form-label-styled">Assigned RBAC Security Roles<span className="required-star">*</span></label>
                  <div className="role-checkbox-group">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox"
                        className="checkbox-input"
                        checked={selectedRoles.includes('ADMIN')}
                        onChange={() => handleRoleCheckboxChange('ADMIN')}
                      />
                      <span>ADMIN</span>
                    </label>
                    
                    <label className="checkbox-label">
                      <input 
                        type="checkbox"
                        className="checkbox-input"
                        checked={selectedRoles.includes('MANAGER')}
                        onChange={() => handleRoleCheckboxChange('MANAGER')}
                      />
                      <span>MANAGER (Dept Head)</span>
                    </label>
                    
                    <label className="checkbox-label">
                      <input 
                        type="checkbox"
                        className="checkbox-input"
                        checked={selectedRoles.includes('EMPLOYEE')}
                        onChange={() => handleRoleCheckboxChange('EMPLOYEE')}
                      />
                      <span>EMPLOYEE (Learner)</span>
                    </label>
                  </div>
                  {formErrors.roles && <span className="error-text-span" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{formErrors.roles}</span>}
                </div>

                {/* Form Buttons */}
                <div className="form-actions">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setActiveTab('registry')}
                    disabled={formLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    variant="primary" 
                    isLoading={formLoading}
                  >
                    Submit Register Node
                  </Button>
                </div>
              </form>
            </div>

            {/* Instruction Sidebar */}
            <div className="admin-side-pane glass-panel">
              <div className="pane-title">
                <Shield size={20} style={{ color: 'var(--neon-teal)' }} />
                <span>Security Notice</span>
              </div>
              <p className="pane-subtitle">Orchestration & RBAC Policy Guidelines</p>
              
              <div className="depts-registry-list" style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>1. Must Change Password Flags</strong>
                  Created accounts are seeded with the <code>must_change_password</code> flag set to true by default. Learners must reset credentials upon the first landing verification screen.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>2. Role Privileges Mapping</strong>
                  <ul>
                    <li><strong>ADMIN</strong>: Global configurations, audit tables, department registries, and user creations.</li>
                    <li><strong>MANAGER</strong>: Syllabus drafting, department-wide analytics, and course progress audits.</li>
                    <li><strong>EMPLOYEE</strong>: Access to courses, module content, and quiz completions.</li>
                  </ul>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>3. Unique Code Validation</strong>
                  Every registry employee code must remain unique system-wide. Duplicate entries will throw 400 Bad Request claims immediately from the service layer.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
