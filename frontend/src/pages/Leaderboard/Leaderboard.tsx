import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, Medal, Award, Building2, ArrowLeft, ChevronRight, FileText, Clock, Calendar, Search, Users
} from 'lucide-react';
import { Button } from '../../components/Button/Button';
import { apiCall } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface RankingUser {
  rank: number;
  user_id: string;
  user_name: string;
  employee_code: string;
  department_name: string;
  exams_completed: number;
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

  // State for drill-down steps
  // selectedDept: null -> Step 1 (Department Cards)
  // selectedDept: Dept -> Step 2 (Select Exam)
  // selectedExamId: set -> Step 3 (Table rendered)
  const [departments, setDepartments] = useState<DepartmentSummary[]>([]);
  const [selectedDept, setSelectedDept] = useState<DepartmentSummary | null>(null);
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  
  const [rankings, setRankings] = useState<RankingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);

  // Initial fetch for Step 1
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const res = await apiCall('/api/leaderboard?scope=global');
      if (res.ok) {
        const data: LeaderboardResponse = await res.json();
        setDepartments(data.departments || []);
        setExams(data.exams || []);
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

  // Fetch exam leaderboard when an exam is selected in Step 3
  const handleSelectExam = async (examId: string) => {
    setSelectedExamId(examId);
    if (!examId) {
      setRankings([]);
      return;
    }

    try {
      setTableLoading(true);
      const res = await apiCall(`/api/leaderboard?scope=exam&exam_id=${examId}`);
      if (res.ok) {
        const data: LeaderboardResponse = await res.json();
        setRankings(data.rankings || []);
      } else {
        triggerToast('Failed to load exam leaderboard rankings.', 'error');
      }
    } catch (e) {
      console.error(e);
      triggerToast('Error fetching exam leaderboard.', 'error');
    } finally {
      setTableLoading(false);
    }
  };

  const handleSelectDeptCard = (dept: DepartmentSummary) => {
    setSelectedDept(dept);
    setSelectedExamId('');
    setRankings([]);
  };

  const handleBackToDepartments = () => {
    setSelectedDept(null);
    setSelectedExamId('');
    setRankings([]);
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

  return (
    <div className="container animate-fade-in" style={{ marginTop: '36px', paddingBottom: '80px' }}>
      
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--border-radius-lg)', background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.05), rgba(59, 130, 246, 0.05))', border: '1px solid var(--border-color)', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <Trophy size={32} style={{ color: '#f59e0b' }} />
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Leaderboard & Exam Score Rankings</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0 }}>
            Drill down into department metrics and select specific exams to inspect detailed learner scoreboards.
          </p>
        </div>

        {selectedDept && (
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
                    <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>Select Exam:</label>
                    <select
                      className="form-input-styled"
                      value={selectedExamId}
                      onChange={(e) => handleSelectExam(e.target.value)}
                      style={{ minWidth: '240px', padding: '8px 12px', fontSize: '0.9rem' }}
                    >
                      <option value="">-- Choose Exam --</option>
                      {exams.map(ex => (
                        <option key={ex.id} value={ex.id}>{ex.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 3: Table rendering */}
              {!selectedExamId ? (
                <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <FileText size={48} style={{ opacity: 0.3, marginBottom: '16px', color: 'var(--accent-color)' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 8px 0' }}>No Exam Selected</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Please select an exam from the dropdown above to display the participant rankings table.</p>
                </div>
              ) : tableLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                  <div className="animate-spin" style={{ width: '36px', height: '36px', border: '3px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
                </div>
              ) : rankings.length === 0 ? (
                <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <Users size={48} style={{ opacity: 0.3, marginBottom: '16px', color: 'var(--accent-color)' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 8px 0' }}>No Submissions Found</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>There are no graded submissions yet for this exam.</p>
                </div>
              ) : (
                <div className="glass-panel scroll-bar-styled" style={{ borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                        <th style={{ padding: '16px 20px', width: '120px', fontWeight: 800, color: 'var(--text-primary)' }}>Rank</th>
                        <th style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--text-primary)' }}>Name</th>
                        <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)' }}>Score / 10</th>
                        <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 800, color: 'var(--text-secondary)' }}>Time Taken</th>
                        <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 800, color: 'var(--text-secondary)' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankings.map((user) => (
                        <tr key={user.user_id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s ease' }} className="table-row-hover">
                          <td style={{ padding: '16px 20px' }}>
                            {getRankBadge(user.rank)}
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--accent-glow)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                                {user.user_name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <strong style={{ color: 'var(--text-primary)', display: 'block' }}>{user.user_name}</strong>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user.employee_code}</span>
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
                              <Clock size={14} /> {user.time_taken || 'N/A'}
                            </div>
                          </td>
                          <td style={{ padding: '16px 20px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <Calendar size={14} /> {user.date || 'N/A'}
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
        </>
      )}
    </div>
  );
};
