import React, { useState } from 'react';
import { Lightbulb, Info, CheckCircle2, Bookmark, AlertTriangle, Copy, Check } from 'lucide-react';
import './CourseraRichText.css';

interface CourseraRichTextProps {
  content: string | null | undefined;
  className?: string;
  isLead?: boolean;
}

export const CourseraRichText: React.FC<CourseraRichTextProps> = ({
  content,
  className = '',
  isLead = false,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!content || !content.trim()) {
    return null;
  }

  const handleCopyCode = (codeText: string, idx: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper to format inline markdown (bold, italic, inline code)
  const formatInlineText = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);

    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index} style={{ fontStyle: 'italic' }}>{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index} className="coursera-inline-code">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  const rawLines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];

  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let currentParagraphLines: string[] = [];

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      const paragraphText = currentParagraphLines.join(' ').trim();
      if (paragraphText) {
        renderedElements.push(
          <p key={`p-${renderedElements.length}`} className={isLead ? 'coursera-lead' : 'coursera-p'}>
            {formatInlineText(paragraphText)}
          </p>
        );
      }
      currentParagraphLines = [];
    }
  };

  const flushList = () => {
    if (currentList) {
      if (currentList.type === 'ul') {
        renderedElements.push(
          <ul key={`ul-${renderedElements.length}`} className="coursera-ul">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="coursera-li">
                {formatInlineText(item)}
              </li>
            ))}
          </ul>
        );
      } else {
        renderedElements.push(
          <ol key={`ol-${renderedElements.length}`} className="coursera-ol">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="coursera-li">
                {formatInlineText(item)}
              </li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  };

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const line = rawLine.trim();

    // Empty line
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    // Fenced Code Block (```lang)
    if (line.startsWith('```')) {
      flushParagraph();
      flushList();

      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < rawLines.length && !rawLines[i].trim().startsWith('```')) {
        codeLines.push(rawLines[i]);
        i++;
      }
      const codeString = codeLines.join('\n');
      const blockIdx = renderedElements.length;

      renderedElements.push(
        <div key={`code-${blockIdx}`} className="coursera-code-block-wrapper">
          <div className="coursera-code-header">
            <span className="coursera-code-lang">{lang || 'Code Snippet'}</span>
            <button
              type="button"
              className="coursera-code-copy-btn"
              onClick={() => handleCopyCode(codeString, blockIdx)}
              title="Copy code"
            >
              {copiedIndex === blockIdx ? (
                <>
                  <Check size={14} style={{ color: '#10b981' }} /> Copied
                </>
              ) : (
                <>
                  <Copy size={14} /> Copy
                </>
              )}
            </button>
          </div>
          <pre className="coursera-code-block">
            <code>{codeString}</code>
          </pre>
        </div>
      );
      continue;
    }

    // Dividers (--- or ***)
    if (line === '---' || line === '***' || line === '___') {
      flushParagraph();
      flushList();
      renderedElements.push(<hr key={`hr-${renderedElements.length}`} className="coursera-divider" />);
      continue;
    }

    // Headings
    if (line.startsWith('#### ')) {
      flushParagraph();
      flushList();
      renderedElements.push(
        <h4 key={`h4-${renderedElements.length}`} className="coursera-h4">
          {formatInlineText(line.replace(/^####\s+/, ''))}
        </h4>
      );
      continue;
    }
    if (line.startsWith('### ')) {
      flushParagraph();
      flushList();
      renderedElements.push(
        <h3 key={`h3-${renderedElements.length}`} className="coursera-h3">
          {formatInlineText(line.replace(/^###\s+/, ''))}
        </h3>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      flushParagraph();
      flushList();
      renderedElements.push(
        <h2 key={`h2-${renderedElements.length}`} className="coursera-h2">
          {formatInlineText(line.replace(/^##\s+/, ''))}
        </h2>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      flushParagraph();
      flushList();
      renderedElements.push(
        <h1 key={`h1-${renderedElements.length}`} className="coursera-h1">
          {formatInlineText(line.replace(/^#\s+/, ''))}
        </h1>
      );
      continue;
    }

    // Unordered List Items (- or * or •)
    const bulletMatch = line.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    // Numbered List Items (1. or 2.)
    const numberMatch = line.match(/^\d+[.)]\s+(.*)$/);
    if (numberMatch) {
      flushParagraph();
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(numberMatch[1]);
      continue;
    }

    // Callout / Note / Warning / Tip / Key Takeaway (> or Tip: or Warning: or [!WARNING])
    if (line.startsWith('>') || /^(\*\*?(?:Note|Tip|Important|Warning|Caution|Key Takeaway|Pro Tip|Takeaway|Summary)[\w\s]*:\*\*?)/i.test(line)) {
      flushParagraph();
      flushList();
      const cleanLine = line.replace(/^>\s*/, '');
      const isWarning = /warning|caution|danger|alert|\[!WARNING\]|\[!CAUTION\]/i.test(cleanLine);
      const isTip = /tip|pro tip|\[!TIP\]/i.test(cleanLine);
      const isTakeaway = /takeaway|summary/i.test(cleanLine);

      const calloutTypeClass = isWarning ? 'warning' : isTip ? 'tip' : isTakeaway ? 'takeaway' : 'info';
      const calloutTitle = isWarning ? 'Compliance Warning' : isTakeaway ? 'Key Takeaway' : isTip ? 'Pro Tip' : 'Important Note';

      const strippedContent = cleanLine
        .replace(/^\[!(?:WARNING|CAUTION|TIP|NOTE|IMPORTANT)\]\s*/i, '')
        .replace(/^(\*\*?(?:Note|Tip|Important|Warning|Caution|Key Takeaway|Pro Tip|Takeaway|Summary)[\w\s]*:\*\*?\s*)/i, '');

      renderedElements.push(
        <div key={`callout-${renderedElements.length}`} className={`coursera-callout ${calloutTypeClass}`}>
          <div className="coursera-callout-icon">
            {isWarning ? (
              <AlertTriangle size={20} />
            ) : isTakeaway ? (
              <Bookmark size={20} />
            ) : isTip ? (
              <Lightbulb size={20} />
            ) : (
              <Info size={20} />
            )}
          </div>
          <div className="coursera-callout-body">
            <div className="coursera-callout-title">
              {calloutTitle}
            </div>
            <div>{formatInlineText(strippedContent)}</div>
          </div>
        </div>
      );
      continue;
    }

    // Regular paragraph text line
    if (currentList) {
      flushList();
    }
    currentParagraphLines.push(line);
  }

  flushParagraph();
  flushList();

  return (
    <div className={`coursera-content-container ${className}`}>
      {renderedElements}
    </div>
  );
};
