import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, Medal, Award, Flame, Filter, Target, User, Building2, CheckCircle
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
}

interface CurrentUserRank {
  rank: number | null;
  total_participants: number;
  score: number | null;
  exams_completed: number;
  min_required?: number;
  department_name: string;
}

interface LeaderboardData {
  scope: 'global' | 'department' | 'exam';
  department_id: string | null;
  exam_id: string | null;
  min_exams: number;
  current_user_rank: CurrentUserRank | null;
  rankings: RankingUser[];
  departments: { id: string; name: string; code: string }[];
  exams: { id: string; title: string }[];
}

export const Leaderboard: React.FC = () => {
  const navigate = useNavigate();
  const { triggerToast } = useToast();

  const [scope, setScope] = useState<'global' | 'department' | 'exam'>('global');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [minExamsThreshold, setMinExamsThreshold] = useState<number>(3);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LeaderboardData | null>(null);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      let url = `/api/leaderboard?scope=${scope}&min_exams=${minExamsThreshold}`;
      if (scope === 'department' && selectedDeptId) {
        url += `&department_id=${selectedDeptId}`;
      }
      if (scope === 'exam' && selectedExamId) {
        url += `&exam_id=${selectedExamId}`;
      }

      const res = await apiCall(url);
      if (res.ok) {
        const resData: LeaderboardData = await res.json();
        setData(resData);
        if (scope === 'department' && !selectedDeptId && resData.department_id) {
          setSelectedDeptId(resData.department_id);
        }
        if (scope === 'exam' && !selectedExamId && resData.exams.length > 0) {
          setSelectedExamId(resData.exams[0].id);
        }
      } else {
        const err = await res.json();
        triggerToast(`Failed to load leaderboard: ${err.detail}`, 'error');
      }
    } catch (e) {
      console.error(e);
      triggerToast('Error fetching leaderboard.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [scope, selectedDeptId, selectedExamId, minExamsThreshold]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontWeight: 800, fontSize: '0.82rem', boxShadow: '0 2px 10px rgba(245, 158, 11, 0.3)' }}>
          <Trophy size={14} /> #1 Gold Topper
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
      <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--border-radius-lg)', background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.05), rgba(59, 130, 246, 0.05))', border: '1px solid var(--border-color)', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <Trophy size={28} style={{ color: '#f59e0b' }} />
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Company Leaderboard & Performance Ranking</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Recognizing excellence, top exam scores, and continuous learning across departments.
          </p>
        </div>

        {/* Current User Highlight Card */}
        {data?.current_user_rank && (
          <div style={{ padding: '14px 20px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--accent-color)', boxShadow: '0 4px 20px var(--accent-glow)' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-color)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
              🎯 Your Position Summary
            </span>
            {data.current_user_rank.rank ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                  Rank #{data.current_user_rank.rank}
                </span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  (Top score: <strong>{data.current_user_rank.score}/10</strong> in {data.current_user_rank.department_name})
                </span>
              </div>
            ) : (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Exams Completed: <strong>{data.current_user_rank.exams_completed}</strong> / {data.current_user_rank.min_required || 3}
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--accent-color)', marginTop: '2px' }}>
                  Complete {Math.max(0, (data.current_user_rank.min_required || 3) - data.current_user_rank.exams_completed)} more exam(s) to qualify for official rankings!
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selector Controls & Filters */}
      <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Scope Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setScope('global')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: scope === 'global' ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
              background: scope === 'global' ? 'var(--accent-glow)' : 'transparent',
              color: scope === 'global' ? 'var(--accent-color)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            🌐 Company Global
          </button>

          <button
            type="button"
            onClick={() => setScope('department')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: scope === 'department' ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
              background: scope === 'department' ? 'var(--accent-glow)' : 'transparent',
              color: scope === 'department' ? 'var(--accent-color)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            🏛️ Department Level
          </button>

          <button
            type="button"
            onClick={() => setScope('exam')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: scope === 'exam' ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
              background: scope === 'exam' ? 'var(--accent-glow)' : 'transparent',
              color: scope === 'exam' ? 'var(--accent-color)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            📝 Specific Exam
          </button>
        </div>

        {/* Dropdown Filters based on scope */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {scope === 'department' && data?.departments && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Department:</span>
              <select 
                className="form-input-styled" 
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                style={{ height: '36px', padding: '4px 10px', fontSize: '0.85rem' }}
              >
                {data.departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>
          )}

          {scope === 'exam' && data?.exams && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Exam:</span>
              <select 
                className="form-input-styled" 
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                style={{ height: '36px', padding: '4px 10px', fontSize: '0.85rem', maxWidth: '260px' }}
              >
                {data.exams.map(e => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </div>
          )}

          {scope !== 'exam' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Min Exams:</span>
              <select 
                className="form-input-styled" 
                value={minExamsThreshold}
                onChange={(e) => setMinExamsThreshold(parseInt(e.target.value) || 1)}
                style={{ height: '36px', width: '64px', padding: '4px', textAlign: 'center', fontSize: '0.85rem' }}
              >
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="5">5+</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="animate-spin" style={{ width: '36px', height: '36px', border: '3px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
        </div>
      ) : (
        <div>
          {data?.rankings.length === 0 ? (
            <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', fontStyle: 'italic', color: 'var(--text-secondary)', borderRadius: 'var(--border-radius-lg)' }}>
              <Target size={40} style={{ opacity: 0.3, marginBottom: '12px', color: 'var(--accent-color)' }} />
              <p style={{ margin: 0, fontSize: '0.95rem' }}>No qualified participants found for this leaderboard criteria.</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem' }}>Employees must take and have graded exams to appear on leaderboard rankings.</p>
            </div>
          ) : (
            <div className="glass-panel scroll-bar-styled" style={{ borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '16px 20px', width: '140px', fontWeight: 800, color: 'var(--text-primary)' }}>Rank</th>
                    <th style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--text-primary)' }}>Learner Name</th>
                    <th style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--text-secondary)' }}>Department</th>
                    <th style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--text-secondary)' }}>Exams Completed</th>
                    <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)' }}>Score / 10</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.rankings.map((user) => {
                    const isTop3 = user.rank <= 3;
                    return (
                      <tr 
                        key={user.user_id} 
                        style={{ 
                          borderBottom: '1px solid var(--border-color)', 
                          background: isTop3 ? 'rgba(255,255,255,0.015)' : 'transparent',
                          transition: 'background 0.2s ease'
                        }}
                        className="table-row-hover"
                      >
                        <td style={{ padding: '16px 20px' }}>
                          {getRankBadge(user.rank)}
                        </td>

                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: isTop3 ? 'linear-gradient(135deg, var(--accent-color), #3b82f6)' : 'var(--bg-secondary)', color: isTop3 ? '#fff' : 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                              {user.user_name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <strong style={{ color: 'var(--text-primary)', display: 'block' }}>{user.user_name}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user.employee_code}</span>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                          {user.department_name}
                        </td>

                        <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{user.exams_completed}</span> exam(s)
                        </td>

                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <span style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--accent-color)', padding: '4px 12px', borderRadius: '6px', background: 'var(--accent-glow)' }}>
                            {user.score} / 10
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
