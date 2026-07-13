import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Download, Award, User } from 'lucide-react';
import { Button } from '../../components/Button/Button';
import { apiCall } from '../../services/api';

interface Submission {
  id: string;
  exam_id: string;
  user_id: string;
  status: 'submitted' | 'graded';
  started_at: string | null;
  submitted_at: string | null;
  answers: { [key: string]: string };
  user_name: string;
  user_email: string;
  department_name: string;
  exam_title: string;
}

interface ExamDetails {
  id: string;
  title: string;
  questions: {
    id: string;
    question_text: string;
    question_type: 'short_answer' | 'descriptive' | 'file_upload';
  }[];
}

export const ExamReviewer: React.FC = () => {
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [examDetails, setExamDetails] = useState<ExamDetails | null>(null);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleSelectSubmission = async (sub: Submission) => {
    try {
      setSelectedSub(sub);
      setFeedback('');
      setScores({});
      
      const res = await apiCall(`/api/exams/${sub.exam_id}`);
      if (res.ok) {
        const details = await res.json();
        setExamDetails(details);
        
        // Populate existing scores if already graded
        if (sub.status === 'graded') {
          // Fetch grading details or parse from backend if saved in submission
          // We can fetch grades in general or map them from an endpoint
          // But since the grading is a POST to set the status to graded, 
          // let's fetch details.
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleScoreChange = (qId: string, val: number) => {
    // Restrict score strictly between 0 and 10
    const clamped = Math.max(0, Math.min(10, val));
    setScores({ ...scores, [qId]: clamped });
  };

  const handleSubmitGrade = async () => {
    if (!selectedSub || !examDetails) return;

    // Validate that all questions have a score
    const unanswered = examDetails.questions.filter(q => scores[q.id] === undefined);
    if (unanswered.length > 0) {
      alert(`Please grade all questions before submitting. (${unanswered.length} remaining)`);
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
        alert('Grading submitted successfully.');
        setSelectedSub(null);
        setExamDetails(null);
        fetchSubmissions();
      } else {
        const err = await res.json();
        alert(`Failed to save grade: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error saving grade.');
    } finally {
      setSaving(false);
    }
  };

  const renderAnswer = (q: any, rawAnswer: string) => {
    if (!rawAnswer) return <p style={{ fontStyle: 'italic', color: '#ef4444' }}>No answer submitted.</p>;

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

    return (
      <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.5', margin: 0, padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
        {rawAnswer}
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
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Grade employee exam submissions out of 10 points per question and write evaluation comments.</p>
        </div>
      </div>

      {loading ? (
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
                        background: active ? 'rgba(0, 242, 254, 0.02)' : 'rgba(255,255,255,0.01)', 
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      className="glow-hover"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', background: sub.status === 'graded' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0, 242, 254, 0.1)', color: sub.status === 'graded' ? '#10b981' : 'var(--accent-color)', textTransform: 'uppercase' }}>
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
          {selectedSub && examDetails && (
            <div className="glass-panel animate-fade-in" style={{ padding: '24px', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              
              {/* Employee detail card */}
              <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', fontWeight: 700 }}>Learner Workspace Details</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Employee Name:</span>
                    <strong style={{ color: 'var(--text-primary)', marginLeft: '6px' }}>{selectedSub.user_name}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Department Team:</span>
                    <strong style={{ color: 'var(--text-primary)', marginLeft: '6px' }}>{selectedSub.department_name}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Learner Email:</span>
                    <strong style={{ color: 'var(--text-primary)', marginLeft: '6px' }}>{selectedSub.user_email}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Submitted Date:</span>
                    <strong style={{ color: 'var(--text-primary)', marginLeft: '6px' }}>
                      {selectedSub.submitted_at ? new Date(selectedSub.submitted_at).toLocaleString() : 'N/A'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Questions grader list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
                {examDetails.questions.map((q, idx) => {
                  const rawAns = selectedSub.answers[q.id];
                  return (
                    <div key={q.id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', background: 'var(--accent-glow)', color: 'var(--accent-color)', textTransform: 'uppercase' }}>
                            {q.question_type.replace('_', ' ')}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Question {idx + 1}</span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Score:</span>
                          <input 
                            type="number" 
                            className="form-input-styled" 
                            min="0" 
                            max="10" 
                            placeholder="0-10"
                            value={scores[q.id] === undefined ? '' : scores[q.id]}
                            onChange={(e) => handleScoreChange(q.id, parseInt(e.target.value) ?? 0)}
                            style={{ width: '80px', height: '36px', textAlign: 'center' }}
                            required
                          />
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>/ 10</span>
                        </div>
                      </div>

                      <p style={{ fontSize: '0.95rem', fontWeight: '700', color: '#fff', marginBottom: '12px' }}>{q.question_text}</p>
                      
                      {renderAnswer(q, rawAns)}
                    </div>
                  );
                })}
              </div>

              {/* Feedback and final action */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group-spaced" style={{ margin: 0 }}>
                  <label className="form-label-styled" style={{ fontSize: '0.78rem' }}>Overall Evaluation Feedback</label>
                  <textarea 
                    className="form-input-styled" 
                    placeholder="Provide constructive feedback summarizing subject mastery, compliance, and recommendations..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    style={{ width: '100%', minHeight: '100px', resize: 'vertical', padding: '12px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                  <Button variant="outline" onClick={() => { setSelectedSub(null); setExamDetails(null); }}>
                    Cancel
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={handleSubmitGrade} 
                    disabled={saving}
                    style={{ fontWeight: '700', padding: '0 24px', height: '42px' }}
                    leftIcon={<Award size={16} />}
                  >
                    {saving ? 'Saving...' : 'Confirm & Complete Grading'}
                  </Button>
                </div>
              </div>

            </div>
          )}

        </div>
      )}
    </div>
  );
};
