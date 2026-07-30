
import './Creator.css';

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Edit3, HelpCircle, FileText, Heading, Type, Link, Video, FileUp, Trash2, GripVertical } from 'lucide-react';
import { Button } from '../../components/Button/Button';
import { apiCall } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import './Creator.css';

interface Block {
  id: string;
  type: 'title' | 'subtitle' | 'text' | 'youtube' | 'blog' | 'website' | 'attachment' | 'image' | 'video';
  value: string;
  label?: string; // Used for attachment button labels or placeholders
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex?: number;
  correctOptions?: string[];
  question_type: 'mcq' | 'msq' | 'notes';
}

export const ModuleEditor: React.FC = () => {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>();
  const navigate = useNavigate();
  const { triggerToast } = useToast();

  // State
  const [moduleTitle, setModuleTitle] = useState('Explore Module');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [notes, setNotes] = useState('');
  const [quizzes, setQuizzes] = useState<QuizQuestion[]>([]);
  const [validationErrors, setValidationErrors] = useState<{[blockId: string]: string}>({});
  
  // Drag and Drop States
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Right Tab View State
  const [activeTab, setActiveTab] = useState<'preview' | 'quiz' | 'notes'>('preview');

  // Quiz Builder Input State
  const [quizQuestionText, setQuizQuestionText] = useState('');
  const [quizOptions, setQuizOptions] = useState<string[]>(['', '', '', '']);
  const [quizCorrectIndex, setQuizCorrectIndex] = useState<number>(0);
  const [quizQuestionType, setQuizQuestionType] = useState<'mcq' | 'msq' | 'notes'>('mcq');
  const [quizCorrectIndices, setQuizCorrectIndices] = useState<boolean[]>([false, false, false, false]);

  const fetchModuleWorkspace = async () => {
    if (!moduleId) return;
    try {
      // 1. Fetch Module details
      const modRes = await apiCall(`/api/modules/${moduleId}`);
      if (modRes.ok) {
        const modData = await modRes.json();
        setModuleTitle(modData.title);
      }

      // 2. Fetch Module Blocks Content
      const blockRes = await apiCall(`/api/modules/${moduleId}/contents`);
      if (blockRes.ok) {
        const data = await blockRes.json();
        if (data && data.length > 0) {
          const loadedBlocks = data.map((item: any) => ({
            id: item.id,
            type: item.content_type,
            value: item.value || '',
            label: item.label || ''
          }));
          setBlocks(loadedBlocks);
        } else {
          // Fallback initial default blocks if database contains nothing
          const initialBlocks: Block[] = [
            { id: 'b1', type: 'title', value: 'Course Introduction & Objectives' },
            { id: 'b2', type: 'subtitle', value: 'Learn the primary foundations and workflow pipelines' },
            { id: 'b3', type: 'text', value: 'This module introduces essential learning patterns. Please read the document attachments and watch the introductory lecture below.' }
          ];
          setBlocks(initialBlocks);
        }
      }

      // 3. Fetch Module Notes
      const notesRes = await apiCall(`/api/modules/${moduleId}/notes`);
      if (notesRes.ok) {
        const notesData = await notesRes.json();
        setNotes(notesData.content || '');
      }

      // 4. Fetch Module Quizzes
      const quizRes = await apiCall(`/api/quizzes/module/${moduleId}`);
      if (quizRes.ok) {
        const quizData = await quizRes.json();
        if (quizData && quizData.questions && quizData.questions.length > 0) {
          const loadedQuizzes = quizData.questions.map((q: any) => {
            const type = (q.question_type || 'mcq') as 'mcq' | 'msq' | 'notes';
            let correctOptionIndex = 0;
            let correctOptions: string[] = [];
            if (type === 'msq') {
              try {
                correctOptions = JSON.parse(q.correct_answer);
              } catch {
                correctOptions = [];
              }
            } else if (type === 'mcq') {
              const parsed = parseInt(q.correct_answer);
              if (!isNaN(parsed) && parsed >= 0 && parsed < q.options.length) {
                correctOptionIndex = parsed;
              } else {
                correctOptionIndex = q.options.indexOf(q.correct_answer) >= 0 ? q.options.indexOf(q.correct_answer) : 0;
              }
            }
            return {
              id: q.id,
              question: q.question_text,
              options: q.options || [],
              correctOptionIndex,
              correctOptions,
              question_type: type
            };
          });
          setQuizzes(loadedQuizzes);
        }
      }
    } catch (err) {
      console.error("Failed to load module workspace details", err);
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

    fetchModuleWorkspace();
  }, [courseId, moduleId]);

  // Validation checker for URL schema fields
  const validateBlockValue = (blockId: string, type: string, value: string) => {
    if (!value.trim()) {
      setValidationErrors(prev => {
        const copy = { ...prev };
        delete copy[blockId];
        return copy;
      });
      return true;
    }

    let errorMsg = '';
    const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?/;
    const isUrl = urlPattern.test(value.trim());

    if (!value.trim().startsWith('http://') && !value.trim().startsWith('https://')) {
      errorMsg = 'URL must start with http:// or https://';
    } else if (!isUrl) {
      errorMsg = 'Please enter a valid URL';
    } else if (type === 'youtube') {
      const isYoutube = value.includes('youtube.com') || value.includes('youtu.be');
      if (!isYoutube) {
        errorMsg = 'Must be a valid YouTube URL (contains youtube.com or youtu.be)';
      }
    }

    if (errorMsg) {
      setValidationErrors(prev => ({ ...prev, [blockId]: errorMsg }));
      return false;
    } else {
      setValidationErrors(prev => {
        const copy = { ...prev };
        delete copy[blockId];
        return copy;
      });
      return true;
    }
  };

  // Actions: Save Module details to Database
  const handleSave = async () => {
    if (!moduleId) return;

    // Validate all blocks before executing save operations
    let hasErrors = false;
    blocks.forEach(b => {
      const mediaTypes = ['youtube', 'video', 'image', 'attachment', 'blog', 'website'];
      if (mediaTypes.includes(b.type)) {
        const isValid = validateBlockValue(b.id, b.type, b.value);
        if (!isValid) hasErrors = true;
      }
    });

    if (hasErrors) {
      triggerToast('Please correct validation errors on media URL fields before saving.', 'error');
      return;
    }

    try {
      // 1. Save Content Blocks (Delete all existing contents first, then recreate them)
      const existingRes = await apiCall(`/api/modules/${moduleId}/contents`);
      if (existingRes.ok) {
        const existingData = await existingRes.json();
        for (const item of existingData) {
          await apiCall(`/api/contents/${item.id}`, { method: 'DELETE' });
        }
      }

      // Re-create blocks
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        await apiCall(`/api/modules/${moduleId}/contents`, {
          method: 'POST',
          body: JSON.stringify({
            title: block.type.toUpperCase() + " Block",
            content_type: block.type,
            file_path: block.type === 'youtube' || block.type === 'video' || block.type === 'blog' || block.type === 'website' || block.type === 'attachment' || block.type === 'image' ? block.value : null,
            value: block.value,
            label: block.label || null,
            sequence_no: i + 1,
            is_active: true
          })
        });
      }

      // 2. Save Notes
      await apiCall(`/api/modules/${moduleId}/notes`, {
        method: 'PUT',
        body: JSON.stringify({ content: notes })
      });

      // 3. Save Quizzes (Delete old one and create new one if questions exist)
      await apiCall(`/api/quizzes/module/${moduleId}`, { method: 'DELETE' });

      if (quizzes.length > 0) {
        const quizPayload = {
          module_id: moduleId,
          title: moduleTitle + " Assessment",
          passing_score: 70,
          time_limit_minutes: 15,
          is_published: true,
          questions: quizzes.map((q) => {
            let correct_answer = "";
            if (q.question_type === 'msq') {
              correct_answer = JSON.stringify(q.correctOptions || []);
            } else if (q.question_type === 'mcq') {
              correct_answer = q.options[q.correctOptionIndex ?? 0] || "";
            }
            return {
              question_text: q.question,
              options: q.options || [],
              correct_answer,
              explanation: "Review the module content for this answer.",
              points: 1,
              question_type: q.question_type || "mcq"
            };
          })
        };

        const quizCreateRes = await apiCall('/api/quizzes', {
          method: 'POST',
          body: JSON.stringify(quizPayload)
        });
        if (!quizCreateRes.ok) {
          alert('Could not save the assessment questions. Please try again.');
        }
      }

      alert('Your changes have been saved!');
    } catch (err) {
      console.error(err);
      alert('Could not save your changes. Please check your internet connection and try again.');
    }
  };

  // Block Builder helpers
  const addBlock = (type: Block['type']) => {
    const newBlock: Block = {
      id: `block_${Date.now()}`,
      type,
      value: '',
      label: type === 'attachment' ? 'Download Syllabus PPT' : undefined
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlockValue = (id: string, value: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, value } : b));
    
    // Auto-validate value on change
    const block = blocks.find(b => b.id === id);
    if (block) {
      validateBlockValue(id, block.type, value);
    }
  };

  const updateBlockLabel = (id: string, label: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, label } : b));
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  // Drag & Drop handlers for Content Blocks
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const updated = [...blocks];
    const item = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, item);
    setBlocks(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Quiz Builder helpers
  const handleAddQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizQuestionText.trim()) return;

    let finalOptions: string[] = [];
    let correctOptionIndex = 0;
    let correctOptions: string[] = [];

    if (quizQuestionType !== 'notes') {
      if (quizOptions.some(opt => !opt.trim())) {
        alert('All 4 Options must be filled out.');
        return;
      }
      finalOptions = [...quizOptions];

      if (quizQuestionType === 'msq') {
        const indices = quizCorrectIndices.map((val, idx) => val ? idx : -1).filter(idx => idx !== -1);
        if (indices.length === 0) {
          alert('You must select at least one correct option for MSQ.');
          return;
        }
        correctOptions = indices.map(idx => finalOptions[idx]);
      } else {
        correctOptionIndex = quizCorrectIndex;
      }
    }

    const newQuestion: QuizQuestion = {
      id: `quiz_${Date.now()}`,
      question: quizQuestionText.trim(),
      options: finalOptions,
      correctOptionIndex,
      correctOptions,
      question_type: quizQuestionType
    };

    const updatedQuizzes = [...quizzes, newQuestion];
    setQuizzes(updatedQuizzes);

    // Reset Inputs
    setQuizQuestionText('');
    setQuizOptions(['', '', '', '']);
    setQuizCorrectIndex(0);
    setQuizCorrectIndices([false, false, false, false]);
  };

  const deleteQuizQuestion = (id: string) => {
    setQuizzes(quizzes.filter(q => q.id !== id));
  };

  return (
    <div className="creator-workspace container">
      {/* Top action row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Button 
          variant="outline" 
          onClick={() => navigate(`/creator/course/${courseId}`)}
          leftIcon={<ArrowLeft size={16} />}
        >
          Back to Syllabus
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSave}
          leftIcon={<Save size={16} />}
        >
          Save Workspace
        </Button>
      </div>

      <div className="creator-header" style={{ marginBottom: '32px' }}>
        <div>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--accent-color)', fontWeight: '700' }}>Module Editor</span>
          <h1 style={{ fontSize: '1.8rem', marginTop: '4px' }}>{moduleTitle}</h1>
        </div>
      </div>

      {/* Editor Main Grid (65% Editor Workspace, 35% Utilities Panel) */}
      <div className="editor-workspace-layout">
        {/* Left Column: Blocks Composer */}
        <div className="editor-left-column">
          <div className="editor-card-panel glass-panel">
            <h3>
              <Edit3 size={18} className="icon-blue" />
              Content Composer Blocks
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Create and reorder headers, textual descriptions, links, attachments, and videos. Use the ↑ and ↓ cursor control arrows to shift element hierarchy.
            </p>

            <div className="content-blocks-list">
              {blocks.map((block, index) => (
                <div 
                  key={block.id} 
                  className={`block-editor-item ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  
                  {/* Drag Grip Handle */}
                  <div className="block-drag-handle" style={{ cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }} title="Drag block to reorder">
                    <GripVertical size={18} />
                  </div>

                  {/* Block Type Fields */}
                  <div className="block-content-body">
                    <div className="block-type-header">
                      <span className="block-type-badge">{block.type}</span>
                      <button 
                        type="button" 
                        onClick={() => deleteBlock(block.id)}
                        className="delete-block-btn"
                        title="Delete Element"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Conditional inputs */}
                    {block.type === 'title' && (
                      <input 
                        type="text" 
                        className="form-input-styled" 
                        placeholder="Enter Course H1 Title..."
                        value={block.value}
                        onChange={(e) => updateBlockValue(block.id, e.target.value)}
                        style={{ fontWeight: '700' }}
                      />
                    )}

                    {block.type === 'subtitle' && (
                      <input 
                        type="text" 
                        className="form-input-styled" 
                        placeholder="Enter Course Subtitle..."
                        value={block.value}
                        onChange={(e) => updateBlockValue(block.id, e.target.value)}
                      />
                    )}

                    {block.type === 'text' && (
                      <textarea 
                        className="form-textarea-styled" 
                        placeholder="Enter Textual Details & Module Descriptions..."
                        value={block.value}
                        onChange={(e) => updateBlockValue(block.id, e.target.value)}
                      />
                    )}

                    {(block.type === 'youtube' || block.type === 'blog' || block.type === 'website') && (
                      <div style={{ width: '100%' }}>
                        <input 
                          type="url" 
                          className="form-input-styled" 
                          placeholder={`Enter URL for ${block.type} link...`}
                          value={block.value}
                          onChange={(e) => updateBlockValue(block.id, e.target.value)}
                        />
                        {validationErrors[block.id] && (
                          <span style={{ color: 'var(--neon-coral, #ef4444)', fontSize: '0.78rem', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                            ⚠️ {validationErrors[block.id]}
                          </span>
                        )}
                      </div>
                    )}

                    {block.type === 'attachment' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        <input 
                          type="text" 
                          className="form-input-styled" 
                          placeholder="Button Label (e.g. Download Course slides PDF)"
                          value={block.label || ''}
                          onChange={(e) => updateBlockLabel(block.id, e.target.value)}
                        />
                        <input 
                          type="text" 
                          className="form-input-styled" 
                          placeholder="Attachment PDF/PPT link or URL..."
                          value={block.value}
                          onChange={(e) => updateBlockValue(block.id, e.target.value)}
                        />
                        {validationErrors[block.id] && (
                          <span style={{ color: 'var(--neon-coral, #ef4444)', fontSize: '0.78rem', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                            ⚠️ {validationErrors[block.id]}
                          </span>
                        )}
                      </div>
                    )}

                    {block.type === 'image' && (
                      <div style={{ width: '100%' }}>
                        <input 
                          type="url" 
                          className="form-input-styled" 
                          placeholder="Image Link or URL (e.g. https://domain.com/picture.png)..."
                          value={block.value}
                          onChange={(e) => updateBlockValue(block.id, e.target.value)}
                        />
                        {validationErrors[block.id] && (
                          <span style={{ color: 'var(--neon-coral, #ef4444)', fontSize: '0.78rem', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                            ⚠️ {validationErrors[block.id]}
                          </span>
                        )}
                      </div>
                    )}

                    {block.type === 'video' && (
                      <div style={{ width: '100%' }}>
                        <input 
                          type="url" 
                          className="form-input-styled" 
                          placeholder="Video Embed Link or Direct URL (e.g. MP4 link)..."
                          value={block.value}
                          onChange={(e) => updateBlockValue(block.id, e.target.value)}
                        />
                        {validationErrors[block.id] && (
                          <span style={{ color: 'var(--neon-coral, #ef4444)', fontSize: '0.78rem', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                            ⚠️ {validationErrors[block.id]}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick block creation buttons toolbar */}
            <div className="add-block-toolbar">
              <h4>+ Insert Content Blocks</h4>
              <div className="add-block-buttons">
                <button type="button" onClick={() => addBlock('title')} className="add-block-btn">
                  <Heading size={14} /> Title
                </button>
                <button type="button" onClick={() => addBlock('subtitle')} className="add-block-btn">
                  <Type size={14} /> Subtitle
                </button>
                <button type="button" onClick={() => addBlock('text')} className="add-block-btn">
                  <FileText size={14} /> Text Info
                </button>
                <button type="button" onClick={() => addBlock('youtube')} className="add-block-btn">
                  <Video size={14} /> YouTube
                </button>
                <button type="button" onClick={() => addBlock('blog')} className="add-block-btn">
                  <Link size={14} /> Blog Link
                </button>
                <button type="button" onClick={() => addBlock('website')} className="add-block-btn">
                  <Link size={14} /> Web Link
                </button>
                <button type="button" onClick={() => addBlock('attachment')} className="add-block-btn">
                  <FileUp size={14} /> Attachment
                </button>
                <button type="button" onClick={() => addBlock('image')} className="add-block-btn">
                  <FileUp size={14} /> Image URL
                </button>
                <button type="button" onClick={() => addBlock('video')} className="add-block-btn">
                  <Video size={14} /> Video URL
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Tab View Workspace (Learner Preview / Quiz Builder / Private notes) */}
        <div className="editor-right-column">
          <div className="editor-card-panel glass-panel" style={{ padding: '20px' }}>
            <div className="sidebar-tabs-header">
              <button 
                type="button" 
                onClick={() => setActiveTab('preview')}
                className={`sidebar-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
              >
                <Eye size={14} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'text-bottom' }} />
                Preview
              </button>
              <button 
                type="button" 
                onClick={() => setActiveTab('quiz')}
                className={`sidebar-tab-btn ${activeTab === 'quiz' ? 'active' : ''}`}
              >
                <HelpCircle size={14} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'text-bottom' }} />
                Quiz Builder
              </button>
              <button 
                type="button" 
                onClick={() => setActiveTab('notes')}
                className={`sidebar-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
              >
                <FileText size={14} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'text-bottom' }} />
                Notes
              </button>
            </div>

            {/* Tab 1: Live Learner Preview Simulator */}
            {activeTab === 'preview' && (
              <div className="live-preview-content-canvas animate-fade-in" style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '6px' }}>
                {blocks.length === 0 ? (
                  <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>
                    Preview canvas empty. Start editing blocks to view output.
                  </p>
                ) : (
                  blocks.map((block) => (
                    <div key={block.id} style={{ marginBottom: '20px' }}>
                      {block.type === 'title' && block.value.trim() && (
                        <div className="preview-block-heading">
                          <h1 style={{ fontWeight: '800', margin: '0 0 12px 0', fontSize: '2.2rem', lineHeight: '1.2' }}>{block.value}</h1>
                        </div>
                      )}
                      {block.type === 'subtitle' && block.value.trim() && (
                        <div className="preview-block-subtitle">
                          <h2 style={{ fontWeight: '600', margin: '0 0 16px 0', fontSize: '1.4rem', color: 'var(--text-secondary)' }}>{block.value}</h2>
                        </div>
                      )}
                      {block.type === 'text' && block.value.trim() && (
                        <div className="preview-block-text">
                          <p style={{ whiteSpace: 'pre-wrap' }}>{block.value}</p>
                        </div>
                      )}
                      {block.type === 'youtube' && block.value.trim() && (
                        <div className="youtube-embed-container">
                          <iframe 
                            src={block.value}
                            title="YouTube Video Lecture Player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        </div>
                      )}
                      {block.type === 'blog' && block.value.trim() && (
                        <div className="preview-block-link-row">
                          <a href={block.value} target="_blank" rel="noopener noreferrer" className="preview-block-link">
                            🔗 {block.value}
                          </a>
                        </div>
                      )}
                      {block.type === 'website' && block.value.trim() && (
                        <div className="preview-block-link-row">
                          <a href={block.value} target="_blank" rel="noopener noreferrer" className="preview-block-link">
                            🌐 {block.value}
                          </a>
                        </div>
                      )}
                      {block.type === 'attachment' && block.value.trim() && (
                        <div>
                          <a href={block.value} target="_blank" rel="noopener noreferrer" className="preview-block-attachment-btn">
                            📎 {block.label || 'Download Course PDF Attachment'}
                          </a>
                        </div>
                      )}
                      {block.type === 'image' && block.value.trim() && (
                        <div className="preview-image-container">
                          <img src={block.value} alt="Lecture media graph attachment" />
                        </div>
                      )}
                      {block.type === 'video' && block.value.trim() && (
                        <div className="preview-video-container">
                          <video controls src={block.value} style={{ width: '100%', display: 'block' }}></video>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
            {activeTab === 'quiz' && (
              <div className="quiz-builder-workspace animate-fade-in">
                {/* List of current questions */}
                <h4 style={{ marginBottom: '12px', fontWeight: '700', fontSize: '0.95rem' }}>Added Assessment Questions ({quizzes.length})</h4>
                
                {quizzes.length === 0 ? (
                  <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                    No quiz questions established yet. Use the constructor below.
                  </p>
                ) : (
                  <div className="quiz-questions-list">
                    {quizzes.map((q, idx) => (
                      <div key={q.id} className="quiz-question-item">
                        <div className="quiz-question-header">
                          <div>
                            <span style={{ 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              background: 'var(--accent-glow)', 
                              color: 'var(--accent-color)', 
                              fontSize: '0.65rem', 
                              fontWeight: '800',
                              marginRight: '8px',
                              textTransform: 'uppercase'
                            }}>
                              {q.question_type || 'mcq'}
                            </span>
                            <span style={{ fontSize: '0.82rem', fontWeight: '600' }}>Q{idx + 1}: {q.question}</span>
                          </div>
                          <button onClick={() => deleteQuizQuestion(q.id)} className="delete-block-btn" style={{ marginLeft: '10px' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {q.question_type !== 'notes' && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {q.options.map((opt, oIdx) => {
                              const isCorrect = q.question_type === 'msq' 
                                ? (q.correctOptions || []).includes(opt) 
                                : oIdx === q.correctOptionIndex;
                              return (
                                <span key={oIdx} style={{ color: isCorrect ? 'var(--neon-teal)' : 'inherit', fontWeight: isCorrect ? '700' : 'normal' }}>
                                  {String.fromCharCode(65 + oIdx)}) {opt} {isCorrect ? ' (Correct)' : ''}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Form to construct a new question */}
                <form onSubmit={handleAddQuizSubmit} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                  <h4 style={{ marginBottom: '14px', fontSize: '0.9rem', fontWeight: '700' }}>+ Create Question</h4>
                  
                  <div className="form-group-spaced" style={{ marginBottom: '16px' }}>
                    <label className="form-label-styled" style={{ fontSize: '0.78rem' }}>Question Type</label>
                    <select 
                      className="form-input-styled"
                      value={quizQuestionType}
                      onChange={(e) => setQuizQuestionType(e.target.value as any)}
                    >
                      <option value="mcq">MCQ (Single Choice)</option>
                      <option value="msq">MSQ (Multiple Select)</option>
                      <option value="notes">Notes (Descriptive Response)</option>
                    </select>
                  </div>

                  <div className="form-group-spaced">
                    <label className="form-label-styled" style={{ fontSize: '0.78rem' }}>Question Statement</label>
                    <input 
                      type="text" 
                      className="form-input-styled" 
                      placeholder="e.g. Which algorithm is used to adjust weights?"
                      value={quizQuestionText}
                      onChange={(e) => setQuizQuestionText(e.target.value)}
                      required
                    />
                  </div>

                  {quizQuestionType !== 'notes' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                      <label className="form-label-styled" style={{ fontSize: '0.78rem', marginBottom: '0' }}>Options & Correct Answer Selection</label>
                      {quizOptions.map((option, index) => (
                        <div key={index} className="option-builder-row">
                          {quizQuestionType === 'msq' ? (
                            <input 
                              type="checkbox" 
                              className="correct-option-checkbox"
                              checked={quizCorrectIndices[index]}
                              onChange={(e) => {
                                const newCorrects = [...quizCorrectIndices];
                                newCorrects[index] = e.target.checked;
                                setQuizCorrectIndices(newCorrects);
                              }}
                              title="Mark as correct choice"
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                          ) : (
                            <input 
                              type="radio" 
                              name="correct_answer_select" 
                              className="correct-option-radio"
                              checked={quizCorrectIndex === index}
                              onChange={() => setQuizCorrectIndex(index)}
                              title="Mark as correct answer"
                            />
                          )}
                          <input 
                            type="text" 
                            className="form-input-styled" 
                            placeholder={`Option ${String.fromCharCode(65 + index)}`}
                            value={option}
                            onChange={(e) => {
                              const newOpts = [...quizOptions];
                              newOpts[index] = e.target.value;
                              setQuizOptions(newOpts);
                            }}
                            required
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <Button variant="primary" type="submit" style={{ width: '100%' }}>
                    Add Question to Quiz
                  </Button>
                </form>
              </div>
            )}

            {/* Tab 3: Private Module Creator Notes */}
            {activeTab === 'notes' && (
              <div className="private-notes-workspace animate-fade-in">
                <h4 style={{ marginBottom: '10px', fontWeight: '700', fontSize: '0.95rem' }}>Private Author Notes</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                  Document curriculum objectives, reference papers, and reminders. These notes are saved locally with your project workspace drafts.
                </p>
                <textarea 
                  className="creator-notes-textarea"
                  placeholder="Take private module notes here..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
