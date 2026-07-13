import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { Button } from '../../components/Button/Button';
import { apiCall } from '../../services/api';
import './ViewCourses.css';
import '../Dashboard/Dashboard.css';

interface CourseData {
  id: string;
  course_code: string;
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  duration: string;
  is_published: boolean;
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected';
  creatorName: string;
  creatorRole: string;
  departmentName: string;
  department_id?: string;
  createdDate: string;
}

export const ViewCourses: React.FC = () => {
  const navigate = useNavigate();

  // Lists
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [myProgress, setMyProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'in_progress' | 'completed' | 'available'>('in_progress');

  const fetchDBCourses = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/api/courses');
      if (response.ok) {
        const data = await response.json();
        const dbCourses = data.courses || [];
        const mapped = dbCourses.map((c: any) => {
          let frontendStatus: 'Draft' | 'Pending' | 'Approved' | 'Rejected' = 'Draft';
          const backendStatus = c.status?.toLowerCase();
          if (backendStatus === 'pending') frontendStatus = 'Pending';
          else if (backendStatus === 'approved') frontendStatus = 'Approved';
          else if (backendStatus === 'rejected') frontendStatus = 'Rejected';
          
          return {
            id: c.id,
            course_code: c.course_code,
            title: c.title,
            description: c.description || '',
            priority: c.priority || 'Medium',
            duration: c.duration || '10 hours',
            is_published: c.is_published,
            status: frontendStatus,
            creatorName: c.creator_name || 'John Doe',
            creatorRole: c.creator_role || 'Employee',
            departmentName: c.department_name || 'AI',
            department_id: c.department_id,
            createdDate: c.created_at ? c.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
          };
        });
        setCourses(mapped);
      }

      // Fetch enrollments
      const enrollRes = await apiCall('/api/enrollments/my-courses');
      if (enrollRes.ok) {
        const enrollData = await enrollRes.json();
        const mappedProgress = enrollData.map((e: any) => {
          let progress = e.progress_percent || 0;
          if (e.status === 'completed') progress = 100;

          return {
            id: e.id,
            courseId: e.course_id,
            courseCode: e.course_code || 'AI-101',
            title: e.course_title || 'Enrolled Course',
            progressPercent: progress,
            difficulty: 'Beginner' as const
          };
        });
        setMyProgress(mappedProgress);
      }
    } catch (err) {
      console.error('Failed to load courses from DB:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDBCourses();
  }, []);

  const handleEnrollCourse = async (courseId: string) => {
    try {
      const response = await apiCall('/api/enrollments', {
        method: 'POST',
        body: JSON.stringify({
          course_id: courseId
        })
      });

      if (response.ok) {
        await fetchDBCourses();
        alert('Enrolled successfully! Course is now added to your learning curriculum.');
      } else {
        const err = await response.json();
        alert(err.detail || 'Enrollment failed.');
      }
    } catch (err) {
      console.error('Failed to enroll in course:', err);
    }
  };

  const handleLaunchPlayer = (enrollmentId: string) => {
    navigate(`/course-player/${enrollmentId}`);
  };

  if (loading) {
    return (
      <div className="view-courses-canvas container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading learning pathways...</p>
      </div>
    );
  }

  // Enrolled list
  const activeEnrollments = myProgress.filter(p => p.progressPercent < 100);
  const completedEnrollments = myProgress.filter(p => p.progressPercent === 100);

  // Available list
  const availableCourses = courses.filter(c => {
    const isApproved = c.status === 'Approved' || c.is_published;
    if (!isApproved) return false;
    const isAlreadyEnrolled = myProgress.some(p => p.courseId === c.id);
    if (isAlreadyEnrolled) return false;
    return true;
  });

  return (
    <div className="view-courses-canvas container animate-fade-in" style={{ paddingBottom: '60px' }}>
      <div className="pane-header" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>🎓 Curriculum Preview & Workspace</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Inspect, enroll, and study the interactive course curriculum from a learner perspective.</p>
      </div>

      <div className="catalog-tabs-container" style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('in_progress')}
          style={{
            border: 'none',
            background: 'none',
            fontSize: '1.05rem',
            fontWeight: 700,
            color: activeTab === 'in_progress' ? 'var(--accent-color)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'in_progress' ? '2px solid var(--accent-color)' : 'none',
            paddingBottom: '8px',
            cursor: 'pointer'
          }}
        >
          In Progress ({activeEnrollments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          style={{
            border: 'none',
            background: 'none',
            fontSize: '1.05rem',
            fontWeight: 700,
            color: activeTab === 'completed' ? 'var(--accent-color)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'completed' ? '2px solid var(--accent-color)' : 'none',
            paddingBottom: '8px',
            cursor: 'pointer'
          }}
        >
          Completed ({completedEnrollments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('available')}
          style={{
            border: 'none',
            background: 'none',
            fontSize: '1.05rem',
            fontWeight: 700,
            color: activeTab === 'available' ? 'var(--accent-color)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'available' ? '2px solid var(--accent-color)' : 'none',
            paddingBottom: '8px',
            cursor: 'pointer'
          }}
        >
          Available ({availableCourses.length})
        </button>
      </div>

      <div style={{ width: '100%' }}>
        {activeTab === 'in_progress' && (
          <>
            {activeEnrollments.length === 0 ? (
              <div className="empty-state-container glass-panel" style={{ padding: '48px', textAlign: 'center', borderRadius: 'var(--border-radius-md)' }}>
                <Bookmark size={48} style={{ opacity: 0.2, marginBottom: '12px', color: 'var(--accent-color)', margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No active course enrollments. Select an available course to begin!</p>
              </div>
            ) : (
              <div className="employee-courses-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', width: '100%' }}>
                {activeEnrollments.map((item) => (
                  <div 
                    key={item.id} 
                    className="course-lobby-card glass-panel glow-hover" 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      borderRadius: 'var(--border-radius-lg)', 
                      overflow: 'hidden', 
                      background: 'var(--bg-card)', 
                      border: '1px solid var(--border-color)',
                      transition: 'all 0.3s ease',
                      padding: '20px',
                      justifyContent: 'space-between',
                      minHeight: '180px'
                    }}
                  >
                    <div>
                      <span 
                        className="course-code-tag" 
                        style={{ 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          background: 'var(--accent-glow)', 
                          color: 'var(--accent-color)', 
                          fontSize: '0.7rem', 
                          fontWeight: '800',
                          textTransform: 'uppercase'
                        }}
                      >
                        {item.courseCode}
                      </span>
                      <h4 style={{ marginTop: '8px', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: '1.3' }}>
                        {item.title}
                      </h4>
                    </div>
                    <div style={{ marginTop: '16px' }}>
                      <div className="progress-bar-group" style={{ marginBottom: '12px' }}>
                        <div className="progress-bar-container" style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div className="progress-bar-fill" style={{ width: `${item.progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-color), var(--accent-color))' }}></div>
                        </div>
                        <div className="progress-label-row" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          <span>{item.progressPercent}% Completed</span>
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        onClick={() => handleLaunchPlayer(item.id)}
                        style={{ width: '100%', height: '40px', fontWeight: '700' }}
                      >
                        {item.progressPercent > 0 ? 'Resume Course' : 'Start Course'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'completed' && (
          <>
            {completedEnrollments.length === 0 ? (
              <div className="empty-state-container glass-panel" style={{ padding: '48px', textAlign: 'center', borderRadius: 'var(--border-radius-md)' }}>
                <Bookmark size={48} style={{ opacity: 0.2, marginBottom: '12px', color: 'var(--accent-color)', margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No completed courses yet. Complete course modules to see them here.</p>
              </div>
            ) : (
              <div className="employee-courses-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', width: '100%' }}>
                {completedEnrollments.map((item) => (
                  <div 
                    key={item.id} 
                    className="course-lobby-card glass-panel glow-hover" 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      borderRadius: 'var(--border-radius-lg)', 
                      overflow: 'hidden', 
                      background: 'var(--bg-card)', 
                      border: '1px solid var(--border-color)',
                      transition: 'all 0.3s ease',
                      padding: '20px',
                      justifyContent: 'space-between',
                      minHeight: '180px'
                    }}
                  >
                    <div>
                      <span 
                        className="course-code-tag" 
                        style={{ 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          background: 'var(--accent-glow)', 
                          color: 'var(--accent-color)', 
                          fontSize: '0.7rem', 
                          fontWeight: '800',
                          textTransform: 'uppercase'
                        }}
                      >
                        {item.courseCode}
                      </span>
                      <h4 style={{ marginTop: '8px', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: '1.3' }}>
                        {item.title}
                      </h4>
                    </div>
                    <div style={{ marginTop: '16px' }}>
                      <div className="progress-bar-group" style={{ marginBottom: '12px' }}>
                        <div className="progress-bar-container" style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div className="progress-bar-fill" style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, var(--accent-color), var(--accent-color))' }}></div>
                        </div>
                        <div className="progress-label-row" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          <span>100% Completed</span>
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        onClick={() => handleLaunchPlayer(item.id)}
                        style={{ width: '100%', height: '40px', fontWeight: '700' }}
                      >
                        Review Course
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'available' && (
          <>
            {availableCourses.length === 0 ? (
              <div className="empty-state-container glass-panel" style={{ padding: '48px', textAlign: 'center', borderRadius: 'var(--border-radius-md)' }}>
                <Bookmark size={48} style={{ opacity: 0.2, marginBottom: '12px', color: 'var(--accent-color)', margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>All catalog courses have been enrolled. Check your in-progress tab.</p>
              </div>
            ) : (
              <div className="employee-courses-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', width: '100%' }}>
                {availableCourses.map((course) => (
                  <div 
                    key={course.id} 
                    className="course-lobby-card glass-panel glow-hover" 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      borderRadius: 'var(--border-radius-lg)', 
                      overflow: 'hidden', 
                      background: 'var(--bg-card)', 
                      border: '1px solid var(--border-color)',
                      transition: 'all 0.3s ease',
                      padding: '20px',
                      justifyContent: 'space-between',
                      minHeight: '180px'
                    }}
                  >
                    <div>
                      <span 
                        className="course-code-tag" 
                        style={{ 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          background: 'var(--accent-glow)', 
                          color: 'var(--accent-color)', 
                          fontSize: '0.7rem', 
                          fontWeight: '800',
                          textTransform: 'uppercase'
                        }}
                      >
                        {course.course_code}
                      </span>
                      <h4 style={{ marginTop: '8px', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: '1.3' }}>
                        {course.title}
                      </h4>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '8px', display: 'block' }}>
                        Duration: {course.duration}
                      </span>
                    </div>
                    <div style={{ marginTop: '20px' }}>
                      <Button
                        variant="primary"
                        onClick={() => handleEnrollCourse(course.id)}
                        style={{ width: '100%', height: '40px', fontWeight: '700' }}
                      >
                        Quick Enroll
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
