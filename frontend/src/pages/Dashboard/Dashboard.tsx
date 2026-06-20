import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Users, ShieldAlert, Award, FileText, CheckCircle, PlusCircle, Bookmark, Layers, Menu } from 'lucide-react';
import { Button } from '../../components/Button/Button';
import type { Course } from '../../types/schema';
import './Dashboard.css';

// Mock DB courses matching schema
const DEFAULT_COURSES: Course[] = [
  { id: 'c1', course_code: 'AI-101', title: 'Artificial Intelligence Foundations', description: 'Core principles of machine learning models, neural networks, and AI ethics.', difficulty_level: 'Beginner', is_published: true },
  { id: 'c2', course_code: 'FICO-202', title: 'SAP FICO Ledger & Asset Accounting', description: 'Learn financial control parameters, ledger structures, and cost calculations.', difficulty_level: 'Intermediate', is_published: true },
  { id: 'c3', course_code: 'ABAP-301', title: 'ABAP Syntax & Database Orchestration', description: 'Advanced programming on SAP NetWeaver, custom database queries, and RFCs.', difficulty_level: 'Advanced', is_published: true },
  { id: 'c4', course_code: 'SD-102', title: 'Sales and Distribution Lifecycle', description: 'Master shipping structures, bill matrices, and customer logistics pipelines.', difficulty_level: 'Beginner', is_published: true }
];

