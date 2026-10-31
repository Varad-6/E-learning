import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Layers, Edit3, Trash2, Search,
  AlertTriangle, CheckCircle2, Clock, BookOpen, Check,
  ChevronUp, ChevronDown, Video, Users
} from 'lucide-react';
import { YouTubePlayer } from '../../components/YouTubePlayer/YouTubePlayer';
import { YouTubeEmbed } from '../../components/YouTubeEmbed/YouTubeEmbed';
import { DurationInput } from '../../components/DurationInput/DurationInput';
import { isValidYouTubeUrl } from '../../utils/youtube';
import { Button } from '../../components/Button/Button';
import { Modal } from '../../components/Modal/Modal';
import { LearnersModal } from '../../components/LearnersModal/LearnersModal';
import { CourseraRichText } from '../../components/CourseraRichText/CourseraRichText';
import { formatDuration, parseDuration, buildDurationString } from '../../utils/duration';
import { canDeleteCourse } from '../../utils/coursePermissions';
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
  created_by?: string | null;
  video_url?: string | null;
}

interface ModuleData {
  id: string;
  title: string;
  description?: string;
  order: number;
  tier: 'beginner' | 'intermediate' | 'advanced';
}

export const CourseSyllabus: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<CourseData | null>(null);
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [activeTier, setActiveTier] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');

  // Assign Existing Modules Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [allAvailableModules, setAllAvailableModules] = useState<any[]>([]);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [assignSearch, setAssignSearch] = useState('');
  const [isSavingAssignments, setIsSavingAssignments] = useState(false);

  // Create Module Modal State
  const [isCreateModuleModalOpen, setIsCreateModuleModalOpen] = useState(false);
  const [newModTitle, setNewModTitle] = useState('');
  const [newModDesc, setNewModDesc] = useState('');
  const [newModYouTubeUrl, setNewModYouTubeUrl] = useState('');
  const [newModHours, setNewModHours] = useState<number>(0);
  const [newModMinutes, setNewModMinutes] = useState<number>(15);
  const [newModOrder, setNewModOrder] = useState<number>(1);
  const [newModTier, setNewModTier] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [isCreatingModule, setIsCreatingModule] = useState(false);

  // Edit Module Modal State
  const [editingModule, setEditingModule] = useState<ModuleData | null>(null);
  const [editModTitle, setEditModTitle] = useState('');
  const [editModDesc, setEditModDesc] = useState('');
  const [editModYouTubeUrl, setEditModYouTubeUrl] = useState('');
  const [editModHours, setEditModHours] = useState<number>(0);
  const [editModMinutes, setEditModMinutes] = useState<number>(15);
  const [editModOrder, setEditModOrder] = useState<number>(1);
  const [editModTier, setEditModTier] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [isSavingModule, setIsSavingModule] = useState(false);

  // Delete Module Modal State
  const [moduleToDelete, setModuleToDelete] = useState<ModuleData | null>(null);
  const [deleteModuleMode, setDeleteModuleMode] = useState<'unassign' | 'permanent'>('unassign');
  const [isDeletingModule, setIsDeletingModule] = useState(false);

  // Edit Course Meta State
  const [isEditCourseModalOpen, setIsEditCourseModalOpen] = useState(false);
  const [editCourseTitle, setEditCourseTitle] = useState('');
  const [editCourseDesc, setEditCourseDesc] = useState('');
  const [editCoursePriority, setEditCoursePriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [editCourseDays, setEditCourseDays] = useState(0);
  const [editCourseHours, setEditCourseHours] = useState(0);
  const [editCourseMinutes, setEditCourseMinutes] = useState(0);
  const [editCourseVideoUrl, setEditCourseVideoUrl] = useState('');
  const [isSavingCourseMeta, setIsSavingCourseMeta] = useState(false);

  const handleOpenEditCourseModal = () => {
    if (!course) return;
    setEditCourseTitle(course.title);
    setEditCourseDesc(course.description);
    setEditCoursePriority(course.priority);
    const parsed = parseDuration(course.duration);
    setEditCourseDays(parsed.days || 0);
    setEditCourseHours(parsed.hours || 0);
    setEditCourseMinutes(parsed.minutes || 0);
    setEditCourseVideoUrl(course.video_url || '');
    setIsEditCourseModalOpen(true);
  };

  const handleSaveCourseMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !editCourseTitle.trim()) {
      alert('Course Title is required.');
      return;
    }
    const durationStr = buildDurationString(editCourseDays, editCourseHours, editCourseMinutes);
    setIsSavingCourseMeta(true);
    try {
      const res = await apiCall(`/api/courses/${courseId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editCourseTitle.trim(),
          description: editCourseDesc.trim(),
          priority: editCoursePriority,
          duration: durationStr,
          video_url: editCourseVideoUrl.trim() || null
        })
      });
      if (res.ok) {
        setIsEditCourseModalOpen(false);
        fetchSyllabus();
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to update course details.');
      }
    } catch (err) {
      console.error(err);
      alert('Connection error. Failed to update course details.');
    } finally {
      setIsSavingCourseMeta(false);
    }
  };

  // Delete Course Modal State
  const [isDeleteCourseModalOpen, setIsDeleteCourseModalOpen] = useState(false);
  const [isLearnersModalOpen, setIsLearnersModalOpen] = useState(false);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);

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
          duration: courseData.duration || '7d 0h 0m',
          is_published: courseData.is_published,
          created_by: courseData.created_by,
          video_url: courseData.video_url || null
        });
      }
      
      // 2. Fetch course modules
      const modulesRes = await apiCall(`/api/courses/${courseId}/modules`);
      if (modulesRes.ok) {
        const data = await modulesRes.json();
        const mappedModules = data.map((m: any) => ({
          id: m.id,
          title: m.title,
          description: m.description || '',
          order: m.sequence_no,
          tier: m.tier || 'beginner'
        }));
        setModules(mappedModules);
      }
    } catch (err) {
      console.error("Failed to fetch course syllabus details", err);
    }
  };

  useEffect(() => {
    const savedRole = localStorage.getItem('isLoggedInRole') || 'Employee';
    const rawRolesStr = localStorage.getItem('rawRoles');
    let rawRoles: string[] = [];
    try { rawRoles = rawRolesStr ? JSON.parse(rawRolesStr) : []; } catch {}

    const hasAccess = 
      ['Admin', 'HR Admin', 'HR Manager', 'Manager'].includes(savedRole) ||
      rawRoles.includes('SYSTEM_ADMIN') || 
      rawRoles.includes('COURSE_MANAGER') || 
      rawRoles.includes('HR_ADMIN') || 
      rawRoles.includes('MANAGER');

    if (!hasAccess) {
      navigate('/dashboard');
      return;
    }

    fetchSyllabus();
  }, [courseId]);

  const handleAddModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleTitle.trim() || !courseId) return;

    const modulesInTier = modules.filter(m => m.tier === activeTier);
    try {
      const res = await apiCall('/api/modules', {
        method: 'POST',
        body: JSON.stringify({
          course_id: courseId,
          title: newModuleTitle.trim(),
          sequence_no: modulesInTier.length + 1,
          description: '',
          tier: activeTier
        })
      });
      if (res.ok) {
        const newMod = await res.json();
        setModules([...modules, {
          id: newMod.id,
          title: newMod.title,
          description: newMod.description || '',
          order: newMod.sequence_no,
          tier: newMod.tier
        }]);
        setNewModuleTitle('');
      } else {
        alert('Could not create the module. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Could not add the module. Please check your internet connection and try again.');
    }
  };

  const handleTogglePublish = async () => {
    if (!course || !courseId) return;
    
    // Check if we are trying to publish: require at least one module in the course
    if (!course.is_published && modules.length === 0) {
      alert('Cannot publish course: Please create at least one syllabus module before publishing.');
      return;
    }

    try {
      const res = await apiCall(`/api/courses/${courseId}`, {
        method: 'PUT',
        body: JSON.stringify({
          is_published: !course.is_published,
          status: !course.is_published ? 'published' : 'draft'
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

  // Open Assign Existing Modules Modal
  const handleOpenAssignModal = async () => {
    setAssignSearch('');
    setSelectedModuleIds(modules.map(m => m.id));
    setIsAssignModalOpen(true);
    try {
      const res = await apiCall('/api/modules?limit=200');
      if (res.ok) {
        const data = await res.json();
        setAllAvailableModules(data.modules || []);
      }
    } catch (err) {
      console.error('Failed to load available modules', err);
    }
  };

  const handleSaveAssignments = async () => {
    if (!courseId) return;
    setIsSavingAssignments(true);
    try {
      const res = await apiCall(`/api/courses/${courseId}/modules`, {
        method: 'PUT',
        body: JSON.stringify({
          module_ids: selectedModuleIds
        })
      });
      if (res.ok) {
        setIsAssignModalOpen(false);
        fetchSyllabus();
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to update module assignments.');
      }
    } catch (err) {
      console.error(err);
      alert('Connection error. Failed to assign modules.');
    } finally {
      setIsSavingAssignments(false);
    }
  };

  // Reorder Modules Up / Down
  const handleMoveModule = async (modId: string, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    const currentTierModules = modules
      .filter(m => m.tier === activeTier)
      .sort((a, b) => a.order - b.order);
    
    const idx = currentTierModules.findIndex(m => m.id === modId);
    if (idx < 0) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= currentTierModules.length) return;

    const currentMod = currentTierModules[idx];
    const targetMod = currentTierModules[targetIdx];

    const updated = modules.map(m => {
      if (m.id === currentMod.id) return { ...m, order: targetMod.order };
      if (m.id === targetMod.id) return { ...m, order: currentMod.order };
      return m;
    });
    setModules(updated);

    try {
      await apiCall('/api/modules/reorder', {
        method: 'PUT',
        body: JSON.stringify({
          items: [
            { id: currentMod.id, sequence_no: targetMod.order },
            { id: targetMod.id, sequence_no: currentMod.order }
          ]
        })
      });
    } catch (err) {
      console.error('Failed to save module reorder', err);
      fetchSyllabus();
    }
  };

  // Open Create Module Modal
  const handleOpenCreateModal = () => {
    const modulesInTier = modules.filter(m => m.tier === activeTier);
    setNewModTitle('');
    setNewModDesc('');
    setNewModYouTubeUrl('');
    setNewModHours(0);
    setNewModMinutes(15);
    setNewModOrder(modulesInTier.length + 1);
    setNewModTier(activeTier);
    setIsCreateModuleModalOpen(true);
  };

  // Handle Full Create Module Submit
  const handleCreateModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !newModTitle.trim()) {
      alert('Module Title is required.');
      return;
    }
    if (newModYouTubeUrl.trim() && !isValidYouTubeUrl(newModYouTubeUrl.trim())) {
      alert('Please enter a valid YouTube link (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...)');
      return;
    }

    setIsCreatingModule(true);
    try {
      const res = await apiCall('/api/modules', {
        method: 'POST',
        body: JSON.stringify({
          course_id: courseId,
          title: newModTitle.trim(),
          description: newModDesc.trim(),
          sequence_no: Number(newModOrder) || (modules.filter(m => m.tier === newModTier).length + 1),
          tier: newModTier
        })
      });

      if (res.ok) {
        const createdMod = await res.json();
        // If YouTube link provided, create initial video content
        if (newModYouTubeUrl.trim() && isValidYouTubeUrl(newModYouTubeUrl.trim())) {
          const totalSeconds = (Number(newModHours) || 0) * 3600 + (Number(newModMinutes) || 0) * 60;
          try {
            await apiCall(`/api/modules/${createdMod.id}/contents`, {
              method: 'POST',
              body: JSON.stringify({
                title: `${newModTitle.trim()} - Video Lecture`,
                content_type: 'video',
                file_path: newModYouTubeUrl.trim(),
                duration_seconds: totalSeconds > 0 ? totalSeconds : 600,
                sequence_no: 1,
                value: newModDesc.trim()
              })
            });
          } catch (e) {
            console.error('Failed to create module video content', e);
          }
        }

        setIsCreateModuleModalOpen(false);
        fetchSyllabus();
      } else {
        const err = await res.json();
        alert(err.detail || 'Could not create module.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error. Could not create module.');
    } finally {
      setIsCreatingModule(false);
    }
  };

  // Open Edit Module Modal
  const handleOpenEditModule = async (mod: ModuleData, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingModule(mod);
    setEditModTitle(mod.title);
    setEditModDesc(mod.description || '');
    setEditModTier(mod.tier);
    setEditModOrder(mod.order);
    setEditModYouTubeUrl('');
    setEditModHours(0);
    setEditModMinutes(15);

    try {
      const res = await apiCall(`/api/modules/${mod.id}/contents`);
      if (res.ok) {
        const contents = await res.json();
        const videoContent = contents.find((c: any) => c.content_type === 'video' || c.content_type === 'youtube');
        if (videoContent) {
          setEditModYouTubeUrl(videoContent.file_path || videoContent.value || '');
          if (videoContent.duration_seconds) {
            setEditModHours(Math.floor(videoContent.duration_seconds / 3600));
            setEditModMinutes(Math.floor((videoContent.duration_seconds % 3600) / 60));
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch module video details', err);
    }
  };

  const handleSaveModuleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModule || !editModTitle.trim()) {
      alert('Module Title is required.');
      return;
    }
    if (editModYouTubeUrl.trim() && !isValidYouTubeUrl(editModYouTubeUrl.trim())) {
      alert('Please enter a valid YouTube link (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...)');
      return;
    }
    setIsSavingModule(true);
    try {
      const res = await apiCall(`/api/modules/${editingModule.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editModTitle.trim(),
          description: editModDesc.trim(),
          sequence_no: Number(editModOrder) || editingModule.order,
          tier: editModTier
        })
      });
      if (res.ok) {
        // If YouTube link is provided, create or update video content
        if (editModYouTubeUrl.trim() && isValidYouTubeUrl(editModYouTubeUrl.trim())) {
          const totalSeconds = (Number(editModHours) || 0) * 3600 + (Number(editModMinutes) || 0) * 60;
          try {
            const contentsRes = await apiCall(`/api/modules/${editingModule.id}/contents`);
            let existingVideo: any = null;
            if (contentsRes.ok) {
              const contents = await contentsRes.json();
              existingVideo = contents.find((c: any) => c.content_type === 'video' || c.content_type === 'youtube');
            }
            if (existingVideo) {
              await apiCall(`/api/contents/${existingVideo.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                  file_path: editModYouTubeUrl.trim(),
                  duration_seconds: totalSeconds > 0 ? totalSeconds : 600
                })
              });
            } else {
              await apiCall(`/api/modules/${editingModule.id}/contents`, {
                method: 'POST',
                body: JSON.stringify({
                  title: `${editModTitle.trim()} - Video Lecture`,
                  content_type: 'video',
                  file_path: editModYouTubeUrl.trim(),
                  duration_seconds: totalSeconds > 0 ? totalSeconds : 600,
                  sequence_no: 1,
                  value: editModDesc.trim()
                })
              });
            }
          } catch (e) {
            console.error('Failed to sync video content block', e);
          }
        }
        setEditingModule(null);
        fetchSyllabus();
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to update module.');
      }
    } catch (err) {
      console.error(err);
      alert('Connection error. Failed to update module.');
    } finally {
      setIsSavingModule(false);
    }
  };

  // Delete / Unassign Module
  const handleOpenDeleteModule = (mod: ModuleData, e: React.MouseEvent) => {
    e.stopPropagation();
    setModuleToDelete(mod);
    setDeleteModuleMode('unassign');
  };

  const handleConfirmDeleteModule = async () => {
    if (!moduleToDelete || !courseId) return;
    setIsDeletingModule(true);
    try {
      if (deleteModuleMode === 'unassign') {
        const res = await apiCall(`/api/courses/${courseId}/modules/${moduleToDelete.id}`, {
          method: 'DELETE'
        });
        if (res.ok || res.status === 204) {
          setModuleToDelete(null);
          fetchSyllabus();
        } else {
          alert('Failed to remove module from course.');
        }
      } else {
        const res = await apiCall(`/api/modules/${moduleToDelete.id}`, {
          method: 'DELETE'
        });
        if (res.ok || res.status === 204) {
          setModuleToDelete(null);
          fetchSyllabus();
        } else {
          alert('Failed to delete module permanently.');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Connection error. Failed to delete module.');
    } finally {
      setIsDeletingModule(false);
    }
  };

  // Delete Course
  const handleConfirmDeleteCourse = async () => {
    if (!courseId) return;
    setIsDeletingCourse(true);
    try {
      const res = await apiCall(`/api/courses/${courseId}`, {
        method: 'DELETE'
      });
      if (res.ok || res.status === 204) {
        alert('Course deleted successfully.');
        navigate('/creator/dashboard');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Failed to delete course.');
      }
    } catch (err) {
      console.error(err);
      alert('Connection error. Failed to delete course.');
    } finally {
      setIsDeletingCourse(false);
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

  const filteredAssignModules = allAvailableModules.filter(m => {
    if (!assignSearch.trim()) return true;
    const q = assignSearch.toLowerCase();
    return (m.title || '').toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q);
  });

  return (
    <div className="creator-workspace container">
      {/* Back link and top actions */}
      <div className="back-navigation-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Button 
          variant="outline" 
          onClick={() => navigate('/creator/dashboard')}
          leftIcon={<ArrowLeft size={16} />}
        >
          Back to Dashboard
        </Button>
        {canDeleteCourse(course) && (
          <Button
            variant="outline"
            onClick={() => setIsDeleteCourseModalOpen(true)}
            leftIcon={<Trash2 size={16} />}
            style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', fontWeight: 600 }}
          >
            Delete Course
          </Button>
        )}
      </div>

      <div className="syllabus-container">
        {/* Left column - Course Meta Details Card */}
        <div className="syllabus-sidebar-card glass-panel">
          <span className="course-badge-code" style={{ display: 'inline-block', marginBottom: '12px' }}>
            {course.course_code}
          </span>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '10px' }}>{course.title}</h3>
          
          <div style={{ margin: '12px 0 16px', color: 'var(--text-secondary)' }}>
            <CourseraRichText content={course.description} />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
            <div>
              <strong>Priority:</strong> {course.priority}
            </div>
            <div>
              <strong>Course Deadline:</strong> {formatDuration(course.duration)}
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

          <Button 
            variant="outline" 
            onClick={handleOpenEditCourseModal}
            leftIcon={<Edit3 size={15} />}
            style={{ width: '100%', marginTop: '12px' }}
          >
            Edit Course Info & Deadline
          </Button>

          <Button 
            variant="outline" 
            onClick={() => setIsLearnersModalOpen(true)}
            leftIcon={<Users size={15} />}
            style={{ width: '100%', marginTop: '12px' }}
          >
            View Assigned Learners
          </Button>

          {canDeleteCourse(course) && (
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteCourseModalOpen(true)}
              leftIcon={<Trash2 size={15} />}
              style={{ width: '100%', marginTop: '12px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            >
              Delete Course
            </Button>
          )}
        </div>

        {/* Right Canvas - Course Syllabus / Modules management */}
        <div className="syllabus-main-canvas glass-panel">
          {!course.is_published ? (
            <div style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0.04) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: 'var(--border-radius-md)',
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    background: 'var(--accent-color)',
                    color: '#ffffff',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    textTransform: 'uppercase'
                  }}>
                    Step 2: Add Content
                  </span>
                  <strong style={{ fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                    Add Modules, Lessons, Notes & Quiz
                  </strong>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  Create your syllabus modules below and click them to add interactive lectures, notes, and quiz questions. When you're ready, click <strong>"Publish Course"</strong> to make it live for learners.
                </div>
              </div>
              <Button
                variant="primary"
                onClick={handleTogglePublish}
                disabled={modules.length === 0}
                title={modules.length === 0 ? 'Create at least one module before publishing' : 'Publish course now'}
                style={{ whiteSpace: 'nowrap', fontWeight: 700 }}
              >
                🚀 Publish Course
              </Button>
            </div>
          ) : (
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.02) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--border-radius-md)',
              padding: '12px 18px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.2rem' }}>🟢</span>
                <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  <strong>Course is Live & Published:</strong> You can continue to edit modules, notes, and quizzes directly. All changes update live.
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTogglePublish}
                style={{ fontSize: '0.78rem' }}
              >
                Revert to Draft
              </Button>
            </div>
          )}

          <div className="canvas-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2>Course Modules / Syllabus</h2>
              <span className="badge success" style={{ marginTop: '4px', display: 'inline-block' }}>
                {modules.length} {modules.length === 1 ? 'Module' : 'Modules'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus size={16} />}
                onClick={handleOpenCreateModal}
              >
                Create Module
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Layers size={16} />}
                onClick={handleOpenAssignModal}
              >
                Assign Existing Modules
              </Button>
            </div>
          </div>

          {/* Tier Tabs */}
          <div className="tier-tabs-row" style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            {(['beginner', 'intermediate', 'advanced'] as const).map(tier => {
              const count = modules.filter(m => m.tier === tier).length;
              const isActive = activeTier === tier;
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setActiveTier(tier)}
                  className={`tab-btn-styled ${isActive ? 'active' : ''}`}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--accent-color)' : 'var(--border-color)',
                    background: isActive ? 'var(--accent-color)' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {tier} <span style={{ marginLeft: '4px', opacity: 0.8, fontSize: '0.75rem', padding: '2px 6px', background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--border-color)', borderRadius: '10px' }}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Add Module Bar */}
          <form onSubmit={handleAddModuleSubmit} className="quick-add-module-form" style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
            <input 
              type="text" 
              className="form-input-styled" 
              placeholder={`Create a new ${activeTier} module (e.g. Module 1: Introduction)...`} 
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              required={true}
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
          {modules.filter(m => m.tier === activeTier).length === 0 ? (
            <div className="empty-state-banner">
              <Layers size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <h4 style={{ textTransform: 'capitalize' }}>No {activeTier} Modules Created</h4>
              <p>Type a module title above and press "Add Module", or click "Assign Existing Modules" to add existing curriculum modules.</p>
            </div>
          ) : (
            <div className="module-syllabus-list">
              {modules
                .filter(m => m.tier === activeTier)
                .sort((a, b) => a.order - b.order)
                .map((mod, index) => (
                  <div 
                    key={mod.id} 
                    className="module-syllabus-item"
                    onClick={() => navigate(`/creator/course/${course.id}/module/${mod.id}`)}
                    style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px' }}
                  >
                    <div className="module-item-title-col" style={{ flex: 1, marginRight: '20px' }}>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                        Module {index + 1}: {mod.title.replace(/^module\s*\d+\s*:\s*/i, '')}
                      </h4>
                      {mod.description ? (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5' }}>
                          <CourseraRichText content={mod.description} />
                        </div>
                      ) : (
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          Click to open workspace (add text contents, links, media, tests and notes)
                        </p>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                      {/* Up / Down Reordering Controls */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '4px' }}>
                        <button 
                          type="button"
                          onClick={(e) => handleMoveModule(mod.id, 'up', e)}
                          disabled={index === 0}
                          style={{
                            padding: '3px 6px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-input)',
                            cursor: index === 0 ? 'not-allowed' : 'pointer',
                            opacity: index === 0 ? 0.35 : 1,
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.7rem'
                          }}
                          title="Move module up in sequence"
                        >
                          <ChevronUp size={13} />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => handleMoveModule(mod.id, 'down', e)}
                          disabled={index === modules.filter(m => m.tier === activeTier).length - 1}
                          style={{
                            padding: '3px 6px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-input)',
                            cursor: index === modules.filter(m => m.tier === activeTier).length - 1 ? 'not-allowed' : 'pointer',
                            opacity: index === modules.filter(m => m.tier === activeTier).length - 1 ? 0.35 : 1,
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.7rem'
                          }}
                          title="Move module down in sequence"
                        >
                          <ChevronDown size={13} />
                        </button>
                      </div>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        leftIcon={<Plus size={14} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/creator/course/${course.id}/module/${mod.id}`);
                        }}
                      >
                        Content
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Edit3 size={14} />}
                        onClick={(e) => handleOpenEditModule(mod, e)}
                        title="Edit module description and details"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Trash2 size={14} />}
                        onClick={(e) => handleOpenDeleteModule(mod, e)}
                        title="Delete or unassign module"
                        style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Assign Existing Modules Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Modules to Course"
        subtitle={`Select modules to include in "${course.title}"`}
        icon={<Layers size={22} style={{ color: 'var(--accent-color)' }} />}
        maxWidth="580px"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsAssignModalOpen(false)} disabled={isSavingAssignments}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveAssignments} disabled={isSavingAssignments}>
              {isSavingAssignments ? 'Saving Assignments...' : `Save Assignments (${selectedModuleIds.length})`}
            </Button>
          </>
        }
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {selectedModuleIds.length} of {allAvailableModules.length} Modules Selected
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedModuleIds.length === filteredAssignModules.length && filteredAssignModules.length > 0) {
                  setSelectedModuleIds([]);
                } else {
                  setSelectedModuleIds(filteredAssignModules.map(m => m.id));
                }
              }}
              style={{ fontSize: '0.78rem', padding: '4px 10px' }}
            >
              {selectedModuleIds.length === filteredAssignModules.length && filteredAssignModules.length > 0 ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              className="form-input-styled"
              placeholder="Search available modules by title or description..."
              value={assignSearch}
              onChange={(e) => setAssignSearch(e.target.value)}
              style={{ paddingLeft: '36px', height: '40px', fontSize: '0.88rem' }}
            />
          </div>

          <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '8px', background: 'var(--bg-main)' }}>
            {filteredAssignModules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                No modules match your search.
              </div>
            ) : (
              filteredAssignModules.map(m => {
                const isSelected = selectedModuleIds.includes(m.id);
                return (
                  <label
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      marginBottom: '4px',
                      background: isSelected ? 'var(--accent-glow)' : 'transparent',
                      border: isSelected ? '1px solid var(--accent-color)' : '1px solid transparent',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        if (isSelected) {
                          setSelectedModuleIds(selectedModuleIds.filter(id => id !== m.id));
                        } else {
                          setSelectedModuleIds([...selectedModuleIds, m.id]);
                        }
                      }}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {m.title}
                      </div>
                      {m.description && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.description}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-card)', color: 'var(--text-secondary)', textTransform: 'capitalize', fontWeight: 600 }}>
                      {m.tier || 'all_levels'}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* Create Module Full Modal */}
      <Modal
        isOpen={isCreateModuleModalOpen}
        onClose={() => setIsCreateModuleModalOpen(false)}
        title="Create New Module"
        subtitle={`Add a new module to "${course.title}"`}
        icon={<Plus size={20} style={{ color: 'var(--accent-color)' }} />}
        maxWidth="580px"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsCreateModuleModalOpen(false)} disabled={isCreatingModule}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateModuleSubmit} disabled={isCreatingModule}>
              {isCreatingModule ? 'Creating Module...' : 'Create Module'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateModuleSubmit}>
          <div className="form-group-spaced">
            <label className="form-label-styled">Module Title <span className="required-star">*</span></label>
            <input
              type="text"
              className="form-input-styled"
              placeholder="e.g. Module 1: System Architecture & Workflow"
              value={newModTitle}
              onChange={(e) => setNewModTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group-spaced">
            <label className="form-label-styled">Module Description</label>
            <textarea
              className="form-textarea-styled"
              placeholder="Describe key learning objectives, takeaways, and topics covered..."
              value={newModDesc}
              onChange={(e) => setNewModDesc(e.target.value)}
              style={{ minHeight: '100px' }}
            />
          </div>

          <div className="form-group-spaced">
            <label className="form-label-styled" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Video size={16} style={{ color: 'var(--accent-color)' }} /> YouTube Lecture Video URL
            </label>
            <input
              type="url"
              className="form-input-styled"
              placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ or https://youtu.be/..."
              value={newModYouTubeUrl}
              onChange={(e) => setNewModYouTubeUrl(e.target.value)}
            />
            {newModYouTubeUrl.trim() && !isValidYouTubeUrl(newModYouTubeUrl.trim()) && (
              <span style={{ color: '#ef4444', fontSize: '0.78rem', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                Please enter a valid YouTube URL (youtube.com or youtu.be)
              </span>
            )}
            {isValidYouTubeUrl(newModYouTubeUrl.trim()) && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Live Video Preview:
                </div>
                <YouTubeEmbed videoUrl={newModYouTubeUrl.trim()} title={`${newModTitle || "Module"} - Video Preview`} />
              </div>
            )}
          </div>

          <div className="form-group-spaced">
            <DurationInput
              hours={newModHours}
              minutes={newModMinutes}
              onChange={(h: number, m: number) => {
                setNewModHours(h);
                setNewModMinutes(m);
              }}
              label="Module Duration"
              required={false}
              helperNote="Estimated time for learners to complete video lecture and reading materials."
              idPrefix="new-mod-duration"
            />
          </div>

          <div className="form-group-spaced">
            <label className="form-label-styled">Sequence Order</label>
            <input
              type="number"
              min="1"
              className="form-input-styled"
              value={newModOrder}
              onChange={(e) => setNewModOrder(Number(e.target.value))}
            />
          </div>

          <div className="form-group-spaced">
            <label className="form-label-styled">Difficulty Tier</label>
            <select
              className="form-select-styled"
              value={newModTier}
              onChange={(e) => setNewModTier(e.target.value as any)}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Edit Module Modal */}
      <Modal
        isOpen={!!editingModule}
        onClose={() => setEditingModule(null)}
        title="Edit Module Details"
        subtitle="Update module title, description, video, and sequence order"
        icon={<Edit3 size={20} style={{ color: 'var(--accent-color)' }} />}
        maxWidth="580px"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditingModule(null)} disabled={isSavingModule}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveModuleEdit} disabled={isSavingModule}>
              {isSavingModule ? 'Saving Changes...' : 'Save Changes'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveModuleEdit}>
          <div className="form-group-spaced">
            <label className="form-label-styled">Module Title <span className="required-star">*</span></label>
            <input
              type="text"
              className="form-input-styled"
              placeholder="e.g. Module 1: Foundations & Architecture"
              value={editModTitle}
              onChange={(e) => setEditModTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group-spaced">
            <label className="form-label-styled">Module Description</label>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 6px 0' }}>
              Supports clean markdown formatting (headings, bullets, numbered lists).
            </p>
            <textarea
              className="form-textarea-styled"
              placeholder="Describe learning objectives, key concepts, and takeaways for this module..."
              value={editModDesc}
              onChange={(e) => setEditModDesc(e.target.value)}
              style={{ minHeight: '100px' }}
            />
          </div>

          <div className="form-group-spaced">
            <label className="form-label-styled" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Video size={16} style={{ color: 'var(--accent-color)' }} /> YouTube Lecture Video URL
            </label>
            <input
              type="url"
              className="form-input-styled"
              placeholder="e.g. https://www.youtube.com/watch?v=... or https://youtu.be/..."
              value={editModYouTubeUrl}
              onChange={(e) => setEditModYouTubeUrl(e.target.value)}
            />
            {editModYouTubeUrl.trim() && !isValidYouTubeUrl(editModYouTubeUrl.trim()) && (
              <span style={{ color: '#ef4444', fontSize: '0.78rem', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                Please enter a valid YouTube URL (youtube.com or youtu.be)
              </span>
            )}
            {isValidYouTubeUrl(editModYouTubeUrl.trim()) && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Live Video Preview:
                </div>
                <YouTubeEmbed videoUrl={editModYouTubeUrl.trim()} title={`${editModTitle || "Module"} - Video Preview`} />
              </div>
            )}
          </div>

          <div className="form-group-spaced">
            <DurationInput
              hours={editModHours}
              minutes={editModMinutes}
              onChange={(h: number, m: number) => {
                setEditModHours(h);
                setEditModMinutes(m);
              }}
              label="Module Duration"
              required={false}
              helperNote="Estimated time for learners to complete video lecture and reading materials."
              idPrefix="edit-mod-duration"
            />
          </div>

          <div className="form-group-spaced">
            <label className="form-label-styled">Sequence Order</label>
            <input
              type="number"
              min="1"
              className="form-input-styled"
              value={editModOrder}
              onChange={(e) => setEditModOrder(Number(e.target.value))}
            />
          </div>

          <div className="form-group-spaced">
            <label className="form-label-styled">Difficulty Tier</label>
            <select
              className="form-select-styled"
              value={editModTier}
              onChange={(e) => setEditModTier(e.target.value as any)}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Delete / Unassign Module Confirmation Modal */}
      <Modal
        isOpen={!!moduleToDelete}
        onClose={() => setModuleToDelete(null)}
        title="Remove or Delete Module"
        icon={<AlertTriangle style={{ color: '#ef4444' }} />}
        maxWidth="480px"
        footer={
          <>
            <Button variant="outline" onClick={() => setModuleToDelete(null)} disabled={isDeletingModule}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmDeleteModule}
              disabled={isDeletingModule}
              style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
            >
              {isDeletingModule
                ? 'Processing...'
                : deleteModuleMode === 'unassign'
                ? 'Remove from Course'
                : 'Confirm Permanent Delete'}
            </Button>
          </>
        }
      >
        <div style={{ fontSize: '0.92rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>
          <p style={{ marginBottom: '14px' }}>
            Choose how you would like to handle module <strong>"{moduleToDelete?.title}"</strong>:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px',
                borderRadius: '8px',
                border: deleteModuleMode === 'unassign' ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                background: deleteModuleMode === 'unassign' ? 'var(--accent-glow)' : 'transparent',
                cursor: 'pointer'
              }}
            >
              <input
                type="radio"
                name="deleteMode"
                checked={deleteModuleMode === 'unassign'}
                onChange={() => setDeleteModuleMode('unassign')}
                style={{ marginTop: '3px' }}
              />
              <div>
                <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                  Unassign from this course only (Recommended)
                </strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Detaches this module from "{course.title}" while preserving the module and its contents in the system for other courses.
                </span>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px',
                borderRadius: '8px',
                border: deleteModuleMode === 'permanent' ? '1px solid #ef4444' : '1px solid var(--border-color)',
                background: deleteModuleMode === 'permanent' ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                cursor: 'pointer'
              }}
            >
              <input
                type="radio"
                name="deleteMode"
                checked={deleteModuleMode === 'permanent'}
                onChange={() => setDeleteModuleMode('permanent')}
                style={{ marginTop: '3px' }}
              />
              <div>
                <strong style={{ display: 'block', color: '#ef4444', fontSize: '0.9rem' }}>
                  Permanently Delete from System
                </strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Are you sure? This action cannot be undone. Completely removes this module and its lessons from all courses.
                </span>
              </div>
            </label>
          </div>
        </div>
      </Modal>

      {/* Delete Course Confirmation Modal */}
      <Modal
        isOpen={isDeleteCourseModalOpen}
        onClose={() => setIsDeleteCourseModalOpen(false)}
        title="Delete Course Confirmation"
        icon={<AlertTriangle style={{ color: '#ef4444' }} />}
        maxWidth="460px"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsDeleteCourseModalOpen(false)} disabled={isDeletingCourse}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmDeleteCourse}
              disabled={isDeletingCourse}
              style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
            >
              {isDeletingCourse ? 'Deleting Course...' : 'Confirm Delete Course'}
            </Button>
          </>
        }
      >
        <div style={{ lineHeight: '1.6', fontSize: '0.92rem', color: 'var(--text-primary)' }}>
          <p style={{ marginBottom: '12px' }}>
            Are you sure you want to delete course <strong>"{course.title}"</strong> ({course.course_code})?
          </p>
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <strong>Notice:</strong> This action cannot be undone. Shared modules linked to other courses will be safely preserved in the curriculum.
          </div>
        </div>
      </Modal>

      {/* Edit Course Meta & Deadline Modal */}
      <Modal
        isOpen={isEditCourseModalOpen}
        onClose={() => setIsEditCourseModalOpen(false)}
        title="Edit Course Details & Deadline"
        subtitle={`Update configuration for ${course?.course_code}`}
        icon={<Edit3 size={20} style={{ color: 'var(--accent-color)' }} />}
        maxWidth="580px"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsEditCourseModalOpen(false)} disabled={isSavingCourseMeta}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveCourseMeta} disabled={isSavingCourseMeta}>
              {isSavingCourseMeta ? 'Saving Changes...' : 'Save Course Details'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveCourseMeta} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group-spaced" style={{ margin: 0 }}>
            <label className="form-label-styled">Course Title <span className="required-star">*</span></label>
            <input 
              type="text" 
              className="form-input-styled" 
              value={editCourseTitle}
              onChange={(e) => setEditCourseTitle(e.target.value)}
              placeholder="Course title..."
              required
            />
          </div>

          <div className="form-group-spaced" style={{ margin: 0 }}>
            <label className="form-label-styled">Course Description</label>
            <textarea 
              className="form-input-styled" 
              value={editCourseDesc}
              onChange={(e) => setEditCourseDesc(e.target.value)}
              placeholder="Course overview and objectives..."
              rows={3}
            />
          </div>

          <div className="form-group-spaced" style={{ margin: 0 }}>
            <DurationInput 
              showDays={true}
              days={editCourseDays}
              hours={editCourseHours}
              minutes={editCourseMinutes}
              onChange={(d: number, h: number, m: number) => {
                setEditCourseDays(d);
                setEditCourseHours(h);
                setEditCourseMinutes(m);
              }}
              label="Course Deadline / Completion Duration"
              helperNote="Learners will have this duration from enrollment/publish date to complete this course before it locks."
              idPrefix="syllabus-course-deadline"
            />
          </div>

          <div className="form-group-spaced" style={{ margin: 0 }}>
            <label className="form-label-styled">Priority</label>
            <select 
              className="form-select-styled" 
              value={editCoursePriority}
              onChange={(e) => setEditCoursePriority(e.target.value as any)}
              style={{ width: '100%' }}
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div className="form-group-spaced" style={{ margin: 0 }}>
            <label className="form-label-styled">Course Intro Video URL (YouTube)</label>
            <input 
              type="url" 
              className="form-input-styled" 
              value={editCourseVideoUrl}
              onChange={(e) => setEditCourseVideoUrl(e.target.value)}
              placeholder="e.g. https://www.youtube.com/watch?v=..."
            />
          </div>
        </form>
      </Modal>

      {/* Assigned Learners & Progress Modal */}
      <LearnersModal
        isOpen={isLearnersModalOpen}
        onClose={() => setIsLearnersModalOpen(false)}
        courseId={courseId || null}
        courseTitle={course?.title}
        courseCode={course?.course_code}
      />
    </div>
  );
};
