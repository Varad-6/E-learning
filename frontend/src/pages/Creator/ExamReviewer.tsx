import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Download, Award, User, Check, X, ShieldAlert } from 'lucide-react';
import { Button } from '../../components/Button/Button';
import { apiCall } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface Submission {
  id: string;
  exam_id: string;
  user_id: string;
  status: 'submitted' | 'graded';
  started_at: string | null;
  submitted_at: string | null;
  answers: { [key: string]: any };
  user_name: string;
  user_email: string;
  department_name: string;
  exam_title: string;
  scores?: { [qId: string]: number } | null;
}

interface ExamDetails {
  id: string;
  title: string;
  questions: {
    id: string;
    question_text: string;
    question_type: 'mcq' | 'msq' | 'short_answer' | 'descriptive' | 'file_upload';
    options?: string[];
    correct_answer?: any;
  }[];
}

export const ExamReviewer: React.FC = () => {
  const navigate = useNavigate();
  const { triggerToast } = useToast();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [examDetails, setExamDetails] = useState<ExamDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Tab controls
  const [activeSectionTab, setActiveSectionTab] = useState<'submissions' | 'approvals'>('submissions');
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [selectedReview, setSelectedReview] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Grading Form States
  const [scores, setScores] = useState<{ [qId: string]: number }>({});
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await apiCall('/api/exams/submissions');
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      }
    } catch (e) {
      console.error(e);
      triggerToast('Error loading submissions queue.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingReviews = async () => {
    try {
      setReviewLoading(true);
      const res = await apiCall('/api/exams/reviews/pending');
      if (res.ok) {
        const data = await res.json();
        setPendingReviews(data);
      }
    } catch (e) {
      console.error(e);
      triggerToast('Error loading pending reviews.', 'error');
    } finally {
      setReviewLoading(false);
    }
  };

  useEffect(() => {
    if (activeSectionTab === 'submissions') {
      fetchSubmissions();
    } else {
      fetchPendingReviews();
    }
  }, [activeSectionTab]);

  const getAutoScore = (q: any, userAns: any) => {
    if (q.question_type === 'mcq') {
      if (userAns !== undefined && q.correct_answer !== undefined && String(userAns).trim() === String(q.correct_answer).trim()) {
        return 10;
      }
      return 0;
    }
    if (q.question_type === 'msq') {
      const corr = Array.isArray(q.correct_answer) ? q.correct_answer : (q.correct_answer !== undefined && q.correct_answer !== null ? [q.correct_answer] : []);
      const ansList = Array.isArray(userAns) ? userAns : (userAns !== undefined && userAns !== null ? [userAns] : []);
      const corrSet = new Set(corr.map((x: any) => String(x).trim()));
      const ansSet = new Set(ansList.map((x: any) => String(x).trim()));
      if (corrSet.size > 0 && ansSet.size === corrSet.size && [...ansSet].every(x => corrSet.has(x))) {
        return 10;
      }
      return 0;
    }
    return 0;
  };

  const handleSelectSubmission = async (sub: Submission) => {
    try {
      setSelectedSub(sub);
      setSelectedReview(null);
      setFeedback('');
      
      const res = await apiCall(`/api/exams/${sub.exam_id}`);
      if (res.ok) {
        const details = await res.json();
        setExamDetails(details);

        // Pre-populate scores combining returned scores and client-side auto-graded fallback
        const initialScores: { [key: string]: number } = { ...(sub.scores || {}) };
        details.questions.forEach((q: any) => {
          if (q.question_type === 'mcq' || q.question_type === 'msq') {
            if (initialScores[q.id] === undefined || initialScores[q.id] === null) {
              initialScores[q.id] = getAutoScore(q, sub.answers?.[q.id]);
            }
          }
        });
        setScores(initialScores);
      }
    } catch (e) {
      console.error(e);
      triggerToast('Failed to load exam details.', 'error');
    }
  };

  const handleSelectReview = async (rev: any) => {
    try {
      setSelectedReview(rev);
      setSelectedSub(null);
      setRejectionReason('');
      setIsRejecting(false);

      const res = await apiCall(`/api/exams/${rev.exam_id}`);
      if (res.ok) {
        const details = await res.json();
        setExamDetails(details);
      }
    } catch (e) {
      console.error(e);
      triggerToast('Failed to load exam details.', 'error');
    }
  };

  const handleScoreChange = (qId: string, val: number) => {
    const clamped = Math.max(0, Math.min(10, val));
    setScores({ ...scores, [qId]: clamped });
  };

  const handleSubmitGrade = async () => {
    if (!selectedSub || !examDetails) return;

    const unanswered = examDetails.questions.filter(q => scores[q.id] === undefined);
    if (unanswered.length > 0) {
      triggerToast(`Please grade all questions before submitting. (${unanswered.length} remaining)`, 'warning');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        scores: scores,
        overall_feedback: feedback.trim()
      };

      const res = await apiCall(`/api/exams/submissions/${selectedSub.id}/grade`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        triggerToast('Grading submitted successfully.', 'success');
        setSelectedSub(null);
        setExamDetails(null);
        fetchSubmissions();
      } else {
        const err = await res.json();
        triggerToast(`Failed to save grade: ${err.detail}`, 'error');
      }
    } catch (e) {
      console.error(e);
      triggerToast('Error saving grade.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveReview = async (revId: string) => {
    setSaving(true);
    try {
      const res = await apiCall(`/api/exams/reviews/${revId}/approve`, {
        method: 'POST'
      });
      if (res.ok) {
        triggerToast('Exam syllabus approved and published successfully!', 'success');
        setSelectedReview(null);
        setExamDetails(null);
        fetchPendingReviews();
      } else {
        const err = await res.json();
        triggerToast(`Approval failed: ${err.detail}`, 'error');
      }
    } catch (e) {
      console.error(e);
      triggerToast('Connection error during approval.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRejectReview = async (revId: string) => {
    if (!rejectionReason.trim()) {
      triggerToast('Please provide feedback notes explaining the rejection.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const res = await apiCall(`/api/exams/reviews/${revId}/reject?rejection_reason=${encodeURIComponent(rejectionReason.trim())}`, {
        method: 'POST'
      });
      if (res.ok) {
        triggerToast('Exam syllabus review rejected with feedback notes.', 'warning');
        setSelectedReview(null);
        setExamDetails(null);
        setRejectionReason('');
        setIsRejecting(false);
        fetchPendingReviews();
      } else {
        const err = await res.json();
        triggerToast(`Rejection failed: ${err.detail}`, 'error');
      }
    } catch (e) {
      console.error(e);
      triggerToast('Connection error during rejection.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderAnswer = (q: any, rawAnswer: any) => {
    if (rawAnswer === undefined || rawAnswer === null || rawAnswer === '') {
      return <p style={{ fontStyle: 'italic', color: '#ef4444' }}>No answer submitted.</p>;
    }

    if (q.question_type === 'file_upload') {
      try {
        const fileObj = JSON.parse(rawAnswer);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
            <FileText size={20} style={{ color: 'var(--accent-color)' }} />
            <div>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>{fileObj.name}</span>
              <a 
                href={fileObj.url} 
                target="_blank" 
                rel="noreferrer" 
                style={{ fontSize: '0.78rem', color: 'var(--accent-color)', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}
              >
                <Download size={12} /> Download Attachment File
              </a>
            </div>
          </div>
        );
      } catch {
        return (
          <a href={rawAnswer} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}>
            Download Uploaded Attachment
          </a>
        );
      }
    }

    if (q.question_type === 'mcq') {
      const selectedIdx = rawAnswer ? String(rawAnswer).trim() : '';
      const correctIdx = q.correct_answer ? String(q.correct_answer).trim() : '';
      return (
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {q.options?.map((opt: string, oIdx: number) => {
            const isSelected = String(oIdx) === selectedIdx;
            const isCorrect = String(oIdx) === correctIdx;
            return (
              <div 
                key={oIdx} 
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  border: isCorrect ? '1px solid #10b981' : isSelected ? '1px solid #ef4444' : '1px solid var(--border-color)',
                  background: isCorrect ? 'rgba(16, 185, 129, 0.08)' : isSelected ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                  fontSize: '0.88rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>{opt}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  {isCorrect && '✅ Correct answer'}
                  {!isCorrect && isSelected && '❌ User selected'}
                </span>
              </div>
            );
          })}
        </div>
      );
    }

    if (q.question_type === 'msq') {
      let selectedArr: string[] = [];
      try {
        selectedArr = Array.isArray(rawAnswer) ? rawAnswer.map(String) : (typeof rawAnswer === 'string' && rawAnswer.startsWith('[') ? JSON.parse(rawAnswer).map(String) : [String(rawAnswer)]);
      } catch {
        selectedArr = [String(rawAnswer)];
      }
      
      let correctArr: string[] = [];
      try {
        correctArr = Array.isArray(q.correct_answer) ? q.correct_answer.map(String) : (typeof q.correct_answer === 'string' && q.correct_answer.startsWith('[') ? JSON.parse(q.correct_answer).map(String) : [String(q.correct_answer)]);
      } catch {
        correctArr = [String(q.correct_answer)];
      }

      return (
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {q.options?.map((opt: string, oIdx: number) => {
            const isSelected = selectedArr.includes(String(oIdx));
            const isCorrect = correctArr.includes(String(oIdx));
            return (
              <div 
                key={oIdx} 
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  border: isCorrect ? '1px solid #10b981' : isSelected ? '1px solid #ef4444' : '1px solid var(--border-color)',
                  background: isCorrect ? 'rgba(16, 185, 129, 0.08)' : isSelected ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                  fontSize: '0.88rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>{opt}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  {isCorrect && '✅ Correct answer'}
                  {!isCorrect && isSelected && '❌ User selected'}
                </span>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.5', margin: 0, padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
        {String(rawAnswer)}
      </p>
    );
  };

  return (
    <div className="container animate-fade-in" style={{ marginTop: '40px', paddingBottom: '80px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <Button variant="outline" onClick={() => navigate('/creator/dashboard')} style={{ padding: '8px' }}>
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>🧑‍🏫 Exam Grading & Review Studio</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Grade employee exam submissions or approve newly constructed exam templates.</p>
        </div>
      </div>

      {/* Selector Tabs */}
      <div className="catalog-tabs-container" style={{ display: 'flex', gap: '20px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <button
          type="button"
          onClick={() => {
            setActiveSectionTab('submissions');
            setSelectedSub(null);
            setSelectedReview(null);
            setExamDetails(null);
          }}
          style={{
            border: 'none',
            background: 'none',
            fontSize: '1.05rem',
            fontWeight: 700,
            color: activeSectionTab === 'submissions' ? 'var(--accent-color)' : 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px 12px',
            borderBottom: activeSectionTab === 'submissions' ? '2px solid var(--accent-color)' : 'none',
            marginBottom: '-12px',
            transition: 'all 0.2s'
          }}
        >
          Student Submissions
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveSectionTab('approvals');
            setSelectedSub(null);
            setSelectedReview(null);
            setExamDetails(null);
          }}
          style={{
            border: 'none',
            background: 'none',
            fontSize: '1.05rem',
            fontWeight: 700,
            color: activeSectionTab === 'approvals' ? 'var(--accent-color)' : 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px 12px',
            borderBottom: activeSectionTab === 'approvals' ? '2px solid var(--accent-color)' : 'none',
            marginBottom: '-12px',
            transition: 'all 0.2s'
          }}
        >
          Exam Approvals
        </button>
      </div>

      {activeSectionTab === 'submissions' ? (
        loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: selectedSub ? '340px 1fr' : '1fr', gap: '30px', alignItems: 'flex-start' }}>
            
            {/* Submissions queue list */}
            <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 16px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Inbox Submissions ({submissions.length})</h3>
              
              {submissions.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', textAlign: 'center', padding: '24px 0' }}>No pending exam reviews received.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {submissions.map((sub) => {
                    const active = selectedSub?.id === sub.id;
                    return (
                      <div 
                        key={sub.id} 
                        onClick={() => handleSelectSubmission(sub)}
                        style={{ 
                          padding: '14px', 
                          borderRadius: '8px', 
                          border: active ? '1px solid var(--accent-color)' : '1px solid var(--border-color)', 
                          background: active ? 'var(--accent-glow)' : 'rgba(255,255,255,0.01)', 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        className="glow-hover"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', background: sub.status === 'graded' ? 'var(--accent-glow)' : 'rgba(255, 255, 255, 0.05)', color: sub.status === 'graded' ? 'var(--color-success)' : 'var(--color-warning)', textTransform: 'uppercase' }}>
                            {sub.status}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : ''}
                          </span>
                        </div>
                        
                        <h4 style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>{sub.exam_title}</h4>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          <User size={12} />
                          <span>{sub.user_name} ({sub.department_name})</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active submission grading panel */}
            {selectedSub && examDetails && (() => {
              const totalQ = examDetails.questions.length;
              const gradedQ = examDetails.questions.filter(q => scores[q.id] !== undefined).length;
              const totalScore = examDetails.questions.reduce((acc, q) => acc + (scores[q.id] || 0), 0);
              const averageScore = totalQ > 0 ? (totalScore / totalQ).toFixed(1) : '0.0';

              return (
                <div className="glass-panel animate-fade-in" style={{ 
                  padding: '28px', 
                  borderRadius: 'var(--border-radius-lg)', 
                  background: 'var(--bg-card)', 
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-lg)'
                }}>
                  
                  {/* Top Header Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Grade Assessment Workspace</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Review answers, check auto-graded scoring, and grade descriptive tasks.</p>
                    </div>
                    {/* Premium Live Score Badge */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      background: 'var(--accent-glow)', 
                      border: '1px solid var(--accent-color)', 
                      borderRadius: '12px',
                      padding: '10px 20px',
                      minWidth: '120px'
                    }}>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>Current Grade</span>
                      <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '2px' }}>
                        <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-color)' }}>{averageScore}</span>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginLeft: '2px' }}>/ 10</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 600 }}>{gradedQ} of {totalQ} graded</span>
                    </div>
                  </div>

                  {/* Profile / Context Panel */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '16px',
                    padding: '18px', 
                    borderRadius: '10px', 
                    background: 'rgba(255,255,255,0.015)', 
                    border: '1px solid var(--border-color)', 
                    marginBottom: '28px' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}>
                        <User size={18} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', fontWeight: 700 }}>Learner Name</span>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{selectedSub.user_name}</strong>
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', fontWeight: 700 }}>Department / Team</span>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem', display: 'block', marginTop: '2px' }}>{selectedSub.department_name}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', fontWeight: 700 }}>Submitted Timestamp</span>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem', display: 'block', marginTop: '2px' }}>
                        {selectedSub.submitted_at ? new Date(selectedSub.submitted_at).toLocaleString() : 'N/A'}
                      </strong>
                    </div>
                  </div>

                  {/* Questions Grid */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', marginBottom: '36px' }}>
                    {examDetails.questions.map((q, idx) => {
                      const rawAns = selectedSub.answers[q.id];
                      const isObjective = q.question_type === 'mcq' || q.question_type === 'msq';
                      const qTypeColors: { [key: string]: string } = {
                        mcq: '#0ea5e9',
                        msq: '#6366f1',
                        short_answer: '#f97316',
                        descriptive: '#8b5cf6',
                        file_upload: '#3b82f6'
                      };
                      const qColor = qTypeColors[q.question_type] || 'var(--accent-color)';

                      return (
                        <div key={q.id} style={{ 
                          padding: '20px', 
                          borderRadius: '12px', 
                          background: 'rgba(255,255,255,0.01)', 
                          border: '1px solid var(--border-color)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                          {/* Top row of question card */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '14px' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{ 
                                fontSize: '0.65rem', 
                                fontWeight: '900', 
                                padding: '3px 8px', 
                                borderRadius: '6px', 
                                background: `${qColor}1a`, 
                                color: qColor, 
                                textTransform: 'uppercase',
                                border: `1px solid ${qColor}33`,
                                letterSpacing: '0.03em'
                              }}>
                                {q.question_type.replace('_', ' ')}
                              </span>
                              <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: '700' }}>Question {idx + 1}</span>
                            </div>
                            
                            {/* Score selector */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Score:</span>
                              {isObjective ? (
                                <div style={{ 
                                  padding: '6px 14px', 
                                  borderRadius: '20px', 
                                  background: scores[q.id] === 10 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                  color: scores[q.id] === 10 ? '#10b981' : '#ef4444',
                                  border: scores[q.id] === 10 ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                                  fontSize: '0.85rem',
                                  fontWeight: 800,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}>
                                  <span>{scores[q.id] === 10 ? '🎯 Auto: 10' : '❌ Auto: 0'}</span>
                                  <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>/ 10</span>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
                                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((scoreVal) => {
                                    const isSelected = scores[q.id] === scoreVal;
                                    return (
                                      <button
                                        key={scoreVal}
                                        type="button"
                                        onClick={() => handleScoreChange(q.id, scoreVal)}
                                        style={{
                                          width: '30px',
                                          height: '30px',
                                          borderRadius: '50%',
                                          border: isSelected ? '1.5px solid var(--accent-color)' : '1px solid var(--border-color)',
                                          background: isSelected ? 'var(--accent-glow)' : 'transparent',
                                          color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)',
                                          fontWeight: '800',
                                          fontSize: '0.82rem',
                                          cursor: 'pointer',
                                          transition: 'all 0.15s ease-in-out',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          boxShadow: isSelected ? '0 0 8px var(--accent-glow)' : 'none'
                                        }}
                                        className="score-pill-btn glow-hover"
                                      >
                                        {scoreVal}
                                      </button>
                                    );
                                  })}
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '700', marginLeft: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>/ 10 Marks</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Question text */}
                          <p style={{ fontSize: '1.02rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', lineHeight: '1.4' }}>{q.question_text}</p>
                          
                          {/* Answer view block */}
                          <div style={{ 
                            background: 'rgba(255,255,255,0.015)', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '8px', 
                            padding: '16px',
                            marginTop: '12px'
                          }}>
                            <span style={{ 
                              fontSize: '0.68rem', 
                              textTransform: 'uppercase', 
                              color: 'var(--text-secondary)', 
                              display: 'block', 
                              marginBottom: '10px', 
                              fontWeight: 800,
                              letterSpacing: '0.04em'
                            }}>
                              Learner Submission
                            </span>
                            {renderAnswer(q, rawAns)}
                          </div>

                        </div>
                      );
                    })}
                  </div>

                  {/* Feedback Form and Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
                    <div className="form-group-spaced" style={{ margin: 0 }}>
                      <label className="form-label-styled" style={{ fontSize: '0.8rem', fontWeight: '700' }}>Overall Evaluation Feedback</label>
                      <textarea 
                        className="form-input-styled" 
                        placeholder="Provide constructive feedback summarizing subject mastery, compliance, and recommendations..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        style={{ width: '100%', minHeight: '120px', resize: 'vertical', padding: '14px', fontSize: '0.9rem', lineHeight: '1.5' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <Button variant="outline" onClick={() => { setSelectedSub(null); setExamDetails(null); }} style={{ height: '44px', padding: '0 24px' }}>
                        Cancel
                      </Button>
                      <Button 
                        variant="primary" 
                        onClick={handleSubmitGrade} 
                        disabled={saving}
                        style={{ fontWeight: '700', padding: '0 28px', height: '44px' }}
                        leftIcon={<Award size={16} />}
                      >
                        {saving ? 'Submitting...' : 'Confirm & Complete Grading'}
                      </Button>
                    </div>
                  </div>

                </div>
              );
            })()}
          </div>
        )
      ) : (
        reviewLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: selectedReview ? '340px 1fr' : '1fr', gap: '30px', alignItems: 'flex-start' }}>
            
            {/* Pending reviews sidebar queue */}
            <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 16px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Pending Syllabus Approvals ({pendingReviews.length})</h3>
              
              {pendingReviews.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', textAlign: 'center', padding: '24px 0' }}>No pending syllabus reviews.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pendingReviews.map((rev) => {
                    const active = selectedReview?.id === rev.id;
                    return (
                      <div 
                        key={rev.id} 
                        onClick={() => handleSelectReview(rev)}
                        style={{ 
                          padding: '14px', 
                          borderRadius: '8px', 
                          border: active ? '1px solid var(--accent-color)' : '1px solid var(--border-color)', 
                          background: active ? 'var(--accent-glow)' : 'rgba(255,255,255,0.01)', 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        className="glow-hover"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--warning-color)', textTransform: 'uppercase' }}>
                            {rev.status}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            {rev.submitted_at ? new Date(rev.submitted_at).toLocaleDateString() : ''}
                          </span>
                        </div>
                        
                        <h4 style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>{rev.exam_title}</h4>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          <User size={12} />
                          <span>By: {rev.creator_name} ({rev.department_name})</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active syllabus review details panel */}
            {selectedReview && examDetails && (
              <div className="glass-panel animate-fade-in" style={{ padding: '24px', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                
                <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', fontWeight: 700 }}>Syllabus Review Parameters</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Exam Title:</span>
                      <strong style={{ color: 'var(--text-primary)', marginLeft: '6px' }}>{selectedReview.exam_title}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Creator:</span>
                      <strong style={{ color: 'var(--text-primary)', marginLeft: '6px' }}>{selectedReview.creator_name}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Assigned Department:</span>
                      <strong style={{ color: 'var(--text-primary)', marginLeft: '6px' }}>{selectedReview.department_name}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Duration Limit:</span>
                      <strong style={{ color: 'var(--text-primary)', marginLeft: '6px' }}>{examDetails.questions ? '60' : ''} minutes</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', margin: 0 }}>Questions List ({examDetails.questions.length})</h4>
                  
                  {examDetails.questions.map((q, idx) => (
                    <div key={q.id} style={{ padding: '14px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', background: 'var(--accent-glow)', color: 'var(--accent-color)', textTransform: 'uppercase' }}>
                          {q.question_type.replace('_', ' ')}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Question {idx + 1}</span>
                      </div>
                      <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{q.question_text}</p>
                    </div>
                  ))}
                </div>

                {isRejecting ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>Rejection Feedback Reason</label>
                    <textarea
                      className="form-input-styled"
                      placeholder="Explain to the creator why this exam syllabus is being rejected (e.g. adjust compliance details or add more questions)..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      style={{ width: '100%', minHeight: '80px', padding: '12px', resize: 'vertical' }}
                    />
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <Button variant="outline" onClick={() => setIsRejecting(false)}>Cancel</Button>
                      <Button variant="coral" onClick={() => handleRejectReview(selectedReview.id)} disabled={saving}>
                        Confirm Reject
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <Button variant="coral" onClick={() => setIsRejecting(true)} leftIcon={<X size={16} />}>
                      Reject Syllabus
                    </Button>
                    <Button variant="primary" onClick={() => handleApproveReview(selectedReview.id)} disabled={saving} leftIcon={<Check size={16} />}>
                      Approve & Publish Syllabus
                    </Button>
                  </div>
                )}

              </div>
            )}
          </div>
        )
      )}
    </div>
  );
};
