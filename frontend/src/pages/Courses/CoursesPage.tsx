import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookOpen, Play, CheckCircle2, Clock, Search, X, Layers,
  Compass, Award, RefreshCw, AlertCircle, ArrowRight, CheckCircle,
  FileText, Brain, Landmark, Code, Users, ExternalLink, Video,
  Trash2, AlertTriangle, GraduationCap, UserCheck, ShieldCheck,
  Check, Sparkles, ChevronRight
} from 'lucide-react';
import { apiCall } from '../../services/api';
import { Button } from '../../components/Button/Button';
import { Modal } from '../../components/Modal/Modal';
import { YouTubeEmbed } from '../../components/YouTubeEmbed/YouTubeEmbed';
import { isValidYouTubeUrl } from '../../utils/youtube';
import { canDeleteCourse } from '../../utils/coursePermissions';
import './CoursesPage.css';

// Types matching backend response schemas
interface MyCourseItem {
  id: string;
  enrollment_id: string;
  course_code: string;
  title: string;
  description: string | null;
  duration: string | null;
  difficulty_level: string | null;
  department_name: string | null;
  created_by?: string | null;
  creator_name?: string | null;
  department_id: string | null;
  is_mandatory: boolean;
  total_modules: number;
  completed_modules: number;
  progress_percent: number;
  status: 'not_started' | 'in_progress' | 'completed';
  enrolled_at: string;
  last_accessed_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  next_module_id: string | null;
  next_module_title: string | null;
}

interface MyCoursesSummary {
  total_assigned: number;
  not_started: number;
  in_progress: number;
  completed: number;
  total_enrolled: number;
}

interface CatalogCourseItem {
  id: string;
  course_code: string;
  title: string;
  description: string | null;
  duration: string | null;
  difficulty_level: string | null;
  department_name: string | null;
  department_id: string | null;
  is_mandatory: boolean;
  is_published: boolean;
  created_at: string;
  total_modules: number;
  enrollment_id: string | null;
  user_status: 'not_enrolled' | 'assigned' | 'not_started' | 'in_progress' | 'completed';
  progress_percent: number;
  last_accessed_at: string | null;
  creator_name: string | null;
  created_by?: string | null;
}

interface CourseDetailModule {
  id: string;
  title: string;
  description: string | null;
  sequence_no: number;
  tier: string | null;
  contents_count: number;
  duration_seconds: number | null;
  completed: boolean;
}

interface CourseDetail {
  id: string;
  course_code: string;
  title: string;
  description: string | null;
  duration: string | null;
  difficulty_level: string | null;
  department_name: string | null;
  is_mandatory: boolean;
  creator_name: string | null;
  created_by?: string | null;
  total_modules: number;
  enrollment_id: string | null;
  user_status: string;
  progress_percent: number;
  video_url?: string | null;
  modules: CourseDetailModule[];
}

