import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Clock, CheckCircle, Upload, Hourglass, Calendar, FileText, Award, AlertCircle } from 'lucide-react';
import { Button } from '../../components/Button/Button';
import { apiCall } from '../../services/api';
import { Modal } from '../../components/Modal/Modal';

interface ExamSubmission {
  id: string;
  exam_id: string;
  status: 'assigned' | 'in_progress' | 'submitted' | 'graded';
  started_at: string | null;
  submitted_at: string | null;
  answers: { [key: string]: any };
  exam_title: string;
  course_title?: string;
  course_code?: string;
  duration_minutes?: number;
  due_date?: string | null;
  graded_at?: string | null;
  overall_score?: number | null;
  overall_feedback?: string | null;
  scores?: { [qId: string]: number } | null;
}

interface ExamDetails {
  id: string;
  title: string;
  duration_minutes: number;
  questions: {
    id: string;
    question_text: string;
    question_type: 'mcq' | 'msq' | 'short_answer' | 'descriptive' | 'file_upload';
    options?: string[];
    correct_answer?: any;
  }[];
}

export const ExamsCenter: React.FC = () => {
  const [toAttempt, setToAttempt] = useState<ExamSubmission[]>([]);
  const [awaitingEvaluation, setAwaitingEvaluation] = useState<ExamSubmission[]>([]);
  const [evaluated, setEvaluated] = useState<ExamSubmission[]>([]);
  
  const [activeSubmission, setActiveSubmission] = useState<ExamSubmission | null>(null);
  const [examDetails, setExamDetails] = useState<ExamDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'toAttempt' | 'awaitingEvaluation' | 'evaluated'>('toAttempt');

  // Exam Player Workspace States
  const [answers, setAnswers] = useState<{ [qId: string]: any }>({});
  const [uploadedFiles, setUploadedFiles] = useState<{ [qId: string]: { name: string; url: string } }>({});
  const [uploadingQId, setUploadingQId] = useState<string | null>(null);
  
  // Timer States
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<any>(null);

  // Detailed modal viewer
  const [viewingDetails, setViewingDetails] = useState<{ submission: ExamSubmission; exam: ExamDetails } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchCategorizedExams = async () => {
    try {
      setLoading(true);
      const res = await apiCall('/api/exams/employee/exams');
      if (res.ok) {
        const data = await res.json();
        setToAttempt(data.toAttempt || []);
        setAwaitingEvaluation(data.awaitingEvaluation || []);
        setEvaluated(data.evaluated || []);
      }
    } catch (e) {
      console.error('Error fetching employee exams:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategorizedExams();
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

  const handleAnswerChange = (qId: string, value: any) => {
    setAnswers({ ...answers, [qId]: value });
  };

  const handleFileUpload = async (qId: string, file: File) => {
    if (!activeSubmission) return;
    setUploadingQId(qId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await apiCall(`/api/exams/submissions/${activeSubmission.id}/upload`, {
        method: 'POST',
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
      fetchCategorizedExams();
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
      if (Array.isArray(answers[q.id])) {
        return answers[q.id].length === 0;
      }
      const ansVal = answers[q.id];
      return ansVal === undefined || ansVal === null || String(ansVal).trim() === '';
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
        fetchCategorizedExams();
      } else {
        const err = await res.json();
        alert(`Submit failed: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error submitting exam.');
    }
  };

  const handleViewDetails = async (sub: ExamSubmission) => {
    try {
      setDetailsLoading(true);
      const res = await apiCall(`/api/exams/${sub.exam_id}`);
      if (res.ok) {
        const exam = await res.json();
        setViewingDetails({ submission: sub, exam });
      } else {
        alert('Failed to load exam details');
      }
    } catch (e) {
      console.error('Error fetching detailed exam specs:', e);
    } finally {
      setDetailsLoading(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
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
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: timeLeft && timeLeft < 300 ? '#ef4444' : 'var(--text-primary)' }}>
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

              <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', lineHeight: '1.4' }}>
                {q.question_text}
              </h4>

              {q.question_type === 'mcq' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(q.options || []).map((opt: string, optIdx: number) => {
                    const isSelected = String(answers[q.id]) === String(optIdx);
                    return (
                      <label 
                        key={optIdx} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '12px', 
                          padding: '12px 16px', 
                          borderRadius: '8px', 
                          background: isSelected ? 'var(--accent-glow)' : 'var(--bg-main)', 
                          border: isSelected ? '1px solid var(--accent-color)' : '1px solid var(--border-color)', 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <input 
                          type="radio" 
                          name={`mcq_${q.id}`} 
                          checked={isSelected}
                          onChange={() => handleAnswerChange(q.id, String(optIdx))}
                          style={{ accentColor: 'var(--accent-color)', width: '18px', height: '18px' }}
                        />
                        <span style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {q.question_type === 'msq' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(q.options || []).map((opt: string, optIdx: number) => {
                    const selectedArr = Array.isArray(answers[q.id]) ? answers[q.id] : (answers[q.id] ? [answers[q.id]] : []);
                    const isChecked = selectedArr.map(String).includes(String(optIdx));
                    
                    const toggleOption = () => {
                      const strIdx = String(optIdx);
                      let updated: string[];
                      if (isChecked) {
                        updated = selectedArr.map(String).filter((item: string) => item !== strIdx);
                      } else {
                        updated = [...selectedArr.map(String), strIdx];
                      }
                      handleAnswerChange(q.id, updated);
                    };

                    return (
                      <label 
                        key={optIdx} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '12px', 
                          padding: '12px 16px', 
                          borderRadius: '8px', 
                          background: isChecked ? 'var(--accent-glow)' : 'var(--bg-main)', 
                          border: isChecked ? '1px solid var(--accent-color)' : '1px solid var(--border-color)', 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={toggleOption}
                          style={{ accentColor: 'var(--accent-color)', width: '18px', height: '18px' }}
                        />
                        <span style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}

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
              fetchCategorizedExams();
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

  if (viewingDetails) {
    return (
      <div className="container animate-fade-in" style={{ marginTop: '40px', paddingBottom: '80px' }}>
        {/* Back Button and Header */}
        <div style={{ marginBottom: '24px' }}>
          <button 
            onClick={() => setViewingDetails(null)} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--accent-color)', 
              fontWeight: 700, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              cursor: 'pointer',
              padding: 0,
              fontSize: '0.95rem'
            }}
          >
            ← Back to Exams
          </button>
          
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '16px', marginBottom: '8px' }}>
            Graded Examination Breakdown
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
            Reviewing results for: <strong>{viewingDetails.exam.title}</strong>
          </p>
        </div>

        {/* Grade Summary and Feedback Panel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '32px' }}>
          
          {/* Overall score card */}
          <div className="glass-panel" style={{ 
            padding: '24px', 
            borderRadius: 'var(--border-radius-lg)', 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-color)', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Overall Score</span>
            <span style={{ 
              fontSize: '3rem', 
              fontWeight: 900, 
              margin: '12px 0',
              color: (viewingDetails.submission.overall_score || 0) >= 8.0 ? 'var(--accent-color)' : '#ef4444' 
            }}>
              {viewingDetails.submission.overall_score} <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', fontWeight: 600 }}>/ 10.0</span>
            </span>
            <span style={{ 
              padding: '6px 14px', 
              borderRadius: '20px', 
              fontSize: '0.78rem', 
              fontWeight: '800',
              textTransform: 'uppercase',
              background: (viewingDetails.submission.overall_score || 0) >= 8.0 ? 'var(--accent-glow)' : 'rgba(239,68,68,0.15)',
              color: (viewingDetails.submission.overall_score || 0) >= 8.0 ? 'var(--accent-color)' : '#ef4444'
            }}>
              {(viewingDetails.submission.overall_score || 0) >= 8.0 ? 'Pass / Compliant' : 'Needs Improvement'}
            </span>
          </div>

          {/* Manager feedback panel */}
          <div className="glass-panel" style={{ 
            padding: '24px', 
            borderRadius: 'var(--border-radius-lg)', 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--accent-color)', display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>
              Manager Review Feedback
            </span>
            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.5, fontStyle: viewingDetails.submission.overall_feedback ? 'normal' : 'italic' }}>
              {viewingDetails.submission.overall_feedback || "No manager feedback was provided for this assessment."}
            </p>
          </div>
        </div>

        {/* Questions serial list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', margin: 0 }}>
            Questions & Response Details
          </h3>

          {(viewingDetails.exam.questions || []).map((q, idx) => {
            const answerRaw = (viewingDetails.submission.answers || {})[q.id] || '';
            let fileObj: { name: string; url: string } | null = null;

            if (q.question_type === 'file_upload') {
              try {
                fileObj = typeof answerRaw === 'string' ? JSON.parse(answerRaw) : answerRaw;
              } catch {
                fileObj = null;
              }
            }

            const questionScore = viewingDetails.submission.scores?.[q.id] ?? 0;

            const renderQuestionDetailsPage = () => {
              if (q.question_type === 'mcq') {
                const selectedIdx = String(answerRaw).trim();
                const correctIdx = String(q.correct_answer).trim();
                
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                    {(q.options || []).map((opt, optIdx) => {
                      const isSelected = selectedIdx === String(optIdx);
                      const isCorrect = correctIdx === String(optIdx);
                      
                      let itemBg = 'var(--bg-main)';
                      let itemBorder = '1px solid var(--border-color)';
                      let statusText = null;

                      if (isSelected) {
                        if (isCorrect) {
                          itemBg = 'rgba(20, 168, 0, 0.08)';
                          itemBorder = '1px solid rgba(20, 168, 0, 0.3)';
                          statusText = <span style={{ color: 'var(--accent-color)', fontWeight: 800, fontSize: '0.8rem', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>✓ Your Correct Answer</span>;
                        } else {
                          itemBg = 'rgba(239, 68, 68, 0.08)';
                          itemBorder = '1px solid rgba(239, 68, 68, 0.3)';
                          statusText = <span style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.8rem', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>✗ Your Incorrect Answer</span>;
                        }
                      } else if (isCorrect) {
                        itemBg = 'rgba(20, 168, 0, 0.04)';
                        itemBorder = '1px dashed rgba(20, 168, 0, 0.25)';
                        statusText = <span style={{ color: 'var(--accent-color)', fontWeight: 800, fontSize: '0.8rem', marginLeft: 'auto' }}>✓ Correct Answer</span>;
                      }

                      return (
                        <div 
                          key={optIdx} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            padding: '12px 16px', 
                            borderRadius: '8px', 
                            background: itemBg, 
                            border: itemBorder,
                            fontSize: '0.88rem'
                          }}
                        >
                          <span>{opt}</span>
                          {statusText}
                        </div>
                      );
                    })}
                  </div>
                );
              }

              if (q.question_type === 'msq') {
                let selectedIndices: string[] = [];
                try {
                  if (Array.isArray(answerRaw)) {
                    selectedIndices = answerRaw.map(String).map(s => s.trim());
                  } else if (typeof answerRaw === 'string') {
                    if (answerRaw.startsWith('[')) {
                      selectedIndices = JSON.parse(answerRaw).map(String).map((s: string) => s.trim());
                    } else if (answerRaw.includes(',')) {
                      selectedIndices = answerRaw.split(',').map(s => s.trim());
                    } else if (answerRaw) {
                      selectedIndices = [answerRaw.trim()];
                    }
                  }
                } catch {
                  selectedIndices = [];
                }

                let correctIndices: string[] = [];
                try {
                  if (Array.isArray(q.correct_answer)) {
                    correctIndices = q.correct_answer.map(String).map(s => s.trim());
                  } else if (typeof q.correct_answer === 'string') {
                    if (q.correct_answer.startsWith('[')) {
                      correctIndices = JSON.parse(q.correct_answer).map(String).map((s: string) => s.trim());
                    } else if (q.correct_answer.includes(',')) {
                      correctIndices = q.correct_answer.split(',').map(s => s.trim());
                    } else if (q.correct_answer) {
                      correctIndices = [q.correct_answer.trim()];
                    }
                  }
                } catch {
                  correctIndices = [];
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                    {(q.options || []).map((opt, optIdx) => {
                      const strOptIdx = String(optIdx);
                      const isSelected = selectedIndices.includes(strOptIdx);
                      const isCorrect = correctIndices.includes(strOptIdx);
                      
                      let itemBg = 'var(--bg-main)';
                      let itemBorder = '1px solid var(--border-color)';
                      let statusText = null;

                      if (isSelected) {
                        if (isCorrect) {
                          itemBg = 'rgba(20, 168, 0, 0.08)';
                          itemBorder = '1px solid rgba(20, 168, 0, 0.3)';
                          statusText = <span style={{ color: 'var(--accent-color)', fontWeight: 800, fontSize: '0.8rem', marginLeft: 'auto' }}>✓ Selected (Correct)</span>;
                        } else {
                          itemBg = 'rgba(239, 68, 68, 0.08)';
                          itemBorder = '1px solid rgba(239, 68, 68, 0.3)';
                          statusText = <span style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.8rem', marginLeft: 'auto' }}>✗ Selected (Incorrect)</span>;
                        }
                      } else if (isCorrect) {
                        itemBg = 'rgba(20, 168, 0, 0.04)';
                        itemBorder = '1px dashed rgba(20, 168, 0, 0.25)';
                        statusText = <span style={{ color: 'var(--accent-color)', fontWeight: 800, fontSize: '0.8rem', marginLeft: 'auto' }}>✓ Correct Answer</span>;
                      }

                      return (
                        <div 
                          key={optIdx} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            padding: '12px 16px', 
                            borderRadius: '8px', 
                            background: itemBg, 
                            border: itemBorder,
                            fontSize: '0.88rem'
                          }}
                        >
                          <span>{opt}</span>
                          {statusText}
                        </div>
                      );
                    })}
                  </div>
                );
              }

              if (q.question_type === 'file_upload') {
                const isCorrect = questionScore >= 8;
                return (
                  <div style={{ 
                    padding: '14px 16px', 
                    background: isCorrect ? 'rgba(20, 168, 0, 0.08)' : 'rgba(239, 68, 68, 0.08)', 
                    border: isCorrect ? '1px solid rgba(20, 168, 0, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)', 
                    borderRadius: '8px', 
                    fontSize: '0.88rem' 
                  }}>
                    {fileObj ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle size={16} style={{ color: isCorrect ? 'var(--accent-color)' : '#ef4444' }} />
                        <a 
                          href={fileObj.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: 'var(--accent-color)', fontWeight: '600', textDecoration: 'underline' }}
                        >
                          {fileObj.name}
                        </a>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isCorrect ? 'var(--accent-color)' : '#ef4444', marginLeft: 'auto' }}>
                          {isCorrect ? '✓ Approved' : '✗ Needs Improvement'}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No file uploaded</span>
                    )}
                  </div>
                );
              }

              // Theory/Descriptive Answers
              const isCorrect = questionScore >= 8;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ 
                    padding: '14px 16px', 
                    background: isCorrect ? 'rgba(20, 168, 0, 0.08)' : 'rgba(239, 68, 68, 0.08)', 
                    border: isCorrect ? '1px solid rgba(20, 168, 0, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)', 
                    borderRadius: '8px', 
                    fontSize: '0.88rem' 
                  }}>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: '800', 
                      textTransform: 'uppercase', 
                      color: isCorrect ? 'var(--accent-color)' : '#ef4444', 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      marginBottom: '8px' 
                    }}>
                      <span>Your Submitted Answer</span>
                      <span>{isCorrect ? '✓ Correct Answer' : '✗ Needs Improvement'}</span>
                    </span>
                    <p style={{ margin: 0, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {answerRaw || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No response written</span>}
                    </p>
                  </div>
                  
                  {q.correct_answer && (
                    <div style={{ padding: '14px 16px', background: 'rgba(20,168,0,0.02)', border: '1px dashed var(--border-color)', borderRadius: '8px', fontSize: '0.88rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--accent-color)', display: 'block', marginBottom: '8px' }}>
                        Ideal Model Answer
                      </span>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                        {String(q.correct_answer)}
                      </p>
                    </div>
                  )}
                </div>
              );
            };

            return (
              <div 
                key={q.id} 
                className="glass-panel" 
                style={{ 
                  padding: '24px', 
                  borderRadius: 'var(--border-radius-lg)', 
                  background: 'var(--bg-card)', 
                  border: '1px solid var(--border-color)' 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', background: 'var(--accent-glow)', color: 'var(--accent-color)', textTransform: 'uppercase' }}>
                      {q.question_type.replace('_', ' ')}
                    </span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Question {idx + 1}
                    </span>
                  </div>
                  
                  <span style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: '800', 
                    padding: '4px 12px', 
                    borderRadius: '6px',
                    background: 'var(--bg-main)',
                    color: questionScore >= 8 ? 'var(--accent-color)' : questionScore >= 5 ? '#f59e0b' : '#ef4444',
                    whiteSpace: 'nowrap',
                    border: '1px solid var(--border-color)'
                  }}>
                    Score: {questionScore} / 10
                  </span>
                </div>

                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', lineHeight: '1.4', marginTop: 0 }}>
                  {q.question_text}
                </h4>

                {renderQuestionDetailsPage()}
              </div>
            );
          })}
        </div>

        {/* Back Button Footer */}
        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-start' }}>
          <Button variant="outline" onClick={() => setViewingDetails(null)} style={{ height: '44px', fontWeight: '700' }}>
            Back to Exams
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ marginTop: '40px', paddingBottom: '60px' }}>
      <div className="pane-header" style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Assigned Exams</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '4px' }}>
          Inspect, launch, and review assigned exams mapped to your corporate training pathways.
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="animate-spin" style={{ width: '36px', height: '36px', border: '3px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
        </div>
      ) : (
        <>
          {/* Tab Selection Buttons - Using Global Theme Accent Colors */}
          <div className="catalog-tabs-container" style={{ display: 'flex', gap: '20px', marginBottom: '28px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('toAttempt')}
              style={{
                border: 'none',
                background: 'none',
                fontSize: '1.05rem',
                fontWeight: 700,
                color: activeTab === 'toAttempt' ? 'var(--accent-color)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'toAttempt' ? '2px solid var(--accent-color)' : 'none',
                paddingBottom: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Clock size={16} />
              <span>To Attempt</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 6px', borderRadius: '10px', background: activeTab === 'toAttempt' ? 'var(--accent-glow)' : 'var(--bg-main)', color: activeTab === 'toAttempt' ? 'var(--accent-color)' : 'var(--text-secondary)' }}>
                {toAttempt.length}
              </span>
            </button>
            
            <button
              type="button"
              onClick={() => setActiveTab('awaitingEvaluation')}
              style={{
                border: 'none',
                background: 'none',
                fontSize: '1.05rem',
                fontWeight: 700,
                color: activeTab === 'awaitingEvaluation' ? 'var(--accent-color)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'awaitingEvaluation' ? '2px solid var(--accent-color)' : 'none',
                paddingBottom: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Hourglass size={16} />
              <span>Awaiting Evaluation</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 6px', borderRadius: '10px', background: activeTab === 'awaitingEvaluation' ? 'var(--accent-glow)' : 'var(--bg-main)', color: activeTab === 'awaitingEvaluation' ? 'var(--accent-color)' : 'var(--text-secondary)' }}>
                {awaitingEvaluation.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('evaluated')}
              style={{
                border: 'none',
                background: 'none',
                fontSize: '1.05rem',
                fontWeight: 700,
                color: activeTab === 'evaluated' ? 'var(--accent-color)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'evaluated' ? '2px solid var(--accent-color)' : 'none',
                paddingBottom: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle size={16} />
              <span>Completed</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 6px', borderRadius: '10px', background: activeTab === 'evaluated' ? 'var(--accent-glow)' : 'var(--bg-main)', color: activeTab === 'evaluated' ? 'var(--accent-color)' : 'var(--text-secondary)' }}>
                {evaluated.length}
              </span>
            </button>
          </div>

          {/* ACTIVE TAB CONTENT */}
          {activeTab === 'toAttempt' && (
            <div className="animate-fade-in">
              {toAttempt.length === 0 ? (
                <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <BookOpen size={48} style={{ opacity: 0.15, marginBottom: '16px', color: 'var(--accent-color)' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>
                    Nothing to attempt right now — check back after your next course unlocks
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                  {toAttempt.map(sub => (
                    <div key={sub.id} className="glass-panel glow-hover" style={{ padding: '20px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'var(--bg-card)' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', fontWeight: '800', padding: '3px 8px', borderRadius: '4px', background: 'var(--accent-glow)', color: 'var(--accent-color)', display: 'inline-block', marginBottom: '10px', textTransform: 'uppercase' }}>
                          {sub.course_code || 'EXAM'}
                        </span>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: '800', margin: '0 0 8px 0', color: 'var(--text-primary)', lineHeight: 1.3 }}>{sub.exam_title}</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>{sub.course_title || 'Standalone Exam'}</p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '10px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>⏱️ Limit: {sub.duration_minutes || 60} mins</span>
                          {sub.due_date && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>📅 Due: {new Date(sub.due_date).toLocaleDateString()}</span>}
                        </div>
                      </div>

                      <div style={{ marginTop: '20px' }}>
                        <Button 
                          variant="primary" 
                          onClick={() => handleStartExam(sub)}
                          style={{ width: '100%', height: '40px', fontSize: '0.85rem', fontWeight: '700' }}
                        >
                          {sub.status === 'in_progress' ? 'Resume Exam' : 'Start Exam'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'awaitingEvaluation' && (
            <div className="animate-fade-in">
              {awaitingEvaluation.length === 0 ? (
                <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Hourglass size={48} style={{ opacity: 0.15, marginBottom: '16px', color: 'var(--accent-color)' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>
                    No exams awaiting evaluation
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                  {awaitingEvaluation.map(sub => (
                    <div key={sub.id} className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: '800', padding: '3px 8px', borderRadius: '4px', background: 'var(--accent-glow)', color: 'var(--accent-color)', display: 'inline-block', textTransform: 'uppercase' }}>
                            {sub.course_code || 'EXAM'}
                          </span>
                          <span style={{ fontSize: '0.72rem', fontWeight: '800', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                            Awaiting Results
                          </span>
                        </div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: '800', margin: '0 0 8px 0', color: 'var(--text-primary)', lineHeight: 1.3 }}>{sub.exam_title}</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>{sub.course_title || 'Standalone Exam'}</p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '10px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>📤 Submitted: {formatDate(sub.submitted_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'evaluated' && (
            <div className="animate-fade-in">
              {evaluated.length === 0 ? (
                <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <CheckCircle size={48} style={{ opacity: 0.15, marginBottom: '16px', color: 'var(--accent-color)' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>
                    You haven't completed any exams yet
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                  {evaluated.map(sub => {
                    const isPass = sub.overall_score !== undefined && sub.overall_score !== null && sub.overall_score >= 8.0;
                    return (
                      <div key={sub.id} className="glass-panel glow-hover" style={{ padding: '20px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'var(--bg-card)' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: '800', padding: '3px 8px', borderRadius: '4px', background: 'var(--accent-glow)', color: 'var(--accent-color)', display: 'inline-block', textTransform: 'uppercase' }}>
                              {sub.course_code || 'EXAM'}
                            </span>
                            <span style={{ 
                              fontSize: '0.72rem', 
                              fontWeight: '800', 
                              padding: '2px 8px', 
                              borderRadius: '4px', 
                              background: isPass ? 'rgba(20,168,0,0.15)' : 'rgba(239,68,68,0.15)', 
                              color: isPass ? 'var(--accent-color)' : '#ef4444', 
                              textTransform: 'uppercase' 
                            }}>
                              {isPass ? 'Pass' : 'Needs Imp.'}
                            </span>
                          </div>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: '800', margin: '0 0 8px 0', color: 'var(--text-primary)', lineHeight: 1.3 }}>{sub.exam_title}</h4>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>{sub.course_title || 'Standalone Exam'}</p>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '6px', margin: '14px 0' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Score:</span>
                            <strong style={{ fontSize: '1.1rem', color: isPass ? 'var(--accent-color)' : '#ef4444' }}>{sub.overall_score !== null ? `${sub.overall_score} / 10.0` : 'N/A'}</strong>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '10px' }}>
                            <span>📅 Graded: {formatDate(sub.graded_at)}</span>
                          </div>
                        </div>

                        <div style={{ marginTop: '20px' }}>
                          <Button 
                            variant="outline" 
                            onClick={() => handleViewDetails(sub)}
                            style={{ width: '100%', height: '40px', fontSize: '0.85rem', fontWeight: '700' }}
                            leftIcon={<FileText size={14} />}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

    </div>
  );
};

