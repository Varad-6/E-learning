import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, Medal, Award, Building2, ArrowLeft, ChevronRight, FileText, Clock, Calendar, Search, Users, ArrowUp, ArrowDown
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
  delta: number | string;
  time_taken?: string;
  date?: string;
  badge_name?: string;
  badge_asset_ref?: string;
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

  const getBadgeEmoji = (badgeName: string | null | undefined): string => {
    if (!badgeName) return '🥉';
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
    return badgeEmojiMap[badgeName] || '🎖️';
  };

  const [departments, setDepartments] = useState<DepartmentSummary[]>([]);
  const [selectedDept, setSelectedDept] = useState<DepartmentSummary | null>(null);
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  
  const [rankings, setRankings] = useState<RankingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const savedRole = localStorage.getItem('isLoggedInRole');
  const isManager = savedRole === 'Manager';

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
        
        if (data.departments && data.departments.length > 0) {
          if (isManager || savedRole === 'Employee' || data.departments.length === 1) {
            const userDept = data.departments[0];
            setSelectedDept(userDept);
            loadRankings(userDept.id, null);
          }
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

  const loadRankings = async (deptId: string | null, examId: string | null) => {
    try {
      setTableLoading(true);
      let url = '/api/leaderboard';
      if (examId) {
        url = `/api/leaderboard?scope=exam&exam_id=${examId}`;
      } else if (deptId) {
        url = `/api/leaderboard?scope=department&department_id=${deptId}`;
      } else {
        url = `/api/leaderboard?scope=global`;
      }
      
      const res = await apiCall(url);
      if (res.ok) {
        const data = await res.json();
        setRankings(data.rankings || []);
      } else {
        triggerToast('Failed to load leaderboard rankings.', 'error');
      }
    } catch (e) {
      console.error(e);
      triggerToast('Error loading leaderboard.', 'error');
    } finally {
      setTableLoading(false);
    }
  };

  const handleSelectExam = (examId: string) => {
    setSelectedExamId(examId);
    loadRankings(selectedDept ? selectedDept.id : null, examId || null);
  };

  const handleSelectDeptCard = (dept: DepartmentSummary) => {
    setSelectedDept(dept);
    setSelectedExamId('');
    loadRankings(dept.id, null);
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

  const renderDelta = (delta: number | string) => {
    if (delta === 'New') {
      return (
        <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 'bold' }}>
          NEW
        </span>
      );
    }
    const num = Number(delta);
    if (isNaN(num) || num === 0) {
      return <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>&ndash;</span>;
    }
    if (num > 0) {
      return (
        <span style={{ color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.78rem', fontWeight: 'bold' }}>
          <ArrowUp size={12} /> +{num}
        </span>
      );
    }
    return (
      <span style={{ color: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.78rem', fontWeight: 'bold' }}>
        <ArrowDown size={12} /> {num}
      </span>
    );
  };

  // Extract top performers
  const rank1 = rankings.find(r => r.rank === 1);
  const rank2 = rankings.find(r => r.rank === 2);
  const rank3 = rankings.find(r => r.rank === 3);

  // Filter rankings by search term
  const filteredRankings = rankings.filter(r => 
    r.user_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container animate-fade-in" style={{ marginTop: '36px', paddingBottom: '80px' }}>
      
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--border-radius-lg)', background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.05), rgba(79, 70, 229, 0.05))', border: '1px solid var(--border-color)', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <Trophy size={32} style={{ color: '#f59e0b' }} />
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Leaderboard Rankings</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0 }}>
            {isManager 
              ? "Examine your department's top learners, exam scores, and progression metrics."
              : "Drill down into department metrics and select specific exams to inspect detailed learner scoreboards."}
          </p>
        </div>

        {!isManager && selectedDept && (
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
          {/* STEP 1: Department Cards View (Admins only) */}
          {!selectedDept && !isManager && (
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
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-color)', textTransform: 'uppercase' }}>Department</span>
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
                      <option value="">-- Department-wide Average --</option>
                      {exams.map(ex => (
                        <option key={ex.id} value={ex.id}>{ex.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {tableLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                  <div className="animate-spin" style={{ width: '36px', height: '36px', border: '3px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
                </div>
              ) : rankings.length === 0 ? (
                <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <Users size={48} style={{ opacity: 0.3, marginBottom: '16px', color: 'var(--accent-color)' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 8px 0' }}>No Performance Submissions</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>There are no graded exam submissions yet for this department.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Purple Premium Podium Section for Top 3 */}
                  <div className="glass-panel" style={{
                    padding: '32px 24px',
                    borderRadius: 'var(--border-radius-lg)',
                    background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)',
                    border: '1px solid rgba(124, 58, 237, 0.2)',
                    boxShadow: '0 8px 32px rgba(124, 58, 237, 0.05)'
                  }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: '32px', letterSpacing: '0.5px' }}>
                      🏆 Top Performers
                    </h3>
                    
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'flex-end',
                      gap: '16px',
                      maxWidth: '540px',
                      margin: '0 auto',
                      width: '100%'
                    }}>
                      
                      {/* Podium #2: Silver (Left) */}
                      {rank2 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                          <div style={{ position: 'relative', marginBottom: '12px' }}>
                            <div style={{ 
                              width: '64px', 
                              height: '64px', 
                              borderRadius: '50%', 
                              background: 'linear-gradient(135deg, #cbd5e1, #64748b)', 
                              color: '#fff', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              fontWeight: 800, 
                              fontSize: '1.25rem', 
                              border: '3px solid #94a3b8', 
                              boxShadow: '0 4px 12px rgba(0,0,0,0.25)' 
                            }}>
                              {rank2.user_name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '22px', height: '22px', borderRadius: '50%', background: '#64748b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 900, border: '2px solid var(--bg-card)' }}>2</div>
                          </div>
                          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'center', display: 'block', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rank2.user_name}</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--accent-color)', fontWeight: 700, marginTop: '2px' }}>{rank2.score} Avg</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span>{getBadgeEmoji(rank2.badge_name)}</span>
                            <span>{rank2.badge_name || "Bronze I"}</span>
                          </span>
                          
                          {/* Column base */}
                          <div style={{ 
                            height: '70px', 
                            width: '50px', 
                            background: 'rgba(99, 102, 241, 0.15)', 
                            border: '1px solid rgba(99, 102, 241, 0.3)', 
                            borderBottom: 'none', 
                            borderRadius: '8px 8px 0 0', 
                            marginTop: '12px', 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center' 
                          }}>
                            <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 900, fontSize: '1rem' }}>#2</span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ flex: 1 }} />
                      )}

                      {/* Podium #1: Gold (Center - Elevated) */}
                      {rank1 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1.25, transform: 'translateY(-16px)' }}>
                          <div style={{ position: 'relative', marginBottom: '12px' }}>
                            <div style={{ 
                              width: '80px', 
                              height: '80px', 
                              borderRadius: '50%', 
                              background: 'linear-gradient(135deg, #fbbf24, #d97706)', 
                              color: '#fff', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              fontWeight: 900, 
                              fontSize: '1.6rem', 
                              border: '4px solid #f59e0b', 
                              boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4)' 
                            }}>
                              {rank1.user_name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '26px', height: '26px', borderRadius: '50%', background: '#fbbf24', color: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 900, border: '2px solid var(--bg-card)', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>1</div>
                          </div>
                          <span style={{ fontSize: '0.92rem', fontWeight: 900, color: 'var(--text-primary)', textAlign: 'center', display: 'block', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rank1.user_name}</span>
                          <span style={{ fontSize: '0.85rem', color: '#fbbf24', fontWeight: 800, marginTop: '2px' }}>{rank1.score} Avg</span>
                          <span style={{ fontSize: '0.72rem', color: '#fbbf24', marginTop: '2px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span>{getBadgeEmoji(rank1.badge_name)}</span>
                            <span>{rank1.badge_name || "Bronze I"}</span>
                          </span>
                          
                          {/* Column base */}
                          <div style={{ 
                            height: '110px', 
                            width: '60px', 
                            background: 'linear-gradient(to top, rgba(124, 58, 237, 0.35) 0%, rgba(99, 102, 241, 0.25) 100%)', 
                            border: '1px solid rgba(124, 58, 237, 0.5)', 
                            borderBottom: 'none', 
                            borderRadius: '8px 8px 0 0', 
                            marginTop: '12px', 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center',
                            boxShadow: '0 4px 20px rgba(124, 58, 237, 0.15)'
                          }}>
                            <span style={{ color: '#fbbf24', fontWeight: 900, fontSize: '1.2rem', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>#1</span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ flex: 1.25 }} />
                      )}

                      {/* Podium #3: Bronze (Right) */}
                      {rank3 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                          <div style={{ position: 'relative', marginBottom: '12px' }}>
                            <div style={{ 
                              width: '64px', 
                              height: '64px', 
                              borderRadius: '50%', 
                              background: 'linear-gradient(135deg, #d97706, #78350f)', 
                              color: '#fff', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              fontWeight: 800, 
                              fontSize: '1.25rem', 
                              border: '3px solid #b45309', 
                              boxShadow: '0 4px 12px rgba(0,0,0,0.25)' 
                            }}>
                              {rank3.user_name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '22px', height: '22px', borderRadius: '50%', background: '#b45309', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 900, border: '2px solid var(--bg-card)' }}>3</div>
                          </div>
                          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'center', display: 'block', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rank3.user_name}</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--accent-color)', fontWeight: 700, marginTop: '2px' }}>{rank3.score} Avg</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span>{getBadgeEmoji(rank3.badge_name)}</span>
                            <span>{rank3.badge_name || "Bronze I"}</span>
                          </span>
                          
                          {/* Column base */}
                          <div style={{ 
                            height: '50px', 
                            width: '50px', 
                            background: 'rgba(99, 102, 241, 0.15)', 
                            border: '1px solid rgba(99, 102, 241, 0.3)', 
                            borderBottom: 'none', 
                            borderRadius: '8px 8px 0 0', 
                            marginTop: '12px', 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center' 
                          }}>
                            <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 900, fontSize: '1rem' }}>#3</span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ flex: 1 }} />
                      )}

                    </div>
                  </div>

                  {/* Ranked List Section */}
                  <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    
                    {/* Header & Search Bar inside List Card */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={18} style={{ color: 'var(--accent-color)' }} />
                        Leaderboard Rankings List
                      </h4>

                      <div style={{ position: 'relative', width: '260px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                          type="text"
                          className="form-input-styled"
                          placeholder="Search learners by name..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px 8px 36px', fontSize: '0.85rem', height: '36px' }}
                        />
                      </div>
                    </div>

                    {filteredRankings.length === 0 ? (
                      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        No performers matched your search term.
                      </div>
                    ) : (
                      <div className="scroll-bar-styled" style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
                              <th style={{ padding: '14px 16px', width: '100px', fontWeight: 800, color: 'var(--text-primary)' }}>Rank</th>
                              <th style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--text-primary)' }}>Learner</th>
                              <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)' }}>Score / 10</th>
                              <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 800, color: 'var(--text-secondary)' }}>Trend</th>
                              <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 800, color: 'var(--text-secondary)' }}>Exams</th>
                              <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, color: 'var(--text-secondary)' }}>Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredRankings.map((user) => {
                              const profileEmpId = localStorage.getItem('profileEmpId');
                              const profileName = localStorage.getItem('profileName');
                              const isSelf = (profileEmpId && user.employee_code === profileEmpId) || (profileName && user.user_name.toLowerCase() === profileName.toLowerCase());

                              return (
                                <tr 
                                  key={user.user_id} 
                                  style={{ 
                                    borderBottom: '1px solid var(--border-color)', 
                                    transition: 'background 0.2s ease',
                                    background: isSelf ? 'rgba(59, 130, 246, 0.08)' : undefined,
                                    borderLeft: isSelf ? '4px solid var(--accent-color)' : undefined
                                  }} 
                                  className="table-row-hover"
                                >
                                  <td style={{ padding: '14px 16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      {getRankBadge(user.rank)}
                                      <span style={{ fontSize: '1.1rem' }} title={user.badge_name || "Bronze I"}>
                                        {getBadgeEmoji(user.badge_name)}
                                      </span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '14px 16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <div style={{ 
                                        width: '32px', 
                                        height: '32px', 
                                        borderRadius: '50%', 
                                        background: isSelf ? 'var(--accent-color)' : 'var(--accent-glow)', 
                                        color: isSelf ? '#fff' : 'var(--accent-color)', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        fontWeight: 800, 
                                        fontSize: '0.8rem' 
                                      }}>
                                        {user.user_name.split(' ').map(n => n[0]).join('')}
                                      </div>
                                      <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <strong style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>{user.user_name}</strong>
                                          {isSelf && (
                                            <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'var(--accent-color)', color: '#fff', fontWeight: 800 }}>YOU</span>
                                          )}
                                        </div>
                                         <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                           <span>{user.employee_code}</span> &bull; 
                                           <span>{user.department_name}</span> &bull; 
                                           {user.badge_asset_ref && (
                                             <img 
                                               src={`/badges/${user.badge_asset_ref}.png`} 
                                               alt={user.badge_name} 
                                               style={{ width: '16px', height: '16px', objectFit: 'contain', display: 'inline-block' }} 
                                             />
                                           )}
                                           <strong style={{ color: 'var(--accent-color)' }}>{user.badge_name || "Bronze III"}</strong>
                                         </span>
                                      </div>
                                    </div>
                                  </td>
                                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-color)', padding: '4px 10px', borderRadius: '6px', background: 'var(--accent-glow)' }}>
                                    {user.score} / 10
                                  </span>
                                </td>
                                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                  {renderDelta(user.delta)}
                                </td>
                                <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                                  {user.exams_completed} Attempted
                                </td>
                                <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                                  {user.time_taken ? `Duration: ${user.time_taken}` : 'Department Ranks'}
                                </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