// Employee Mock Enrollment progress
interface ProgressItem {
  id: string;
  courseCode: string;
  title: string;
  progressPercent: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

// Manager Mock Employee lists
interface RosterEmployee {
  id: string;
  name: string;
  code: string;
  email: string;
  coursesTaken: number;
  assignedCourse: string;
  progressPercent: number;
  testMarks: { courseCode: string; testName: string; score: number }[];
}

// Syllabus Modules Mock Database
const COURSE_MODULES_MAP: { [courseCode: string]: { title: string; duration: string }[] } = {
  'AI-101': [
    { title: 'Neural Networks & Perceptrons', duration: '2 hours' },
    { title: 'Gradient Descent & Cost Functions', duration: '3 hours' },
    { title: 'Backpropagation Algorithm', duration: '4 hours' },
    { title: 'Ethical Implications in ML Models', duration: '1 hour' }
  ],
  'SD-102': [
    { title: 'Sales Order Processing Framework', duration: '2.5 hours' },
    { title: 'Shipping Conditions & Route Determination', duration: '3 hours' },
    { title: 'Billing & Invoice Generation', duration: '2 hours' }
  ],
  'FICO-202': [
    { title: 'General Ledger Configuration', duration: '4 hours' },
    { title: 'Asset Master Records & Depreciation', duration: '3.5 hours' },
    { title: 'Profitability Analysis (CO-PA) Setup', duration: '5 hours' }
  ],
  'ABAP-301': [
    { title: 'ABAP Syntax & Object Dictionary', duration: '3 hours' },
    { title: 'Open SQL Statements & DB Optimization', duration: '4 hours' },
    { title: 'Web Dynpro & Enhancement Frameworks', duration: '5 hours' }
  ]
};

const getModulesForCourse = (courseCode: string, progressPercent: number) => {
  const custom = COURSE_MODULES_MAP[courseCode];
  if (custom) {
    const stepCount = custom.length;
    const completedStepsCount = Math.floor((progressPercent / 100) * stepCount);
    return custom.map((m, idx) => ({
      ...m,
      isCompleted: idx < completedStepsCount
    }));
  }
  // Dynamic fallback modules
  return [
    { title: 'Introduction & Development Environment Setup', duration: '2 hours', isCompleted: progressPercent >= 30 },
    { title: 'Core Principles & API Integration Practices', duration: '3 hours', isCompleted: progressPercent >= 60 },
    { title: 'Advanced Debugging, Optimization, and Deployments', duration: '4 hours', isCompleted: progressPercent === 100 }
  ];
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string>('');
  const [profileEmpId, setProfileEmpId] = useState<string>('');
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [role, setRole] = useState<string>('Employee');
  const [dept, setDept] = useState<string>('AI');

  const [activeMainView, setActiveMainView] = useState<'dashboard' | 'profile'>('dashboard');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'profile') {
      setActiveMainView('profile');
    } else {
      setActiveMainView('dashboard');
    }
  }, [location.search]);

  // Helper for Manager mappings
  const getManagerForDept = (deptName: string): string => {
    const managers: { [key: string]: string } = {
      'AI': 'Dr. Evelyn C.',
      'Sales and Distribution': 'Sarah Connor',
      'Material Management': 'Marcus Aurelius',
      'Production Planning': 'Julius Caesar',
      'Basis': 'Ada Lovelace',
      'FICO Finance': 'Warren B.',
      'PS': 'George Washington',
      'ABAP': 'Linus Torvalds',
      'Graphic Design': 'Paul Rand',
      'HR and Admin': 'John Watson',
      'Sales and Marketing': 'Steve Jobs'
    };
    return managers[deptName] || 'John Watson';
  };

  // State for Course Modules Modal Detail View
  const [selectedCourseForModules, setSelectedCourseForModules] = useState<ProgressItem | null>(null);

  // Manager Dashboard Navigation & Workspace States
  const [managerSubView, setManagerSubView] = useState<'my_courses' | 'create_course' | 'audit_reporting'>('my_courses');
  const [showDrawer, setShowDrawer] = useState(false);
  const [activeManagerFilterDept, setActiveManagerFilterDept] = useState<string>('All');
  
  // Manager Edit & Draft states
  const [hasDraftCourse, setHasDraftCourse] = useState(true);
  const [createCourseTab, setCreateCourseTab] = useState<'resume' | 'new'>('resume');
  const [draftTitle, setDraftTitle] = useState('Advanced Machine Learning Practice');
  const [draftDesc, setDraftDesc] = useState('Applied neural networks and transformers practice draft.');
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editCourseTitle, setEditCourseTitle] = useState('');
  const [editCourseDesc, setEditCourseDesc] = useState('');

  // Selected employee detail state (for audit logs & test marks)
  const [selectedAuditEmp, setSelectedAuditEmp] = useState<RosterEmployee | null>(null);

  // New course creation form state
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newCourseDiff, setNewCourseDiff] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  
  // Manager Managed Courses state (to allow dynamic edits/creation)
  const [managedCourses, setManagedCourses] = useState<Course[]>(DEFAULT_COURSES);

  // React States for Employee View
  const [myProgress, setMyProgress] = useState<ProgressItem[]>([
    { id: '1', courseCode: 'AI-101', title: 'Artificial Intelligence Foundations', progressPercent: 60, difficulty: 'Beginner' },
    { id: '2', courseCode: 'SD-102', title: 'Sales and Distribution Lifecycle', progressPercent: 20, difficulty: 'Beginner' }
  ]);

  // React States for Manager View
  const [roster] = useState<RosterEmployee[]>([
    { 
      id: 'e1', 
      name: 'Alice Smith', 
      code: 'EMP-3041', 
      email: 'alice.smith@company.com', 
      coursesTaken: 2, 
      assignedCourse: 'AI-101', 
      progressPercent: 80,
      testMarks: [
        { courseCode: 'AI-101', testName: 'Machine Learning Basics', score: 88 },
        { courseCode: 'AI-101', testName: 'Neural Networks Lab', score: 92 }
      ]
    },
    { 
      id: 'e2', 
      name: 'Bob Johnson', 
      code: 'EMP-3042', 
      email: 'bob.johnson@company.com', 
      coursesTaken: 3, 
      assignedCourse: 'FICO-202', 
      progressPercent: 100,
      testMarks: [
        { courseCode: 'FICO-202', testName: 'Asset Accounting Exam', score: 100 },
        { courseCode: 'SD-102', testName: 'Shipping Matrix Quiz', score: 85 }
      ]
    },
    { 
      id: 'e3', 
      name: 'Charlie Davis', 
      code: 'EMP-3043', 
      email: 'charlie.davis@company.com', 
      coursesTaken: 1, 
      assignedCourse: 'ABAP-301', 
      progressPercent: 40,
      testMarks: [
        { courseCode: 'ABAP-301', testName: 'Open SQL Queries Test', score: 76 }
      ]
    }
  ]);



  // React States for Admin Audit Logs
  const [auditLogs, setAuditLogs] = useState([
    { id: 'a1', timestamp: '2026-06-20 12:04:15', actor: 'admin@company.com', action: 'ROLE_UPDATE', target: 'creator@company.com', details: 'Promoted to Manager role' },
    { id: 'a2', timestamp: '2026-06-20 11:32:04', actor: 'creator@company.com', action: 'ASSIGN_COURSE', target: 'EMP-3041', details: 'Assigned AI-101 course' },
    { id: 'a3', timestamp: '2026-06-20 10:15:22', actor: 'system_daemon', action: 'DB_BACKUP', target: 'schema_v2', details: 'Completed snapshot snap_9294' }
  ]);

  useEffect(() => {
    const savedEmail = localStorage.getItem('isLoggedInEmail');
    const savedRole = localStorage.getItem('isLoggedInRole');
    const savedDept = localStorage.getItem('isLoggedInDept');

    if (!savedEmail) {
      navigate('/login');
    } else {
      setEmail(savedEmail);
      const activeRole = savedRole || 'Employee';
      if (savedRole) setRole(savedRole);
      if (savedDept) setDept(savedDept);

      const emailPrefix = savedEmail ? savedEmail.split('@')[0] : '';
      
      // Initialize profile name/id based on role and localStorage
      const savedName = localStorage.getItem('profileName');
      const savedEmpId = localStorage.getItem('profileEmpId');
      if (savedName) {
        setProfileName(savedName);
      } else {
        if (emailPrefix === 'learner') {
          setProfileName('Alice Smith');
        } else if (emailPrefix === 'creator') {
          setProfileName('Dr. Evelyn C.');
        } else if (emailPrefix === 'admin') {
          setProfileName('Systems Administrator');
        } else {
          setProfileName(emailPrefix || (activeRole === 'Employee' ? 'Alice Smith' : activeRole === 'Manager' ? 'Dr. Evelyn C.' : 'Systems Administrator'));
        }
      }
      
      if (savedEmpId) {
        setProfileEmpId(savedEmpId);
      } else {
        if (emailPrefix === 'learner') {
          setProfileEmpId('EMP-3041');
        } else if (emailPrefix === 'creator') {
          setProfileEmpId('MGR-1042');
        } else if (emailPrefix === 'admin') {
          setProfileEmpId('ADM-0001');
        } else {
          setProfileEmpId(emailPrefix || (activeRole === 'Employee' ? 'EMP-3041' : activeRole === 'Manager' ? 'MGR-1042' : 'ADM-0001'));
        }
      }
    }
  }, [navigate]);

  // Handler: Standard Employee Study Action
  const handleStudyIncrement = (itemId: string) => {
    setMyProgress(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const updated = Math.min(item.progressPercent + 20, 100);
          return { ...item, progressPercent: updated };
        }
        return item;
      })
    );
  };

  // Handler: Creator Creates New Course
  const handleCreateNewCourseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle.trim() || !newCourseCode.trim() || !newCourseDesc.trim()) {
      alert('All fields are required to publish a course.');
      return;
    }
    const newCourse: Course = {
      id: `c${Date.now()}`,
      course_code: newCourseCode,
      title: newCourseTitle,
      description: newCourseDesc,
      difficulty_level: newCourseDiff,
      is_published: true
    };
    setManagedCourses(prev => [...prev, newCourse]);
    alert(`Course "${newCourseTitle}" successfully published!`);
    
    // Add audit log
    const newLog = {
      id: `a${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: email || 'manager@company.com',
      action: 'CREATE_COURSE',
      target: newCourseCode,
      details: `Created new course ${newCourseCode} (${newCourseTitle})`
    };
    setAuditLogs(prev => [newLog, ...prev]);

    // Reset Form
    setNewCourseTitle('');
    setNewCourseCode('');
    setNewCourseDesc('');
    setManagerSubView('my_courses');
  };

  // Handler: Creator Edits Managed Course
  const handleEditCourseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCourseTitle.trim() || !editCourseDesc.trim()) {
      alert('Fields cannot be empty.');
      return;
    }
    setManagedCourses(prev =>
      prev.map(c => c.id === editingCourseId ? { ...c, title: editCourseTitle, description: editCourseDesc } : c)
    );
    alert('Course successfully updated!');
    
    // Add audit log
    const newLog = {
      id: `a${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: email || 'manager@company.com',
      action: 'UPDATE_COURSE',
      target: editingCourseId || '',
      details: `Updated course metadata`
    };
    setAuditLogs(prev => [newLog, ...prev]);

    setEditingCourseId(null);
  };

  // Handler: Creator Draft Course Editing
  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingDraft(false);
    alert('Draft course progress saved successfully!');
  };

  return (
    <div className="dashboard-page container animate-fade-in">
      {/* 0. DETAILED PROFILE VIEW PANEL */}
      {activeMainView === 'profile' && (
        <div className="dashboard-layout-profile animate-fade-in">
          {/* Header row with back-to-dashboard button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button 
                onClick={() => {
                  navigate('/dashboard');
                }} 
                className="ide-drawer-toggle-btn tooltip-trigger" 
                data-tooltip="Return to Dashboard Home"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '10px 16px', 
                  background: 'var(--border-color)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--border-radius-sm)', 
                  color: 'var(--text-primary)', 
                  cursor: 'pointer', 
                  fontWeight: '600' 
                }}
              >
                ← Back to Dashboard
              </button>
              <div className="pane-header" style={{ marginBottom: 0 }}>
                <h3>My Profile Workspace</h3>
                <p>Personal profile credentials and training reports center</p>
              </div>
            </div>
            <span className="badge role" style={{ padding: '8px 14px', borderRadius: 'var(--border-radius-sm)' }}>
              Connected Node: {email?.split('@')[0]}
            </span>
          </div>

          <div className="profile-dashboard-grid">
            {/* Left Pane - Profile details metadata */}
            <div className="profile-side-pane">
              <div className="sidebar-card glass-panel" style={{ padding: '28px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '24px', marginBottom: '20px' }}>
                  <div className="avatar-circle" style={{ width: '80px', height: '80px', fontSize: '1.8rem', fontWeight: '800' }}>
                    {profileName?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div style={{ textAlign: 'center', width: '100%' }}>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        className="form-select-field"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: '700', padding: '6px' }}
                      />
                    ) : (
                      <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {profileName}
                      </h3>
                    )}
                    <p style={{ fontSize: '0.78rem', color: 'var(--accent-color)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '6px' }}>
                      {role} Workspace
                    </p>
                  </div>
                </div>

                <div className="profile-metadata-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Employee ID</span>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        className="form-select-field"
                        value={profileEmpId}
                        onChange={(e) => setProfileEmpId(e.target.value)}
                        style={{ padding: '6px', fontSize: '0.88rem', width: '160px', textAlign: 'right' }}
                      />
                    ) : (
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{profileEmpId}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Corporate Email</span>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{email}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Department</span>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{dept}</span>
                  </div>
                  {role === 'Employee' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Assigned Manager</span>
                      <span style={{ fontWeight: '600', color: 'var(--accent-color)' }}>{getManagerForDept(dept)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Completed Courses</span>
                    <span style={{ fontWeight: '600', color: 'var(--neon-teal)' }}>
                      {role === 'Employee' ? myProgress.filter(p => p.progressPercent === 100).length : 'All'} Courses
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Ongoing Modules</span>
                    <span style={{ fontWeight: '600', color: 'var(--accent-color)' }}>
                      {role === 'Employee' ? myProgress.filter(p => p.progressPercent < 100).length : '0'} In Progress
                    </span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '20px', paddingTop: '16px' }}>
                  <Button
                    variant={isEditingProfile ? 'primary' : 'outline'}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                    onClick={() => {
                      if (isEditingProfile) {
                        localStorage.setItem('profileName', profileName);
                        localStorage.setItem('profileEmpId', profileEmpId);
                      }
                      setIsEditingProfile(!isEditingProfile);
                    }}
                  >
                    {isEditingProfile ? 'Save Profile' : 'Edit Profile Info'}
                  </Button>
                </div>
              </div>

              {/* Status summary box */}
              <div className="sidebar-card glass-panel" style={{ borderLeft: '3px solid var(--neon-teal)', padding: '20px' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.03em', marginBottom: '8px' }}>Compliance Status</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                  {role === 'Employee' && myProgress.some(p => p.progressPercent < 100) 
                    ? 'Ongoing curriculums active. Ensure completion within compliance deadline nodes.'
                    : 'System compliant. All assigned training certifications have been successfully verified.'}
                </p>
              </div>
            </div>

            {/* Right Pane - Marks report & Course summaries */}
            <div className="profile-main-pane">
              
              {/* Detailed Performance / Quiz Scores */}
              <div className="roster-card glass-panel" style={{ padding: '28px', marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', padding: 0 }}>
                  <Award size={18} className="icon-blue" />
                  <span>Training Performance & Assessment Report</span>
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  List of completed and logged exam marks traces matching your curriculum.
                </p>

                <div className="scores-table-section">
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ padding: '12px 6px', color: 'var(--text-secondary)' }}>Module Code</th>
                        <th style={{ padding: '12px 6px', color: 'var(--text-secondary)' }}>Assessment Name</th>
                        <th style={{ padding: '12px 6px', color: 'var(--text-secondary)' }}>Passing Score</th>
                        <th style={{ padding: '12px 6px', color: 'var(--text-secondary)', textAlign: 'right' }}>My Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {role === 'Employee' ? (
                        <>
                          <tr style={{ borderBottom: '1px solid var(--border-color)' }} className="tooltip-trigger" data-tooltip="AI Foundations Course Assessment">
                            <td style={{ padding: '12px 6px' }}><code>AI-101</code></td>
                            <td style={{ padding: '12px 6px' }}>Machine Learning Basics Quiz</td>
                            <td style={{ padding: '12px 6px' }}>80 / 100</td>
                            <td style={{ padding: '12px 6px', textAlign: 'right', fontWeight: '700', color: 'var(--neon-teal)' }}>88 / 100</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid var(--border-color)' }} className="tooltip-trigger" data-tooltip="AI Labs Assessment">
                            <td style={{ padding: '12px 6px' }}><code>AI-101</code></td>
                            <td style={{ padding: '12px 6px' }}>Neural Networks Lab Test</td>
                            <td style={{ padding: '12px 6px' }}>80 / 100</td>
                            <td style={{ padding: '12px 6px', textAlign: 'right', fontWeight: '700', color: 'var(--neon-teal)' }}>92 / 100</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid var(--border-color)' }} className="tooltip-trigger" data-tooltip="Sales Order processing quiz">
                            <td style={{ padding: '12px 6px' }}><code>SD-102</code></td>
                            <td style={{ padding: '12px 6px' }}>Shipping Conditions Matrix Quiz</td>
                            <td style={{ padding: '12px 6px' }}>80 / 100</td>
                            <td style={{ padding: '12px 6px', textAlign: 'right', fontWeight: '700', color: 'var(--text-secondary)' }}>65 / 100 (Pending)</td>
                          </tr>
                        </>
                      ) : role === 'Manager' ? (
                        <>
                          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '12px 6px' }}><code>FICO-202</code></td>
                            <td style={{ padding: '12px 6px' }}>Asset Accounting Competency Exam</td>
                            <td style={{ padding: '12px 6px' }}>80 / 100</td>
                            <td style={{ padding: '12px 6px', textAlign: 'right', fontWeight: '700', color: 'var(--neon-teal)' }}>100 / 100</td>
                          </tr>
                        </>
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            No assessment marks required for Administrator workspace.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Categorized Course Modules */}
              <div className="roster-card glass-panel" style={{ padding: '28px' }}>
                <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', padding: 0 }}>
                  <Layers size={18} className="icon-green" />
                  <span>Module Status Details</span>
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Ongoing Courses */}
                  <div>
                    <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--accent-color)', letterSpacing: '0.03em', marginBottom: '10px' }}>Ongoing Modules</h4>
                    {role === 'Employee' && myProgress.some(p => p.progressPercent < 100) ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {myProgress.filter(p => p.progressPercent < 100).map(course => (
                          <div key={course.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
                            <div>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{course.courseCode}</span>
                              <p style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>{course.title}</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{course.progressPercent}%</span>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="tooltip-trigger"
                                data-tooltip={`Resume study for ${course.courseCode}`}
                                onClick={() => {
                                  handleStudyIncrement(course.id);
                                }}
                              >
                                Resume
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No ongoing modules found.</p>
                    )}
                  </div>

                  {/* Completed Courses */}
                  <div style={{ marginTop: '10px' }}>
                    <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--neon-teal)', letterSpacing: '0.03em', marginBottom: '10px' }}>Completed Modules & Certificates</h4>
                    {role === 'Employee' && myProgress.some(p => p.progressPercent === 100) ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {myProgress.filter(p => p.progressPercent === 100).map(course => (
                          <div key={course.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
                            <div>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{course.courseCode}</span>
                              <p style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>{course.title}</p>
                            </div>
                            <span className="row-success-badge" style={{ fontSize: '0.8rem' }}>
                              Certified ✓
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No completed modules found.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Banner Common Details */}
      {activeMainView === 'dashboard' && (
        <section className="dashboard-hero-banner glass-panel">
        <div className="hero-banner-profile">
          <div className="avatar-circle">
            <User size={32} />
          </div>
          <div className="profile-details">
            <h2>Welcome Back, {profileName || email?.split('@')[0]}</h2>
            <div className="profile-badge-row">
              <span className="badge role">{role} Workspace</span>
              <span className="badge dept">{dept} Department</span>
            </div>
          </div>
        </div>

        <div className="hero-banner-meta">
          {role === 'Employee' ? (
            <>
              <div className="banner-meta-box">
                <Bookmark size={18} className="meta-icon icon-blue" />
                <div>
                  <p className="meta-label">Active Courses</p>
                  <p className="meta-val">{myProgress.length} Assigned</p>
                </div>
              </div>
              <div className="banner-meta-box">
                <Layers size={18} className="meta-icon icon-green" />
                <div>
                  <p className="meta-label">Total Courses</p>
                  <p className="meta-val">{myProgress.length} Courses</p>
                </div>
              </div>
            </>
          ) : role === 'Manager' ? (
            <>
              <div className="banner-meta-box">
                <Bookmark size={18} className="meta-icon icon-blue" />
                <div>
                  <p className="meta-label">Total Departments</p>
                  <p className="meta-val">11 Registered</p>
                </div>
              </div>
              <div className="banner-meta-box">
                <Layers size={18} className="meta-icon icon-green" />
                <div>
                  <p className="meta-label">Total Courses</p>
                  <p className="meta-val">{managedCourses.length} Courses</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="banner-meta-box">
                <Bookmark size={18} className="meta-icon icon-blue" />
                <div>
                  <p className="meta-label">Total Departments</p>
                  <p className="meta-val">11 Registered</p>
                </div>
              </div>
              <div className="banner-meta-box">
                <Layers size={18} className="meta-icon icon-green" />
                <div>
                  <p className="meta-label">Database Nodes</p>
                  <p className="meta-val">3 Clusters</p>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
      )}

      {/* Conditional Dashboard Views */}
      
      {/* 1. EMPLOYEE (LEARNER) VIEW */}
      {activeMainView === 'dashboard' && role === 'Employee' && (
        <div className="dashboard-layout-employee animate-fade-in">
          <div className="pane-header">
            <h3>My Learning Curriculum</h3>
            <p>Track your modules and complete assessments assigned to your department</p>
          </div>

          <div className="employee-learning-grid">
            <div className="employee-courses-list">
              {myProgress.map((item) => (
                <div key={item.id} className="course-progress-row glass-panel glow-hover">
                  <div className="course-row-info">
                    <span className="course-row-code">{item.courseCode}</span>
                    <h4>{item.title}</h4>
                    <span className="course-row-difficulty">{item.difficulty}</span>
                  </div>

                  <div className="course-row-tracker">
                    <div className="progress-bar-group">
                      <div className="progress-bar-container">
                        <div className="progress-bar-fill" style={{ width: `${item.progressPercent}%` }}></div>
                      </div>
                      <div className="progress-label-row">
                        <span>{item.progressPercent}% Completed</span>
                        {item.progressPercent === 100 && (
                          <span className="row-success-badge">
                            <CheckCircle size={12} style={{ marginRight: '4px' }} /> Certified
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedCourseForModules(item)}
                        style={{ flex: 1 }}
                      >
                        View Course
                      </Button>
                      
                      {item.progressPercent === 100 && (
                        <Button
                          variant="outline"
                          disabled
                          style={{ flex: 1 }}
                        >
                          Certified
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Side Info Cards */}
            <div className="employee-sidebar">

              {/* Recent Course Sidebar Widget */}
              <div className="sidebar-card glass-panel" style={{ borderLeft: '3px solid var(--accent-color)' }}>
                <div className="sidebar-card-title">
                  <Bookmark size={18} className="sidebar-icon icon-green" />
                  <h3>Recent Course Activity</h3>
                </div>
                {myProgress.some(p => p.progressPercent < 100) ? (() => {
                  const recent = myProgress.find(p => p.progressPercent < 100) || myProgress[0];
                  return (
                    <div style={{ marginTop: '12px' }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>{recent.title}</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        Active Code: {recent.courseCode}
                      </p>
                      
                      <div className="progress-bar-container" style={{ marginTop: '10px', height: '4px' }}>
                        <div className="progress-bar-fill" style={{ width: `${recent.progressPercent}%` }}></div>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span>{recent.progressPercent}% Complete</span>
                      </div>

                      <Button
                        variant="primary"
                        onClick={() => handleStudyIncrement(recent.id)}
                        style={{ width: '100%', marginTop: '12px', padding: '8px 16px', fontSize: '0.82rem' }}
                      >
                        Resume Course
                      </Button>
                    </div>
                  );
                })() : (
                  <p className="no-data-msg" style={{ padding: '8px 0' }}>All assigned courses completed! Check your certifications.</p>
                )}
              </div>

              {/* Completed Certificates Sidebar Card */}
              <div className="sidebar-card glass-panel">
                <div className="sidebar-card-title">
                  <Award size={18} className="sidebar-icon icon-yellow" />
                  <h3>Completed Certificates</h3>
                </div>
                <p className="sidebar-card-subtitle">Your credentials verified on Kiezen</p>
                
                <div className="certificates-badge-list">
                  {myProgress.some(i => i.progressPercent === 100) ? (
                    myProgress
                      .filter(i => i.progressPercent === 100)
                      .map(item => (
                        <div key={item.id} className="certificate-badge-item">
                           <CheckCircle size={16} className="cert-check" />
                          <div>
                            <p className="cert-title">{item.courseCode} Certificate</p>
                            <p className="cert-date">Issued: {new Date().toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="no-data-msg">No certificates earned yet. Reach 100% on any course to issue.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CREATOR (MANAGER) VIEW */}
      {activeMainView === 'dashboard' && role === 'Manager' && (
        <div className="dashboard-layout-manager animate-fade-in">
          {/* Side Drawer Toggle button & Dashboard header */}
          <div className="manager-workspace-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '28px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button 
                className="ide-drawer-toggle-btn" 
                onClick={() => setShowDrawer(true)} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  width: '40px', 
                  height: '40px', 
                  background: 'var(--bg-card)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--border-radius-sm)', 
                  color: 'var(--text-primary)', 
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)'
                }}
                title="Open Navigation Menu"
              >
                <Menu size={20} />
              </button>
              <div className="pane-header" style={{ marginBottom: 0 }}>
                <h3 style={{ textTransform: 'capitalize' }}>
                  {managerSubView === 'my_courses' ? 'My Courses Catalog' : managerSubView === 'create_course' ? 'Create & Build Syllabus' : 'Employee Audit Logs & Report'}
                </h3>
                <p>Manager console node for department curriculum tracking</p>
              </div>
            </div>
            
            {/* Department Filter Selector */}
            <div className="dept-filter-container" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>View Department:</span>
              <select
                className="form-select-field"
                value={activeManagerFilterDept}
                onChange={(e) => setActiveManagerFilterDept(e.target.value)}
                style={{ width: 'auto', padding: '8px 14px' }}
              >
                <option value="All">All Departments</option>
                <option value="AI">AI</option>
                <option value="Sales and Distribution">Sales and Distribution</option>
                <option value="Material Management">Material Management</option>
                <option value="FICO Finance">FICO Finance</option>
                <option value="ABAP">ABAP</option>
                <option value="Graphic Design">Graphic Design</option>
                <option value="HR and Admin">HR and Admin</option>
              </select>
            </div>
          </div>

          {/* IDE SIDE NAVIGATION DRAWER */}
          {showDrawer && (
            <div className="drawer-overlay" onClick={() => setShowDrawer(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 1000, display: 'flex', justifyContent: 'flex-start' }}>
              <div className="drawer-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ width: '280px', height: '100%', backgroundColor: 'var(--bg-card)', borderRight: '1px solid var(--border-color)', padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px', animation: 'slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                <div className="drawer-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
                  <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--text-primary)', fontSize: '1.15rem' }}>Kiezen Manager</h3>
                  <button onClick={() => setShowDrawer(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer', padding: 0, lineHeight: 1 }}>&times;</button>
                </div>
                <div className="drawer-menu-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button 
                    className={`drawer-item ${managerSubView === 'create_course' ? 'active' : ''}`}
                    onClick={() => { setManagerSubView('create_course'); setShowDrawer(false); }}
                    style={{ padding: '12px 16px', textAlign: 'left', borderRadius: 'var(--border-radius-sm)', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', color: managerSubView === 'create_course' ? 'var(--accent-color)' : 'var(--text-secondary)', backgroundColor: managerSubView === 'create_course' ? 'var(--accent-glow)' : 'transparent', transition: 'var(--transition-smooth)' }}
                  >
                    📝 Create Course
                  </button>
                  <button 
                    className={`drawer-item ${managerSubView === 'my_courses' ? 'active' : ''}`}
                    onClick={() => { setManagerSubView('my_courses'); setShowDrawer(false); }}
                    style={{ padding: '12px 16px', textAlign: 'left', borderRadius: 'var(--border-radius-sm)', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', color: managerSubView === 'my_courses' ? 'var(--accent-color)' : 'var(--text-secondary)', backgroundColor: managerSubView === 'my_courses' ? 'var(--accent-glow)' : 'transparent', transition: 'var(--transition-smooth)' }}
                  >
                    📚 My Courses
                  </button>
                  <button 
                    className={`drawer-item ${managerSubView === 'audit_reporting' ? 'active' : ''}`}
                    onClick={() => { setManagerSubView('audit_reporting'); setShowDrawer(false); }}
                    style={{ padding: '12px 16px', textAlign: 'left', borderRadius: 'var(--border-radius-sm)', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', color: managerSubView === 'audit_reporting' ? 'var(--accent-color)' : 'var(--text-secondary)', backgroundColor: managerSubView === 'audit_reporting' ? 'var(--accent-glow)' : 'transparent', transition: 'var(--transition-smooth)' }}
                  >
                    📊 Auditing & Reporting
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC VIEWS */}
          
          {/* VIEW A: MY COURSES CATALOG */}
          {managerSubView === 'my_courses' && (
            <div className="manager-main-content">
              {/* Inline Course Editing Form Modal */}
              {editingCourseId && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="modal-content glass-panel" style={{ padding: '32px', maxWidth: '500px', width: '90%', borderRadius: 'var(--border-radius-md)', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ marginBottom: '16px' }}>Edit Course Details</h3>
                    <form onSubmit={handleEditCourseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div className="form-input-group">
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Course Title</label>
                        <input
                          type="text"
                          className="form-select-field"
                          value={editCourseTitle}
                          onChange={(e) => setEditCourseTitle(e.target.value)}
                        />
                      </div>
                      <div className="form-input-group">
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Course Description</label>
                        <textarea
                          className="form-select-field"
                          value={editCourseDesc}
                          onChange={(e) => setEditCourseDesc(e.target.value)}
                          rows={4}
                          style={{ fontFamily: 'inherit', resize: 'vertical' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <Button type="button" variant="outline" onClick={() => setEditingCourseId(null)}>Cancel</Button>
                        <Button type="submit" variant="primary">Update Details</Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="manager-dashboard-grid">
                {/* Courses Listing */}
                <div className="manager-main-pane">
                  <div className="roster-card glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Bookmark size={18} className="icon-blue" />
                      <span>Syllabus Catalog ({activeManagerFilterDept === 'All' ? 'All' : activeManagerFilterDept} Department)</span>
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {managedCourses
                        .filter(c => activeManagerFilterDept === 'All' || c.course_code.includes(activeManagerFilterDept === 'Sales and Distribution' ? 'SD' : activeManagerFilterDept === 'FICO Finance' ? 'FICO' : activeManagerFilterDept))
                        .map(course => (
                          <div key={course.id} className="course-progress-row" style={{ gridTemplateColumns: '1fr auto', padding: '20px', backgroundColor: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
                            <div className="course-row-info">
                              <span className="course-row-code" style={{ color: 'var(--accent-color)', fontWeight: '700' }}>{course.course_code}</span>
                              <h4 style={{ margin: '4px 0 8px 0' }}>{course.title}</h4>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '8px' }}>{course.description}</p>
                              <span className="course-row-difficulty">{course.difficulty_level}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setEditingCourseId(course.id);
                                  setEditCourseTitle(course.title);
                                  setEditCourseDesc(course.description);
                                }}
                              >
                                Edit Course
                              </Button>
                            </div>
                          </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Side Pane: Department Syllabus Metadata */}
                <div className="manager-side-pane">
                  {activeManagerFilterDept !== 'All' ? (
                    <div className="sidebar-card glass-panel" style={{ borderLeft: '3px solid var(--accent-color)' }}>
                      <div className="sidebar-card-title">
                        <Users size={18} className="sidebar-icon icon-blue" />
                        <h3>{activeManagerFilterDept} Overview</h3>
                      </div>
                      <div style={{ marginTop: '12px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Dept Manager:</span>
                          <span style={{ fontWeight: '600' }}>{getManagerForDept(activeManagerFilterDept)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Matching Courses:</span>
                          <span style={{ fontWeight: '600' }}>
                            {managedCourses.filter(c => c.course_code.includes(activeManagerFilterDept === 'Sales and Distribution' ? 'SD' : activeManagerFilterDept === 'FICO Finance' ? 'FICO' : activeManagerFilterDept)).length} Published
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Roster Node Count:</span>
                          <span style={{ fontWeight: '600' }}>3 Members</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="sidebar-card glass-panel" style={{ borderLeft: '3px solid var(--accent-color)' }}>
                      <div className="sidebar-card-title">
                        <Users size={18} className="sidebar-icon icon-blue" />
                        <h3>Department Overview</h3>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.4' }}>
                        Select a department using the filter dropdown above to inspect course syllabus matching counts, department managers, and employee roster nodes.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW B: CREATE COURSE SYSTEM */}
          {managerSubView === 'create_course' && (
            <div className="manager-dashboard-grid" style={{ gridTemplateColumns: '1.8fr 1.2fr' }}>
              <div className="manager-main-pane">
                {/* Tabs for Create Course (if draft exists) */}
                {hasDraftCourse && (
                  <div className="create-course-tabs" style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                    <button
                      className={`tab-btn ${createCourseTab === 'resume' ? 'active' : ''}`}
                      onClick={() => setCreateCourseTab('resume')}
                      style={{
                        padding: '10px 18px',
                        borderRadius: 'var(--border-radius-sm)',
                        border: '1px solid var(--border-color)',
                        background: createCourseTab === 'resume' ? 'var(--accent-glow)' : 'transparent',
                        color: createCourseTab === 'resume' ? 'var(--accent-color)' : 'var(--text-secondary)',
                        fontWeight: '700',
                        fontSize: '0.82rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                        cursor: 'pointer',
                        transition: 'var(--transition-smooth)'
                      }}
                    >
                      📝 Resume Course Editing
                    </button>
                    <button
                      className={`tab-btn ${createCourseTab === 'new' ? 'active' : ''}`}
                      onClick={() => setCreateCourseTab('new')}
                      style={{
                        padding: '10px 18px',
                        borderRadius: 'var(--border-radius-sm)',
                        border: '1px solid var(--border-color)',
                        background: createCourseTab === 'new' ? 'var(--accent-glow)' : 'transparent',
                        color: createCourseTab === 'new' ? 'var(--accent-color)' : 'var(--text-secondary)',
                        fontWeight: '700',
                        fontSize: '0.82rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                        cursor: 'pointer',
                        transition: 'var(--transition-smooth)'
                      }}
                    >
                      ➕ Create New Course
                    </button>
                  </div>
                )}

                {/* If draft is active and resume is selected, render the Resume Draft panel */}
                {(hasDraftCourse && createCourseTab === 'resume') ? (
                  <div className="roster-card glass-panel" style={{ padding: '24px' }}>
                    <div className="roster-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', padding: 0, marginBottom: '12px' }}>
                      <PlusCircle size={18} className="icon-blue" />
                      <h3>Resume Course Editing Draft</h3>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                      Continue assembling your un-published course draft.
                    </p>

                    {isEditingDraft ? (
                      <form onSubmit={handleSaveDraft} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="form-input-group">
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Draft Title</label>
                          <input
                            type="text"
                            className="form-select-field"
                            value={draftTitle}
                            onChange={(e) => setDraftTitle(e.target.value)}
                          />
                        </div>
                        <div className="form-input-group">
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Draft Description</label>
                          <textarea
                            className="form-select-field"
                            value={draftDesc}
                            onChange={(e) => setDraftDesc(e.target.value)}
                            rows={3}
                            style={{ fontFamily: 'inherit' }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                          <Button type="submit" variant="primary" style={{ flex: 1 }}>Save Draft Changes</Button>
                          <Button 
                            type="button" 
                            variant="coral" 
                            style={{ flex: 1 }}
                            onClick={() => {
                              const newC: Course = {
                                id: `c${Date.now()}`,
                                course_code: 'AI-202',
                                title: draftTitle,
                                description: draftDesc,
                                difficulty_level: 'Advanced',
                                is_published: true
                              };
                              setManagedCourses(prev => [...prev, newC]);
                              setHasDraftCourse(false);
                              setIsEditingDraft(false);
                              alert(`Successfully published Draft "${draftTitle}" to active curriculum!`);
                              setManagerSubView('my_courses');
                            }}
                          >
                            Publish Draft
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div style={{ padding: '20px', backgroundColor: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
                        <h4 style={{ color: 'var(--text-primary)' }}>{draftTitle}</h4>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>{draftDesc}</p>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                          <Button variant="outline" onClick={() => setIsEditingDraft(true)}>Resume Draft Assembly</Button>
                          <Button variant="ghost" onClick={() => { if(confirm('Discard draft?')) setHasDraftCourse(false); }}>Discard Draft</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Render the Create New Course Form in the main pane */
                  <div className="assignment-form-card glass-panel" style={{ padding: '24px' }}>
                    <div className="form-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <PlusCircle size={18} className="icon-blue" />
                      <h3>Create New Course</h3>
                    </div>
                    <p className="form-card-subtitle" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                      Publish a new learning module instantly to curriculum.
                    </p>
                    
                    <form onSubmit={handleCreateNewCourseSubmit} className="assignment-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div className="form-input-group">
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Course Title</label>
                        <input
                          type="text"
                          className="form-select-field"
                          placeholder="e.g. ABAP Netweaver Basics"
                          value={newCourseTitle}
                          onChange={(e) => setNewCourseTitle(e.target.value)}
                        />
                      </div>
                      <div className="form-input-group">
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Course Code</label>
                        <input
                          type="text"
                          className="form-select-field"
                          placeholder="e.g. ABAP-101"
                          value={newCourseCode}
                          onChange={(e) => setNewCourseCode(e.target.value)}
                        />
                      </div>
                      <div className="form-input-group">
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Course Description</label>
                        <textarea
                          className="form-select-field"
                          placeholder="Core syntax, expressions and select queries."
                          value={newCourseDesc}
                          onChange={(e) => setNewCourseDesc(e.target.value)}
                          rows={3}
                          style={{ fontFamily: 'inherit' }}
                        />
                      </div>
                      <div className="form-input-group">
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Difficulty Level</label>
                        <select
                          className="form-select-field"
                          value={newCourseDiff}
                          onChange={(e) => setNewCourseDiff(e.target.value as any)}
                        >
                          <option value="Beginner">Beginner</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                        </select>
                      </div>

                      <Button type="submit" variant="primary" className="dispatch-btn" style={{ width: '100%' }}>
                        Publish Course Curriculum
                      </Button>
                    </form>
                  </div>
                )}
              </div>

              {/* Side Guide panel for L&D guidelines */}
              <div className="manager-side-pane">
                <div className="sidebar-card glass-panel" style={{ borderLeft: '3px solid var(--accent-color)' }}>
                  <div className="sidebar-card-title">
                    <ShieldAlert size={18} className="sidebar-icon icon-blue" />
                    <h3>L&D Standards</h3>
                  </div>
                  <div style={{ marginTop: '12px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '10px', lineHeight: '1.4' }}>
                    <p>All courses published here are synced automatically into the employee learning directory.</p>
                    <p><strong>Code Convention:</strong> Prefix course codes matching their department key (e.g. <code>AI-</code>, <code>SD-</code>, <code>FICO-</code>, <code>ABAP-</code>).</p>
                    <p><strong>Passing Criteria:</strong> The default assessment passing grade is set to 80% score limit.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW C: ROSTER AUDIT & REPORTING */}
          {managerSubView === 'audit_reporting' && (
            <div className="manager-main-content">
              {/* Employee Detail Assessment Modal (Scores) */}
              {selectedAuditEmp && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="modal-content glass-panel" style={{ padding: '32px', maxWidth: '520px', width: '90%', borderRadius: 'var(--border-radius-md)', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '16px' }}>
                      <h3>Employee Training Assessment Details</h3>
                      <button onClick={() => setSelectedAuditEmp(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <p style={{ fontSize: '0.9rem' }}>Employee Node: <strong>{selectedAuditEmp.name} ({selectedAuditEmp.code})</strong></p>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Registered Email: {selectedAuditEmp.email}</p>
                      
                      <div className="scores-table-section" style={{ marginTop: '12px' }}>
                        <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--accent-color)', letterSpacing: '0.03em', marginBottom: '8px' }}>Test Scores & Marks Report</h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                              <th style={{ padding: '8px 0', color: 'var(--text-secondary)' }}>Module Code</th>
                              <th style={{ padding: '8px 0', color: 'var(--text-secondary)' }}>Assessment Name</th>
                              <th style={{ padding: '8px 0', color: 'var(--text-secondary)', textAlign: 'right' }}>Scored Marks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedAuditEmp.testMarks.map((mark, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '10px 0' }}><code>{mark.courseCode}</code></td>
                                <td style={{ padding: '10px 0' }}>{mark.testName}</td>
                                <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: '700', color: mark.score >= 85 ? 'var(--neon-teal)' : 'var(--text-primary)' }}>
                                  {mark.score} / 100
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                      <Button variant="outline" onClick={() => setSelectedAuditEmp(null)}>Close Marks Registry</Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="roster-card glass-panel" style={{ padding: '24px' }}>
                <div className="roster-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', padding: 0, marginBottom: '16px' }}>
                  <Users size={18} className="roster-icon" />
                  <h3>Audit & Reporting: Enrolled Employee Roster</h3>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  Select an employee row to trace module assessment results, test marks, and skills index.
                </p>

                <div className="roster-table-wrapper">
                  <table className="roster-table">
                    <thead>
                      <tr>
                        <th>Employee Name</th>
                        <th>Employee Code</th>
                        <th>Email Contact</th>
                        <th>Active Course</th>
                        <th>Courses Taken</th>
                        <th>Current Completion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roster.map((emp) => (
                        <tr key={emp.id} onClick={() => setSelectedAuditEmp(emp)} style={{ cursor: 'pointer' }}>
                          <td className="emp-name-cell" style={{ color: 'var(--accent-color)' }}>{emp.name}</td>
                          <td><code>{emp.code}</code></td>
                          <td>{emp.email}</td>
                          <td><span className="emp-course-badge">{emp.assignedCourse}</span></td>
                          <td style={{ fontWeight: '600', paddingLeft: '24px' }}>{emp.coursesTaken}</td>
                          <td>
                            <div className="roster-progress-group">
                              <div className="mini-bar-container">
                                <div className="mini-bar-fill" style={{ width: `${emp.progressPercent}%` }}></div>
                              </div>
                              <span className="roster-percent-text">{emp.progressPercent}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. ADMINISTRATOR VIEW */}
      {activeMainView === 'dashboard' && role === 'Admin' && (
        <div className="dashboard-layout-admin">
          <div className="pane-header">
            <h3>Kiezen Administrative Control Center</h3>
            <p>System metrics, registered node components, and audit log schemas</p>
          </div>

          <div className="admin-dashboard-grid">
            {/* System Audit Event Logs */}
            <div className="admin-main-pane">
              <div className="admin-logs-card glass-panel">
                <div className="logs-card-header">
                  <ShieldAlert size={18} className="audit-icon-coral" />
                  <h3>Corporate Database Audit Logs</h3>
                </div>
                <p className="logs-card-subtitle">Registry records tracked by system hooks</p>

                <div className="logs-table-wrapper">
                  <table className="logs-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Actor</th>
                        <th>Action</th>
                        <th>Target Node</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="log-time-cell">{log.timestamp}</td>
                          <td><code>{log.actor.split('@')[0]}</code></td>
                          <td><span className="log-action-badge">{log.action}</span></td>
                          <td><code>{log.target}</code></td>
                          <td className="log-details-cell">{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Department Managers Registry */}
            <div className="admin-side-pane">
              <div className="admin-depts-card glass-panel">
                <div className="depts-card-header">
                  <FileText size={18} className="depts-icon-purple" />
                  <h3>Department Managers Registry</h3>
                </div>
                <p className="depts-card-subtitle">Node registries matching hierarchy database</p>
                
                <div className="depts-registry-list">
                  <div className="dept-registry-row">
                    <span className="dept-label">AI</span>
                    <span className="manager-val">Dr. Evelyn C.</span>
                  </div>
                  <div className="dept-registry-row">
                    <span className="dept-label">Sales & Distribution</span>
                    <span className="manager-val">Sarah Connor</span>
                  </div>
                  <div className="dept-registry-row">
                    <span className="dept-label">Material Management</span>
                    <span className="manager-val">Marcus Aurelius</span>
                  </div>
                  <div className="dept-registry-row">
                    <span className="dept-label">FICO Finance</span>
                    <span className="manager-val">Warren B.</span>
                  </div>
                  <div className="dept-registry-row">
                    <span className="dept-label">ABAP Development</span>
                    <span className="manager-val">Linus Torvalds</span>
                  </div>
                  <div className="dept-registry-row">
                    <span className="dept-label">HR and Admin</span>
                    <span className="manager-val">John Watson</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Course Modules Modal View */}
      {selectedCourseForModules && (
        <div className="modal-overlay" onClick={() => setSelectedCourseForModules(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ padding: '32px', maxWidth: '560px', width: '90%', borderRadius: 'var(--border-radius-md)', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-premium)' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--accent-color)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{selectedCourseForModules.courseCode} Modules</span>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: 0 }}>{selectedCourseForModules.title}</h3>
              </div>
              <button onClick={() => setSelectedCourseForModules(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer', padding: 0, lineHeight: 1 }}>&times;</button>
            </div>
            
            <div className="modules-list" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {getModulesForCourse(selectedCourseForModules.courseCode, selectedCourseForModules.progressPercent).map((mod, index) => (
                <div key={index} className="module-step-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="step-number" style={{ fontStyle: 'normal', fontWeight: '800', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>0{index + 1}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-primary)' }}>{mod.title}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Duration: {mod.duration}</span>
                    </div>
                  </div>
                  <span className={`status-badge ${mod.isCompleted ? 'completed' : 'pending'}`} style={{ fontSize: '0.72rem', fontWeight: '700', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase', color: mod.isCompleted ? 'var(--neon-teal)' : 'var(--text-secondary)', backgroundColor: mod.isCompleted ? 'var(--neon-teal-glow)' : 'var(--border-color)' }}>
                    {mod.isCompleted ? 'Completed' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              {selectedCourseForModules.progressPercent < 100 && (
                <Button 
                  variant="primary" 
                  onClick={() => {
                    handleStudyIncrement(selectedCourseForModules.id);
                    setSelectedCourseForModules(prev => {
                      if (!prev) return null;
                      return { ...prev, progressPercent: Math.min(prev.progressPercent + 20, 100) };
                    });
                  }}
                >
                  Resume Study
                </Button>
              )}
              <Button variant="outline" onClick={() => setSelectedCourseForModules(null)}>Close Syllabus</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
