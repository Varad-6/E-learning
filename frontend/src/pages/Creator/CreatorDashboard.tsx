
import './Creator.css';

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Clock, X } from 'lucide-react';
import { Button } from '../../components/Button/Button';
import './Creator.css';

interface CourseData {
  id: string;
  course_code: string;
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  duration: string;
  is_published: boolean;
}

const INITIAL_COURSES: CourseData[] = [
  { id: 'c1', course_code: 'AI-101', title: 'Artificial Intelligence Foundations', description: 'Core principles of machine learning models, neural networks, and AI ethics.', priority: 'High', duration: '12 Hours', is_published: true },
  { id: 'c2', course_code: 'FICO-202', title: 'SAP FICO Ledger & Asset Accounting', description: 'Learn financial control parameters, ledger structures, and cost calculations.', priority: 'Medium', duration: '16 Hours', is_published: true },
  { id: 'c3', course_code: 'ABAP-301', title: 'ABAP Syntax & Database Orchestration', description: 'Advanced programming on SAP NetWeaver, custom database queries, and RFCs.', priority: 'High', duration: '20 Hours', is_published: true },
  { id: 'c4', course_code: 'SD-102', title: 'Sales and Distribution Lifecycle', description: 'Master shipping structures, bill matrices, and customer logistics pipelines.', priority: 'Low', duration: '8 Hours', is_published: true }
];

export const CreatorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form States
  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [duration, setDuration] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    // Load courses from localStorage or initialize with defaults
    const localCourses = localStorage.getItem('creator_courses');
    if (localCourses) {
      setCourses(JSON.parse(localCourses));
    } else {
      setCourses(INITIAL_COURSES);
      localStorage.setItem('creator_courses', JSON.stringify(INITIAL_COURSES));
    }
  }, []);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setErrors({});
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTitle('');
    setCourseCode('');
    setDescription('');
    setPriority('Medium');
    setDuration('');
    setErrors({});
  };

  const validate = () => {
    const tempErrors: { [key: string]: string } = {};
    if (!title.trim()) tempErrors.title = 'Course Title is required.';
    if (!courseCode.trim()) tempErrors.courseCode = 'Course Code is required.';
    if (!description.trim()) tempErrors.description = 'Course Description is required.';
    if (!duration.trim()) tempErrors.duration = 'Duration is required (e.g., 10 Hours or 4 Weeks).';
    
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const newCourse: CourseData = {
      id: `c_${Date.now()}`,
      course_code: courseCode.trim().toUpperCase(),
      title: title.trim(),
      description: description.trim(),
      priority,
      duration: duration.trim(),
      is_published: false
    };

    const updatedCourses = [newCourse, ...courses];
    setCourses(updatedCourses);
    localStorage.setItem('creator_courses', JSON.stringify(updatedCourses));
    handleCloseModal();
  };

  return (
    <div className="creator-workspace container">
      {/* Header and summary dashboard */}
      <div className="creator-header">
        <div>
          <h1>Creator Studio</h1>
          <p>Design, build, and publish professional learning pathways and course modules.</p>
        </div>
        <Button 
          variant="primary" 
          onClick={handleOpenModal}
          leftIcon={<Plus size={18} />}
        >
          Create New Course
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="creator-stats-row">
        <div className="stat-card">
          <div className="stat-card-title">Managed Courses</div>
          <div className="stat-card-value">{courses.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-title">Published Pathways</div>
          <div className="stat-card-value">{courses.filter(c => c.is_published).length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-title">Draft Status</div>
          <div className="stat-card-value">{courses.filter(c => !c.is_published).length}</div>
        </div>
      </div>

      {/* Grid Canvas */}
      <div className="course-grid-header">
        <h2>My Courses</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Showing {courses.length} courses
        </span>
      </div>

      {courses.length === 0 ? (
        <div className="empty-state-banner">
          <BookOpen size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <h3>No Courses Found</h3>
          <p>Click the "Create New Course" button to establish your first syllabus node.</p>
        </div>
      ) : (
        <div className="creator-course-grid">
          {courses.map((course) => (
            <div 
              key={course.id} 
              className="creator-course-card glass-panel"
              onClick={() => navigate(`/creator/course/${course.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div className="course-card-meta">
                <span className="course-badge-code">{course.course_code}</span>
                <span className={`course-badge-priority ${course.priority.toLowerCase()}`}>
                  {course.priority} Priority
                </span>
              </div>
              
              <h3>{course.title}</h3>
              <p>{course.description}</p>
              
              <div className="course-card-footer">
                <span className="course-card-duration">
                  <Clock size={14} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'text-bottom' }} />
                  {course.duration}
                </span>
                <span className={`badge ${course.is_published ? 'success' : 'warning'}`}>
                  {course.is_published ? 'Published' : 'Draft'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Course Creation Modal Overlay */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content-card glass-panel">
            <div className="modal-header-row">
              <h2>Create Course Option</h2>
              <button onClick={handleCloseModal} className="close-modal-btn">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Title */}
              <div className="form-group-spaced">
                <label className="form-label-styled">
                  Course Title <span className="required-star">*</span>
                </label>
                <input 
                  type="text" 
                  className="form-input-styled" 
                  placeholder="e.g. Advanced Production Design"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                {errors.title && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>{errors.title}</p>
                )}
              </div>

              {/* Code */}
              <div className="form-group-spaced">
                <label className="form-label-styled">
                  Course Code <span className="required-star">*</span>
                </label>
                <input 
                  type="text" 
                  className="form-input-styled" 
                  placeholder="e.g. APD-101"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                />
                {errors.courseCode && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>{errors.courseCode}</p>
                )}
              </div>

              {/* Description */}
              <div className="form-group-spaced">
                <label className="form-label-styled">
                  Course Description <span className="required-star">*</span>
                </label>
                <textarea 
                  className="form-textarea-styled" 
                  placeholder="Summarize course topics, learning targets, and outcomes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                {errors.description && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>{errors.description}</p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Priority */}
                <div className="form-group-spaced">
                  <label className="form-label-styled">
                    Priority <span className="required-star">*</span>
                  </label>
                  <select 
                    className="form-select-styled"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                {/* Duration */}
                <div className="form-group-spaced">
                  <label className="form-label-styled">
                    Duration <span className="required-star">*</span>
                  </label>
                  <input 
                    type="text" 
                    className="form-input-styled" 
                    placeholder="e.g. 10 Hours or 4 Weeks"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                  {errors.duration && (
                    <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>{errors.duration}</p>
                  )}
                </div>
              </div>

              <div className="modal-footer-actions">
                <Button variant="outline" type="button" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Create Course
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
