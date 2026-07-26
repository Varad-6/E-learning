import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, CheckCircle } from 'lucide-react';
import { Button } from '../../components/Button/Button';
import { apiCall } from '../../services/api';

interface QuestionInput {
  question_text: string;
  question_type: 'mcq' | 'msq' | 'short_answer' | 'descriptive' | 'file_upload';
  options?: string[];
  correct_answer?: any;
}

export const ExamCreator: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [courses, setCourses] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  
  const [selectedCourse, setSelectedCourse] = useState('none');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [examTitle, setExamTitle] = useState('');
  const [duration, setDuration] = useState(60);
  
  const [questions, setQuestions] = useState<QuestionInput[]>([]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<'mcq' | 'msq' | 'short_answer' | 'descriptive' | 'file_upload'>('mcq');

  const [optInputs, setOptInputs] = useState<string[]>(['', '', '', '']);
  const [mcqCorrect, setMcqCorrect] = useState<string>('0');
  const [msqCorrect, setMsqCorrect] = useState<string[]>(['0']);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const filteredCourses = courses.filter(c => String(c.department_id) === String(selectedDepartment) || c.department_id === selectedDepartment);

  useEffect(() => {
    if (selectedCourse !== 'none' && filteredCourses.length > 0) {
      if (!filteredCourses.find(c => String(c.id) === String(selectedCourse))) {
        setSelectedCourse('none');
      }
    } else if (filteredCourses.length === 0) {
      setSelectedCourse('none');
    }
  }, [selectedDepartment, courses]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const coursesRes = await apiCall('/api/courses');
        if (coursesRes.ok) {
          const courseData = await coursesRes.json();
          setCourses(courseData.courses || []);
          setSelectedCourse('none');
        }
        const deptsRes = await apiCall('/api/departments');
        if (deptsRes.ok) {
          const deptData = await deptsRes.json();
          setDepartments(deptData || []);
          if (deptData && deptData.length > 0) {
            setSelectedDepartment(deptData[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load courses or departments', err);
      }
    };
    fetchData();
  }, []);

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    let questionOpts: string[] | undefined = undefined;
    let corrAns: any = undefined;

    if (newQuestionType === 'mcq') {
      questionOpts = optInputs.map(o => o.trim()).filter(Boolean);
      corrAns = mcqCorrect;
    } else if (newQuestionType === 'msq') {
      questionOpts = optInputs.map(o => o.trim()).filter(Boolean);
      corrAns = msqCorrect;
    }

    setQuestions([
      ...questions,
      {
        question_text: newQuestionText.trim(),
        question_type: newQuestionType,
        options: questionOpts,
        correct_answer: corrAns
      }
    ]);
    setNewQuestionText('');
    setOptInputs(['', '', '', '']);
    setMcqCorrect('0');
    setMsqCorrect(['0']);
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleSaveExam = async (publishImmediately: boolean = true) => {
    if (!examTitle.trim()) {
      alert('Please provide an Exam Title before publishing.');
      return;
    }
    if (questions.length === 0) {
      alert('Please add at least one question.');
      return;
    }

    setLoading(true);
    try {
      const isUuid = (val: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);
      const targetDeptId = selectedDepartment && isUuid(selectedDepartment) ? selectedDepartment : null;
      const targetCourseId = selectedCourse && isUuid(selectedCourse) ? selectedCourse : null;
      const payload = {
        title: examTitle.trim(),
        course_id: targetCourseId,
        department_id: targetDeptId,
        duration_minutes: duration,
        is_published: publishImmediately,
        questions: questions
      };

      const res = await apiCall('/api/exams', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/creator/dashboard');
        }, 1500);
      } else {
        const err = await res.json();
        alert(`Failed to save exam: ${err.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error saving exam.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="creator-workspace container animate-fade-in" style={{ paddingBottom: '80px', marginTop: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <Button variant="outline" onClick={() => navigate('/creator/dashboard')} style={{ padding: '8px' }}>
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>🛠️ Exam Creator Studio</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Establish descriptive assessments, short-answer modules, and file upload checkpoints for employees.</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <label style={{ cursor: 'pointer' }}>
            <input 
              type="file" 
              accept=".pdf,.xlsx,.xls" 
              style={{ display: 'none' }}
              onChange={async (e) => {
                if (e.target.files && e.target.files[0]) {
                  const uploadFile = e.target.files[0];
                  const formData = new FormData();
                  formData.append('file', uploadFile);
                  formData.append('target_count', '5');
                  try {
                    setLoading(true);
                    const res = await apiCall('/api/exams/generate-from-pdf', {
                      method: 'POST',
                      body: formData
                    });
                    if (res.ok) {
                      const data = await res.json();
                      const parsedQs: QuestionInput[] = data.questions.map((q: any) => ({
                        question_text: q.question_text,
                        question_type: q.question_type || 'mcq',
                        options: q.options || ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
                        correct_answer: q.correct_answer || '0'
                      }));
                      setQuestions(prev => [...prev, ...parsedQs]);
                      alert(`Successfully generated ${parsedQs.length} questions from ${uploadFile.name}!`);
                    } else {
                      const errData = await res.json();
                      alert(`AI Generation Failed: ${errData.detail || 'Invalid document format'}`);
                    }
                  } catch (err) {
                    alert('Error connecting to AI Exam Generation service.');
                  } finally {
                    setLoading(false);
                  }
                }
              }}
            />
            <span className="button button-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 16px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}>
              🤖 Auto-Generate from PDF / Excel
            </span>
          </label>
        </div>
      </div>

      {success ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-success)', marginBottom: '8px' }}>🎉 Exam Created Successfully!</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Redirecting to Creator Studio Dashboard...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
          
          {/* Main Questions Constructor Canvas */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '20px' }}>📝 Questions Constructor</h3>

            {questions.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', border: '2px dashed var(--border-color)', borderRadius: 'var(--border-radius-md)', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                <p>No questions added to this exam yet. Use the selector constructor form below or upload a PDF/Excel document.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                {questions.map((q, idx) => (
                  <div key={idx} style={{ padding: '16px', borderRadius: 'var(--border-radius-md)', background: 'var(--bg-main)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-color)' }}>Question {idx + 1} ({q.question_type.toUpperCase()})</span>
                      <Button variant="outline" size="sm" onClick={() => handleRemoveQuestion(idx)}>Remove</Button>
                    </div>
                    <p style={{ fontWeight: 700, marginBottom: '12px', fontSize: '0.95rem' }}>{q.question_text}</p>
                    {q.options && q.options.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.82rem' }}>
                        {q.options.map((opt: string, oIdx: number) => {
                          const isCorrect = Array.isArray(q.correct_answer) 
                            ? q.correct_answer.includes(String(oIdx))
                            : String(q.correct_answer) === String(oIdx);
                          return (
                            <div key={oIdx} style={{ padding: '8px 12px', borderRadius: '6px', background: isCorrect ? 'var(--accent-glow)' : 'var(--bg-card)', border: `1px solid ${isCorrect ? 'var(--accent-color)' : 'var(--border-color)'}` }}>
                              {isCorrect ? '✅ ' : ''}{opt}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Question Append Control Form */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, marginBottom: '16px' }}>+ Append Question Task</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label className="form-label-styled" style={{ fontSize: '0.78rem' }}>Question Description</label>
                  <input 
                    type="text" 
                    className="form-input-styled"
                    placeholder="e.g. Describe the gradient descent parameters and backpropagation limitations."
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label-styled" style={{ fontSize: '0.78rem' }}>Response Format</label>
                  <select 
                    className="form-input-styled"
                    value={newQuestionType}
                    onChange={(e: any) => setNewQuestionType(e.target.value)}
                  >
                    <option value="mcq">MCQ (Single Select)</option>
                    <option value="msq">MSQ (Multi Select)</option>
                    <option value="short_answer">Short Answer Text</option>
                    <option value="descriptive">Descriptive Essay</option>
                    <option value="file_upload">File Upload Checkpoint</option>
                  </select>
                </div>
              </div>

              {(newQuestionType === 'mcq' || newQuestionType === 'msq') && (
                <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: 'var(--border-radius-md)', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
                  <label className="form-label-styled" style={{ fontSize: '0.78rem', marginBottom: '12px', display: 'block' }}>
                    Options & Correct Answer ({newQuestionType === 'mcq' ? 'Select 1 Radio' : 'Select Checkboxes'})
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {optInputs.map((opt, oIdx) => (
                      <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {newQuestionType === 'mcq' ? (
                          <input 
                            type="radio" 
                            name="mcqCorrectChoice"
                            checked={mcqCorrect === String(oIdx)}
                            onChange={() => setMcqCorrect(String(oIdx))}
                            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                          />
                        ) : (
                          <input 
                            type="checkbox" 
                            checked={msqCorrect.includes(String(oIdx))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setMsqCorrect(prev => [...prev, String(oIdx)]);
                              } else {
                                setMsqCorrect(prev => prev.filter(i => i !== String(oIdx)));
                              }
                            }}
                            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                          />
                        )}
                        <input 
                          type="text" 
                          className="form-input-styled"
                          placeholder={`Option ${oIdx + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...optInputs];
                            newOpts[oIdx] = e.target.value;
                            setOptInputs(newOpts);
                          }}
                          style={{ flex: 1 }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button variant="outline" onClick={handleAddQuestion} style={{ width: '100%' }}>
                + Add Question to Exam
              </Button>
            </div>
          </div>

          {/* Right Sidebar: Exam Parameters */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '8px' }}>⚙️ Exam Settings</h3>

            <div className="form-group-spaced" style={{ margin: 0 }}>
              <label className="form-label-styled" style={{ fontSize: '0.78rem' }}>Exam Title *</label>
              <input 
                type="text" 
                className="form-input-styled" 
                placeholder="e.g. AI Certification Final Exam"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
              />
            </div>

            <div className="form-group-spaced" style={{ margin: 0 }}>
              <label className="form-label-styled" style={{ fontSize: '0.78rem' }}>Assigned Target Department *</label>
              <select 
                className="form-input-styled" 
                value={selectedDepartment} 
                onChange={(e) => setSelectedDepartment(e.target.value)}
              >
                <option value="all">🌟 All Departments (Company-wide)</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>[{d.code}] {d.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group-spaced" style={{ margin: 0 }}>
              <label className="form-label-styled" style={{ fontSize: '0.78rem' }}>Time Duration limit</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="number" 
                  className="form-input-styled" 
                  min="5" 
                  max="300"
                  value={duration} 
                  onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>minutes</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
              <Button 
                variant="primary" 
                onClick={() => handleSaveExam(true)}
                disabled={loading}
                style={{ width: '100%', minHeight: '44px', fontWeight: '700' }}
              >
                {loading ? 'Processing...' : '🚀 Publish Directly'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleSaveExam(false)}
                disabled={loading}
                style={{ width: '100%', minHeight: '44px', fontWeight: '700' }}
              >
                {loading ? 'Processing...' : '📥 Submit for Approval'}
              </Button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
