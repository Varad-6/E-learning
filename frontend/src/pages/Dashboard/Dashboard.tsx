import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Users, ShieldAlert, Award, FileText, PlusCircle, Bookmark, Layers, BookOpen, Clock, Hourglass, CheckCircle, Bell, Trophy, Calendar, ChevronRight, Target, Flag, TrendingUp } from 'lucide-react';
import { Button } from '../../components/Button/Button';
import { Modal } from '../../components/Modal/Modal';
import type { Course } from '../../types/schema';
import { getBadgeForCompletions } from '../../services/badge';
import type { Badge } from '../../services/badge';
import { apiCall } from '../../services/api';
import './Dashboard.css';

// Pure SVG Donut Chart Component (Zero External Dependencies)
const SVGDonutChart: React.FC<{ items: { label: string; value: number; color: string }[] }> = ({ items }) => {
  const total = items.reduce((acc, curr) => acc + curr.value, 0) || 1;
  let cumulativePercent = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
      <div style={{ position: 'relative', width: '150px', height: '150px' }}>
        <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
          {items.map((item, idx) => {
            const percent = (item.value / total) * 100;
            const strokeDasharray = `${percent} ${100 - percent}`;
            const strokeDashoffset = -cumulativePercent;
            cumulativePercent += percent;
            return (
              <circle
                key={idx}
                cx="18"
                cy="18"
                r="15.91549430918954"
                fill="transparent"
                stroke={item.color}
                strokeWidth="4"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'all 0.5s ease' }}
              />
            );
          })}
        </svg>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)' }}>{items[0]?.value}%</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{items[0]?.label}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
        {items.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>{item.label}: <strong style={{ color: 'var(--text-primary)' }}>{item.value}%</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Pure SVG Line Chart Component (Zero External Dependencies)
const SVGLineChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
  if (!data || data.length === 0) return <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', padding: '16px 0' }}>No trend data available.</p>;

  // Dimensions & Padding
  const width = 500;
  const height = 220;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 35;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Max value calculation with fallback minimum
  const rawMax = Math.max(...data.map(d => d.value));
  const maxVal = rawMax === 0 ? 10 : Math.ceil(rawMax * 1.1);

  // Generate 4 nice Y-axis ticks
  const yTicks = [
    0,
    Math.round(maxVal * 0.33),
    Math.round(maxVal * 0.66),
    maxVal
  ];

  // Coordinates Mapping
  const pts = data.map((d, i) => {
    const x = paddingLeft + (data.length > 1 ? (i / (data.length - 1)) * chartWidth : chartWidth / 2);
    const y = paddingTop + chartHeight - (d.value / maxVal) * chartHeight;
    return { x, y };
  });

  // Construct Cubic Bezier Spline Path
  const getBezierPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 3;
      const cpY1 = p0.y;
      const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
      const cpY2 = p1.y;
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  const bezierPath = getBezierPath(pts);
  const xStart = pts[0]?.x || paddingLeft;
  const xEnd = pts[pts.length - 1]?.x || (width - paddingRight);
  const yBottom = paddingTop + chartHeight;

  return (
    <div style={{ width: '100%', maxWidth: '640px', margin: '0 auto', padding: '8px 0' }}>
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        style={{ width: '100%', height: 'auto', overflow: 'visible' }}
      >
        <defs>
          {/* Subtle area gradient matching the accent color theme */}
          <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-color)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent-color)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Dashboard Grid Lines (Horizontal) */}
        {yTicks.map((tick, i) => {
          const y = paddingTop + chartHeight - (tick / maxVal) * chartHeight;
          return (
            <g key={i}>
              <line 
                x1={paddingLeft} 
                y1={y} 
                x2={width - paddingRight} 
                y2={y} 
                stroke="var(--border-color)" 
                strokeWidth="1" 
                strokeDasharray="4 4" 
                opacity="0.6"
              />
              <text 
                x={paddingLeft - 10} 
                y={y + 4} 
                textAnchor="end" 
                fill="var(--text-secondary)" 
                style={{ fontSize: '10px', fontWeight: '700' }}
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Y Axis Line */}
        <line 
          x1={paddingLeft} 
          y1={paddingTop} 
          x2={paddingLeft} 
          y2={yBottom} 
          stroke="var(--border-color)" 
          strokeWidth="1.5" 
        />

        {/* X Axis Line */}
        <line 
          x1={paddingLeft} 
          y1={yBottom} 
          x2={width - paddingRight} 
          y2={yBottom} 
          stroke="var(--border-color)" 
          strokeWidth="1.5" 
        />

        {/* Area Fill */}
        {pts.length > 1 && (
          <path
            d={`${bezierPath} L ${xEnd} ${yBottom} L ${xStart} ${yBottom} Z`}
            fill="url(#chartAreaGrad)"
          />
        )}

        {/* Main Line Stroke */}
        <path
          d={bezierPath}
          fill="none"
          stroke="var(--accent-color)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data Point Dots & Pulsing Highlights */}
        {pts.map((pt, i) => (
          <g key={i}>
            <circle 
              cx={pt.x} 
              cy={pt.y} 
              r="6" 
              fill="var(--accent-color)" 
              opacity="0.18" 
            />
            <circle 
              cx={pt.x} 
              cy={pt.y} 
              r="3.5" 
              fill="var(--accent-color)" 
              stroke="var(--bg-card)" 
              strokeWidth="2" 
            />
          </g>
        ))}

        {/* X-Axis Labels */}
        {data.map((d, i) => {
          const x = paddingLeft + (data.length > 1 ? (i / (data.length - 1)) * chartWidth : chartWidth / 2);
          return (
            <text 
              key={i}
              x={x} 
              y={height - 12} 
              textAnchor="middle" 
              fill="var(--text-secondary)" 
              style={{ fontSize: '10px', fontWeight: '700' }}
            >
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

// Pure SVG Bar Chart Component (Zero External Dependencies)
const SVGBarChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
  const maxVal = 10;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '150px', gap: '12px', paddingBottom: '24px', position: 'relative', marginTop: '10px' }}>
      {data.map((d, i) => {
        const heightPercent = (d.value / maxVal) * 100;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>{d.value}</span>
            <div style={{ width: '100%', maxWidth: '36px', height: `${heightPercent}%`, background: d.color, borderRadius: '6px 6px 0 0', transition: 'height 0.4s ease' }}></div>
            <span style={{ position: 'absolute', bottom: '-22px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
};

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
  avgScore?: number;
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
  const [departmentsList, setDepartmentsList] = useState<{ id: string; name: string; code: string }[]>([]);

  const [activeMainView, setActiveMainView] = useState<'dashboard' | 'profile' | 'my-courses'>('dashboard');
  const [celebratedBadge, setCelebratedBadge] = useState<Badge | null>(null);
  const [showBadgeOverlay, setShowBadgeOverlay] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'profile') {
      setActiveMainView('profile');
    } else if (tab === 'my-courses') {
      setActiveMainView('my-courses');
    } else {
      setActiveMainView('dashboard');
    }
  }, [location.search]);

  // Helper for Manager mappings
  const getManagerForDept = (deptName: string): string => {
    const managers: { [key: string]: string } = {
      'AI': 'Dr. Evelyn C.',
      'FICO': 'Warren B.',
      'ABAP': 'Linus Torvalds',
      'HR': 'John Watson',
    };
    return managers[deptName] || 'John Watson';
  };

  // State for Course Modules Modal Detail View
  const [selectedCourseForModules, setSelectedCourseForModules] = useState<ProgressItem | null>(null);

  // Manager Dashboard Navigation & Workspace States
  const [managerSubView, setManagerSubView] = useState<'my_courses' | 'create_course' | 'audit_reporting'>('audit_reporting');
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
  const [activeCatalogTab, setActiveCatalogTab] = useState<'mandatory' | 'available'>('available');
  const [activeMyCoursesTab, setActiveMyCoursesTab] = useState<'in_progress' | 'completed'>('in_progress');

  // Redesigned Employee Dashboard states
  const [empDashboardData, setEmpDashboardData] = useState<any | null>(null);
  const [empDashboardLoading, setEmpDashboardLoading] = useState(true);
  const [showCatalogOnly, setShowCatalogOnly] = useState(false);

  // React States for Employee View
  const [myProgress, setMyProgress] = useState<ProgressItem[]>([
    { id: '1', courseCode: 'AI-101', title: 'Artificial Intelligence Foundations', progressPercent: 60, difficulty: 'Beginner' },
    { id: '2', courseCode: 'SD-102', title: 'Sales and Distribution Lifecycle', progressPercent: 20, difficulty: 'Beginner' }
  ]);

  // React States for Manager View
  const [roster, setRoster] = useState<RosterEmployee[]>([]);



  // React States for Admin Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [profileExamScores, setProfileExamScores] = useState<any[]>([]);

  // Live Analytics Dashboard States
  const [summaryData, setSummaryData] = useState<any>({
    total_departments: 0,
    total_users: 0,
    total_published_courses: 0,
    total_courses: 0,
    health_status: 'Healthy',
    cluster_nodes: '3 Clusters'
  });
  const [completionRateData, setCompletionRateData] = useState<any[]>([]);
  const [enrollmentTrendData, setEnrollmentTrendData] = useState<any[]>([]);
  const [deptPerformanceData, setDeptPerformanceData] = useState<any[]>([]);
  const [activeInactiveData, setActiveInactiveData] = useState<any[]>([]);
  const [topCoursesData, setTopCoursesData] = useState<any[]>([]);
  const [passFailRatioData, setPassFailRatioData] = useState<any[]>([]);
  const [pendingApprovalsData, setPendingApprovalsData] = useState<any>({
    pending_courses_count: 0,
    pending_exam_reviews_count: 0,
    total_pending: 0
  });
  const [topPerformersData, setTopPerformersData] = useState<any[]>([]);
  const [difficultyData, setDifficultyData] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(false);
  const [analyticsError, setAnalyticsError] = useState<boolean>(false);

  const fetchDashboardAnalytics = async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(false);
    try {
      const [
        sumRes, compRes, trendRes, deptRes, actRes, topCRes, pfRes, pendRes, topPRes, diffRes
      ] = await Promise.all([
        apiCall('/api/dashboard/summary'),
        apiCall('/api/dashboard/completion-rate'),
        apiCall('/api/dashboard/enrollment-trend'),
        apiCall('/api/dashboard/department-performance'),
        apiCall('/api/dashboard/active-inactive-learners'),
        apiCall('/api/dashboard/top-courses'),
        apiCall('/api/dashboard/exam-pass-fail'),
        apiCall('/api/dashboard/pending-approvals'),
        apiCall('/api/dashboard/top-performers'),
        apiCall('/api/dashboard/difficulty-distribution')
      ]);

      if (sumRes.ok) setSummaryData(await sumRes.json());
      if (compRes.ok) setCompletionRateData(await compRes.json());
      if (trendRes.ok) setEnrollmentTrendData(await trendRes.json());
      if (deptRes.ok) setDeptPerformanceData(await deptRes.json());
      if (actRes.ok) setActiveInactiveData(await actRes.json());
      if (topCRes.ok) setTopCoursesData(await topCRes.json());
      if (pfRes.ok) setPassFailRatioData(await pfRes.json());
      if (pendRes.ok) setPendingApprovalsData(await pendRes.json());
      if (topPRes.ok) setTopPerformersData(await topPRes.json());
      if (diffRes.ok) setDifficultyData(await diffRes.json());
    } catch (err) {
      console.error('Error fetching dashboard analytics:', err);
      setAnalyticsError(true);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchDBCourses = async () => {
    try {
      const response = await apiCall('/api/courses');
      if (response.ok) {
        const data = await response.json();
        const dbCourses = data.courses || [];
        const mapped = dbCourses.map((c: any) => ({
          id: c.id,
          course_code: c.course_code,
          title: c.title,
          description: c.description || '',
          difficulty_level: c.difficulty_level || 'Beginner',
          is_published: c.is_published,
          status: c.status
        }));
        setManagedCourses(mapped);
      }

      const enrollRes = await apiCall('/api/enrollments/my-courses');
      if (enrollRes.ok) {
        const enrollData = await enrollRes.json();
        const mappedProgress = enrollData.map((e: any) => {
          return {
            id: e.id,
            courseId: e.course_id,
            courseCode: e.course_code || 'AI-101',
            title: e.course_title || 'Enrolled Course',
            progressPercent: e.progress_percent !== undefined ? e.progress_percent : (e.status === 'completed' ? 100 : 0),
            difficulty: 'Beginner' as const
          };
        });
        if (mappedProgress.length > 0) {
          setMyProgress(mappedProgress);
        }
      }
    } catch (err) {
      console.error('Failed to load courses from DB in dashboard:', err);
    }
  };

  const fetchDBAuditLogs = async () => {
    try {
      const response = await apiCall('/api/admin/audit-logs');
      if (response.ok) {
        const data = await response.json();
        const mapped = data.map((log: any) => {
          const date = new Date(log.timestamp);
          const formattedTime = date.toISOString().replace('T', ' ').substring(0, 19);
          return {
            id: log.id,
            timestamp: formattedTime,
            actor: log.actor,
            action: log.action,
            target: log.target,
            details: log.details || ''
          };
        });
        setAuditLogs(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  };

  const fetchDBRoster = async () => {
    try {
      const response = await apiCall('/api/enrollments/roster');
      if (response.ok) {
        const data = await response.json();
        setRoster(data);
      }
    } catch (err) {
      console.error('Failed to fetch roster:', err);
    }
  };

  const fetchEmpDashboard = async () => {
    try {
      setEmpDashboardLoading(true);
      const res = await apiCall('/api/employee/dashboard');
      if (res.ok) {
        const data = await res.json();
        setEmpDashboardData(data);
      } else if (res.status === 404) {
        localStorage.clear();
        navigate('/login');
      }
    } catch (e) {
      console.error('Failed to load employee dashboard:', e);
    } finally {
      setEmpDashboardLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'enrollment':
        return <BookOpen size={14} />;
      case 'completion':
        return <CheckCircle size={14} />;
      case 'exam_graded':
        return <Award size={14} />;
      case 'earn_badge':
        return <Trophy size={14} />;
      default:
        return <Bell size={14} />;
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const ms = now.getTime() - past.getTime();
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) return `${days}d ago`;
      if (hours > 0) return `${hours}h ago`;
      if (minutes > 0) return `${minutes}m ago`;
      return 'Just now';
    } catch {
      return 'Recently';
    }
  };

  const renderProgressRing = (percent: number, completed: number, total: number) => {
    const radius = 50;
    const stroke = 8;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 0' }}>
        <div style={{ position: 'relative', width: '130px', height: '130px' }}>
          <svg height="130" width="130" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
            <circle
              stroke="var(--border-color)"
              fill="transparent"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx="65"
              cy="65"
            />
            <circle
              stroke="var(--accent-color)"
              fill="transparent"
              strokeWidth={stroke}
              strokeDasharray={circumference + ' ' + circumference}
              style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-in-out' }}
              strokeLinecap="round"
              r={normalizedRadius}
              cx="65"
              cy="65"
            />
          </svg>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-primary)' }}>{percent}%</span>
          </div>
        </div>
        <p style={{ marginTop: '16px', fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)', textAlign: 'center' }}>
          {completed} of {total} Courses Completed
        </p>
      </div>
    );
  };

  const renderRankCircle = (rankPos: number | null, badgeTier: string | null, deptName: string = 'General') => {
    const isFirst = rankPos === 1;
    const isTopThree = rankPos && rankPos <= 3;
    const rankColor = isFirst ? '#fbbf24' : isTopThree ? '#cbd5e1' : 'var(--accent-color)';
    const glowColor = isFirst ? 'rgba(251, 191, 36, 0.15)' : isTopThree ? 'rgba(203, 213, 225, 0.1)' : 'rgba(20, 168, 0, 0.08)';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', width: '100%' }}>
        {/* Glowing circular container */}
        <div style={{
          position: 'relative',
          width: '140px',
          height: '140px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          boxShadow: `0 0 25px ${glowColor}`,
          background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 75%)',
          transition: 'all 0.3s ease'
        }}>
          {/* SVG Medal Ring */}
          <svg height="140" width="140" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
            <defs>
              <linearGradient id="rankGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <linearGradient id="rankSilver" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f1f5f9" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>
            </defs>
            {/* Background ring */}
            <circle
              stroke="var(--border-color)"
              fill="transparent"
              strokeWidth="4"
              r="52"
              cx="70"
              cy="70"
            />
            {/* Active standing dial */}
            <circle
              stroke={isFirst ? "url(#rankGold)" : isTopThree ? "url(#rankSilver)" : "var(--accent-color)"}
              fill="transparent"
              strokeWidth="6"
              strokeDasharray="326.7"
              strokeDashoffset={rankPos ? "80" : "326.7"}
              strokeLinecap="round"
              r="52"
              cx="70"
              cy="70"
              style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.15))' }}
            />
          </svg>

          {/* Central Rank Placement Badge */}
          <div style={{
            position: 'absolute',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {rankPos ? (
              <>
                <span style={{
                  fontSize: '2.8rem',
                  fontWeight: '900',
                  color: isFirst ? '#fbbf24' : isTopThree ? '#cbd5e1' : 'var(--text-primary)',
                  lineHeight: '1',
                  fontFamily: '"Outfit", sans-serif',
                  textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  letterSpacing: '-2px'
                }}>
                  #{rankPos}
                </span>
                {isFirst && (
                  <div style={{ display: 'flex', gap: '2px', marginTop: '2px', color: '#fbbf24', fontSize: '0.7rem' }}>
                    ★ ★ ★
                  </div>
                )}
              </>
            ) : (
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Unranked
              </span>
            )}
          </div>

          {/* Floating Gold/Silver Crest Crown Icon at the top center */}
          <div style={{
            position: 'absolute',
            top: '-10px',
            background: isFirst ? 'linear-gradient(135deg, #fbbf24, #d97706)' : 'linear-gradient(135deg, #cbd5e1, #94a3b8)',
            border: '1.5px solid var(--bg-card)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25)',
            zIndex: 2
          }}>
            <Trophy size={16} color="#fff" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.2))' }} />
          </div>
        </div>

        {/* Styled department standing description */}
        <div style={{ marginTop: '20px', textAlign: 'center', width: '100%' }}>
          <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {deptName} Standing
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '8px',
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            padding: '4px 12px',
            borderRadius: '20px',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
          }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '800', color: isFirst ? '#fbbf24' : 'var(--text-primary)' }}>
              {badgeTier || 'No Badges Earned'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderSkeleton = (height: string = '120px') => (
    <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', padding: '10px 0' }}>
      <div style={{ height: '24px', background: 'var(--border-color)', borderRadius: '4px', width: '60%' }}></div>
      <div style={{ height, background: 'var(--border-color)', borderRadius: '8px', width: '100%' }}></div>
    </div>
  );

  useEffect(() => {
    const savedEmail = localStorage.getItem('isLoggedInEmail');
    const savedRole = localStorage.getItem('isLoggedInRole');
    const savedDept = localStorage.getItem('isLoggedInDept');
    const accessToken = localStorage.getItem('access_token');

    if (!savedEmail || !accessToken) {
      navigate('/login');
    } else {
      setEmail(savedEmail);
      const activeRole = savedRole || 'Employee';
      if (savedRole) setRole(savedRole);
      if (savedDept) setDept(savedDept);

      if (activeRole === 'Admin' || activeRole === 'HR Admin' || activeRole === 'HR Manager') {
        fetchDBAuditLogs();
        fetchDashboardAnalytics();
      }

      if (activeRole === 'Manager') {
        fetchDBRoster();
        fetchDashboardAnalytics();
      }

      if (activeRole === 'Employee') {
        fetchEmpDashboard();
      }

      fetchDashboardAnalytics();

      const fetchDepts = async () => {
        try {
          const response = await apiCall('/api/departments');
          if (response.ok) {
            const data = await response.json();
            setDepartmentsList(data);
          }
        } catch (err) {
          console.error('Failed to fetch departments in dashboard:', err);
        }
      };
      fetchDepts();

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

      // Fetch profile from backend to overwrite stubs with real database values
      const fetchProfile = async () => {
        try {
          const profileRes = await apiCall('/api/auth/profile');
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            const fullName = `${profileData.first_name} ${profileData.last_name}`;
            setProfileName(fullName);
            setProfileEmpId(profileData.employee_code);
            localStorage.setItem('profileName', fullName);
            localStorage.setItem('profileEmpId', profileData.employee_code);

            const detailRes = await apiCall(`/api/reporting/employees/${profileData.id}/detail`);
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              setProfileExamScores(detailData.exams || []);
            }
          } else if (profileRes.status === 404) {
            localStorage.clear();
            navigate('/login');
          }
        } catch (err) {
          console.error('Failed to fetch profile in dashboard:', err);
        }
      };
      fetchProfile();
      
      fetchDBCourses();
    }
  }, [navigate]);

  // Handler: Standard Employee Study Action
  const handleStudyIncrement = async (itemId: string) => {
    let justCompleted = false;
    
    // Check if the itemId is a valid UUID before sending to backend
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId);
    
    if (!isUuid) {
      // Fallback for local mock data items
      setMyProgress(prev => {
        const updatedProgress = prev.map(item => {
          if (item.id === itemId) {
            const updated = Math.min(item.progressPercent + 20, 100);
            if (item.progressPercent < 100 && updated === 100) {
              justCompleted = true;
            }
            return { ...item, progressPercent: updated };
          }
          return item;
        });
        
        if (justCompleted) {
          const newCompletedCount = updatedProgress.filter(p => p.progressPercent === 100).length;
          const newBadge = getBadgeForCompletions(newCompletedCount);
          if (newBadge) {
            setCelebratedBadge(newBadge);
            setShowBadgeOverlay(true);
          }
        }
        return updatedProgress;
      });
      return;
    }

    // Backend sync path
    const item = myProgress.find(p => p.id === itemId);
    if (!item) return;

    const newPercent = Math.min(item.progressPercent + 20, 100);

    try {
      const response = await apiCall(`/api/enrollments/${itemId}/progress-percent?percent=${newPercent}`, {
        method: 'PUT'
      });

      if (response.ok) {
        setMyProgress(prev => {
          const updatedProgress = prev.map(p => {
            if (p.id === itemId) {
              if (p.progressPercent < 100 && newPercent === 100) {
                justCompleted = true;
              }
              return { ...p, progressPercent: newPercent };
            }
            return p;
          });

          if (justCompleted) {
            const newCompletedCount = updatedProgress.filter(p => p.progressPercent === 100).length;
            const newBadge = getBadgeForCompletions(newCompletedCount);
            if (newBadge) {
              setCelebratedBadge(newBadge);
              setShowBadgeOverlay(true);
            }
          }

          return updatedProgress;
        });
      } else {
        const err = await response.json();
        alert(err.detail || 'Failed to update progress on server.');
      }
    } catch (err) {
      console.error('Failed to sync progress with backend:', err);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      alert('Profile Name cannot be empty.');
      return;
    }
    if (!profileEmpId.trim()) {
      alert('Employee ID cannot be empty.');
      return;
    }

    const nameParts = profileName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    try {
      const response = await apiCall('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          employee_code: profileEmpId.trim()
        })
      });

      if (response.ok) {
        localStorage.setItem('profileName', profileName.trim());
        localStorage.setItem('profileEmpId', profileEmpId.trim());
        setIsEditingProfile(false);
        alert('Profile details successfully synchronized with backend!');
      } else {
        const err = await response.json();
        alert(err.detail || 'Failed to update profile details on server.');
      }
    } catch (err) {
      console.error('Failed to sync profile changes:', err);
      // Fallback
      localStorage.setItem('profileName', profileName.trim());
      localStorage.setItem('profileEmpId', profileEmpId.trim());
      setIsEditingProfile(false);
      alert('Profile saved locally (offline mode).');
    }
  };

  const handleEnrollCourse = async (courseId: string) => {
    try {
      const response = await apiCall('/api/enrollments', {
        method: 'POST',
        body: JSON.stringify({
          course_id: courseId
        })
      });

      if (response.ok) {
        const enrollData = await response.json();
        await fetchDBCourses();
        if (role === 'Employee') {
          await fetchEmpDashboard();
        }
        navigate(`/course-player/${enrollData.id}`);
      } else {
        const err = await response.json();
        alert(err.detail || 'Enrollment failed.');
      }
    } catch (err) {
      console.error('Failed to enroll in course:', err);
    }
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
                      {role === 'Manager' ? 'Department Head' : role} Workspace
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
                      <span style={{ color: 'var(--text-secondary)' }}>Department Head</span>
                      <span style={{ fontWeight: '600', color: 'var(--accent-color)' }}>{getManagerForDept(dept)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Completed Courses</span>
                    <span style={{ fontWeight: '600', color: 'var(--neon-teal)' }}>
                      {role === 'Employee' ? myProgress.filter(p => p.progressPercent === 100).length : 'All'} Courses
                    </span>
                  </div>
                  {role === 'Employee' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginTop: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Kaizen Achievement Badge</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {(() => {
                          const badge = getBadgeForCompletions(myProgress.filter(p => p.progressPercent === 100).length);
                          if (!badge) return <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>No badges earned yet. Complete a course to earn one!</span>;
                          return (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              background: badge.color,
                              color: '#fff',
                              width: '100%',
                              boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                              animation: 'pulseGlow 3s infinite'
                            }}>
                              <span style={{ fontSize: '1.5rem' }}>{badge.icon}</span>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>{badge.name}</span>
                                <span style={{ fontSize: '0.68rem', opacity: 0.9 }}>Level {badge.step} of 10</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
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
                        handleSaveProfile();
                      } else {
                        setIsEditingProfile(true);
                      }
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
                      {profileExamScores && profileExamScores.length > 0 ? (
                        profileExamScores.map((ex: any, idx: number) => (
                          <tr key={ex.submission_id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '12px 6px' }}><code>{ex.exam_title ? ex.exam_title.split(' ')[0] : 'EXAM'}</code></td>
                            <td style={{ padding: '12px 6px' }}>{ex.exam_title}</td>
                            <td style={{ padding: '12px 6px' }}>8.0 / 10.0</td>
                            <td style={{ padding: '12px 6px', textAlign: 'right', fontWeight: '700', color: ex.overall_score >= 8.0 ? 'var(--neon-teal)' : 'var(--text-secondary)' }}>
                              {ex.overall_score !== null ? `${ex.overall_score} / 10.0` : `Pending (${ex.status})`}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            {role === 'Admin' ? 'No assessment marks required for Administrator workspace.' : 'No exam submissions recorded yet.'}
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
      {(activeMainView === 'dashboard' || activeMainView === 'my-courses') && (
        <section className="dashboard-hero-banner glass-panel">
        <div className="hero-banner-profile">
          <div className="avatar-circle">
            <User size={32} />
          </div>
          <div className="profile-details">
            <h2>Welcome Back, {profileName || email?.split('@')[0]}</h2>
            <div className="profile-badge-row">
              <span className="badge role">
                {role === 'Admin' || role === 'SYSTEM_ADMIN' 
                  ? 'System Admin Workspace' 
                  : role === 'HR' || role === 'HR_ADMIN' 
                  ? 'HR Workspace' 
                  : role === 'Manager' || role === 'COURSE_MANAGER' 
                  ? 'Department Head Workspace' 
                  : 'Employee Workspace'}
              </span>
              {(role !== 'Admin' && role !== 'SYSTEM_ADMIN') && dept && (
                <span className="badge dept">{dept} Department</span>
              )}
            </div>
          </div>
        </div>

        <div className="hero-banner-meta">
          {role === 'Employee' ? (
            <div className="banner-meta-box">
              <Bookmark size={18} className="meta-icon icon-blue" />
              <div>
                <p className="meta-label">Total Courses</p>
                <p className="meta-val">{myProgress.length} Enrolled</p>
              </div>
            </div>
          ) : role === 'Manager' ? (
            <>
              <div className="banner-meta-box">
                <Bookmark size={18} className="meta-icon icon-blue" />
                <div>
                  <p className="meta-label">Department Courses</p>
                  <p className="meta-val">{managedCourses.length} Courses</p>
                </div>
              </div>
              <div className="banner-meta-box">
                <Layers size={18} className="meta-icon icon-green" />
                <div>
                  <p className="meta-label">Active Personnel</p>
                  <p className="meta-val">{summaryData.total_users || 0} Learners</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="banner-meta-box">
                <Bookmark size={18} className="meta-icon icon-blue" />
                <div>
                  <p className="meta-label">Total Departments</p>
                  <p className="meta-val">{summaryData.total_departments || departmentsList.length || 4} Registered</p>
                </div>
              </div>
              <div className="banner-meta-box">
                <Layers size={18} className="meta-icon icon-green" />
                <div>
                  <p className="meta-label">Active Personnel</p>
                  <p className="meta-val">{summaryData.total_users || 0} Personnel</p>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
      )}

      {/* Conditional Dashboard Views */}
      
      {/* 1. EMPLOYEE (LEARNER) MAIN CATALOG / REDESIGNED DASHBOARD VIEW */}
      {activeMainView === 'dashboard' && role === 'Employee' && (
        showCatalogOnly ? (
          <div className="dashboard-layout-employee animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Course Catalog Browser</h3>
              <Button variant="outline" onClick={() => setShowCatalogOnly(false)}>← Back to Dashboard</Button>
            </div>
            {/* Original Catalog Tabs */}
            <div className="employee-learning-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
              <div className="employee-courses-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                <div className="catalog-tabs-container" style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveCatalogTab('mandatory')}
                    style={{
                      border: 'none',
                      background: 'none',
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: activeCatalogTab === 'mandatory' ? 'var(--accent-color)' : 'var(--text-secondary)',
                      borderBottom: activeCatalogTab === 'mandatory' ? '2px solid var(--accent-color)' : 'none',
                      paddingBottom: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    Mandatory
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCatalogTab('available')}
                    style={{
                      border: 'none',
                      background: 'none',
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: activeCatalogTab === 'available' ? 'var(--accent-color)' : 'var(--text-secondary)',
                      borderBottom: activeCatalogTab === 'available' ? '2px solid var(--accent-color)' : 'none',
                      paddingBottom: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    Available
                  </button>
                </div>
                {/* Courses Grid */}
                {(() => {
                  const filtered = managedCourses.filter((c: any) => {
                    const isPublished = c.status === 'published' || c.status === 'approved' || c.is_published;
                    if (!isPublished) return false;
                    return activeCatalogTab === 'mandatory' ? c.is_mandatory : !c.is_mandatory;
                  });
                  if (filtered.length === 0) {
                    return (
                      <div className="empty-state-container glass-panel" style={{ padding: '48px', textAlign: 'center', borderRadius: 'var(--border-radius-md)', width: '100%' }}>
                        <BookOpen size={48} style={{ opacity: 0.2, marginBottom: '12px', color: 'var(--accent-color)', margin: '0 auto 12px' }} />
                        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No courses match your active filters.</p>
                      </div>
                    );
                  }
                  return (
                    <div className="employee-courses-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', width: '100%' }}>
                      {filtered.map((course) => {
                        const enrollmentItem = myProgress.find((p: any) => p.courseId === course.id);
                        const isEnrolled = !!enrollmentItem;
                        return (
                          <div 
                            key={course.id} 
                            className="course-lobby-card glass-panel glow-hover" 
                            style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              borderRadius: 'var(--border-radius-lg)', 
                              overflow: 'hidden', 
                              background: 'var(--bg-card)', 
                              border: '1px solid var(--border-color)',
                              transition: 'all 0.3s ease',
                              padding: '20px',
                              justifyContent: 'space-between',
                              minHeight: '180px'
                            }}
                          >
                            <div>
                              <span 
                                className="course-code-tag" 
                                style={{ 
                                  padding: '2px 8px', 
                                  borderRadius: '12px', 
                                  background: 'var(--accent-glow)', 
                                  color: 'var(--accent-color)', 
                                  fontSize: '0.7rem', 
                                  fontWeight: '800',
                                  textTransform: 'uppercase'
                                }}
                              >
                                {course.course_code}
                              </span>
                              <h4 style={{ marginTop: '8px', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: '1.3' }}>
                                {course.title}
                              </h4>
                            </div>
                            <div style={{ marginTop: '16px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                <span>Duration:</span>
                                <strong>{course.duration || '10 hours'}</strong>
                              </div>
                              <Button
                                variant={isEnrolled ? "outline" : "primary"}
                                disabled={isEnrolled}
                                onClick={() => {
                                  if (!isEnrolled) {
                                    handleEnrollCourse(course.id);
                                  }
                                }}
                                style={{ width: '100%', height: '40px', fontWeight: '700' }}
                              >
                                {isEnrolled ? 'Already Enrolled' : 'Start Course'}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        ) : (
          /* Redesigned Premium Dashboard widgets view! */
          <div className="employee-dashboard-container animate-fade-in" style={{ paddingBottom: '40px' }}>
            <style>{`
              .employee-dashboard-grid-root {
                display: grid;
                grid-template-columns: repeat(12, 1fr);
                gap: 24px;
                width: 100%;
                align-items: stretch;
              }
              .widget-card {
                border-radius: var(--border-radius-lg);
                padding: 20px;
                background: var(--bg-card);
                border: 1px solid #14a800;
                box-shadow: var(--shadow-sm);
                display: flex;
                flex-direction: column;
                height: 100%;
                box-sizing: border-box;
              }
              .widget-card h4 {
                margin: 0 0 14px 0;
                font-size: 1.05rem;
                font-weight: 800;
                display: flex;
                align-items: center;
                gap: 8px;
                color: var(--text-primary);
                border-bottom: 1px solid var(--border-color);
                padding-bottom: 10px;
              }
              .widget-upcoming-exams {
                grid-column: span 8;
              }
              .widget-available {
                grid-column: span 8;
              }
              .widget-progress-ring {
                grid-column: span 4;
              }
              .widget-my-rank {
                grid-column: span 4;
              }
              .widget-exam-trend {
                grid-column: span 8;
              }
              .widget-enrollment-breakdown {
                grid-column: span 4;
              }
              @media (max-width: 992px) {
                .widget-upcoming-exams, .widget-available, .widget-exam-trend {
                  grid-column: span 7;
                }
                .widget-progress-ring, .widget-my-rank, .widget-enrollment-breakdown {
                  grid-column: span 5;
                }
              }
              @media (max-width: 768px) {
                .employee-dashboard-grid-root {
                  display: flex;
                  flex-direction: column;
                  gap: 20px;
                }
                .widget-progress-ring {
                  order: 1;
                }
                .widget-upcoming-exams {
                  order: 2;
                }
                .widget-my-rank {
                  order: 3;
                }
                .widget-available {
                  order: 4;
                }
                .widget-exam-trend {
                  order: 5;
                }
                .widget-enrollment-breakdown {
                  order: 6;
                }
              }
            `}</style>

            {empDashboardLoading ? (
              <div className="employee-dashboard-grid-root">
                <div className="widget-card widget-progress-ring">{renderSkeleton('140px')}</div>
                <div className="widget-card widget-upcoming-exams">{renderSkeleton('80px')}</div>
                <div className="widget-card widget-my-rank">{renderSkeleton('140px')}</div>
                <div className="widget-card widget-available">{renderSkeleton('180px')}</div>
                <div className="widget-card widget-exam-trend">{renderSkeleton('140px')}</div>
                <div className="widget-card widget-enrollment-breakdown">{renderSkeleton('140px')}</div>
              </div>
            ) : !empDashboardData ? (
              <div className="empty-state-container glass-panel" style={{ padding: '48px', textAlign: 'center', border: '1px solid #14a800' }}>
                <p>Failed to load dashboard data. Please try again.</p>
                <Button onClick={fetchEmpDashboard} style={{ marginTop: '12px' }}>Retry</Button>
              </div>
            ) : (
              <div className="employee-dashboard-grid-root" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
                
                {/* 1. MY AVERAGE SCORE & RANK HERO CARD */}
                <div className="widget-card widget-my-score" style={{ gridColumn: '1 / -1', background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                    <div style={{ width: '54px', height: '54px', borderRadius: '14px', background: 'var(--accent-glow)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Award size={28} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>My Average Exam Score</span>
                      <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '2px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span>
                          {empDashboardData.exam_score_trend && empDashboardData.exam_score_trend.length > 0 && empDashboardData.exam_score_trend[0].label !== 'Baseline'
                            ? (empDashboardData.exam_score_trend.reduce((acc: number, curr: any) => acc + (curr.value || 0), 0) / empDashboardData.exam_score_trend.length).toFixed(1)
                            : 'N/A'}
                        </span>
                        <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>/ 10 Avg</span>
                      </div>
                    </div>
                  </div>

                  {/* My Rank Badge */}
                  <div 
                    onClick={() => navigate('/leaderboard')} 
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg-main)', padding: '12px 20px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}
                  >
                    <Trophy size={24} style={{ color: '#d97706' }} />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Department Rank</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        Rank #{empDashboardData.my_rank?.position || 1} ({empDashboardData.my_rank?.department || dept})
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. UPCOMING EXAMS */}
                <div className="widget-card widget-upcoming-exams" style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px' }}>
                    <Clock size={18} style={{ color: 'var(--accent-color)' }} />
                    Upcoming Exams
                  </h4>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    {empDashboardData.upcoming_exams.length === 0 ? (
                      <div className="empty-state-container" style={{ padding: '24px 0', textAlign: 'center' }}>
                        <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>No upcoming exams to attempt! 🎉</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {empDashboardData.upcoming_exams.map((exam: any) => (
                          <div key={exam.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)', padding: '12px 14px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}>
                            <div style={{ minWidth: 0, flex: 1, marginRight: '16px' }}>
                              <span className="course-code-tag" style={{ padding: '2px 6px', borderRadius: '4px', background: 'var(--accent-glow)', color: 'var(--accent-color)', fontSize: '0.65rem', fontWeight: '800' }}>
                                {exam.course_code || 'EXAM'}
                              </span>
                              <h5 style={{ margin: '4px 0 0 0', fontSize: '0.9rem', fontWeight: '700', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{exam.exam_title}</h5>
                              <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                                Duration: {exam.duration_minutes} mins
                              </p>
                            </div>
                            <Button 
                              variant="primary" 
                              size="sm" 
                              onClick={() => navigate('/exams')}
                              style={{ height: '32px', fontWeight: '700', padding: '0 14px', fontSize: '0.8rem' }}
                            >
                              Attempt
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/exams')} 
                    style={{ marginTop: '16px', width: '100%', height: '36px', fontSize: '0.82rem', fontWeight: '700' }}
                  >
                    View All Exams
                  </Button>
                </div>

                {/* 3. LEARNING PROGRESS */}
                <div className="widget-card widget-progress-ring" style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px' }}>
                    <Target size={18} style={{ color: 'var(--accent-color)' }} />
                    Learning Progress
                  </h4>
                  {renderProgressRing(
                    empDashboardData.overall_progress.percent,
                    empDashboardData.overall_progress.completed,
                    empDashboardData.overall_progress.total
                  )}
                  {empDashboardData.next_badge_milestone.tier_name ? (
                    <div style={{ marginTop: '16px', background: 'var(--accent-glow)', padding: '10px 14px', borderRadius: 'var(--border-radius-md)', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                        🎯 Next Milestone: <strong>{empDashboardData.next_badge_milestone.tier_name}</strong> ({empDashboardData.next_badge_milestone.courses_remaining} course remaining)
                      </span>
                    </div>
                  ) : (
                    <div style={{ marginTop: '16px', background: 'var(--accent-glow)', padding: '10px 14px', borderRadius: 'var(--border-radius-md)', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                        👑 Ultimate badge tier unlocked!
                      </span>
                    </div>
                  )}
                </div>

                {/* 4. MY EXAM SCORE TREND */}
                <div className="widget-card widget-exam-trend" style={{ gridColumn: '1 / -1', background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px' }}>
                    <Target size={18} style={{ color: 'var(--accent-color)' }} />
                    My Exam Score Trend
                  </h4>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '180px' }}>
                    {empDashboardData.exam_score_trend && empDashboardData.exam_score_trend.length > 0 && empDashboardData.exam_score_trend[0].label !== 'Baseline' ? (
                      <SVGLineChart data={empDashboardData.exam_score_trend} />
                    ) : (
                      <div className="empty-state-container" style={{ padding: '32px 0', textAlign: 'center' }}>
                        <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>No graded exam score history available yet. Complete assigned exams to view your score trend line!</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        )
      )}

      {/* 1B. EMPLOYEE (LEARNER) MY ENROLLED COURSES VIEW */}
      {activeMainView === 'my-courses' && role === 'Employee' && (
        <div className="dashboard-layout-employee animate-fade-in">
          <div className="pane-header" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>My Courses</h3>
          </div>

          <div className="employee-learning-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
            <div className="employee-courses-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
              
              {/* Sub-tabs for In Progress & Completed */}
              <div className="catalog-tabs-container" style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <button
                  type="button"
                  onClick={() => setActiveMyCoursesTab('in_progress')}
                  style={{
                    border: 'none',
                    background: 'none',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: activeMyCoursesTab === 'in_progress' ? 'var(--accent-color)' : 'var(--text-secondary)',
                    borderBottom: activeMyCoursesTab === 'in_progress' ? '2px solid var(--accent-color)' : 'none',
                    paddingBottom: '8px',
                    cursor: 'pointer'
                  }}
                >
                  In Progress
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMyCoursesTab('completed')}
                  style={{
                    border: 'none',
                    background: 'none',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: activeMyCoursesTab === 'completed' ? 'var(--accent-color)' : 'var(--text-secondary)',
                    borderBottom: activeMyCoursesTab === 'completed' ? '2px solid var(--accent-color)' : 'none',
                    paddingBottom: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Completed
                </button>
              </div>

              {/* Enrolled Courses */}
              <div className="enrolled-courses-section" style={{ width: '100%' }}>
                {(() => {
                  const shownCourses = myProgress.filter(p => {
                    return activeMyCoursesTab === 'completed' ? p.progressPercent === 100 : p.progressPercent < 100;
                  });

                  if (shownCourses.length === 0) {
                    return (
                      <div className="empty-state-container glass-panel" style={{ padding: '48px', textAlign: 'center', borderRadius: 'var(--border-radius-md)' }}>
                        <Bookmark size={48} style={{ opacity: 0.2, marginBottom: '12px', color: 'var(--accent-color)', margin: '0 auto 12px' }} />
                        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          {activeMyCoursesTab === 'completed' 
                            ? 'No completed courses yet. Work through your module lessons to earn certification!' 
                            : 'No active course enrollments. Enroll in a course from the Dashboard catalog to start!'}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="employee-courses-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', width: '100%' }}>
                      {shownCourses.map((item) => (
                        <div 
                          key={item.id} 
                          className="course-lobby-card glass-panel glow-hover" 
                          style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            borderRadius: 'var(--border-radius-lg)', 
                            overflow: 'hidden', 
                            background: 'var(--bg-card)', 
                            border: '1px solid var(--border-color)',
                            transition: 'all 0.3s ease',
                            padding: '20px',
                            justifyContent: 'space-between',
                            minHeight: '180px'
                          }}
                        >
                          <div>
                            <span 
                              className="course-code-tag" 
                              style={{ 
                                padding: '2px 8px', 
                                borderRadius: '12px', 
                                background: 'var(--accent-glow)', 
                                color: 'var(--accent-color)', 
                                fontSize: '0.7rem', 
                                fontWeight: '800',
                                textTransform: 'uppercase'
                              }}
                            >
                              {item.courseCode}
                            </span>
                            <h4 style={{ marginTop: '8px', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: '1.3' }}>
                              {item.title}
                            </h4>
                          </div>

                          <div style={{ marginTop: '16px' }}>
                            <div className="progress-bar-group" style={{ marginBottom: '12px' }}>
                              <div className="progress-bar-container" style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div className="progress-bar-fill" style={{ width: `${item.progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-color), var(--accent-color-hover))' }}></div>
                              </div>
                              <div className="progress-label-row" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                <span>{item.progressPercent}% Completed</span>
                              </div>
                            </div>

                            <Button
                              variant="primary"
                              onClick={() => navigate(`/course-player/${item.id}`)}
                              style={{ width: '100%', height: '40px', fontWeight: '700' }}
                            >
                              {item.progressPercent === 100 ? 'Review Course' : (item.progressPercent > 0 ? 'Resume Course' : 'Start Course')}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CREATOR (MANAGER) VIEW */}
      {activeMainView === 'dashboard' && role === 'Manager' && (
        <div className="dashboard-layout-manager animate-fade-in">
          {/* Dashboard header */}
          <div className="manager-workspace-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '28px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="pane-header" style={{ marginBottom: 0 }}>
                <h3>{dept} Department Head View</h3>
                <p>Department Head console node for department curriculum tracking</p>
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
                {departmentsList.map((d) => (
                  <option key={d.id} value={d.code}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Manager Department Analytics Grid (5 Core Widgets) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            
            {/* Widget 1: Top Performer in Department Hero Card */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Award size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Top Performer ({dept})</span>
                  <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '2px 0 0 0' }}>
                    {roster && roster.length > 0 ? [...roster].sort((a,b) => (b.avgScore || 0) - (a.avgScore || 0))[0]?.name || 'N/A' : 'No Roster Records'}
                  </h4>
                </div>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <span>Department Score:</span>
                <span style={{ fontWeight: 800, color: '#10b981' }}>
                  {roster && roster.length > 0 ? `${[...roster].sort((a,b) => (b.avgScore || 0) - (a.avgScore || 0))[0]?.avgScore || 0} / 10.0` : '0 / 10.0'}
                </span>
              </div>
            </div>

            {/* Widget 2: Department Average Exam Score */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Department Avg Score</span>
                  <h4 style={{ fontSize: '1.4rem', fontWeight: 900, margin: '2px 0 0 0', color: 'var(--accent-color)' }}>
                    {roster && roster.length > 0 ? (roster.reduce((acc, curr) => acc + (curr.avgScore || 0), 0) / roster.length).toFixed(1) : '8.5'} / 10.0
                  </h4>
                </div>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                Aggregate average across all active employee exam attempts in {dept}.
              </p>
            </div>

            {/* Widget 3: Top Course Enrollment in Department */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Top Department Course</span>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '2px 0 0 0' }}>
                    {managedCourses.length > 0 ? managedCourses[0].title : 'Artificial Intelligence Foundations'}
                  </h4>
                </div>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <span>Active Enrollments:</span>
                <span style={{ fontWeight: 800, color: '#a855f7' }}>{roster.length * 2} Learners</span>
              </div>
            </div>

            {/* Widget 4: Exam Pass / Fail Ratio (Donut Chart) */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>Exam Pass / Fail Ratio ({dept})</h4>
                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>88% Pass Rate</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '140px' }}>
                <svg width="120" height="120" viewBox="0 0 42 42">
                  <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="rgba(239, 68, 68, 0.2)" strokeWidth="5"></circle>
                  <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#10b981" strokeWidth="5" strokeDasharray="88 12" strokeDashoffset="25"></circle>
                  <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="var(--text-primary)" fontSize="7" fontWeight="800">88%</text>
                </svg>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '0.78rem', marginTop: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span> Passed (88%)</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span> Failed (12%)</span>
              </div>
            </div>

            {/* Widget 5: Department Enrollment Trend (Graphical SVG Line Chart) */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Department Enrollment Trend ({dept})</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Graphical timeline of course enrollments over recent months</span>
                </div>
              </div>
              <SVGLineChart data={enrollmentTrendData && enrollmentTrendData.length > 0 ? enrollmentTrendData : [
                { label: 'Jan', value: 12 },
                { label: 'Feb', value: 18 },
                { label: 'Mar', value: 25 },
                { label: 'Apr', value: 32 },
                { label: 'May', value: 40 },
                { label: 'Jun', value: 48 }
              ]} />
            </div>

          </div>

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
                        .filter(c => activeManagerFilterDept === 'All' || c.course_code.includes(activeManagerFilterDept))
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
                          <span style={{ color: 'var(--text-secondary)' }}>Department Head:</span>
                          <span style={{ fontWeight: '600' }}>
                            {activeManagerFilterDept === 'All' || activeManagerFilterDept === dept ? profileName : getManagerForDept(activeManagerFilterDept)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Matching Courses:</span>
                          <span style={{ fontWeight: '600' }}>
                            {managedCourses.filter(c => c.course_code.includes(activeManagerFilterDept)).length} Published
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Roster Node Count:</span>
                          <span style={{ fontWeight: '600' }}>{roster.length} {roster.length === 1 ? 'Member' : 'Members'}</span>
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
              <Modal
                isOpen={!!selectedAuditEmp}
                onClose={() => setSelectedAuditEmp(null)}
                title={selectedAuditEmp ? selectedAuditEmp.name : ''}
                subtitle={selectedAuditEmp ? `${selectedAuditEmp.code} | ${selectedAuditEmp.email}` : ''}
                icon={selectedAuditEmp ? (
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-color), #3b82f6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem' }}>
                    {selectedAuditEmp.name[0]}
                  </div>
                ) : null}
                maxWidth="460px"
                footer={
                  <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                    <Button variant="outline" style={{ height: '36px', padding: '0 16px', fontSize: '0.82rem' }} onClick={() => setSelectedAuditEmp(null)}>
                      Close Marks Registry
                    </Button>
                  </div>
                }
              >
                {selectedAuditEmp && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px 0 16px 0' }}>
                    {/* Show current achievement badge in Audit Drawer */}
                    {(() => {
                      const badgeObj = getBadgeForCompletions(selectedAuditEmp.coursesTaken);
                      if (!badgeObj) return null;
                      return (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: badgeObj.color,
                          color: '#fff',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                        }}>
                          <span style={{ fontSize: '1.4rem' }}>{badgeObj.icon}</span>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.82rem' }}>{badgeObj.name}</span>
                            <span style={{ fontSize: '0.65rem', opacity: 0.9 }}>Level {badgeObj.step} Achiever ({selectedAuditEmp.coursesTaken} Completed Courses)</span>
                          </div>
                        </div>
                      );
                    })()}
                    
                    <div className="scores-table-section" style={{ marginTop: '4px' }}>
                      <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--accent-color)', letterSpacing: '0.03em', marginBottom: '12px', fontWeight: '700' }}>Test Scores & Marks Report</h4>
                      
                      {selectedAuditEmp.testMarks.length === 0 ? (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No assessments submitted yet.</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {selectedAuditEmp.testMarks.map((mark, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                              <div>
                                <span style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: '600' }}>{mark.testName}</span>
                                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Module: <code>{mark.courseCode}</code></span>
                              </div>
                              <strong style={{ fontSize: '0.88rem', color: mark.score >= 80 ? '#10b981' : 'var(--accent-color)' }}>
                                {mark.score} / 100
                              </strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Modal>


            </div>
          )}
        </div>
      )}

      {/* 3. ADMINISTRATOR VIEW (BI & ANALYTICS DASHBOARD) */}
      {activeMainView === 'dashboard' && (role === 'Admin' || role === 'HR Admin' || role === 'HR Manager') && (
        <div className="dashboard-layout-admin animate-fade-in">
          <div className="pane-header" style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Admin Analytics Dashboard</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '4px' }}>Real-time course stats, department performance, and system health.</p>
            </div>
            <Button variant="outline" style={{ fontSize: '0.82rem' }} onClick={fetchDashboardAnalytics}>
              Refresh Analytics 🔄
            </Button>
          </div>

          {analyticsError && (
            <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Failed to load live analytics data from backend.</span>
              <Button variant="primary" style={{ fontSize: '0.78rem' }} onClick={fetchDashboardAnalytics}>Retry</Button>
            </div>
          )}

          {/* Top Level Hero Card: Top Performing Department */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--border-radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Award size={24} />
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Performing Department</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {deptPerformanceData && deptPerformanceData.length > 0
                      ? (() => {
                          const topDept = [...deptPerformanceData].sort((a, b) => (b.value || 0) - (a.value || 0))[0];
                          return `${topDept.label} Department (${topDept.value} / 10 Avg Score)`;
                        })()
                      : 'No department performance recorded yet'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BI Charts Grid Layout - 6 Core Analytics Widgets */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            
            {/* 1. Enrollment Trend Over Time (Line Chart) */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px' }}>Enrollment Trend</h3>
              <SVGLineChart data={enrollmentTrendData.length > 0 ? enrollmentTrendData : [{ label: 'Baseline', value: 0 }]} />
            </div>

            {/* 2. Department-wise Performance Comparison (Bar Chart) */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px' }}>Avg Score per Department</h3>
              <SVGBarChart data={deptPerformanceData.length > 0 ? deptPerformanceData : [{ label: 'General', value: 0, color: '#10b981' }]} />
            </div>

            {/* 3. Top Courses by Enrollment (Ranked Bar List) */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px' }}>Top Course Enrollment</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {topCoursesData && topCoursesData.length > 0 ? (
                  topCoursesData.map((c: any, idx: number) => {
                    const maxCount = topCoursesData[0]?.enrollments_count || 1;
                    const pct = Math.max(10, Math.round((c.enrollments_count / maxCount) * 100));
                    const barColor = idx === 0 ? '#00f2fe' : idx === 1 ? '#8b5cf6' : '#10b981';
                    return (
                      <div key={c.id || idx}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{c.course_code}: {c.title}</strong>
                          <span>{c.enrollments_count} Enrollments</span>
                        </div>
                        <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: barColor }}></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No course enrollment data.</span>
                )}
              </div>
            </div>

            {/* 4. Exam Pass / Fail Ratio (Donut Chart) */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px' }}>Exam Pass / Fail Ratio</h3>
              <SVGDonutChart items={passFailRatioData.length > 0 ? passFailRatioData : [{ label: 'Passed (>= 8.0)', value: 100, color: '#10b981' }]} />
            </div>

          </div>
        </div>
      )}

      {/* Course Modules Modal View */}
      <Modal
        isOpen={!!selectedCourseForModules}
        onClose={() => setSelectedCourseForModules(null)}
        title={selectedCourseForModules?.title || ''}
        subtitle={selectedCourseForModules ? `${selectedCourseForModules.courseCode} Curriculum Modules` : ''}
        maxWidth="560px"
        footer={
          <>
            {selectedCourseForModules && selectedCourseForModules.progressPercent < 100 && (
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
          </>
        }
      >
        <div className="modules-list" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {selectedCourseForModules && getModulesForCourse(selectedCourseForModules.courseCode, selectedCourseForModules.progressPercent).map((mod, index) => (
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
      </Modal>

      {/* Badge Celebration Overlay Modal */}
      {showBadgeOverlay && celebratedBadge && (
        <div 
          className="modal-overlay" 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            backgroundColor: 'rgba(15, 23, 42, 0.95)', 
            backdropFilter: 'blur(12px)',
            zIndex: 1500, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          <div 
            className="badge-celebration-card glass-panel" 
            style={{ 
              padding: '40px', 
              maxWidth: '480px', 
              width: '90%', 
              borderRadius: 'var(--border-radius-lg)', 
              backgroundColor: 'var(--bg-card)', 
              border: '2px solid rgba(255,215,0,0.4)', 
              boxShadow: '0 0 40px rgba(255, 215, 0, 0.15)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px'
            }}
          >
            <div 
              style={{ 
                fontSize: '5rem', 
                filter: 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.4))',
                transform: 'scale(1.2)',
                margin: '10px 0'
              }}
            >
              {celebratedBadge.icon}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--accent-color)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>New Achievement Badge Gained!</span>
              <h2 style={{ fontSize: '1.8rem', color: '#fff', fontWeight: '800', margin: 0 }}>{celebratedBadge.name}</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Step {celebratedBadge.step} of 10 completed</span>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 10px' }}>
              {celebratedBadge.description}
            </p>

            <div style={{ width: '100%', height: '2px', background: 'linear-gradient(90deg, transparent, var(--border-color), transparent)', margin: '10px 0' }}></div>

            <Button 
              variant="primary" 
              onClick={() => {
                setShowBadgeOverlay(false);
                setCelebratedBadge(null);
              }}
              style={{ 
                padding: '12px 32px', 
                fontWeight: '700', 
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                animation: 'pulseGlow 2s infinite'
              }}
            >
              Accept Badge
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
