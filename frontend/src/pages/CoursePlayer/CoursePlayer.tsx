import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Play, Pause, Check, Volume2, RotateCcw,
  BookOpen, ChevronDown, ChevronRight, HelpCircle, Award, 
  FileText, Download
} from 'lucide-react';
import { Button } from '../../components/Button/Button';
import { apiCall } from '../../services/api';
import './CoursePlayer.css';

interface ContentItem {
  id: string;
  title: string;
  type: 'video' | 'document' | 'quiz';
  duration: string;
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
  const [expandedModules, setExpandedModules] = useState<{ [key: string]: boolean }>({ 'm1': true, 'm2': true, 'm3': true });
  const [activeTab, setActiveTab] = useState<'overview' | 'qa' | 'notes' | 'resources'>('overview');
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [notesText, setNotesText] = useState('');
  
  // Quiz states
  const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: string }>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Q&A discussion board (seeded dummy comments)
  const [qaThreads, setQaThreads] = useState([
    { id: 1, user: 'charlie.davis@company.com', time: 'Yesterday', text: 'Does anyone have trouble setting up psycopg2 on Windows?', reply: 'Ensure you have the Visual Studio C++ Build Tools installed, or use psycopg2-binary for local testing.' },
    { id: 2, user: 'alice.smith@company.com', time: '3 days ago', text: 'How do we generate dynamic SQLAlchemy properties like creator_name without creating tables?', reply: 'Use Python\'s @property decorator and query the relation attribute. SQLAlchemy loads it dynamically via joins!' }
  ]);
  const [newQaText, setNewQaText] = useState('');

  // Default modules structure if none exist in the database for the course
  const defaultModules: Module[] = [
    {
      id: 'm1',
      title: 'Module 1: Continuous Improvement Core Philosophy',
      contents: [
        { id: 'c1', title: '1.1 Industry Standards & Philosophy Overview', type: 'video', duration: '12:40' },
        { id: 'c2', title: '1.2 Continuous Integration & Delivery Architecture', type: 'document', duration: '10 min read' },
      ]
    },
    {
      id: 'm2',
      title: 'Module 2: Real-World Database Persistence Pipelines',
      contents: [
        { id: 'c3', title: '2.1 Alembic Database Migrations & Version Control', type: 'video', duration: '15:20' },
        { id: 'c4', title: '2.2 Advanced Relational Query Performance & Joins', type: 'document', duration: '15 min read' }
      ]
    },
    {
      id: 'm3',
      title: 'Module 3: Final Certification Assessment',
      contents: [
        { id: 'c5', title: '3.1 Comprehensive Course Quiz', type: 'quiz', duration: '3 questions' }
      ]
    }
  ];

  useEffect(() => {
    const loadEnrollmentData = async () => {
      try {
        setLoading(true);
        // 1. Fetch enrollment
        const enrollRes = await apiCall(`/api/enrollments/${enrollmentId}`);
        if (!enrollRes.ok) {
          throw new Error('Enrollment not found.');
        }
        const enrollData = await enrollRes.ok ? await enrollRes.json() : null;
        if (!enrollData) return;
        setEnrollment(enrollData);

        // 2. Fetch course
        const courseRes = await apiCall(`/api/courses/${enrollData.course_id}`);
        if (courseRes.ok) {
          const courseData = await courseRes.json();
          setCourse(courseData);
        }

        // 3. Fetch modules from database
        const modulesRes = await apiCall(`/api/courses/${enrollData.course_id}/modules`);
        if (modulesRes.ok) {
          const data = await modulesRes.json();
          if (data && data.length > 0) {
            // Map backend modules to player shape
            const mappedModules = data.map((mod: any, index: number) => ({
              id: mod.id,
              title: `Module ${index + 1}: ${mod.title}`,
              contents: [
                { id: `c_${mod.id}_1`, title: `${index + 1}.1 Core Theory Lecture`, type: 'video', duration: '10:00' },
                { id: `c_${mod.id}_2`, title: `${index + 1}.2 Document Reference Guide`, type: 'document', duration: '8 min read' }
              ]
            }));
            // Add a final quiz module
            mappedModules.push({
              id: 'm_quiz',
              title: 'Module Final: Course Assessment',
              contents: [{ id: 'c_quiz', title: 'Course Final Quiz', type: 'quiz', duration: '3 questions' }]
            });
            setModules(mappedModules);
          } else {
            setModules(defaultModules);
          }
        } else {
          setModules(defaultModules);
        }

        // Reconstruct completed content items from progress percentage
        const progressVal = enrollData.progress_percent || 0;
        const totalItemsCount = 5; // default 5 items
        const completedCount = Math.round((progressVal / 100) * totalItemsCount);
        
        const initialCompleted = new Set<string>();
        for (let i = 0; i < completedCount; i++) {
          initialCompleted.add(`c${i + 1}`);
        }
        setCompletedContentIds(initialCompleted);
        
        // Set active content index based on completion
        if (completedCount < totalItemsCount) {
          setActiveContentIndex(completedCount);
        } else {
          setActiveContentIndex(totalItemsCount - 1);
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

  // Handle video progress simulator
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setVideoTime(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            // Auto complete content item
            const currentItem = flatContents[activeContentIndex];
            if (currentItem) {
              handleMarkContentComplete(currentItem.id);
            }
            return 100;
          }
          return prev + 5;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, activeContentIndex]);

  // Flattened content list for linear next/prev traversal
  const flatContents = modules.reduce<ContentItem[]>((acc, mod) => [...acc, ...mod.contents], []);

  const handleMarkContentComplete = async (contentId: string) => {
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
      setActiveContentIndex(activeContentIndex + 1);
      setVideoTime(0);
      setIsPlaying(false);
    }
  };

  const handlePrevSection = () => {
    if (activeContentIndex > 0) {
      setActiveContentIndex(activeContentIndex - 1);
      setVideoTime(0);
      setIsPlaying(false);
    }
  };

  // Submit Q&A Comment
  const handlePostQa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQaText.trim()) return;

    const newComment = {
      id: Date.now(),
      user: localStorage.getItem('isLoggedInEmail') || 'user@company.com',
      time: 'Just now',
      text: newQaText.trim(),
      reply: 'Thanks for posting! An instructor or admin will review and reply shortly.'
    };

    setQaThreads([newComment, ...qaThreads]);
    setNewQaText('');
  };

  // Submit interactive Quiz
  const handleSelectQuizAnswer = (qIdx: number, val: string) => {
    setQuizAnswers({ ...quizAnswers, [qIdx]: val });
  };

  const handleSubmitQuiz = () => {
    const answers = { 0: 'A', 1: 'B', 2: 'C' }; // Correct options
    let correctCount = 0;
    for (let i = 0; i < 3; i++) {
      if (quizAnswers[i] === answers[i as keyof typeof answers]) {
        correctCount++;
      }
    }
    const score = Math.round((correctCount / 3) * 100);
    setQuizScore(score);
    setQuizSubmitted(true);
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

  const activeContent = flatContents[activeContentIndex];

  return (
    <div className="course-player-container">
      {/* Header Bar */}
      <header className="player-header">
        <div className="player-header-left">
          <button className="back-dashboard-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <div className="player-course-title-group">
            <span>{course?.course_code || 'AI-101'}</span>
            <h2>{course?.title || 'E-Learning Course Preview'}</h2>
          </div>
        </div>

        <div className="player-header-right">
          <div className="player-header-progress">
            <span style={{ fontSize: '0.78rem', fontWeight: 'bold' }}>
              Your Progress: {enrollment?.progress_percent || 0}%
            </span>
            <div className="player-progress-bar-container">
              <div className="player-progress-bar-fill" style={{ width: `${enrollment?.progress_percent || 0}%` }}></div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="player-layout-grid">
        {/* Main Content Pane */}
        <div className="player-main-content">
          
          {/* Media Player Frame */}
          <div className="media-viewer-frame">
            {activeContent?.type === 'video' && (
              <div className="simulated-video-player" onClick={() => setIsPlaying(!isPlaying)}>
                {/* Poster overlay */}
                {videoTime === 0 && !isPlaying && (
                  <div className="video-poster-overlay">
                    <button className="video-play-trigger-btn">
                      <Play size={32} style={{ fill: '#000', marginLeft: '4px' }} />
                    </button>
                    <p style={{ marginTop: '16px', fontWeight: '600', color: '#fff' }}>Click to Start Lecture Video</p>
                  </div>
                )}

                {/* Simulated video frame */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', backgroundColor: '#020617' }}>
                  <Play size={64} style={{ opacity: isPlaying ? 0.3 : 0.7, color: 'var(--accent-color)', animation: isPlaying ? 'pulse 2s infinite' : 'none' }} />
                  <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginTop: '12px' }}>
                    {isPlaying ? 'Simulating Lecture Video Playback...' : 'Video Paused'}
                  </p>
                </div>

                {/* Player Controls */}
                <div className="video-player-controls-bar" onClick={(e) => e.stopPropagation()}>
                  <div className="video-timeline-slider">
                    <div className="video-timeline-progress" style={{ width: `${videoTime}%` }}>
                      <div className="video-timeline-handle"></div>
                    </div>
                  </div>
                  <div className="video-controls-row">
                    <div className="video-controls-left">
                      <button className="video-control-action-btn" onClick={() => setIsPlaying(!isPlaying)}>
                        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                      </button>
                      <button className="video-control-action-btn" onClick={() => setVideoTime(0)}>
                        <RotateCcw size={16} />
                      </button>
                      <span style={{ fontSize: '0.75rem', color: '#fff' }}>
                        {Math.floor((videoTime / 100) * 12)}:{(videoTime % 10) * 6} / 12:00
                      </span>
                    </div>
                    <div className="video-controls-right">
                      <Volume2 size={18} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeContent?.type === 'document' && (
              <div className="reading-mode-viewer">
                <div className="reading-content-card">
                  <h3>{activeContent.title}</h3>
                  <p>Welcome to this module's companion reference guide. Reviewing documentation is crucial for mastering continuous improvement pipelines and database schema versioning in large-scale enterprise portals.</p>
                  <p>Key takeaways include: maintaining consistent connection pools, implementing non-destructive seeding scripts, and verifying SQLAlchemy relation decorators to map tables smoothly without overhead columns.</p>
                  <p>Take notes in the tab below to compile your summary before moving onto the final assessment quiz.</p>
                </div>
              </div>
            )}

            {activeContent?.type === 'quiz' && (
              <div className="quiz-player-panel">
                <div className="quiz-content-card">
                  <span className="quiz-badge">Assessment</span>
                  
                  {!quizSubmitted ? (
                    <>
                      <h3 className="quiz-question-heading">
                        {activeContentIndex === 4 ? (
                          <>Question: Which command is used to apply outstanding Alembic revisions to the database?</>
                        ) : (
                          <>Final Exam Quiz</>
                        )}
                      </h3>

                      <div className="quiz-options-group">
                        {[
                          { key: 'A', text: 'alembic upgrade head' },
                          { key: 'B', text: 'alembic revision --autogenerate' },
                          { key: 'C', text: 'alembic current' }
                        ].map((opt) => (
                          <button 
                            key={opt.key}
                            className={`quiz-option-button ${quizAnswers[0] === opt.key ? 'selected' : ''}`}
                            onClick={() => handleSelectQuizAnswer(0, opt.key)}
                          >
                            <span className="quiz-option-letter">{opt.key}</span>
                            <span>{opt.text}</span>
                          </button>
                        ))}
                      </div>

                      <Button 
                        variant="primary" 
                        disabled={!quizAnswers[0]}
                        onClick={handleSubmitQuiz}
                        style={{ width: '100%', padding: '14px' }}
                      >
                        Submit Assessment
                      </Button>
                    </>
                  ) : (
                    <div className="quiz-success-pane">
                      <div className="quiz-success-badge-glow">
                        <Award size={40} />
                      </div>
                      <h3 style={{ fontSize: '1.4rem', color: '#fff', margin: '0 0 10px 0' }}>Quiz Completed!</h3>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                        You scored {quizScore}% (Passed). You have successfully met all continuous learning requirements.
                      </p>
                      <Button variant="primary" onClick={handleFinalCompleteCourse} style={{ width: '100%', padding: '14px' }}>
                        Complete Course & Earn Certificate
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Details & Tabs */}
          <div className="player-details-tabs-bar">
            {(['overview', 'qa', 'notes', 'resources'] as const).map(tab => (
              <button 
                key={tab} 
                className={`player-tab-trigger ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="player-tab-content-panel">
            {activeTab === 'overview' && (
              <div className="tab-pane-content">
                <h3>About this Lecture</h3>
                <p>This module provides critical architectural insight into continuous learning systems. Explore standard setups, map data models to frontend states, and secure role-based guards.</p>
              </div>
            )}

            {activeTab === 'qa' && (
              <div className="tab-pane-content">
                <h3>Lecture Q&A</h3>
                <form onSubmit={handlePostQa} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                  <input 
                    type="text" 
                    placeholder="Ask a question about this lecture..."
                    className="form-input-styled"
                    value={newQaText}
                    onChange={(e) => setNewQaText(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <Button variant="primary" type="submit">Post Question</Button>
                </form>

                <div className="qa-thread-list">
                  {qaThreads.map(t => (
                    <div key={t.id} className="qa-post-item">
                      <div className="qa-post-header">
                        <span>{t.user}</span>
                        <span>{t.time}</span>
                      </div>
                      <div className="qa-post-body">
                        <p>{t.text}</p>
                      </div>
                      {t.reply && (
                        <div className="qa-post-reply">
                          <strong>Reply:</strong> {t.reply}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="tab-pane-content">
                <h3>My Lecture Notes</h3>
                <textarea 
                  placeholder="Draft your thoughts, key takeaways, or code snippets here..."
                  className="form-textarea-styled"
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  style={{ minHeight: '150px' }}
                />
                <Button 
                  variant="outline" 
                  onClick={() => alert('Notes saved locally for this course.')}
                  style={{ marginTop: '12px' }}
                >
                  Save Notes
                </Button>
              </div>
            )}

            {activeTab === 'resources' && (
              <div className="tab-pane-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3>Course Resources</h3>
                {[
                  { name: 'Lecture_Slides_V2.pdf', size: '4.2 MB' },
                  { name: 'Source_Code_Archive.zip', size: '12.8 MB' }
                ].map((res, i) => (
                  <div key={i} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FileText size={18} style={{ color: 'var(--accent-color)' }} />
                      <div>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold' }}>{res.name}</p>
                        <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Size: {res.size}</span>
                      </div>
                    </div>
                    <button className="video-control-action-btn" title="Download Resource">
                      <Download size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Accordion */}
        <div className="player-sidebar-curriculum">
          <div className="sidebar-title-row">
            <h3>Course Curriculum</h3>
          </div>

          <div className="sidebar-modules-list">
            {modules.map((mod) => {
              const isExpanded = expandedModules[mod.id];
              return (
                <div key={mod.id} className="sidebar-module-group">
                  <button 
                    className="module-header-trigger"
                    onClick={() => setExpandedModules({ ...expandedModules, [mod.id]: !isExpanded })}
                  >
                    <div className="module-header-left">
                      <h4>{mod.title}</h4>
                      <span>
                        {mod.contents.filter(c => completedContentIds.has(c.id)).length} / {mod.contents.length} Completed
                      </span>
                    </div>
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>

                  {isExpanded && (
                    <div className="module-contents-list">
                      {mod.contents.map((item) => {
                        const isItemActive = flatContents[activeContentIndex]?.id === item.id;
                        const isItemCompleted = completedContentIds.has(item.id);
                        const indexInFlat = flatContents.findIndex(c => c.id === item.id);
                        
                        return (
                          <div 
                            key={item.id} 
                            className={`content-item-row ${isItemActive ? 'active' : ''}`}
                            onClick={() => {
                              setActiveContentIndex(indexInFlat);
                              setVideoTime(0);
                              setIsPlaying(false);
                            }}
                          >
                            <div 
                              className={`content-item-checkbox ${isItemCompleted ? 'checked' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkContentComplete(item.id);
                              }}
                            >
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

      {/* Footer Navigation Bar */}
      <footer className="player-footer-navigation">
        <div className="footer-nav-left">
          <Button 
            variant="outline" 
            onClick={handlePrevSection}
            disabled={activeContentIndex === 0}
            leftIcon={<ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />}
          >
            Previous Section
          </Button>
        </div>
        <div className="footer-nav-center">
          <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
            Lecture {activeContentIndex + 1} of {flatContents.length}
          </span>
        </div>
        <div className="footer-nav-right">
          <Button 
            variant="primary" 
            onClick={handleNextSection}
            disabled={activeContentIndex === flatContents.length - 1}
            rightIcon={<ChevronRight size={16} />}
          >
            Next Section
          </Button>
        </div>
      </footer>
    </div>
  );
};
