
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Layers } from 'lucide-react';
import { Button } from '../../components/Button/Button';
import { apiCall } from '../../services/api';
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



export const CourseSyllabus: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<CourseData | null>(null);
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [newModuleTitle, setNewModuleTitle] = useState('');

  const fetchSyllabus = async () => {
    if (!courseId) return;
    try {
      // 1. Fetch course details
      const courseRes = await apiCall(`/api/courses/${courseId}`);
      if (courseRes.ok) {
        const courseData = await courseRes.json();
        setCourse({
          id: courseData.id,
          course_code: courseData.course_code,
          title: courseData.title,
          description: courseData.description || '',
          priority: courseData.priority || 'Medium',
          duration: courseData.duration || '10 hours',
          is_published: courseData.is_published
        });
      }
      
      // 2. Fetch course modules
      const modulesRes = await apiCall(`/api/courses/${courseId}/modules`);
      if (modulesRes.ok) {
        const data = await modulesRes.json();
        const mappedModules = data.map((m: any) => ({
          id: m.id,
          title: m.title,
          order: m.sequence_no
        }));
        setModules(mappedModules);
      }
    } catch (err) {
      console.error("Failed to fetch course syllabus details", err);
    }
  };

  useEffect(() => {
    const rawRolesStr = localStorage.getItem('rawRoles');
    const rawRoles = rawRolesStr ? JSON.parse(rawRolesStr) : [];
    const hasAccess = rawRoles.includes('SYSTEM_ADMIN') || rawRoles.includes('COURSE_MANAGER');
    if (!hasAccess) {
      navigate('/dashboard');
      return;
    }

    fetchSyllabus();
  }, [courseId]);

  const handleAddModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleTitle.trim() || !courseId) return;

    try {
      const res = await apiCall('/api/modules', {
        method: 'POST',
        body: JSON.stringify({
          course_id: courseId,
          title: newModuleTitle.trim(),
          sequence_no: modules.length + 1,
          description: ''
        })
      });
      if (res.ok) {
        const newMod = await res.json();
        setModules([...modules, {
          id: newMod.id,
          title: newMod.title,
          order: newMod.sequence_no
        }]);
        setNewModuleTitle('');
      } else {
        alert('Failed to create module on the server.');
      }
    } catch (err) {
      console.error(err);
      alert('Connection error. Failed to add module.');
    }
  };

  const handleTogglePublish = async () => {
    if (!course || !courseId) return;
    
    try {
      const res = await apiCall(`/api/courses/${courseId}`, {
        method: 'PUT',
        body: JSON.stringify({
          is_published: !course.is_published,
          status: 'approved'
        })
      });
      if (res.ok) {
        setCourse({ ...course, is_published: !course.is_published });
      } else {
        alert('Failed to update publication status.');
      }
    } catch (err) {
      console.error(err);
      alert('Connection error. Failed to publish course.');
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
