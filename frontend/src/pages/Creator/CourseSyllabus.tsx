
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Layers } from 'lucide-react';
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

interface ModuleData {
  id: string;
  title: string;
  order: number;
}

const DEFAULT_MODULES: { [courseId: string]: ModuleData[] } = {
  'c1': [
    { id: 'm1', title: 'Neural Networks & Perceptrons', order: 1 },
    { id: 'm2', title: 'Gradient Descent & Cost Functions', order: 2 },
    { id: 'm3', title: 'Backpropagation Algorithm', order: 3 },
    { id: 'm4', title: 'Ethical Implications in ML Models', order: 4 }
  ],
  'c2': [
    { id: 'm5', title: 'General Ledger Configuration', order: 1 },
    { id: 'm6', title: 'Asset Master Records & Depreciation', order: 2 }
  ],
  'c3': [
    { id: 'm7', title: 'ABAP Syntax & Object Dictionary', order: 1 }
  ],
  'c4': [
    { id: 'm8', title: 'Sales Order Processing Framework', order: 1 }
  ]
};

export const CourseSyllabus: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<CourseData | null>(null);
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [newModuleTitle, setNewModuleTitle] = useState('');

  useEffect(() => {
    // 1. Get Course details
    const localCourses = localStorage.getItem('creator_courses');
    if (localCourses) {
      const coursesList: CourseData[] = JSON.parse(localCourses);
      const foundCourse = coursesList.find(c => c.id === courseId);
      if (foundCourse) {
        setCourse(foundCourse);
      }
    }

    // 2. Get Course Modules
    const localModulesMap = localStorage.getItem('creator_modules');
    let modulesMap: { [courseId: string]: ModuleData[] } = {};
    
    if (localModulesMap) {
      modulesMap = JSON.parse(localModulesMap);
    } else {
      modulesMap = DEFAULT_MODULES;
      localStorage.setItem('creator_modules', JSON.stringify(DEFAULT_MODULES));
    }

    if (courseId) {
      setModules(modulesMap[courseId] || []);
    }
  }, [courseId]);

  const handleAddModuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleTitle.trim() || !courseId) return;

    const newModule: ModuleData = {
      id: `m_${Date.now()}`,
      title: newModuleTitle.trim(),
      order: modules.length + 1
    };

    const updatedModules = [...modules, newModule];
    setModules(updatedModules);

    // Save to localStorage map
    const localModulesMap = localStorage.getItem('creator_modules');
    const modulesMap = localModulesMap ? JSON.parse(localModulesMap) : {};
    modulesMap[courseId] = updatedModules;
    localStorage.setItem('creator_modules', JSON.stringify(modulesMap));

    setNewModuleTitle('');
  };

  const handleTogglePublish = () => {
    if (!course || !courseId) return;
    
    const localCourses = localStorage.getItem('creator_courses');
    if (localCourses) {
      const coursesList: CourseData[] = JSON.parse(localCourses);
      const updatedList = coursesList.map(c => 
        c.id === courseId ? { ...c, is_published: !c.is_published } : c
      );
      localStorage.setItem('creator_courses', JSON.stringify(updatedList));
      setCourse({ ...course, is_published: !course.is_published });
    }
  };

  if (!course) {
    return (
      <div className="creator-workspace container" style={{ textAlign: 'center', padding: '60px 0' }}>
        <h2>Course Node Not Found</h2>
        <Button variant="outline" onClick={() => navigate('/creator/dashboard')} style={{ marginTop: '20px' }}>
          Back to Creator Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="creator-workspace container">
      {/* Back link */}
      <div className="back-navigation-row">
        <Button 
          variant="outline" 
          onClick={() => navigate('/creator/dashboard')}
          leftIcon={<ArrowLeft size={16} />}
        >
          Back to Dashboard
        </Button>
      </div>

      <div className="syllabus-container">
        {/* Left column - Course Meta Details Card */}
        <div className="syllabus-sidebar-card glass-panel">
          <span className="course-badge-code" style={{ display: 'inline-block', marginBottom: '12px' }}>
            {course.course_code}
          </span>
          <h3>{course.title}</h3>
          <p>{course.description}</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
            <div>
              <strong>Priority:</strong> {course.priority}
            </div>
            <div>
              <strong>Expected Duration:</strong> {course.duration}
            </div>
            <div>
              <strong>Status:</strong> {course.is_published ? 'Published' : 'Draft Mode'}
            </div>
          </div>

          <Button 
            variant={course.is_published ? 'outline' : 'primary'} 
            onClick={handleTogglePublish}
            style={{ width: '100%', marginTop: '20px' }}
          >
            {course.is_published ? 'Revert to Draft' : 'Publish Course'}
          </Button>
        </div>

        {/* Right Canvas - Course Syllabus / Modules management */}
        <div className="syllabus-main-canvas glass-panel">
          <div className="canvas-header">
            <h2>Course Modules / Syllabus</h2>
            <span className="badge success">{modules.length} {modules.length === 1 ? 'Module' : 'Modules'}</span>
          </div>

          {/* Quick Add Module Bar */}
          <form onSubmit={handleAddModuleSubmit} className="quick-add-module-form" style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
            <input 
              type="text" 
              className="form-input-styled" 
              placeholder="Create a new module (e.g. Module 1: Introduction)..." 
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              required
              style={{ flex: 1 }}
            />
            <Button 
              variant="primary" 
              type="submit"
              leftIcon={<Plus size={18} />}
            >
              Add Module
            </Button>
          </form>

          {/* Module Syllabus List */}
          {modules.length === 0 ? (
            <div className="empty-state-banner">
              <Layers size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <h4>No Modules Created</h4>
              <p>Type a module title above and press "Add Module" (or hit Enter) to build your syllabus structure.</p>
            </div>
          ) : (
            <div className="module-syllabus-list">
              {modules.map((mod, index) => (
                <div 
                  key={mod.id} 
                  className="module-syllabus-item"
                  onClick={() => navigate(`/creator/course/${course.id}/module/${mod.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="module-item-title-col">
                    <h4>Module {index + 1}: {mod.title}</h4>
                    <p>Click to open workspace (add text contents, links, media, tests and notes)</p>
                  </div>
                  <Button variant="outline" size="sm" leftIcon={<Plus size={14} />}>
                    Explore Content
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
