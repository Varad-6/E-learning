import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ArrowRight, Play, Pause, Check, Volume2, RotateCcw,
  BookOpen, ChevronDown, ChevronRight, HelpCircle, Award, 
  FileText, Download, Menu, X, Lock, Unlock, Clock, CheckCircle, AlertCircle,
  ExternalLink, Save
} from 'lucide-react';
import { apiCall } from '../../services/api';
import { Button } from '../../components/Button/Button';
import { CourseraRichText } from '../../components/CourseraRichText/CourseraRichText';
import { YouTubePlayer } from '../../components/YouTubePlayer/YouTubePlayer';
import { extractYouTubeId, isValidYouTubeUrl, buildYouTubeWatchUrl } from '../../utils/youtube';
import { formatDuration } from '../../utils/duration';
import './CoursePlayer.css';

interface ContentItem {
  id: string;
  title: string;
  type: 'video' | 'document' | 'quiz';
  duration: string;
  subtitle?: string;
  description?: string;
  videoUrl?: string;
}

interface Module {
  id: string;
  title: string;
  description?: string;
  contents: ContentItem[];
  tier?: 'beginner' | 'intermediate' | 'advanced';
}

export const CoursePlayer: React.FC = () => {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const navigate = useNavigate();

  // Core API states
  const [enrollment, setEnrollment] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLanding, setShowLanding] = useState(true);
  const [landingActiveTab, setLandingActiveTab] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');

  // Playback & UI states
  const [activeContentIndex, setActiveContentIndex] = useState(0);
  const [completedContentIds, setCompletedContentIds] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<{ [key: string]: boolean }>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [currentVideoPercent, setCurrentVideoPercent] = useState<number>(0);
  const [notesText, setNotesText] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Custom Video Upload State
  const [customVideoUrl, setCustomVideoUrl] = useState<string>('');
  const [isCustomVideo, setIsCustomVideo] = useState(false);
  const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set());
  const maxWatchedTimeRef = useRef<number>(0);
  
  // Quiz states
  const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: string }>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [currentQuizQuestionIndex, setCurrentQuizQuestionIndex] = useState(0);
  const [dbQuizzes, setDbQuizzes] = useState<{ [moduleId: string]: any[] }>({});

  // Timed course states
  const [countdownText, setCountdownText] = useState<string>('00d : 00h : 00m : 00s');
  const [courseLocked, setCourseLocked] = useState<boolean>(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState<boolean>(false);
  const [playerTab, setPlayerTab] = useState<'overview' | 'notes' | 'resources'>('overview');
  const [notesSavedFeedback, setNotesSavedFeedback] = useState<boolean>(false);
  const [autoAdvanceToast, setAutoAdvanceToast] = useState<string | null>(null);

  // Default modules structure if none exist in the database for the course
  const defaultModules: Module[] = [
    {
      id: 'm1',
      title: 'Module 1: Continuous Improvement Philosophy',
      tier: 'beginner',
      contents: [
        { 
          id: 'c1_doc', 
          title: '1.1 Industry Standards & Philosophy Overview', 
          type: 'document', 
          duration: '10 min read',
          subtitle: 'Underpinnings of Continuous Improvement',
          description: 'Explore the core principles of continuous improvement systems, Kaizen methodology, and feedback loop optimizations in large-scale modern engineering.'
        },
        { 
          id: 'c1_vid', 
          title: '1.2 Continuous Integration Philosophy', 
          type: 'video', 
          duration: '12:40',
          subtitle: 'CI/CD Architecture Pipeline Lecture',
          description: 'A deep dive presentation outlining build triggers, test pipelines, and deployment orchestration workflows.',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
        }
      ]
    },
    {
      id: 'm2',
      title: 'Module 2: Database Persistence Pipelines',
      tier: 'intermediate',
      contents: [
        { 
          id: 'c2_doc', 
          title: '2.1 Alembic Database Migrations & Version Control', 
          type: 'document', 
          duration: '15 min read',
          subtitle: 'Relational Schema Migration Architecture',
          description: 'Learn the architectural patterns behind schema versions, declarative sqlalchemy models, non-destructive seed scripts, and rollback parameters.'
        },
        { 
          id: 'c2_vid', 
          title: '2.2 Advanced Query Performance & Joins', 
          type: 'video', 
          duration: '15:20',
          subtitle: 'Optimizing SQL Queries Lecture',
          description: 'Master indexed scans, database connection pooling configurations, and lazy loading relationships without overhead.',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
        }
      ]
    }
  ];

  // Helper to parse YouTube ID
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url ? url.match(regExp) : null;
    return (match && match[2].length === 11) ? match[2] : null;
  };

  useEffect(() => {
    const loadEnrollmentData = async () => {
      try {
        setLoading(true);
        let enrollData: any = null;
        let targetCourseId = '';

        // 1. Fetch enrollment
        const enrollRes = await apiCall(`/api/enrollments/${enrollmentId}`);
        if (enrollRes.ok) {
          enrollData = await enrollRes.json();
          targetCourseId = enrollData.course_id;
        } else {
          // Check if parameter is a course ID
          const courseCheck = await apiCall(`/api/courses/${enrollmentId}`);
          if (courseCheck.ok) {
            targetCourseId = enrollmentId || '';
            const cData = await courseCheck.json();
            setCourse(cData);

            // Check existing enrollments
            try {
              const myCoursesRes = await apiCall('/api/my-courses');
              if (myCoursesRes.ok) {
                const myCoursesData = await myCoursesRes.json();
                const found = (myCoursesData.courses || []).find((c: any) => c.id === targetCourseId);
                if (found && found.enrollment_id) {
                  const enrRes = await apiCall(`/api/enrollments/${found.enrollment_id}`);
                  if (enrRes.ok) {
                    enrollData = await enrRes.json();
                  }
                }
              }
            } catch (e) {
              console.warn('Could not check existing enrollments:', e);
            }

            // Auto-enroll if not enrolled
            if (!enrollData) {
              try {
                const enrollAction = await apiCall(`/api/courses/${targetCourseId}/enroll`, { method: 'POST' });
                if (enrollAction.ok) {
                  const actionData = await enrollAction.json();
                  if (actionData.enrollment_id) {
                    const enrRes = await apiCall(`/api/enrollments/${actionData.enrollment_id}`);
                    if (enrRes.ok) {
                      enrollData = await enrRes.json();
                    }
                  }
                }
              } catch (e) {
                console.warn('Auto-enroll error:', e);
              }
            }

            // Fallback preview object
            if (!enrollData) {
              enrollData = {
                id: `preview_${targetCourseId}`,
                course_id: targetCourseId,
                status: 'in_progress',
                progress_percent: 0,
                is_locked: false
              };
            }
          } else {
            throw new Error('Course or enrollment not found.');
          }
        }

        setEnrollment(enrollData);
        if (enrollData && enrollData.is_locked) {
          setCourseLocked(true);
        }

        // 2. Fetch course details
        if (targetCourseId && !course) {
          const courseRes = await apiCall(`/api/courses/${targetCourseId}`);
          if (courseRes.ok) {
            const courseData = await courseRes.json();
            setCourse(courseData);
          }
        }

        // 3. Fetch modules from database
        const modulesRes = await apiCall(`/api/courses/${targetCourseId || enrollData?.course_id}/modules`);
        let fetchedModules: any[] = [];
        if (modulesRes.ok) {
          fetchedModules = await modulesRes.json();
        }
        
        const finalModules = fetchedModules.length > 0 ? fetchedModules : defaultModules;

        // 4. Fetch quizzes from backend in parallel
        const quizzesMap: { [moduleId: string]: any[] } = {};
        for (const mod of finalModules) {
          try {
            const quizRes = await apiCall(`/api/quizzes/module/${mod.id}`);
            if (quizRes.ok) {
              const quizData = await quizRes.json();
              if (quizData && quizData.questions) {
                quizzesMap[mod.id] = quizData.questions.map((q: any) => ({
                  id: q.id,
                  question: q.question_text,
                  options: q.options,
                  correctAnswer: q.correct_answer,
                  questionType: q.question_type || 'mcq'
                }));
              }
            }
          } catch (err) {
            console.error("Failed to load quiz for module: " + mod.id, err);
          }
        }
        setDbQuizzes(quizzesMap);

        // 5. Map modules to player structure, loading content blocks from backend
        const mappedModules: Module[] = finalModules.map((mod: any, index: number) => {
          let contents: ContentItem[] = [];

          if (mod.contents && mod.contents.length > 0) {
            let currentTitle = "";
            let currentSubtitle = "";

            mod.contents.forEach((block: any) => {
              const type = block.content_type || block.type;
              const val = block.value || '';
              const label = block.label || '';
              
              if (type === 'title') {
                currentTitle = val;
              } else if (type === 'subtitle') {
                currentSubtitle = val;
              } else if (type === 'text' || type === 'article' || type === 'reading' || type === 'document') {
                contents.push({
                  id: block.id,
                  title: block.title || currentTitle || `Lecture ${index + 1}.${contents.length + 1}`,
                  type: 'document',
                  duration: block.duration_seconds ? formatDuration(block.duration_seconds) : (block.duration || '5 min read'),
                  subtitle: block.subtitle || currentSubtitle || `Reading lesson`,
                  description: val || block.description
                });
                currentTitle = "";
                currentSubtitle = "";
              } else if (type === 'youtube' || type === 'video') {
                contents.push({
                  id: block.id,
                  title: block.title || currentTitle || `Video Lecture ${index + 1}.${contents.length + 1}`,
                  type: 'video',
                  duration: block.duration_seconds ? formatDuration(block.duration_seconds) : (block.duration || '10:00'),
                  subtitle: block.subtitle || currentSubtitle || "Media presentation",
                  description: val || block.description || "Watch the video presentation explaining this section's topic.",
                  videoUrl: block.file_path || val || block.videoUrl
                });
                currentTitle = "";
                currentSubtitle = "";
              } else if (type === 'blog' || type === 'website' || type === 'attachment') {
                const labelText = type === 'attachment' ? (label || 'Download Attachment') : `Visit ${type.toUpperCase()}`;
                contents.push({
                  id: block.id,
                  title: currentTitle || `${type.toUpperCase()} Reference ${index + 1}.${contents.length + 1}`,
                  type: 'document',
                  duration: type === 'attachment' ? 'Download' : 'Web Link',
                  subtitle: currentSubtitle || `External link resources`,
                  description: `This section links to an external ${type}: ${labelText}. Please click the button below to study the resources.`,
                  videoUrl: block.file_path || val
                });
                currentTitle = "";
                currentSubtitle = "";
              } else if (type === 'image') {
                contents.push({
                  id: block.id,
                  title: currentTitle || `Visual Resource`,
                  type: 'document',
                  duration: 'Image',
                  subtitle: currentSubtitle || `Image attachment`,
                  description: `Review the diagram or illustration below.`,
                  videoUrl: block.file_path || val
                });
                currentTitle = "";
                currentSubtitle = "";
              }
            });
          }

          // If no content blocks were found, default to standard templates
          if (contents.length === 0) {
            contents = [
              { 
                id: `c_${mod.id}_doc`, 
                title: `${index + 1}.1 Core Theory Lesson`, 
                type: 'document', 
                duration: '10 min read',
                subtitle: `Underpinnings of ${mod.title}`,
                description: mod.description || "Review the core philosophy and learning objectives for this module."
              },
              { 
                id: `c_${mod.id}_video`, 
                title: `${index + 1}.2 Interactive Video Lecture`, 
                type: 'video', 
                duration: '12:40',
                subtitle: `Demonstration: ${mod.title}`,
                description: "Watch the video presentation explaining the continuous improvement workflow.",
                videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              }
            ];
          }

          // Append Quiz slide (MCQ Assessment) ONLY if the creator added quiz questions for this module
          const moduleQuizzes = quizzesMap[mod.id] || [];
          if (moduleQuizzes.length > 0) {
            contents.push({
              id: `quiz_${mod.id}`,
              title: `${index + 1}.${contents.length + 1} Module Assessment`,
              type: 'quiz',
              duration: `${moduleQuizzes.length} Question${moduleQuizzes.length > 1 ? 's' : ''}`,
              subtitle: `Final Test on ${mod.title}`,
              description: 'Complete the multiple-choice assessment to prove module mastery.'
            });
          }

          return {
            id: mod.id,
            title: mod.title.includes('Module') ? mod.title : `Module ${index + 1}: ${mod.title}`,
            contents,
            tier: mod.tier || 'beginner'
          };
        });

        setModules(mappedModules);

        // Initialize expanded modules state
        const initialExpanded: { [key: string]: boolean } = {};
        mappedModules.forEach((m, idx) => {
          initialExpanded[m.id] = idx === 0;
        });
        setExpandedModules(initialExpanded);

        // Reconstruct completed content items from progress percentage
        const progressVal = enrollData.progress_percent || 0;
        const flatList = mappedModules.reduce<ContentItem[]>((acc, mod) => [...acc, ...mod.contents], []);
        const completedCount = Math.round((progressVal / 100) * flatList.length);
        
        const initialCompleted = new Set<string>();
        for (let i = 0; i < completedCount; i++) {
          if (flatList[i]) {
            initialCompleted.add(flatList[i].id);
          }
        }
        setCompletedContentIds(initialCompleted);
        
        // Set active content index based on completion
        if (completedCount < flatList.length) {
          setActiveContentIndex(completedCount);
        } else {
          setActiveContentIndex(flatList.length - 1);
        }

      } catch (err) {
        console.error('Failed to load course player data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (enrollmentId) {
      loadEnrollmentData();
    }
  }, [enrollmentId]);

  // Timed Course Countdown Clock
  useEffect(() => {
    if (!enrollment || !enrollment.expires_at) return;
    
    if (enrollment.is_locked) {
      setCourseLocked(true);
      setCountdownText("00d : 00h : 00m : 00s");
      return;
    }

    const interval = setInterval(() => {
      const expireTime = new Date(enrollment.expires_at).getTime();
      const now = new Date().getTime();
      const diff = expireTime - now;

      if (diff <= 0) {
        setCountdownText("00d : 00h : 00m : 00s");
        setCourseLocked(true);
        setShowTimeUpModal(true);
        clearInterval(interval);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const pad = (n: number) => n.toString().padStart(2, '0');
        setCountdownText(`${pad(days)}d : ${pad(hours)}h : ${pad(minutes)}m : ${pad(seconds)}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [enrollment, enrollmentId]);

  // Flattened content list for linear next/prev traversal
  const flatContents = modules.reduce<ContentItem[]>((acc, mod) => [...acc, ...mod.contents], []);
  const activeContent = flatContents[activeContentIndex];

  // Load and Save notes from database (or localStorage fallback) specific to active module
  useEffect(() => {
    const activeModule = modules.find(mod => mod.contents.some(c => c.id === activeContent?.id));
    
    const loadNotes = async () => {
      if (activeModule?.id) {
        // Validate if it is a valid UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeModule.id);
        if (isUuid) {
          try {
            const notesRes = await apiCall(`/api/modules/${activeModule.id}/notes`);
            if (notesRes.ok) {
              const notesData = await notesRes.json();
              setNotesText(notesData.content || '');
              return;
            }
          } catch (err) {
            console.error("Failed to load notes from database:", err);
          }
        }
      }
      
      // Fallback if not UUID or database call failed/returned 404
      if (course?.id && activeContent?.id) {
        const savedNotes = localStorage.getItem(`kaizen_notes_${course.id}_${activeContent.id}`);
        setNotesText(savedNotes || '');
      }
    };

    loadNotes();

    // Reset states on content index change
    setIsPlaying(false);
    setVideoTime(0);
    setCurrentVideoPercent(0);
    maxWatchedTimeRef.current = 0;
    setQuizAnswers({});
    setQuizSubmitted(false);
    setCurrentQuizQuestionIndex(0);
  }, [course, activeContentIndex, modules]);

  const handleSaveNotes = async () => {
    const activeModule = modules.find(mod => mod.contents.some(c => c.id === activeContent?.id));
    
    if (activeModule?.id) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeModule.id);
      if (isUuid) {
        try {
          const response = await apiCall(`/api/modules/${activeModule.id}/notes`, {
            method: 'PUT',
            body: JSON.stringify({ content: notesText })
          });
          
          if (response.ok) {
            if (course?.id && activeContent?.id) {
              localStorage.setItem(`kaizen_notes_${course.id}_${activeContent.id}`, notesText);
            }
            alert('Notes saved successfully to database!');
            return;
          } else {
            const err = await response.json();
            alert(err.detail || 'Failed to save notes to database.');
          }
        } catch (err) {
          console.error("Failed to save notes to backend:", err);
        }
      }
    }
    
    // Fallback saving local only
    if (course?.id && activeContent?.id) {
      localStorage.setItem(`kaizen_notes_${course.id}_${activeContent.id}`, notesText);
      alert('Notes saved successfully locally!');
    }
  };

  const handleDownloadNotes = () => {
    if (!notesText.trim()) {
      alert('Notes pad is empty. Type some notes before downloading.');
      return;
    }
    const element = document.createElement("a");
    const file = new Blob([notesText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Kaizen_Notes_${course?.course_code || 'Course'}_Module_${Math.floor(activeContentIndex / 3) + 1}_Step_${(activeContentIndex % 3) + 1}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Video progress simulator timer for simulated items
  useEffect(() => {
    let interval: any;
    if (isPlaying && activeContent?.type === 'video' && !activeContent.videoUrl && !isCustomVideo) {
      interval = setInterval(() => {
        setVideoTime(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            if (activeContent?.id) {
              setWatchedVideos(old => new Set(old).add(activeContent.id));
              handleAutoAdvanceNext(activeContent.id);
            }
            return 100;
          }
          return prev + 5;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, activeContentIndex, isCustomVideo]);

  // Local video upload handler
  const handleLocalVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setCustomVideoUrl(objectUrl);
      setIsCustomVideo(true);
      setIsPlaying(false);
      setVideoTime(0);
    }
  };

  // Pause any playing HTML5 media immediately when tab switches or window loses focus
  useEffect(() => {
    const pauseAllMedia = () => {
      const videos = document.querySelectorAll('video');
      videos.forEach(v => {
        if (!v.paused) v.pause();
      });
    };

    const handleVisibility = () => {
      if (document.hidden) pauseAllMedia();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', pauseAllMedia);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', pauseAllMedia);
    };
  }, []);

  // Completion & sequential unlock helpers
  const isModuleCompleted = (mod: Module) => {
    return mod.contents.every(item => completedContentIds.has(item.id));
  };

  const lastSyncTimeRef = useRef<number>(Date.now());

  const handlePeriodicVideoProgress = useCallback((contentId: string, moduleId: string, percent: number, curTime: number, dur: number) => {
    const now = Date.now();
    if (now - lastSyncTimeRef.current >= 12000) {
      const elapsedSec = Math.min(30, Math.round((now - lastSyncTimeRef.current) / 1000));
      lastSyncTimeRef.current = now;
      if (enrollmentId && !courseLocked) {
        apiCall(`/api/enrollments/${enrollmentId}/progress`, {
          method: 'PUT',
          body: JSON.stringify({
            module_id: moduleId,
            content_id: contentId,
            completed: percent >= 90,
            time_spent_seconds: elapsedSec,
            current_time_seconds: curTime,
            duration_seconds: dur
          })
        }).catch(err => console.warn('Periodic progress sync failed:', err));
      }
    }
  }, [enrollmentId, courseLocked]);

  const isModuleUnlocked = (modId: string, customCompleted?: Set<string>) => {
    if (courseLocked) return true; // Review Mode: all modules unlocked
    const modIndex = modules.findIndex(m => m.id === modId);
    if (modIndex <= 0) return true; // First module is always unlocked
    const currentSet = customCompleted || completedContentIds;
    return modules[modIndex - 1].contents.every(item => currentSet.has(item.id));
  };

  const isItemUnlocked = (itemId: string, customCompleted?: Set<string>) => {
    if (courseLocked) return true; // Review Mode: all items unlocked
    const currentSet = customCompleted || completedContentIds;
    const targetIdx = flatContents.findIndex(c => c.id === itemId);
    if (targetIdx <= 0) return true; // First lesson is always unlocked
    // Every previous lesson in sequence must be completed
    for (let i = 0; i < targetIdx; i++) {
      if (!currentSet.has(flatContents[i].id)) {
        return false;
      }
    }
    return true;
  };

  const handleMarkContentComplete = async (contentId: string) => {
    if (courseLocked) return; // Review Mode: progress bar and DB state frozen
    if (completedContentIds.has(contentId)) return;

    const updated = new Set(completedContentIds);
    updated.add(contentId);
    setCompletedContentIds(updated);

    // Save progress to database
    const progressPercent = Math.round((updated.size / flatContents.length) * 100);
    try {
      const currentParentMod = modules.find(m => m.contents.some(c => c.id === contentId));
      if (currentParentMod) {
        await apiCall(`/api/enrollments/${enrollmentId}/progress`, {
          method: 'PUT',
          body: JSON.stringify({
            module_id: currentParentMod.id,
            content_id: contentId,
            completed: true,
            time_spent_seconds: 15
          })
        });
      }
      await apiCall(`/api/enrollments/${enrollmentId}/progress-percent?percent=${progressPercent}`, {
        method: 'PUT'
      });
      // Update enrollment local state
      setEnrollment((prev: any) => prev ? { ...prev, progress_percent: progressPercent } : null);
    } catch (e) {
      console.error('Failed to save progress in DB:', e);
    }
  };

  const handleNextSection = async () => {
    const currentItem = flatContents[activeContentIndex];
    
    // Strict Option A Gate: If current item is a video, verify user watched at least 90%
    if (currentItem?.type === 'video' && !completedContentIds.has(currentItem.id) && !courseLocked) {
      const watched = watchedVideos.has(currentItem.id) || currentVideoPercent >= 90;
      if (!watched) {
        alert(`Video Incomplete: You must watch at least 90% of this lecture video to unlock the next lesson. (Currently watched: ${currentVideoPercent}%).`);
        return;
      }
      setWatchedVideos(prev => new Set(prev).add(currentItem.id));
      await handleMarkContentComplete(currentItem.id);
    } else if (currentItem && !courseLocked && !completedContentIds.has(currentItem.id)) {
      // Auto-complete reading/document items on proceed
      await handleMarkContentComplete(currentItem.id);
    }

    const updatedCompleted = new Set(completedContentIds);
    if (currentItem) updatedCompleted.add(currentItem.id);

    if (activeContentIndex < flatContents.length - 1) {
      const nextIndex = activeContentIndex + 1;
      const nextItem = flatContents[nextIndex];
      if (isItemUnlocked(nextItem.id, updatedCompleted) || courseLocked) {
        setActiveContentIndex(nextIndex);
      } else {
        alert('This lesson is locked. Please complete the preceding lesson first.');
      }
    }
  };

  const handlePrevSection = () => {
    if (activeContentIndex > 0) {
      setActiveContentIndex(activeContentIndex - 1);
    }
  };

  const handleSelectQuizAnswer = (qIdx: number, val: string) => {
    setQuizAnswers({ ...quizAnswers, [qIdx]: val });
  };

  const getActiveQuizQuestions = () => {
    const currentActiveModule = modules.find(mod => mod.contents.some(c => c.id === activeContent?.id));
    const moduleQuizzes = (currentActiveModule?.id ? dbQuizzes[currentActiveModule.id] : null) || [];
    
    if (moduleQuizzes.length > 0) {
      return moduleQuizzes.map((q: any) => {
        let letter = q.correctAnswer;
        if (q.questionType !== 'msq' && q.correctAnswer && q.correctAnswer.length > 1) {
          const idx = q.options.indexOf(q.correctAnswer);
          if (idx >= 0) {
            letter = String.fromCharCode(65 + idx);
          }
        }
        return {
          question: q.question,
          options: q.options,
          correctAnswer: letter,
          questionType: q.questionType || 'mcq'
        };
      });
    }
    
    // No questions configured by creator - return empty array
    return [];
  };

  const handleSubmitQuiz = () => {
    const questionsList = getActiveQuizQuestions();
    if (questionsList.length === 0) return;
    let correctCount = 0;
    
    questionsList.forEach((q: any, idx: number) => {
      const type = q.questionType || 'mcq';
      const ans = quizAnswers[idx] || '';

      if (type === 'notes') {
        correctCount++;
      } else if (type === 'msq') {
        let correctLetters: string[] = [];
        try {
          const correctTexts = JSON.parse(q.correctAnswer);
          correctLetters = correctTexts.map((t: string) => {
            const oIdx = q.options.indexOf(t);
            return oIdx >= 0 ? String.fromCharCode(65 + oIdx) : '';
          }).filter(Boolean).sort();
        } catch {
          correctLetters = [];
        }

        let userLetters: string[] = [];
        try {
          userLetters = JSON.parse(ans).sort();
        } catch {
          userLetters = [];
        }

        const matches = correctLetters.length === userLetters.length && 
          correctLetters.every((val, i) => val === userLetters[i]);
        if (matches) {
          correctCount++;
        }
      } else {
        if (ans === q.correctAnswer) {
          correctCount++;
        }
      }
    });
    
    const score = Math.round((correctCount / questionsList.length) * 100);
    setQuizScore(score);
    setQuizSubmitted(true);

    if (score >= 66) {
      handleMarkContentComplete(activeContent.id);
    }
  };

  const handleFinalCompleteCourse = async () => {
    try {
      // Mark 100% and complete
      await apiCall(`/api/enrollments/${enrollmentId}/progress-percent?percent=100`, {
        method: 'PUT'
      });
      await apiCall(`/api/enrollments/${enrollmentId}/complete`, {
        method: 'POST'
      });
      alert('Congratulations! You have completed the course curriculum and earned your certification.');
      navigate(-1);
    } catch (e) {
      console.error(e);
      alert('Error saving completion state.');
    }
  };

  // Auto-advance directly to the next lesson when video finishes
  const handleAutoAdvanceNext = useCallback(async (contentId?: string) => {
    const currentItem = flatContents[activeContentIndex];
    const targetId = contentId || currentItem?.id;
    if (!targetId || courseLocked) return;

    setWatchedVideos(prev => new Set(prev).add(targetId));
    await handleMarkContentComplete(targetId);

    const updatedCompleted = new Set(completedContentIds);
    updatedCompleted.add(targetId);

    if (activeContentIndex < flatContents.length - 1) {
      const nextIndex = activeContentIndex + 1;
      const nextItem = flatContents[nextIndex];
      if (isItemUnlocked(nextItem.id, updatedCompleted) || courseLocked) {
        setAutoAdvanceToast(`Video completed! Advancing to ${nextItem.title}...`);
        setTimeout(() => {
          setActiveContentIndex(nextIndex);
          setAutoAdvanceToast(null);
        }, 1200);
      }
    } else {
      // Last lesson completed: celebrate course completion
      setAutoAdvanceToast("Congratulations! All curriculum lessons completed.");
      setTimeout(() => {
        setAutoAdvanceToast(null);
        handleFinalCompleteCourse();
      }, 1500);
    }
  }, [activeContentIndex, completedContentIds, courseLocked, flatContents, isItemUnlocked]);

  if (loading) {
    return (
      <div className="course-player-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
        <p style={{ marginTop: '16px', color: '#9ca3af' }}>Initializing Course Player workspace...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="course-player-container" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center', padding: '24px' }}>
        <div className="glass-panel" style={{ padding: '40px', maxWidth: '480px', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <AlertCircle size={48} style={{ color: '#ef4444' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Course Not Available</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
            Unable to load this course curriculum. The course may be currently unassigned or pending review.
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
            <Button variant="primary" onClick={() => navigate('/courses')}>
              Explore Catalog
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (showLanding && course) {
    const totalModulesCount = modules.length;
    const beginnerModules = modules.filter(m => m.tier === 'beginner' || !m.tier);
    const intermediateModules = modules.filter(m => m.tier === 'intermediate');
    const advancedModules = modules.filter(m => m.tier === 'advanced');

    const activeTierModules = 
      landingActiveTab === 'beginner' ? beginnerModules :
      landingActiveTab === 'intermediate' ? intermediateModules :
      advancedModules;

    return (
      <div className="container animate-fade-in" style={{ marginTop: '40px', paddingBottom: '80px' }}>
        
        {/* Back navigation button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <Button variant="outline" onClick={() => navigate('/dashboard')} style={{ padding: '8px' }}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>
              Course Syllabus Preview
            </span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '4px 0 0 0' }}>{course.title}</h2>
          </div>
        </div>

        {/* Grid Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '40px', alignItems: 'flex-start' }}>
          
          {/* Left Column: Metadata & Course Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <span className="code-tag" style={{ display: 'inline-block', marginBottom: '16px', background: 'var(--accent-glow)', color: 'var(--accent-color)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                {course.course_code}
              </span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '12px' }}>About this Course</h3>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.6', margin: 0 }}>
                <CourseraRichText content={course.description || "Learn Kaizen principles and compliance standards scoped to this team department."} />
              </div>
            </div>

            {/* Metadata Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--border-radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Curriculum</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-color)' }}>{totalModulesCount} Modules</span>
              </div>
              <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--border-radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Estimated Duration</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-color)' }}>{formatDuration(course.duration)}</span>
              </div>
              <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--border-radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Target Scope</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {course.departmentName || 'All Departments'}
                </span>
              </div>
              <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--border-radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Priority Status</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: course.priority === 'High' ? 'var(--neon-coral)' : 'var(--accent-color)' }}>
                  {course.priority || 'Medium'}
                </span>
              </div>
            </div>

            {/* Dynamic Launch CTA Button */}
            <div style={{ marginTop: '12px' }}>
              <Button 
                variant="primary" 
                size="lg" 
                onClick={() => setShowLanding(false)} 
                style={{ width: '100%', height: '54px', fontSize: '1.05rem', fontWeight: 'bold' }}
              >
                {enrollment?.status === 'completed' || (enrollment?.progress_percent || 0) >= 100
                  ? 'Review Course' 
                  : (enrollment?.progress_percent || 0) > 0 
                  ? 'Continue Course' 
                  : 'Start Course'}
              </Button>
            </div>
          </div>

          {/* Right Column: Difficulty-tier tabbed controls & scrollable list */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: '520px' }}>
            
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px' }}>
              {(['beginner', 'intermediate', 'advanced'] as const).map((tier) => {
                const count = tier === 'beginner' ? beginnerModules.length : tier === 'intermediate' ? intermediateModules.length : advancedModules.length;
                const isActive = landingActiveTab === tier;
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setLandingActiveTab(tier)}
                    style={{
                      border: 'none',
                      background: 'none',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: '6px 12px',
                      borderBottom: isActive ? '2px solid var(--accent-color)' : 'none',
                      marginBottom: '-14px',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span style={{ textTransform: 'capitalize' }}>{tier}</span>
                    <span style={{ fontSize: '0.75rem', background: isActive ? 'var(--accent-glow)' : 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px' }}>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Scrollable side drawer list */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
              {activeTierModules.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 0', fontStyle: 'italic' }}>
                  No modules registered under the {landingActiveTab} tier.
                </div>
              ) : (
                activeTierModules.map((mod, index) => {
                  const isCompleted = mod.contents.every(item => completedContentIds.has(item.id));
                  return (
                    <div 
                      key={mod.id} 
                      style={{ 
                        padding: '16px', 
                        borderRadius: '8px', 
                        border: '1px solid var(--border-color)', 
                        background: 'rgba(255, 255, 255, 0.01)',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start'
                      }}
                    >
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-color)', background: 'var(--accent-glow)', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', flexShrink: 0, justifyContent: 'center' }}>
                        {index + 1}
                      </span>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: '700', margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                            {mod.title}
                          </h4>
                          {isCompleted && (
                            <span style={{ color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 'bold' }}>
                              <CheckCircle size={14} /> Done
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                          Includes {mod.contents.length} study resource lessons and assessment.
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

        </div>

      </div>
    );
  }

  const youtubeId = activeContent?.videoUrl ? getYouTubeId(activeContent.videoUrl) : null;
  const currentModuleIndex = modules.findIndex(m => m.contents.some(c => c.id === activeContent?.id));
  const activeModule = currentModuleIndex >= 0 ? modules[currentModuleIndex] : (modules[0] || null);
  const isCurrentItemCompleted = activeContent ? completedContentIds.has(activeContent.id) : false;
  const isVideoWatched = activeContent ? (watchedVideos.has(activeContent.id) || currentVideoPercent >= 90 || (videoTime >= 95 && !activeContent.videoUrl)) : false;

  return (
    <div className="course-player-container">
      {/* Mobile Syllabus Drawer Overlay */}
      <div className={`drawer-overlay ${isDrawerOpen ? 'open' : ''}`} onClick={() => setIsDrawerOpen(false)}>
        <div className="curriculum-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-header">
            <h3>Course Syllabus</h3>
            <button className="close-drawer-btn" onClick={() => setIsDrawerOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <div className="drawer-body">
            <div className="sidebar-modules-list">
              {modules.map((mod, modIdx) => {
                const isExpanded = expandedModules[mod.id] !== false;
                const isUnlocked = isModuleUnlocked(mod.id);
                return (
                  <div key={mod.id} className={`sidebar-module-group ${!isUnlocked ? 'module-locked' : ''}`}>
                    <button 
                      className="module-header-trigger"
                      onClick={() => isUnlocked && setExpandedModules({ ...expandedModules, [mod.id]: !isExpanded })}
                      disabled={!isUnlocked}
                    >
                      <div className="module-header-left">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {!isUnlocked ? <Lock size={14} style={{ color: 'var(--text-secondary)' }} /> : <Unlock size={14} style={{ color: 'var(--accent-color)' }} />}
                          <h4>Module {modIdx + 1}: {mod.title.replace(/^module\s*\d+\s*:\s*/i, '')}</h4>
                        </div>
                        <span>
                          {mod.contents.filter(c => completedContentIds.has(c.id)).length} / {mod.contents.length} Completed
                        </span>
                      </div>
                      {isUnlocked && (isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />)}
                    </button>

                    {isUnlocked && isExpanded && (
                      <div className="module-contents-list">
                        {mod.contents.map((item) => {
                          const indexInFlat = flatContents.findIndex(c => c.id === item.id);
                          const isItemActive = activeContentIndex === indexInFlat;
                          const isItemCompleted = completedContentIds.has(item.id);
                          const itemUnlocked = isItemUnlocked(item.id) || courseLocked;
                          
                          return (
                            <div 
                              key={item.id} 
                              className={`content-item-row ${isItemActive ? 'active' : ''} ${!itemUnlocked ? 'item-locked' : ''}`}
                              style={{ opacity: itemUnlocked ? 1 : 0.65, cursor: itemUnlocked ? 'pointer' : 'not-allowed' }}
                              onClick={() => {
                                if (itemUnlocked) {
                                  setActiveContentIndex(indexInFlat);
                                  setIsDrawerOpen(false);
                                } else {
                                  alert('This lesson is locked. Please complete preceding lessons first.');
                                }
                              }}
                            >
                              <div className={`content-item-checkbox ${isItemCompleted ? 'checked' : ''}`}>
                                {!itemUnlocked ? (
                                  <Lock size={10} style={{ color: 'var(--text-secondary)' }} />
                                ) : isItemCompleted ? (
                                  <Check size={12} />
                                ) : null}
                              </div>
                              <div className="content-item-meta">
                                <h5>{item.title}</h5>
                                <span className="content-item-duration">
                                  {item.type === 'video' && <Play size={10} />}
                                  {item.type === 'document' && <BookOpen size={10} />}
                                  {item.type === 'quiz' && <HelpCircle size={10} />}
                                  {item.duration}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Header Bar */}
      <header className="player-header">
        <div className="player-header-left">
          <button className="hamburger-btn" onClick={() => setIsDrawerOpen(true)} title="Open Syllabus Menu">
            <Menu size={22} />
          </button>
          <button className="back-dashboard-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Back
          </button>
          <div className="player-course-title-group">
            <span>{course?.course_code || 'COURSE'}</span>
            <h2>{course?.title || 'Course Player'}</h2>
          </div>
        </div>

        <div className="player-header-right">
          {enrollment?.expires_at && (
            <div className="countdown-timer-widget" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: 'var(--border-radius-sm)',
              background: courseLocked ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-card)',
              border: courseLocked ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color)',
              color: courseLocked ? '#ef4444' : 'var(--text-secondary)'
            }}>
              <Clock size={14} className={courseLocked ? '' : 'animate-pulse'} />
              <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 'bold' }}>
                {countdownText}
              </span>
              {courseLocked && <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 'bold', marginLeft: '4px' }}>Locked</span>}
            </div>
          )}
          <div className="player-header-progress">
            <span style={{ fontSize: '0.78rem', fontWeight: 'bold' }}>
              Progress: {enrollment?.progress_percent || 0}%
            </span>
            <div className="player-progress-bar-container">
              <div className="player-progress-bar-fill" style={{ width: `${enrollment?.progress_percent || 0}%` }}></div>
            </div>
          </div>
        </div>
      </header>

      {courseLocked ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - var(--navbar-height) - 100px)',
          padding: '40px 20px',
          textAlign: 'center',
          background: 'var(--bg-main)',
          color: 'var(--text-primary)'
        }}>
          <div className="glass-panel" style={{
            background: 'var(--bg-card)',
            padding: '48px 40px',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--border-color)',
            maxWidth: '500px',
            width: '100%',
            boxShadow: 'var(--shadow-premium)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              marginBottom: '8px'
            }}>
              <Lock size={36} />
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 850, margin: 0 }}>Course Access Locked</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.6', margin: 0 }}>
              The access deadline for completing this course has passed. Access to modules, syllabus content, and assessments has been locked.
            </p>
            <div style={{ 
              width: '100%', 
              padding: '12px 16px', 
              borderRadius: 'var(--border-radius-sm)', 
              background: 'var(--bg-input)', 
              border: '1px solid var(--border-color)',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Clock size={16} /> Deadline: {enrollment?.expires_at ? new Date(enrollment.expires_at).toLocaleString() : 'Expired'}
            </div>
            <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '12px' }}>
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard')} 
                style={{ flex: 1 }}
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Two-Column Coursera Learning Layout */
        <div className="player-layout-grid">
          {/* Left Column: Main Viewer & Content (minmax 1fr) */}
          <div className="player-main-content">
            {/* Top Lesson Metadata Row */}
            <div className="lesson-top-meta">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span className="lesson-badge">{activeModule?.title || 'Lesson Topic'}</span>
                <span className={`player-status-indicator ${isCurrentItemCompleted ? 'completed' : 'pending'}`}>
                  {isCurrentItemCompleted ? (
                    <>
                      <CheckCircle size={15} /> Completed
                    </>
                  ) : (
                    <>
                      <Clock size={15} /> In Progress
                    </>
                  )}
                </span>
              </div>
              <button 
                className="mobile-outline-toggle-bar"
                onClick={() => setIsDrawerOpen(true)}
              >
                <Menu size={16} /> Outline ({completedContentIds.size}/{flatContents.length})
              </button>
            </div>

            {/* Lesson Title & Subtitle */}
            <div>
              <h1 className="lesson-heading">{activeContent?.title}</h1>
              {activeContent?.subtitle && (
                <p style={{ color: 'var(--text-secondary)', margin: '6px 0 0 0', fontSize: '0.92rem' }}>
                  {activeContent.subtitle}
                </p>
              )}
            </div>

            {/* Content Media Area */}
            <div className="media-viewer-frame">
              {activeContent?.type === 'video' && (
                <div className="video-player-workspace">
                  {/* Direct Embedded Video Player (Direct Uploads, Local Video, or MP4/WebM) */}
                  {(isCustomVideo || (activeContent.videoUrl && (
                    activeContent.videoUrl.startsWith('/uploads/') ||
                    activeContent.videoUrl.endsWith('.mp4') ||
                    activeContent.videoUrl.endsWith('.webm') ||
                    activeContent.videoUrl.endsWith('.mov') ||
                    activeContent.videoUrl.endsWith('.m4v')
                  ))) ? (
                    <div className="video-viewport embedded-video-wrapper">
                      <video
                        key={isCustomVideo ? customVideoUrl : activeContent.videoUrl}
                        src={isCustomVideo ? customVideoUrl : activeContent.videoUrl}
                        controls
                        controlsList="nodownload"
                        className="embedded-video-element"
                        onTimeUpdate={(e) => {
                          const v = e.currentTarget;
                          // Forward-seek lockdown: snap back if seeking ahead of max watched time
                          if (v.currentTime > maxWatchedTimeRef.current + 2.0) {
                            v.currentTime = maxWatchedTimeRef.current;
                          } else if (v.currentTime > maxWatchedTimeRef.current) {
                            maxWatchedTimeRef.current = v.currentTime;
                          }
                          if (v.duration) {
                            const pct = Math.min(100, Math.round((v.currentTime / v.duration) * 100));
                            setCurrentVideoPercent(pct);
                          }
                          if (v.duration && v.currentTime >= v.duration * 0.90 && activeContent?.id) {
                            setWatchedVideos(prev => new Set(prev).add(activeContent.id));
                            handleMarkContentComplete(activeContent.id);
                          }
                        }}
                        onRateChange={(e) => {
                          // Speed lockdown: force 1.0x playback speed
                          const v = e.currentTarget;
                          if (v.playbackRate !== 1.0) {
                            v.playbackRate = 1.0;
                          }
                        }}
                        onEnded={() => {
                          if (activeContent?.id) {
                            handleAutoAdvanceNext(activeContent.id);
                          }
                        }}
                      />
                    </div>
                  ) : (activeContent?.videoUrl && isValidYouTubeUrl(activeContent.videoUrl)) ? (
                    <div className="youtube-player-viewport-wrapper">
                      <YouTubePlayer
                        key={activeContent.id || activeContent.videoUrl}
                        videoUrl={activeContent.videoUrl}
                        contentId={activeContent.id}
                        title={activeContent.title}
                        isCompleted={isCurrentItemCompleted || isVideoWatched}
                        completionThreshold={0.90}
                        onProgress={(pct, cur, dur) => {
                          setCurrentVideoPercent(pct);
                          if (pct >= 90 && activeContent?.id) {
                            setWatchedVideos(prev => new Set(prev).add(activeContent.id));
                          }
                          if (activeModule?.id && activeContent?.id) {
                            handlePeriodicVideoProgress(activeContent.id, activeModule.id, pct, cur, dur);
                          }
                        }}
                        onComplete={() => {
                          if (activeContent?.id) {
                            setWatchedVideos(prev => new Set(prev).add(activeContent.id));
                            handleMarkContentComplete(activeContent.id);
                          }
                        }}
                        onEnded={() => {
                          if (activeContent?.id) {
                            handleAutoAdvanceNext(activeContent.id);
                          }
                        }}
                      />
                    </div>
                  ) : (activeContent?.videoUrl) ? (
                    <div className="video-viewport embedded-video-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '36px', textAlign: 'center', background: 'var(--bg-card)' }}>
                      <Play size={44} style={{ color: 'var(--accent-color)', marginBottom: '14px' }} />
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
                        {activeContent.title}
                      </h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: '480px', margin: '0 0 20px 0' }}>
                        This video lecture is linked externally. Click below to open and study the lesson material.
                      </p>
                      <a href={activeContent.videoUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                        <Button variant="primary" leftIcon={<ExternalLink size={16} />}>
                          Open Video Resource
                        </Button>
                      </a>
                    </div>
                  ) : (
                    /* Simulated Video Player */
                    <div className="simulated-video-player" onClick={() => setIsPlaying(!isPlaying)}>
                      {videoTime === 0 && !isPlaying && (
                        <div className="video-poster-overlay">
                          <button className="video-play-trigger-btn">
                            <Play size={32} style={{ fill: '#000', marginLeft: '4px' }} />
                          </button>
                          <p style={{ marginTop: '16px', fontWeight: '600', color: '#fff' }}>Click to Play Lecture Video</p>
                        </div>
                      )}
                      <div className="simulated-placeholder-canvas">
                        <Play size={64} style={{ opacity: isPlaying ? 0.3 : 0.7, color: 'var(--accent-color)', animation: isPlaying ? 'pulse 2s infinite' : 'none' }} />
                        <p>{isPlaying ? 'Playing Lecture Video...' : 'Video Paused'}</p>
                      </div>
                      <div className="video-player-controls-bar" onClick={(e) => e.stopPropagation()}>
                        <div className="video-timeline-slider">
                          <div className="video-timeline-progress" style={{ width: `${videoTime}%` }} />
                        </div>
                        <div className="video-controls-row">
                          <div className="video-controls-left">
                            <button className="video-control-action-btn" onClick={() => setIsPlaying(!isPlaying)}>
                              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                            </button>
                            <button className="video-control-action-btn" onClick={() => setVideoTime(0)}>
                              <RotateCcw size={16} />
                            </button>
                            <span>{Math.floor((videoTime / 100) * 12)}:{(videoTime % 10) * 6} / 12:00</span>
                          </div>
                          <div className="video-controls-right">
                            <Volume2 size={18} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Professional Video Action & Status Bar */}
                  <div className="player-video-action-bar">
                    <div className="player-video-status">
                      <span className={`player-status-badge ${isCurrentItemCompleted || isVideoWatched ? 'completed' : 'in-progress'}`}>
                        {isCurrentItemCompleted || isVideoWatched ? (
                          <>
                            <CheckCircle size={15} /> Completed
                          </>
                        ) : (
                          <>
                            <Clock size={15} /> Lesson in Progress {currentVideoPercent > 0 ? `(${currentVideoPercent}%)` : ''}
                          </>
                        )}
                      </span>
                      <span className="player-video-duration">
                        Duration: {activeContent.duration || '10:00'}
                      </span>
                    </div>

                    <div className="player-video-actions">
                      {!isCurrentItemCompleted && !courseLocked && (
                        (currentVideoPercent >= 90 || isVideoWatched) ? (
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<CheckCircle size={15} />}
                            onClick={() => {
                              if (activeContent?.id) {
                                handleAutoAdvanceNext(activeContent.id);
                              }
                            }}
                          >
                            Mark Video Completed & Next
                          </Button>
                        ) : (
                          <div style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            padding: '6px 14px', 
                            background: 'var(--bg-input)', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '6px', 
                            fontSize: '0.82rem', 
                            color: 'var(--text-secondary)',
                            fontWeight: 600
                          }}>
                            <Lock size={14} style={{ color: 'var(--accent-color)' }} />
                            <span>Watched: <strong style={{ color: 'var(--text-primary)' }}>{currentVideoPercent}%</strong> (90% required to complete)</span>
                          </div>
                        )
                      )}
                      {activeContent?.videoUrl && isValidYouTubeUrl(activeContent.videoUrl) && (isCurrentItemCompleted || isVideoWatched) && (
                        <a 
                          href={buildYouTubeWatchUrl(activeContent.videoUrl)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ textDecoration: 'none' }}
                        >
                          <Button variant="outline" size="sm" rightIcon={<ExternalLink size={14} />}>
                            Watch on YouTube
                          </Button>
                        </a>
                      )}
                      {activeContent?.videoUrl && !isValidYouTubeUrl(activeContent.videoUrl) && !activeContent.videoUrl.startsWith('/uploads/') && (
                        <a 
                          href={activeContent.videoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ textDecoration: 'none' }}
                        >
                          <Button variant="outline" size="sm" rightIcon={<ExternalLink size={14} />}>
                            Open Video Link
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeContent?.type === 'document' && (
                <div className="reading-mode-viewer">
                  <div className="reading-content-card course-reading-content">
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '14px', color: 'var(--text-primary)' }}>
                      {activeContent.title}
                    </h3>
                    {activeContent.description ? (
                      <CourseraRichText content={activeContent.description} />
                    ) : (
                      <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                        Study the reading guide and reference instructions for this topic. Once you have finished reading, click below to mark this lesson completed.
                      </p>
                    )}

                    {/* Render Embedded Image if available */}
                    {activeContent.videoUrl && (activeContent.videoUrl.startsWith('/uploads/') || activeContent.videoUrl.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)) && (
                      <div className="embedded-image-wrapper" style={{ marginTop: '20px' }}>
                        <img 
                          src={activeContent.videoUrl} 
                          alt={activeContent.title} 
                          className="embedded-image-element"
                          style={{ maxWidth: '100%', borderRadius: '8px' }}
                        />
                      </div>
                    )}

                    {/* External Link Resource Button */}
                    {activeContent.videoUrl && !activeContent.videoUrl.startsWith('/uploads/') && !activeContent.videoUrl.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i) && (
                      <div style={{ marginTop: '20px' }}>
                        <a href={activeContent.videoUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block' }}>
                          <Button variant="primary" leftIcon={<FileText size={18} />}>
                            Open External Reference Link
                          </Button>
                        </a>
                      </div>
                    )}

                    {!isCurrentItemCompleted && !courseLocked && (
                      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                        <Button 
                          variant="primary" 
                          leftIcon={<CheckCircle size={16} />}
                          onClick={() => handleMarkContentComplete(activeContent.id)}
                        >
                          Mark Lesson Completed
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeContent?.type === 'quiz' && (
                <div className="quiz-player-panel">
                  <div className="quiz-content-card">
                    <span className="quiz-badge">Module Assessment</span>
                    
                    {!quizSubmitted ? (
                      (() => {
                        const questionsList = getActiveQuizQuestions();
                        const currentQ = questionsList[currentQuizQuestionIndex];
                        
                        if (!currentQ) return <p>No questions configured for this assessment.</p>;

                        return (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                              <span>Question {currentQuizQuestionIndex + 1} of {questionsList.length}</span>
                              <span style={{ textTransform: 'uppercase', color: 'var(--accent-color)', fontWeight: '800' }}>{currentQ.questionType || 'mcq'}</span>
                            </div>
                            
                            <h3 className="quiz-question-heading">
                              {currentQ.question}
                            </h3>
                            
                            {currentQ.questionType === 'notes' ? (
                              <div style={{ marginBottom: '20px' }}>
                                <textarea
                                  className="form-input-styled animate-fade-in"
                                  placeholder="Type your descriptive response or summary notes here..."
                                  style={{ width: '100%', minHeight: '120px', resize: 'vertical', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
                                  value={quizAnswers[currentQuizQuestionIndex] || ''}
                                  onChange={(e) => handleSelectQuizAnswer(currentQuizQuestionIndex, e.target.value)}
                                />
                              </div>
                            ) : (
                              <div className="quiz-options-group animate-fade-in">
                                {currentQ.options.map((opt: string, optIdx: number) => {
                                  const letter = String.fromCharCode(65 + optIdx);
                                  
                                  let isSelected = false;
                                  if (currentQ.questionType === 'msq') {
                                    try {
                                      const selected = JSON.parse(quizAnswers[currentQuizQuestionIndex] || '[]');
                                      isSelected = selected.includes(letter);
                                    } catch {
                                      isSelected = false;
                                    }
                                  } else {
                                    isSelected = quizAnswers[currentQuizQuestionIndex] === letter;
                                  }

                                  return (
                                    <button 
                                      key={optIdx}
                                      className={`quiz-option-button ${isSelected ? 'selected' : ''}`}
                                      onClick={() => {
                                        if (currentQ.questionType === 'msq') {
                                          let selected: string[] = [];
                                          try {
                                            selected = JSON.parse(quizAnswers[currentQuizQuestionIndex] || '[]');
                                          } catch {
                                            selected = [];
                                          }
                                          let nextSelected = [...selected];
                                          if (isSelected) {
                                            nextSelected = nextSelected.filter(l => l !== letter);
                                          } else {
                                            nextSelected.push(letter);
                                          }
                                          handleSelectQuizAnswer(currentQuizQuestionIndex, JSON.stringify(nextSelected));
                                        } else {
                                          handleSelectQuizAnswer(currentQuizQuestionIndex, letter);
                                        }
                                      }}
                                    >
                                      <span className="quiz-option-letter">{letter}</span>
                                      <span>{opt}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {(() => {
                              const ans = quizAnswers[currentQuizQuestionIndex];
                              let isQuestionAnswered = false;
                              if (ans) {
                                if (currentQ.questionType === 'msq') {
                                  try {
                                    const parsed = JSON.parse(ans);
                                    isQuestionAnswered = parsed && parsed.length > 0;
                                  } catch {
                                    isQuestionAnswered = false;
                                  }
                                } else {
                                  isQuestionAnswered = ans.trim().length > 0;
                                }
                              }

                              return (
                                <div style={{ display: 'flex', gap: '12px' }}>
                                  {currentQuizQuestionIndex > 0 && (
                                    <Button 
                                      variant="outline" 
                                      onClick={() => setCurrentQuizQuestionIndex(currentQuizQuestionIndex - 1)}
                                      style={{ flex: 1, padding: '12px' }}
                                    >
                                      Back
                                    </Button>
                                  )}
                                  
                                  {currentQuizQuestionIndex < questionsList.length - 1 ? (
                                    <Button 
                                      variant="primary" 
                                      disabled={!isQuestionAnswered}
                                      onClick={() => setCurrentQuizQuestionIndex(currentQuizQuestionIndex + 1)}
                                      style={{ flex: 1, padding: '12px' }}
                                    >
                                      Next Question
                                    </Button>
                                  ) : (
                                    <Button 
                                      variant="primary" 
                                      disabled={!isQuestionAnswered}
                                      onClick={handleSubmitQuiz}
                                      style={{ flex: 1, padding: '12px' }}
                                    >
                                      Submit Assessment
                                    </Button>
                                  )}
                                </div>
                              );
                            })()}
                          </>
                        );
                      })()
                    ) : (
                      <div className="quiz-success-pane">
                        <div className="quiz-success-badge-glow">
                          <Award size={40} />
                        </div>
                        <h3 style={{ fontSize: '1.4rem', color: '#fff', margin: '0 0 10px 0' }}>
                          {quizScore >= 66 ? 'Passed! Module Completed' : 'Failed. Try Again'}
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                          Your Score: {quizScore}% (Passing requirement: 66%)
                        </p>
                        {quizScore >= 66 ? (
                          <>
                            <div className="form-info-banner" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid #10b981', width: '100%', marginBottom: '16px' }}>
                              <span>Status: Completed. Next module is unlocked!</span>
                            </div>
                            {activeContentIndex === flatContents.length - 1 ? (
                              courseLocked ? (
                                <div style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.88rem', marginTop: '16px', fontWeight: 700 }}>
                                  Course is locked. You are viewing it in Review Mode and cannot complete it.
                                </div>
                              ) : (
                                <Button variant="primary" onClick={handleFinalCompleteCourse} style={{ width: '100%', padding: '14px' }}>
                                  Complete Course & Claim Certificate
                                </Button>
                              )
                            ) : (
                              <Button variant="primary" onClick={handleNextSection} style={{ width: '100%', padding: '14px' }}>
                                Proceed to Next Module
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button variant="outline" onClick={() => { setQuizSubmitted(false); setCurrentQuizQuestionIndex(0); setQuizAnswers({}); }} style={{ width: '100%', padding: '14px' }}>
                            Retry Assessment
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Under-Video Navigation Controls Bar */}
            <div className="player-under-video-controls">
              <Button 
                variant="outline" 
                onClick={handlePrevSection}
                disabled={activeContentIndex === 0}
                leftIcon={<ArrowLeft size={16} />}
              >
                Previous Lesson
              </Button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                <span>Lesson {activeContentIndex + 1} of {flatContents.length}</span>
              </div>

              {activeContentIndex === flatContents.length - 1 ? (
                courseLocked ? (
                  <Button variant="outline" disabled>
                    Course Completed
                  </Button>
                ) : activeContent?.type === 'quiz' && !completedContentIds.has(activeContent?.id) ? (
                  <Button 
                    variant="primary" 
                    disabled={true}
                    title="Please complete the assessment above to finish the course"
                  >
                    Complete Assessment
                  </Button>
                ) : (
                  <Button 
                    variant="primary" 
                    onClick={async () => {
                      if (activeContent?.id && !completedContentIds.has(activeContent.id)) {
                        await handleMarkContentComplete(activeContent.id);
                      }
                      await handleFinalCompleteCourse();
                    }}
                    rightIcon={<CheckCircle size={16} />}
                  >
                    Complete Course
                  </Button>
                )
              ) : (
                <Button 
                  variant="primary" 
                  onClick={handleNextSection}
                  disabled={activeContent?.type === 'video' && !isCurrentItemCompleted && !watchedVideos.has(activeContent?.id) && currentVideoPercent < 90 && !courseLocked}
                  rightIcon={activeContent?.type === 'video' && !isCurrentItemCompleted && !watchedVideos.has(activeContent?.id) && currentVideoPercent < 90 && !courseLocked ? <Lock size={14} /> : <ArrowRight size={16} />}
                  title={activeContent?.type === 'video' && !isCurrentItemCompleted && !watchedVideos.has(activeContent?.id) && currentVideoPercent < 90 && !courseLocked ? `Watch at least 90% to unlock (${currentVideoPercent}% watched)` : undefined}
                >
                  {activeContent?.type === 'video' && !isCurrentItemCompleted && !watchedVideos.has(activeContent?.id) && currentVideoPercent < 90 && !courseLocked
                    ? `Next Lesson (${currentVideoPercent}% / 90%)`
                    : 'Next Lesson'
                  }
                </Button>
              )}
            </div>

            {/* Tabbed Content Area Under Video: Overview, Notes & Description, Resources */}
            <div className="player-tabs-card">
              <div className="player-tabs-header">
                <button 
                  className={`player-tab-nav-btn ${playerTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setPlayerTab('overview')}
                >
                  Overview
                </button>
                <button 
                  className={`player-tab-nav-btn ${playerTab === 'notes' ? 'active' : ''}`}
                  onClick={() => setPlayerTab('notes')}
                >
                  Notes & Description
                </button>
                <button 
                  className={`player-tab-nav-btn ${playerTab === 'resources' ? 'active' : ''}`}
                  onClick={() => setPlayerTab('resources')}
                >
                  Resources
                </button>
              </div>

              <div className="player-tab-body">
                {playerTab === 'overview' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      About this Lesson: {activeContent?.title}
                    </h4>
                    {activeContent?.description ? (
                      <CourseraRichText content={activeContent.description} />
                    ) : activeModule?.description ? (
                      <CourseraRichText content={activeModule.description} />
                    ) : (
                      <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: '1.6' }}>
                        This lesson is part of <strong>{activeModule?.title}</strong>. Follow through the lecture presentation and complete all assessments to advance through the curriculum.
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
                      <div style={{ padding: '8px 14px', background: 'var(--bg-input)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <strong>Module:</strong> {activeModule?.title}
                      </div>
                      <div style={{ padding: '8px 14px', background: 'var(--bg-input)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <strong>Duration:</strong> {activeContent?.duration || '10:00'}
                      </div>
                      <div style={{ padding: '8px 14px', background: 'var(--bg-input)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <strong>Type:</strong> <span style={{ textTransform: 'capitalize' }}>{activeContent?.type}</span>
                      </div>
                    </div>
                  </div>
                )}

                {playerTab === 'notes' && (
                  <div className="notes-tab-container">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Take personal notes for this lesson. Notes are synced to your database account.
                      </p>
                      {notesSavedFeedback && (
                        <span style={{ color: '#10b981', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Check size={14} /> Notes saved!
                        </span>
                      )}
                    </div>
                    <textarea
                      className="notes-textarea-styled"
                      placeholder="Take your personal notes here... Key takeaways, definitions, and action points."
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                    />
                    <div className="notes-actions-bar">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleDownloadNotes}
                        leftIcon={<Download size={14} />}
                      >
                        Download Notes (.txt)
                      </Button>
                      <Button 
                        variant="primary" 
                        size="sm"
                        onClick={async () => {
                          await handleSaveNotes();
                          setNotesSavedFeedback(true);
                          setTimeout(() => setNotesSavedFeedback(false), 2500);
                        }}
                        leftIcon={<Save size={14} />}
                      >
                        Save Notes
                      </Button>
                    </div>
                  </div>
                )}

                {playerTab === 'resources' && (
                  <div className="resources-list-group">
                    {activeContent?.videoUrl && (
                      <div className="resource-item-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <FileText size={18} style={{ color: 'var(--accent-color)' }} />
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Lesson Video Link / Resource</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{activeContent.videoUrl}</div>
                          </div>
                        </div>
                        <a href={activeContent.videoUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" rightIcon={<ExternalLink size={14} />}>
                            Open Link
                          </Button>
                        </a>
                      </div>
                    )}
                    <div className="resource-item-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <BookOpen size={18} style={{ color: 'var(--accent-color)' }} />
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Course Curriculum & Syllabus</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Review complete learning path</div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setShowLanding(true)}>
                        View Full Syllabus
                      </Button>
                    </div>

                    <div className="resource-item-row" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Play size={18} style={{ color: 'var(--text-secondary)' }} />
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Test Local Video File (Preview)</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Load a video file from your computer for playback preview</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <label className="btn-outline-sm" style={{ 
                          cursor: 'pointer',
                          padding: '6px 12px',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          background: 'var(--bg-input)',
                          color: 'var(--text-primary)',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}>
                          <span>Choose Video File</span>
                          <input 
                            type="file" 
                            accept="video/*" 
                            onChange={handleLocalVideoUpload} 
                            style={{ display: 'none' }} 
                          />
                        </label>
                        {isCustomVideo && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => { setIsCustomVideo(false); setCustomVideoUrl(''); }}
                          >
                            Reset
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Course Outline Sidebar */}
          <aside className="player-outline-sidebar">
            <div className="outline-sidebar-header">
              <div>
                <h3>Course Outline</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {modules.length} Modules &bull; {flatContents.length} Lessons
                </span>
              </div>
              <span className="outline-progress-badge">
                {completedContentIds.size} / {flatContents.length} Done
              </span>
            </div>

            <div className="outline-modules-scroll-area">
              {modules.map((mod, modIdx) => {
                const isExpanded = expandedModules[mod.id] !== false;
                const isUnlocked = isModuleUnlocked(mod.id);
                const isModActive = activeModule?.id === mod.id;
                const completedInMod = mod.contents.filter(c => completedContentIds.has(c.id)).length;
                const allInModCompleted = mod.contents.length > 0 && completedInMod === mod.contents.length;

                return (
                  <div key={mod.id} className={`outline-module-card ${isModActive ? 'active-module' : ''}`}>
                    <button 
                      className="outline-module-header"
                      onClick={() => isUnlocked && setExpandedModules(prev => ({ ...prev, [mod.id]: !isExpanded }))}
                      disabled={!isUnlocked}
                      title={!isUnlocked ? 'Complete previous module to unlock' : undefined}
                    >
                      <div className="outline-module-title-wrap">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {!isUnlocked ? (
                            <Lock size={14} style={{ color: 'var(--text-secondary)' }} />
                          ) : allInModCompleted ? (
                            <CheckCircle size={14} style={{ color: '#10b981' }} />
                          ) : (
                            <Unlock size={14} style={{ color: 'var(--accent-color)' }} />
                          )}
                          <span className="outline-module-title">
                            Module {modIdx + 1}: {mod.title.replace(/^module\s*\d+\s*:\s*/i, '')}
                          </span>
                        </div>
                        <span className="outline-module-duration">
                          {completedInMod}/{mod.contents.length} completed &bull; {mod.tier || 'all levels'}
                        </span>
                      </div>
                      {isUnlocked && (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
                    </button>

                    {isUnlocked && isExpanded && (
                      <div className="outline-lessons-list">
                        {mod.contents.map((item) => {
                          const indexInFlat = flatContents.findIndex(c => c.id === item.id);
                          const isItemActive = activeContentIndex === indexInFlat;
                          const isItemCompleted = completedContentIds.has(item.id);
                          const itemUnlocked = isItemUnlocked(item.id) || courseLocked;

                          return (
                            <div 
                              key={item.id}
                              className={`outline-lesson-item ${isItemActive ? 'active-lesson' : ''} ${!itemUnlocked ? 'item-locked' : ''}`}
                              style={{ opacity: itemUnlocked ? 1 : 0.65, cursor: itemUnlocked ? 'pointer' : 'not-allowed' }}
                              onClick={() => {
                                if (itemUnlocked) {
                                  setActiveContentIndex(indexInFlat);
                                } else {
                                  alert('This lesson is locked. Complete previous lessons and watch required videos first.');
                                }
                              }}
                            >
                              <div className="outline-lesson-left">
                                <div className={`outline-lesson-check ${isItemCompleted ? 'completed' : ''}`}>
                                  {!itemUnlocked ? (
                                    <Lock size={10} style={{ color: 'var(--text-secondary)' }} />
                                  ) : isItemCompleted ? (
                                    <Check size={11} strokeWidth={3} />
                                  ) : null}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                  {item.type === 'video' && <Play size={12} style={{ color: isItemActive ? 'var(--accent-color)' : 'var(--text-secondary)', flexShrink: 0 }} />}
                                  {item.type === 'document' && <BookOpen size={12} style={{ color: isItemActive ? 'var(--accent-color)' : 'var(--text-secondary)', flexShrink: 0 }} />}
                                  {item.type === 'quiz' && <HelpCircle size={12} style={{ color: isItemActive ? 'var(--accent-color)' : 'var(--text-secondary)', flexShrink: 0 }} />}
                                  <span className="outline-lesson-title">{item.title}</span>
                                </div>
                              </div>
                              <span className="outline-lesson-duration">{item.duration}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      )}

      {showTimeUpModal && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="modal-content glass-panel" style={{
            background: 'var(--bg-card)',
            padding: '40px',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--border-color)',
            maxWidth: '450px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)'
          }}>
            <Lock size={48} style={{ color: 'var(--neon-coral)', marginBottom: '20px' }} />
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '12px', color: '#fff' }}>Time Up!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.6', marginBottom: '24px' }}>
              The deadline for completing this course has passed. Access is now locked. Please contact your administrator to request an extension.
            </p>
            <Button variant="primary" onClick={() => setShowTimeUpModal(false)} style={{ width: '100%' }}>
              Close & Review
            </Button>
          </div>
        </div>
      )}
      {autoAdvanceToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: '#ffffff',
          padding: '12px 22px',
          borderRadius: '10px',
          fontWeight: 700,
          fontSize: '0.92rem',
          boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 99999
        }}>
          <CheckCircle size={18} />
          <span>{autoAdvanceToast}</span>
        </div>
      )}
    </div>
  );
};
