
import './Creator.css';

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Edit3, HelpCircle, FileText, Heading, Type, Link, Video, FileUp, Trash2, GripVertical } from 'lucide-react';
import { Button } from '../../components/Button/Button';
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
  correctOptionIndex: number;
}

export const ModuleEditor: React.FC = () => {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>();
  const navigate = useNavigate();

  // State
  const [moduleTitle, setModuleTitle] = useState('Explore Module');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [notes, setNotes] = useState('');
  const [quizzes, setQuizzes] = useState<QuizQuestion[]>([]);
  
  // Drag and Drop States
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Right Tab View State
  const [activeTab, setActiveTab] = useState<'preview' | 'quiz' | 'notes'>('preview');

  // Quiz Builder Input State
  const [quizQuestionText, setQuizQuestionText] = useState('');
  const [quizOptions, setQuizOptions] = useState<string[]>(['', '', '', '']);
  const [quizCorrectIndex, setQuizCorrectIndex] = useState<number>(0);

  useEffect(() => {
    // 1. Fetch Module details
    const localModulesMap = localStorage.getItem('creator_modules');
    if (localModulesMap && courseId) {
      const modulesMap = JSON.parse(localModulesMap);
      const courseModules = modulesMap[courseId] || [];
      const foundMod = courseModules.find((m: any) => m.id === moduleId);
      if (foundMod) {
        setModuleTitle(foundMod.title);
      }
    }

    // 2. Fetch Module Blocks Content
    const localBlocksMap = localStorage.getItem('creator_module_content');
    if (localBlocksMap && moduleId) {
      const blocksMap = JSON.parse(localBlocksMap);
      if (blocksMap[moduleId]) {
        setBlocks(blocksMap[moduleId]);
      } else {
        // Initial Mock Blocks
        const initialBlocks: Block[] = [
          { id: 'b1', type: 'title', value: 'Course Introduction & Objectives' },
          { id: 'b2', type: 'subtitle', value: 'Learn the primary foundations and workflow pipelines' },
          { id: 'b3', type: 'text', value: 'This module introduces essential learning patterns. Please read the document attachments and watch the introductory lecture below.' },
          { id: 'b4', type: 'youtube', value: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }
        ];
        setBlocks(initialBlocks);
        blocksMap[moduleId] = initialBlocks;
        localStorage.setItem('creator_module_content', JSON.stringify(blocksMap));
      }
    } else {
      const initialBlocks: Block[] = [
        { id: 'b1', type: 'title', value: 'Course Introduction & Objectives' },
        { id: 'b2', type: 'subtitle', value: 'Learn the primary foundations and workflow pipelines' },
        { id: 'b3', type: 'text', value: 'This module introduces essential learning patterns. Please read the document attachments and watch the introductory lecture below.' }
      ];
      setBlocks(initialBlocks);
      if (moduleId) {
        const blocksMap = { [moduleId]: initialBlocks };
        localStorage.setItem('creator_module_content', JSON.stringify(blocksMap));
      }
    }

    // 3. Fetch Module Notes
    const localNotesMap = localStorage.getItem('creator_module_notes');
    if (localNotesMap && moduleId) {
      const notesMap = JSON.parse(localNotesMap);
      setNotes(notesMap[moduleId] || '');
    }

    // 4. Fetch Module Quizzes
    const localQuizzesMap = localStorage.getItem('creator_module_quizzes');
    if (localQuizzesMap && moduleId) {
      const quizzesMap = JSON.parse(localQuizzesMap);
      setQuizzes(quizzesMap[moduleId] || []);
    }
  }, [courseId, moduleId]);

  // Actions: Save Module details to LocalStorage
  const handleSave = () => {
    if (!moduleId) return;

    // Save Blocks
    const localBlocksMap = localStorage.getItem('creator_module_content');
    const blocksMap = localBlocksMap ? JSON.parse(localBlocksMap) : {};
    blocksMap[moduleId] = blocks;
    localStorage.setItem('creator_module_content', JSON.stringify(blocksMap));

    // Save Notes
    const localNotesMap = localStorage.getItem('creator_module_notes');
    const notesMap = localNotesMap ? JSON.parse(localNotesMap) : {};
    notesMap[moduleId] = notes;
    localStorage.setItem('creator_module_notes', JSON.stringify(notesMap));

    // Save Quizzes
    const localQuizzesMap = localStorage.getItem('creator_module_quizzes');
    const quizzesMap = localQuizzesMap ? JSON.parse(localQuizzesMap) : {};
    quizzesMap[moduleId] = quizzes;
    localStorage.setItem('creator_module_quizzes', JSON.stringify(quizzesMap));

    alert('Module content successfully saved!');
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
    if (quizOptions.some(opt => !opt.trim())) {
      alert('All 4 MCQ Options must be filled out.');
      return;
    }

    const newQuestion: QuizQuestion = {
      id: `quiz_${Date.now()}`,
      question: quizQuestionText.trim(),
      options: [...quizOptions],
      correctOptionIndex: quizCorrectIndex
    };

    const updatedQuizzes = [...quizzes, newQuestion];
    setQuizzes(updatedQuizzes);

    // Reset Inputs
    setQuizQuestionText('');
    setQuizOptions(['', '', '', '']);
    setQuizCorrectIndex(0);
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

      <div className="creator-header" style={{ marginBottom: '16px' }}>
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
                      <input 
                        type="url" 
                        className="form-input-styled" 
                        placeholder={`Enter URL for ${block.type} link...`}
                        value={block.value}
                        onChange={(e) => updateBlockValue(block.id, e.target.value)}
                      />
                    )}

                    {block.type === 'attachment' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                      </div>
                    )}

                    {block.type === 'image' && (
                      <input 
                        type="url" 
                        className="form-input-styled" 
                        placeholder="Image Link or URL (e.g. https://domain.com/picture.png)..."
                        value={block.value}
                        onChange={(e) => updateBlockValue(block.id, e.target.value)}
                      />
                    )}

                    {block.type === 'video' && (
                      <input 
                        type="url" 
                        className="form-input-styled" 
                        placeholder="Video Embed Link or Direct URL (e.g. MP4 link)..."
                        value={block.value}
                        onChange={(e) => updateBlockValue(block.id, e.target.value)}
                      />
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

            {/* Tab 2: Assessment Multiple Choice Quiz Builder */}
            {activeTab === 'quiz' && (
              <div className="quiz-builder-workspace animate-fade-in">
                {/* List of current questions */}
                <h4 style={{ marginBottom: '12px', fontWeight: '700', fontSize: '0.95rem' }}>Added MCQ Assessment Questions ({quizzes.length})</h4>
                
                {quizzes.length === 0 ? (
                  <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                    No quiz questions established yet. Use the constructor below.
                  </p>
                ) : (
                  <div className="quiz-questions-list">
                    {quizzes.map((q, idx) => (
                      <div key={q.id} className="quiz-question-item">
                        <div className="quiz-question-header">
                          <span style={{ fontSize: '0.82rem', fontWeight: '600' }}>Q{idx + 1}: {q.question}</span>
                          <button onClick={() => deleteQuizQuestion(q.id)} className="delete-block-btn" style={{ marginLeft: '10px' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {q.options.map((opt, oIdx) => (
                            <span key={oIdx} style={{ color: oIdx === q.correctOptionIndex ? 'var(--neon-teal)' : 'inherit', fontWeight: oIdx === q.correctOptionIndex ? '700' : 'normal' }}>
                              {String.fromCharCode(65 + oIdx)}) {opt} {oIdx === q.correctOptionIndex ? '✓' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Form to construct a new question */}
                <form onSubmit={handleAddQuizSubmit} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                  <h4 style={{ marginBottom: '14px', fontSize: '0.9rem', fontWeight: '700' }}>+ Create MCQ Question</h4>
                  
                  <div className="form-group-spaced">
                    <label className="form-label-styled" style={{ fontSize: '0.78rem' }}>Question Statement</label>
                    <input 
                      type="text" 
                      className="form-input-styled" 
                      placeholder="e.g. Which algorithm is used to adjust weights in deep learning?"
                      value={quizQuestionText}
                      onChange={(e) => setQuizQuestionText(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                    <label className="form-label-styled" style={{ fontSize: '0.78rem', marginBottom: '0' }}>MCQ Options & Correct Answer</label>
                    {quizOptions.map((option, index) => (
                      <div key={index} className="option-builder-row">
                        <input 
                          type="radio" 
                          name="correct_answer_select" 
                          className="correct-option-radio"
                          checked={quizCorrectIndex === index}
                          onChange={() => setQuizCorrectIndex(index)}
                          title="Mark as correct answer"
                        />
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
