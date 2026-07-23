import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Building2, Users, BookOpen, Award, Clock, ArrowRight, ArrowLeft,
  ChevronRight, Search, TrendingUp, CheckCircle, AlertCircle, FileText, User
} from 'lucide-react';
import { Button } from '../../components/Button/Button';
import { Modal } from '../../components/Modal/Modal';
import { apiCall } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { getBadgeForCompletions } from '../../services/badge';

interface DepartmentSummary {
  id: string;
  name: string;
  code: string;
  description: string;
  employee_count: number;
  avg_exam_score: number | null;
  courses_in_progress_count: number;
  courses_completed_count: number;
  pending_reviews_count: number;
}

interface EmployeeSummary {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  role_name: string;
  courses_enrolled_count: number;
  courses_completed_count: number;
  avg_exam_score: number | null;
  exams_taken_count: number;
  last_activity_date: string | null;
}

interface EmployeeProfileDetail {
  user: {
    id: string;
    employee_code: string;
    first_name: string;
    last_name: string;
    email: string;
    department_id: string;
    department_name: string;
    role_name: string;
  };
  courses: {
    enrollment_id: string;
    course_id: string;
    course_title: string;
    course_code: string;
    progress_percent: number;
    status: string;
    enrolled_at: string | null;
    completed_at: string | null;
  }[];
  exams: {
    submission_id: string;
    exam_id: string;
    exam_title: string;
    status: string;
    started_at: string | null;
    submitted_at: string | null;
    graded_at: string | null;
    overall_score: number | null;
    overall_feedback: string | null;
    grader_name: string;
    scores: { [qId: string]: number };
  }[];
  score_trend: {
    date: string;
    score: number;
    exam_title: string;
  }[];
  name?: string;
  email?: string;
  department?: string;
  avg_score?: number | null;
  exams_attempted?: number;
  badges?: any[];
}

