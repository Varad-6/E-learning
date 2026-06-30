import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Play, Pause, Check, Volume2, RotateCcw,
  BookOpen, ChevronDown, ChevronRight, HelpCircle, Award, 
  FileText, Download, Menu, X, Lock, Unlock, Sun, Moon
} from 'lucide-react';
import { Button } from '../../components/Button/Button';
import { apiCall } from '../../services/api';
import { ThemeToggle } from '../../components/ThemeToggle/ThemeToggle';
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
  contents: ContentItem[];
}

export const CoursePlayer: React.FC = () => {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const navigate = useNavigate();

  // Core API states
  const [enrollment, setEnrollment] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  // Playback & UI states
  const [activeContentIndex, setActiveContentIndex] = useState(0);
  const [completedContentIds, setCompletedContentIds] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<{ [key: string]: boolean }>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [notesText, setNotesText] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Custom Video Upload State
  const [customVideoUrl, setCustomVideoUrl] = useState<string>('');
  const [isCustomVideo, setIsCustomVideo] = useState(false);
  
  // Quiz states
  const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: string }>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [currentQuizQuestionIndex, setCurrentQuizQuestionIndex] = useState(0);

  // Default modules structure if none exist in the database for the course
  const defaultModules: Module[] = [
    {
      id: 'm1',
      title: 'Module 1: Continuous Improvement Philosophy',
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
        },
        { 
          id: 'c1_quiz', 
          title: '1.3 Philosophy Assessment', 
          type: 'quiz', 
          duration: '3 questions',
          subtitle: 'Module 1 Core MCQ Exam',
          description: 'Complete the multiple-choice assessment to prove module mastery and unlock the next module.'
        }
      ]
    },
    {
      id: 'm2',
      title: 'Module 2: Database Persistence Pipelines',
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
        },
        { 
          id: 'c2_quiz', 
          title: '2.3 Database Assessment', 
          type: 'quiz', 
          duration: '3 questions',
          subtitle: 'Module 2 DB MCQ Exam',
          description: 'Complete the multiple-choice assessment to prove module mastery and unlock the next module.'
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
        // 1. Fetch enrollment
        const enrollRes = await apiCall(`/api/enrollments/${enrollmentId}`);
        if (!enrollRes.ok) {
          throw new Error('Enrollment not found.');
        }
        const enrollData = await enrollRes.json();
        setEnrollment(enrollData);

        // 2. Fetch course
        const courseRes = await apiCall(`/api/courses/${enrollData.course_id}`);
        if (courseRes.ok) {
          const courseData = await courseRes.json();
          setCourse(courseData);
        }

        // 3. Fetch modules from database
        const modulesRes = await apiCall(`/api/courses/${enrollData.course_id}/modules`);
        let fetchedModules: Module[] = [];
        if (modulesRes.ok) {
          const data = await modulesRes.json();
          if (data && data.length > 0) {
            fetchedModules = data;
          }
        }
        
        const finalModules = fetchedModules.length > 0 ? fetchedModules : defaultModules;

        // Map modules to player structure, loading content blocks from localStorage if present
        const localBlocksMap = localStorage.getItem('creator_module_content');
        const blocksMap = localBlocksMap ? JSON.parse(localBlocksMap) : {};
        const localQuizzesMap = localStorage.getItem('creator_module_quizzes');
        const quizzesMap = localQuizzesMap ? JSON.parse(localQuizzesMap) : {};

        const mappedModules: Module[] = finalModules.map((mod: any, index: number) => {
          const moduleBlocks = blocksMap[mod.id] || [];
          let contents: ContentItem[] = [];

          if (moduleBlocks.length > 0) {
            // Generate content list dynamically from creator blocks
            let currentTitle = "";
            let currentSubtitle = "";

            moduleBlocks.forEach((block: any) => {
              if (block.type === 'title') {
                currentTitle = block.value;
              } else if (block.type === 'subtitle') {
                currentSubtitle = block.value;
              } else if (block.type === 'text') {
                contents.push({
                  id: block.id,
                  title: currentTitle || `Lecture ${index + 1}.${contents.length + 1}`,
                  type: 'document',
                  duration: '5 min read',
                  subtitle: currentSubtitle || `Reading lesson`,
                  description: block.value
                });
                currentTitle = "";
                currentSubtitle = "";
              } else if (block.type === 'youtube' || block.type === 'video') {
                contents.push({
                  id: block.id,
                  title: currentTitle || `Video Lecture ${index + 1}.${contents.length + 1}`,
                  type: 'video',
                  duration: '10:00',
                  subtitle: currentSubtitle || "Media presentation",
                  description: "Watch the video presentation explaining this section's topic.",
                  videoUrl: block.value
                });
                currentTitle = "";
                currentSubtitle = "";
              } else if (block.type === 'blog' || block.type === 'website' || block.type === 'attachment') {
                const labelText = block.type === 'attachment' ? (block.label || 'Download Attachment') : `Visit ${block.type.toUpperCase()}`;
                contents.push({
                  id: block.id,
                  title: currentTitle || `${block.type.toUpperCase()} Reference ${index + 1}.${contents.length + 1}`,
                  type: 'document',
                  duration: block.type === 'attachment' ? 'Download' : 'Web Link',
                  subtitle: currentSubtitle || `External link resources`,
                  description: `This section links to an external ${block.type}: ${labelText}. Please click the button below to study the resources.`,
                  videoUrl: block.value
                });
                currentTitle = "";
                currentSubtitle = "";
              } else if (block.type === 'image') {
                contents.push({
                  id: block.id,
                  title: currentTitle || `Visual Resource`,
                  type: 'document',
                  duration: 'Image',
                  subtitle: currentSubtitle || `Image attachment`,
                  description: `Review the diagram or illustration below.`,
                  videoUrl: block.value
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

          // Append Quiz slide (MCQ Assessment)
          const moduleQuizzes = quizzesMap[mod.id] || [];
          contents.push({
            id: `quiz_${mod.id}`,
            title: `${index + 1}.3 Module Assessment`,
            type: 'quiz',
            duration: moduleQuizzes.length > 0 ? `${moduleQuizzes.length} Questions` : '3 Questions',
            subtitle: `Final Test on ${mod.title}`,
            description: 'Complete the multiple-choice assessment to prove module mastery.'
          });

          return {
            id: mod.id,
            title: mod.title.includes('Module') ? mod.title : `Module ${index + 1}: ${mod.title}`,
            contents
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

  // Flattened content list for linear next/prev traversal
  const flatContents = modules.reduce<ContentItem[]>((acc, mod) => [...acc, ...mod.contents], []);
  const activeContent = flatContents[activeContentIndex];

  // Load and Save notes from localStorage specific to active content
  useEffect(() => {
    if (course?.id && activeContent?.id) {
      const savedNotes = localStorage.getItem(`kiezen_notes_${course.id}_${activeContent.id}`);
      setNotesText(savedNotes || '');
    }
    // Reset states on content index change
    setIsPlaying(false);
    setVideoTime(0);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setCurrentQuizQuestionIndex(0);
  }, [course, activeContentIndex]);

  const handleSaveNotes = () => {
    if (course?.id && activeContent?.id) {
      localStorage.setItem(`kiezen_notes_${course.id}_${activeContent.id}`, notesText);
      alert('Notes saved successfully!');
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
    element.download = `Kiezen_Notes_${course?.course_code || 'Course'}_Module_${Math.floor(activeContentIndex / 3) + 1}_Step_${(activeContentIndex % 3) + 1}.txt`;
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
            handleMarkContentComplete(activeContent.id);
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

  // Completion lock helpers
  const isModuleCompleted = (mod: Module) => {
    return mod.contents.every(item => completedContentIds.has(item.id));
  };

  const isModuleUnlocked = (modId: string) => {
    const modIndex = modules.findIndex(m => m.id === modId);
    if (modIndex <= 0) return true; // First module is always unlocked
    
    // Check if the immediately preceding module is completed
    return isModuleCompleted(modules[modIndex - 1]);
  };

  const isItemUnlocked = (itemId: string) => {
    const parentMod = modules.find(m => m.contents.some(item => item.id === itemId));
    if (!parentMod) return true;
    return isModuleUnlocked(parentMod.id);
  };

  const handleMarkContentComplete = async (contentId: string) => {
    if (completedContentIds.has(contentId)) return;

    const updated = new Set(completedContentIds);
    updated.add(contentId);
    setCompletedContentIds(updated);

    // Save progress to database
    const progressPercent = Math.round((updated.size / flatContents.length) * 100);
    try {
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
    if (currentItem && !completedContentIds.has(currentItem.id)) {
      await handleMarkContentComplete(currentItem.id);
    }

    if (activeContentIndex < flatContents.length - 1) {
      const nextIndex = activeContentIndex + 1;
      const nextItem = flatContents[nextIndex];
      if (isItemUnlocked(nextItem.id)) {
        setActiveContentIndex(nextIndex);
      } else {
        alert('This module is locked. You must complete the current module assessment first!');
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
    const localQuizzesMap = localStorage.getItem('creator_module_quizzes');
    const quizzesMap = localQuizzesMap ? JSON.parse(localQuizzesMap) : {};
    const moduleQuizzes = quizzesMap[activeModule?.id] || [];
    
    if (moduleQuizzes.length > 0) {
      return moduleQuizzes.map((q: any) => ({
        question: q.question,
        options: q.options,
        correctAnswer: String.fromCharCode(65 + q.correctOptionIndex)
      }));
    }
    
    // Default fallback questions
    return [
      {
        question: "Which core philosophy or pattern ensures continuous compliance in enterprise systems?",
        options: ["Rigid release gating and automated testing checks", "Ad-hoc updates without version control logs", "Manual regression verification cycles only"],
        correctAnswer: "A"
      },
      {
        question: "What tool is used to manage database migrations in this project?",
        options: ["Alembic", "Docker Compose", "Pip"],
        correctAnswer: "A"
      },
      {
        question: "In FastAPI, what dependency wrapper enforces Role-Based Access Control?",
        options: ["RequireRoles", "get_db", "verify_password"],
        correctAnswer: "A"
      }
    ];
  };

  const handleSubmitQuiz = () => {
    const questionsList = getActiveQuizQuestions();
    let correctCount = 0;
    
    questionsList.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctAnswer) {
        correctCount++;
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

  if (loading) {
    return (
      <div className="course-player-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
        <p style={{ marginTop: '16px', color: '#9ca3af' }}>Initializing Course Player workspace...</p>
      </div>
    );
  }

  const youtubeId = activeContent?.videoUrl ? getYouTubeId(activeContent.videoUrl) : null;
  const currentModuleIndex = Math.floor(activeContentIndex / 3);
  const activeModule = modules[currentModuleIndex] || modules[0];

  return (
    <div className="course-player-container">
      {/* Drawer Sidebar for curriculum */}
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
              {modules.map((mod) => {
                const isExpanded = expandedModules[mod.id];
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
                          <h4>{mod.title}</h4>
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
                          
                          return (
                            <div 
                              key={item.id} 
                              className={`content-item-row ${isItemActive ? 'active' : ''}`}
                              onClick={() => {
                                setActiveContentIndex(indexInFlat);
                                setIsDrawerOpen(false);
                              }}
                            >
                              <div className={`content-item-checkbox ${isItemCompleted ? 'checked' : ''}`}>
                                {isItemCompleted && <Check size={12} />}
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
            <Menu size={24} />
          </button>
          <button className="back-dashboard-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Back
          </button>
          <div className="player-course-title-group">
            <span>{course?.course_code || 'KZN-101'}</span>
            <h2>{course?.title || 'Course Player'}</h2>
          </div>
        </div>

        <div className="player-header-right">
          <div className="player-header-progress">
            <span style={{ fontSize: '0.78rem', fontWeight: 'bold' }}>
              Progress: {enrollment?.progress_percent || 0}%
            </span>
            <div className="player-progress-bar-container">
              <div className="player-progress-bar-fill" style={{ width: `${enrollment?.progress_percent || 0}%` }}></div>
            </div>
          </div>
          {/* Universal theme toggle */}
          <ThemeToggle />
        </div>
      </header>

      {/* Main Split Grid */}
      <div className="player-layout-grid">
        {/* Left Side: Viewer & Progression (65%) */}
        <div className="player-main-content">
          <div className="study-content-scroll">
            <div className="lesson-heading-container">
              <span className="lesson-module-tag">{activeModule?.title}</span>
              <h2 className="lesson-title">{activeContent?.title}</h2>
              {activeContent?.subtitle && <h3 className="lesson-subtitle">{activeContent.subtitle}</h3>}
              {activeContent?.description && <p className="lesson-description">{activeContent.description}</p>}
            </div>

            {/* Content Media Area */}
            <div className="media-viewer-frame">
              {activeContent?.type === 'video' && (
                <div className="video-player-workspace">
                  {/* YouTube Embed Player */}
                  {youtubeId && !isCustomVideo ? (
                    <div className="video-viewport">
                      <iframe
                        src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1`}
                        title={activeContent.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                      <div className="video-url-display">
                        <span>Video Link: </span>
                        <a href={activeContent.videoUrl} target="_blank" rel="noreferrer">{activeContent.videoUrl}</a>
                      </div>
                    </div>
                  ) : isCustomVideo ? (
                    <div className="video-viewport">
                      <video
                        src={customVideoUrl}
                        controls
                        autoPlay={isPlaying}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                      />
                    </div>
                  ) : (
                    /* Simulated Video Player */
                    <div className="simulated-video-player" onClick={() => setIsPlaying(!isPlaying)}>
                      {videoTime === 0 && !isPlaying && (
                        <div className="video-poster-overlay">
                          <button className="video-play-trigger-btn">
                            <Play size={32} style={{ fill: '#000', marginLeft: '4px' }} />
                          </button>
                          <p style={{ marginTop: '16px', fontWeight: '600', color: '#fff' }}>Click to Play Simulated Video</p>
                        </div>
                      )}
                      <div className="simulated-placeholder-canvas">
                        <Play size={64} style={{ opacity: isPlaying ? 0.3 : 0.7, color: 'var(--accent-color)', animation: isPlaying ? 'pulse 2s infinite' : 'none' }} />
                        <p>{isPlaying ? 'Simulating Lecture Video Playback...' : 'Video Paused'}</p>
                      </div>
                      <div className="video-player-controls-bar" onClick={(e) => e.stopPropagation()}>
                        <div className="video-timeline-slider" onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1) * 100;
                          setVideoTime(percent);
                        }}>
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

                  {/* Video Upload Control Panel */}
                  <div className="video-upload-panel glass-panel">
                    <label className="video-upload-button-styled">
                      <span>Upload Local Video File</span>
                      <input 
                        type="file" 
                        accept="video/*" 
                        onChange={handleLocalVideoUpload} 
                        style={{ display: 'none' }} 
                      />
                    </label>
                    {isCustomVideo && (
                      <button className="reset-video-btn" onClick={() => { setIsCustomVideo(false); setCustomVideoUrl(''); }}>
                        Reset to Lecture Link
                      </button>
                    )}
                  </div>
                </div>
              )}

              {activeContent?.type === 'document' && (
                <div className="reading-mode-viewer">
                  <div className="reading-content-card">
                    <h3>Course Companion Study Guide</h3>
                    <p>Welcome to the theoretical review section. Keeping a solid conceptual grasp on optimization methods, build triggers, and data validation rules ensures high compliance and system stability.</p>
                    <p>Use the **Study Notes** workspace on the right side of the screen to write down your personal summaries. You can save notes locally or download them to your PC for offline preparation.</p>
                    
                    {/* Render Image attachment preview if relevant */}
                    {activeContent.id.includes('image') || (activeContent.videoUrl && (
                      activeContent.videoUrl.endsWith('.png') || 
                      activeContent.videoUrl.endsWith('.jpg') || 
                      activeContent.videoUrl.endsWith('.jpeg') || 
                      activeContent.videoUrl.endsWith('.gif')
                    )) ? (
                      <div style={{ marginTop: '20px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        <img src={activeContent.videoUrl} alt={activeContent.title} style={{ width: '100%', display: 'block' }} />
                      </div>
                    ) : null}

                    {/* Render Reference/Attachment Link button if url is stored in videoUrl */}
                    {activeContent.videoUrl && !activeContent.videoUrl.endsWith('.png') && !activeContent.videoUrl.endsWith('.jpg') && !activeContent.videoUrl.endsWith('.jpeg') && !activeContent.videoUrl.endsWith('.gif') && (
                      <div style={{ marginTop: '24px' }}>
                        <a href={activeContent.videoUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block' }}>
                          <Button variant="primary" leftIcon={<FileText size={18} />}>
                            Open Reference Link / Attachment
                          </Button>
                        </a>
                      </div>
                    )}
                    
                    <p style={{ marginTop: '24px' }}>Once you are ready, click the **Skip / Next** button at the bottom right to advance to the next step of the module syllabus.</p>
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
                        
                        if (!currentQ) return <p>No questions configured.</p>;

                        return (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                              <span>Question {currentQuizQuestionIndex + 1} of {questionsList.length}</span>
                              <span>Points: 1</span>
                            </div>
                            
                            <h3 className="quiz-question-heading">
                              {currentQ.question}
                            </h3>
                            
                            <div className="quiz-options-group">
                              {currentQ.options.map((opt: string, optIdx: number) => {
                                const letter = String.fromCharCode(65 + optIdx);
                                const isSelected = quizAnswers[currentQuizQuestionIndex] === letter;
                                return (
                                  <button 
                                    key={optIdx}
                                    className={`quiz-option-button ${isSelected ? 'selected' : ''}`}
                                    onClick={() => handleSelectQuizAnswer(currentQuizQuestionIndex, letter)}
                                  >
                                    <span className="quiz-option-letter">{letter}</span>
                                    <span>{opt}</span>
                                  </button>
                                );
                              })}
                            </div>

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
                                  disabled={!quizAnswers[currentQuizQuestionIndex]}
                                  onClick={() => setCurrentQuizQuestionIndex(currentQuizQuestionIndex + 1)}
                                  style={{ flex: 1, padding: '12px' }}
                                >
                                  Next Question
                                </Button>
                              ) : (
                                <Button 
                                  variant="primary" 
                                  disabled={!quizAnswers[currentQuizQuestionIndex]}
                                  onClick={handleSubmitQuiz}
                                  style={{ flex: 1, padding: '12px' }}
                                >
                                  Submit Assessment
                                </Button>
                              )}
                            </div>
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
                          Your Score: {quizScore}% (Passing requirements: 66%)
                        </p>
                        {quizScore >= 66 ? (
                          <>
                            <div className="form-info-banner" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid #10b981', width: '100%', marginBottom: '16px' }}>
                              <span>Status: Completed. Next module is unlocked!</span>
                            </div>
                            {activeContentIndex === flatContents.length - 1 ? (
                              <Button variant="primary" onClick={handleFinalCompleteCourse} style={{ width: '100%', padding: '14px' }}>
                                Complete Course & Claim Certificate
                              </Button>
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
          </div>
        </div>

        {/* Right Side: Notes Notepad Panel (35%) */}
        <div className="player-sidebar-notes">
          <div className="notes-header-row">
            <h3>Study Notes</h3>
            <button 
              className="notes-download-btn" 
              onClick={handleDownloadNotes} 
              title="Download Notes to PC"
            >
              <Download size={18} />
            </button>
          </div>
          <div className="notes-body">
            <textarea
              className="notes-textarea"
              placeholder="Take your personal notes here... Keep summaries of continuous learning definitions or formulas."
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
            />
            <div className="notes-footer-actions">
              <Button 
                variant="primary" 
                onClick={handleSaveNotes} 
                style={{ width: '100%' }}
              >
                Save Notes
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation Bar */}
      <footer className="player-footer-navigation">
        <div className="footer-nav-left">
          <Button 
            variant="outline" 
            onClick={handlePrevSection}
            disabled={activeContentIndex === 0}
            leftIcon={<ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />}
          >
            Previous
          </Button>
        </div>
        <div className="footer-nav-center">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Topic {activeContentIndex + 1} of {flatContents.length}
          </span>
        </div>
        <div className="footer-nav-right">
          <Button 
            variant="primary" 
            onClick={handleNextSection}
            disabled={activeContentIndex === flatContents.length - 1}
            rightIcon={<ChevronRight size={16} />}
          >
            Skip / Next
          </Button>
        </div>
      </footer>
    </div>
  );
};