export const CoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active top-level mode: 'my_courses' | 'catalog'
  const tabParam = searchParams.get('tab') || 'in_progress';
  const isCatalogMode = tabParam === 'available' || tabParam === 'catalog';

  // My Courses sub-tab: 'in_progress' | 'not_started' | 'completed' | 'all'
  const [activeSubTab, setActiveSubTab] = useState<'in_progress' | 'not_started' | 'completed' | 'all'>(() => {
    if (tabParam === 'not_started' || tabParam === 'completed') return tabParam;
    return 'in_progress';
  });

  // State
  const [myCourses, setMyCourses] = useState<MyCourseItem[]>([]);
  const [summary, setSummary] = useState<MyCoursesSummary>({
    total_assigned: 0,
    not_started: 0,
    in_progress: 0,
    completed: 0,
    total_enrolled: 0
  });

  const [catalogCourses, setCatalogCourses] = useState<CatalogCourseItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters for Catalog & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedDuration, setSelectedDuration] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');

  // Modal State for Course Details
  const [activeDetailCourse, setActiveDetailCourse] = useState<CourseDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  // Role & Delete State
  const role = typeof window !== 'undefined' ? (localStorage.getItem('isLoggedInRole') || 'Employee') : 'Employee';
  const isManagerOrAdmin = ['admin', 'hr admin', 'hr manager', 'manager', 'course_manager', 'system_admin'].includes(role.toLowerCase());
  const [courseToDelete, setCourseToDelete] = useState<{ id: string; title: string; course_code: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    setIsDeleting(true);
    try {
      const res = await apiCall(`/api/courses/${courseToDelete.id}`, { method: 'DELETE' });
      if (res.ok || res.status === 204) {
        setCourseToDelete(null);
        setActiveDetailCourse(null);
        await loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Failed to delete course');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Connection error while deleting course.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Sync sub-tab from URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'in_progress' || tab === 'not_started' || tab === 'completed') {
      setActiveSubTab(tab);
    }
  }, [searchParams]);

  // Fetch My Courses
  const fetchMyCourses = async () => {
    try {
      const res = await apiCall('/api/courses/my-courses');
      if (res.ok) {
        const data = await res.json();
        setMyCourses(data.courses || []);
        if (data.summary) {
          setSummary(data.summary);
        }
      } else {
        throw new Error('Failed to load enrolled courses');
      }
    } catch (err: any) {
      console.error('Error fetching my courses:', err);
      throw err;
    }
  };

  // Fetch Course Catalog
  const fetchCatalog = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'ALL') {
        params.append('category', selectedCategory);
      }
      if (selectedDuration && selectedDuration !== 'ALL') {
        params.append('duration', selectedDuration);
      }
      if (selectedStatus && selectedStatus !== 'ALL') {
        params.append('status', selectedStatus);
      }
      if (sortBy) {
        params.append('sort', sortBy);
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await apiCall(`/api/courses/catalog${queryString}`);
      if (res.ok) {
        const data = await res.json();
        setCatalogCourses(data.courses || []);
        if (data.categories && Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
      } else {
        throw new Error('Failed to load catalog');
      }
    } catch (err: any) {
      console.error('Error fetching catalog:', err);
      throw err;
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchMyCourses(), fetchCatalog()]);
    } catch (err: any) {
      setError('Unable to load courses. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedDuration, selectedStatus, sortBy]);

  // Handle switching between My Courses and Course Catalog
  const handleSwitchMainTab = (targetMode: 'my_courses' | 'catalog') => {
    if (targetMode === 'catalog') {
      setSearchParams({ tab: 'available' });
    } else {
      setSearchParams({ tab: activeSubTab });
    }
  };

  const handleSwitchSubTab = (sub: 'in_progress' | 'not_started' | 'completed' | 'all') => {
    setActiveSubTab(sub);
    setSearchParams({ tab: sub });
  };

  // Open Course Details Modal
  const handleOpenDetailModal = async (courseId: string) => {
    setLoadingDetail(true);
    try {
      let res = await apiCall(`/api/courses/${courseId}`);
      if (!res.ok) {
        res = await apiCall(`/courses/${courseId}`);
      }
      if (res.ok) {
        const data = await res.json();
        setActiveDetailCourse(data);
      }
    } catch (err) {
      console.error('Error fetching course detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Enroll Action
  const handleEnroll = async (courseId: string, autoLaunch = false) => {
    setEnrollingId(courseId);
    try {
      let res = await apiCall(`/api/courses/${courseId}/enroll`, { method: 'POST' });
      if (!res.ok) {
        res = await apiCall(`/courses/${courseId}/enroll`, { method: 'POST' });
      }
      if (res.ok) {
        const data = await res.json();
        await loadData();
        if (autoLaunch && data.enrollment_id) {
          navigate(`/course-player/${data.enrollment_id}`);
        } else {
          if (activeDetailCourse && activeDetailCourse.id === courseId) {
            handleOpenDetailModal(courseId);
          }
        }
      } else {
        alert('Could not complete enrollment. Please try again.');
      }
    } catch (err) {
      console.error('Enrollment failed:', err);
      alert('Enrollment failed.');
    } finally {
      setEnrollingId(null);
    }
  };

  // Launch Player Action
  const handleLaunchPlayer = (enrollmentId: string) => {
    navigate(`/course-player/${enrollmentId}`);
  };

  // Formatting helpers
  const formatTimeAgo = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
      if (diffSec < 60) return 'just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return null;
    }
  };

  // Sophisticated Enterprise Theme per Department / Discipline
  const getThumbnailTheme = (deptName?: string | null, courseCode?: string) => {
    const code = (courseCode || '').toUpperCase();
    const dept = (deptName || '').toLowerCase();

    if (dept.includes('ai') || dept.includes('intelligence') || code.startsWith('AI')) {
      return {
        themeKey: 'ai',
        icon: <Brain size={14} />,
        label: 'Artificial Intelligence'
      };
    }
    if (dept.includes('fico') || dept.includes('finance') || dept.includes('account') || code.startsWith('FICO')) {
      return {
        themeKey: 'finance',
        icon: <Landmark size={14} />,
        label: 'Finance & Cost Control'
      };
    }
    if (dept.includes('abap') || dept.includes('develop') || dept.includes('tech') || code.startsWith('ABAP')) {
      return {
        themeKey: 'tech',
        icon: <Code size={14} />,
        label: 'ABAP Engineering'
      };
    }
    if (dept.includes('hr') || dept.includes('admin') || code.startsWith('HR')) {
      return {
        themeKey: 'hr',
        icon: <Users size={14} />,
        label: 'Human Resources'
      };
    }
    return {
      themeKey: 'general',
      icon: <BookOpen size={14} />,
      label: 'Core Curriculum'
    };
  };

  // Filter My Courses
  const filteredMyCourses = useMemo(() => {
    let list = myCourses;

    if (activeSubTab === 'in_progress') {
      list = list.filter(c => c.status === 'in_progress');
    } else if (activeSubTab === 'not_started') {
      list = list.filter(c => c.status === 'not_started');
    } else if (activeSubTab === 'completed') {
      list = list.filter(c => c.status === 'completed');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c =>
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.course_code && c.course_code.toLowerCase().includes(q))
      );
    }

    return list;
  }, [myCourses, activeSubTab, searchQuery]);

  // Filter Catalog Courses
  const filteredCatalog = useMemo(() => {
    let list = catalogCourses;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c =>
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.course_code && c.course_code.toLowerCase().includes(q))
      );
    }
    return list;
  }, [catalogCourses, searchQuery]);

  // Counts for My Courses sub-tabs
  const inProgressCount = myCourses.filter(c => c.status === 'in_progress').length;
  const notStartedCount = myCourses.filter(c => c.status === 'not_started').length;
  const completedCount = myCourses.filter(c => c.status === 'completed').length;

  const hasActiveCatalogFilters = selectedCategory !== 'ALL' || selectedDuration !== 'ALL' || selectedStatus !== 'ALL' || sortBy !== 'newest' || searchQuery.trim() !== '';

  return (
    <div className="courses-hub-canvas animate-fade-in">
      {/* 1. Executive Portal Header */}
      <div className="hub-executive-header">
        <div className="hub-header-top-row">
          <div className="hub-header-brand-block">
            <div className="hub-brand-icon-wrap">
              <GraduationCap size={24} className="hub-brand-icon" />
            </div>
            <div>
              <div className="hub-badge-pill">Enterprise Learning Portal</div>
              <h1 className="hub-title">Corporate Learning Center</h1>
              <p className="hub-subtitle">
                Access certified company curricula, required compliance tracks, and career advancement programs.
              </p>
            </div>
          </div>

          <div className="hub-header-actions">
            <button
              type="button"
              className="hub-refresh-btn"
              onClick={loadData}
              title="Refresh course data"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* High-End Segmented Navigation Control */}
        <div className="hub-segmented-nav-wrap">
          <div className="hub-segmented-tabs">
            <button
              type="button"
              className={`segmented-tab-btn ${!isCatalogMode ? 'active' : ''}`}
              onClick={() => handleSwitchMainTab('my_courses')}
            >
              <BookOpen size={16} />
              <span>My Enrolled Courses</span>
              <span className="tab-pill-badge">{myCourses.length}</span>
            </button>

            <button
              type="button"
              className={`segmented-tab-btn ${isCatalogMode ? 'active' : ''}`}
              onClick={() => handleSwitchMainTab('catalog')}
            >
              <Compass size={16} />
              <span>Course Catalog</span>
              <span className="tab-pill-badge">{catalogCourses.length}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Executive Metric Counters (KPI Grid) */}
      <div className="enterprise-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Assigned Curriculum</span>
            <div className="kpi-icon-wrap kpi-blue">
              <FileText size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{summary.total_assigned || notStartedCount}</span>
            <span className="kpi-status-tag">Required</span>
          </div>
          <span className="kpi-sub">Assigned by department leadership</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">In Progress</span>
            <div className="kpi-icon-wrap kpi-emerald">
              <Clock size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{inProgressCount}</span>
            <span className="kpi-status-tag kpi-tag-active">Active</span>
          </div>
          <span className="kpi-sub">Curricula currently in progress</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Completed Courses</span>
            <div className="kpi-icon-wrap kpi-amber">
              <Award size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{completedCount}</span>
            <span className="kpi-status-tag kpi-tag-success">Certified</span>
          </div>
          <span className="kpi-sub">Completed with passing assessment</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Catalog Library</span>
            <div className="kpi-icon-wrap kpi-purple">
              <Layers size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{catalogCourses.length}</span>
            <span className="kpi-status-tag">Available</span>
          </div>
          <span className="kpi-sub">Open for employee self-enrollment</span>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="enterprise-error-banner">
          <div className="error-message-wrap">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <Button variant="coral" size="sm" onClick={loadData}>Retry</Button>
        </div>
      )}

      {/* 3. Controls Bar / Search & Filter Controls */}
      <div className="enterprise-controls-bar">
        {/* Search Input */}
        <div className="enterprise-search-wrap">
          <Search size={16} className="enterprise-search-icon" />
          <input
            type="text"
            className="enterprise-search-input"
            placeholder={isCatalogMode ? "Search catalog by course title, code, or topic..." : "Filter your enrolled courses..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="enterprise-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Catalog Specific Filters */}
        {isCatalogMode ? (
          <div className="enterprise-filters-wrap">
            <select
              className="enterprise-filter-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              title="Filter by Department"
            >
              <option value="ALL">All Departments</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              className="enterprise-filter-select"
              value={selectedDuration}
              onChange={(e) => setSelectedDuration(e.target.value)}
              title="Filter by Duration"
            >
              <option value="ALL">All Durations</option>
              <option value="short">Short (&lt; 2 hrs)</option>
              <option value="medium">Medium (2 - 10 hrs)</option>
              <option value="long">Long (&gt; 10 hrs)</option>
            </select>

            <select
              className="enterprise-filter-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              title="Filter by Learning Status"
            >
              <option value="ALL">All Statuses</option>
              <option value="not_enrolled">Not Enrolled</option>
              <option value="assigned">Assigned to You</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            <select
              className="enterprise-filter-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              title="Sort Courses"
            >
              <option value="newest">Newest First</option>
              <option value="a_to_z">Course Name (A-Z)</option>
              <option value="shortest_duration">Shortest Duration</option>
              <option value="longest_duration">Longest Duration</option>
            </select>

            {hasActiveCatalogFilters && (
              <button
                type="button"
                className="filter-reset-link"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                  setSelectedDuration('ALL');
                  setSelectedStatus('ALL');
                  setSortBy('newest');
                }}
              >
                Reset
              </button>
            )}
          </div>
        ) : (
          <div className="enterprise-catalog-link-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSwitchMainTab('catalog')}
              leftIcon={<Compass size={14} />}
            >
              Browse Catalog ({catalogCourses.length})
            </Button>
          </div>
        )}
      </div>

      {/* 4. Sub-Tabs for My Courses View */}
      {!isCatalogMode && (
        <div className="enterprise-subtabs-row">
          <button
            type="button"
            className={`subtab-pill ${activeSubTab === 'in_progress' ? 'active' : ''}`}
            onClick={() => handleSwitchSubTab('in_progress')}
          >
            <Clock size={14} />
            <span>In Progress</span>
            <span className="subtab-count">{inProgressCount}</span>
          </button>

          <button
            type="button"
            className={`subtab-pill ${activeSubTab === 'not_started' ? 'active' : ''}`}
            onClick={() => handleSwitchSubTab('not_started')}
          >
            <Play size={14} />
            <span>Not Started</span>
            <span className="subtab-count">{notStartedCount}</span>
          </button>

          <button
            type="button"
            className={`subtab-pill ${activeSubTab === 'completed' ? 'active' : ''}`}
            onClick={() => handleSwitchSubTab('completed')}
          >
            <CheckCircle2 size={14} />
            <span>Completed</span>
            <span className="subtab-count">{completedCount}</span>
          </button>

          <button
            type="button"
            className={`subtab-pill ${activeSubTab === 'all' ? 'active' : ''}`}
            onClick={() => handleSwitchSubTab('all')}
          >
            <Layers size={14} />
            <span>All Enrolled</span>
            <span className="subtab-count">{myCourses.length}</span>
          </button>
        </div>
      )}

      {/* 5. Course Cards Grid Display */}
      {loading ? (
        <div className="enterprise-cards-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="enterprise-skeleton-card" />
          ))}
        </div>
      ) : !isCatalogMode ? (
        /* ================= MY COURSES VIEW ================= */
        filteredMyCourses.length === 0 ? (
          <div className="enterprise-empty-state">
            <div className="empty-state-icon-wrap">
              <BookOpen size={32} />
            </div>
            <h3 className="empty-state-title">
              {searchQuery
                ? 'No matching courses found'
                : activeSubTab === 'in_progress'
                ? 'No courses currently in progress'
                : activeSubTab === 'not_started'
                ? 'No courses waiting to be started'
                : activeSubTab === 'completed'
                ? 'No completed courses yet'
                : 'No course enrollments found'}
            </h3>
            <p className="empty-state-desc">
              {searchQuery
                ? `No courses in your learning list match "${searchQuery}". Clear your search query to see all your courses.`
                : activeSubTab === 'in_progress'
                ? 'Browse the corporate catalog and start a course to track your ongoing progress here.'
                : activeSubTab === 'not_started'
                ? 'You have initiated all assigned courses! Check the In Progress tab to continue learning.'
                : activeSubTab === 'completed'
                ? 'Complete all modules and evaluation quizzes to achieve official company certification.'
                : 'Explore available courses in the corporate catalog and enroll into curricula for your role.'}
            </p>
            {searchQuery ? (
              <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>Clear Search</Button>
            ) : (
              <Button variant="primary" size="sm" onClick={() => handleSwitchMainTab('catalog')} leftIcon={<Compass size={15} />}>
                Browse Course Catalog
              </Button>
            )}
          </div>
        ) : (
          <div className="enterprise-cards-grid">
            {filteredMyCourses.map((course) => {
              const theme = getThumbnailTheme(course.department_name, course.course_code);
              const lastAccessedText = formatTimeAgo(course.last_accessed_at);

              return (
                <div key={course.id} className="enterprise-course-card">
                  {/* Clean Formal White Header Band */}
                  <div
                    className="enterprise-card-banner"
                    onClick={() => handleOpenDetailModal(course.id)}
                  >

                    {/* Top Row: Department Tag & Status Badges / Admin Action */}
                    <div className="banner-top-row">
                      <div className="banner-dept-pill">
                        {theme.icon}
                        <span>{course.department_name || 'Corporate'}</span>
                      </div>

                      <div className="banner-badges-right">
                        {course.is_mandatory && (
                          <span className="badge-pill badge-mandatory" title="Mandatory training curriculum">
                            <ShieldCheck size={11} />
                            <span>Required</span>
                          </span>
                        )}

                        {course.status === 'completed' ? (
                          <span className="badge-pill badge-status-completed">
                            <CheckCircle2 size={11} />
                            <span>Completed</span>
                          </span>
                        ) : course.status === 'in_progress' ? (
                          <span className="badge-pill badge-status-progress">
                            <Clock size={11} />
                            <span>In Progress</span>
                          </span>
                        ) : (
                          <span className="badge-pill badge-status-assigned">
                            <UserCheck size={11} />
                            <span>Assigned</span>
                          </span>
                        )}

                        {canDeleteCourse(course) && (
                          <button
                            type="button"
                            className="banner-admin-delete-btn"
                            title="Delete Course (Admin)"
                            aria-label="Delete Course"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCourseToDelete({ id: course.id, title: course.title, course_code: course.course_code });
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row of Banner: Monospace Course Code & Level */}
                    <div className="banner-bottom-row">
                      <span className="banner-code-tag">{course.course_code}</span>
                      <span className="banner-level-tag">{course.difficulty_level || 'All Levels'}</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="enterprise-card-body">
                    <div className="card-body-main">
                      <h3
                        className="enterprise-card-title"
                        onClick={() => handleOpenDetailModal(course.id)}
                        title={course.title}
                      >
                        {course.title}
                      </h3>
                      <p className="enterprise-card-desc" title={course.description || ''}>
                        {course.description || 'Structured corporate learning curriculum and module assessment evaluation.'}
                      </p>

                      {/* Clean Metadata Micro-Row */}
                      <div className="enterprise-card-meta">
                        <div className="meta-pill">
                          <Clock size={13} />
                          <span>{course.duration || 'Self-paced'}</span>
                        </div>
                        <span className="meta-separator">•</span>
                        <div className="meta-pill">
                          <Layers size={13} />
                          <span>{course.total_modules} Modules</span>
                        </div>
                        {course.creator_name && (
                          <>
                            <span className="meta-separator">•</span>
                            <div className="meta-pill meta-author" title={`Instructor: ${course.creator_name}`}>
                              <UserCheck size={13} />
                              <span>{course.creator_name}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Coursera-style Progress Indicator */}
                    <div className="enterprise-progress-block">
                      <div className="progress-label-row">
                        <span>{course.completed_modules} of {course.total_modules} modules</span>
                        <span className="progress-pct-bold">{course.progress_percent}%</span>
                      </div>
                      <div className="progress-track-line">
                        <div
                          className="progress-fill-line"
                          style={{ width: `${course.progress_percent}%` }}
                        />
                      </div>
                      {lastAccessedText && course.status === 'in_progress' && (
                        <div className="progress-timing-note">
                          <Clock size={11} />
                          <span>Accessed {lastAccessedText}</span>
                        </div>
                      )}
                    </div>

                    {/* Professional Action Buttons */}
                    <div className="enterprise-card-actions">
                      {course.status === 'not_started' && (
                        <button
                          type="button"
                          className="btn-action-primary"
                          onClick={() => handleLaunchPlayer(course.enrollment_id)}
                        >
                          <Play size={14} />
                          <span>Start Course</span>
                        </button>
                      )}

                      {course.status === 'in_progress' && (
                        <button
                          type="button"
                          className="btn-action-primary"
                          onClick={() => handleLaunchPlayer(course.enrollment_id)}
                        >
                          <Play size={14} />
                          <span>Continue Learning</span>
                        </button>
                      )}

                      {course.status === 'completed' && (
                        <button
                          type="button"
                          className="btn-action-primary"
                          onClick={() => handleLaunchPlayer(course.enrollment_id)}
                        >
                          <CheckCircle2 size={14} />
                          <span>Review Course</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn-action-secondary"
                        onClick={() => handleOpenDetailModal(course.id)}
                        title="View Course Syllabus & Details"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ================= COURSE CATALOG VIEW ================= */
        filteredCatalog.length === 0 ? (
          <div className="enterprise-empty-state">
            <div className="empty-state-icon-wrap">
              <Search size={32} />
            </div>
            <h3 className="empty-state-title">No catalog courses match your filters</h3>
            <p className="empty-state-desc">
              Try adjusting your search criteria, selecting a different department, or clearing your active filters.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
                setSelectedDuration('ALL');
                setSelectedStatus('ALL');
                setSortBy('newest');
              }}
            >
              Reset All Filters
            </Button>
          </div>
        ) : (
          <div className="enterprise-cards-grid">
            {filteredCatalog.map((course) => {
              const theme = getThumbnailTheme(course.department_name, course.course_code);
              const isEnrollingThis = enrollingId === course.id;

              return (
                <div key={course.id} className="enterprise-course-card">
                  {/* Clean Formal White Header Band */}
                  <div
                    className="enterprise-card-banner"
                    onClick={() => handleOpenDetailModal(course.id)}
                  >

                    {/* Top Row: Department Tag & Status Badges */}
                    <div className="banner-top-row">
                      <div className="banner-dept-pill">
                        {theme.icon}
                        <span>{course.department_name || 'All Departments'}</span>
                      </div>

                      <div className="banner-badges-right">
                        {course.is_mandatory && (
                          <span className="badge-pill badge-mandatory" title="Mandatory training curriculum">
                            <ShieldCheck size={11} />
                            <span>Required</span>
                          </span>
                        )}

                        {course.user_status === 'completed' ? (
                          <span className="badge-pill badge-status-completed">
                            <CheckCircle2 size={11} />
                            <span>Completed</span>
                          </span>
                        ) : course.user_status === 'in_progress' ? (
                          <span className="badge-pill badge-status-progress">
                            <Clock size={11} />
                            <span>In Progress</span>
                          </span>
                        ) : course.user_status === 'assigned' ? (
                          <span className="badge-pill badge-status-assigned">
                            <UserCheck size={11} />
                            <span>Assigned</span>
                          </span>
                        ) : (
                          <span className="badge-pill badge-status-open">
                            <span>Open</span>
                          </span>
                        )}

                        {canDeleteCourse(course) && (
                          <button
                            type="button"
                            className="banner-admin-delete-btn"
                            title="Delete Course (Admin)"
                            aria-label="Delete Course"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCourseToDelete({ id: course.id, title: course.title, course_code: course.course_code });
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row of Banner: Monospace Course Code & Level */}
                    <div className="banner-bottom-row">
                      <span className="banner-code-tag">{course.course_code}</span>
                      <span className="banner-level-tag">{course.difficulty_level || 'All Levels'}</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="enterprise-card-body">
                    <div className="card-body-main">
                      <h3
                        className="enterprise-card-title"
                        onClick={() => handleOpenDetailModal(course.id)}
                        title={course.title}
                      >
                        {course.title}
                      </h3>
                      <p className="enterprise-card-desc" title={course.description || ''}>
                        {course.description || 'Comprehensive corporate training curriculum and module evaluation.'}
                      </p>

                      {/* Clean Metadata Micro-Row */}
                      <div className="enterprise-card-meta">
                        <div className="meta-pill">
                          <Clock size={13} />
                          <span>{course.duration || 'Self-paced'}</span>
                        </div>
                        <span className="meta-separator">•</span>
                        <div className="meta-pill">
                          <Layers size={13} />
                          <span>{course.total_modules} Modules</span>
                        </div>
                        {course.creator_name && (
                          <>
                            <span className="meta-separator">•</span>
                            <div className="meta-pill meta-author" title={`Instructor: ${course.creator_name}`}>
                              <UserCheck size={13} />
                              <span>{course.creator_name}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Progress Indicator if In Progress */}
                    {course.user_status === 'in_progress' && (
                      <div className="enterprise-progress-block">
                        <div className="progress-label-row">
                          <span>Learning in Progress</span>
                          <span className="progress-pct-bold">{course.progress_percent}%</span>
                        </div>
                        <div className="progress-track-line">
                          <div
                            className="progress-fill-line"
                            style={{ width: `${course.progress_percent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Action Buttons based on User Status */}
                    <div className="enterprise-card-actions">
                      {course.user_status === 'not_enrolled' ? (
                        <button
                          type="button"
                          className="btn-action-primary"
                          disabled={isEnrollingThis}
                          onClick={() => handleEnroll(course.id, true)}
                        >
                          <Play size={14} />
                          <span>{isEnrollingThis ? 'Enrolling...' : 'Enroll & Start'}</span>
                        </button>
                      ) : course.user_status === 'assigned' || course.user_status === 'not_started' ? (
                        <button
                          type="button"
                          className="btn-action-primary"
                          onClick={() => {
                            if (course.enrollment_id) {
                              handleLaunchPlayer(course.enrollment_id);
                            } else {
                              handleEnroll(course.id, true);
                            }
                          }}
                        >
                          <Play size={14} />
                          <span>Start Course</span>
                        </button>
                      ) : course.user_status === 'in_progress' ? (
                        <button
                          type="button"
                          className="btn-action-primary"
                          onClick={() => {
                            if (course.enrollment_id) {
                              handleLaunchPlayer(course.enrollment_id);
                            }
                          }}
                        >
                          <Play size={14} />
                          <span>Continue Learning</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-action-primary"
                          onClick={() => {
                            if (course.enrollment_id) {
                              handleLaunchPlayer(course.enrollment_id);
                            }
                          }}
                        >
                          <CheckCircle2 size={14} />
                          <span>Review Course</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn-action-secondary"
                        onClick={() => handleOpenDetailModal(course.id)}
                        title="View Course Syllabus & Details"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* 6. Course Details Modal / Syllabus Viewer */}
      {activeDetailCourse && (
        <div className="course-detail-modal-overlay" onClick={() => setActiveDetailCourse(null)}>
          <div className="course-detail-modal animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-banner">
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveDetailCourse(null)}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>

              <div className="modal-header-badges-row">
                <span className="modal-code-badge">{activeDetailCourse.course_code}</span>
                <span className="modal-dept-badge">{activeDetailCourse.department_name || 'All Departments'}</span>
                {activeDetailCourse.is_mandatory && (
                  <span className="badge-pill badge-mandatory">
                    <ShieldCheck size={11} />
                    <span>Required</span>
                  </span>
                )}
              </div>

              <h2 className="modal-course-title">
                {activeDetailCourse.title}
              </h2>
              <p className="modal-course-desc">
                {activeDetailCourse.description || 'Complete curriculum overview, learning goals, and structured syllabus.'}
              </p>

              <div className="modal-meta-row">
                <span className="modal-meta-item">
                  <Clock size={14} /> Total Duration: {activeDetailCourse.duration || 'Self-paced'}
                </span>
                <span className="modal-meta-item">
                  <Layers size={14} /> {activeDetailCourse.total_modules} Modules
                </span>
                <span className="modal-meta-item">
                  <Brain size={14} /> {activeDetailCourse.difficulty_level || 'All Levels'}
                </span>
              </div>
            </div>

            {/* Course Overview Video */}
            {activeDetailCourse.video_url && isValidYouTubeUrl(activeDetailCourse.video_url) && (
              <div className="modal-video-section">
                <div className="modal-section-title">
                  <Video size={16} style={{ color: 'var(--accent-color)' }} />
                  <span>Curriculum Video Introduction</span>
                </div>
                <YouTubeEmbed videoUrl={activeDetailCourse.video_url} title={`${activeDetailCourse.title} - Overview`} />
              </div>
            )}

            {/* Syllabus Section */}
            <div className="modal-syllabus-section">
              <h3 className="syllabus-heading">
                <Layers size={18} style={{ color: 'var(--accent-color)' }} />
                <span>Course Syllabus & Learning Modules</span>
              </h3>

              {activeDetailCourse.modules.length === 0 ? (
                <p className="syllabus-empty-note">
                  No modules published for this course yet.
                </p>
              ) : (
                activeDetailCourse.modules.map((mod, idx) => (
                  <div key={mod.id} className="module-syllabus-item">
                    <div className={`module-seq-circle ${mod.completed ? 'done' : ''}`}>
                      {mod.completed ? <Check size={15} /> : idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="module-item-header">
                        <h4 className="module-item-title">{mod.title}</h4>
                        {mod.completed && (
                          <span className="module-completed-chip">
                            Completed
                          </span>
                        )}
                      </div>
                      <p className="module-item-desc">
                        {mod.description || 'Instructional content, study materials, and practical knowledge evaluations.'}
                      </p>
                      <div className="module-item-meta">
                        <span>{mod.contents_count} Learning Items</span>
                        {mod.tier && <span style={{ textTransform: 'capitalize' }}>Level: {mod.tier}</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer with Primary CTA */}
            <div className="modal-footer-bar">
              <div className="modal-footer-left">
                <Button variant="outline" size="sm" onClick={() => setActiveDetailCourse(null)}>
                  Close
                </Button>
                {canDeleteCourse(activeDetailCourse) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCourseToDelete({ id: activeDetailCourse.id, title: activeDetailCourse.title, course_code: activeDetailCourse.course_code })}
                    leftIcon={<Trash2 size={14} />}
                    style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                  >
                    Delete Course
                  </Button>
                )}
              </div>

              <div className="modal-footer-right">
                {activeDetailCourse.user_status === 'not_enrolled' ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const cid = activeDetailCourse.id;
                      setActiveDetailCourse(null);
                      handleEnroll(cid, true);
                    }}
                    leftIcon={<Play size={15} />}
                  >
                    Enroll and Start Now
                  </Button>
                ) : activeDetailCourse.user_status === 'completed' ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const eid = activeDetailCourse.enrollment_id;
                      setActiveDetailCourse(null);
                      if (eid) handleLaunchPlayer(eid);
                    }}
                    leftIcon={<CheckCircle2 size={15} />}
                  >
                    Review Course
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const eid = activeDetailCourse.enrollment_id;
                      setActiveDetailCourse(null);
                      if (eid) {
                        handleLaunchPlayer(eid);
                      } else {
                        handleEnroll(activeDetailCourse.id, true);
                      }
                    }}
                    leftIcon={<Play size={15} />}
                  >
                    {activeDetailCourse.progress_percent > 0 ? 'Continue Learning' : 'Start Course'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Course Confirmation Modal */}
      <Modal
        isOpen={!!courseToDelete}
        onClose={() => setCourseToDelete(null)}
        title="Confirm Course Removal"
        icon={<AlertTriangle style={{ color: '#ef4444' }} />}
        maxWidth="460px"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setCourseToDelete(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDeleteCourse}
              disabled={isDeleting}
              style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
            >
              {isDeleting ? 'Deleting Course...' : 'Confirm Delete'}
            </Button>
          </>
        }
      >
        <div style={{ lineHeight: '1.6', fontSize: '0.92rem', color: 'var(--text-primary)' }}>
          <p style={{ marginBottom: '12px' }}>
            Are you sure you want to permanently remove <strong>{courseToDelete?.title}</strong> ({courseToDelete?.course_code}) from the corporate catalog?
          </p>
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <strong>Notice:</strong> This action cannot be reversed. All modules, employee enrollments, and completion records associated with this course will be permanently deleted.
          </div>
        </div>
      </Modal>
    </div>
  );
};
