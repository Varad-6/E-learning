import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, CheckCircle } from 'lucide-react';
import { Button } from '../../components/Button/Button';
import { apiCall } from '../../services/api';

interface QuestionInput {
  question_text: string;
  question_type: 'short_answer' | 'descriptive' | 'file_upload';
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
  const [newQuestionType, setNewQuestionType] = useState<'short_answer' | 'descriptive' | 'file_upload'>('short_answer');

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
          // Filter out unpublished/draft if needed, or get approved courses
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

    setQuestions([
      ...questions,
      {
        question_text: newQuestionText.trim(),
        question_type: newQuestionType
      }
    ]);
    setNewQuestionText('');
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleSaveExam = async () => {
    if (!examTitle.trim()) {
      alert('Please enter an exam title.');
      return;
    }
    if (questions.length === 0) {
      alert('Please add at least one question.');
      return;
    }

    setLoading(true);
    try {
      const targetDeptId = selectedDepartment === 'all' || !selectedDepartment ? null : selectedDepartment;
      const targetCourseId = selectedCourse === 'none' || !selectedCourse ? null : selectedCourse;
      const payload = {
        title: examTitle.trim(),
        course_id: targetCourseId,
        department_id: targetDeptId,
        duration_minutes: duration,
        is_published: true,
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
      </div>

      {success ? (
        <div className="glass-panel animate-float" style={{ padding: '48px', textAlign: 'center', borderRadius: 'var(--border-radius-lg)', background: 'var(--accent-glow)', border: '1px solid var(--border-color)' }}>
          <CheckCircle size={48} className="pulse-active" style={{ color: 'var(--color-success)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', marginBottom: '8px' }}>Exam Published Successfully!</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Assigning and loading parameters for department employees...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '30px', alignItems: 'flex-start' }}>
          
          {/* Main workspace builder */}
          <div className="glass-panel glow-hover" style={{ padding: '24px', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px' }}>📝 Questions Constructor</h3>

            {questions.length === 0 ? (
              <div style={{ padding: '40px 0', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center' }}>
                No questions added to this exam yet. Use the selector constructor form below.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                {questions.map((q, idx) => (
                  <div key={idx} style={{ padding: '16px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', background: 'var(--accent-glow)', color: 'var(--accent-color)', textTransform: 'uppercase' }}>
                          {q.question_type.replace('_', ' ')}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Question {idx + 1}</span>
                      </div>
                      <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', margin: 0 }}>{q.question_text}</p>
                    </div>
                    <button 
                      onClick={() => handleRemoveQuestion(idx)} 
                      style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px' }}
                      title="Delete question"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Question adder form */}
            <form onSubmit={handleAddQuestion} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '16px' }}>+ Append Question Task</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '24px', marginBottom: '24px' }}>
                <div className="form-group-spaced" style={{ margin: 0 }}>
                  <label className="form-label-styled" style={{ fontSize: '0.78rem' }}>Question Description</label>
                  <input 
                    type="text" 
                    className="form-input-styled" 
                    placeholder="e.g. Describe the gradient descent parameters and backpropagation limitations."
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-spaced" style={{ margin: 0 }}>
                  <label className="form-label-styled" style={{ fontSize: '0.78rem' }}>Response Format</label>
                  <select 
                    className="form-input-styled" 
                    value={newQuestionType}
                    onChange={(e) => setNewQuestionType(e.target.value as any)}
                  >
                    <option value="short_answer">Short Answer</option>
                    <option value="descriptive">Descriptive (Long Text)</option>
                    <option value="file_upload">File Attachment Upload</option>
                  </select>
                </div>
              </div>

              <Button variant="outline" type="submit" leftIcon={<Plus size={16} />} style={{ width: '100%', height: '48px' }}>
                Add Question to Exam
              </Button>
            </form>
          </div>

          {/* Sidebar parameters */}
          <div className="glass-panel glow-hover animate-float" style={{ animationDelay: '0.2s', padding: '24px', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>⚙️ Exam Settings</h3>
            
            <div className="form-group-spaced" style={{ margin: 0 }}>
              <label className="form-label-styled" style={{ fontSize: '0.78rem' }}>Exam Title <span className="required-star">*</span></label>
              <input 
                type="text" 
                className="form-input-styled" 
                placeholder="e.g. AI Certification Final Exam"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group-spaced" style={{ margin: 0 }}>
              <label className="form-label-styled" style={{ fontSize: '0.78rem' }}>Assigned Target Department <span className="required-star">*</span></label>
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
              <label className="form-label-styled" style={{ fontSize: '0.78rem' }}>Context Course</label>
              <select 
                className="form-input-styled" 
                value={selectedCourse} 
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                <option value="none">None (Standalone Exam)</option>
                {filteredCourses.map(c => (
                  <option key={c.id} value={c.id}>[{c.course_code}] {c.title}</option>
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

            <Button 
              variant="primary" 
              onClick={handleSaveExam}
              disabled={loading}
              style={{ width: '100%', minHeight: '48px', fontWeight: '700', marginTop: '16px' }}
            >
              {loading ? 'Publishing Exam...' : '🚀 Publish Exam'}
            </Button>
          </div>

        </div>
      )}
    </div>
  );
};
