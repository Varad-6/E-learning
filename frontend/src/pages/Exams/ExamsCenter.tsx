import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Clock, CheckCircle, Upload } from 'lucide-react';
import { Button } from '../../components/Button/Button';
import { apiCall } from '../../services/api';

interface ExamSubmission {
  id: string;
  exam_id: string;
  status: 'assigned' | 'in_progress' | 'submitted' | 'graded';
  started_at: string | null;
  submitted_at: string | null;
  answers: { [key: string]: any };
  exam_title: string;
}

interface ExamDetails {
  id: string;
  title: string;
  duration_minutes: number;
  questions: {
    id: string;
    question_text: string;
    question_type: 'short_answer' | 'descriptive' | 'file_upload';
  }[];
}

export const ExamsCenter: React.FC = () => {
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [activeSubmission, setActiveSubmission] = useState<ExamSubmission | null>(null);
  const [examDetails, setExamDetails] = useState<ExamDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Exam Player Workspace States
  const [answers, setAnswers] = useState<{ [qId: string]: string }>({});
  const [uploadedFiles, setUploadedFiles] = useState<{ [qId: string]: { name: string; url: string } }>({});
  const [uploadingQId, setUploadingQId] = useState<string | null>(null);
  
  // Timer States
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<any>(null);

  const fetchAssignedExams = async () => {
    try {
      setLoading(true);
      const res = await apiCall('/api/exams/assigned');
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
    fetchAssignedExams();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleStartExam = async (sub: ExamSubmission) => {
    try {
      // 1. Fetch Exam Details
      const detailsRes = await apiCall(`/api/exams/${sub.exam_id}`);
      if (!detailsRes.ok) {
        alert('Failed to load exam questions');
        return;
      }
      const details = await detailsRes.json();
      setExamDetails(details);

      // 2. Start Exam in Backend
      const startRes = await apiCall(`/api/exams/${sub.exam_id}/start`, { method: 'POST' });
      if (startRes.ok) {
        const updatedSub = await startRes.json();
        setActiveSubmission(updatedSub);
        
        // Initialize answers and files
        const initialAnswers: { [key: string]: string } = {};
        const initialFiles: { [key: string]: { name: string; url: string } } = {};
        
        details.questions.forEach((q: any) => {
          const stored = updatedSub.answers[q.id];
          if (stored) {
            if (q.question_type === 'file_upload') {
              try {
                const parsed = JSON.parse(stored);
                initialFiles[q.id] = parsed;
              } catch {
                initialFiles[q.id] = { name: 'Uploaded Document', url: stored };
              }
            } else {
              initialAnswers[q.id] = stored;
            }
          } else {
            initialAnswers[q.id] = '';
          }
        });
        
        setAnswers(initialAnswers);
        setUploadedFiles(initialFiles);
        startCountdown(updatedSub, details.duration_minutes);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startCountdown = (sub: ExamSubmission, durationMinutes: number) => {
    if (!sub.started_at) return;
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    const startTime = new Date(sub.started_at).getTime();
    const durationMs = durationMinutes * 60 * 1000;
    
    const tick = () => {
      const now = new Date().getTime();
      const elapsed = now - startTime;
      const remaining = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));
      
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        // Auto submit
        handleAutoSubmit(sub.exam_id);
      }
    };
    
    tick(); // Run immediately
    timerRef.current = setInterval(tick, 1000);
  };

  const handleAnswerChange = (qId: string, text: string) => {
    setAnswers({ ...answers, [qId]: text });
  };

  const handleFileUpload = async (qId: string, file: File) => {
    if (!activeSubmission) return;
    setUploadingQId(qId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await apiCall(`/api/exams/submissions/${activeSubmission.id}/upload`, {
        method: 'POST',
        // apiCall handles headers, but for FormData we must let the browser establish the correct boundaries.
        // We will pass custom header or form payload
        body: formData
      });
      
      if (res.ok) {
        const data = await res.json();
        setUploadedFiles({
          ...uploadedFiles,
          [qId]: { name: data.original_name, url: data.file_url }
        });
      } else {
        const err = await res.json();
        alert(err.detail || 'Upload failed');
      }
    } catch (e) {
      console.error(e);
      alert('Error uploading file');
    } finally {
      setUploadingQId(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAutoSubmit = async (examId: string) => {
    // Collect all answers
    const finalAnswers: { [key: string]: string } = { ...answers };
    Object.keys(uploadedFiles).forEach(qId => {
      finalAnswers[qId] = JSON.stringify(uploadedFiles[qId]);
    });

    try {
      await apiCall(`/api/exams/${examId}/submit`, {
        method: 'POST',
        body: JSON.stringify(finalAnswers)
      });
      alert('Time limit expired. Your exam answers have been auto-submitted.');
      setActiveSubmission(null);
      setExamDetails(null);
      fetchAssignedExams();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitExam = async () => {
    if (!activeSubmission || !examDetails) return;
    
    // Ensure all descriptive/short answers are answered, or warn
    const unanswered = examDetails.questions.filter(q => {
      if (q.question_type === 'file_upload') {
        return !uploadedFiles[q.id];
      }
      return !answers[q.id] || !answers[q.id].trim();
    });

    if (unanswered.length > 0) {
      const confirm = window.confirm(`You have ${unanswered.length} unanswered questions. Are you sure you want to submit?`);
      if (!confirm) return;
    } else {
      const confirm = window.confirm('Are you ready to submit your exam answers? This action cannot be undone.');
      if (!confirm) return;
    }

    // Collect final answers payload
    const finalAnswers: { [key: string]: string } = { ...answers };
    Object.keys(uploadedFiles).forEach(qId => {
      finalAnswers[qId] = JSON.stringify(uploadedFiles[qId]);
    });

    try {
      const res = await apiCall(`/api/exams/${activeSubmission.exam_id}/submit`, {
        method: 'POST',
        body: JSON.stringify(finalAnswers)
      });

      if (res.ok) {
        if (timerRef.current) clearInterval(timerRef.current);
        alert('Exam submitted successfully. Under review by Administrations.');
        setActiveSubmission(null);
        setExamDetails(null);
        fetchAssignedExams();
      } else {
        const err = await res.json();
        alert(`Submit failed: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error submitting exam.');
    }
  };

  if (activeSubmission && examDetails) {
    return (
      <div className="container animate-fade-in" style={{ marginTop: '40px', paddingBottom: '80px' }}>
        
        {/* Exam Running header */}
        <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', textTransform: 'uppercase', marginRight: '8px' }}>
              Exam in Progress
            </span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '6px 0 0 0' }}>{examDetails.title}</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: timeLeft && timeLeft < 300 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.03)', padding: '10px 18px', borderRadius: '8px', border: timeLeft && timeLeft < 300 ? '1px solid #ef4444' : '1px solid var(--border-color)' }}>
            <Clock size={18} style={{ color: timeLeft && timeLeft < 300 ? '#ef4444' : 'var(--accent-color)' }} />
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' }}>Time Remaining</span>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: timeLeft && timeLeft < 300 ? '#ef4444' : '#fff' }}>
                {timeLeft !== null ? formatTime(timeLeft) : 'Calculating...'}
              </span>
            </div>
          </div>
        </div>

        {/* Questions list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '30px' }}>
          {examDetails.questions.map((q, idx) => (
            <div key={q.id} className="glass-panel glow-hover" style={{ padding: '24px', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', background: 'var(--accent-glow)', color: 'var(--accent-color)', textTransform: 'uppercase' }}>
                  {q.question_type.replace('_', ' ')}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Question {idx + 1} (Max Points: 10)</span>
              </div>

              <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', marginBottom: '16px', lineHeight: '1.4' }}>
                {q.question_text}
              </h4>

              {q.question_type === 'short_answer' && (
                <input 
                  type="text" 
                  className="form-input-styled" 
                  placeholder="Type your short answer response..."
                  value={answers[q.id] || ''}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  style={{ width: '100%' }}
                />
              )}

              {q.question_type === 'descriptive' && (
                <textarea 
                  className="form-input-styled" 
                  placeholder="Write your long descriptive response..."
                  value={answers[q.id] || ''}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  style={{ width: '100%', minHeight: '140px', resize: 'vertical', padding: '12px' }}
                />
              )}

              {q.question_type === 'file_upload' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input 
                        type="file" 
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileUpload(q.id, e.target.files[0]);
                          }
                        }}
                        disabled={uploadingQId !== null}
                      />
                      <Button 
                        variant="outline" 
                        type="button" 
                        leftIcon={<Upload size={14} />} 
                        style={{ height: '40px', pointerEvents: 'none' }}
                      >
                        {uploadingQId === q.id ? 'Uploading...' : 'Choose File'}
                      </Button>
                    </label>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Supported: PDF, DOCX, ZIP, PNG, JPG (Max 10MB)</span>
                  </div>

                  {uploadedFiles[q.id] && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '6px', width: 'fit-content' }}>
                      <CheckCircle size={14} style={{ color: '#10b981' }} />
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: '600' }}>{uploadedFiles[q.id].name}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Submit Bar */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
          <Button variant="outline" onClick={() => {
            if (window.confirm('Discard active session? Answers will not be saved.')) {
              if (timerRef.current) clearInterval(timerRef.current);
              setActiveSubmission(null);
              setExamDetails(null);
              fetchAssignedExams();
            }
          }} style={{ height: '44px' }}>
            Quit Exam
          </Button>
          <Button variant="primary" onClick={handleSubmitExam} style={{ height: '44px', fontWeight: '700', padding: '0 32px' }}>
            🚀 Submit Answers for Grading
          </Button>
        </div>

      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ marginTop: '40px', paddingBottom: '60px' }}>
      <div className="pane-header" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>📋 Assigned Descriptive Exams</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Complete assigned descriptive, short-answer, and document-upload curriculum examinations.</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
          <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
        </div>
      ) : submissions.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', borderRadius: 'var(--border-radius-lg)' }}>
          <BookOpen size={48} style={{ opacity: 0.15, margin: '0 auto 16px', color: 'var(--accent-color)' }} />
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No active exam templates have been assigned to your department catalog yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          {submissions.map((sub) => {
            const isCompleted = sub.status === 'submitted' || sub.status === 'graded';
            const inProgress = sub.status === 'in_progress';
            
            return (
              <div key={sub.id} className="course-lobby-card glass-panel glow-hover" style={{ display: 'flex', flexDirection: 'column', borderRadius: 'var(--border-radius-lg)', padding: '20px', justifyContent: 'space-between', minHeight: '180px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ 
                      padding: '2px 8px', 
                      borderRadius: '12px', 
                      background: isCompleted ? 'rgba(16, 185, 129, 0.1)' : inProgress ? 'rgba(239, 68, 68, 0.1)' : 'var(--accent-glow)', 
                      color: isCompleted ? '#10b981' : inProgress ? '#ef4444' : 'var(--accent-color)', 
                      fontSize: '0.68rem', 
                      fontWeight: '800',
                      textTransform: 'uppercase'
                    }}>
                      {sub.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0', lineHeight: '1.3' }}>
                    {sub.exam_title}
                  </h4>
                </div>

                <div style={{ marginTop: '20px' }}>
                  {isCompleted ? (
                    <Button 
                      variant="outline" 
                      disabled
                      style={{ width: '100%', height: '40px', opacity: 0.6 }}
                      leftIcon={<CheckCircle size={14} />}
                    >
                      {sub.status === 'graded' ? 'Grading Completed' : 'Waiting for Review'}
                    </Button>
                  ) : (
                    <Button 
                      variant="primary" 
                      onClick={() => handleStartExam(sub)}
                      style={{ width: '100%', height: '40px', fontWeight: '700' }}
                    >
                      {inProgress ? 'Resume Exam' : 'Launch Exam'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
