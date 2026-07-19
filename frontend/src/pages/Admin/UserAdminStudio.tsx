import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, Search, Building2, RefreshCw, 
  Shield, CheckCircle2, AlertCircle, Plus, Eye, EyeOff,
  UserCheck, UserX, Trash2, ArrowLeft, BarChart3, Award
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

export const UserAdminStudio: React.FC = () => {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'departments' | 'create_user'>('departments');
  const [users, setUsers] = useState<UserData[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Department Detail State
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [deptTab, setDeptTab] = useState<'employees' | 'managers'>('employees');

  // Reporting Modal State
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

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
      const deptsRes = await fetch('http://127.0.0.1:8080/api/departments');
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
          <Button variant={activeTab === 'departments' ? 'primary' : 'outline'} onClick={() => { setActiveTab('departments'); setSelectedDept(null); }}>
            Departments
          </Button>
          <Button variant={activeTab === 'create_user' ? 'primary' : 'outline'} leftIcon={<Plus size={16} />} onClick={() => setActiveTab('create_user')}>
            Add User
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
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
                  <span className="view-link">View Roster &rarr;</span>
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
                <div key={user.id} className="personnel-card" onClick={() => setSelectedUser(user)}>
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
              <span className="modal-subtitle">{selectedUser.employee_code} | {selectedDept?.name}</span>
            </div>
            
            <div className="analytics-grid">
              <div className="analytics-card">
                <span className="analytics-label">Course Completion</span>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: '85%' }}></div>
                </div>
                <span className="analytics-value">85%</span>
              </div>
              <div className="analytics-card">
                <span className="analytics-label">Average Exam Score</span>
                <span className="analytics-value huge">92.4</span>
              </div>
              <div className="analytics-card" style={{ gridColumn: 'span 2' }}>
                <span className="analytics-label">Recent Badges Earned</span>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <Award size={32} color="var(--primary-brand)" />
                  <Award size={32} color="var(--text-muted)" />
                  <Award size={32} color="var(--text-muted)" />
                </div>
              </div>
            </div>

            <Button variant="outline" style={{ marginTop: '32px', width: '100%' }} onClick={() => setSelectedUser(null)}>Close Analytics</Button>
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
