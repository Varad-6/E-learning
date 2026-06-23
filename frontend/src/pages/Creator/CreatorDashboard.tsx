import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Plus, BookOpen, Clock, X, AlertTriangle, ShieldAlert,
  ArrowLeft, Layers, CheckCircle2, ChevronRight
} from 'lucide-react';
import { Button } from '../../components/Button/Button';
import './Creator.css';

interface CourseData {
  id: string;
  course_code: string;
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  duration: string;
  is_published: boolean;
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected';
  creatorName: string;
  creatorRole: string;
  departmentName: string;
  rejectionReason?: string;
  createdDate: string;
}

interface AppNotification {
  id: string;
  message: string;
  type: 'submission' | 'approval' | 'rejection';
  courseId: string;
  deptName?: string;
  isRead: boolean;
  timestamp: string;
}

interface ToastMsg {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'info';
}

const DEPARTMENTS = [
  'AI',
  'Sales and Marketing',
  'SAP MM',
  'SAP PP',
  'SAP FICO',
  'SAP ABAP',
  'SAP Basis',
  'HR and Admin',
  'SAP SD',
  'Accounts'
];

const INITIAL_COURSES: CourseData[] = [
  { 
    id: 'c1', 
    course_code: 'AI-101', 
    title: 'Artificial Intelligence Foundations', 
    description: 'Core principles of machine learning models, neural networks, and AI ethics.', 
    priority: 'High', 
    duration: '12 Hours', 
    is_published: true, 
    status: 'Approved', 
    creatorName: 'Dr. Evelyn C.', 
    creatorRole: 'Department Head', 
    departmentName: 'AI', 
    createdDate: '2026-06-20' 
  },
  { 
    id: 'c2', 
    course_code: 'FICO-202', 
    title: 'SAP FICO Ledger & Asset Accounting', 
    description: 'Learn financial control parameters, ledger structures, and cost calculations.', 
    priority: 'Medium', 
    duration: '16 Hours', 
    is_published: true, 
    status: 'Approved', 
    creatorName: 'Dr. Evelyn C.', 
    creatorRole: 'Department Head', 
    departmentName: 'SAP FICO', 
    createdDate: '2026-06-18' 
  },
  { 
    id: 'c3', 
    course_code: 'ABAP-301', 
    title: 'ABAP Syntax & Database Orchestration', 
    description: 'Advanced programming on SAP NetWeaver, custom database queries, and RFCs.', 
    priority: 'High', 
    duration: '20 Hours', 
    is_published: true, 
    status: 'Approved', 
    creatorName: 'Systems Administrator', 
    creatorRole: 'Admin', 
    departmentName: 'SAP ABAP', 
    createdDate: '2026-06-19' 
  },
  { 
    id: 'c4', 
    course_code: 'SD-102', 
    title: 'Sales and Distribution Lifecycle', 
    description: 'Master shipping structures, bill matrices, and customer logistics pipelines.', 
    priority: 'Low', 
    duration: '8 Hours', 
    is_published: true, 
    status: 'Approved', 
    creatorName: 'John Doe', 
    creatorRole: 'Employee', 
    departmentName: 'SAP SD', 
    createdDate: '2026-06-15' 
  },
  { 
    id: 'c5', 
    course_code: 'AI-201', 
    title: 'Deep Learning Practical Guide', 
    description: 'Hands-on project configuring CNN and RNN architectures using PyTorch.', 
    priority: 'Medium', 
    duration: '14 Hours', 
    is_published: false, 
    status: 'Pending', 
    creatorName: 'John Doe', 
    creatorRole: 'Employee', 
    departmentName: 'AI', 
    createdDate: '2026-06-22' 
  },
  { 
    id: 'c6', 
    course_code: 'ENG-303', 
    title: 'SAP MM Inventory Management', 
    description: 'Master warehouse inventories, goods receipt transfers, and automatic physical inventory checks.', 
    priority: 'High', 
    duration: '18 Hours', 
    is_published: false, 
    status: 'Pending', 
    creatorName: 'Sarah Jenkins', 
    creatorRole: 'Employee', 
    departmentName: 'SAP MM', 
    createdDate: '2026-06-23' 
  },
  { 
    id: 'c7', 
    course_code: 'SAL-104', 
    title: 'Client Relationship Management Patterns', 
    description: 'Basic guidelines for key accounts mapping and CRM integration pipelines.', 
    priority: 'Low', 
    duration: '6 Hours', 
    is_published: false, 
    status: 'Pending', 
    creatorName: 'Timothy Vance', 
    creatorRole: 'Employee', 
    departmentName: 'Sales and Marketing', 
    createdDate: '2026-06-22' 
  }
];

