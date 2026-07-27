import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Upload, FileText, CheckCircle,
  AlertCircle, ChevronLeft, ChevronRight, Trash2, Sparkles, FileDown, Cpu
} from 'lucide-react';
import { Button } from '../../components/Button/Button';
import { apiCall } from '../../services/api';

interface QuestionInput {
  question_text: string;
  question_type: 'mcq' | 'msq' | 'short_answer' | 'descriptive' | 'file_upload';
  options?: string[];
  correct_answer?: any;
  source?: 'template' | 'ai_extraction' | 'manual';
}

const PAGE_SIZE = 20;
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// ── Source Badge ──────────────────────────────────────────────
const SourceBadge: React.FC<{ source?: string }> = ({ source }) => {
  if (source === 'template') return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.05em',
      background: 'color-mix(in srgb, #10b981 12%, transparent)',
      color: '#059669', border: '1px solid color-mix(in srgb, #10b981 30%, transparent)',
      borderRadius: '20px', padding: '2px 8px',
    }}><CheckCircle size={9} /> Verified</span>
  );
  if (source === 'ai_extraction') return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.05em',
      background: 'color-mix(in srgb, #3b82f6 12%, transparent)',
      color: '#2563eb', border: '1px solid color-mix(in srgb, #3b82f6 30%, transparent)',
      borderRadius: '20px', padding: '2px 8px',
    }}><FileText size={9} /> Auto-Parsed</span>
  );
  return null;
};

// ── Inline spinner ───────────────────────────────────────────
const Spinner = () => (
  <span style={{
    width: '14px', height: '14px', display: 'inline-block',
    border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
    borderRadius: '50%', animation: 'ec-spin 0.65s linear infinite',
  }} />
);

