import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, Search, Building2, RefreshCw, 
  Shield, CheckCircle2, AlertCircle, Plus, Eye, EyeOff,
  UserCheck, UserX, Trash2, ArrowLeft, BarChart3, Award
} from 'lucide-react';
import { Button } from '../../components/Button/Button';
import { apiCall } from '../../services/api';
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
  
  const [activeTab, setActiveTab] = useState<'users' | 'departments' | 'create_user'>('departments');
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
  const [modalLoading, setModalLoading] = useState(false);

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

  useEffect(() => {
    const savedRole = localStorage.getItem('isLoggedInRole');
    if (savedRole !== 'Admin') {
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
    setModalLoading(true);
    try {
      const res = await apiCall(`/api/reporting/employees/${user.id}/detail`);
      if (res.ok) {
        const data = await res.json();
        setUserProfileData(data);
      }
    } catch (err) {
      console.error(err);
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
        setEmployeeCode(''); setFirstName(''); setLastName(''); setEmail(''); setPassword('');
        setSelectedDeptId(''); setSelectedRoles(['EMPLOYEE']); setFormErrors({});
        await loadData();
        setActiveTab('departments');
      } else {
        alert("Failed to create user");
      }
    } catch (err) {
      console.error(err);
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
        window.dispatchEvent(new CustomEvent('kaizen_departments_changed'));
        loadData();
      } else {
        const err = await res.json();
        triggerToast(err.detail || 'Failed to create department.', 'error');
      }
    } catch (e) {
      console.error(e);
      triggerToast('Network error creating department.', 'error');
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
        triggerToast(err.detail || 'Failed to delete user.', 'error');
      }
    } catch (e) {
      console.error(e);
      triggerToast('Error deleting user.', 'error');
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
    <div className="admin-workspace container animate-fade-in" style={{ paddingBottom: '60px', marginTop: '30px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>User Administration</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '6px', marginBottom: 0 }}>Manage departments, personnel, and analytics.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button variant={activeTab === 'users' ? 'primary' : 'outline'} onClick={() => { setActiveTab('users'); setSelectedDept(null); }}>
            All Users
          </Button>
          <Button variant={activeTab === 'departments' ? 'primary' : 'outline'} onClick={() => { setActiveTab('departments'); setSelectedDept(null); }}>
            Departments
          </Button>
          <Button variant="outline" leftIcon={<Plus size={16} />} onClick={() => setShowCreateDeptModal(true)}>
            Create Department
          </Button>
          <Button variant={activeTab === 'create_user' ? 'primary' : 'outline'} leftIcon={<Plus size={16} />} onClick={() => setActiveTab('create_user')}>
            Add User
          </Button>
        </div>
      </div>

      {/* Main Content Area: Global Users Tab */}
      {activeTab === 'users' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                className="form-input-styled" 
                style={{ paddingLeft: '38px' }}
                placeholder="Search by name, email, or code..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Showing {users.filter(u => u.first_name.toLowerCase().includes(searchTerm.toLowerCase()) || u.last_name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()) || u.employee_code.toLowerCase().includes(searchTerm.toLowerCase())).length} users
            </span>
          </div>

          <div className="personnel-list">
            {users
              .filter(u => u.first_name.toLowerCase().includes(searchTerm.toLowerCase()) || u.last_name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()) || u.employee_code.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(user => (
                <div key={user.id} className="personnel-card" onClick={() => handleOpenUserModal(user)}>
                  <div className="person-info">
                    <div className="person-avatar">{user.first_name[0]}{user.last_name[0]}</div>
                    <div>
                      <h4 className="person-name">{user.first_name} {user.last_name}</h4>
                      <span className="person-role">{user.employee_code} • {user.email}</span>
                    </div>
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    <BarChart3 size={20} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Departments Grid View */}
      {activeTab === 'departments' && !selectedDept && (
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
                <div key={user.id} className="personnel-card" onClick={() => handleOpenUserModal(user)}>
                  <div className="person-info">
                    <div className="person-avatar">{user.first_name[0]}{user.last_name[0]}</div>
                    <div>
                      <h4 className="person-name">{user.first_name} {user.last_name}</h4>
                      <span className="person-role">{user.employee_code} • {user.email}</span>
                    </div>
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    <BarChart3 size={20} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* User Analytics Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedUser.first_name} {selectedUser.last_name}</h2>
              <span className="modal-subtitle">{selectedUser.employee_code} | {selectedUser.email}</span>
            </div>
            
            {modalLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
              </div>
            ) : (
              <div className="analytics-grid">
                <div className="analytics-card">
                  <span className="analytics-label">Courses Completed</span>
                  <span className="analytics-value huge">
                    {userProfileData ? userProfileData.courses_data?.filter((c: any) => c.status === 'completed').length : 0}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                    Total Enrolled: {userProfileData ? userProfileData.courses_data?.length : 0}
                  </span>
                </div>
                <div className="analytics-card">
                  <span className="analytics-label">Average Exam Score</span>
                  <span className="analytics-value huge">
                    {userProfileData && userProfileData.exams_data?.length > 0
                      ? (userProfileData.exams_data.reduce((acc: number, item: any) => acc + (item.overall_score || 0), 0) / userProfileData.exams_data.length).toFixed(1)
                      : 'N/A'}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                    Exams Attempted: {userProfileData ? userProfileData.exams_data?.length : 0}
                  </span>
                </div>
                <div className="analytics-card" style={{ gridColumn: 'span 2' }}>
                  <span className="analytics-label">Earned Achievements</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                    {(() => {
                      const completedCount = userProfileData?.courses_data?.filter((c: any) => c.status === 'completed' || c.progress_percent === 100).length || 0;
                      const badge = getBadgeForCompletions(completedCount);
                      if (!badge) {
                        return <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No badges earned yet.</span>;
                      }
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px', background: badge.color, color: '#fff', fontSize: '0.85rem', fontWeight: '700' }}>
                          <span style={{ fontSize: '1.2rem' }}>{badge.icon}</span>
                          <span>{badge.name} (Level {badge.step}/10)</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              <Button variant="outline" style={{ flex: 1 }} onClick={() => setSelectedUser(null)}>Close Analytics</Button>
              <Button 
                variant="outline" 
                style={{ borderColor: '#ef4444', color: '#ef4444' }} 
                leftIcon={<Trash2 size={16} />}
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete User
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {showDeleteConfirm && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#ef4444', marginBottom: '16px' }}>
              <AlertCircle size={28} />
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Confirm User Deletion</h3>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.5', marginBottom: '24px' }}>
              Are you sure you want to deactivate and soft-delete user <strong>{selectedUser.first_name} {selectedUser.last_name}</strong> (<code>{selectedUser.email}</code>)? Their historical activity and certificates will be preserved for auditing.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeletingUser}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                style={{ background: '#ef4444', borderColor: '#ef4444' }} 
                onClick={handleDeleteUser}
                disabled={isDeletingUser}
              >
                {isDeletingUser ? 'Deleting...' : 'Yes, Delete User'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Department Modal */}
      {showCreateDeptModal && (
        <div className="modal-overlay" onClick={() => setShowCreateDeptModal(false)}>
          <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Create New Department</h2>
              <span className="modal-subtitle">Add a department to the system</span>
            </div>
            
            <form onSubmit={handleCreateDeptSubmit} style={{ marginTop: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label-styled">Department Code <span className="required-star">*</span></label>
                <input 
                  className="form-input-styled" 
                  value={newDeptCode} 
                  onChange={e => setNewDeptCode(e.target.value)} 
                  placeholder="e.g. DATA, QA, DEVOPS" 
                  required 
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="form-label-styled">Department Name <span className="required-star">*</span></label>
                <input 
                  className="form-input-styled" 
                  value={newDeptName} 
                  onChange={e => setNewDeptName(e.target.value)} 
                  placeholder="e.g. Data Engineering" 
                  required 
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label className="form-label-styled">Description (Optional)</label>
                <textarea 
                  className="form-input-styled" 
                  rows={3} 
                  value={newDeptDesc} 
                  onChange={e => setNewDeptDesc(e.target.value)} 
                  placeholder="Brief summary of department scope..." 
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button type="button" variant="outline" onClick={() => setShowCreateDeptModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={deptSubmitting}>
                  {deptSubmitting ? 'Creating...' : 'Create Department'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Tab */}
      {activeTab === 'create_user' && (
        <div className="glass-panel" style={{ padding: 'var(--space-card-padding)', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '24px', fontSize: '1.4rem', fontWeight: 600 }}>Create New User</h2>
          <form onSubmit={handleCreateUserSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label className="form-label-styled">Employee Code</label>
                <input className="form-input-styled" value={employeeCode} onChange={e => setEmployeeCode(e.target.value)} placeholder="e.g. EMP001" />
              </div>
              <div>
                <label className="form-label-styled">Email Address</label>
                <input className="form-input-styled" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="employee@company.com" />
              </div>
              <div>
                <label className="form-label-styled">First Name</label>
                <input className="form-input-styled" value={firstName} onChange={e => setFirstName(e.target.value)} />
              </div>
              <div>
                <label className="form-label-styled">Last Name</label>
                <input className="form-input-styled" value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label-styled">Password</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input className="form-input-styled" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} style={{ flex: 1 }} />
                <Button type="button" variant="outline" onClick={generateRandomPassword}>Generate</Button>
                <Button type="button" variant="outline" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</Button>
              </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label className="form-label-styled">Department Assignment</label>
              <select className="form-input-styled" value={selectedDeptId} onChange={e => setSelectedDeptId(e.target.value)}>
                <option value="">-- No Department --</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <Button type="submit" variant="primary" style={{ width: '100%', padding: '12px', fontSize: '1rem' }}>
              Create Account
            </Button>
          </form>
        </div>
      )}
    </div>
  );
};
