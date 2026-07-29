import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, Search, Building2, RefreshCw, 
  Shield, CheckCircle2, AlertCircle, Plus, Eye, EyeOff,
  UserCheck, UserX, Trash2, ArrowLeft, BarChart3, Award
} from 'lucide-react';
import { Button } from '../../components/Button/Button';
import { Modal } from '../../components/Modal/Modal';
import { apiCall } from '../../services/api';
import { OTPInput } from '../../components/OTPInput/OTPInput';
import { useToast } from '../../context/ToastContext';
import { getBadgeForCompletions } from '../../services/badge';
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

export const UserAdminStudio: React.FC = () => {
  const navigate = useNavigate();
  const { triggerToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'users' | 'departments' | 'create_user' | 'create_department'>('departments');
  const [users, setUsers] = useState<UserData[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Department Detail State
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [deptTab, setDeptTab] = useState<'employees' | 'managers'>('employees');

  // Reporting Modal State
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [userProfileData, setUserProfileData] = useState<any | null>(null);
  const [userBadges, setUserBadges] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

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

  // Create Department Modal State
  const [showCreateDeptModal, setShowCreateDeptModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [deptSubmitting, setDeptSubmitting] = useState(false);

  // Email verification states for user creation
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [verificationOtp, setVerificationOtp] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (otpCooldown > 0) {
      timer = setInterval(() => {
        setOtpCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpCooldown]);

  const handleEmailChange = (val: string) => {
    setEmail(val);
    setIsEmailVerified(false);
    setOtpSent(false);
    setVerificationOtp('');
  };

  useEffect(() => {
    const savedRole = localStorage.getItem('isLoggedInRole');
    let rawRoles: string[] = [];
    try { rawRoles = JSON.parse(localStorage.getItem('rawRoles') || '[]'); } catch {}
    
    const isAdmin = savedRole === 'Admin' || savedRole === 'HR Admin' || savedRole === 'HR Manager' || savedRole === 'HR' || rawRoles.includes('SYSTEM_ADMIN') || rawRoles.includes('HR_ADMIN');
    
    if (!isAdmin) {
      navigate('/dashboard');
    } else {
      loadData();
    }
  }, [navigate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const deptsRes = await apiCall('/api/departments');
      if (deptsRes.ok) {
        const deptsData = await deptsRes.json();
        setDepartments(deptsData);
      }
      const usersRes = await apiCall('/api/admin/users');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users);
      }
    } catch (err) {
      console.error('Failed to load admin studio data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenUserModal = async (user: UserData) => {
    setSelectedUser(user);
    setUserProfileData(null);
    setUserBadges([]);
    setModalError(null);
    setModalLoading(true);
    try {
      const detailRes = await apiCall(`/api/reporting/employees/${user.id}/detail`);
      const badgesRes = await apiCall(`/api/users/${user.id}/badges`);
      if (detailRes.ok) {
        const data = await detailRes.json();
        setUserProfileData(data);
      } else {
        const err = await detailRes.json();
        setModalError(err.detail || 'Failed to retrieve employee analytics profile.');
      }
      if (badgesRes.ok) {
        const badgesData = await badgesRes.json();
        setUserBadges(badgesData || []);
      }
    } catch (err) {
      console.error(err);
      setModalError('A network error occurred while establishing contact with the reporting service.');
    } finally {
      setModalLoading(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let pass = 'A' + 'a' + '9' + '!';
    for (let i = 0; i < 8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setPassword(pass.split('').sort(() => 0.5 - Math.random()).join(''));
  };

  const handleSendVerificationOtp = async () => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email.trim() || !emailRegex.test(email)) {
      triggerToast('Please enter a valid corporate email address first.', 'warning');
      return;
    }
    setFormLoading(true);
    try {
      const res = await apiCall('/api/users/send-verification-otp', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        setOtpCooldown(30);
        triggerToast('Verification code sent successfully to email.', 'success');
      } else {
        triggerToast(data.detail || 'Could not send the verification code. Please try again.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      triggerToast('Could not connect to the verification service. Please try again.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleVerifyVerificationOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationOtp.length !== 6) {
      triggerToast('Verification code must be exactly 6 digits.', 'warning');
      return;
    }
    setIsVerifyingOtp(true);
    try {
      const res = await apiCall('/api/users/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: verificationOtp
        })
      });
      const data = await res.json();
      if (res.ok) {
        setIsEmailVerified(true);
        triggerToast('Email address verified successfully!', 'success');
      } else {
        triggerToast(data.detail || 'The code is invalid or has expired.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      triggerToast('Could not verify the code. Please try again.', 'error');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!employeeCode.trim()) errors.employeeCode = 'Required.';
    if (!firstName.trim()) errors.firstName = 'Required.';
    if (!lastName.trim()) errors.lastName = 'Required.';
    if (!email.trim()) errors.email = 'Required.';
    if (!password) errors.password = 'Required.';
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
      if (res.ok) {
        triggerToast(`User ${firstName} ${lastName} created successfully!`, 'success');
        setEmployeeCode(''); setFirstName(''); setLastName(''); setEmail(''); setPassword('');
        setSelectedDeptId(''); setSelectedRoles(['EMPLOYEE']); setFormErrors({});
        setIsEmailVerified(false); setOtpSent(false); setVerificationOtp(''); setOtpCooldown(0);
        await loadData();
        setActiveTab('users');
      } else {
        const errData = await res.json().catch(() => ({}));
        triggerToast(errData.detail || 'Could not create the user. Please check details and try again.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      triggerToast('Could not create the user. Please try again.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim() || !newDeptCode.trim()) {
      triggerToast('Department Name and Code are required.', 'warning');
      return;
    }
    setDeptSubmitting(true);
    try {
      const res = await apiCall('/api/departments', {
        method: 'POST',
        body: JSON.stringify({
          name: newDeptName.trim(),
          code: newDeptCode.trim().toUpperCase(),
          description: newDeptDesc.trim() || null
        })
      });
      if (res.ok) {
        triggerToast('Department created successfully!', 'success');
        setNewDeptName('');
        setNewDeptCode('');
        setNewDeptDesc('');
        setShowCreateDeptModal(false);
        setActiveTab('departments');
        window.dispatchEvent(new CustomEvent('kaizen_departments_changed'));
        loadData();
      } else {
        const err = await res.json();
        triggerToast(err.detail || 'Could not create the department. Please check details and try again.', 'error');
      }
    } catch (e) {
      console.error(e);
      triggerToast('Could not create the department. Please check your internet and try again.', 'error');
    } finally {
      setDeptSubmitting(false);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsDeletingUser(true);
    try {
      const res = await apiCall(`/api/admin/users/${selectedUser.id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerToast(`User ${selectedUser.first_name} ${selectedUser.last_name} deleted successfully.`, 'success');
        setSelectedUser(null);
        setShowDeleteConfirm(false);
        await loadData();
      } else {
        const err = await res.json();
        triggerToast(err.detail || 'Could not delete the user. Please try again.', 'error');
      }
    } catch (e) {
      console.error(e);
      triggerToast('Could not delete the user. Please check your internet and try again.', 'error');
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Filter users for the selected department
  const deptUsers = users.filter(u => selectedDept && u.department_id === selectedDept.id);
  const deptEmployees = deptUsers.filter(u => u.roles.some(r => r.name === 'EMPLOYEE'));
  const deptManagers = deptUsers.filter(u => u.roles.some(r => r.name === 'COURSE_MANAGER' || r.name === 'HR_ADMIN'));

  const activeUsersToDisplay = deptTab === 'employees' ? deptEmployees : deptManagers;

  return (
    <div className="admin-workspace container animate-fade-in" style={{ padding: '40px 24px', paddingBottom: '60px' }}>
      
      {/* Header Tabs */}
      {(activeTab === 'departments' || activeTab === 'users') && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>User Administration</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '6px', marginBottom: 0 }}>Manage departments, personnel, and analytics.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Button 
              variant={activeTab === 'departments' ? 'primary' : 'outline'} 
              onClick={() => { setActiveTab('departments'); setSelectedDept(null); }}
            >
              Departments
            </Button>
            <Button 
              variant={activeTab === 'users' ? 'primary' : 'outline'} 
              onClick={() => { setActiveTab('users'); setSelectedDept(null); }}
            >
              Users Directory
            </Button>
          </div>
        </div>
      )}

      {/* Departments Tab View */}
      {activeTab === 'departments' && !selectedDept && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {departments.length} Active Departments
            </span>
            <Button 
              variant="primary" 
              leftIcon={<Plus size={16} />} 
              onClick={() => setActiveTab('create_department')}
            >
              Create Department
            </Button>
          </div>
          
          <div className="department-grid">
            {departments.map(dept => {
              const headcount = users.filter(u => u.department_id === dept.id).length;
              return (
                <div key={dept.id} className="dept-card glass-panel" onClick={() => setSelectedDept(dept)}>
                  <div className="dept-card-header">
                    <div className="dept-icon"><Building2 size={24} /></div>
                    <div>
                      <h3 className="dept-name">{dept.name}</h3>
                      <span className="dept-code">{dept.code}</span>
                    </div>
                  </div>
                  <div className="dept-card-footer">
                    <span className="headcount"><Users size={16}/> {headcount} Members</span>
                    <span className="view-link">View Employees &rarr;</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Department Detail View */}
      {activeTab === 'departments' && selectedDept && (
        <div className="dept-detail-view animate-fade-in">
          <Button variant="outline" onClick={() => setSelectedDept(null)} style={{ marginBottom: '24px' }}>
            <ArrowLeft size={16} style={{ marginRight: '8px' }}/> Back to Departments
          </Button>
          
          <div className="dept-detail-header glass-panel">
            <h2>{selectedDept.name} ({selectedDept.code})</h2>
            <div className="dept-tabs">
              <button className={`dept-tab ${deptTab === 'employees' ? 'active' : ''}`} onClick={() => setDeptTab('employees')}>
                Employees ({deptEmployees.length})
              </button>
              <button className={`dept-tab ${deptTab === 'managers' ? 'active' : ''}`} onClick={() => setDeptTab('managers')}>
                Project Managers ({deptManagers.length})
              </button>
            </div>
          </div>

          <div className="personnel-list">
            {activeUsersToDisplay.length === 0 ? (
              <div style={{ padding: 'var(--space-card-padding)', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--border-color)' }}>
                No personnel found in this category.
              </div>
            ) : (
              activeUsersToDisplay.map(user => (
                <div 
                  key={user.id} 
                  className="personnel-card animate-fade-in" 
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'var(--transition-smooth)' }}
                >
                  <div className="person-info">
                    <div className="person-avatar">{user.first_name[0]}{user.last_name[0]}</div>
                    <div>
                      <h4 className="person-name">{user.first_name} {user.last_name}</h4>
                      <span className="person-role">{user.employee_code} • {user.email}</span>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    style={{ borderColor: 'var(--danger-color)', color: 'var(--danger-color)', width: '32px', height: '32px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedUser(user);
                      setShowDeleteConfirm(true);
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Users Directory View */}
      {activeTab === 'users' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '12px', flex: 1, maxWidth: '400px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  className="form-input-styled"
                  placeholder="Search users by name, email, code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                />
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {users.length} Registered Users
              </span>
              <Button 
                id="btn-nav-add-user" 
                variant="primary" 
                leftIcon={<Plus size={16} />} 
                onClick={() => setActiveTab('create_user')}
              >
                Add User
              </Button>
            </div>
          </div>

          <div className="personnel-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {users.filter(u => {
              const term = searchTerm.toLowerCase();
              return (
                u.first_name.toLowerCase().includes(term) ||
                u.last_name.toLowerCase().includes(term) ||
                u.email.toLowerCase().includes(term) ||
                u.employee_code.toLowerCase().includes(term)
              );
            }).length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--border-color)' }}>
                No users match your search criteria.
              </div>
            ) : (
              users.filter(u => {
                const term = searchTerm.toLowerCase();
                return (
                  u.first_name.toLowerCase().includes(term) ||
                  u.last_name.toLowerCase().includes(term) ||
                  u.email.toLowerCase().includes(term) ||
                  u.employee_code.toLowerCase().includes(term)
                );
              }).map(user => {
                const roleLabel = user.roles[0]?.name || 'EMPLOYEE';
                const deptName = user.department?.name || 'Unscoped / No Department';
                
                return (
                  <div 
                    key={user.id} 
                    className="personnel-card animate-fade-in" 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '16px 20px', 
                      background: 'var(--bg-card)', 
                      borderRadius: 'var(--border-radius-md)', 
                      border: '1px solid var(--border-color)',
                      transition: 'var(--transition-smooth)'
                    }}
                  >
                    <div className="person-info" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div className="person-avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        {user.first_name[0]}{user.last_name[0]}
                      </div>
                      <div>
                        <h4 className="person-name" style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 700 }}>
                          {user.first_name} {user.last_name}
                        </h4>
                        <span className="person-role" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {user.employee_code} • {user.email}
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {deptName}
                        </span>
                        <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Department
                        </span>
                      </div>
                      
                      <span style={{ 
                        fontSize: '0.72rem', 
                        fontWeight: 700, 
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        background: roleLabel === 'SYSTEM_ADMIN' ? 'rgba(239, 68, 68, 0.1)' : roleLabel === 'HR_ADMIN' ? 'rgba(168, 85, 247, 0.1)' : roleLabel === 'COURSE_MANAGER' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: roleLabel === 'SYSTEM_ADMIN' ? 'var(--danger-color)' : roleLabel === 'HR_ADMIN' ? '#a855f7' : roleLabel === 'COURSE_MANAGER' ? '#3b82f6' : 'var(--accent-color)'
                      }}>
                        {roleLabel.replace('_', ' ')}
                      </span>

                      <Button 
                        variant="outline" 
                        style={{ borderColor: 'var(--danger-color)', color: 'var(--danger-color)', width: '32px', height: '32px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUser(user);
                          setShowDeleteConfirm(true);
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm && !!selectedUser}
        onClose={() => { setShowDeleteConfirm(false); setSelectedUser(null); }}
        title="Confirm User Deletion"
        icon={<AlertCircle style={{ color: 'var(--danger-color)' }} size={24} />}
        maxWidth="440px"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setSelectedUser(null); }} disabled={isDeletingUser}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              style={{ background: 'var(--danger-color)', borderColor: 'var(--danger-color)', color: '#fff' }} 
              onClick={handleDeleteUser}
              disabled={isDeletingUser}
            >
              {isDeletingUser ? 'Deleting...' : 'Yes, Delete User'}
            </Button>
          </>
        }
      >
        <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.5', margin: 0 }}>
          Are you sure you want to deactivate and soft-delete user <strong>{selectedUser?.first_name} {selectedUser?.last_name}</strong> (<code>{selectedUser?.email}</code>)? Their historical activity and certificates will be preserved for auditing.
        </p>
      </Modal>

      {/* Create Department Tab View */}
      {activeTab === 'create_department' && (
        <div className="glass-panel animate-fade-in" style={{ padding: 'var(--space-card-padding)', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <Button variant="outline" onClick={() => setActiveTab('departments')}>
              <ArrowLeft size={16} style={{ marginRight: '8px' }} /> Back to Departments
            </Button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Building2 size={28} style={{ color: 'var(--accent-color)' }} />
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Create New Department</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '4px 0 0 0' }}>Establish a new operational department entity for user grouping, course scoping, and analytics tracking.</p>
            </div>
          </div>

          <form onSubmit={handleCreateDeptSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label className="form-label-styled">Department Code <span className="required-star">*</span></label>
                <input 
                  className="form-input-styled" 
                  value={newDeptCode} 
                  onChange={e => setNewDeptCode(e.target.value)} 
                  placeholder="e.g. DATA, QA, DEVOPS" 
                  required 
                />
              </div>

              <div>
                <label className="form-label-styled">Department Name <span className="required-star">*</span></label>
                <input 
                  className="form-input-styled" 
                  value={newDeptName} 
                  onChange={e => setNewDeptName(e.target.value)} 
                  placeholder="e.g. Data Engineering" 
                  required 
                />
              </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label className="form-label-styled">Description (Optional)</label>
              <textarea 
                className="form-input-styled" 
                rows={4} 
                value={newDeptDesc} 
                onChange={e => setNewDeptDesc(e.target.value)} 
                placeholder="Brief summary of department scope..." 
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button type="button" variant="outline" onClick={() => setActiveTab('departments')}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={deptSubmitting} style={{ minWidth: '180px', padding: '12px' }}>
                {deptSubmitting ? 'Creating...' : 'Create Department'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Create User Tab */}
      {activeTab === 'create_user' && (
        <div className="glass-panel animate-fade-in" style={{ padding: 'var(--space-card-padding)', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <Button variant="outline" onClick={() => setActiveTab('users')}>
              <ArrowLeft size={16} style={{ marginRight: '8px' }} /> Back to Users Directory
            </Button>
          </div>

          <h2 style={{ marginBottom: '24px', fontSize: '1.4rem', fontWeight: 600 }}>Create New User</h2>
          
          <form onSubmit={handleCreateUserSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label className="form-label-styled">Employee Code <span className="required-star">*</span></label>
                <input 
                  className="form-input-styled" 
                  value={employeeCode} 
                  onChange={e => setEmployeeCode(e.target.value)} 
                  placeholder="e.g. EMP001" 
                />
                {formErrors.employeeCode && <span className="input-error-msg" style={{ color: 'var(--danger-color)', fontSize: '0.8rem' }}>{formErrors.employeeCode}</span>}
              </div>
              <div>
                <label className="form-label-styled">Email Address <span className="required-star">*</span></label>
                <input 
                  className="form-input-styled" 
                  type="email" 
                  value={email} 
                  onChange={e => handleEmailChange(e.target.value)} 
                  placeholder="employee@company.com" 
                />
                {formErrors.email && <span className="input-error-msg" style={{ color: 'var(--danger-color)', fontSize: '0.8rem' }}>{formErrors.email}</span>}
              </div>
              <div>
                <label className="form-label-styled">First Name <span className="required-star">*</span></label>
                <input className="form-input-styled" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First Name" />
                {formErrors.firstName && <span className="input-error-msg" style={{ color: 'var(--danger-color)', fontSize: '0.8rem' }}>{formErrors.firstName}</span>}
              </div>
              <div>
                <label className="form-label-styled">Last Name <span className="required-star">*</span></label>
                <input className="form-input-styled" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last Name" />
                {formErrors.lastName && <span className="input-error-msg" style={{ color: 'var(--danger-color)', fontSize: '0.8rem' }}>{formErrors.lastName}</span>}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="form-label-styled">Set Initial Password <span className="required-star">*</span></label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  className="form-input-styled" 
                  type={showPassword ? 'text' : 'password'} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="Enter initial password (or click Generate)" 
                  style={{ flex: 1 }} 
                />
                <Button type="button" variant="outline" onClick={generateRandomPassword}>Generate</Button>
                <Button type="button" variant="outline" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                </Button>
              </div>
              {formErrors.password && <span className="input-error-msg" style={{ color: 'var(--danger-color)', fontSize: '0.8rem' }}>{formErrors.password}</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label className="form-label-styled">User Role <span className="required-star">*</span></label>
                <select 
                  id="select-user-role"
                  className="form-input-styled" 
                  value={selectedRoles[0] || 'EMPLOYEE'} 
                  onChange={e => {
                    const newRole = e.target.value;
                    setSelectedRoles([newRole]);
                    if (newRole === 'SYSTEM_ADMIN' || newRole === 'HR_ADMIN') {
                      setSelectedDeptId('');
                    }
                  }}
                >
                  <option value="EMPLOYEE">Employee (Learner)</option>
                  <option value="COURSE_MANAGER">Department Manager</option>
                  <option value="HR_ADMIN">HR Administrator</option>
                  <option value="SYSTEM_ADMIN">System Administrator</option>
                </select>
              </div>

              <div>
                <label className="form-label-styled">
                  Department Assignment {selectedRoles[0] === 'COURSE_MANAGER' ? <span className="required-star">*</span> : '(Optional)'}
                </label>
                <select 
                  id="select-user-dept"
                  className="form-input-styled" 
                  value={selectedDeptId} 
                  onChange={e => setSelectedDeptId(e.target.value)}
                  disabled={selectedRoles[0] === 'SYSTEM_ADMIN' || selectedRoles[0] === 'HR_ADMIN'}
                  style={{
                    opacity: (selectedRoles[0] === 'SYSTEM_ADMIN' || selectedRoles[0] === 'HR_ADMIN') ? 0.6 : 1,
                    cursor: (selectedRoles[0] === 'SYSTEM_ADMIN' || selectedRoles[0] === 'HR_ADMIN') ? 'not-allowed' : 'default'
                  }}
                >
                  <option value="">-- No Department (Unscoped) --</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <Button type="button" variant="outline" onClick={() => setActiveTab('users')}>Cancel</Button>
              <Button 
                type="submit" 
                variant="primary" 
                isLoading={formLoading}
                disabled={formLoading}
                style={{ minWidth: '180px', padding: '12px' }}
              >
                Create Account
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