export const ExamCreator: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Data ──────────────────────────────────────────────────
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('none');
  const [examTitle, setExamTitle] = useState('');
  const [duration, setDuration] = useState(60);
  const [questions, setQuestions] = useState<QuestionInput[]>([]);

  // ── Manual question form ──────────────────────────────────
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<QuestionInput['question_type']>('mcq');
  const [optInputs, setOptInputs] = useState<string[]>(['', '', '', '']);
  const [mcqCorrect, setMcqCorrect] = useState<string>('0');
  const [msqCorrect, setMsqCorrect] = useState<string[]>(['0']);

  // ── UI State ──────────────────────────────────────────────
  const [saveLoading, setSaveLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [dlTemplateLoading, setDlTemplateLoading] = useState(false);
  const [dlQuestionsLoading, setDlQuestionsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Upload banner
  const [uploadBanner, setUploadBanner] = useState<{
    status: 'idle' | 'processing' | 'done' | 'error';
    message: string;
    method?: string;
  }>({ status: 'idle', message: '' });

  const totalPages = Math.ceil(questions.length / PAGE_SIZE);
  const pagedQuestions = questions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Filtered courses by selected department
  const filteredCourses = courses.filter(c =>
    selectedDepartment === 'all' ||
    String(c.department_id) === String(selectedDepartment) ||
    c.department_id === selectedDepartment
  );

  // ── Load departments & courses ────────────────────────────
  useEffect(() => {
    apiCall('/api/departments').then(r => r.ok && r.json()).then(data => {
      if (data && data.length > 0) {
        setDepartments(data);
        setSelectedDepartment(data[0].id);
      }
    }).catch(() => {});

    apiCall('/api/courses').then(r => r.ok && r.json()).then(data => {
      if (data && data.courses) {
        setCourses(data.courses);
      }
    }).catch(() => {});
  }, []);

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDepartment(e.target.value);
    setSelectedCourse('none');
  };

  // ── Manual Question Add ───────────────────────────────────
  const handleAddQuestion = () => {
    if (!newQuestionText.trim()) return;
    const opts = ['mcq', 'msq'].includes(newQuestionType)
      ? optInputs.map(o => o.trim()).filter(Boolean)
      : undefined;
    const corrAns = newQuestionType === 'mcq' ? mcqCorrect
      : newQuestionType === 'msq' ? msqCorrect : undefined;
    setQuestions(prev => [...prev, {
      question_text: newQuestionText.trim(),
      question_type: newQuestionType,
      options: opts,
      correct_answer: corrAns,
      source: 'manual',
    }]);
    setNewQuestionText('');
    setOptInputs(['', '', '', '']);
    setMcqCorrect('0');
    setMsqCorrect(['0']);
  };

  const handleRemoveQuestion = (globalIdx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== globalIdx));
    if (currentPage > 1 && pagedQuestions.length === 1) setCurrentPage(p => p - 1);
  };

  // ── Download Blank Template ───────────────────────────────
  const handleDownloadTemplate = async () => {
    setDlTemplateLoading(true);
    try {
      const res = await apiCall('/api/exams/download-template');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'kaizen_question_template.txt';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else {
        alert('Failed to download template.');
      }
    } catch { alert('Network error downloading template.'); }
    finally { setDlTemplateLoading(false); }
  };

  // ── Download Current Questions as DOCX ───────────────────
  const handleDownloadQuestions = async () => {
    if (questions.length === 0) return;
    setDlQuestionsLoading(true);
    try {
      const res = await apiCall('/api/exams/export-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kaizen_questions_${questions.length}q.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else {
        alert('Failed to export questions.');
      }
    } catch { alert('Network error exporting questions.'); }
    finally { setDlQuestionsLoading(false); }
  };

  // ── Upload File (ALL questions, no cap) ───────────────────
  const handleFileUpload = async (file: File) => {
    setUploadLoading(true);
    const isPdfOrDocx = /\.(pdf|docx)$/i.test(file.name);
    setUploadBanner({
      status: 'processing',
      message: `⚡ Parsing "${file.name}" document format…`,
    });

    const formData = new FormData();
    formData.append('file', file);
    // No target_count sent → backend defaults to 9999 (all questions)

    try {
      const res = await apiCall('/api/exams/generate-from-pdf', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const method: string = data.parse_method || 'ai_extraction';
        const parsed: QuestionInput[] = (data.questions || []).map((q: any) => ({
          question_text: q.question_text,
          question_type: q.question_type || 'mcq',
          options: q.options || [],
          correct_answer: q.correct_answer ?? '0',
          source: (q.source || 'ai_extraction') as QuestionInput['source'],
        }));

        setQuestions(prev => [...prev, ...parsed]);
        setCurrentPage(1);

        const methodLabel = method === 'template_structured'
          ? '⚡ Fast Template Parse'
          : method === 'template_partial'
          ? '⚡ Standard Pattern Parse'
          : '📄 Format Extracted';

        setUploadBanner({
          status: 'done',
          message: `${methodLabel} — ${parsed.length} question${parsed.length !== 1 ? 's' : ''} imported from "${file.name}"`,
          method,
        });
      } else {
        const err = await res.json().catch(() => ({}));
        setUploadBanner({ status: 'error', message: `Upload failed: ${err.detail || 'Invalid format or empty file.'}` });
      }
    } catch {
      setUploadBanner({ status: 'error', message: 'Network error — check backend connection.' });
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Save / Publish Exam ───────────────────────────────────
  const handleSaveExam = async (publishImmediately: boolean) => {
    if (!examTitle.trim()) { alert('Please provide an Exam Title.'); return; }
    if (questions.length === 0) { alert('Please add at least one question.'); return; }
    setSaveLoading(true);
    try {
      const isUuid = (v: string) => /^[0-9a-fA-F-]{36}$/.test(v);
      const targetCourseId = selectedCourse && isUuid(selectedCourse) ? selectedCourse : null;
      const targetDeptId = selectedDepartment && isUuid(selectedDepartment) ? selectedDepartment : null;

      const res = await apiCall('/api/exams', {
        method: 'POST',
        body: JSON.stringify({
          title: examTitle.trim(),
          course_id: targetCourseId,
          department_id: targetDeptId,
          duration_minutes: duration,
          is_published: publishImmediately,
          questions: questions.map(({ source: _s, ...rest }) => rest),
        }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => navigate('/creator/dashboard'), 1500);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed: ${err.detail || 'Unknown error'}`);
      }
    } catch { alert('Error saving exam.'); }
    finally { setSaveLoading(false); }
  };

  // ── Stats ─────────────────────────────────────────────────
  const verifiedCount = questions.filter(q => q.source === 'template').length;
  const aiCount = questions.filter(q => q.source === 'ai_extraction').length;
  const manualCount = questions.filter(q => q.source === 'manual').length;

  // ─────────────────────────────────────────────────────────
  return (
    <div className="container animate-fade-in" style={{ paddingTop: '36px', paddingBottom: '80px' }}>

      {/* ══════════════════════════════════════
          TOP TOOLBAR
      ══════════════════════════════════════ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        marginBottom: '28px', flexWrap: 'wrap',
      }}>
        {/* Back */}
        <button
          onClick={() => navigate('/creator/dashboard')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '38px', height: '38px', borderRadius: '10px',
            border: '1px solid var(--border-color)', background: 'var(--bg-card)',
            cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0,
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-card)')}
        >
          <ArrowLeft size={16} />
        </button>

        {/* Title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            🛠️ Exam Creator Studio
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.83rem', margin: '2px 0 0' }}>
            Build manually · Upload template · Direct PDF/DOCX import — all questions land here for review.
          </p>
        </div>

        {/* ── Action Button Group ── */}
        <div style={{
          display: 'flex', gap: '8px', alignItems: 'center',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          padding: '6px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          {/* 1. Download Template (blank) */}
          <button
            onClick={handleDownloadTemplate}
            disabled={dlTemplateLoading}
            title="Download blank question template (.docx)"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '9px',
              border: '1px solid var(--border-color)',
              background: 'transparent', cursor: 'pointer',
              fontSize: '0.82rem', fontWeight: 700,
              color: 'var(--text-primary)',
              transition: 'all 0.18s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            {dlTemplateLoading ? <Spinner /> : <FileText size={14} />}
            Download Template
          </button>

          {/* 2. Download Questions (filled, current state) */}
          <button
            onClick={handleDownloadQuestions}
            disabled={questions.length === 0 || dlQuestionsLoading}
            title={questions.length === 0 ? 'Add questions first' : `Download ${questions.length} questions as .docx`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '9px',
              border: '1px solid var(--border-color)',
              background: questions.length > 0 ? 'color-mix(in srgb, var(--accent-color) 8%, transparent)' : 'transparent',
              cursor: questions.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: '0.82rem', fontWeight: 700,
              color: questions.length > 0 ? 'var(--accent-color)' : 'var(--text-muted)',
              borderColor: questions.length > 0 ? 'color-mix(in srgb, var(--accent-color) 35%, transparent)' : 'var(--border-color)',
              transition: 'all 0.18s ease',
              opacity: questions.length > 0 ? 1 : 0.5,
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (questions.length > 0) e.currentTarget.style.background = 'color-mix(in srgb, var(--accent-color) 14%, transparent)'; }}
            onMouseLeave={e => { if (questions.length > 0) e.currentTarget.style.background = 'color-mix(in srgb, var(--accent-color) 8%, transparent)'; }}
          >
            {dlQuestionsLoading ? <Spinner /> : <FileDown size={14} />}
            Download Questions {questions.length > 0 && `(${questions.length})`}
          </button>

          {/* Divider */}
          <div style={{ width: '1px', height: '28px', background: 'var(--border-color)', margin: '0 2px' }} />

          {/* 3. Upload File — primary CTA */}
          <label style={{ cursor: 'pointer' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.xlsx,.xls,.txt"
              style={{ display: 'none' }}
              onChange={e => {
                if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
              }}
            />
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '9px',
                background: uploadLoading
                  ? 'var(--accent-hover)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff', fontWeight: 700, fontSize: '0.83rem',
                border: 'none', cursor: uploadLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(16,185,129,0.35)',
                transition: 'all 0.18s ease',
                whiteSpace: 'nowrap',
                pointerEvents: uploadLoading ? 'none' : 'auto',
              }}
            >
              {uploadLoading ? <Spinner /> : <Upload size={14} />}
              {uploadLoading ? 'Parsing…' : 'Upload PDF / DOCX / Excel'}
            </span>
          </label>
        </div>
      </div>

      {/* ══════════════════════════════════════
          UPLOAD STATUS BANNER
      ══════════════════════════════════════ */}
      {uploadBanner.status !== 'idle' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          marginBottom: '20px', padding: '13px 18px',
          borderRadius: '12px',
          border: `1px solid ${
            uploadBanner.status === 'error' ? '#fca5a5'
            : uploadBanner.status === 'done' ? '#6ee7b7'
            : 'var(--border-color)'
          }`,
          background: uploadBanner.status === 'error'
            ? 'color-mix(in srgb, #ef4444 6%, transparent)'
            : uploadBanner.status === 'done'
            ? 'color-mix(in srgb, #10b981 6%, transparent)'
            : 'var(--bg-card)',
          fontSize: '0.86rem', fontWeight: 600,
          color: uploadBanner.status === 'error' ? '#dc2626'
            : uploadBanner.status === 'done' ? '#065f46'
            : 'var(--text-primary)',
        }}>
          {uploadBanner.status === 'processing' && (
            <span style={{
              width: '16px', height: '16px', flexShrink: 0,
              border: '2px solid var(--accent-color)', borderTopColor: 'transparent',
              borderRadius: '50%', animation: 'ec-spin 0.65s linear infinite', display: 'inline-block',
            }} />
          )}
          {uploadBanner.status === 'done' && <CheckCircle size={16} style={{ flexShrink: 0, color: '#10b981' }} />}
          {uploadBanner.status === 'error' && <AlertCircle size={16} style={{ flexShrink: 0, color: '#dc2626' }} />}
          <span style={{ flex: 1 }}>{uploadBanner.message}</span>
          {uploadBanner.method && (
            <span style={{
              flexShrink: 0, fontSize: '0.73rem', fontWeight: 800,
              padding: '3px 10px', borderRadius: '20px',
              background: uploadBanner.method.startsWith('template')
                ? 'color-mix(in srgb, #10b981 15%, transparent)'
                : 'color-mix(in srgb, #f97316 15%, transparent)',
              color: uploadBanner.method.startsWith('template') ? '#065f46' : '#c2410c',
            }}>
              {uploadBanner.method === 'template_structured' ? '⚡ Template'
                : uploadBanner.method === 'template_partial' ? '⚡ Standard'
                : '📄 Extracted'}
            </span>
          )}
          <button
            onClick={() => setUploadBanner({ status: 'idle', message: '' })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.5, fontSize: '1rem', lineHeight: 1, padding: '0 2px' }}
          >×</button>
        </div>
      )}

      {/* ══════════════════════════════════════
          SUCCESS STATE
      ══════════════════════════════════════ */}
      {success ? (
        <div style={{
          textAlign: 'center', padding: '64px 32px',
          background: 'var(--bg-card)', borderRadius: '20px',
          border: '1px solid var(--border-color)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-color)', margin: '0 0 8px' }}>
            Exam Created Successfully!
          </h3>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Redirecting to Creator Studio…</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>

          {/* ══ LEFT: Questions Panel ══ */}
          <div style={{
            background: 'var(--bg-card)', borderRadius: '16px',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
          }}>
            {/* Panel Header */}
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--bg-card)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>📝 Questions</h3>
                {questions.length > 0 && (
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 700,
                    background: 'var(--accent-glow)', color: 'var(--accent-color)',
                    border: '1px solid color-mix(in srgb, var(--accent-color) 25%, transparent)',
                    borderRadius: '20px', padding: '2px 10px',
                  }}>
                    {questions.length} total
                  </span>
                )}
              </div>
              {/* Mini stats */}
              {questions.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', fontSize: '0.73rem', fontWeight: 700 }}>
                  {verifiedCount > 0 && (
                    <span style={{ color: '#059669', background: 'color-mix(in srgb, #10b981 10%, transparent)', padding: '2px 8px', borderRadius: '12px' }}>
                      ✓ {verifiedCount} verified
                    </span>
                  )}
                  {aiCount > 0 && (
                    <span style={{ color: '#2563eb', background: 'color-mix(in srgb, #3b82f6 10%, transparent)', padding: '2px 8px', borderRadius: '12px' }}>
                      ⚡ {aiCount} extracted
                    </span>
                  )}
                  {manualCount > 0 && (
                    <span style={{ color: 'var(--text-secondary)', background: 'var(--bg-main)', padding: '2px 8px', borderRadius: '12px' }}>
                      ✎ {manualCount} manual
                    </span>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: '20px 24px' }}>
              {/* Empty State */}
              {questions.length === 0 && (
                <div style={{
                  padding: '48px 24px', textAlign: 'center',
                  border: '2px dashed var(--border-color)',
                  borderRadius: '12px', marginBottom: '24px',
                }}>
                  <FileText size={36} style={{ margin: '0 auto 14px', color: 'var(--text-muted)', display: 'block', opacity: 0.5 }} />
                  <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                    No questions yet
                  </p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                    Upload a filled template or standard PDF/DOCX document,<br />
                    or build questions manually using the form below.
                  </p>
                </div>
              )}

              {/* Question Cards */}
              {questions.length > 0 && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                    {pagedQuestions.map((q, pageIdx) => {
                      const globalIdx = (currentPage - 1) * PAGE_SIZE + pageIdx;
                      return (
                        <div key={globalIdx} style={{
                          padding: '14px 16px', borderRadius: '10px',
                          background: 'var(--bg-main)', border: '1px solid var(--border-color)',
                          transition: 'border-color 0.15s ease',
                        }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--accent-color) 30%, transparent)')}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                        >
                          {/* Card header */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <span style={{
                                fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)',
                                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                borderRadius: '6px', padding: '1px 7px', flexShrink: 0,
                              }}>Q{globalIdx + 1}</span>
                              <span style={{
                                fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-color)',
                                flexShrink: 0,
                              }}>{q.question_type.toUpperCase()}</span>
                              <SourceBadge source={q.source} />
                            </div>
                            <button
                              onClick={() => handleRemoveQuestion(globalIdx)}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--text-muted)', padding: '4px', borderRadius: '6px',
                                display: 'flex', alignItems: 'center', transition: 'all 0.15s ease',
                                flexShrink: 0,
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, #ef4444 12%, transparent)'; e.currentTarget.style.color = '#dc2626'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {/* Question text */}
                          <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 10px', lineHeight: 1.5 }}>
                            {q.question_text}
                          </p>

                          {/* Options */}
                          {q.options && q.options.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                              {q.options.map((opt, oIdx) => {
                                const isCorrect = Array.isArray(q.correct_answer)
                                  ? q.correct_answer.includes(String(oIdx))
                                  : String(q.correct_answer) === String(oIdx);
                                return (
                                  <div key={oIdx} style={{
                                    padding: '5px 10px', borderRadius: '7px', fontSize: '0.78rem',
                                    background: isCorrect ? 'color-mix(in srgb, #10b981 10%, transparent)' : 'var(--bg-card)',
                                    border: `1px solid ${isCorrect ? 'color-mix(in srgb, #10b981 35%, transparent)' : 'var(--border-color)'}`,
                                    color: isCorrect ? '#065f46' : 'var(--text-secondary)',
                                    fontWeight: isCorrect ? 700 : 400,
                                    display: 'flex', alignItems: 'center', gap: '5px',
                                  }}>
                                    <span style={{ fontWeight: 800, opacity: 0.6, fontSize: '0.7rem' }}>{LETTERS[oIdx]}</span>
                                    {isCorrect && <CheckCircle size={10} style={{ flexShrink: 0 }} />}
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '10px', paddingTop: '14px',
                      borderTop: '1px solid var(--border-color)',
                    }}>
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        style={{
                          width: '30px', height: '30px', borderRadius: '8px',
                          border: '1px solid var(--border-color)', background: 'var(--bg-card)',
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          opacity: currentPage === 1 ? 0.4 : 1, color: 'var(--text-primary)',
                        }}
                      ><ChevronLeft size={14} /></button>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {currentPage} / {totalPages} &nbsp;·&nbsp; {questions.length} questions
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        style={{
                          width: '30px', height: '30px', borderRadius: '8px',
                          border: '1px solid var(--border-color)', background: 'var(--bg-card)',
                          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          opacity: currentPage === totalPages ? 0.4 : 1, color: 'var(--text-primary)',
                        }}
                      ><ChevronRight size={14} /></button>
                    </div>
                  )}
                </>
              )}

              {/* ── Manual Question Form ── */}
              <div style={{ marginTop: questions.length > 0 ? '24px' : '0', paddingTop: questions.length > 0 ? '24px' : '0', borderTop: questions.length > 0 ? '1px solid var(--border-color)' : 'none' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, marginBottom: '14px', color: 'var(--text-primary)' }}>
                  + Add Question Manually
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Question Text
                    </label>
                    <input
                      type="text"
                      className="form-input-styled"
                      placeholder="Enter your question here…"
                      value={newQuestionText}
                      onChange={e => setNewQuestionText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddQuestion()}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Type
                    </label>
                    <select
                      className="form-input-styled"
                      value={newQuestionType}
                      onChange={e => setNewQuestionType(e.target.value as QuestionInput['question_type'])}
                    >
                      <option value="mcq">MCQ — Single Select</option>
                      <option value="msq">MSQ — Multi Select</option>
                      <option value="short_answer">Short Answer</option>
                      <option value="descriptive">Descriptive Essay</option>
                      <option value="file_upload">File Upload</option>
                    </select>
                  </div>
                </div>

                {(newQuestionType === 'mcq' || newQuestionType === 'msq') && (
                  <div style={{
                    background: 'var(--bg-main)', padding: '14px 16px',
                    borderRadius: '10px', marginBottom: '14px',
                    border: '1px solid var(--border-color)',
                  }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Options & Correct Answer — {newQuestionType === 'mcq' ? 'Pick one' : 'Pick all that apply'}
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {optInputs.map((opt, oIdx) => (
                        <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)', width: '16px', textAlign: 'center', flexShrink: 0 }}>{LETTERS[oIdx]}</span>
                          {newQuestionType === 'mcq' ? (
                            <input type="radio" name="mcqCorrect" checked={mcqCorrect === String(oIdx)} onChange={() => setMcqCorrect(String(oIdx))} style={{ cursor: 'pointer', accentColor: 'var(--accent-color)' }} />
                          ) : (
                            <input type="checkbox" checked={msqCorrect.includes(String(oIdx))} onChange={e => setMsqCorrect(prev => e.target.checked ? [...prev, String(oIdx)] : prev.filter(i => i !== String(oIdx)))} style={{ cursor: 'pointer', accentColor: 'var(--accent-color)' }} />
                          )}
                          <input
                            type="text"
                            className="form-input-styled"
                            placeholder={`Option ${LETTERS[oIdx]}`}
                            value={opt}
                            onChange={e => { const n = [...optInputs]; n[oIdx] = e.target.value; setOptInputs(n); }}
                            style={{ flex: 1 }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleAddQuestion}
                  disabled={!newQuestionText.trim()}
                  style={{
                    width: '100%', padding: '10px',
                    borderRadius: '9px', fontWeight: 700, fontSize: '0.86rem',
                    border: '1px dashed var(--border-color)',
                    background: 'transparent',
                    color: newQuestionText.trim() ? 'var(--accent-color)' : 'var(--text-muted)',
                    cursor: newQuestionText.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.18s ease',
                  }}
                  onMouseEnter={e => { if (newQuestionText.trim()) e.currentTarget.style.background = 'color-mix(in srgb, var(--accent-color) 6%, transparent)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  + Add to Exam
                </button>
              </div>
            </div>
          </div>

          {/* ══ RIGHT SIDEBAR ══ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Exam Settings Card */}
            <div style={{
              background: 'var(--bg-card)', borderRadius: '16px',
              border: '1px solid var(--border-color)', padding: '20px',
            }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚙️ Exam Settings
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Exam Title *
                  </label>
                  <input type="text" className="form-input-styled" placeholder="e.g. Technical Certification Final Exam" value={examTitle} onChange={e => setExamTitle(e.target.value)} />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Department
                  </label>
                  <select className="form-input-styled" value={selectedDepartment} onChange={handleDepartmentChange}>
                    <option value="all">🌟 All Departments</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>[{d.code}] {d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Course (Optional)
                  </label>
                  <select
                    className="form-input-styled"
                    value={selectedCourse}
                    disabled={!selectedDepartment}
                    onChange={e => setSelectedCourse(e.target.value)}
                    style={{
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      opacity: !selectedDepartment ? 0.6 : 1,
                      cursor: !selectedDepartment ? 'not-allowed' : 'pointer',
                    }}
                    title={
                      selectedCourse !== 'none'
                        ? courses.find(c => String(c.id) === String(selectedCourse))?.title || 'Selected Course'
                        : 'None (Standalone Exam)'
                    }
                  >
                    <option value="none">None (Standalone Exam)</option>
                    {filteredCourses.map(c => (
                      <option key={c.id} value={c.id} title={`${c.course_code ? `[${c.course_code}] ` : ''}${c.title}`}>
                        {c.course_code ? `[${c.course_code}] ` : ''}{c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Duration (minutes)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="number" className="form-input-styled" min={5} max={600} value={duration} onChange={e => setDuration(parseInt(e.target.value) || 60)} style={{ flex: 1 }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', flexShrink: 0 }}>min</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Publish Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => handleSaveExam(true)}
                disabled={saveLoading || questions.length === 0}
                style={{
                  width: '100%', padding: '13px',
                  borderRadius: '12px', fontWeight: 800, fontSize: '0.9rem',
                  border: 'none', cursor: (saveLoading || questions.length === 0) ? 'not-allowed' : 'pointer',
                  background: (saveLoading || questions.length === 0)
                    ? 'var(--bg-card-hover)'
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: (saveLoading || questions.length === 0) ? 'var(--text-muted)' : '#fff',
                  boxShadow: questions.length > 0 && !saveLoading ? '0 4px 14px rgba(16,185,129,0.35)' : 'none',
                  transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                {saveLoading ? <><Spinner /> Publishing…</> : `🚀 Publish Directly${questions.length > 0 ? ` (${questions.length} Q)` : ''}`}
              </button>

              <button
                onClick={() => handleSaveExam(false)}
                disabled={saveLoading || questions.length === 0}
                style={{
                  width: '100%', padding: '12px',
                  borderRadius: '12px', fontWeight: 700, fontSize: '0.88rem',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: (saveLoading || questions.length === 0) ? 'var(--text-muted)' : 'var(--text-primary)',
                  cursor: (saveLoading || questions.length === 0) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
                onMouseEnter={e => { if (!saveLoading && questions.length > 0) e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; }}
              >
                📥 Submit for Approval
              </button>
            </div>

            {/* Tip Card */}
            <div style={{
              padding: '14px 16px', borderRadius: '12px',
              background: 'color-mix(in srgb, var(--accent-color) 5%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent-color) 18%, transparent)',
            }}>
              <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '0.8rem', color: 'var(--accent-color)' }}>💡 Bulk Upload Tip</p>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Click <strong>Download Template</strong> → fill in your questions using the [BRACKET] tags → re-upload. 500 questions parse in seconds with no limit.
              </p>
            </div>
          </div>

        </div>
      )}

      <style>{`
        @keyframes ec-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
