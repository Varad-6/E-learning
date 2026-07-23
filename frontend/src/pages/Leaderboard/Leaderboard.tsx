import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, Medal, Award, Building2, ArrowLeft, ChevronRight, FileText, Clock, Calendar, Search, Users
} from 'lucide-react';
import { Button } from '../../components/Button/Button';
import { apiCall } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { getBadgeForCompletions } from '../../services/badge';

interface RankingUser {
  rank: number;
  user_id: string;
  user_name: string;
  employee_code: string;
  department_name: string;
  exams_completed: number;
  courses_completed: number;
  score: number;
  time_taken?: string;
  date?: string;
}

interface DepartmentSummary {
  id: string;
  name: string;
  code: string;
  avg_score: number | null;
  top_performer_name: string | null;
  top_performer_score: number | null;
  employee_count: number;
}

interface ExamOption {
  id: string;
  title: string;
}

interface LeaderboardResponse {
  scope: string;
  department_id: string | null;
  exam_id: string | null;
  rankings: RankingUser[];
  departments: DepartmentSummary[];
  exams: ExamOption[];
}

export const Leaderboard: React.FC = () => {
  const navigate = useNavigate();
  const { triggerToast } = useToast();

  const [departments, setDepartments] = useState<DepartmentSummary[]>([]);
  const [selectedDept, setSelectedDept] = useState<DepartmentSummary | null>(null);
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  
  const [rankings, setRankings] = useState<RankingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [userRole, setUserRole] = useState<string>('Employee');
  const [searchTerm, setSearchTerm] = useState('');

  const myEmpId = localStorage.getItem('profileEmpId') || '';

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const role = localStorage.getItem('isLoggedInRole') || 'Employee';
      setUserRole(role);

      // Employees are auto-scoped by backend to department scope
      const url = role === 'Employee' ? '/api/leaderboard?scope=department' : '/api/leaderboard?scope=global';
      const res = await apiCall(url);
      if (res.ok) {
        const data: LeaderboardResponse = await res.json();
        setDepartments(data.departments || []);
        setExams(data.exams || []);
        
        if (role === 'Employee' && data.departments && data.departments.length > 0) {
          setSelectedDept(data.departments[0]);
          setRankings(data.rankings || []);
        }
      } else {
        triggerToast('Failed to load department summaries.', 'error');
      }
    } catch (e) {
      console.error(e);
      triggerToast('Error fetching leaderboard service.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleSelectExam = async (examId: string) => {
    setSelectedExamId(examId);
    try {
      setTableLoading(true);
      const deptId = selectedDept?.id;
      // Build proper scoped URL
      let url = '';
      if (examId) {
        url = `/api/leaderboard?scope=exam&exam_id=${examId}`;
      } else {
        url = deptId 
          ? `/api/leaderboard?scope=department&department_id=${deptId}`
          : `/api/leaderboard?scope=department`;
      }

      const res = await apiCall(url);
      if (res.ok) {
        const data: LeaderboardResponse = await res.json();
        setRankings(data.rankings || []);
      } else {
        triggerToast('Failed to load leaderboard rankings.', 'error');
      }
    } catch (e) {
      console.error(e);
      triggerToast('Error fetching leaderboard rankings.', 'error');
    } finally {
      setTableLoading(false);
    }
  };

  const handleSelectDeptCard = async (dept: DepartmentSummary) => {
    setSelectedDept(dept);
    setSelectedExamId('');
    try {
      setTableLoading(true);
      const res = await apiCall(`/api/leaderboard?scope=department&department_id=${dept.id}`);
      if (res.ok) {
        const data: LeaderboardResponse = await res.json();
        setRankings(data.rankings || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTableLoading(false);
    }
  };

  const handleBackToDepartments = () => {
    setSelectedDept(null);
    setSelectedExamId('');
    setRankings([]);
    setSearchTerm('');
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontWeight: 800, fontSize: '0.82rem', boxShadow: '0 2px 10px rgba(245, 158, 11, 0.3)' }}>
          <Trophy size={14} /> #1 Gold
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'linear-gradient(135deg, #94a3b8, #64748b)', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontWeight: 800, fontSize: '0.82rem' }}>
          <Medal size={14} /> #2 Silver
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'linear-gradient(135deg, #b45309, #78350f)', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontWeight: 800, fontSize: '0.82rem' }}>
          <Award size={14} /> #3 Bronze
        </div>
      );
    }
    return <span style={{ fontWeight: 800, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>#{rank}</span>;
  };

  // Filter rankings by search term
  const filteredRankings = rankings.filter(r => 
    r.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.employee_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Podium mappings
  const top3 = rankings.slice(0, 3);
  const podiumOrder = [];
  if (top3[1]) podiumOrder.push(top3[1]); // 2nd
  if (top3[0]) podiumOrder.push(top3[0]); // 1st
  if (top3[2]) podiumOrder.push(top3[2]); // 3rd

  return (
    <div className="container animate-fade-in" style={{ marginTop: '36px', paddingBottom: '80px' }}>
      
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--border-radius-lg)', background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.05), rgba(59, 130, 246, 0.05))', border: '1px solid var(--border-color)', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <Trophy size={32} style={{ color: '#f59e0b' }} />
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
              {userRole === 'Employee' ? 'Department Leaderboard & Rankings' : 'Leaderboard & Exam Score Rankings'}
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0 }}>
            {userRole === 'Employee' 
              ? 'Compete and compare course completions and average score accomplishments with your peers.' 
              : 'Drill down into department metrics and select specific exams to inspect detailed learner scoreboards.'}
          </p>
        </div>

        {selectedDept && userRole !== 'Employee' && (
          <Button variant="outline" onClick={handleBackToDepartments} leftIcon={<ArrowLeft size={16} />}>
            Back to Departments
          </Button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="animate-spin" style={{ width: '36px', height: '36px', border: '3px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
        </div>
      ) : (
        <>
          {/* STEP 1: Department Cards View */}
          {!selectedDept && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Step 1: Select a Department</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Click any department card to explore its assigned exams and participant scoreboards.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                {departments.map((dept) => (
                  <div 
                    key={dept.id} 
                    className="glass-panel"
                    onClick={() => handleSelectDeptCard(dept)}
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
                          <Building2 size={24} />
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                          {dept.code}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 12px 0', color: 'var(--text-primary)' }}>{dept.name}</h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                          <span>Members:</span>
                          <strong style={{ color: 'var(--text-primary)' }}>{dept.employee_count} Learners</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                          <span>Avg Exam Score:</span>
                          <strong style={{ color: dept.avg_score ? 'var(--accent-color)' : 'var(--text-muted)' }}>
                            {dept.avg_score ? `${dept.avg_score} / 10` : 'No scores yet'}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                          <span>Top Performer:</span>
                          <strong style={{ color: 'var(--text-primary)' }}>
                            {dept.top_performer_name ? `${dept.top_performer_name} (${dept.top_performer_score})` : 'N/A'}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-color)' }}>View Department Leaderboard</span>
                      <ChevronRight size={16} color="var(--accent-color)" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2 & 3: Department Detail & Exam Leaderboard Table View */}
          {selectedDept && (
            <div className="animate-fade-in">
              <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', marginBottom: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-color)', textTransform: 'uppercase' }}>Selected Department</span>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '4px 0 0 0' }}>{selectedDept.name} ({selectedDept.code})</h2>
                  </div>

                  {/* Step 2: Exam Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>Filter by Exam:</label>
                    <select
                      className="form-input-styled"
                      value={selectedExamId}
                      onChange={(e) => handleSelectExam(e.target.value)}
                      style={{ minWidth: '240px', padding: '8px 12px', fontSize: '0.9rem' }}
                    >
                      <option value="">-- All Exams (Department Average) --</option>
                      {exams.map(ex => (
                        <option key={ex.id} value={ex.id}>{ex.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* RENDER THE PODIUM SECTION */}
              {rankings.length > 0 && !searchTerm && (() => {
                const firstUser = rankings.find(u => u.rank === 1);
                const secondUser = rankings.find(u => u.rank === 2);
                const thirdUser = rankings.find(u => u.rank === 3);

                return (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '20px', margin: '40px 0 50px 0', padding: '20px 0', overflowX: 'auto' }}>
                    
                    {/* 2ND PLACE (LEFT STEP) */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '130px', flexShrink: 0 }}>
                      {secondUser ? (
                        <>
                          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
                            <Medal size={24} style={{ color: '#94a3b8', marginBottom: '4px' }} />
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-glow)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, border: '2px solid #94a3b8' }}>
                              {secondUser.user_name.split(' ').map(n => n[0]).join('')}
                            </div>
                          </div>
                          <strong style={{ fontSize: '0.82rem', textAlign: 'center', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }} title={secondUser.user_name}>
                            {secondUser.user_name}
                          </strong>
                          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-color)', margin: '4px 0' }}>
                            {secondUser.score} / 10
                          </span>
                        </>
                      ) : (
                        <>
                          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px', opacity: 0.4 }}>
                            <Medal size={24} style={{ color: 'var(--text-muted)', marginBottom: '4px' }} />
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontWeight: 800 }}>
                              -
                            </div>
                          </div>
                          <strong style={{ fontSize: '0.82rem', textAlign: 'center', color: 'var(--text-muted)', width: '100%' }}>
                            TBD
                          </strong>
                          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)', margin: '4px 0' }}>
                            - / 10
                          </span>
                        </>
                      )}
                      <div style={{ 
                        height: '90px', 
                        width: '90px', 
                        background: secondUser 
                          ? 'linear-gradient(180deg, rgba(148, 163, 184, 0.25) 0%, rgba(148, 163, 184, 0.05) 100%)'
                          : 'transparent', 
                        border: secondUser ? '2px solid #94a3b8' : '2px dashed var(--border-color)', 
                        borderRadius: '8px 8px 0 0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '900',
                        color: secondUser ? '#94a3b8' : 'var(--text-muted)',
                        fontSize: '1.25rem'
                      }}>
                        2nd
                      </div>
                    </div>

                    {/* 1ST PLACE (MIDDLE STEP - TALLER) */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '140px', flexShrink: 0 }}>
                      {firstUser ? (
                        <>
                          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
                            <Trophy size={32} style={{ color: '#f59e0b', marginBottom: '4px' }} />
                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--accent-glow)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.05rem', border: '3px solid #f59e0b' }}>
                              {firstUser.user_name.split(' ').map(n => n[0]).join('')}
                            </div>
                          </div>
                          <strong style={{ fontSize: '0.9rem', textAlign: 'center', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }} title={firstUser.user_name}>
                            {firstUser.user_name}
                          </strong>
                          <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--accent-color)', margin: '4px 0' }}>
                            {firstUser.score} / 10
                          </span>
                        </>
                      ) : (
                        <>
                          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px', opacity: 0.4 }}>
                            <Trophy size={32} style={{ color: 'var(--text-muted)', marginBottom: '4px' }} />
                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '3px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontWeight: 800 }}>
                              -
                            </div>
                          </div>
                          <strong style={{ fontSize: '0.9rem', textAlign: 'center', color: 'var(--text-muted)', width: '100%' }}>
                            TBD
                          </strong>
                          <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-muted)', margin: '4px 0' }}>
                            - / 10
                          </span>
                        </>
                      )}
                      <div style={{ 
                        height: '130px', 
                        width: '100px', 
                        background: firstUser 
                          ? 'linear-gradient(180deg, rgba(245, 158, 11, 0.3) 0%, rgba(245, 158, 11, 0.05) 100%)' 
                          : 'transparent',
                        border: firstUser ? '2.5px solid #f59e0b' : '2.5px dashed var(--border-color)', 
                        borderRadius: '10px 10px 0 0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '900',
                        color: firstUser ? '#f59e0b' : 'var(--text-muted)',
                        fontSize: '1.5rem',
                        boxShadow: firstUser ? '0 4px 20px rgba(245, 158, 11, 0.15)' : 'none'
                      }}>
                        1st
                      </div>
                    </div>

                    {/* 3RD PLACE (RIGHT STEP) */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '130px', flexShrink: 0 }}>
                      {thirdUser ? (
                        <>
                          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
                            <Award size={24} style={{ color: '#b45309', marginBottom: '4px' }} />
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-glow)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, border: '2px solid #b45309' }}>
                              {thirdUser.user_name.split(' ').map(n => n[0]).join('')}
                            </div>
                          </div>
                          <strong style={{ fontSize: '0.82rem', textAlign: 'center', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }} title={thirdUser.user_name}>
                            {thirdUser.user_name}
                          </strong>
                          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-color)', margin: '4px 0' }}>
                            {thirdUser.score} / 10
                          </span>
                        </>
                      ) : (
                        <>
                          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px', opacity: 0.4 }}>
                            <Award size={24} style={{ color: 'var(--text-muted)', marginBottom: '4px' }} />
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontWeight: 800 }}>
                              -
                            </div>
                          </div>
                          <strong style={{ fontSize: '0.82rem', textAlign: 'center', color: 'var(--text-muted)', width: '100%' }}>
                            TBD
                          </strong>
                          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)', margin: '4px 0' }}>
                            - / 10
                          </span>
                        </>
                      )}
                      <div style={{ 
                        height: '70px', 
                        width: '90px', 
                        background: thirdUser 
                          ? 'linear-gradient(180deg, rgba(180, 83, 9, 0.2) 0%, rgba(180, 83, 9, 0.05) 100%)' 
                          : 'transparent',
                        border: thirdUser ? '2px solid #b45309' : '2px dashed var(--border-color)', 
                        borderRadius: '8px 8px 0 0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '900',
                        color: thirdUser ? '#b45309' : 'var(--text-muted)',
                        fontSize: '1.15rem'
                      }}>
                        3rd
                      </div>
                    </div>

                  </div>
                );
              })()}

              {/* SEARCH BAR */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <div style={{ position: 'relative', width: '300px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    className="form-input-styled"
                    placeholder="Search by name or code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', paddingLeft: '36px', height: '40px', minHeight: '40px', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              {/* Step 3: Table rendering */}
              {tableLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                  <div className="animate-spin" style={{ width: '36px', height: '36px', border: '3px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
                </div>
              ) : filteredRankings.length === 0 ? (
                <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <Users size={48} style={{ opacity: 0.3, marginBottom: '16px', color: 'var(--accent-color)' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 8px 0' }}>No Rankings Found</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                    {searchTerm ? 'No members matched search criteria.' : 'There are no graded submissions yet.'}
                  </p>
                </div>
              ) : (
                <div className="glass-panel scroll-bar-styled" style={{ borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                        <th style={{ padding: '16px 20px', width: '120px', fontWeight: 800, color: 'var(--text-primary)' }}>Rank</th>
                        <th style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--text-primary)' }}>Name</th>
                        <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)' }}>Score / 10</th>
                        <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 800, color: 'var(--text-secondary)' }}>Exams Taken</th>
                        <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 800, color: 'var(--text-secondary)' }}>Info</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRankings.map((user) => {
                        const isMe = user.employee_code === myEmpId;
                        const badgeObj = getBadgeForCompletions(user.courses_completed || 0);

                        return (
                          <React.Fragment key={user.user_id}>
                            <tr 
                              style={{ 
                                borderBottom: isMe ? 'none' : '1px solid var(--border-color)', 
                                transition: 'background 0.2s ease',
                                background: isMe ? 'rgba(20, 168, 0, 0.04)' : 'transparent',
                                borderLeft: isMe ? '3px solid var(--accent-color)' : 'none'
                              }} 
                              className="table-row-hover"
                            >
                              <td style={{ padding: '16px 20px' }}>
                                {getRankBadge(user.rank)}
                              </td>
                              <td style={{ padding: '16px 20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--accent-glow)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                                    {user.user_name.split(' ').map(n => n[0]).join('')}
                                  </div>
                                  <div>
                                    <strong style={{ color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                      {user.user_name}
                                      {isMe && (
                                        <span style={{ fontSize: '0.68rem', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', background: 'var(--accent-color)', color: '#fff' }}>
                                          You
                                        </span>
                                      )}
                                      {badgeObj && (
                                        <span style={{ fontSize: '1rem', cursor: 'help' }} title={`${badgeObj.name} (Level ${badgeObj.step})`}>
                                          {badgeObj.icon}
                                        </span>
                                      )}
                                    </strong>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>{user.employee_code}</span>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                <span style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--accent-color)', padding: '4px 12px', borderRadius: '6px', background: 'var(--accent-glow)' }}>
                                  {user.score} / 10
                                </span>
                              </td>
                              <td style={{ padding: '16px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <FileText size={14} /> {user.exams_completed}
                                </div>
                              </td>
                              <td style={{ padding: '16px 20px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                {user.time_taken ? (
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                                    <Clock size={12} /> {user.time_taken}
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '0.8rem' }}>{user.department_name}</span>
                                )}
                              </td>
                            </tr>

                            {/* Motivator line right under user's highlighted row */}
                            {isMe && (
                              <tr style={{ background: 'rgba(20, 168, 0, 0.04)', borderBottom: '1px solid var(--border-color)', borderLeft: '3px solid var(--accent-color)' }}>
                                <td colSpan={5} style={{ padding: '0px 20px 14px 20px', fontSize: '0.82rem' }}>
                                  {user.rank === 1 ? (
                                    <div style={{ color: 'var(--accent-color)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      👑 <span>Excellent! You are leading the department leaderboard! Keep up the great work!</span>
                                    </div>
                                  ) : (
                                    (() => {
                                      // Get player ranked right above
                                      const prevUser = rankings[user.rank - 2];
                                      if (!prevUser) return null;
                                      const diff = (prevUser.score - user.score).toFixed(2);
                                      return (
                                        <div style={{ color: 'var(--accent-color)', fontWeight: '600' }}>
                                          💡 You are ranked #{user.rank}. You are only <span style={{ textDecoration: 'underline' }}>{diff} points</span> behind #{prevUser.rank} ({prevUser.user_name})! Complete more exams to rank up!
                                        </div>
                                      );
                                    })()
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