export const ReportingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { triggerToast } = useToast();

  // Navigation Level State: 1 = Dept Cards, 2 = Dept Employee List/Cards
  const [level, setLevel] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);

  // Data states
  const [departments, setDepartments] = useState<DepartmentSummary[]>([]);
  const [selectedDept, setSelectedDept] = useState<DepartmentSummary | null>(() => {
    const saved = sessionStorage.getItem('kaizen_reporting_selected_dept');
    return saved ? JSON.parse(saved) : null;
  });
  const [deptEmployees, setDeptEmployees] = useState<EmployeeSummary[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfileDetail | null>(null);
  const [selectedEmpBadges, setSelectedEmpBadges] = useState<any[]>([]);

  // Table filters & sorting
  const [searchTerm, setSearchTerm] = useState(() => {
    return sessionStorage.getItem('kaizen_reporting_search') || '';
  });
  const [sortField, setSortField] = useState<'name' | 'score' | 'courses' | 'activity'>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Load Level 1 Department Summaries
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await apiCall('/api/reporting/departments');
      if (res.ok) {
        const data: DepartmentSummary[] = await res.json();
        setDepartments(data);
        // Scoping: If user is Manager (or scoped to 1 department), auto-select Level 2 immediately
        const userRole = localStorage.getItem('isLoggedInRole') || 'Employee';
        if (userRole === 'Manager' && data.length === 1) {
          handleSelectDepartment(data[0]);
        }
      } else {
        const err = await res.json();
        triggerToast(`Failed to load reporting: ${err.detail}`, 'error');
      }
    } catch (e) {
      console.error(e);
      triggerToast('Error connecting to reporting service.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDeptEmployees = async (deptId: string) => {
    setLoading(true);
    try {
      const res = await apiCall(`/api/reporting/departments/${deptId}/employees`);
      if (res.ok) {
        const data = await res.json();
        setDeptEmployees(data.employees || []);
      } else {
        const err = await res.json();
        triggerToast(`Error loading reporting: ${err.detail}`, 'error');
      }
    } catch (e) {
      console.error(e);
      triggerToast('Failed to fetch department reporting.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const { userId } = useParams<{ userId: string }>();

  useEffect(() => {
    if (userId) {
      handleSelectEmployee(userId);
    } else {
      setSelectedEmployee(null);
      fetchDepartments();
      const savedDept = sessionStorage.getItem('kaizen_reporting_selected_dept');
      if (savedDept) {
        const deptObj = JSON.parse(savedDept);
        setSelectedDept(deptObj);
        setLevel(2);
        loadDeptEmployees(deptObj.id);
      } else {
        setLevel(1);
      }
    }
  }, [userId]);

  // Drill down to Level 2
  const handleSelectDepartment = async (dept: DepartmentSummary) => {
    setSelectedDept(dept);
    sessionStorage.setItem('kaizen_reporting_selected_dept', JSON.stringify(dept));
    setLevel(2);
    setSearchTerm('');
    sessionStorage.removeItem('kaizen_reporting_search');
    await loadDeptEmployees(dept.id);
  };

  // Drill down to Level 3 / Open Detail Page
  const handleSelectEmployee = async (empId: string) => {
    setLoading(true);
    setSelectedEmpBadges([]);
    try {
      const detailRes = await apiCall(`/api/reporting/employees/${empId}/detail`);
      const badgesRes = await apiCall(`/api/users/${empId}/badges`);
      if (detailRes.ok) {
        const data: EmployeeProfileDetail = await detailRes.json();
        setSelectedEmployee(data);
      } else {
        const err = await detailRes.json();
        triggerToast(`Error loading profile: ${err.detail}`, 'error');
      }
      if (badgesRes.ok) {
        const badgesData = await badgesRes.json();
        setSelectedEmpBadges(badgesData || []);
      }
    } catch (e) {
      console.error(e);
      triggerToast('Failed to fetch employee details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filtering & Sorting Level 2 Employees
  const filteredEmployees = deptEmployees.filter(emp => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return true;
    const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
    const code = (emp.employee_code || '').toLowerCase();
    const email = (emp.email || '').toLowerCase();
    return fullName.includes(search) || code.includes(search) || email.includes(search);
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    let valA: any = '';
    let valB: any = '';

    if (sortField === 'name') {
      valA = `${a.first_name} ${a.last_name}`;
      valB = `${b.first_name} ${b.last_name}`;
    } else if (sortField === 'score') {
      valA = a.avg_exam_score ?? -1;
      valB = b.avg_exam_score ?? -1;
    } else if (sortField === 'courses') {
      valA = a.courses_completed_count;
      valB = b.courses_completed_count;
    } else if (sortField === 'activity') {
      valA = a.last_activity_date ? new Date(a.last_activity_date).getTime() : 0;
      valB = b.last_activity_date ? new Date(b.last_activity_date).getTime() : 0;
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleSort = (field: 'name' | 'score' | 'courses' | 'activity') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  if (userId) {
    if (loading) {
      return (
        <div className="container" style={{ marginTop: '36px', paddingBottom: '80px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <div className="animate-spin" style={{ width: '36px', height: '36px', border: '3px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
          </div>
        </div>
      );
    }

    if (!selectedEmployee) {
      return (
        <div className="container" style={{ marginTop: '36px', paddingBottom: '80px' }}>
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Employee detail not found.
            <Button variant="primary" style={{ marginTop: '16px' }} onClick={() => navigate('/reporting')}>
              Back to Employee Reporting
            </Button>
          </div>
        </div>
      );
    }

    // Recompute highest badge name and gradient locally
    const lastBadge = selectedEmpBadges.length > 0 ? selectedEmpBadges[selectedEmpBadges.length - 1] : null;
    const badgeName = lastBadge ? lastBadge.badge_tier.name : '';
    const badgeColorMap: {[key: string]: string} = {
      'Bronze': 'linear-gradient(135deg, #a1887f 0%, #5d4037 100%)',
      'Silver': 'linear-gradient(135deg, #bcaaa4 0%, #8d6e63 100%)',
      'Gold': 'linear-gradient(135deg, #ffd54f 0%, #ffb300 100%)',
      'Ruby Crest': 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
      'Amethyst': 'linear-gradient(135deg, #a855f7 0%, #6b21a8 100%)',
      'Emerald': 'linear-gradient(135deg, #10b981 0%, #065f46 100%)',
      'Sapphire': 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)',
      'Diamond Crest': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
    };
    const baseColorKey = Object.keys(badgeColorMap).find(k => badgeName.startsWith(k)) || 'Bronze';
    const gradient = badgeColorMap[baseColorKey];
    const badgeEmojiMap: {[key: string]: string} = {
      'Bronze I': '🥉', 'Bronze II': '🥉✨', 'Bronze III': '🥉🛡️',
      'Silver I': '🥈', 'Silver II': '🥈✨', 'Silver III': '🥈🛡️',
      'Gold I': '🥇', 'Gold II': '🥇✨', 'Gold III': '🥇🛡️',
      'Ruby Crest': '👑🌺',
      'Amethyst I': '🔮', 'Amethyst II': '🔮✨', 'Amethyst III': '🔮🛡️',
      'Emerald I': '🟢', 'Emerald II': '🟢✨', 'Emerald III': '🟢🛡️',
      'Sapphire I': '🔵', 'Sapphire II': '🔵✨', 'Sapphire III': '🔵🛡️',
      'Diamond Crest': '💎🛡️'
    };
    const emoji = badgeEmojiMap[badgeName] || '🥉';

    return (
      <div className="container animate-fade-in" style={{ marginTop: '36px', paddingBottom: '80px' }}>
        
        {/* Header navigation bar */}
        <div className="glass-panel" style={{ padding: '14px 20px', borderRadius: '12px', marginBottom: '24px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 600 }}>
            <span 
              onClick={() => navigate('/reporting')}
              style={{ color: 'var(--accent-color)', cursor: 'pointer' }}
            >
              📊 Reporting & Analytics
            </span>
            <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
            {selectedDept && (
              <>
                <span 
                  onClick={() => navigate('/reporting')}
                  style={{ color: 'var(--accent-color)', cursor: 'pointer' }}
                >
                  {selectedDept.name} Department
                </span>
                <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
              </>
            )}
            <span style={{ color: 'var(--text-primary)' }}>
              {selectedEmployee.name}
            </span>
          </div>

          <Button 
            variant="outline" 
            onClick={() => navigate('/reporting')}
            style={{ padding: '4px 12px', fontSize: '0.8rem' }}
            leftIcon={<ArrowLeft size={14} />}
          >
            Back to Employee Reporting
          </Button>
        </div>

        {/* Employee Summary Card Header */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-color), #3b82f6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.4rem' }}>
              {selectedEmployee.user.first_name[0]}{selectedEmployee.user.last_name[0]}
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {selectedEmployee.name}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                {selectedEmployee.user.employee_code} • {selectedEmployee.email} • {selectedEmployee.department} Department
              </p>
            </div>
          </div>
        </div>

        {/* Summary stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Average Score</span>
            <strong style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-color)', display: 'block', marginTop: '6px' }}>
              {selectedEmployee.avg_score !== undefined && selectedEmployee.avg_score !== null ? `${Math.round(selectedEmployee.avg_score * 10)}%` : 'No data yet'}
            </strong>
          </div>

          <div className="glass-panel" style={{ padding: '20px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Exams Attempted</span>
            <strong style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginTop: '6px' }}>
              {selectedEmployee.exams_attempted}
            </strong>
          </div>

          <div className="glass-panel" style={{ padding: '20px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Current Badge</span>
            {lastBadge ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '10px',
                background: gradient,
                color: '#fff',
                fontSize: '0.72rem',
                fontWeight: '700',
                marginTop: '8px',
                width: 'fit-content'
              }}>
                <span>{emoji}</span>
                <span>{badgeName}</span>
              </span>
            ) : (
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '12px' }}>No badges earned yet.</span>
            )}
          </div>
        </div>

        {/* Course + Marks Table (Primary section) */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 16px 0' }}>Enrolled Course Marks</h3>
          {selectedEmployee.courses.length === 0 ? (
            <div style={{ fontStyle: 'italic', fontSize: '0.88rem', color: 'var(--text-secondary)', padding: '20px 0' }}>
              No courses started yet
            </div>
          ) : (
            <div className="scroll-bar-styled" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>Course Title</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>Score</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>Completed Date</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEmployee.courses.map((course: any) => (
                    <tr key={course.course_id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} className="table-row-hover">
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 700 }}>{course.course_title}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: course.status === 'completed' ? 'color-mix(in srgb, var(--success-color) 10%, transparent)' : 'color-mix(in srgb, var(--warning-color) 10%, transparent)',
                          color: course.status === 'completed' ? 'var(--success-color)' : 'var(--warning-color)'
                        }}>
                          {course.status === 'completed' ? 'Completed' : 'In Progress'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: course.score !== null ? 'var(--accent-color)' : 'var(--text-secondary)' }}>
                        {course.score !== null ? `${Math.round(course.score * 10)}%` : 'No data yet'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {course.completed_at ? new Date(course.completed_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Earned Achievements Section */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 16px 0' }}>Earned Achievements</h3>
          {selectedEmpBadges.length === 0 ? (
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No badges earned yet.</span>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
              {selectedEmpBadges.map((ub: any) => {
                const badgeColorMap: {[key: string]: string} = {
                  'Bronze': 'linear-gradient(135deg, #a1887f 0%, #5d4037 100%)',
                  'Silver': 'linear-gradient(135deg, #bcaaa4 0%, #8d6e63 100%)',
                  'Gold': 'linear-gradient(135deg, #ffd54f 0%, #ffb300 100%)',
                  'Ruby Crest': 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
                  'Amethyst': 'linear-gradient(135deg, #a855f7 0%, #6b21a8 100%)',
                  'Emerald': 'linear-gradient(135deg, #10b981 0%, #065f46 100%)',
                  'Sapphire': 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)',
                  'Diamond Crest': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
                };
                const baseColorKey = Object.keys(badgeColorMap).find(k => ub.badge_tier.name.startsWith(k)) || 'Bronze';
                const gradient = badgeColorMap[baseColorKey];
                const badgeEmojiMap: {[key: string]: string} = {
                  'Bronze I': '🥉', 'Bronze II': '🥉✨', 'Bronze III': '🥉🛡️',
                  'Silver I': '🥈', 'Silver II': '🥈✨', 'Silver III': '🥈🛡️',
                  'Gold I': '🥇', 'Gold II': '🥇✨', 'Gold III': '🥇🛡️',
                  'Ruby Crest': '👑🌺',
                  'Amethyst I': '🔮', 'Amethyst II': '🔮✨', 'Amethyst III': '🔮🛡️',
                  'Emerald I': '🟢', 'Emerald II': '🟢✨', 'Emerald III': '🟢🛡️',
                  'Sapphire I': '🔵', 'Sapphire II': '🔵✨', 'Sapphire III': '🔵🛡️',
                  'Diamond Crest': '💎🛡️'
                };
                const emoji = badgeEmojiMap[ub.badge_tier.name] || '🎖️';
                const dateEarned = new Date(ub.earned_at).toLocaleDateString();

                return (
                  <div 
                    key={ub.id}
                    title={`Earned after completing ${ub.badge_tier.courses_required_cumulative} courses on ${dateEarned}`}
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      gap: '4px', 
                      padding: '10px', 
                      borderRadius: '8px', 
                      background: gradient, 
                      color: '#fff', 
                      fontSize: '0.74rem', 
                      fontWeight: '700',
                      textAlign: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      cursor: 'help'
                    }}
                  >
                    <span style={{ fontSize: '1.4rem' }}>{emoji}</span>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{ub.badge_tier.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ marginTop: '36px', paddingBottom: '80px' }}>
      
      {/* Breadcrumb Header Navigation */}
      <div className="glass-panel" style={{ padding: '14px 20px', borderRadius: '12px', marginBottom: '24px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 600 }}>
          <span 
            onClick={() => { setLevel(1); setSelectedDept(null); }}
            style={{ color: level === 1 ? 'var(--text-primary)' : 'var(--accent-color)', cursor: level > 1 ? 'pointer' : 'default' }}
          >
            📊 Reporting & Analytics
          </span>

          {level >= 2 && selectedDept && (
            <>
              <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
              <span 
                onClick={() => setLevel(2)}
                style={{ color: 'var(--text-primary)', cursor: 'default' }}
              >
                {selectedDept.name} Department
              </span>
            </>
          )}
        </div>

        {level > 1 && (
          <Button 
            variant="outline" 
            onClick={() => {
              setLevel(1);
              setSelectedDept(null);
              sessionStorage.removeItem('kaizen_reporting_selected_dept');
            }}
            style={{ padding: '4px 12px', fontSize: '0.8rem' }}
            leftIcon={<ArrowLeft size={14} />}
          >
            Back
          </Button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="animate-spin" style={{ width: '36px', height: '36px', border: '3px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
        </div>
      ) : (
        <>
          {/* LEVEL 1: Department Cards Grid */}
          {level === 1 && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>🏛️ Department Reporting & Scoped Analytics</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                  Overview of company departments, exam scores, course completion ratios, and review status.
                </p>
              </div>

              {departments.length === 0 ? (
                <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                  No departments found or assigned.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                  {departments.map((dept) => (
                    <div 
                      key={dept.id} 
                      className="glass-panel glow-hover animate-float" 
                      onClick={() => handleSelectDepartment(dept)}
                      style={{ 
                        padding: '24px', 
                        borderRadius: 'var(--border-radius-lg)', 
                        background: 'var(--bg-card)', 
                        border: '1px solid var(--border-color)', 
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '220px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          <Building2 size={20} style={{ color: 'var(--accent-color)' }} />
                          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                            {dept.name}
                          </h3>
                        </div>
                        <span style={{ fontSize: '0.74rem', padding: '3px 8px', borderRadius: '4px', background: 'var(--accent-glow)', color: 'var(--accent-color)', fontWeight: 700 }}>
                          {dept.code}
                        </span>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '12px', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {dept.description || 'No description provided.'}
                        </p>
                      </div>

                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              <Users size={14} /> Employees
                            </div>
                            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', display: 'block', marginTop: '4px' }}>
                              {dept.employee_count}
                            </span>
                          </div>

                          <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              <Award size={14} /> Avg Exam Score
                            </div>
                            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: dept.avg_exam_score ? 'var(--accent-color)' : 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                              {dept.avg_exam_score !== null ? `${Math.round(dept.avg_exam_score * 10)}%` : 'N/A'}
                            </span>
                          </div>
                        </div>

                      </div>

                      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', color: 'var(--accent-color)', fontSize: '0.85rem', fontWeight: 700 }}>
                        View Employees <ArrowRight size={16} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LEVEL 2: Department Employee List / Cards */}
          {level === 2 && selectedDept && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>👥 {selectedDept.name} — Employee Reporting</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>See scores, course progress, and recent activity.</p>
                </div>

                <div style={{ position: 'relative', width: '280px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                  <input 
                    type="text" 
                    className="form-input-styled" 
                    placeholder="Search by name or code..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      sessionStorage.setItem('kaizen_reporting_search', e.target.value);
                    }}
                    style={{ paddingLeft: '36px', height: '40px' }}
                  />
                </div>
              </div>

              {sortedEmployees.length === 0 ? (
                <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                  No employees matched the search filter.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
                  {sortedEmployees.map((emp) => (
                    <div 
                      key={emp.id} 
                      className="glass-panel glow-hover animate-float" 
                      onClick={() => navigate(`/reporting/employees/${emp.id}`)}
                      style={{ 
                        padding: '20px', 
                        borderRadius: 'var(--border-radius-lg)', 
                        background: 'var(--bg-card)', 
                        border: '1px solid var(--border-color)', 
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '16px',
                        transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-glow)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.95rem' }}>
                          {emp.first_name[0]}{emp.last_name[0]}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <h3 style={{ fontSize: '0.98rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {emp.first_name} {emp.last_name}
                          </h3>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                            {emp.employee_code}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Courses Completed:</span>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {emp.courses_completed_count} / {emp.courses_enrolled_count}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Avg Exam Score:</span>
                          {emp.avg_exam_score !== null ? (
                            <span style={{ fontWeight: 800, color: 'var(--accent-color)', padding: '2px 8px', borderRadius: '4px', background: 'var(--accent-glow)' }}>
                              {Math.round(emp.avg_exam_score * 10)}%
                            </span>
                          ) : (
                            <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                              No data yet
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
