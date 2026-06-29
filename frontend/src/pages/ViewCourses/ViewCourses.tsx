import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, ChevronRight, Award, Layers
} from 'lucide-react';
import { Button } from '../../components/Button/Button';
import { apiCall } from '../../services/api';
import './ViewCourses.css';

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

  // User details
  const [role, setRole] = useState('Employee');
  const [dept, setDept] = useState('AI');
  const [profileName, setProfileName] = useState('John Doe');

  // Lists
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [myProgress, setMyProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    const savedRole = localStorage.getItem('isLoggedInRole') || 'Employee';
    const savedDept = localStorage.getItem('isLoggedInDept') || 'AI';
    const savedName = localStorage.getItem('profileName') || 'John Doe';
    
    setRole(savedRole);
    setDept(savedDept);
    setProfileName(savedName);

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
      <div className="pane-header" style={{ marginBottom: '32px' }}>
        <h2>🎓 Curriculum Preview & Workspace</h2>
        <p>Inspect, enroll, and study the interactive course curriculum from a learner perspective.</p>
      </div>

      <div className="view-courses-layout-grid">
        <div className="view-courses-left-column">
          
          {/* Active Enrolled Courses */}
          <div className="view-courses-section-pane glass-panel">
            <div className="section-pane-title">
              <BookOpen size={20} className="icon-blue" />
              <h3>Active Enrolled Courses ({activeEnrollments.length})</h3>
            </div>
            
            {activeEnrollments.length === 0 ? (
              <p className="no-data-notice">No active course enrollments. Select a course below to begin learning!</p>
            ) : (
              <div className="courses-list-group">
                {activeEnrollments.map((item) => (
                  <div key={item.id} className="player-launch-row glow-hover">
                    <div className="launch-row-header">
                      <span className="launch-row-code">{item.courseCode}</span>
                      <h4>{item.title}</h4>
                    </div>

                    <div className="launch-row-body">
                      <div className="launch-progress-bar-group">
                        <div className="launch-progress-bar-container">
                          <div className="launch-progress-bar-fill" style={{ width: `${item.progressPercent}%` }}></div>
                        </div>
                        <span className="launch-progress-label">{item.progressPercent}% Complete</span>
                      </div>
                      
                      <Button
                        variant="primary"
                        onClick={() => handleLaunchPlayer(item.id)}
                        rightIcon={<ChevronRight size={14} />}
                      >
                        {item.progressPercent > 0 ? 'Resume Lecture' : 'Start Course'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Catalog Courses */}
          <div className="view-courses-section-pane glass-panel" style={{ marginTop: '24px' }}>
            <div className="section-pane-title">
              <Layers size={20} className="icon-teal" />
              <h3>Available Catalog Courses ({availableCourses.length})</h3>
            </div>

            {availableCourses.length === 0 ? (
              <p className="no-data-notice">All catalog courses have been enrolled. Check your curriculum above.</p>
            ) : (
              <div className="courses-list-group">
                {availableCourses.map((course) => (
                  <div key={course.id} className="catalog-course-row glow-hover">
                    <div className="catalog-row-details">
                      <span className="launch-row-code">{course.course_code}</span>
                      <h4>{course.title}</h4>
                      <p>{course.description}</p>
                      <div className="catalog-row-meta">
                        <span>Duration: {course.duration}</span>
                        <span>Priority: {course.priority}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handleEnrollCourse(course.id)}
                    >
                      Quick Enroll
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed Courses Section */}
          <div className="view-courses-section-pane glass-panel" style={{ marginTop: '24px' }}>
            <div className="section-pane-title">
              <Award size={20} className="icon-yellow" />
              <h3>Completed Courses ({completedEnrollments.length})</h3>
            </div>
            
            {completedEnrollments.length === 0 ? (
              <p className="no-data-notice">No completed courses yet. Work through the modules in active courses to earn certifications!</p>
            ) : (
              <div className="courses-list-group">
                {completedEnrollments.map((item) => (
                  <div key={item.id} className="completed-course-row glow-hover">
                    <div className="completed-row-details">
                      <span className="completed-badge">✓ Certified</span>
                      <h4>{item.title}</h4>
                      <span className="completed-code">{item.courseCode}</span>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => alert(`Showing digital certificate for ${item.title}`)}
                      leftIcon={<Award size={14} />}
                    >
                      View Certificate
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Sidebar */}
        <div className="view-courses-sidebar">
          <div className="sidebar-stats-card glass-panel">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: '700' }}>Active Workspace</h3>
            <div className="sidebar-stat-field">
              <span className="stat-label">User Profile</span>
              <span className="stat-value">{profileName}</span>
            </div>
            <div className="sidebar-stat-field">
              <span className="stat-label">Assigned Role</span>
              <span className="stat-value">{role}</span>
            </div>
            <div className="sidebar-stat-field" style={{ border: 'none', padding: 0 }}>
              <span className="stat-label">Department</span>
              <span className="stat-value">{dept}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
