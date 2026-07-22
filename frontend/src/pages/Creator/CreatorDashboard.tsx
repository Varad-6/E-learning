import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Plus, BookOpen, Clock, X, AlertTriangle, ShieldAlert,
  ArrowLeft, Layers, ChevronRight, CheckCircle2
} from 'lucide-react';
import { Button } from '../../components/Button/Button';
import { Modal } from '../../components/Modal/Modal';
import { apiCall } from '../../services/api';
import './Creator.css';

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
}

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
  department_id?: string;
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
  type: 'success' | 'warning' | 'info' | 'error';
}



const INITIAL_COURSES: CourseData[] = [];

export const CreatorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // User context
  const [role, setRole] = useState('Employee');
  const [dept, setDept] = useState('AI');
  const [profileName, setProfileName] = useState('John Doe');
  const [reviewModules, setReviewModules] = useState<any[]>([]);

  // Core list states
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  // Navigation states
  const [activeTab, setActiveTab] = useState<'my_courses' | 'approvals' | 'auditing' | 'departments'>('my_courses');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Draft' | 'Pending' | 'Approved' | 'Rejected'>('All');
  
  // Admin departments state
  const [departmentsList, setDepartmentsList] = useState<{ id: string; name: string; code: string; description?: string }[]>([]);
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [isLoadingDepts, setIsLoadingDepts] = useState(false);
  
  // Admin approvals view
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedCreatorDept, setSelectedCreatorDept] = useState<Department | null>(null);

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
  const [durationDays, setDurationDays] = useState(0);
  const [durationHours, setDurationHours] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [creatorNameInput, setCreatorNameInput] = useState('');
  const [targetDeptInput, setTargetDeptInput] = useState('AI');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const fetchDBCourses = async () => {
    try {
      const response = await apiCall('/api/courses');
      if (response.ok) {
        const data = await response.json();
        const dbCourses = data.courses || [];
        const mapped = dbCourses.map((c: any) => {
          let frontendStatus: 'Draft' | 'Pending' | 'Approved' | 'Rejected' = 'Draft';
          const backendStatus = c.status?.toLowerCase();
          if (backendStatus === 'pending') frontendStatus = 'Pending';
          else if (backendStatus === 'approved') frontendStatus = 'Approved';
          else if (backendStatus === 'rejected') frontendStatus = 'Rejected';
          
          return {
            id: c.id,
            course_code: c.course_code,
            title: c.title,
            description: c.description || '',
            priority: c.priority || 'Medium',
            duration: c.duration || '10 hours',
            is_published: c.is_published,
            status: frontendStatus,
            creatorName: c.creator_name || 'John Doe',
            creatorRole: c.creator_role || 'Employee',
            department_id: c.department_id,
            departmentName: c.department_name || 'AI',
            createdDate: c.created_at ? c.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            rejectionReason: c.rejection_reason || undefined
          };
        });
        setCourses(mapped);
        localStorage.setItem('creator_courses', JSON.stringify(mapped));
      }

      // Done fetching courses
    } catch (err) {
      console.error('Failed to load courses from DB:', err);
    }
  };

  useEffect(() => {
    const rawRolesStr = localStorage.getItem('rawRoles');
    const rawRoles = rawRolesStr ? JSON.parse(rawRolesStr) : [];
    const hasAccess = rawRoles.includes('SYSTEM_ADMIN') || rawRoles.includes('COURSE_MANAGER');
    if (!hasAccess) {
      navigate('/dashboard');
      return;
    }

    // Sync user details
    const savedRole = localStorage.getItem('isLoggedInRole') || 'Employee';
    const savedDept = localStorage.getItem('isLoggedInDept') || 'AI';
    const savedName = localStorage.getItem('profileName') || 'John Doe';
    
    setRole(savedRole);
    setDept(savedDept);
    setProfileName(savedName);
    setCreatorNameInput(savedName);
    setTargetDeptInput(savedDept);

    const loadDepts = async () => {
      try {
        const response = await apiCall('/api/departments');
        if (response.ok) {
          const data = await response.json();
          setDepartmentsList(data);
          if (data.length > 0) {
            setTargetDeptInput(data[0].code);
          }
        }
      } catch (err) {
        console.error('Failed to load departments', err);
      }
    };
    loadDepts();

    // Initialize course database from cache first
    const localCourses = localStorage.getItem('creator_courses');
    if (localCourses) {
      setCourses(JSON.parse(localCourses));
    } else {
      setCourses(INITIAL_COURSES);
      localStorage.setItem('creator_courses', JSON.stringify(INITIAL_COURSES));
    }
    
    // Sync with database
    fetchDBCourses();
  }, []);

  useEffect(() => {
    if (reviewCourse) {
      const fetchModules = async () => {
        try {
          const res = await apiCall(`/api/courses/${reviewCourse.id}/modules`);
          if (res.ok) {
            const data = await res.json();
            setReviewModules(data || []);
          }
        } catch (err) {
          console.error('Error loading review modules:', err);
        }
      };
      fetchModules();
    } else {
      setReviewModules([]);
    }
  }, [reviewCourse]);

  // Handler: fetch departments for active tab
  const fetchDepartments = async () => {
    setIsLoadingDepts(true);
    try {
      const response = await apiCall('/api/departments');
      if (response.ok) {
        const data = await response.json();
        setDepartmentsList(data);
      }
    } catch (err) {
      console.error('Failed to reload departments', err);
    } opacity: 1;
    setIsLoadingDepts(false);
  };

  useEffect(() => {
    if (activeTab === 'departments') {
      fetchDepartments();
    }
  }, [activeTab]);

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



  // Dispatch Global Notifications Event Helper
  const dispatchNotification = (newNotif: AppNotification) => {
    const localNotifs = localStorage.getItem('kaizen_notifications');
    const notifsList = localNotifs ? JSON.parse(localNotifs) : [];
    const updated = [newNotif, ...notifsList];
    localStorage.setItem('kaizen_notifications', JSON.stringify(updated));
    
    // Dispatch custom event to let the Navbar listen and reload
    window.dispatchEvent(new Event('kaizen_notifications_changed'));
  };

  // Toast Trigger Helper
  const triggerToast = (message: string, type: 'success' | 'warning' | 'info' | 'error' = 'success') => {
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
    setDurationDays(0);
    setDurationHours(0);
    setDurationMinutes(0);
    setDurationSeconds(0);
    setErrors({});
  };

  const validate = () => {
    const tempErrors: { [key: string]: string } = {};
    if (!title.trim()) tempErrors.title = 'Course Title is required.';
    if (!courseCode.trim()) tempErrors.courseCode = 'Course Code is required.';
    if (!description.trim()) tempErrors.description = 'Course Description is required.';
    if (durationDays === 0 && durationHours === 0 && durationMinutes === 0 && durationSeconds === 0) {
      tempErrors.duration = 'Duration must be greater than zero.';
    }
    if (!creatorNameInput.trim()) tempErrors.creatorName = 'Creator Name is required.';
    
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleCreateDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptCode.trim() || !newDeptName.trim()) {
      triggerToast('Department Code and Name are required.', 'error');
      return;
    }

    try {
      const response = await apiCall('/api/departments', {
        method: 'POST',
        body: JSON.stringify({
          code: newDeptCode.trim(),
          name: newDeptName.trim(),
          description: newDeptDesc.trim() || null
        })
      });

      if (response.ok) {
        triggerToast('Department created successfully!', 'success');
        setNewDeptCode('');
        setNewDeptName('');
        setNewDeptDesc('');
        fetchDepartments(); // Reload
      } else {
        const data = await response.json();
        triggerToast(data.detail || 'Failed to create department.', 'error');
      }
    } catch (err: any) {
      triggerToast(err.message || 'Connection error.', 'error');
    }
  };

  const handleDeleteDept = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this department? Users and courses linked to it may lose their mapping.')) {
      return;
    }

    try {
      const response = await apiCall(`/api/departments/${id}`, {
        method: 'DELETE'
      });

      if (response.status === 204 || response.ok) {
        triggerToast('Department deleted successfully.', 'success');
        fetchDepartments(); // Reload
      } else {
        triggerToast('Failed to delete department.', 'error');
      }
    } catch (err: any) {
      triggerToast(err.message || 'Connection error.', 'error');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const targetDept = departmentsList.find(d => d.code === targetDeptInput || d.name === targetDeptInput);
    const departmentId = targetDept ? targetDept.id : null;
    const durationStr = `${durationDays}d ${durationHours}h ${durationMinutes}m ${durationSeconds}s`;

    try {
      const payload = {
        course_code: courseCode.trim().toUpperCase(),
        title: title.trim(),
        description: description.trim(),
        difficulty_level: 'Beginner',
        department_id: departmentId,
        duration: durationStr,
        priority: priority
      };

      const res = await apiCall('/api/courses', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        triggerToast(errData.detail || 'Failed to create course in DB.', 'warning');
        return;
      }

      const dbCourse = await res.json();

      triggerToast('Course details saved. Let\'s configure the syllabus modules!', 'success');
      handleCloseCreateModal();
      navigate(`/creator/course/${dbCourse.id}`);
    } catch (err) {
      console.error('Failed to create course:', err);
      triggerToast('Connection error. Failed to create course.', 'error');
    }
  };



  const handleApprove = async (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    try {
      const res = await apiCall(`/api/courses/${courseId}/approve`, {
        method: 'POST'
      });

      if (!res.ok) {
        const err = await res.json();
        triggerToast(err.detail || 'Failed to approve course.', 'warning');
        return;
      }

      // Also publish it
      await apiCall(`/api/courses/${courseId}/publish`, { method: 'POST' });

      await fetchDBCourses();
      triggerToast('Course approved and published successfully!', 'success');
      setReviewCourse(null);
    } catch (err) {
      console.error('Failed to approve course:', err);
      triggerToast('Connection error. Failed to approve course.', 'error');
    }

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
  };

  const handleRejectClick = (course: CourseData, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRejectionCourse(course);
    setRejectionText('');
  };

  const handleRejectSubmit = async () => {
    if (!rejectionText.trim() || !rejectionCourse) return;
    const courseId = rejectionCourse.id;

    try {
      const res = await apiCall(`/api/courses/${courseId}/reject?rejection_reason=${encodeURIComponent(rejectionText.trim())}`, {
        method: 'POST'
      });

      if (!res.ok) {
        const err = await res.json();
        triggerToast(err.detail || 'Failed to reject course.', 'warning');
        return;
      }

      await fetchDBCourses();
      triggerToast('Course review rejected with feedback notes.', 'warning');
      setRejectionCourse(null);
      setReviewCourse(null);
    } catch (err) {
      console.error('Failed to reject course:', err);
      triggerToast('Connection error. Failed to reject course.', 'error');
    }

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
  };


  // Scoped views based on active profile
  const isDeptHead = role === 'Manager';
  const isAdmin = role === 'Admin' || role === 'SYSTEM_ADMIN' || role === 'HR_ADMIN';
  const isManager = role === 'Manager' || role === 'COURSE_MANAGER';
  
  // Filter courses: Admin/HR sees all courses across departments, Manager sees department/self-owned, Employee sees self-owned
  const myCreatedCourses = isAdmin ? courses : courses.filter(c => {
    if (isManager && selectedDept) {
      const isDeptMatch = c.departmentName === selectedDept || c.department_id === selectedDept;
      if (isDeptMatch) return true;
    }
    return (
      c.creatorName === profileName || 
      (profileName === 'John Doe' && c.creatorName === 'John Doe') ||
      (profileName === 'Dr. Evelyn C.' && c.creatorName === 'Dr. Evelyn C.') ||
      (profileName === 'Systems Administrator' && c.creatorName === 'Systems Administrator')
    );
  });

  const filteredMyCourses = myCreatedCourses.filter(c => {
    if (selectedCreatorDept && selectedCreatorDept.code !== 'ALL') {
      const targetCode = (selectedCreatorDept.code || '').toLowerCase();
      const targetName = (selectedCreatorDept.name || '').toLowerCase();
      const targetId = String(selectedCreatorDept.id || '');
      const cDeptName = (c.departmentName || '').toLowerCase();
      const cDeptId = String(c.department_id || '');
      
      const isDeptMatch = (cDeptId && targetId && cDeptId === targetId) || 
                          cDeptName === targetName || 
                          cDeptName === targetCode ||
                          (targetName && cDeptName && (targetName.includes(cDeptName) || cDeptName.includes(targetName)));
      if (!isDeptMatch) return false;
    }
    if (statusFilter === 'All') return true;
    return c.status === statusFilter;
  });

  // Scope approvals visible to active role
  const pendingApprovals = courses.filter(c => {
    if (c.status !== 'Pending') return false;
    if (isAdmin) {
      return selectedDept ? (c.departmentName === selectedDept || departmentsList.find(d => d.code === selectedDept)?.name === c.departmentName) : true;
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
            variant="outline" 
            onClick={() => navigate('/creator/exams/create')}
            leftIcon={<Plus size={16} />}
          >
            Create Exam
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/creator/exams/review')}
            leftIcon={<CheckCircle2 size={16} />}
          >
            Review Exams
          </Button>
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
            onClick={() => { setActiveTab('my_courses'); setSelectedCreatorDept(null); }}
          >
            {isAdmin ? 'All Courses' : 'My Created Courses'}
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
          </div>

          {/* Admin Department Drill-down Cards View */}
          {isAdmin && !selectedCreatorDept ? (
            <div>
              <div className="course-grid-header" style={{ marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Course Catalog by Department</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Select a department card to view and manage its active course pathways.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                {/* Special Card for All Courses */}
                <div
                  className="glass-panel"
                  onClick={() => setSelectedCreatorDept({ id: 'ALL', name: 'All Departments', code: 'ALL' } as any)}
                  style={{
                    padding: '24px',
                    borderRadius: 'var(--border-radius-lg)',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--accent-color)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--accent-glow)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <BookOpen size={24} />
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: 'var(--accent-glow)', color: 'var(--accent-color)' }}>
                        ALL
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>All Departments</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                      Global view of all courses created across every department.
                    </p>
                  </div>

                  <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--accent-color)' }}>
                      {courses.length} Courses Total
                    </span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-color)' }}>View All &rarr;</span>
                  </div>
                </div>

                {departmentsList.map(d => {
                  const deptCourseCount = courses.filter(c => {
                    const targetCode = (d.code || '').toLowerCase();
                    const targetName = (d.name || '').toLowerCase();
                    const targetId = String(d.id || '');
                    const cDeptName = (c.departmentName || '').toLowerCase();
                    const cDeptId = String(c.department_id || '');
                    return (cDeptId && targetId && cDeptId === targetId) || 
                           cDeptName === targetName || 
                           cDeptName === targetCode ||
                           (targetName && cDeptName && (targetName.includes(cDeptName) || cDeptName.includes(targetName)));
                  }).length;
                  return (
                    <div
                      key={d.id}
                      className="glass-panel"
                      onClick={() => setSelectedCreatorDept(d)}
                      style={{
                        padding: '24px',
                        borderRadius: 'var(--border-radius-lg)',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-color)';
                        e.currentTarget.style.transform = 'translateY(-4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--accent-glow)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BookOpen size={24} />
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                            {d.code}
                          </span>
                        </div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>{d.name}</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                          {d.description || 'Department course pathways.'}
                        </p>
                      </div>

                      <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--accent-color)' }}>
                          {deptCourseCount} {deptCourseCount === 1 ? 'Course' : 'Courses'}
                        </span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-color)' }}>View Courses &rarr;</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {isAdmin && selectedCreatorDept && (
                <div style={{ marginBottom: '20px' }}>
                  <Button variant="outline" size="sm" onClick={() => setSelectedCreatorDept(null)} style={{ marginBottom: '16px' }}>
                    &larr; Back to Departments
                  </Button>
                </div>
              )}

              {/* Grid Canvas Header */}
              <div className="course-grid-header">
                <h2>
                  {selectedCreatorDept ? `${selectedCreatorDept.name} (${selectedCreatorDept.code})` : `${statusFilter} Courses`}
                </h2>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Showing {filteredMyCourses.length} courses
                </span>
              </div>

              {/* Grid Canvas Body */}
              {filteredMyCourses.length === 0 ? (
                <div className="empty-state-banner">
                  <BookOpen size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                  <h3>No Courses Found</h3>
                  <p>Try changing filters or click "Create New Course" to add a course.</p>
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
                            Instructor: <strong>{course.creatorName}</strong> ({course.departmentName})
                          </span>
                        </div>

                        <Button
                          variant={course.is_published ? "outline" : "primary"}
                          size="sm"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const res = await apiCall(`/api/courses/${course.id}`, {
                                method: 'PUT',
                                body: JSON.stringify({
                                  is_published: !course.is_published,
                                  status: 'approved'
                                })
                              });
                              if (res.ok) {
                                fetchDBCourses();
                                triggerToast(course.is_published ? 'Course reverted to draft!' : 'Course published successfully!', 'success');
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                        >
                          {course.is_published ? 'Revert to Draft' : 'Publish'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
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
                {departmentsList.map(deptNode => {
                  const pendingCount = courses.filter(c => c.status === 'Pending' && (c.departmentName === deptNode.name || c.departmentName === deptNode.code)).length;
                  return (
                    <div 
                      key={deptNode.id} 
                      className={`dept-selector-card glass-panel glow-hover ${pendingCount > 0 ? 'has-pending' : ''}`}
                      onClick={() => setSelectedDept(deptNode.code)}
                    >
                      <div className="dept-card-header-row">
                        <div className="dept-icon-box">
                          <Layers size={22} />
                        </div>
                        {pendingCount > 0 && (
                          <span className="pending-badge-count">{pendingCount} Pending</span>
                        )}
                      </div>
                      <h3>{deptNode.name}</h3>
                      <p>View courses designed by employees in the {deptNode.name} ({deptNode.code}) team.</p>
                      
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

          <div className="analytics-details-layout glass-panel" style={{ marginTop: 'var(--space-section-gap)', padding: 'var(--space-card-padding)' }}>
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

      {activeTab === 'departments' && isAdmin && (
        <div className="departments-canvas animate-fade-in" style={{ paddingBottom: '40px' }}>
          <div className="pane-header" style={{ marginBottom: 'var(--space-section-gap)' }}>
            <h2>🏢 Enterprise Department Manager</h2>
            <p>Define global training branches, coordinate departmental structures, and manage registries.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-section-gap)', alignItems: 'flex-start' }}>
            {/* Create Department Form Card */}
            <div className="glass-panel" style={{ padding: 'var(--space-card-padding)', borderRadius: 'var(--border-radius-md)' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '1.2rem', fontWeight: '700' }}>+ Create New Department</h3>
              <form onSubmit={handleCreateDeptSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                  <div className="form-group-spaced" style={{ marginBottom: 0 }}>
                    <label className="form-label-styled">Department Code <span className="required-star">*</span></label>
                    <input 
                      type="text" 
                      className="form-input-styled" 
                      placeholder="e.g. AI" 
                      value={newDeptCode}
                      onChange={(e) => setNewDeptCode(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group-spaced" style={{ marginBottom: 0 }}>
                    <label className="form-label-styled">Department Name <span className="required-star">*</span></label>
                    <input 
                      type="text" 
                      className="form-input-styled" 
                      placeholder="e.g. Artificial Intelligence" 
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group-spaced" style={{ marginBottom: 0 }}>
                  <label className="form-label-styled">Description</label>
                  <input 
                    type="text" 
                    className="form-input-styled" 
                    placeholder="e.g. Artificial Intelligence engineering courses and tracks" 
                    value={newDeptDesc}
                    onChange={(e) => setNewDeptDesc(e.target.value)}
                  />
                </div>
                <Button variant="primary" type="submit" style={{ marginTop: '10px', alignSelf: 'flex-end' }}>
                  Create Department
                </Button>
              </form>
            </div>

            {/* Department List Grid */}
            <div className="glass-panel" style={{ padding: 'var(--space-card-padding)', borderRadius: 'var(--border-radius-md)' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '1.2rem', fontWeight: '700' }}>Active Corporate Departments</h3>
              <div className="logs-table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {isLoadingDepts ? (
                  <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>Loading department nodes...</p>
                ) : departmentsList.length === 0 ? (
                  <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>No active departments found. Create one using the form.</p>
                ) : (
                  <table className="logs-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Department Name</th>
                        <th>Description</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departmentsList.map(dept => (
                        <tr key={dept.id}>
                          <td><span className="log-action-badge" style={{ backgroundColor: 'var(--accent-glow)', color: 'var(--accent-color)' }}>{dept.code}</span></td>
                          <td style={{ fontWeight: '600' }}>{dept.name}</td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{dept.description || 'N/A'}</td>
                          <td style={{ textAlign: 'right' }}>
                            <Button 
                              variant="outline" 
                              onClick={() => handleDeleteDept(dept.id)}
                              style={{ color: 'var(--neon-coral)', borderColor: 'rgba(239,68,68,0.2)', padding: '4px 8px', fontSize: '0.75rem' }}
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Course Details & Review Drawer */}
      {reviewCourse && (
        <div className="drawer-overlay" onClick={() => setReviewCourse(null)}>
          <div className="drawer-container glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <span className="course-code-badge">{reviewCourse.course_code}</span>
                <h2>{reviewCourse.title}</h2>
              </div>
              <button className="close-drawer-btn" onClick={() => setReviewCourse(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="drawer-body">
              <section className="drawer-section">
                <h3>Course Metadata & Scope</h3>
                <div className="metadata-grid">
                  <div className="meta-item">
                    <span>Department</span>
                    <p>{reviewCourse.departmentName}</p>
                  </div>
                  <div className="meta-item">
                    <span>Submitted By</span>
                    <p>{reviewCourse.creatorName} ({reviewCourse.creatorRole})</p>
                  </div>
                  <div className="meta-item">
                    <span>Submission Date</span>
                    <p>{reviewCourse.createdDate}</p>
                  </div>
                  <div className="meta-item">
                    <span>Estimated Duration</span>
                    <p>{reviewCourse.duration}</p>
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
                  {reviewModules && reviewModules.length > 0 ? (
                    reviewModules.map((mod: any, idx: number) => (
                      <div key={mod.id || idx} className="syllabus-sim-item">
                        <span className="module-no">Module {mod.sequence_no || idx + 1}</span>
                        <div>
                          <h4>{mod.title}</h4>
                          <p>{mod.description || 'Module syllabus content section.'}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No modules added to this course syllabus yet.</p>
                  )}
                </div>
              </section>
            </div>

            <div className="drawer-footer-actions">
              {reviewCourse.status === 'Pending' ? (
                <>
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
                </>
              ) : (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic', textAlign: 'center', width: '100%', padding: '10px 0' }}>
                  This course is already {reviewCourse.status} and cannot be modified.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Feedback Prompt Dialog */}
      <Modal
        isOpen={!!rejectionCourse}
        onClose={() => setRejectionCourse(null)}
        title="Rejection Feedback"
        icon={<AlertTriangle style={{ color: 'var(--neon-coral)' }} />}
        maxWidth="480px"
        footer={
          <>
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
          </>
        }
      >
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
          Provide detailed feedback for <strong>{rejectionCourse?.title}</strong>. The creator will see this message and edit their course for resubmission.
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
      </Modal>

      {/* Course Creation Modal Overlay */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        title="Create Course Option"
        subtitle="Configure initial details for a new learning pathway"
        icon={<BookOpen size={22} style={{ color: 'var(--accent-color)' }} />}
        maxWidth="540px"
        footer={
          <>
            <Button variant="outline" type="button" onClick={handleCloseCreateModal}>
              Cancel
            </Button>
            <Button variant="primary" type="button" onClick={(e) => handleCreateSubmit(e as any)}>
              Create Modules
            </Button>
          </>
        }
      >
        <form id="create-course-form" onSubmit={handleCreateSubmit}>
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
                {departmentsList.map(d => (
                  <option key={d.id} value={d.code}>[{d.code}] {d.name}</option>
                ))}
                {departmentsList.length === 0 && (
                  <option value="AI">[AI] Artificial Intelligence</option>
                )}
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
                Course Duration <span className="required-star">*</span>
              </label>

              {/* Date Range Helper Picker */}
              <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
                  📅 Auto-calculate from Start & End Date:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Start Date:</span>
                    <input 
                      type="date" 
                      className="form-input-styled" 
                      style={{ fontSize: '0.82rem', padding: '6px' }}
                      onChange={(e) => {
                        const start = new Date(e.target.value);
                        const endInput = document.getElementById('duration-end-date') as HTMLInputElement;
                        if (endInput && endInput.value) {
                          const end = new Date(endInput.value);
                          const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
                          if (diffDays > 0) setDurationDays(diffDays);
                        }
                      }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>End Date:</span>
                    <input 
                      id="duration-end-date"
                      type="date" 
                      className="form-input-styled" 
                      style={{ fontSize: '0.82rem', padding: '6px' }}
                      onChange={(e) => {
                        const end = new Date(e.target.value);
                        const startVal = (document.querySelector('input[type="date"]') as HTMLInputElement)?.value;
                        if (startVal) {
                          const start = new Date(startVal);
                          const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
                          if (diffDays > 0) setDurationDays(diffDays);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Structured Duration Inputs */}
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                Structured Duration Fields:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <input 
                    type="number" 
                    min="0"
                    placeholder="20"
                    className="form-input-styled" 
                    value={durationDays || ''}
                    onChange={(e) => setDurationDays(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>Days</span>
                </div>
                <div>
                  <input 
                    type="number" 
                    min="0"
                    placeholder="0"
                    className="form-input-styled" 
                    value={durationHours || ''}
                    onChange={(e) => setDurationHours(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>Hours</span>
                </div>
                <div>
                  <input 
                    type="number" 
                    min="0"
                    placeholder="0"
                    className="form-input-styled" 
                    value={durationMinutes || ''}
                    onChange={(e) => setDurationMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>Minutes</span>
                </div>
              </div>
              {errors.duration && (
                <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>{errors.duration}</p>
              )}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
