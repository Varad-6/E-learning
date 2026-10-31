import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Plus, BookOpen, Clock, X, AlertTriangle, ShieldAlert,
  ArrowLeft, Layers, ChevronRight, CheckCircle2, Edit3,
  Search, Trash2, CheckSquare, Square, Users, Video
} from 'lucide-react';
import { Button } from '../../components/Button/Button';
import { Modal } from '../../components/Modal/Modal';
import { LearnersModal } from '../../components/LearnersModal/LearnersModal';
import { apiCall } from '../../services/api';
import { CourseraRichText } from '../../components/CourseraRichText/CourseraRichText';
import { DurationInput } from '../../components/DurationInput/DurationInput';
import { YouTubeEmbed } from '../../components/YouTubeEmbed/YouTubeEmbed';
import { isValidYouTubeUrl } from '../../utils/youtube';
import { formatDuration, parseDuration, buildDurationString, validateDuration } from '../../utils/duration';
import { canDeleteCourse } from '../../utils/coursePermissions';
import './Creator.css';

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  employee_count?: number;
}

interface CourseData {
  id: string;
  course_code: string;
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  duration: string;
  is_published: boolean;
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Published';
  creatorName: string;
  creatorRole: string;
  department_id?: string;
  department_ids?: string[];
  is_all_departments?: boolean;
  departmentName: string;
  rejectionReason?: string;
  created_by?: string | null;
  createdDate: string;
  published_at?: string | null;
  is_mandatory?: boolean;
  video_url?: string | null;
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

// Helper to extract clean plain-text excerpt for uniform card previews
const getCourseExcerpt = (text?: string | null): string => {
  if (!text || !text.trim()) return 'No description provided for this course.';
  return text
    .replace(/^#+\s+/gm, '')
    .replace(/^[-*•]\s+/gm, '')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

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
  const [activeTab, setActiveTab] = useState<'my_courses' | 'exams' | 'approvals' | 'auditing' | 'departments' | 'view_courses'>('my_courses');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Published'>('All');
  
  // Admin departments state
  const [departmentsList, setDepartmentsList] = useState<Department[]>([]);
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
  const [learnersCourse, setLearnersCourse] = useState<CourseData | null>(null);

  // Course Form States
  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [durationDays, setDurationDays] = useState(7);
  const [durationHours, setDurationHours] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [videoUrl, setVideoUrl] = useState('');
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [courseToDelete, setCourseToDelete] = useState<CourseData | null>(null);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);
  const [creatorNameInput, setCreatorNameInput] = useState('');
  const [targetDeptInput, setTargetDeptInput] = useState('AI');
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  const [deptSearchQuery, setDeptSearchQuery] = useState('');
  const [isMandatory, setIsMandatory] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'create' || params.get('create') === 'true') {
      handleOpenCreateModal();
    }
  }, []);

  const fetchDBCourses = async () => {
    try {
      const response = await apiCall('/api/courses');
      if (response.ok) {
        const data = await response.json();
        const dbCourses = data.courses || [];
        const mapped = dbCourses.map((c: any) => {
          let frontendStatus = 'Draft';
          const backendStatus = c.status?.toLowerCase();
          if (backendStatus === 'pending') frontendStatus = 'Pending';
          else if (backendStatus === 'approved') frontendStatus = 'Approved';
          else if (backendStatus === 'rejected') frontendStatus = 'Rejected';
          else if (backendStatus === 'published') frontendStatus = 'Published';
          
          return {
            id: c.id,
            course_code: c.course_code,
            title: c.title,
            description: c.description || '',
            priority: c.priority || 'Medium',
            duration: c.duration || '10 hours',
            is_published: c.is_published,
            status: frontendStatus,
            published_at: c.published_at,
            creatorName: c.creator_name || 'John Doe',
            creatorRole: c.creator_role || 'Employee',
            department_id: c.department_id,
            department_ids: c.department_ids || (c.department_id ? [c.department_id] : []),
            is_all_departments: c.is_all_departments || false,
            departmentName: c.department_name || 'All Departments',
            createdDate: c.created_at ? c.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            rejectionReason: c.rejection_reason || undefined,
            created_by: c.created_by,
            is_mandatory: c.is_mandatory || false,
            video_url: c.video_url || null
          };
        });
        setCourses(mapped);
        localStorage.setItem('creator_courses', JSON.stringify(mapped));
      }
    } catch (err) {
      console.error('Failed to load courses from DB:', err);
    }
  };

  const [examsList, setExamsList] = useState<any[]>([]);

  const fetchExams = async () => {
    try {
      const res = await apiCall('/api/exams');
      if (res.ok) {
        const data = await res.json();
        setExamsList(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch exams:', err);
    }
  };

  const [myEnrollments, setMyEnrollments] = useState<any[]>([]);

  // Edit Course Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDays, setEditDays] = useState(0);
  const [editHours, setEditHours] = useState(0);
  const [editMinutes, setEditMinutes] = useState(0);
  const [editPriority, setEditPriority] = useState('Medium');
  const [editDifficulty, setEditDifficulty] = useState('All Levels');
  const [editIsMandatory, setEditIsMandatory] = useState(false);
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [selectedEditDeptIds, setSelectedEditDeptIds] = useState<string[]>([]);
  const [editDeptSearchQuery, setEditDeptSearchQuery] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleOpenEditCourse = (course: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCourseId(course.id);
    setEditTitle(course.title || '');
    setEditDescription(course.description || '');
    const parsed = parseDuration(course.duration);
    setEditDays(parsed.days || 0);
    setEditHours(parsed.hours || 0);
    setEditMinutes(parsed.minutes || 0);
    setEditPriority(course.priority || 'Medium');
    setEditDifficulty(course.difficulty_level || 'All Levels');
    setEditIsMandatory(course.is_mandatory || false);
    setEditVideoUrl(course.video_url || '');
    setEditDeptSearchQuery('');

    // Pre-select departments based on course assignments
    if (course.is_all_departments || (!course.department_id && (!course.department_ids || course.department_ids.length === 0))) {
      setSelectedEditDeptIds(departmentsList.map(d => d.id));
    } else if (course.department_ids && course.department_ids.length > 0) {
      setSelectedEditDeptIds(course.department_ids);
    } else if (course.department_id) {
      setSelectedEditDeptIds([course.department_id]);
    } else {
      setSelectedEditDeptIds(departmentsList.map(d => d.id));
    }

    setIsEditModalOpen(true);
  };

  const handleSaveCourseEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourseId || !editTitle.trim()) {
      triggerToast('Course Title is required.', 'error');
      return;
    }
    if (selectedEditDeptIds.length === 0) {
      triggerToast('At least one department must be selected before saving.', 'error');
      return;
    }
    const durErr = validateDuration(editDays, editHours, editMinutes);
    if (durErr) {
      triggerToast(durErr, 'error');
      return;
    }
    if (editVideoUrl.trim() && !isValidYouTubeUrl(editVideoUrl.trim())) {
      triggerToast('Please enter a valid YouTube URL for the overview video.', 'error');
      return;
    }
    setIsSavingEdit(true);
    try {
      const durationStr = buildDurationString(editDays, editHours, editMinutes);
      const isAll = departmentsList.length > 0 && selectedEditDeptIds.length === departmentsList.length;
      const res = await apiCall(`/api/courses/${editingCourseId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          duration: durationStr,
          priority: editPriority,
          difficulty_level: editDifficulty,
          is_mandatory: editIsMandatory,
          video_url: editVideoUrl.trim() || null,
          department_id: isAll ? null : (selectedEditDeptIds[0] || null),
          department_ids: selectedEditDeptIds,
          is_all_departments: isAll
        })
      });
      if (res.ok) {
        triggerToast('Course details and department assignments updated successfully!', 'success');
        setIsEditModalOpen(false);
        fetchDBCourses();
      } else {
        const err = await res.json();
        triggerToast(err.detail || 'Failed to update course', 'error');
      }
    } catch (err: any) {
      triggerToast('Error: ' + (err.message || 'Server error'), 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const fetchMyEnrollments = async () => {
    try {
      const res = await apiCall('/api/enrollments/my-courses');
      if (res.ok) {
        const data = await res.json();
        setMyEnrollments(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch enrollments:', err);
    }
  };

  useEffect(() => {
    const rawRolesStr = localStorage.getItem('rawRoles');
    const rawRoles = rawRolesStr ? JSON.parse(rawRolesStr) : [];
    const hasAccess = rawRoles.includes('SYSTEM_ADMIN') || rawRoles.includes('COURSE_MANAGER') || rawRoles.includes('HR_ADMIN');
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
            if (savedRole === 'Manager') {
              setTargetDeptInput(savedDept);
            } else {
              setTargetDeptInput(data[0].code);
            }
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
    fetchExams();
    fetchMyEnrollments();
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
    }
    setIsLoadingDepts(false);
  };

  useEffect(() => {
    if (activeTab === 'departments') {
      fetchDepartments();
    } else if (activeTab === 'view_courses') {
      fetchMyEnrollments();
      fetchDBCourses();
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

  const getBaseCodeOffset = (code: string) => {
    const u = (code || '').toUpperCase().trim();
    if (u === 'GENERAL' || u === 'ALL' || u === 'GEN') return 101;
    if (u === 'AI') return 201;
    if (u === 'HR') return 301;
    if (u === 'FICO') return 401;
    if (u === 'ABAP') return 501;
    if (u === 'SD') return 601;
    if (u === 'PP') return 701;
    if (u === 'MM') return 801;
    if (u === 'QM') return 901;
    return 101;
  };

  const getSuggestedCourseCode = (targetDept: string) => {
    const deptKey = (targetDept || dept || 'COURSE').toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9]/gi, '');
    const base = getBaseCodeOffset(deptKey);
    let maxNum = base - 1;
    const existingCodes = new Set<string>();

    if (courses && courses.length > 0) {
      for (const c of courses) {
        if (!c.course_code) continue;
        const upper = c.course_code.toUpperCase().trim();
        existingCodes.add(upper);
        const parts = upper.split('-');
        if (parts.length >= 2) {
          const prefix = parts.slice(0, -1).join('-');
          const lastPart = parts[parts.length - 1];
          if (prefix === deptKey) {
            const num = parseInt(lastPart, 10);
            if (!isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          }
        }
      }
    }
    let candidate = Math.max(base, maxNum + 1);
    while (existingCodes.has(`${deptKey}-${candidate}`)) {
      candidate++;
    }
    return `${deptKey}-${candidate}`;
  };

  const handleOpenCreateModal = () => {
    setCreatorNameInput(profileName);
    const allIds = departmentsList.map(d => d.id);
    if (role === 'Manager') {
      const myDept = departmentsList.find(d => d.code === dept || d.name === dept);
      const initialIds = myDept ? [myDept.id] : (allIds.length > 0 ? [allIds[0]] : []);
      setSelectedDeptIds(initialIds);
      setCourseCode(getSuggestedCourseCode(dept));
    } else {
      setSelectedDeptIds(allIds);
      setCourseCode(getSuggestedCourseCode('AI'));
    }
    setDeptSearchQuery('');
    setVideoUrl('');
    setDurationDays(7);
    setDurationHours(0);
    setDurationMinutes(0);
    setIsCreateModalOpen(true);
    setErrors({});
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setTitle('');
    setCourseCode('');
    setDescription('');
    setPriority('Medium');
    setVideoUrl('');
    setDurationDays(7);
    setDurationHours(0);
    setDurationMinutes(0);
    setSelectedDeptIds([]);
    setDeptSearchQuery('');
    setErrors({});
  };

  const validate = () => {
    const tempErrors: { [key: string]: string } = {};
    if (!title.trim()) tempErrors.title = 'Course Title is required.';
    if (!courseCode.trim()) tempErrors.courseCode = 'Course Code is required.';
    if (!description.trim()) tempErrors.description = 'Course Description is required.';
    if (selectedDeptIds.length === 0) tempErrors.department = 'At least one department must be selected before saving.';
    const durErr = validateDuration(durationDays, durationHours, durationMinutes);
    if (durErr) {
      tempErrors.duration = durErr;
    }
    if (videoUrl.trim() && !isValidYouTubeUrl(videoUrl.trim())) {
      tempErrors.videoUrl = 'Please enter a valid YouTube URL (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...)';
    }
    
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  // Department multi-select calculations & handlers for Create Course
  const isAllDeptsSelected = departmentsList.length > 0 && selectedDeptIds.length === departmentsList.length;
  
  const handleToggleAllDepts = () => {
    if (role === 'Manager') return;
    if (isAllDeptsSelected) {
      setSelectedDeptIds([]);
    } else {
      setSelectedDeptIds(departmentsList.map(d => d.id));
    }
  };

  const handleToggleDept = (deptId: string) => {
    if (selectedDeptIds.includes(deptId)) {
      setSelectedDeptIds(selectedDeptIds.filter(id => id !== deptId));
    } else {
      setSelectedDeptIds([...selectedDeptIds, deptId]);
    }
  };

  // Department multi-select calculations & handlers for Edit Course
  const isAllEditDeptsSelected = departmentsList.length > 0 && selectedEditDeptIds.length === departmentsList.length;

  const handleToggleAllEditDepts = () => {
    if (role === 'Manager') return;
    if (isAllEditDeptsSelected) {
      setSelectedEditDeptIds([]);
    } else {
      setSelectedEditDeptIds(departmentsList.map(d => d.id));
    }
  };

  const handleToggleEditDept = (deptId: string) => {
    if (selectedEditDeptIds.includes(deptId)) {
      setSelectedEditDeptIds(selectedEditDeptIds.filter(id => id !== deptId));
    } else {
      setSelectedEditDeptIds([...selectedEditDeptIds, deptId]);
    }
  };

  const totalCompanyEmployees = departmentsList.reduce((acc, d) => acc + (d.employee_count || 0), 0);

  const selectedEmployeesTotal = isAllDeptsSelected
    ? totalCompanyEmployees
    : departmentsList
        .filter(d => selectedDeptIds.includes(d.id))
        .reduce((acc, d) => acc + (d.employee_count || 0), 0);

  const selectedEditEmployeesTotal = isAllEditDeptsSelected
    ? totalCompanyEmployees
    : departmentsList
        .filter(d => selectedEditDeptIds.includes(d.id))
        .reduce((acc, d) => acc + (d.employee_count || 0), 0);

  const filteredDepts = departmentsList.filter(d =>
    d.name.toLowerCase().includes(deptSearchQuery.toLowerCase()) ||
    d.code.toLowerCase().includes(deptSearchQuery.toLowerCase())
  );

  const filteredEditDepts = departmentsList.filter(d =>
    d.name.toLowerCase().includes(editDeptSearchQuery.toLowerCase()) ||
    d.code.toLowerCase().includes(editDeptSearchQuery.toLowerCase())
  );

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    setIsDeletingCourse(true);
    try {
      const res = await apiCall(`/api/courses/${courseToDelete.id}`, {
        method: 'DELETE'
      });
      if (res.ok || res.status === 204) {
        triggerToast(`Course "${courseToDelete.title}" deleted successfully.`, 'success');
        setCourseToDelete(null);
        fetchDBCourses();
      } else {
        const err = await res.json().catch(() => ({}));
        triggerToast(err.detail || 'Failed to delete course', 'error');
      }
    } catch (err: any) {
      triggerToast('Error deleting course: ' + (err.message || 'Server error'), 'error');
    } finally {
      setIsDeletingCourse(false);
    }
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

    const isAll = departmentsList.length > 0 && selectedDeptIds.length === departmentsList.length;
    const durationStr = buildDurationString(durationDays, durationHours, durationMinutes);

    try {
      const payload = {
        course_code: courseCode.trim().toUpperCase(),
        title: title.trim(),
        description: description.trim(),
        difficulty_level: 'Beginner',
        department_id: isAll ? null : (selectedDeptIds[0] || null),
        department_ids: selectedDeptIds,
        is_all_departments: isAll,
        duration: durationStr,
        priority: priority,
        is_mandatory: isMandatory,
        video_url: videoUrl.trim() || null
      };

      const res = await apiCall('/api/courses', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        const detailMsg = errData.detail || 'Could not create course. Please try again.';
        if (detailMsg.toLowerCase().includes('already exists')) {
          const suggestedDeptCode = isAllDeptsSelected
            ? 'ALL'
            : (selectedDeptIds.length > 0
                ? (departmentsList.find(d => d.id === selectedDeptIds[0])?.code || 'AI')
                : 'AI');
          const nextFree = getSuggestedCourseCode(suggestedDeptCode);
          setCourseCode(nextFree);
          triggerToast(`${detailMsg} We've auto-updated the code to '${nextFree}'. Click 'Create Course' again to proceed.`, 'warning');
        } else {
          triggerToast(detailMsg, 'warning');
        }
        return;
      }

      const dbCourse = await res.json();

      triggerToast('Course created! Now add your modules, notes, and quizzes before publishing.', 'success');
      handleCloseCreateModal();
      navigate(`/creator/course/${dbCourse.id}?step=content`);
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
      message: `Your course ${course.title} (${course.course_code}) has been Approved and published!`,
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
      message: `Your course ${rejectionCourse.title} (${rejectionCourse.course_code}) was Rejected: "${rejectionText.trim()}".`,
      type: 'rejection',
      courseId: courseId,
      isRead: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    dispatchNotification(newNotif);
  };


  // Scoped views based on active profile
  const isDeptHead = role === 'Manager';
  const isAdmin = role === 'Admin' || role === 'HR Admin' || role === 'HR Manager' || role === 'HR' || role === 'SYSTEM_ADMIN' || role === 'HR_ADMIN';
  const isManager = role === 'Manager' || role === 'COURSE_MANAGER';
  
  // Filter courses: Admin/HR/Manager sees all courses across departments; others see courses from their department or created
  const myCreatedCourses = (isAdmin || isManager) ? courses : courses.filter(c => {
    if (selectedDept) {
      const isDeptMatch = c.departmentName === selectedDept || c.department_id === selectedDept;
      if (isDeptMatch) return true;
    }
    return (
      c.creatorName === profileName || 
      !c.creatorName ||
      c.creatorName === 'AI Mgr1 User' ||
      c.creatorName === 'John Doe' ||
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
    if (statusFilter !== 'All' && c.status !== statusFilter) return false;
    if (courseSearchQuery.trim()) {
      const q = courseSearchQuery.trim().toLowerCase();
      const matchTitle = (c.title || '').toLowerCase().includes(q);
      const matchDesc = (c.description || '').toLowerCase().includes(q);
      const matchCode = (c.course_code || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCode) return false;
    }
    return true;
  });

  const viewCoursesList = courses.filter(c => {
    const isCreatedByMe = c.creatorName === profileName || 
      (profileName === 'John Doe' && c.creatorName === 'John Doe') ||
      (profileName === 'Dr. Evelyn C.' && c.creatorName === 'Dr. Evelyn C.') ||
      (profileName === 'Systems Administrator' && c.creatorName === 'Systems Administrator');
    const isMandatory = c.is_mandatory || false;
    return isCreatedByMe || isMandatory;
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
        
        <div className="creator-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
            Grade Submissions
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

      {/* Tabs Layout */}
      <div className="sidebar-tabs-header" style={{ marginBottom: '30px', display: 'flex', gap: '10px' }}>
        <button 
          className={`sidebar-tab-btn ${activeTab === 'my_courses' ? 'active' : ''}`}
          onClick={() => { setActiveTab('my_courses'); setSelectedCreatorDept(null); }}
        >
          {isAdmin ? 'All Courses' : 'My Created Courses'}
        </button>
        {(isDeptHead || isAdmin || isManager) && (
          <button 
            className={`sidebar-tab-btn ${activeTab === 'view_courses' ? 'active' : ''}`}
            onClick={() => { setActiveTab('view_courses'); fetchMyEnrollments(); }}
          >
            View Courses
          </button>
        )}
        <button 
          className={`sidebar-tab-btn ${activeTab === 'exams' ? 'active' : ''}`}
          onClick={() => { setActiveTab('exams'); fetchExams(); }}
        >
          Exams Catalog
        </button>
      </div>

      {/* Tab: Exams Catalog */}
      {activeTab === 'exams' && (
        <div className="animate-fade-in" style={{ marginBottom: '40px' }}>
          <div className="course-grid-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Exams Catalog</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                All active, published, and pending assessment modules created across departments.
              </p>
            </div>
            <Button variant="primary" onClick={() => navigate('/creator/exams/create')} leftIcon={<Plus size={16} />}>
              Create New Exam
            </Button>
          </div>

          {examsList.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)' }}>
              <p style={{ color: 'var(--text-secondary)' }}>No exams created yet. Click "Create New Exam" above to build your first assessment!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
              {examsList.map((ex: any) => (
                <div key={ex.id} className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '4px 10px', borderRadius: '12px',
                        background: (ex.is_published || ex.status === 'published') ? 'rgba(16, 185, 129, 0.15)' : ex.status === 'pending' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                        color: (ex.is_published || ex.status === 'published') ? '#10b981' : ex.status === 'pending' ? '#f59e0b' : '#9ca3af'
                      }}>
                        {(ex.is_published || ex.status === 'published') ? 'Live / Published' : ex.status === 'pending' ? 'Pending Approval' : 'Draft'}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>⏱️ {ex.duration_minutes || 30} mins</span>
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '8px' }}>{ex.title}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                      Questions: {ex.questions ? ex.questions.length : 0} | Target: {ex.department_id ? 'Department Scoped' : 'All Departments'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                    <Button variant="outline" size="sm" onClick={() => navigate('/creator/exams/review')} style={{ flex: 1 }}>
                      Review Attempts
                    </Button>
                    {!(ex.is_published || ex.status === 'published') && (
                      <Button variant="primary" size="sm" onClick={async () => {
                        const res = await apiCall(`/api/exams/${ex.id}/publish`, { method: 'POST' });
                        if (res.ok) {
                          triggerToast('Exam published successfully! Now live for employees.', 'success');
                          fetchExams();
                        } else {
                          const err = await res.json();
                          triggerToast(err.detail || 'Failed to publish exam', 'error');
                        }
                      }} style={{ flex: 1 }}>
                        Publish Now
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 1: My Created Courses */}
      {activeTab === 'my_courses' && (
        <>
          {/* Status Filter Metrics Bar */}
          <div className="creator-stats-row">
            <div className={`stat-card ${statusFilter === 'All' ? 'active-filter' : ''}`} onClick={() => { setStatusFilter('All'); if (isAdmin) setSelectedCreatorDept({ id: 'ALL', name: 'All Departments', code: 'ALL' } as any); }} style={{ cursor: 'pointer' }}>
              <div className="stat-card-title">Total Created</div>
              <div className="stat-card-value">{myCreatedCourses.length}</div>
            </div>
            <div className={`stat-card ${statusFilter === 'Published' ? 'active-filter' : ''}`} onClick={() => { setStatusFilter('Published'); if (isAdmin) setSelectedCreatorDept({ id: 'ALL', name: 'All Departments', code: 'ALL' } as any); }} style={{ cursor: 'pointer' }}>
              <div className="stat-card-title">Published</div>
              <div className="stat-card-value">
                {myCreatedCourses.filter(c => c.status === 'Published').length}
              </div>
            </div>
            <div className={`stat-card ${statusFilter === 'Approved' ? 'active-filter' : ''}`} onClick={() => { setStatusFilter('Approved'); if (isAdmin) setSelectedCreatorDept({ id: 'ALL', name: 'All Departments', code: 'ALL' } as any); }} style={{ cursor: 'pointer' }}>
              <div className="stat-card-title">Approved</div>
              <div className="stat-card-value">
                {myCreatedCourses.filter(c => c.status === 'Approved').length}
              </div>
            </div>
            <div className={`stat-card ${statusFilter === 'Pending' ? 'active-filter' : ''}`} onClick={() => { setStatusFilter('Pending'); if (isAdmin) setSelectedCreatorDept({ id: 'ALL', name: 'All Departments', code: 'ALL' } as any); }} style={{ cursor: 'pointer' }}>
              <div className="stat-card-title">Pending</div>
              <div className="stat-card-value">
                {myCreatedCourses.filter(c => c.status === 'Pending').length}
              </div>
            </div>
            <div className={`stat-card ${statusFilter === 'Draft' ? 'active-filter' : ''}`} onClick={() => { setStatusFilter('Draft'); if (isAdmin) setSelectedCreatorDept({ id: 'ALL', name: 'All Departments', code: 'ALL' } as any); }} style={{ cursor: 'pointer' }}>
              <div className="stat-card-title">Drafts</div>
              <div className="stat-card-value">
                {myCreatedCourses.filter(c => c.status === 'Draft').length}
              </div>
            </div>
          </div>

          {/* Admin Department Drill-down Cards View */}
          {isAdmin && !selectedCreatorDept ? (
            <div>
              <div className="course-grid-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Course Catalog by Department</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Select a department card or click View All Courses to inspect, edit, or delete courses.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedCreatorDept({ id: 'ALL', name: 'All Departments', code: 'ALL' } as any)}
                >
                  View All Courses ({courses.length})
                </Button>
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
              <div className="course-grid-header" style={{ marginBottom: '16px' }}>
                <h2>
                  {selectedCreatorDept ? `${selectedCreatorDept.name} (${selectedCreatorDept.code})` : `${statusFilter} Courses`}
                </h2>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Showing {filteredMyCourses.length} courses
                </span>
              </div>

              {/* Course Search & Status Filter Bar */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: '24px' }}>
                <div style={{ position: 'relative', flex: '1 1 320px', maxWidth: '480px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    className="form-input-styled"
                    placeholder="Search courses by title, description or code..."
                    value={courseSearchQuery}
                    onChange={(e) => setCourseSearchQuery(e.target.value)}
                    style={{ paddingLeft: '38px', height: '40px', fontSize: '0.88rem', width: '100%' }}
                  />
                  {courseSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCourseSearchQuery('')}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label htmlFor="course-status-filter-select" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Filter Status:</label>
                  <select
                    id="course-status-filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="form-input-styled"
                    style={{ height: '40px', width: 'auto', minWidth: '150px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <option value="All">All Statuses ({myCreatedCourses.length})</option>
                    <option value="Published">Published ({myCreatedCourses.filter(c => c.status === 'Published').length})</option>
                    <option value="Approved">Approved ({myCreatedCourses.filter(c => c.status === 'Approved').length})</option>
                    <option value="Pending">Pending ({myCreatedCourses.filter(c => c.status === 'Pending').length})</option>
                    <option value="Draft">Draft ({myCreatedCourses.filter(c => c.status === 'Draft').length})</option>
                    <option value="Rejected">Rejected ({myCreatedCourses.filter(c => c.status === 'Rejected').length})</option>
                  </select>
                </div>
              </div>

              {/* Grid Canvas Body */}
              {filteredMyCourses.length === 0 ? (
                <div className="empty-state-banner">
                  <BookOpen size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                  <h3>No Courses Found</h3>
                  <p>
                    {courseSearchQuery
                      ? `No courses match your search "${courseSearchQuery}".`
                      : 'Try changing filters or click "Create New Course" to add a course.'}
                  </p>
                  {courseSearchQuery && (
                    <Button variant="outline" size="sm" onClick={() => setCourseSearchQuery('')} style={{ marginTop: '12px' }}>
                      Clear Search
                    </Button>
                  )}
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
                      <div className="course-card-top">
                        <div className="course-card-meta">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span className="course-badge-code">{course.course_code}</span>
                            {course.is_mandatory && (
                              <span className="course-badge-mandatory">Mandatory</span>
                            )}
                          </div>
                          <span className={`course-badge-status status-${course.status.toLowerCase()}`}>
                            {course.status}
                          </span>
                        </div>
                        
                        <h3 className="creator-card-title" title={course.title}>{course.title}</h3>
                        <p className="creator-card-description" title={course.description || ''}>
                          {getCourseExcerpt(course.description)}
                        </p>

                        {/* Rejection Alert notes */}
                        {course.status === 'Rejected' && course.rejectionReason && (
                          <div className="rejection-card-alert">
                            <ShieldAlert size={14} className="rejection-alert-icon" />
                            <span><strong>Rejection Feedback:</strong> {course.rejectionReason}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="course-card-bottom">
                        {/* Course Metadata Bar: Duration & Instructor */}
                        <div className="creator-card-meta-bar">
                          <div className="creator-meta-duration" title="Course Duration">
                            <Clock size={13} className="meta-icon" />
                            <span>{formatDuration(course.duration)}</span>
                          </div>
                          <div 
                            className="creator-meta-instructor" 
                            title={`Instructor: ${course.creatorName} (${course.departmentName || 'All Departments'})`}
                          >
                            <span className="instructor-lbl">Instructor:</span>
                            <strong className="instructor-name">{course.creatorName}</strong>
                            <span className="instructor-dept">({course.departmentName || 'All Departments'})</span>
                          </div>
                        </div>

                        {/* Course Card Action Buttons */}
                        <div className="creator-card-actions">
                          {/* Primary/Status Action Button (Full Width when present) */}
                          {(() => {
                            if (course.is_published || course.status === 'Published') {
                              return (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="creator-btn-primary-action btn-revert-action"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const res = await apiCall(`/api/courses/${course.id}`, {
                                        method: 'PUT',
                                        body: JSON.stringify({
                                          is_published: false,
                                          status: 'draft'
                                        })
                                      });
                                      if (res.ok) {
                                        fetchDBCourses();
                                        triggerToast('Course reverted to draft!', 'success');
                                      }
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }}
                                >
                                  Revert to Draft
                                </Button>
                              );
                            } else if (course.status === 'Draft' && course.published_at) {
                              return (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  className="creator-btn-primary-action btn-republish-action"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const res = await apiCall(`/api/courses/${course.id}/publish`, {
                                        method: 'POST'
                                      });
                                      if (res.ok) {
                                        fetchDBCourses();
                                        triggerToast('Course republished successfully!', 'success');
                                      } else {
                                        const err = await res.json();
                                        triggerToast(err.detail || 'Failed to republish course', 'error');
                                      }
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }}
                                >
                                  Republish Course
                                </Button>
                              );
                            } else if (course.status === 'Approved') {
                              return (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  className="creator-btn-primary-action btn-publish-action"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const res = await apiCall(`/api/courses/${course.id}/publish`, {
                                        method: 'POST'
                                      });
                                      if (res.ok) {
                                        fetchDBCourses();
                                        triggerToast('Course published successfully!', 'success');
                                      } else {
                                        const err = await res.json();
                                        triggerToast(err.detail || 'Failed to publish course', 'error');
                                      }
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }}
                                >
                                  Publish Course
                                </Button>
                              );
                            }
                            return null;
                          })()}

                          {/* Secondary Toolbar: Learners, Edit Course, Delete */}
                          <div className="creator-card-toolbar">
                            <Button
                              variant="outline"
                              size="sm"
                              className="creator-toolbar-btn btn-learners"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLearnersCourse(course);
                              }}
                              leftIcon={<Users size={14} />}
                              title="Manage Assigned Learners & Progress"
                            >
                              Learners
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="creator-toolbar-btn btn-edit"
                              onClick={(e) => handleOpenEditCourse(course, e)}
                              leftIcon={<Edit3 size={14} />}
                              title="Edit Course Details"
                            >
                              Edit Course
                            </Button>
                            {canDeleteCourse(course) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="creator-toolbar-btn btn-delete-danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCourseToDelete(course);
                                }}
                                leftIcon={<Trash2 size={14} />}
                                title="Delete Course"
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeTab === 'view_courses' && (
        <div className="animate-fade-in" style={{ marginBottom: '40px' }}>
          <div className="course-grid-header" style={{ marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Course Studio — Enrolled & Created Pathways</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Quick access to learning pathways you have authored or that are mandatory for compliance.
              </p>
            </div>
          </div>

          {viewCoursesList.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)' }}>
              <p style={{ color: 'var(--text-secondary)' }}>No authored or mandatory courses found.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
              {viewCoursesList.map((course) => {
                const enrollmentItem = myEnrollments.find((e: any) => e.course_id === course.id);
                const isEnrolled = !!enrollmentItem;
                const progressVal = enrollmentItem ? enrollmentItem.progress_percent : 0;
                const isLocked = enrollmentItem ? enrollmentItem.is_locked : false;

                return (
                  <div 
                    key={course.id} 
                    className="glass-panel" 
                    style={{ 
                      padding: '24px', 
                      borderRadius: 'var(--border-radius-md)', 
                      background: 'var(--bg-card)', 
                      border: course.is_mandatory ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-color)', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between',
                      position: 'relative'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '4px 10px', borderRadius: '12px', background: 'rgba(107, 114, 128, 0.15)', color: 'var(--text-primary)' }}>
                          {course.course_code}
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {course.is_mandatory && (
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                              Mandatory
                            </span>
                          )}
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', 
                            background: course.status === 'Published' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: course.status === 'Published' ? '#10b981' : '#f59e0b'
                          }}>
                            {course.status}
                          </span>
                        </div>
                      </div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '8px' }}>{course.title}</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {course.description}
                      </p>
                    </div>

                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                      {isEnrolled ? (
                        <div>
                          <div className="progress-bar-group" style={{ marginBottom: '12px' }}>
                            <div className="progress-bar-container" style={{ height: '6px', background: 'var(--bg-main)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div className="progress-bar-fill" style={{ width: `${progressVal}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-color), var(--accent-color-hover))' }}></div>
                            </div>
                            <div className="progress-label-row" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              <span>{progressVal}% Completed</span>
                              {isLocked && <span style={{ color: '#ef4444', fontWeight: 700 }}>Locked</span>}
                            </div>
                          </div>
                          <Button 
                            variant="primary" 
                            style={{ width: '100%' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/course-player/${enrollmentItem.id}`);
                            }}
                          >
                            {isLocked ? 'Review Course' : progressVal === 100 ? 'Review Course' : progressVal > 0 ? 'Resume Course' : 'Start Course'}
                          </Button>
                        </div>
                      ) : (
                        <div>
                          {course.status === 'Published' ? (
                            <Button 
                              variant="primary" 
                              style={{ width: '100%' }}
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const res = await apiCall('/api/enrollments', {
                                    method: 'POST',
                                    body: JSON.stringify({ course_id: course.id })
                                  });
                                  if (res.ok) {
                                    triggerToast('Successfully enrolled in course!', 'success');
                                    fetchMyEnrollments();
                                  } else {
                                    const err = await res.json();
                                    triggerToast(err.detail || 'Enrollment failed.', 'error');
                                  }
                                } catch (errVal) {
                                  console.error(errVal);
                                  triggerToast('Network error during enrollment.', 'error');
                                }
                              }}
                            >
                              Enroll Now
                            </Button>
                          ) : (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', fontStyle: 'italic' }}>
                              Enrollment unavailable (Course is {course.status.toLowerCase()})
                            </div>
                          )}
                        </div>
                      )}
                      {(isAdmin || isManager) && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleOpenEditCourse(course, e)}
                            leftIcon={<Edit3 size={13} />}
                            style={{ flex: 1, fontSize: '0.75rem', padding: '6px 8px' }}
                          >
                            Edit
                          </Button>
                          {canDeleteCourse(course) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCourseToDelete(course);
                              }}
                              leftIcon={<Trash2 size={13} />}
                              style={{ flex: 1, fontSize: '0.75rem', padding: '6px 8px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
            <div 
              className="stat-card" 
              onClick={() => { setActiveTab('my_courses'); setStatusFilter('Approved'); }} 
              style={{ cursor: 'pointer' }}
              title="Click to view approved curriculums"
            >
              <div className="stat-card-title">Approved Curriculums</div>
              <div className="stat-card-value" style={{ color: 'var(--neon-teal)' }}>
                {courses.filter(c => c.status === 'Approved').length}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Active and visible to learners</p>
            </div>
            <div 
              className="stat-card" 
              onClick={() => setActiveTab('approvals')} 
              style={{ cursor: 'pointer' }}
              title="Click to view pending validations"
            >
              <div className="stat-card-title">Pending Validation</div>
              <div className="stat-card-value" style={{ color: 'var(--neon-coral-glow)' }}>
                {courses.filter(c => c.status === 'Pending').length}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Awaiting review from Dept Heads</p>
            </div>
            <div 
              className="stat-card" 
              onClick={() => navigate('/admin/users')} 
              style={{ cursor: 'pointer' }}
              title="Click to view contributors & users"
            >
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
            <h2>Enterprise Department Manager</h2>
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

      {/* Edit Course Details Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Course Details"
        subtitle="Update course properties, department scope, and overview video"
        icon={<Edit3 size={20} style={{ color: 'var(--accent-color)' }} />}
        maxWidth="640px"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isSavingEdit}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveCourseEdit} disabled={isSavingEdit}>
              {isSavingEdit ? 'Saving Changes...' : 'Save Changes'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveCourseEdit}>
          <div className="form-group-spaced">
            <label className="form-label-styled">Course Title <span className="required-star">*</span></label>
            <input 
              type="text" 
              className="form-input-styled" 
              placeholder="e.g. Advanced Production Design"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group-spaced">
            <label className="form-label-styled">Course Description</label>
            <textarea 
              className="form-textarea-styled" 
              placeholder="Detailed syllabus notes and objectives..."
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              style={{ minHeight: '80px' }}
            />
          </div>

          <div className="form-group-spaced">
            <label className="form-label-styled" htmlFor="edit-course-priority">Priority</label>
            <select 
              id="edit-course-priority"
              className="form-select-styled"
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value as any)}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div className="form-group-spaced">
            <label className="form-label-styled" htmlFor="edit-course-difficulty">Difficulty Level (Optional)</label>
            <select 
              id="edit-course-difficulty"
              className="form-select-styled"
              value={editDifficulty}
              onChange={(e) => setEditDifficulty(e.target.value)}
            >
              <option value="All Levels">All Levels (Optional)</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          {/* Mandatory Course Toggle (Own row) */}
          <div className="form-group-spaced" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label 
              htmlFor="edit_mandatory_checkbox" 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '10px', 
                cursor: 'pointer', 
                userSelect: 'none',
                fontSize: '0.92rem', 
                fontWeight: 700, 
                color: 'var(--text-primary)' 
              }}
            >
              <input 
                type="checkbox" 
                id="edit_mandatory_checkbox"
                checked={editIsMandatory} 
                onChange={(e) => setEditIsMandatory(e.target.checked)}
                style={{ accentColor: 'var(--accent-color)', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span>Mark as Mandatory Course</span>
            </label>
            <p style={{ margin: '0 0 0 28px', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Mandatory courses are required for all enrolled personnel.
            </p>
          </div>

          <div className="form-group-spaced">
            <DurationInput
              showDays={true}
              days={editDays}
              hours={editHours}
              minutes={editMinutes}
              onChange={(d: number, h: number, m: number) => {
                setEditDays(d);
                setEditHours(h);
                setEditMinutes(m);
              }}
              label="Course Deadline / Completion Duration"
              required={true}
              helperNote="Set the deadline / duration allowed for learners to complete this course before access locks."
              idPrefix="edit-course-duration"
            />
          </div>

          {/* Course Overview / Introduction Video URL (YouTube) */}
          <div className="form-group-spaced">
            <label className="form-label-styled" htmlFor="edit-course-video" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Video size={16} style={{ color: 'var(--accent-color)' }} />
              <span>Course Introduction Video URL (YouTube)</span>
            </label>
            <input 
              id="edit-course-video"
              type="url" 
              className="form-input-styled" 
              placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ or https://youtu.be/..."
              value={editVideoUrl}
              onChange={(e) => setEditVideoUrl(e.target.value)}
            />
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>
              Optional introductory or overview video displayed in course details and syllabus overview.
            </p>
            {editVideoUrl.trim() && !isValidYouTubeUrl(editVideoUrl.trim()) && (
              <p style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, marginTop: '6px' }}>
                Please enter a valid YouTube URL (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...)
              </p>
            )}
            {isValidYouTubeUrl(editVideoUrl.trim()) && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Live Video Preview:
                </div>
                <YouTubeEmbed videoUrl={editVideoUrl.trim()} title="Course Overview Video Preview" />
              </div>
            )}
          </div>

          {/* Assign To (Department Selection) */}
          <div className="form-group-spaced">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label-styled" style={{ margin: 0 }}>
                Assign To <span className="required-star">*</span>
              </label>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                Target departments for this course
              </span>
            </div>

            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <input
                type="text"
                className="form-input-styled"
                placeholder="Search departments..."
                value={editDeptSearchQuery}
                onChange={(e) => setEditDeptSearchQuery(e.target.value)}
                style={{ paddingLeft: '32px', fontSize: '0.82rem' }}
              />
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            </div>

            <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '8px', background: 'var(--bg-main)' }}>
              {/* All Departments Option */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  cursor: role === 'Manager' ? 'not-allowed' : 'pointer',
                  marginBottom: '6px',
                  background: isAllEditDeptsSelected ? 'var(--accent-glow)' : 'rgba(255, 255, 255, 0.02)',
                  borderBottom: '1px solid var(--border-color)',
                  fontWeight: 700,
                  opacity: role === 'Manager' ? 0.6 : 1,
                  transition: 'background 0.15s ease'
                }}
              >
                <input
                  type="checkbox"
                  checked={isAllEditDeptsSelected}
                  onChange={handleToggleAllEditDepts}
                  disabled={role === 'Manager'}
                  style={{ cursor: role === 'Manager' ? 'not-allowed' : 'pointer', width: '16px', height: '16px', accentColor: 'var(--accent-color)' }}
                />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                    All Departments
                  </span>
                  <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '12px', background: 'var(--bg-card)', color: 'var(--accent-color)', fontWeight: 700 }}>
                    {totalCompanyEmployees} Total Employees
                  </span>
                </div>
              </label>

              {filteredEditDepts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  No departments found.
                </div>
              ) : (
                filteredEditDepts.map(d => {
                  const isSelected = selectedEditDeptIds.includes(d.id);
                  const isManagerDisabled = role === 'Manager' && d.code !== dept;
                  return (
                    <label
                      key={d.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        cursor: isManagerDisabled ? 'not-allowed' : 'pointer',
                        marginBottom: '4px',
                        background: isSelected ? 'var(--accent-glow)' : 'transparent',
                        opacity: isManagerDisabled ? 0.4 : 1,
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => !isManagerDisabled && handleToggleEditDept(d.id)}
                        disabled={isManagerDisabled}
                        style={{ cursor: isManagerDisabled ? 'not-allowed' : 'pointer', width: '15px', height: '15px', accentColor: 'var(--accent-color)' }}
                      />
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <span style={{ fontWeight: 700, color: 'var(--accent-color)', marginRight: '6px' }}>[{d.code}]</span>
                          <span>{d.name}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '8px' }}>
                          ({d.employee_count ?? 0})
                        </span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            {/* Summary */}
            <div style={{
              marginTop: '8px',
              padding: '8px 12px',
              borderRadius: '6px',
              background: selectedEditDeptIds.length > 0 ? 'var(--accent-glow)' : 'rgba(239, 68, 68, 0.08)',
              border: selectedEditDeptIds.length > 0 ? '1px solid var(--accent-color)' : '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              fontSize: '0.82rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} style={{ color: selectedEditDeptIds.length > 0 ? 'var(--accent-color)' : '#ef4444' }} />
                <span>
                  {selectedEditDeptIds.length === 0 ? (
                    <strong style={{ color: '#ef4444' }}>Please select at least one department</strong>
                  ) : (
                    <>
                      This course will be assigned to{' '}
                      <strong style={{ color: 'var(--accent-color)' }}>
                        {selectedEditEmployeesTotal} {selectedEditEmployeesTotal === 1 ? 'employee' : 'employees'}
                      </strong>
                      {isAllEditDeptsSelected ? ' (All Company Employees)' : ` across ${selectedEditDeptIds.length} ${selectedEditDeptIds.length === 1 ? 'department' : 'departments'}`}
                    </>
                  )}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                {selectedEditDeptIds.length} / {departmentsList.length} Selected
              </span>
            </div>
          </div>
        </form>
      </Modal>

      {/* Course Creation Modal Overlay */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        title="Create New Course"
        subtitle="Step 1: Set basic details & deadline, then add syllabus content, notes and quizzes"
        icon={<BookOpen size={22} style={{ color: 'var(--accent-color)' }} />}
        maxWidth="640px"
        footer={
          <>
            <Button variant="outline" type="button" onClick={handleCloseCreateModal}>
              Cancel
            </Button>
            <Button variant="primary" type="button" onClick={(e) => handleCreateSubmit(e as any)}>
              Continue to Add Content (Modules, Notes, Quiz) ➔
            </Button>
          </>
        }
      >
        <form id="create-course-form" onSubmit={handleCreateSubmit}>
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

          {/* Course Code */}
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
            <p style={{ margin: '6px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Suggested next sequential code:{' '}
              <span 
                onClick={() => {
                  const suggestedDeptCode = isAllDeptsSelected
                    ? 'ALL'
                    : (selectedDeptIds.length > 0
                        ? (departmentsList.find(d => d.id === selectedDeptIds[0])?.code || 'AI')
                        : 'AI');
                  setCourseCode(getSuggestedCourseCode(suggestedDeptCode));
                }}
                style={{ color: 'var(--accent-color)', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}
                title="Click to automatically fill this code"
              >
                {getSuggestedCourseCode(
                  isAllDeptsSelected
                    ? 'ALL'
                    : (selectedDeptIds.length > 0
                        ? (departmentsList.find(d => d.id === selectedDeptIds[0])?.code || 'AI')
                        : 'AI')
                )}
              </span>{' '}
              (Click to auto-fill)
            </p>
            {errors.courseCode && (
              <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>{errors.courseCode}</p>
            )}
          </div>

          {/* Assign To (Department Selection) */}
          <div className="form-group-spaced">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label-styled" style={{ margin: 0 }}>
                Assign To <span className="required-star">*</span>
              </label>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                Target departments for this course
              </span>
            </div>

            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <input
                type="text"
                className="form-input-styled"
                placeholder="Search departments..."
                value={deptSearchQuery}
                onChange={(e) => setDeptSearchQuery(e.target.value)}
                style={{ paddingLeft: '32px', fontSize: '0.82rem' }}
              />
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            </div>

            <div style={{ maxHeight: '175px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '8px', background: 'var(--bg-main)' }}>
              {/* All Departments Option */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  cursor: role === 'Manager' ? 'not-allowed' : 'pointer',
                  marginBottom: '6px',
                  background: isAllDeptsSelected ? 'var(--accent-glow)' : 'rgba(255, 255, 255, 0.02)',
                  borderBottom: '1px solid var(--border-color)',
                  fontWeight: 700,
                  opacity: role === 'Manager' ? 0.6 : 1,
                  transition: 'background 0.15s ease'
                }}
              >
                <input
                  type="checkbox"
                  checked={isAllDeptsSelected}
                  onChange={handleToggleAllDepts}
                  disabled={role === 'Manager'}
                  style={{ cursor: role === 'Manager' ? 'not-allowed' : 'pointer', width: '16px', height: '16px', accentColor: 'var(--accent-color)' }}
                />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                    All Departments
                  </span>
                  <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '12px', background: 'var(--bg-card)', color: 'var(--accent-color)', fontWeight: 700 }}>
                    {totalCompanyEmployees} Total Employees
                  </span>
                </div>
              </label>

              {filteredDepts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  No departments found matching "{deptSearchQuery}".
                </div>
              ) : (
                filteredDepts.map(d => {
                  const isSelected = selectedDeptIds.includes(d.id);
                  const isManagerDisabled = role === 'Manager' && d.code !== dept;
                  return (
                    <label
                      key={d.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        cursor: isManagerDisabled ? 'not-allowed' : 'pointer',
                        marginBottom: '4px',
                        background: isSelected ? 'var(--accent-glow)' : 'transparent',
                        opacity: isManagerDisabled ? 0.4 : 1,
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => !isManagerDisabled && handleToggleDept(d.id)}
                        disabled={isManagerDisabled}
                        style={{ cursor: isManagerDisabled ? 'not-allowed' : 'pointer', width: '15px', height: '15px', accentColor: 'var(--accent-color)' }}
                      />
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <span style={{ fontWeight: 700, color: 'var(--accent-color)', marginRight: '6px' }}>[{d.code}]</span>
                          <span>{d.name}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '8px' }}>
                          ({d.employee_count ?? 0})
                        </span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            {/* Assignment Summary Banner */}
            <div style={{
              marginTop: '8px',
              padding: '8px 12px',
              borderRadius: '6px',
              background: selectedDeptIds.length > 0 ? 'var(--accent-glow)' : 'rgba(239, 68, 68, 0.08)',
              border: selectedDeptIds.length > 0 ? '1px solid var(--accent-color)' : '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              fontSize: '0.82rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} style={{ color: selectedDeptIds.length > 0 ? 'var(--accent-color)' : '#ef4444' }} />
                <span>
                  {selectedDeptIds.length === 0 ? (
                    <strong style={{ color: '#ef4444' }}>Please select at least one department</strong>
                  ) : (
                    <>
                      This course will be assigned to{' '}
                      <strong style={{ color: 'var(--accent-color)' }}>
                        {selectedEmployeesTotal} {selectedEmployeesTotal === 1 ? 'employee' : 'employees'}
                      </strong>
                      {isAllDeptsSelected ? ' (All Company Employees)' : ` across ${selectedDeptIds.length} ${selectedDeptIds.length === 1 ? 'department' : 'departments'}`}
                    </>
                  )}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                {selectedDeptIds.length} / {departmentsList.length} Selected
              </span>
            </div>

            {errors.department && (
              <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>{errors.department}</p>
            )}
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

          {/* Priority */}
          <div className="form-group-spaced">
            <label className="form-label-styled">
              Priority <span className="required-star">*</span>
            </label>
            <select 
              className="form-select-styled"
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              style={{ width: '100%' }}
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Mandatory Course Toggle */}
          <div className="form-group-spaced">
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0 }}>
              <input 
                type="checkbox" 
                id="is_mandatory_checkbox"
                checked={isMandatory} 
                onChange={(e) => setIsMandatory(e.target.checked)}
                style={{ accentColor: 'var(--accent-color)', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Mark as Mandatory Course
              </span>
            </label>
            <p style={{ margin: '4px 0 0 28px', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Mandatory courses are required for all enrolled personnel.
            </p>
          </div>

          {/* Duration / Deadline */}
          <div className="form-group-spaced">
            <DurationInput
              showDays={true}
              days={durationDays}
              hours={durationHours}
              minutes={durationMinutes}
              onChange={(d: number, h: number, m: number) => {
                setDurationDays(d);
                setDurationHours(h);
                setDurationMinutes(m);
                if (errors.duration) {
                  setErrors(prev => {
                    const updated = { ...prev };
                    delete updated.duration;
                    return updated;
                  });
                }
              }}
              error={errors.duration}
              label="Course Deadline / Completion Duration"
              required={true}
              helperNote="Set the deadline / duration allowed for learners to complete this course (minimum 1 minute). Courses lock for learners after this deadline."
              idPrefix="create-course-duration"
            />
          </div>

          {/* Course Overview / Introduction Video URL (YouTube) */}
          <div className="form-group-spaced">
            <label className="form-label-styled" htmlFor="create-course-video" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Video size={16} style={{ color: 'var(--accent-color)' }} />
              <span>Course Introduction Video URL (YouTube)</span>
            </label>
            <input 
              id="create-course-video"
              type="url" 
              className={`form-input-styled ${errors.videoUrl ? 'has-error' : ''}`}
              placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ or https://youtu.be/..."
              value={videoUrl}
              onChange={(e) => {
                setVideoUrl(e.target.value);
                if (errors.videoUrl) {
                  setErrors(prev => {
                    const updated = { ...prev };
                    delete updated.videoUrl;
                    return updated;
                  });
                }
              }}
            />
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>
              Optional introductory or overview video displayed in course details and syllabus overview.
            </p>
            {videoUrl.trim() && !isValidYouTubeUrl(videoUrl.trim()) && (
              <p style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, marginTop: '6px' }}>
                Please enter a valid YouTube URL (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...)
              </p>
            )}
            {isValidYouTubeUrl(videoUrl.trim()) && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Live Video Preview:
                </div>
                <YouTubeEmbed videoUrl={videoUrl.trim()} title="Course Overview Video Preview" />
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* Delete Course Confirmation Modal */}
      <Modal
        isOpen={!!courseToDelete}
        onClose={() => setCourseToDelete(null)}
        title="Delete Course Confirmation"
        icon={<AlertTriangle style={{ color: '#ef4444' }} />}
        maxWidth="460px"
        footer={
          <>
            <Button variant="outline" onClick={() => setCourseToDelete(null)} disabled={isDeletingCourse}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDeleteCourse}
              disabled={isDeletingCourse}
              style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
            >
              {isDeletingCourse ? 'Deleting Course...' : 'Confirm Delete Course'}
            </Button>
          </>
        }
      >
        <div style={{ lineHeight: '1.6', fontSize: '0.92rem', color: 'var(--text-primary)' }}>
          <p style={{ marginBottom: '12px' }}>
            Are you sure you want to permanently delete <strong>{courseToDelete?.title}</strong> ({courseToDelete?.course_code})?
          </p>
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <strong>Notice:</strong> This action cannot be undone. Shared modules linked to other courses will be safely preserved in the curriculum.
          </div>
        </div>
      </Modal>

      {/* Assigned Learners & Progress Modal */}
      <LearnersModal
        isOpen={!!learnersCourse}
        onClose={() => setLearnersCourse(null)}
        courseId={learnersCourse?.id || null}
        courseTitle={learnersCourse?.title}
        courseCode={learnersCourse?.course_code}
      />
    </div>
  );
};
