import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Users, BookOpen, Award, Clock, ArrowRight, ArrowLeft,
  ChevronRight, Search, TrendingUp, CheckCircle, AlertCircle, FileText, User
} from 'lucide-react';
import { Button } from '../../components/Button/Button';
import { apiCall } from '../../services/api';
import { useToast } from '../../context/ToastContext';

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
}

export const ReportingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { triggerToast } = useToast();

  // Navigation Level State: 1 = Dept Cards, 2 = Dept Employee List, 3 = Employee Detail
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(true);

  // Data states
  const [departments, setDepartments] = useState<DepartmentSummary[]>([]);
  const [selectedDept, setSelectedDept] = useState<DepartmentSummary | null>(null);
  const [deptEmployees, setDeptEmployees] = useState<EmployeeSummary[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfileDetail | null>(null);

  // Table filters & sorting
  const [searchTerm, setSearchTerm] = useState('');
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
        // If Manager has 1 department, can auto-select if desired, but keep Level 1 clear
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

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Drill down to Level 2
  const handleSelectDepartment = async (dept: DepartmentSummary) => {
    setSelectedDept(dept);
    setLevel(2);
    setSearchTerm('');
    setLoading(true);
    try {
      const res = await apiCall(`/api/reporting/departments/${dept.id}/employees`);
      if (res.ok) {
        const data = await res.json();
        setDeptEmployees(data.employees || []);
      } else {
        const err = await res.json();
        triggerToast(`Error loading roster: ${err.detail}`, 'error');
      }
    } catch (e) {
      console.error(e);
      triggerToast('Failed to fetch department roster.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Drill down to Level 3
  const handleSelectEmployee = async (empId: string) => {
    setLevel(3);
    setLoading(true);
    try {
      const res = await apiCall(`/api/reporting/employees/${empId}/detail`);
      if (res.ok) {
        const data: EmployeeProfileDetail = await res.json();
        setSelectedEmployee(data);
      } else {
        const err = await res.json();
        triggerToast(`Error loading profile: ${err.detail}`, 'error');
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

  return (
    <div className="container animate-fade-in" style={{ marginTop: '36px', paddingBottom: '80px' }}>
      
      {/* Breadcrumb Header Navigation */}
      <div className="glass-panel" style={{ padding: '14px 20px', borderRadius: '12px', marginBottom: '24px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 600 }}>
          <span 
            onClick={() => { setLevel(1); setSelectedDept(null); setSelectedEmployee(null); }}
            style={{ color: level === 1 ? 'var(--text-primary)' : 'var(--accent-color)', cursor: level > 1 ? 'pointer' : 'default' }}
          >
            📊 Reporting & Analytics
          </span>

          {level >= 2 && selectedDept && (
            <>
              <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
              <span 
                onClick={() => { setLevel(2); setSelectedEmployee(null); }}
                style={{ color: level === 2 ? 'var(--text-primary)' : 'var(--accent-color)', cursor: level > 2 ? 'pointer' : 'default' }}
              >
                {selectedDept.name} Department
              </span>
            </>
          )}

          {level === 3 && selectedEmployee && (
            <>
              <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ color: 'var(--text-primary)' }}>
                {selectedEmployee.user.first_name} {selectedEmployee.user.last_name}
              </span>
            </>
          )}
        </div>

        {level > 1 && (
          <Button 
            variant="outline" 
            onClick={() => {
              if (level === 3) setLevel(2);
              else if (level === 2) { setLevel(1); setSelectedDept(null); }
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
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: 'var(--accent-glow)', color: 'var(--accent-color)', textTransform: 'uppercase' }}>
                              {dept.code}
                            </span>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: '8px 0 2px 0' }}>{dept.name}</h3>
                          </div>
                          <Building2 size={24} style={{ color: 'var(--accent-color)', opacity: 0.8 }} />
                        </div>

                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.4' }}>
                          {dept.description || 'Department team details'}
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                          <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              <Users size={14} /> Employees
                            </div>
                            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginTop: '4px' }}>
                              {dept.employee_count}
                            </span>
                          </div>

                          <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              <Award size={14} /> Avg Exam Score
                            </div>
                            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: dept.avg_exam_score ? 'var(--accent-color)' : 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                              {dept.avg_exam_score !== null ? `${dept.avg_exam_score} / 10` : 'N/A'}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '10px 0', borderTop: '1px solid var(--border-color)' }}>
                          <span>Courses Completed: <strong style={{ color: '#10b981' }}>{dept.courses_completed_count}</strong></span>
                          <span>In Progress: <strong style={{ color: 'var(--accent-color)' }}>{dept.courses_in_progress_count}</strong></span>
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

          {/* LEVEL 2: Department Employee List */}
          {level === 2 && selectedDept && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>👥 {selectedDept.name} — Employees</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>See scores, course progress, and recent activity.</p>
                </div>

                <div style={{ position: 'relative', width: '280px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                  <input 
                    type="text" 
                    className="form-input-styled" 
                    placeholder="Search by name or code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ paddingLeft: '36px', height: '40px' }}
                  />
                </div>
              </div>

              {sortedEmployees.length === 0 ? (
                <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                  No employees matched the search filter.
                </div>
              ) : (
                <div className="glass-panel scroll-bar-styled" style={{ borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                        <th 
                          onClick={() => handleSort('name')} 
                          style={{ padding: '14px 20px', cursor: 'pointer', fontWeight: 700, color: 'var(--text-primary)' }}
                        >
                          Employee Name {sortField === 'name' ? (sortAsc ? '↑' : '↓') : ''}
                        </th>
                        <th style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--text-secondary)' }}>Role</th>
                        <th 
                          onClick={() => handleSort('courses')} 
                          style={{ padding: '14px 20px', cursor: 'pointer', fontWeight: 700, color: 'var(--text-primary)' }}
                        >
                          Courses (Completed/Enrolled) {sortField === 'courses' ? (sortAsc ? '↑' : '↓') : ''}
                        </th>
                        <th 
                          onClick={() => handleSort('score')} 
                          style={{ padding: '14px 20px', cursor: 'pointer', fontWeight: 700, color: 'var(--text-primary)' }}
                        >
                          Avg Exam Score {sortField === 'score' ? (sortAsc ? '↑' : '↓') : ''}
                        </th>
                        <th 
                          onClick={() => handleSort('activity')} 
                          style={{ padding: '14px 20px', cursor: 'pointer', fontWeight: 700, color: 'var(--text-primary)' }}
                        >
                          Last Activity {sortField === 'activity' ? (sortAsc ? '↑' : '↓') : ''}
                        </th>
                        <th style={{ padding: '14px 20px', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedEmployees.map((emp) => (
                        <tr 
                          key={emp.id} 
                          style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s ease' }}
                          className="table-row-hover"
                        >
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-glow)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                                {emp.first_name[0]}{emp.last_name[0]}
                              </div>
                              <div>
                                <strong style={{ color: 'var(--text-primary)', display: 'block' }}>{emp.first_name} {emp.last_name}</strong>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{emp.employee_code} • {emp.email}</span>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '14px 20px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
                              {emp.role_name}
                            </span>
                          </td>

                          <td style={{ padding: '14px 20px' }}>
                            <span style={{ fontWeight: 700, color: '#10b981' }}>{emp.courses_completed_count}</span>
                            <span style={{ color: 'var(--text-secondary)' }}> / {emp.courses_enrolled_count}</span>
                          </td>

                          <td style={{ padding: '14px 20px' }}>
                            {emp.avg_exam_score !== null ? (
                              <span style={{ fontWeight: 800, color: 'var(--accent-color)', padding: '4px 8px', borderRadius: '6px', background: 'var(--accent-glow)' }}>
                                {emp.avg_exam_score} / 10
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.8rem' }}>No exams</span>
                            )}
                          </td>

                          <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                            {emp.last_activity_date ? new Date(emp.last_activity_date).toLocaleDateString() : 'N/A'}
                          </td>

                          <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                            <Button 
                              variant="outline" 
                              onClick={() => handleSelectEmployee(emp.id)}
                              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                            >
                              View Detail Profile
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* LEVEL 3: Individual Employee Full Profile & Score Trend */}
          {level === 3 && selectedEmployee && (
            <div>
              {/* Employee Summary Card Header */}
              <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-color), #3b82f6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.4rem' }}>
                    {selectedEmployee.user.first_name[0]}{selectedEmployee.user.last_name[0]}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      {selectedEmployee.user.first_name} {selectedEmployee.user.last_name}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                      {selectedEmployee.user.employee_code} • {selectedEmployee.user.email} • {selectedEmployee.user.department_name} Department
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ padding: '10px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>Courses Enrolled</span>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{selectedEmployee.courses.length}</strong>
                  </div>

                  <div style={{ padding: '10px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>Exams Taken</span>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--accent-color)' }}>{selectedEmployee.exams.length}</strong>
                  </div>
                </div>
              </div>

              {/* Grid: Left Column Courses & Exams; Right Column Score Trend Chart */}
              <div style={{ display: 'grid', gridTemplateColumns: selectedEmployee.score_trend.length >= 3 ? '1fr 340px' : '1fr', gap: '28px', alignItems: 'flex-start' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

                  {/* Taken Exams & Reviewer Feedback */}
                  <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 16px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                      📝 Exam Submissions & Reviewer Marks ({selectedEmployee.exams.length})
                    </h3>

                    {selectedEmployee.exams.length === 0 ? (
                      <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>No exams submitted yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {selectedEmployee.exams.map(e => (
                          <div key={e.submission_id} style={{ padding: '16px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{e.exam_title}</h4>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: e.status === 'graded' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(249, 115, 22, 0.15)', color: e.status === 'graded' ? '#10b981' : 'var(--warning-color)' }}>
                                  {e.status === 'graded' ? 'REVIEWED' : 'PENDING REVIEW'}
                                </span>

                                {e.overall_score !== null && (
                                  <span style={{ fontSize: '0.9rem', fontWeight: 800, padding: '2px 10px', borderRadius: '6px', background: 'var(--accent-glow)', color: 'var(--accent-color)' }}>
                                    {e.overall_score} / 10
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Grader Feedback block */}
                            {e.overall_feedback ? (
                              <div style={{ marginTop: '12px', padding: '12px', borderRadius: '6px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.15)', fontSize: '0.85rem' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-color)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                                  💬 Grader Feedback ({e.grader_name})
                                </span>
                                <p style={{ margin: 0, color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: '1.4' }}>"{e.overall_feedback}"</p>
                              </div>
                            ) : (
                              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '8px 0 0 0', fontStyle: 'italic' }}>
                                {e.status === 'graded' ? 'No written feedback provided by grader.' : 'Awaiting reviewer grading.'}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* Score Trend Visual Chart (Shown when 3+ scored exams exist) */}
                {selectedEmployee.score_trend.length >= 3 && (
                  <div className="glass-panel glow-hover animate-float" style={{ padding: '24px', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TrendingUp size={18} style={{ color: 'var(--accent-color)' }} />
                      Exam Score Progression
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                      Chronological score performance trend across {selectedEmployee.score_trend.length} exams.
                    </p>

                    {/* Clean SVG Trend Chart */}
                    <div style={{ padding: '16px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '140px', gap: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
                        {selectedEmployee.score_trend.map((pt, idx) => {
                          const heightPercent = Math.max(10, (pt.score / 10) * 100);
                          return (
                            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-color)', marginBottom: '4px' }}>
                                {pt.score}
                              </span>
                              <div 
                                style={{ 
                                  width: '100%', 
                                  maxWidth: '24px', 
                                  height: `${heightPercent}%`, 
                                  background: 'linear-gradient(180deg, var(--accent-color), rgba(0, 242, 254, 0.2))', 
                                  borderRadius: '4px 4px 0 0',
                                  transition: 'height 0.4s ease'
                                }} 
                              />
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                        <span>Exam 1</span>
                        <span>Latest Exam</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
