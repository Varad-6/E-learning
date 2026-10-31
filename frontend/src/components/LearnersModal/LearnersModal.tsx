import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, X, CheckCircle2, Clock, AlertCircle, 
  Download, RefreshCw, BookOpen, Award, Check
} from 'lucide-react';
import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import { apiCall } from '../../services/api';
import './LearnersModal.css';

export interface CourseLearner {
  user_id: string;
  enrollment_id: string;
  employee_code: string;
  name: string;
  email: string;
  department_name: string;
  status: 'enrolled' | 'in_progress' | 'completed' | string;
  progress_percent: number;
  time_spent_seconds: number;
  enrolled_at: string;
  completed_at: string | null;
  last_accessed_at: string | null;
}

export interface LearnersModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string | null;
  courseTitle?: string;
  courseCode?: string;
}

export const LearnersModal: React.FC<LearnersModalProps> = ({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  courseCode
}) => {
  const [learners, setLearners] = useState<CourseLearner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed' | 'enrolled'>('all');

  const fetchLearners = async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiCall(`/api/courses/${courseId}/learners`);
      if (res.ok) {
        const data = await res.json();
        setLearners(Array.isArray(data) ? data : []);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.detail || 'Failed to fetch assigned learners.');
      }
    } catch (err: any) {
      console.error('Error fetching course learners:', err);
      setError('Unable to load learners. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && courseId) {
      fetchLearners();
      setSearchQuery('');
      setStatusFilter('all');
    } else {
      setLearners([]);
      setError(null);
    }
  }, [isOpen, courseId]);

  const filteredLearners = useMemo(() => {
    return learners.filter(learner => {
      // Status filter
      if (statusFilter === 'completed' && learner.status !== 'completed' && learner.progress_percent < 100) {
        return false;
      }
      if (statusFilter === 'in_progress') {
        const isProg = learner.status === 'in_progress' || (learner.progress_percent > 0 && learner.progress_percent < 100);
        if (!isProg) return false;
      }
      if (statusFilter === 'enrolled') {
        const isNotStarted = (learner.status === 'enrolled' || learner.status === 'not_started') && learner.progress_percent === 0;
        if (!isNotStarted) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (learner.name || '').toLowerCase().includes(q);
        const codeMatch = (learner.employee_code || '').toLowerCase().includes(q);
        const deptMatch = (learner.department_name || '').toLowerCase().includes(q);
        const emailMatch = (learner.email || '').toLowerCase().includes(q);
        return nameMatch || codeMatch || deptMatch || emailMatch;
      }

      return true;
    });
  }, [learners, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = learners.length;
    const completed = learners.filter(l => l.status === 'completed' || l.progress_percent === 100).length;
    const inProgress = learners.filter(l => (l.status === 'in_progress' || l.progress_percent > 0) && l.progress_percent < 100).length;
    const notStarted = learners.filter(l => (l.status === 'enrolled' || l.status === 'not_started') && l.progress_percent === 0).length;
    const avgProgress = total > 0 ? Math.round(learners.reduce((acc, l) => acc + (l.progress_percent || 0), 0) / total) : 0;

    return { total, completed, inProgress, notStarted, avgProgress };
  }, [learners]);

  const formatTimeSpent = (secs: number) => {
    if (!secs || secs <= 0) return '0m';
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const remainderSecs = secs % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    if (mins > 0) {
      return `${mins}m ${remainderSecs}s`;
    }
    return `${remainderSecs}s`;
  };

  const handleExportCSV = () => {
    if (learners.length === 0) return;
    const headers = ['Employee Code', 'Full Name', 'Email', 'Department', 'Status', 'Progress %', 'Time Spent (s)', 'Enrolled Date', 'Completed Date'];
    const rows = learners.map(l => [
      `"${l.employee_code || ''}"`,
      `"${l.name || ''}"`,
      `"${l.email || ''}"`,
      `"${l.department_name || ''}"`,
      `"${l.status || ''}"`,
      l.progress_percent || 0,
      l.time_spent_seconds || 0,
      l.enrolled_at ? new Date(l.enrolled_at).toISOString().split('T')[0] : '',
      l.completed_at ? new Date(l.completed_at).toISOString().split('T')[0] : ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${courseCode || 'course'}_learners_progress.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={20} style={{ color: 'var(--accent-color)' }} />
          <span>Assigned Learners & Progress</span>
        </div>
      }
      subtitle={courseTitle ? `${courseCode ? `[${courseCode}] ` : ''}${courseTitle}` : undefined}
      maxWidth="920px"
      className="learners-progress-modal"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={learners.length === 0}
            leftIcon={<Download size={14} />}
          >
            Export CSV
          </Button>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLearners}
              disabled={loading}
              leftIcon={<RefreshCw size={13} className={loading ? 'animate-spin' : ''} />}
            >
              Refresh
            </Button>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      }
    >
      <div className="learners-modal-body">
        {/* KPI Metric Summary Strip with interactive filter clicking */}
        <div className="learners-kpi-strip">
          <div 
            className={`kpi-mini-card ${statusFilter === 'all' ? 'active-kpi' : ''}`}
            onClick={() => setStatusFilter('all')}
            title="Show All Learners"
          >
            <span className="kpi-label">Total Assigned</span>
            <span className="kpi-value">{stats.total}</span>
          </div>
          <div 
            className={`kpi-mini-card in-progress ${statusFilter === 'in_progress' ? 'active-kpi' : ''}`}
            onClick={() => setStatusFilter('in_progress')}
            title="Filter by In Progress"
          >
            <span className="kpi-label">In Progress</span>
            <span className="kpi-value text-amber">{stats.inProgress}</span>
          </div>
          <div 
            className={`kpi-mini-card completed ${statusFilter === 'completed' ? 'active-kpi' : ''}`}
            onClick={() => setStatusFilter('completed')}
            title="Filter by Completed"
          >
            <span className="kpi-label">Completed</span>
            <span className="kpi-value text-emerald">{stats.completed}</span>
          </div>
          <div 
            className={`kpi-mini-card not-started ${statusFilter === 'enrolled' ? 'active-kpi' : ''}`}
            onClick={() => setStatusFilter('enrolled')}
            title="Filter by Not Started"
          >
            <span className="kpi-label">Not Started</span>
            <span className="kpi-value text-secondary">{stats.notStarted}</span>
          </div>
          <div className="kpi-mini-card avg">
            <span className="kpi-label">Average Progress</span>
            <span className="kpi-value text-accent">{stats.avgProgress}%</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="learners-controls-bar">
          <div className="learners-search-wrapper">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Search by learner name, employee code, department, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="learners-search-input"
            />
            {searchQuery && (
              <button 
                type="button" 
                className="clear-search-btn" 
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="learners-filter-pills">
            <button
              type="button"
              className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              <span className="pill-text">All</span>
              <span className="pill-badge">{stats.total}</span>
            </button>
            <button
              type="button"
              className={`filter-pill in-prog ${statusFilter === 'in_progress' ? 'active in-prog-active' : ''}`}
              onClick={() => setStatusFilter('in_progress')}
            >
              <span className="pill-text">In Progress</span>
              <span className="pill-badge badge-amber">{stats.inProgress}</span>
            </button>
            <button
              type="button"
              className={`filter-pill comp ${statusFilter === 'completed' ? 'active comp-active' : ''}`}
              onClick={() => setStatusFilter('completed')}
            >
              <span className="pill-text">Completed</span>
              <span className="pill-badge badge-emerald">{stats.completed}</span>
            </button>
            <button
              type="button"
              className={`filter-pill not-start ${statusFilter === 'enrolled' ? 'active not-start-active' : ''}`}
              onClick={() => setStatusFilter('enrolled')}
            >
              <span className="pill-text">Not Started</span>
              <span className="pill-badge badge-neutral">{stats.notStarted}</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="learners-loading-state">
            <RefreshCw size={28} className="animate-spin text-accent" />
            <p>Loading assigned learners and progress...</p>
          </div>
        ) : error ? (
          <div className="learners-error-state">
            <AlertCircle size={28} style={{ color: '#ef4444' }} />
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={fetchLearners} style={{ marginTop: '8px' }}>
              Retry
            </Button>
          </div>
        ) : filteredLearners.length === 0 ? (
          <div className="learners-empty-state">
            <Users size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
            {searchQuery || statusFilter !== 'all' ? (
              <>
                <h4>No matching learners found</h4>
                <p>No learners match your search query or selected status filter.</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                  style={{ marginTop: '12px' }}
                >
                  Reset Filters
                </Button>
              </>
            ) : (
              <>
                <h4>No Learners Assigned Yet</h4>
                <p>
                  No active employees are currently assigned to this course. Assign departments to this course
                  or publish it to automatically enroll eligible employees.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="learners-table-scroll-container">
            <table className="learners-data-table">
              <thead>
                <tr>
                  <th>Learner</th>
                  <th>Employee Code</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Course Progress</th>
                  <th>Time Spent</th>
                  <th>Enrolled</th>
                </tr>
              </thead>
              <tbody>
                {filteredLearners.map((learner) => {
                  const isCompleted = learner.status === 'completed' || learner.progress_percent === 100;
                  const isInProgress = !isCompleted && (learner.status === 'in_progress' || learner.progress_percent > 0);
                  const enrolledDateStr = learner.enrolled_at ? new Date(learner.enrolled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
                  const initials = learner.name
                    ? learner.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                    : 'EMP';

                  return (
                    <tr key={learner.user_id || learner.enrollment_id}>
                      <td>
                        <div className="learner-profile-cell">
                          <div className={`learner-avatar ${isCompleted ? 'avatar-completed' : ''}`}>
                            {initials}
                          </div>
                          <div className="learner-meta">
                            <span className="learner-name">{learner.name}</span>
                            <span className="learner-email">{learner.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="emp-code-badge">
                          {learner.employee_code}
                        </span>
                      </td>
                      <td>
                        <span className="dept-tag">
                          {learner.department_name || 'General'}
                        </span>
                      </td>
                      <td>
                        {isCompleted ? (
                          <span className="learner-status-badge completed">
                            <CheckCircle2 size={12} />
                            <span>Completed</span>
                          </span>
                        ) : isInProgress ? (
                          <span className="learner-status-badge in-progress">
                            <Clock size={12} />
                            <span>In Progress</span>
                          </span>
                        ) : (
                          <span className="learner-status-badge not-started">
                            <span>Not Started</span>
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="learner-progress-cell">
                          <div className="mini-progress-track">
                            <div 
                              className={`mini-progress-fill ${isCompleted ? 'fill-completed' : ''}`}
                              style={{ width: `${Math.min(100, Math.max(0, learner.progress_percent || 0))}%` }}
                            />
                          </div>
                          <span className="progress-pct-num">{learner.progress_percent || 0}%</span>
                        </div>
                      </td>
                      <td>
                        <span className="time-spent-text">
                          {formatTimeSpent(learner.time_spent_seconds)}
                        </span>
                      </td>
                      <td>
                        <span className="enrolled-date-text">
                          {enrolledDateStr}
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
    </Modal>
  );
};
