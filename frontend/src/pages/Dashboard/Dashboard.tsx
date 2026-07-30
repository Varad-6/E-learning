import React, { useEffect, useState } from 'react';

import { useNavigate, useLocation } from 'react-router-dom';

import { User, Users, ShieldAlert, Award, FileText, PlusCircle, Bookmark, Layers, BookOpen, Clock, Hourglass, CheckCircle, Bell, Trophy, Calendar, ChevronRight, Target, Flag, TrendingUp, Eye, EyeOff } from 'lucide-react';

import { Button } from '../../components/Button/Button';

import { Modal } from '../../components/Modal/Modal';

import type { Course } from '../../types/schema';

import { getBadgeForCompletions } from '../../services/badge';

import type { Badge } from '../../services/badge';

import { apiCall } from '../../services/api';

import { useToast } from '../../context/ToastContext';

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



interface SVGLineChartProps {

  data: { label: string; value: number }[];

  xAxisLabel?: string;

  yAxisLabel?: string;

}



// Pure SVG Line Chart Component (Zero External Dependencies)

const SVGLineChart: React.FC<SVGLineChartProps> = ({ 

  data, 

  xAxisLabel = "Timeline", 

  yAxisLabel = "Values" 

}) => {

  if (!data || data.length === 0) return <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', padding: '16px 0' }}>No trend data available.</p>;



  // Dimensions & Padding

  const width = 500;

  const height = 240;

  const paddingLeft = 58;

  const paddingRight = 15;

  const paddingTop = 20;

  const paddingBottom = 45;



  const chartWidth = width - paddingLeft - paddingRight;

  const chartHeight = height - paddingTop - paddingBottom;



  // Max value calculation with snapping thresholds (10, 20, 50, 100)

  const rawMax = Math.max(...data.map(d => d.value));

  let maxVal = 10;

  if (rawMax > 0) {

    if (rawMax <= 10) {

      maxVal = 10;

    } else if (rawMax <= 20) {

      maxVal = 20;

    } else if (rawMax <= 50) {

      maxVal = 50;

    } else if (rawMax <= 100) {

      maxVal = 100;

    } else {

      maxVal = Math.ceil(rawMax / 50) * 50;

    }

  }



  // Generate 5 nice Y-axis ticks for perfect divisions (0%, 25%, 50%, 75%, 100%)

  const yTicks = [

    0,

    Math.round(maxVal * 0.25),

    Math.round(maxVal * 0.50),

    Math.round(maxVal * 0.75),

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

    <div style={{ 

      width: '100%', 

      maxWidth: '100%', 

      margin: '0 auto', 

      padding: '20px',

      borderRadius: '12px',

      background: 'rgba(255,255,255,0.015)',

      border: '1px solid var(--border-color)',

      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.02)'

    }}>

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

              y={height - 24} 

              textAnchor="middle" 

              fill="var(--text-secondary)" 

              style={{ fontSize: '10px', fontWeight: '700' }}

            >

              {d.label}

            </text>

          );

        })}



        {/* Y-Axis Name (Rotated) */}

        <text 

          transform="rotate(-90)" 

          x={-((paddingTop + chartHeight) / 2)} 

          y={15} 

          textAnchor="middle" 

          fill="var(--text-secondary)" 

          style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '0.06em', textTransform: 'uppercase' }}

        >

          {yAxisLabel}

        </text>



        {/* X-Axis Name */}

        <text 

          x={paddingLeft + chartWidth / 2} 

          y={height - 6} 

          textAnchor="middle" 

          fill="var(--text-secondary)" 

          style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '0.06em', textTransform: 'uppercase' }}

        >

          {xAxisLabel}

        </text>

      </svg>

    </div>

  );

};



// Pure SVG Bar Chart Component (Zero External Dependencies)

const SVGBarChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {

  const maxVal = Math.max(...data.map(d => d.value), 1) || 1;

  return (

    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '150px', gap: '12px', paddingBottom: '24px', position: 'relative', marginTop: '10px' }}>

      {data.map((d, i) => {

        const heightPercent = (d.value / maxVal) * 100;

        return (

          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>

            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>{d.value}</span>

            <div style={{

              width: '100%',

              maxWidth: '36px',

              height: `${heightPercent}%`,

              background: d.color.startsWith('#') ? `${d.color}26` : d.color,

              border: `1px solid ${d.color}`,

              borderRadius: '6px 6px 0 0',

              transition: 'height 0.4s ease'

            }}></div>

            <span style={{ position: 'absolute', bottom: '-22px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{d.label}</span>

          </div>

        );

      })}

    </div>

  );

};



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

  is_mandatory?: boolean;

  is_locked?: boolean;

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

  const { triggerToast } = useToast();

  const navigate = useNavigate();

  const location = useLocation();

  const [email, setEmail] = useState<string | null>(null);

  const [profileName, setProfileName] = useState<string>('');

  const [profilePasswordCurrent, setProfilePasswordCurrent] = useState<string>('');

  const [profilePasswordNew, setProfilePasswordNew] = useState<string>('');

  const [profilePasswordConfirm, setProfilePasswordConfirm] = useState<string>('');

  const [profilePasswordLoading, setProfilePasswordLoading] = useState<boolean>(false);

  const [showPasswordCurrent, setShowPasswordCurrent] = useState<boolean>(false);

  const [showPasswordNew, setShowPasswordNew] = useState<boolean>(false);

  const [showPasswordConfirm, setShowPasswordConfirm] = useState<boolean>(false);

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
    const sub = params.get('sub');
    if (tab === 'profile') {

      setActiveMainView('profile');

    } else if (tab === 'my-courses') {

      setActiveMainView('my-courses');
      if (sub === 'available' || sub === 'in_progress' || sub === 'completed') {
        setActiveMyCoursesTab(sub);
      } else if (sub === 'mandatory') {
        setActiveMyCoursesTab('available');
      } else {
        setActiveMyCoursesTab('in_progress');
      }
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

  const [activeCatalogTab, setActiveCatalogTab] = useState<'available'>('available');
  const [activeMyCoursesTab, setActiveMyCoursesTab] = useState<'available' | 'in_progress' | 'completed'>('in_progress');



  // Redesigned Employee Dashboard states

  const [empDashboardData, setEmpDashboardData] = useState<any | null>(null);

  const [empDashboardLoading, setEmpDashboardLoading] = useState(true);

  const [showCatalogOnly, setShowCatalogOnly] = useState(false);



  // React States for Employee View

  const [myProgress, setMyProgress] = useState<ProgressItem[]>([]);



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

  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(false);

  const [analyticsError, setAnalyticsError] = useState<boolean>(false);



  const fetchDashboardAnalytics = async () => {

    setAnalyticsLoading(true);

    setAnalyticsError(false);

    try {

      const [

        sumRes, compRes, trendRes, deptRes, actRes, topCRes, pfRes, pendRes, topPRes

      ] = await Promise.all([

        apiCall('/api/dashboard/summary'),

        apiCall('/api/dashboard/completion-rate'),

        apiCall('/api/dashboard/enrollment-trend'),

        apiCall('/api/dashboard/department-performance'),

        apiCall('/api/dashboard/active-inactive-learners'),

        apiCall('/api/dashboard/top-courses'),

        apiCall('/api/dashboard/exam-pass-fail'),

        apiCall('/api/dashboard/pending-approvals'),

        apiCall('/api/dashboard/top-performers')

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
          status: c.status,
          is_mandatory: c.is_mandatory,
          duration: c.duration
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

            difficulty: 'Beginner' as const,

            is_mandatory: e.is_mandatory || false,

            is_locked: e.is_locked || false

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

                  fontFamily: 'var(--font-title), sans-serif',

                  textShadow: '0 2px 4px rgba(0,0,0,0.2)',

                  letterSpacing: '-2px'

                }}>

                  {rankPos}

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

        alert('Profile updated successfully!');

      } else {

        const err = await response.json();

        alert(err.detail || 'Could not update profile details. Please try again.');

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



    const handleProfilePasswordChange = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!profilePasswordCurrent || !profilePasswordNew || !profilePasswordConfirm) {

      triggerToast('Please fill in all password fields.', 'error');

      return;

    }

    if (profilePasswordNew !== profilePasswordConfirm) {

      triggerToast('New passwords do not match.', 'error');

      return;

    }

    if (profilePasswordNew.length < 6) {

      triggerToast('New password must be at least 6 characters long.', 'error');

      return;

    }



    try {

      setProfilePasswordLoading(true);

      const res = await apiCall('/api/auth/change-password', {

        method: 'POST',

        body: JSON.stringify({

          current_password: profilePasswordCurrent,

          new_password: profilePasswordNew

        })

      });



      if (res.ok) {

        triggerToast('Password updated successfully.', 'success');

        setProfilePasswordCurrent('');

        setProfilePasswordNew('');

        setProfilePasswordConfirm('');

      } else {

        const data = await res.json();

        triggerToast(data.detail || 'Could not update password.', 'error');

      }

    } catch (err) {

      console.error(err);

      triggerToast('Connection error. Failed to update password.', 'error');

    } finally {

      setProfilePasswordLoading(false);

    }

  };



  const handleLogout = async () => {

    const refreshToken = localStorage.getItem('refresh_token');

    if (refreshToken) {

      try {

        await apiCall('/api/auth/logout', {

          method: 'POST',

          body: JSON.stringify({ refresh_token: refreshToken }),

        });

      } catch (err) {

        console.error(err);

      }

    }

    localStorage.removeItem('access_token');

    localStorage.removeItem('refresh_token');

    localStorage.removeItem('isLoggedInEmail');

    localStorage.removeItem('isLoggedInRole');

    localStorage.removeItem('isLoggedInDept');

    localStorage.removeItem('profileName');

    localStorage.removeItem('profileEmpId');

    navigate('/');

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

              <Button 

                variant="outline"

                onClick={() => navigate('/dashboard')}

                style={{ fontSize: '0.85rem', fontWeight: '700', padding: '10px 18px' }}

              >

                ← Back to Dashboard

              </Button>

              <div className="pane-header" style={{ marginBottom: 0 }}>

                <h3>My Profile Workspace</h3>

                <p>Personal profile credentials and training reports center</p>

              </div>

            </div>

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

                    <>

                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>

                        <span style={{ color: 'var(--text-secondary)' }}>Department Head</span>

                        <span style={{ fontWeight: '600', color: 'var(--accent-color)' }}>{getManagerForDept(dept)}</span>

                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>

                        <span style={{ color: 'var(--text-secondary)' }}>Completed Courses</span>

                        <span style={{ fontWeight: '600', color: 'var(--neon-teal)' }}>

                          {myProgress.filter(p => p.progressPercent === 100).length} Courses

                        </span>

                      </div>

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

                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>

                        <span style={{ color: 'var(--text-secondary)' }}>Ongoing Modules</span>

                        <span style={{ fontWeight: '600', color: 'var(--accent-color)' }}>

                          {myProgress.filter(p => p.progressPercent < 100).length} In Progress

                        </span>

                      </div>

                    </>

                  )}

                </div>



                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '20px', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

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

                  <Button
                    variant="outline"
                    style={{ width: '100%', fontSize: '0.82rem', borderColor: '#ef4444', color: '#ef4444' }}
                    onClick={handleLogout}
                  >
                    Logout Account
                  </Button>

                </div>

              </div>



              {/* Status summary box */}

              {role === 'Employee' && (

                <div className="sidebar-card glass-panel" style={{ borderLeft: '3px solid var(--neon-teal)', padding: '20px' }}>

                  <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.03em', marginBottom: '8px' }}>Compliance Status</h4>

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>

                    {myProgress.some(p => p.progressPercent < 100) 

                      ? 'Ongoing curriculums active. Ensure completion within compliance deadline nodes.'

                      : 'System compliant. All assigned training certifications have been successfully verified.'}

                  </p>

                </div>

              )}

            </div>



            {/* Right Pane - Marks report / Course summaries for Employees or Password Form for Admins/Managers */}

            

              <div className="profile-main-pane">

                {/* Clean, secure Change Password Card */}

                <div className="roster-card glass-panel" style={{ padding: '32px' }}>

                  <h3 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', padding: 0 }}>

                    🔐 Change Account Password

                  </h3>

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>

                    Update your password regularly to maintain platform credentials compliance.

                  </p>



                  <form onSubmit={handleProfilePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                                        <div className="form-group-spaced" style={{ margin: 0 }}>

                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>

                        Current Password <span style={{ color: '#ef4444' }}>*</span>

                      </label>

                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>

                        <input 

                          type={showPasswordCurrent ? 'text' : 'password'}

                          placeholder="Enter your current password"

                          value={profilePasswordCurrent}

                          onChange={(e) => setProfilePasswordCurrent(e.target.value)}

                          className="form-input-styled"

                          style={{

                            width: '100%',

                            padding: '12px 48px 12px 16px',

                            borderRadius: 'var(--border-radius-md)',

                            backgroundColor: 'var(--bg-input)',

                            border: '1px solid var(--border-color)',

                            color: 'var(--text-primary)',

                            fontSize: '0.9rem',

                            transition: 'border-color 0.2s ease',

                            boxSizing: 'border-box'

                          }}

                        />

                        <button

                          type="button"

                          onClick={() => setShowPasswordCurrent(!showPasswordCurrent)}

                          style={{

                            position: 'absolute',

                            right: '12px',

                            background: 'none',

                            border: 'none',

                            cursor: 'pointer',

                            color: 'var(--text-secondary)',

                            display: 'flex',

                            alignItems: 'center',

                            justifyContent: 'center',

                            padding: '4px'

                          }}

                        >

                          {showPasswordCurrent ? <EyeOff size={18} /> : <Eye size={18} />}

                        </button>

                      </div>

                    </div>



                    <div className="form-group-spaced" style={{ margin: 0 }}>

                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>

                        New Password <span style={{ color: '#ef4444' }}>*</span>

                      </label>

                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>

                        <input 

                          type={showPasswordNew ? 'text' : 'password'}

                          placeholder="Enter your new password (min. 6 chars)"

                          value={profilePasswordNew}

                          onChange={(e) => setProfilePasswordNew(e.target.value)}

                          className="form-input-styled"

                          style={{

                            width: '100%',

                            padding: '12px 48px 12px 16px',

                            borderRadius: 'var(--border-radius-md)',

                            backgroundColor: 'var(--bg-input)',

                            border: '1px solid var(--border-color)',

                            color: 'var(--text-primary)',

                            fontSize: '0.9rem',

                            transition: 'border-color 0.2s ease',

                            boxSizing: 'border-box'

                          }}

                        />

                        <button

                          type="button"

                          onClick={() => setShowPasswordNew(!showPasswordNew)}

                          style={{

                            position: 'absolute',

                            right: '12px',

                            background: 'none',

                            border: 'none',

                            cursor: 'pointer',

                            color: 'var(--text-secondary)',

                            display: 'flex',

                            alignItems: 'center',

                            justifyContent: 'center',

                            padding: '4px'

                          }}

                        >

                          {showPasswordNew ? <EyeOff size={18} /> : <Eye size={18} />}

                        </button>

                      </div>

                    </div>



                    <div className="form-group-spaced" style={{ margin: 0 }}>

                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>

                        Confirm New Password <span style={{ color: '#ef4444' }}>*</span>

                      </label>

                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>

                        <input 

                          type={showPasswordConfirm ? 'text' : 'password'}

                          placeholder="Re-enter your new password"

                          value={profilePasswordConfirm}

                          onChange={(e) => setProfilePasswordConfirm(e.target.value)}

                          className="form-input-styled"

                          style={{

                            width: '100%',

                            padding: '12px 48px 12px 16px',

                            borderRadius: 'var(--border-radius-md)',

                            backgroundColor: 'var(--bg-input)',

                            border: '1px solid var(--border-color)',

                            color: 'var(--text-primary)',

                            fontSize: '0.9rem',

                            transition: 'border-color 0.2s ease',

                            boxSizing: 'border-box'

                          }}

                        />

                        <button

                          type="button"

                          onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}

                          style={{

                            position: 'absolute',

                            right: '12px',

                            background: 'none',

                            border: 'none',

                            cursor: 'pointer',

                            color: 'var(--text-secondary)',

                            display: 'flex',

                            alignItems: 'center',

                            justifyContent: 'center',

                            padding: '4px'

                          }}

                        >

                          {showPasswordConfirm ? <EyeOff size={18} /> : <Eye size={18} />}

                        </button>

                      </div>

                    </div>



                    <div style={{ marginTop: '10px' }}>

                      <Button

                        variant="primary"

                        type="submit"

                        disabled={profilePasswordLoading}

                        style={{ width: '100%', padding: '14px', fontSize: '0.9rem' }}

                      >

                        {profilePasswordLoading ? 'Updating Account...' : 'Change Password'}

                      </Button>

                    </div>

                  </form>

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

                {role === 'Admin'
                  ? 'System Admin Workspace'
                  : (role === 'HR Admin' || role === 'HR Manager')
                  ? 'HR Admin Workspace'
                  : role === 'Manager'
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

                {/* Courses Grid */}

                {(() => {

                  const filtered = managedCourses.filter((c: any) => {

                    const isPublished = c.status === 'published' || c.status === 'approved' || c.is_published;

                    return isPublished;

                  });

                  const sortedFiltered = [...filtered].sort((a: any, b: any) => {
                    const aMand = a.is_mandatory ? 1 : 0;
                    const bMand = b.is_mandatory ? 1 : 0;
                    return bMand - aMand;
                  });

                  if (sortedFiltered.length === 0) {

                    return (

                      <div className="empty-state-container glass-panel" style={{ padding: '48px', textAlign: 'center', borderRadius: 'var(--border-radius-md)', width: '100%' }}>

                        <BookOpen size={48} style={{ opacity: 0.2, marginBottom: '12px', color: 'var(--accent-color)', margin: '0 auto 12px' }} />

                        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No courses match your active filters.</p>

                      </div>

                    );

                  }

                  return (

                    <div className="employee-courses-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', width: '100%' }}>

                      {sortedFiltered.map((course) => {

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

                              background: course.is_mandatory ? 'linear-gradient(to bottom right, var(--bg-card), rgba(239, 68, 68, 0.05))' : 'var(--bg-card)', 

                              border: course.is_mandatory ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-color)',

                              boxShadow: course.is_mandatory ? '0 0 12px rgba(239, 68, 68, 0.08)' : 'none',

                              transition: 'all 0.3s ease',

                              padding: '20px',

                              justifyContent: 'space-between',

                              minHeight: '180px'

                            }}

                          >

                            <div>

                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>

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

                                {course.is_mandatory && (
                                  <span 
                                    style={{ 
                                      padding: '2px 8px', 
                                      borderRadius: '12px', 
                                      background: 'rgba(239, 68, 68, 0.1)', 
                                      color: '#ef4444', 
                                      fontSize: '0.7rem', 
                                      fontWeight: '800',
                                      border: '1px solid rgba(239, 68, 68, 0.2)'
                                    }}
                                  >
                                    Mandatory
                                  </span>
                                )}

                              </div>

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

                border: 1px solid var(--border-color);

                box-shadow: var(--shadow-sm);

                display: flex;

                flex-direction: column;

                height: 100%;

                box-sizing: border-box;

                transition: all 0.3s ease;

              }

              .widget-card:hover {

                border-color: var(--accent-color) !important;

                box-shadow: var(--shadow-premium) !important;

                transform: translateY(-2px);

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

              .metric-nav-card {

                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

              }

              .metric-nav-card:hover {

                transform: translateY(-4px) scale(1.02);

                box-shadow: var(--shadow-premium), 0 10px 20px rgba(0,0,0,0.15);

                filter: brightness(1.08);

              }

              @media (max-width: 992px) {

                .metric-nav-card {

                  grid-column: span 6 !important;

                }

              }

              @media (max-width: 576px) {

                .metric-nav-card {

                  grid-column: span 12 !important;

                }

              }

            `}</style>



            {empDashboardLoading ? (

              <div className="employee-dashboard-grid-root">

                <div className="widget-card" style={{ gridColumn: 'span 4' }}>{renderSkeleton('140px')}</div>

                <div className="widget-card" style={{ gridColumn: 'span 4' }}>{renderSkeleton('140px')}</div>

                <div className="widget-card" style={{ gridColumn: 'span 4' }}>{renderSkeleton('140px')}</div>

                <div className="widget-card" style={{ gridColumn: 'span 8' }}>{renderSkeleton('180px')}</div>

                <div className="widget-card" style={{ gridColumn: 'span 4' }}>{renderSkeleton('180px')}</div>

              </div>

            ) : !empDashboardData ? (

              <div className="empty-state-container glass-panel" style={{ padding: '48px', textAlign: 'center', border: '1px solid var(--border-color)' }}>

                <p>Failed to load dashboard data. Please try again.</p>

                <Button onClick={fetchEmpDashboard} style={{ marginTop: '12px' }}>Retry</Button>

              </div>

            ) : (

              <div className="employee-dashboard-grid-root">

                 <div style={{

                  gridColumn: '1 / -1',

                  background: 'var(--bg-card)',

                  borderRadius: 'var(--border-radius-lg)',

                  border: '1px solid var(--border-color)',

                  padding: '24px 30px',

                  display: 'flex',

                  justifyContent: 'space-between',

                  alignItems: 'center',

                  flexWrap: 'wrap',

                  gap: '16px',

                  boxShadow: 'var(--shadow-sm)',

                  marginBottom: '8px'

                }}>

                  <div>

                    <h3 style={{ fontSize: '1.6rem', fontWeight: 850, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>

                      Welcome back, {profileName || 'Learner'}! 👋

                    </h3>

                    <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>

                      Check your progress, complete upcoming exams, and browse new courses to keep leveling up.

                    </p>

                  </div>
                  <Button variant="primary" onClick={() => navigate('/dashboard?tab=my-courses&sub=available')}>Browse All Courses →</Button>
                </div>



                {/* 4 COLORFUL METRIC CARDS SECTION */}

                

                {/* Card 1: Average Exam Score */}

                <div className="metric-nav-card" style={{

                  gridColumn: 'span 3',
                  background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.09) 0%, rgba(217, 119, 6, 0.02) 100%)',
                  border: '1px solid rgba(217, 119, 6, 0.25)',
                  color: 'var(--text-primary)',

                  padding: '20px',

                  borderRadius: 'var(--border-radius-lg)',

                  display: 'flex',

                  flexDirection: 'column',

                  justifyContent: 'space-between',

                  minHeight: '130px',

                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(217, 119, 6, 0.05)'
                }} onClick={() => navigate('/exams')}>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>

                    <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontFamily: 'var(--font-title), sans-serif' }}>

                      Average Exam Score

                    </span>
                    <Award size={20} style={{ color: '#d97706' }} />
                  </div>

                  <div>

                    <div style={{ fontSize: '2.1rem', fontWeight: 900, lineHeight: 1, fontFamily: 'var(--font-title), sans-serif' }}>

                      {empDashboardData.exam_score_trend && empDashboardData.exam_score_trend.length > 0 && empDashboardData.exam_score_trend[0].label !== 'Baseline'

                        ? (empDashboardData.exam_score_trend.reduce((acc: number, curr: any) => acc + (curr.value || 0), 0) / empDashboardData.exam_score_trend.length).toFixed(1)

                        : '0.0'}

                    </div>

                    <div style={{ fontSize: '0.78rem', fontWeight: 600, marginTop: '4px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body), sans-serif' }}>

                      Scale of 0 to 10

                    </div>

                  </div>

                </div>



                {/* Card 2: Courses Available */}

                <div className="metric-nav-card" style={{

                  gridColumn: 'span 3',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.09) 0%, rgba(16, 185, 129, 0.02) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  color: 'var(--text-primary)',

                  padding: '20px',

                  borderRadius: 'var(--border-radius-lg)',

                  display: 'flex',

                  flexDirection: 'column',

                  justifyContent: 'space-between',

                  minHeight: '130px',

                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.05)'
                }} onClick={() => navigate('/dashboard?tab=my-courses&sub=available')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>

                    <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontFamily: 'var(--font-title), sans-serif' }}>

                      Available Courses

                    </span>
                    <BookOpen size={20} style={{ color: '#10b981' }} />
                  </div>

                  <div>

                    <div style={{ fontSize: '2.1rem', fontWeight: 900, lineHeight: 1, fontFamily: 'var(--font-title), sans-serif' }}>
                      {managedCourses.filter((c: any) => {
                        const isPublished = c.status === 'published' || c.status === 'approved' || c.is_published;
                        return isPublished && !myProgress.some((p: any) => p.courseId === c.id);
                      }).length}
                    </div>

                    <div style={{ fontSize: '0.78rem', fontWeight: 600, marginTop: '4px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body), sans-serif' }}>

                      Ready to enroll and start

                    </div>

                  </div>

                </div>



                {/* Card 3: Upcoming Exams */}

                <div className="metric-nav-card" style={{

                  gridColumn: 'span 3',
                  background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.09) 0%, rgba(124, 58, 237, 0.02) 100%)',
                  border: '1px solid rgba(124, 58, 237, 0.25)',
                  color: 'var(--text-primary)',

                  padding: '20px',

                  borderRadius: 'var(--border-radius-lg)',

                  display: 'flex',

                  flexDirection: 'column',

                  justifyContent: 'space-between',

                  minHeight: '130px',

                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(124, 58, 237, 0.05)'
                }} onClick={() => navigate('/exams')}>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>

                    <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontFamily: 'var(--font-title), sans-serif' }}>

                      Upcoming Exams

                    </span>
                    <Clock size={20} style={{ color: '#7c3aed' }} />
                  </div>

                  <div>

                    <div style={{ fontSize: '2.1rem', fontWeight: 900, lineHeight: 1, fontFamily: 'var(--font-title), sans-serif' }}>

                      {empDashboardData.upcoming_exams?.length || 0}

                    </div>

                    <div style={{ fontSize: '0.78rem', fontWeight: 600, marginTop: '4px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body), sans-serif' }}>

                      Assessments to attempt

                    </div>

                  </div>

                </div>



                {/* Card 4: Learning Progress */}

                <div className="metric-nav-card" style={{

                  gridColumn: 'span 3',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.09) 0%, rgba(59, 130, 246, 0.02) 100%)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  color: 'var(--text-primary)',

                  padding: '20px',

                  borderRadius: 'var(--border-radius-lg)',

                  display: 'flex',

                  flexDirection: 'column',

                  justifyContent: 'space-between',

                  minHeight: '130px',

                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.05)'
                }} onClick={() => navigate('/dashboard?tab=my-courses&sub=completed')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>

                    <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontFamily: 'var(--font-title), sans-serif' }}>

                      Courses Completed

                    </span>
                    <CheckCircle size={20} style={{ color: '#3b82f6' }} />
                  </div>

                  <div>

                    <div style={{ fontSize: '2.1rem', fontWeight: 900, lineHeight: 1, fontFamily: 'var(--font-title), sans-serif' }}>

                      {empDashboardData.overall_progress?.completed} / {empDashboardData.overall_progress?.total}

                    </div>

                    <div style={{ fontSize: '0.78rem', fontWeight: 600, marginTop: '4px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body), sans-serif' }}>

                      Progress rate: {empDashboardData.overall_progress?.percent}%

                    </div>

                  </div>

                </div>


                {/* ROW 2: DETAILED WIDGETS */}
                
                {/* 1. MY DEPARTMENT RANK CARD (Span 6) */}
                <div className="widget-card" style={{ gridColumn: 'span 6', border: '1px solid var(--border-color)', background: 'var(--bg-card)', alignItems: 'center' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 800, width: '100%', margin: 0, border: 'none', padding: 0, color: 'var(--text-primary)' }}>
                    <Trophy size={18} style={{ color: '#d97706' }} />
                    My Department Rank
                  </h4>
                  {renderRankCircle(
                    empDashboardData.my_rank?.position,
                    empDashboardData.my_rank?.badge_tier,
                    empDashboardData.my_rank?.department || dept
                  )}
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/leaderboard')}
                    style={{ width: '100%', marginTop: '16px', height: '36px', fontSize: '0.82rem', fontWeight: '700' }}
                  >
                    Open Leaderboard →
                  </Button>
                </div>

                {/* 2. LEARNING JOURNEY PROGRESS RING (Span 6) */}
                <div className="widget-card" style={{ gridColumn: 'span 6', border: '1px solid var(--border-color)', background: 'var(--bg-card)', alignItems: 'center' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 800, width: '100%', margin: 0, border: 'none', padding: 0, color: 'var(--text-primary)' }}>
                    <Target size={18} style={{ color: 'var(--accent-color)' }} />
                    Learning Journey
                  </h4>
                  {renderProgressRing(
                    empDashboardData.overall_progress.percent,
                    empDashboardData.overall_progress.completed,
                    empDashboardData.overall_progress.total
                  )}
                  {empDashboardData.next_badge_milestone.tier_name ? (
                    <div style={{ width: '100%', marginTop: '12px', background: 'var(--accent-glow)', border: '1px solid var(--border-color)', padding: '10px 14px', borderRadius: 'var(--border-radius-md)', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                        <Target size={14} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} /> Next Badge: <strong>{empDashboardData.next_badge_milestone.tier_name}</strong> ({empDashboardData.next_badge_milestone.courses_remaining} course left!)
                      </span>
                    </div>
                  ) : (
                    <div style={{ width: '100%', marginTop: '12px', background: 'var(--accent-glow)', border: '1px solid var(--border-color)', padding: '10px 14px', borderRadius: 'var(--border-radius-md)', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                        <Award size={14} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} /> You've unlocked the highest badge tier!
                      </span>
                    </div>
                  )}
                </div>

                {/* ROW 3: DETAILED CHARTS */}

                {/* 3. SCORE TREND LINE CHART (Span 8) */}
                <div className="widget-card" style={{ gridColumn: 'span 8', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 800, margin: 0, border: 'none', padding: 0, color: 'var(--text-primary)', marginBottom: '14px' }}>
                    <TrendingUp size={18} style={{ color: 'var(--accent-color)' }} />

                    Exam Score Performance Trend

                  </h4>

                  <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>

                    Track your grades over time (latest exam scores out of 10).

                  </p>

                  <div style={{ flex: 1 }}>

                    <SVGLineChart 

                      data={empDashboardData.exam_score_trend && empDashboardData.exam_score_trend.length > 0 ? empDashboardData.exam_score_trend : [{ label: 'Baseline', value: 0 }]} 

                      xAxisLabel="Exams Taken" 

                      yAxisLabel="Score (max 10)" 

                    />

                  </div>

                </div>

                {/* 4. COURSE ENROLLMENT STATUS BAR CHART (Span 4) */}
                <div className="widget-card" style={{ gridColumn: 'span 4', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 800, margin: 0, border: 'none', padding: 0, color: 'var(--text-primary)', marginBottom: '14px' }}>
                    <Layers size={18} style={{ color: '#00f2fe' }} />

                    Course Enrollment Status

                  </h4>

                  <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>

                    Visual count breakdown of your course standings.

                  </p>

                  <div style={{ 

                    flex: 1, 

                    display: 'flex', 

                    flexDirection: 'column', 

                    justifyContent: 'center',

                    background: 'rgba(255,255,255,0.015)',

                    border: '1px solid var(--border-color)',

                    borderRadius: '12px',

                    padding: '24px 20px 20px 20px',

                    boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.02)'

                  }}>

                    <SVGBarChart data={empDashboardData.category_progress && empDashboardData.category_progress.length > 0 

                      ? empDashboardData.category_progress 

                      : [

                          { label: 'Completed', value: 0, color: '#10b981' },

                          { label: 'In Progress', value: 0, color: '#00f2fe' },

                          { label: 'Enrolled', value: 0, color: '#f59e0b' }

                        ]

                    } />

                  </div>

                </div>



                {/* Dashboard layout end */}



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

              
              {/* Sub-tabs for Available, In Progress & Completed */}
              <div className="catalog-tabs-container" style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>

                <button
                  type="button"
                  onClick={() => setActiveMyCoursesTab('available')}
                  style={{
                    border: 'none',
                    background: 'none',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: activeMyCoursesTab === 'available' ? 'var(--accent-color)' : 'var(--text-secondary)',
                    borderBottom: activeMyCoursesTab === 'available' ? '2px solid var(--accent-color)' : 'none',
                    paddingBottom: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Available
                </button>
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

              {/* Enrolled/Catalog Courses */}
              <div className="enrolled-courses-section" style={{ width: '100%' }}>

                {(() => {
                  if (activeMyCoursesTab === 'available') {
                    const filtered = managedCourses.filter((c: any) => {
                      const isPublished = c.status === 'published' || c.status === 'approved' || c.is_published;
                      return isPublished;
                    });
                    const sortedFiltered = [...filtered].sort((a: any, b: any) => {
                      const aMand = a.is_mandatory ? 1 : 0;
                      const bMand = b.is_mandatory ? 1 : 0;
                      return bMand - aMand;
                    });
                    if (sortedFiltered.length === 0) {
                      return (
                        <div className="empty-state-container glass-panel" style={{ padding: '48px', textAlign: 'center', borderRadius: 'var(--border-radius-md)', width: '100%' }}>
                          <BookOpen size={48} style={{ opacity: 0.2, marginBottom: '12px', color: 'var(--accent-color)', margin: '0 auto 12px' }} />
                          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No courses match your active filters.</p>
                        </div>
                      );
                    }
                    return (
                      <div className="employee-courses-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', width: '100%' }}>
                        {sortedFiltered.map((course) => {
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
                                background: course.is_mandatory ? 'linear-gradient(to bottom right, var(--bg-card), rgba(239, 68, 68, 0.05))' : 'var(--bg-card)', 
                                border: course.is_mandatory ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-color)',
                                boxShadow: course.is_mandatory ? '0 0 12px rgba(239, 68, 68, 0.08)' : 'none',
                                transition: 'all 0.3s ease',
                                padding: '20px',
                                justifyContent: 'space-between',
                                minHeight: '180px'
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                                  {course.is_mandatory && (
                                    <span 
                                      style={{ 
                                        padding: '2px 8px', 
                                        borderRadius: '12px', 
                                        background: 'rgba(239, 68, 68, 0.1)', 
                                        color: '#ef4444', 
                                        fontSize: '0.7rem', 
                                        fontWeight: '800',
                                        border: '1px solid rgba(239, 68, 68, 0.2)'
                                      }}
                                    >
                                      Mandatory
                                    </span>
                                  )}
                                </div>
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
                  } else {
                    const filteredShown = myProgress.filter(p => {
                      if (activeMyCoursesTab === 'completed') {
                        return p.progressPercent === 100 || p.is_locked;
                      } else {
                        return p.progressPercent < 100;
                      }
                    });

                    const shownCourses = [...filteredShown].sort((a: any, b: any) => {
                      const aMand = a.is_mandatory ? 1 : 0;
                      const bMand = b.is_mandatory ? 1 : 0;
                      return bMand - aMand;
                    });

                    if (shownCourses.length === 0) {
                      return (
                        <div className="empty-state-container glass-panel" style={{ padding: '48px', textAlign: 'center', borderRadius: 'var(--border-radius-md)', width: '100%' }}>
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
                              background: item.is_mandatory ? 'linear-gradient(to bottom right, var(--bg-card), rgba(239, 68, 68, 0.05))' : 'var(--bg-card)', 
                              border: item.is_mandatory ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-color)',
                              boxShadow: item.is_mandatory ? '0 0 12px rgba(239, 68, 68, 0.08)' : 'none',
                              transition: 'all 0.3s ease',
                              padding: '20px',
                              justifyContent: 'space-between',
                              minHeight: '180px'
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                                {item.is_mandatory && (
                                  <span 
                                    style={{ 
                                      padding: '2px 8px', 
                                      borderRadius: '12px', 
                                      background: 'rgba(239, 68, 68, 0.1)', 
                                      color: '#ef4444', 
                                      fontSize: '0.7rem', 
                                      fontWeight: '800',
                                      border: '1px solid rgba(239, 68, 68, 0.2)'
                                    }}
                                  >
                                    Mandatory
                                  </span>
                                )}
                              </div>
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
                                {item.is_locked ? 'Review Course' : (item.progressPercent === 100 ? 'Review Course' : (item.progressPercent > 0 ? 'Resume Course' : 'Start Course'))}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                    );

                  }
                })()}

              </div>

            </div>

          </div>

        </div>

      )}



      {/* 2. DEPARTMENT MANAGER (DEPARTMENT HEAD) VIEW */}
      {activeMainView === 'dashboard' && role === 'Manager' && (
        <div className="employee-dashboard-container animate-fade-in" style={{ paddingBottom: '40px' }}>
          <div className="employee-dashboard-grid-root">
            {/* Header Banner */}
            <div style={{
              gridColumn: '1 / -1',
              background: 'var(--bg-card)',
              borderRadius: 'var(--border-radius-lg)',
              border: '1px solid var(--border-color)',
              padding: '24px 30px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              boxShadow: 'var(--shadow-sm)',
              marginBottom: '8px'
            }}>
              <div>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 850, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🏢 {dept} Department Head Console
                </h3>
                <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Monitor employee course progression, evaluate module assessment scores, and track department benchmarks.
                </p>
              </div>

              {/* Tab Selector Buttons */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Button 
                  variant={managerSubView === 'audit_reporting' ? 'primary' : 'outline'}
                  onClick={() => setManagerSubView('audit_reporting')}
                  style={{ height: '40px', fontWeight: '700' }}
                >
                  📊 Roster & Scores
                </Button>
                <Button 
                  variant={managerSubView === 'my_courses' ? 'primary' : 'outline'}
                  onClick={() => setManagerSubView('my_courses')}
                  style={{ height: '40px', fontWeight: '700' }}
                >
                  📚 Syllabus Catalog
                </Button>
                <Button 
                  variant={managerSubView === 'create_course' ? 'primary' : 'outline'}
                  onClick={() => setManagerSubView('create_course')}
                  style={{ height: '40px', fontWeight: '700' }}
                >
                  ➕ Create Course
                </Button>
              </div>
            </div>

            {/* KPI Card 1: Top Performer (Green theme) */}
            <div className="metric-nav-card" style={{
              gridColumn: 'span 3',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              color: 'var(--text-primary)',
              padding: '20px',
              borderRadius: 'var(--border-radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '130px',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                  Top Performer ({dept})
                </span>
                <Award size={20} style={{ color: '#10b981' }} />
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {roster && roster.length > 0 ? [...roster].sort((a,b) => (b.avgScore || 0) - (a.avgScore || 0))[0]?.name || 'N/A' : 'No Records'}
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, marginTop: '4px', color: 'var(--text-secondary)' }}>
                  Avg Score: <strong style={{ color: '#10b981' }}>{roster && roster.length > 0 ? `${[...roster].sort((a,b) => (b.avgScore || 0) - (a.avgScore || 0))[0]?.avgScore || 0} / 10` : '0 / 10'}</strong>
                </div>
              </div>
            </div>

            {/* KPI Card 2: Department Avg Score (Blue theme) */}
            <div className="metric-nav-card" style={{
              gridColumn: 'span 3',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.02) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              color: 'var(--text-primary)',
              padding: '20px',
              borderRadius: 'var(--border-radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '130px',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                  Department Average
                </span>
                <TrendingUp size={20} style={{ color: '#3b82f6' }} />
              </div>
              <div>
                <div style={{ fontSize: '2.1rem', fontWeight: 900, lineHeight: 1 }}>
                  {roster && roster.length > 0 ? (roster.reduce((acc, curr) => acc + (curr.avgScore || 0), 0) / roster.length).toFixed(1) : '0.0'}
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, marginTop: '4px', color: 'var(--text-secondary)' }}>
                  Mean Score / 10.0
                </div>
              </div>
            </div>

            {/* KPI Card 3: Curriculum Syllabus Courses (Purple theme) */}
            <div className="metric-nav-card" style={{
              gridColumn: 'span 3',
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(168, 85, 247, 0.02) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.2)',
              color: 'var(--text-primary)',
              padding: '20px',
              borderRadius: 'var(--border-radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '130px',
              boxShadow: '0 4px 15px rgba(168, 85, 247, 0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                  Syllabus Courses
                </span>
                <BookOpen size={20} style={{ color: '#a855f7' }} />
              </div>
              <div>
                <div style={{ fontSize: '2.1rem', fontWeight: 900, lineHeight: 1 }}>
                  {managedCourses.length}
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, marginTop: '4px', color: 'var(--text-secondary)' }}>
                  Published Modules
                </div>
              </div>
            </div>

            {/* KPI Card 4: Grading Backlog (Coral theme) */}
            <div className="metric-nav-card" style={{
              gridColumn: 'span 3',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: 'var(--text-primary)',
              padding: '20px',
              borderRadius: 'var(--border-radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '130px',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                  Grading Backlog
                </span>
                <Clock size={20} style={{ color: '#ef4444' }} />
              </div>
              <div>
                <div style={{ fontSize: '2.1rem', fontWeight: 900, lineHeight: 1 }}>
                  {pendingApprovalsData?.pending_exam_submissions || 0}
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, marginTop: '4px', color: 'var(--text-secondary)' }}>
                  Pending Evaluations
                </div>
              </div>
            </div>

            {/* DYNAMIC SUBVIEWS */}
            <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
              
              {/* SUBVIEW A: MY COURSES CATALOG */}
              {managerSubView === 'my_courses' && (
                <div className="employee-dashboard-grid-root" style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: '24px' }}>
                  <div className="roster-card glass-panel" style={{ padding: '28px' }}>
                    <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', padding: 0 }}>
                      <Bookmark size={18} className="icon-blue" />
                      <span>Published Syllabus Catalog</span>
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {managedCourses.length === 0 ? (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No syllabus courses published in this department yet.</p>
                      ) : (
                        managedCourses.map(course => (
                          <div key={course.id} className="course-progress-row" style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: '20px', backgroundColor: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
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
                        ))
                      )}
                    </div>
                  </div>

                  <div className="sidebar-card glass-panel" style={{ padding: '24px', borderLeft: '3px solid var(--accent-color)', height: 'fit-content' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      <Users size={18} className="sidebar-icon icon-blue" />
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Syllabus Summary</h3>
                    </div>
                    <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Department:</span>
                        <span style={{ fontWeight: '600' }}>{dept}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Curriculum Head:</span>
                        <span style={{ fontWeight: '600' }}>{profileName}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Total Headcount:</span>
                        <span style={{ fontWeight: '600' }}>{roster.length} Learners</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBVIEW B: CREATE COURSE SYSTEM */}
              {managerSubView === 'create_course' && (
                <div className="employee-dashboard-grid-root" style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: '24px' }}>
                  <div className="roster-card glass-panel" style={{ padding: '28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <PlusCircle size={18} className="icon-blue" />
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Create New Course</h3>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                      Publish a new learning module instantly to your department's active curriculum.
                    </p>
                    
                    <form onSubmit={handleCreateNewCourseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div className="form-group-spaced" style={{ margin: 0 }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'uppercase' }}>Course Title</label>
                        <input
                          type="text"
                          className="form-input-styled"
                          placeholder="e.g. ABAP Netweaver Basics"
                          value={newCourseTitle}
                          onChange={(e) => setNewCourseTitle(e.target.value)}
                          style={{ width: '100%', padding: '12px 16px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div className="form-group-spaced" style={{ margin: 0 }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'uppercase' }}>Course Code</label>
                        <input
                          type="text"
                          className="form-input-styled"
                          placeholder="e.g. ABAP-101"
                          value={newCourseCode}
                          onChange={(e) => setNewCourseCode(e.target.value)}
                          style={{ width: '100%', padding: '12px 16px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div className="form-group-spaced" style={{ margin: 0 }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'uppercase' }}>Course Description</label>
                        <textarea
                          className="form-input-styled"
                          placeholder="Core syntax, expressions and select queries."
                          value={newCourseDesc}
                          onChange={(e) => setNewCourseDesc(e.target.value)}
                          rows={4}
                          style={{ width: '100%', padding: '12px 16px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div className="form-group-spaced" style={{ margin: 0 }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'uppercase' }}>Difficulty Level</label>
                        <select
                          className="form-input-styled"
                          value={newCourseDiff}
                          onChange={(e) => setNewCourseDiff(e.target.value as any)}
                          style={{ width: '100%', padding: '12px 16px', boxSizing: 'border-box', backgroundColor: 'var(--bg-input)' }}
                        >
                          <option value="Beginner">Beginner</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                        </select>
                      </div>

                      <Button type="submit" variant="primary" style={{ width: '100%', padding: '14px', fontSize: '0.9rem' }}>
                        Publish Course Curriculum
                      </Button>
                    </form>
                  </div>

                  <div className="sidebar-card glass-panel" style={{ padding: '24px', borderLeft: '3px solid var(--accent-color)', height: 'fit-content' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      <ShieldAlert size={18} className="sidebar-icon icon-blue" />
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>L&D Standards</h3>
                    </div>
                    <div style={{ marginTop: '12px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '10px', lineHeight: '1.4' }}>
                      <p>All courses published here are synced automatically into the employee learning directory.</p>
                      <p><strong>Code Convention:</strong> Prefix course codes matching their department key (e.g. <code>AI-</code>, <code>SD-</code>, <code>FICO-</code>, <code>ABAP-</code>).</p>
                      <p><strong>Passing Criteria:</strong> The default assessment passing grade is set to 80% score limit.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBVIEW C: ROSTER AUDIT & REPORTING */}
              {managerSubView === 'audit_reporting' && (
                <div className="employee-dashboard-grid-root" style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: '24px' }}>
                  
                  {/* Roster & Performance monitoring table */}
                  <div className="roster-card glass-panel" style={{ padding: '28px' }}>
                    <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', padding: 0 }}>
                      <Users size={18} className="icon-blue" />
                      <span>{dept} Department Roster & Performance</span>
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                      Roster directory listing employee metrics and certification status.
                    </p>

                    <div className="scores-table-section">
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                        <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                            <th style={{ padding: '12px 6px', color: 'var(--text-secondary)' }}>Learner</th>
                            <th style={{ padding: '12px 6px', color: 'var(--text-secondary)' }}>Employee ID</th>
                            <th style={{ padding: '12px 6px', color: 'var(--text-secondary)' }}>Completed</th>
                            <th style={{ padding: '12px 6px', color: 'var(--text-secondary)' }}>Average Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {roster && roster.length > 0 ? (
                            roster
                              .filter((emp) => emp.code.startsWith('EMP'))
                              .map((emp) => (
                                <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                  <td style={{ padding: '14px 6px', fontWeight: '600' }}>{emp.name}</td>
                                  <td style={{ padding: '14px 6px' }}><code>{emp.code}</code></td>
                                  <td style={{ padding: '14px 6px' }}>
                                    <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'var(--accent-glow)', color: 'var(--accent-color)', fontSize: '0.72rem', fontWeight: 700 }}>
                                      {emp.coursesTaken} Courses
                                    </span>
                                  </td>
                                  <td style={{ padding: '14px 6px', fontWeight: '700', color: (emp.avgScore && emp.avgScore >= 8.0) ? 'var(--neon-teal)' : 'var(--text-secondary)' }}>
                                    {emp.avgScore ? `${emp.avgScore} / 10.0` : 'N/A'}
                                  </td>
                                </tr>
                              ))
                          ) : (
                            <tr>
                              <td colSpan={4} style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                No employees registered in this department.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Exam Pass / Fail Ratio (Donut Chart) */}
                  <div className="sidebar-card glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>Pass / Fail Benchmark</h4>
                      <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>88% Pass Rate</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '140px', marginBottom: '16px' }}>
                      <svg width="110" height="110" viewBox="0 0 42 42">
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(239, 68, 68, 0.15)" strokeWidth="5"></circle>
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#10b981" strokeWidth="5" strokeDasharray="88 12" strokeDashoffset="25"></circle>
                        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="var(--text-primary)" fontSize="7" fontWeight="800">88%</text>
                      </svg>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span> Passed Assessments (88%)</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span> Failed Assessments (12%)</span>
                    </div>
                  </div>

                  {/* Detail Assessment Scores Drawer (Modal trigger) */}
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
          </div>
        </div>
      )}
      {/* 3. ADMINISTRATOR VIEW (BI & ANALYTICS DASHBOARD) */}

      {activeMainView === 'dashboard' && (role === 'Admin' || role === 'HR Admin' || role === 'HR Manager') && (
        <div className="employee-dashboard-container animate-fade-in" style={{ paddingBottom: '40px' }}>
          <div className="employee-dashboard-grid-root">
            {/* Header Banner */}
            <div style={{
              gridColumn: '1 / -1',
              background: 'var(--bg-card)',
              borderRadius: 'var(--border-radius-lg)',
              border: '1px solid var(--border-color)',
              padding: '24px 30px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              boxShadow: 'var(--shadow-sm)',
              marginBottom: '8px'
            }}>
              <div>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 850, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {role === 'Admin'
                    ? 'System Admin Workspace'
                    : (role === 'HR Admin' || role === 'HR Manager')
                    ? 'HR Admin Workspace'
                    : 'Workspace'}
                </h3>
                <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Real-time corporate analytics, curriculum drop-off statistics, and department evaluations.
                </p>
              </div>
              <Button variant="primary" onClick={fetchDashboardAnalytics} disabled={analyticsLoading}>
                {analyticsLoading ? 'Refreshing...' : 'Refresh Analytics 🔄'}
              </Button>
            </div>

            {/* KPI Card 1: Active Headcount */}
            <div className="metric-nav-card" style={{
              gridColumn: 'span 3',
              background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.08) 0%, rgba(0, 242, 254, 0.02) 100%)',
              border: '1px solid rgba(0, 242, 254, 0.2)',
              color: 'var(--text-primary)',
              padding: '20px',
              borderRadius: 'var(--border-radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '130px',
              boxShadow: '0 4px 15px rgba(0, 242, 254, 0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                  Active Headcount
                </span>
                <Users size={20} style={{ color: '#00f2fe' }} />
              </div>
              <div>
                <div style={{ fontSize: '2.1rem', fontWeight: 900, lineHeight: 1 }}>
                  {summaryData.total_users || 0}
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, marginTop: '4px', color: 'var(--text-secondary)' }}>
                  Registered Learners
                </div>
              </div>
            </div>

            {/* KPI Card 2: Completed Enrollments */}
            <div className="metric-nav-card" style={{
              gridColumn: 'span 3',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              color: 'var(--text-primary)',
              padding: '20px',
              borderRadius: 'var(--border-radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '130px',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                  Completed Exams
                </span>
                <BookOpen size={20} style={{ color: '#10b981' }} />
              </div>
              <div>
                <div style={{ fontSize: '2.1rem', fontWeight: 900, lineHeight: 1 }}>
                  {summaryData.completed_enrollments || 0}
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, marginTop: '4px', color: 'var(--text-secondary)' }}>
                  Graded & Completed
                </div>
              </div>
            </div>

            {/* KPI Card 3: Top Performing Department */}
            <div className="metric-nav-card" style={{
              gridColumn: 'span 3',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(139, 92, 246, 0.02) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              color: 'var(--text-primary)',
              padding: '20px',
              borderRadius: 'var(--border-radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '130px',
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                  Top Department
                </span>
                <Award size={20} style={{ color: '#8b5cf6' }} />
              </div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {deptPerformanceData && deptPerformanceData.length > 0
                    ? (() => {
                        const topDept = [...deptPerformanceData].sort((a, b) => (b.value || 0) - (a.value || 0))[0];
                        return `${topDept.label}`;
                      })()
                    : 'None Yet'}
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, marginTop: '6px', color: 'var(--text-secondary)' }}>
                  {deptPerformanceData && deptPerformanceData.length > 0
                    ? (() => {
                        const topDept = [...deptPerformanceData].sort((a, b) => (b.value || 0) - (a.value || 0))[0];
                        return `Highest Avg: ${topDept.value}/10`;
                      })()
                    : 'Awaiting scores'}
                </div>
              </div>
            </div>

            {/* KPI Card 4: Best Creator Manager */}
            <div className="metric-nav-card" style={{
              gridColumn: 'span 3',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.02) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              color: 'var(--text-primary)',
              padding: '20px',
              borderRadius: 'var(--border-radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '130px',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                  Best Creator Manager
                </span>
                <Trophy size={20} style={{ color: '#f59e0b' }} />
              </div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {summaryData.best_manager ? summaryData.best_manager.name : 'Awaiting Data'}
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, marginTop: '6px', color: 'var(--text-secondary)' }}>
                  {summaryData.best_manager 
                    ? `${summaryData.best_manager.courses_count} courses & ${summaryData.best_manager.reviews_count} graded`
                    : 'No reviews logged yet'}
                </div>
              </div>
            </div>

            {/* Left Column (span 8): SVG Business Intelligence Charts */}
            <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="widget-card" style={{ height: 'auto' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 800 }}>Avg Score per Department</h4>
                <div style={{ padding: '10px 0' }}>
                  <SVGBarChart data={deptPerformanceData.length > 0 ? deptPerformanceData : [{ label: 'General', value: 0, color: '#10b981' }]} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                <div className="widget-card" style={{ height: 'auto' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800 }}>Exam Pass / Fail Ratio</h4>
                  <div style={{ padding: '10px 0' }}>
                    <SVGDonutChart items={passFailRatioData.length > 0 ? passFailRatioData : [{ label: 'Passed (>= 8.0)', value: 100, color: '#10b981' }]} />
                  </div>
                </div>

                <div className="widget-card" style={{ height: 'auto' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800 }}>Platform Insights Feed</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '10px 0', fontSize: '0.85rem' }}>
                    {((pendingApprovalsData.pending_course_approvals || 0) + (pendingApprovalsData.pending_exam_submissions || 0)) > 0 ? (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', color: '#f59e0b' }}>
                        <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>⚠️</span>
                        <div>
                          <strong>Ungraded Assessments Pending</strong>
                          <p style={{ margin: '3px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                            Course Managers have {(pendingApprovalsData.pending_course_approvals || 0) + (pendingApprovalsData.pending_exam_submissions || 0)} pending items waiting for review/approvals.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', color: '#10b981' }}>
                        <CheckCircle size={20} />
                        <div>
                          <strong>All Submissions Graded</strong>
                          <p style={{ margin: '3px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                            All exam sheets and approval flows are fully completed. Keep up the good work!
                          </p>
                        </div>
                      </div>
                    )}

                    {topCoursesData && topCoursesData.length > 0 && (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', color: 'var(--accent-color)' }}>
                        <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>📈</span>
                        <div>
                          <strong>Highest Enrollment Course</strong>
                          <p style={{ margin: '3px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                            "{topCoursesData[0].title}" ({topCoursesData[0].course_code}) is leading training enrollment counts.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (span 4): Top Performers Showcase (Global Podium) */}
            <div style={{ gridColumn: 'span 4' }}>
              <div className="widget-card">
                <h4 style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Trophy size={18} style={{ color: 'var(--accent-color)' }} /> Top Performers Showcase
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
                  {topPerformersData && topPerformersData.length > 0 ? (
                    topPerformersData.map((user: any, idx: number) => (
                      <div 
                        key={user.user_id || idx} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          padding: '12px', 
                          borderRadius: 'var(--border-radius-sm)', 
                          background: idx === 0 ? 'rgba(245, 158, 11, 0.06)' : 'rgba(255,255,255,0.02)',
                          border: idx === 0 ? '1px solid rgba(245, 158, 11, 0.15)' : '1px solid var(--border-color)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ 
                            fontSize: '0.85rem', 
                            fontWeight: '900', 
                            color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : '#b45309',
                            width: '20px'
                          }}>
                            #{idx + 1}
                          </span>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {user.user_name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <span>{user.department_name}</span> &bull; 
                              {user.badge_asset_ref && (
                                <img 
                                  src={`/badges/${user.badge_asset_ref}.png`} 
                                  alt={user.badge_name} 
                                  style={{ width: '14px', height: '14px', objectFit: 'contain' }} 
                                />
                              )}
                              <span>{user.badge_name || 'Bronze III'}</span>
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-color)', background: 'var(--accent-glow)', padding: '2px 8px', borderRadius: '4px' }}>
                          {user.score ? user.score.toFixed(1) : '0.0'}/10
                        </span>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.82rem' }}>No student evaluations recorded.</p>
                  )}
                </div>
              </div>
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

            {selectedCourseForModules && (selectedCourseForModules.progressPercent < 100 || selectedCourseForModules.is_locked) && (

              <Button 

                variant="primary" 

                onClick={() => {

                  if (selectedCourseForModules.is_locked) {

                    navigate(`/course-player/${selectedCourseForModules.id}`);

                  } else {

                    handleStudyIncrement(selectedCourseForModules.id);

                    setSelectedCourseForModules(prev => {

                      if (!prev) return null;

                      return { ...prev, progressPercent: Math.min(prev.progressPercent + 20, 100) };

                    });

                  }

                }}

              >

                {selectedCourseForModules.is_locked ? 'Review Study' : 'Resume Study'}

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