export const CreatorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // User context
  const [role, setRole] = useState('Employee');
  const [dept, setDept] = useState('AI');
  const [profileName, setProfileName] = useState('John Doe');

  // Core list states
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  // Navigation states
  const [activeTab, setActiveTab] = useState<'my_courses' | 'approvals' | 'auditing'>('my_courses');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Draft' | 'Pending' | 'Approved' | 'Rejected'>('All');
  
  // Admin approvals view
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  // Modals & Sliders
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [reviewCourse, setReviewCourse] = useState<CourseData | null>(null);
  const [rejectionCourse, setRejectionCourse] = useState<CourseData | null>(null);
  const [rejectionText, setRejectionText] = useState('');

  // Course Form States
  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [duration, setDuration] = useState('');
  const [creatorNameInput, setCreatorNameInput] = useState('');
  const [targetDeptInput, setTargetDeptInput] = useState('AI');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    // Sync user details
    const savedRole = localStorage.getItem('isLoggedInRole') || 'Employee';
    const savedDept = localStorage.getItem('isLoggedInDept') || 'AI';
    const savedName = localStorage.getItem('profileName') || 'John Doe';
    
    setRole(savedRole);
    setDept(savedDept);
    setProfileName(savedName);
    setCreatorNameInput(savedName);
    setTargetDeptInput(savedDept);

    // Initialize course database
    const localCourses = localStorage.getItem('creator_courses');
    if (localCourses) {
      setCourses(JSON.parse(localCourses));
    } else {
      setCourses(INITIAL_COURSES);
      localStorage.setItem('creator_courses', JSON.stringify(INITIAL_COURSES));
    }
  }, []);

  // Sync Search Query Parameters (Global Bell navigation listeners)
  useEffect(() => {
    if (courses.length === 0) return;

    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    const courseIdParam = params.get('courseId');
    const deptParam = params.get('dept');

    if (tabParam) {
      setActiveTab(tabParam as any);
      
      if (tabParam === 'approvals' && deptParam && role === 'Admin') {
        setSelectedDept(deptParam);
      }
      
      if (courseIdParam) {
        const target = courses.find(c => c.id === courseIdParam);
        if (target) {
          if (tabParam === 'approvals') {
            setReviewCourse(target);
          } else if (tabParam === 'my_courses') {
            setStatusFilter(target.status);
            triggerToast(`Highlighting Course: ${target.title} (${target.course_code})`, 'info');
          }
        }
      }
      
      // Clean up URL query parameters so the view remains clean on refresh/action
      navigate('/creator/dashboard', { replace: true });
    }
  }, [location.search, courses, role, navigate]);

  // Update Courses Helper
  const syncCourses = (updated: CourseData[]) => {
    setCourses(updated);
    localStorage.setItem('creator_courses', JSON.stringify(updated));
  };

  // Dispatch Global Notifications Event Helper
  const dispatchNotification = (newNotif: AppNotification) => {
    const localNotifs = localStorage.getItem('kiezen_notifications');
    const notifsList = localNotifs ? JSON.parse(localNotifs) : [];
    const updated = [newNotif, ...notifsList];
    localStorage.setItem('kiezen_notifications', JSON.stringify(updated));
    
    // Dispatch custom event to let the Navbar listen and reload
    window.dispatchEvent(new Event('kiezen_notifications_changed'));
  };

  // Toast Trigger Helper
  const triggerToast = (message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    const id = `t_${Date.now()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const handleOpenCreateModal = () => {
    setCreatorNameInput(profileName);
    setTargetDeptInput(dept);
    setIsCreateModalOpen(true);
    setErrors({});
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setTitle('');
    setCourseCode('');
    setDescription('');
    setPriority('Medium');
    setDuration('');
    setErrors({});
  };

  const validate = () => {
    const tempErrors: { [key: string]: string } = {};
    if (!title.trim()) tempErrors.title = 'Course Title is required.';
    if (!courseCode.trim()) tempErrors.courseCode = 'Course Code is required.';
    if (!description.trim()) tempErrors.description = 'Course Description is required.';
    if (!duration.trim()) tempErrors.duration = 'Duration is required.';
    if (!creatorNameInput.trim()) tempErrors.creatorName = 'Creator Name is required.';
    
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const isAdmin = role === 'Admin';
    const newCourse: CourseData = {
      id: `c_${Date.now()}`,
      course_code: courseCode.trim().toUpperCase(),
      title: title.trim(),
      description: description.trim(),
      priority,
      duration: duration.trim(),
      is_published: isAdmin,
      status: isAdmin ? 'Approved' : 'Draft',
      creatorName: creatorNameInput.trim(),
      creatorRole: role === 'Manager' ? 'Department Head' : role,
      departmentName: targetDeptInput,
      createdDate: new Date().toISOString().split('T')[0]
    };

    const updated = [newCourse, ...courses];
    syncCourses(updated);
    triggerToast(isAdmin ? 'Course created and published globally!' : 'Course draft created successfully!', 'success');
    handleCloseCreateModal();
  };

  // Lifecycle Transitions
  const handleSubmitForReview = (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const updated = courses.map(c => {
      if (c.id === courseId) {
        return { ...c, status: 'Pending' as const };
      }
      return c;
    });
    syncCourses(updated);

    // Dispatch notification to department heads
    const newNotif: AppNotification = {
      id: `n_${Date.now()}`,
      message: `📢 ${course.creatorName} (${course.creatorRole}) submitted course ${course.title} (${course.course_code}) for approval.`,
      type: 'submission',
      courseId: course.id,
      deptName: course.departmentName,
      isRead: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    dispatchNotification(newNotif);
    triggerToast('Submitted for Department Head approval!', 'info');
  };

  const handleApprove = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const updated = courses.map(c => {
      if (c.id === courseId) {
        return { 
          ...c, 
          status: 'Approved' as const, 
          is_published: true, 
          rejectionReason: undefined 
        };
      }
      return c;
    });
    syncCourses(updated);

    // Dispatch notification to employee creator
    const newNotif: AppNotification = {
      id: `n_${Date.now()}`,
      message: `🎉 Your course ${course.title} (${course.course_code}) has been Approved and published!`,
      type: 'approval',
      courseId: course.id,
      isRead: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    dispatchNotification(newNotif);
    triggerToast('Course approved and published successfully!', 'success');
    setReviewCourse(null);
  };

  const handleRejectClick = (course: CourseData, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRejectionCourse(course);
    setRejectionText('');
  };

  const handleRejectSubmit = () => {
    if (!rejectionText.trim() || !rejectionCourse) return;
    const courseId = rejectionCourse.id;

    const updated = courses.map(c => {
      if (c.id === courseId) {
        return { 
          ...c, 
          status: 'Rejected' as const, 
          is_published: false, 
          rejectionReason: rejectionText.trim() 
        };
      }
      return c;
    });
    syncCourses(updated);

    // Dispatch notification to employee creator
    const newNotif: AppNotification = {
      id: `n_${Date.now()}`,
      message: `⚠️ Your course ${rejectionCourse.title} (${rejectionCourse.course_code}) was Rejected: "${rejectionText.trim()}".`,
      type: 'rejection',
      courseId: courseId,
      isRead: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    dispatchNotification(newNotif);
    triggerToast('Course review rejected with feedback notes.', 'warning');
    
    setRejectionCourse(null);
    setReviewCourse(null);
  };

  // Scoped views based on active profile
  const isDeptHead = role === 'Manager';
  const isAdmin = role === 'Admin';
  
  // Filter courses owned by active user
  const myCreatedCourses = courses.filter(c => {
    return (
      c.creatorName === profileName || 
      (profileName === 'John Doe' && c.creatorName === 'John Doe') ||
      (profileName === 'Dr. Evelyn C.' && c.creatorName === 'Dr. Evelyn C.') ||
      (profileName === 'Systems Administrator' && c.creatorName === 'Systems Administrator')
    );
  });

  const filteredMyCourses = myCreatedCourses.filter(c => {
    if (statusFilter === 'All') return true;
    return c.status === statusFilter;
  });

  // Scope approvals visible to active role
  const pendingApprovals = courses.filter(c => {
    if (c.status !== 'Pending') return false;
    if (isAdmin) {
      return selectedDept ? c.departmentName === selectedDept : true;
    }
    if (isDeptHead) {
      return c.departmentName === dept;
    }
    return false;
  });

  return (
    <div className="creator-workspace container">
      {/* Floating Snackbar Alert Toasts */}
      <div className="toasts-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast-alert toast-${t.type} animate-slide-left`}>
            {t.type === 'success' && <CheckCircle2 size={16} className="toast-icon" />}
            {t.type === 'warning' && <AlertTriangle size={16} className="toast-icon animate-bounce" />}
            {t.type === 'info' && <AlertTriangle size={16} className="toast-icon" style={{ color: 'var(--accent-color)' }} />}
            <span className="toast-message">{t.message}</span>
            <button className="toast-close-btn" onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Header Panel */}
      <div className="creator-header">
        <div>
          <h1>Creator Studio</h1>
          <p>Design, compile, and manage high-quality corporate training pathways and modules.</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Button 
            variant="primary" 
            onClick={handleOpenCreateModal}
            leftIcon={<Plus size={18} />}
          >
            Create New Course
          </Button>
        </div>
      </div>

      {/* Tabs Layout (If Dept Head or Admin) */}
      {(isDeptHead || isAdmin) && (
        <div className="sidebar-tabs-header" style={{ marginBottom: '30px' }}>
          <button 
            className={`sidebar-tab-btn ${activeTab === 'my_courses' ? 'active' : ''}`}
            onClick={() => setActiveTab('my_courses')}
          >
            My Created Courses
          </button>
          <button 
            className={`sidebar-tab-btn ${activeTab === 'approvals' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('approvals');
              setSelectedDept(null); // Reset admin department selector
            }}
          >
            Course Approvals ({courses.filter(c => c.status === 'Pending' && (isAdmin || (isDeptHead && c.departmentName === dept))).length})
          </button>
          <button 
            className={`sidebar-tab-btn ${activeTab === 'auditing' ? 'active' : ''}`}
            onClick={() => setActiveTab('auditing')}
          >
            Studio Analytics
          </button>
        </div>
      )}

      {/* Tab 1: My Created Courses */}
      {activeTab === 'my_courses' && (
        <>
          {/* Status Filter Metrics Bar */}
          <div className="creator-stats-row">
            <div className={`stat-card ${statusFilter === 'All' ? 'active-filter' : ''}`} onClick={() => setStatusFilter('All')} style={{ cursor: 'pointer' }}>
              <div className="stat-card-title">Total Created</div>
              <div className="stat-card-value">{myCreatedCourses.length}</div>
            </div>
            <div className={`stat-card ${statusFilter === 'Draft' ? 'active-filter' : ''}`} onClick={() => setStatusFilter('Draft')} style={{ cursor: 'pointer' }}>
              <div className="stat-card-title">Drafts</div>
              <div className="stat-card-value" style={{ color: 'var(--text-secondary)' }}>
                {myCreatedCourses.filter(c => c.status === 'Draft').length}
              </div>
            </div>
            <div className={`stat-card ${statusFilter === 'Pending' ? 'active-filter' : ''}`} onClick={() => setStatusFilter('Pending')} style={{ cursor: 'pointer' }}>
              <div className="stat-card-title">Pending</div>
              <div className="stat-card-value" style={{ color: 'var(--neon-coral-glow)' }}>
                {myCreatedCourses.filter(c => c.status === 'Pending').length}
              </div>
            </div>
            <div className={`stat-card ${statusFilter === 'Approved' ? 'active-filter' : ''}`} onClick={() => setStatusFilter('Approved')} style={{ cursor: 'pointer' }}>
              <div className="stat-card-title">Approved</div>
              <div className="stat-card-value" style={{ color: 'var(--neon-teal)' }}>
                {myCreatedCourses.filter(c => c.status === 'Approved').length}
              </div>
            </div>
            <div className={`stat-card ${statusFilter === 'Rejected' ? 'active-filter' : ''}`} onClick={() => setStatusFilter('Rejected')} style={{ cursor: 'pointer' }}>
              <div className="stat-card-title">Rejected</div>
              <div className="stat-card-value" style={{ color: 'var(--neon-coral)' }}>
                {myCreatedCourses.filter(c => c.status === 'Rejected').length}
              </div>
            </div>
          </div>

          {/* Grid Canvas Header */}
          <div className="course-grid-header">
            <h2>{statusFilter} Courses</h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Showing {filteredMyCourses.length} courses
            </span>
          </div>

          {/* Grid Canvas Body */}
          {filteredMyCourses.length === 0 ? (
            <div className="empty-state-banner">
              <BookOpen size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <h3>No Courses Found</h3>
              <p>Try changing filters or click "Create New Course" to add a pathway syllabus.</p>
            </div>
          ) : (
            <div className="creator-course-grid">
              {filteredMyCourses.map((course) => (
                <div 
                  key={course.id} 
                  className={`creator-course-card glass-panel status-${course.status.toLowerCase()} ${course.status === 'Rejected' ? 'card-rejected-border' : ''}`}
                  onClick={() => navigate(`/creator/course/${course.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="course-card-meta">
                    <span className="course-badge-code">{course.course_code}</span>
                    <span className={`course-badge-status status-${course.status.toLowerCase()}`}>
                      {course.status}
                    </span>
                  </div>
                  
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>

                  {/* Rejection Alert notes */}
                  {course.status === 'Rejected' && course.rejectionReason && (
                    <div className="rejection-card-alert">
                      <ShieldAlert size={14} className="rejection-alert-icon" />
                      <span><strong>Rejection Feedback:</strong> {course.rejectionReason}</span>
                    </div>
                  )}
                  
                  <div className="course-card-footer">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span className="course-card-duration">
                        <Clock size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        {course.duration}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        Target: <strong>{course.departmentName}</strong>
                      </span>
                    </div>

                    {/* Submit Option if Draft/Rejected */}
                    {(course.status === 'Draft' || course.status === 'Rejected') ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleSubmitForReview(course.id, e)}
                        className="submit-review-card-btn"
                        style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                      >
                        Submit for Review
                      </Button>
                    ) : (
                      <span className={`badge ${course.is_published ? 'success' : 'warning'}`}>
                        {course.is_published ? 'Published' : 'Under Review'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab 2: Approvals View */}
      {activeTab === 'approvals' && (
        <div className="approvals-tab-canvas animate-fade-in">
          {/* Admin Department Selector Grid */}
          {isAdmin && selectedDept === null ? (
            <div className="admin-dept-grid-section">
              <div className="pane-header" style={{ marginBottom: '24px' }}>
                <h2>Select Department for Approvals</h2>
                <p>Select a departmental node below to inspect compliance pathways awaiting validation.</p>
              </div>

              <div className="dept-selector-grid">
                {DEPARTMENTS.map(deptName => {
                  const pendingCount = courses.filter(c => c.status === 'Pending' && c.departmentName === deptName).length;
                  return (
                    <div 
                      key={deptName} 
                      className={`dept-selector-card glass-panel glow-hover ${pendingCount > 0 ? 'has-pending' : ''}`}
                      onClick={() => setSelectedDept(deptName)}
                    >
                      <div className="dept-card-header-row">
                        <div className="dept-icon-box">
                          <Layers size={22} />
                        </div>
                        {pendingCount > 0 && (
                          <span className="pending-badge-count">{pendingCount} Pending</span>
                        )}
                      </div>
                      <h3>{deptName}</h3>
                      <p>View courses designed by employees in the {deptName} team.</p>
                      
                      <div className="dept-card-footer">
                        <span>Inspect Approvals</span>
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Scoped Approvals Table (for Dept Head OR selected Admin Department) */
            <div className="scoped-approvals-table-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  {isAdmin && (
                    <button onClick={() => setSelectedDept(null)} className="back-dept-btn">
                      <ArrowLeft size={16} />
                      <span>Back to Departments</span>
                    </button>
                  )}
                  <h2 style={{ marginTop: '12px' }}>
                    {isAdmin ? `${selectedDept} Approvals` : `${dept} Department Approvals`}
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Evaluate compliance courses submitted for active deployment review.
                  </p>
                </div>

                <div className="approvals-count-pill">
                  {pendingApprovals.length} Pending Review
                </div>
              </div>

              {pendingApprovals.length === 0 ? (
                <div className="empty-state-banner" style={{ padding: '60px 20px' }}>
                  <CheckCircle2 size={48} style={{ color: 'var(--neon-teal)', margin: '0 auto 16px' }} />
                  <h3>All Caught Up!</h3>
                  <p>No courses in this department are currently awaiting approval review.</p>
                </div>
              ) : (
                <div className="approvals-table-wrapper glass-panel">
                  <table className="approvals-table">
                    <thead>
                      <tr>
                        <th>Course details</th>
                        <th>Created By</th>
                        <th>Submission Date</th>
                        <th>Priority</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingApprovals.map(course => (
                        <tr key={course.id} className="approval-row-hover">
                          <td>
                            <div className="table-course-info">
                              <span className="code-tag">{course.course_code}</span>
                              <div>
                                <span className="title-text">{course.title}</span>
                                <span className="duration-text">{course.duration} duration</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="table-creator-info">
                              <span className="name">{course.creatorName}</span>
                              <span className="role">{course.creatorRole} ({course.departmentName})</span>
                            </div>
                          </td>
                          <td style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                            {course.createdDate}
                          </td>
                          <td>
                            <span className={`course-badge-priority ${course.priority.toLowerCase()}`} style={{ display: 'inline-block' }}>
                              {course.priority}
                            </span>
                          </td>
                          <td>
                            <div className="approvals-table-actions">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setReviewCourse(course)}
                              >
                                Review
                              </Button>
                              <Button 
                                variant="primary" 
                                size="sm"
                                onClick={() => handleApprove(course.id)}
                              >
                                Approve
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="reject-table-btn"
                                onClick={(e) => handleRejectClick(course, e)}
                              >
                                Reject
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Analytics View */}
      {activeTab === 'auditing' && (
        <div className="analytics-canvas animate-fade-in">
          <div className="pane-header" style={{ marginBottom: '28px' }}>
            <h2>Studio Analytics</h2>
            <p>Inspection overview of platform deployment metrics and learning compliance charts.</p>
          </div>

          <div className="analytics-stats-grid">
            <div className="stat-card">
              <div className="stat-card-title">Approved Curriculums</div>
              <div className="stat-card-value" style={{ color: 'var(--neon-teal)' }}>
                {courses.filter(c => c.status === 'Approved').length}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Active and visible to learners</p>
            </div>
            <div className="stat-card">
              <div className="stat-card-title">Pending Validation</div>
              <div className="stat-card-value" style={{ color: 'var(--neon-coral-glow)' }}>
                {courses.filter(c => c.status === 'Pending').length}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Awaiting review from Dept Heads</p>
            </div>
            <div className="stat-card">
              <div className="stat-card-title">Active Contributors</div>
              <div className="stat-card-value">12 Contributors</div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Across all 10 departments</p>
            </div>
          </div>

          <div className="analytics-details-layout glass-panel" style={{ marginTop: '24px', padding: '24px' }}>
            <h3>Platform Guidelines & Department Scopes</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginTop: '8px' }}>
              Corporate learning paths created by employees are in **Draft** state by default. They can compile syllabus contents, upload mock YouTube attachment links, and create MCQ checkpoints.
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginTop: '12px' }}>
              Once compiled, pathways should be submitted for approval. A **Department Head** reviews and approves pathways matching their department registry, while **System Administrators** retain global approval powers.
            </p>
          </div>
        </div>
      )}

      {/* Slide-over Review Drawer Overlay */}
      {reviewCourse && (
        <div className="modal-overlay review-overlay" onClick={() => setReviewCourse(null)}>
          <div className="review-drawer-panel glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header-row">
              <div>
                <span className="code-tag">{reviewCourse.course_code}</span>
                <h2>Course Review</h2>
              </div>
              <button className="close-modal-btn" onClick={() => setReviewCourse(null)}>
                <X size={24} />
              </button>
            </div>

            <div className="drawer-scroll-body">
              <section className="drawer-section">
                <h3>General Information</h3>
                <div className="info-grid-compact">
                  <div>
                    <label>Course Title</label>
                    <p style={{ fontWeight: '600' }}>{reviewCourse.title}</p>
                  </div>
                  <div>
                    <label>Creator Details</label>
                    <p>{reviewCourse.creatorName} ({reviewCourse.creatorRole})</p>
                  </div>
                  <div>
                    <label>Department Target</label>
                    <p>{reviewCourse.departmentName} Department</p>
                  </div>
                  <div>
                    <label>Priority / Length</label>
                    <p>
                      <span className={`course-badge-priority ${reviewCourse.priority.toLowerCase()}`} style={{ marginRight: '8px' }}>{reviewCourse.priority}</span>
                      {reviewCourse.duration}
                    </p>
                  </div>
                </div>
              </section>

              <section className="drawer-section">
                <h3>Course Description</h3>
                <p className="description-text">{reviewCourse.description}</p>
              </section>

              <section className="drawer-section">
                <h3>Syllabus Curriculum Modules</h3>
                <div className="simulated-syllabus-list">
                  <div className="syllabus-sim-item">
                    <span className="module-no">Module 1</span>
                    <div>
                      <h4>Core Foundations & Guidelines</h4>
                      <p>Basic glossary, process parameters setup, and introduction timeline benchmarks.</p>
                    </div>
                  </div>
                  <div className="syllabus-sim-item">
                    <span className="module-no">Module 2</span>
                    <div>
                      <h4>Practical Workflow Applications</h4>
                      <p>Hands-on sandbox exercise, common logging structures, and checklist audit reports.</p>
                    </div>
                  </div>
                  <div className="syllabus-sim-item">
                    <span className="module-no">Module 3</span>
                    <div>
                      <h4>Final Comprehensive MCQ Review</h4>
                      <p>10 check questions evaluating student knowledge retention limits.</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="drawer-footer-actions">
              <Button 
                variant="outline" 
                className="reject-action-btn"
                onClick={(e) => handleRejectClick(reviewCourse, e)}
              >
                Reject Course
              </Button>
              <Button 
                variant="primary" 
                onClick={() => handleApprove(reviewCourse.id)}
              >
                Approve & Publish
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Feedback Prompt Dialog */}
      {rejectionCourse && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content-card glass-panel" style={{ maxWidth: '460px' }}>
            <div className="modal-header-row">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle style={{ color: 'var(--neon-coral)' }} />
                <span>Rejection Feedback</span>
              </h2>
              <button className="close-modal-btn" onClick={() => setRejectionCourse(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="rejection-prompt-body">
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
                Provide detailed feedback for **{rejectionCourse.title}**. The creator will see this message and edit their course for resubmission.
              </p>

              <div className="form-group-spaced">
                <label className="form-label-styled">Rejection Reason / Notes <span className="required-star">*</span></label>
                <textarea 
                  className="form-textarea-styled"
                  placeholder="e.g. Please enrich Module 2 syllabus content or add a minimum duration."
                  value={rejectionText}
                  onChange={(e) => setRejectionText(e.target.value)}
                  style={{ minHeight: '110px' }}
                />
              </div>
            </div>

            <div className="modal-footer-actions">
              <Button variant="outline" onClick={() => setRejectionCourse(null)}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleRejectSubmit}
                disabled={!rejectionText.trim()}
                style={{ backgroundColor: 'var(--neon-coral)', borderColor: 'var(--neon-coral)' }}
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Course Creation Modal Overlay */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content-card glass-panel">
            <div className="modal-header-row">
              <h2>Create Course Option</h2>
              <button onClick={handleCloseCreateModal} className="close-modal-btn">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              {/* Creator Name (Mandatory Input) */}
              <div className="form-group-spaced">
                <label className="form-label-styled">
                  Creator Name <span className="required-star">*</span>
                </label>
                <input 
                  type="text" 
                  className="form-input-styled" 
                  placeholder="Enter your name"
                  value={creatorNameInput}
                  onChange={(e) => setCreatorNameInput(e.target.value)}
                />
                {errors.creatorName && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>{errors.creatorName}</p>
                )}
              </div>

              {/* Title */}
              <div className="form-group-spaced">
                <label className="form-label-styled">
                  Course Title <span className="required-star">*</span>
                </label>
                <input 
                  type="text" 
                  className="form-input-styled" 
                  placeholder="e.g. Advanced Production Design"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                {errors.title && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>{errors.title}</p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Code */}
                <div className="form-group-spaced">
                  <label className="form-label-styled">
                    Course Code <span className="required-star">*</span>
                  </label>
                  <input 
                    type="text" 
                    className="form-input-styled" 
                    placeholder="e.g. APD-101"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                  />
                  {errors.courseCode && (
                    <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>{errors.courseCode}</p>
                  )}
                </div>

                {/* Target Department Selection */}
                <div className="form-group-spaced">
                  <label className="form-label-styled">
                    Target Department <span className="required-star">*</span>
                  </label>
                  <select 
                    className="form-select-styled"
                    value={targetDeptInput}
                    onChange={(e) => setTargetDeptInput(e.target.value)}
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="form-group-spaced">
                <label className="form-label-styled">
                  Course Description <span className="required-star">*</span>
                </label>
                <textarea 
                  className="form-textarea-styled" 
                  placeholder="Summarize course topics, learning targets, and outcomes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                {errors.description && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>{errors.description}</p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Priority */}
                <div className="form-group-spaced">
                  <label className="form-label-styled">
                    Priority <span className="required-star">*</span>
                  </label>
                  <select 
                    className="form-select-styled"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                {/* Duration */}
                <div className="form-group-spaced">
                  <label className="form-label-styled">
                    Duration <span className="required-star">*</span>
                  </label>
                  <input 
                    type="text" 
                    className="form-input-styled" 
                    placeholder="e.g. 10 Hours or 4 Weeks"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                  {errors.duration && (
                    <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>{errors.duration}</p>
                  )}
                </div>
              </div>

              <div className="modal-footer-actions">
                <Button variant="outline" type="button" onClick={handleCloseCreateModal}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Create Course
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
