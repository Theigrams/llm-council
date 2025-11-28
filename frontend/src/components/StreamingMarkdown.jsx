import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import './StreamingMarkdown.css';

/**
 * Sanitize streaming markdown content by closing unclosed tags
 */
function sanitizeStreamingMarkdown(content) {
  if (!content) return '';

  let text = content;

  // Handle unclosed code blocks
  const codeBlockCount = (text.match(/```/g) || []).length;
  if (codeBlockCount % 2 !== 0) {
    text += '\n```';
  }

  // Handle unclosed inline code (simple check)
  const backtickCount = (text.match(/`/g) || []).length;
  // After closing code blocks, check remaining backticks
  const remainingBackticks = backtickCount - (codeBlockCount * 3);
  if (remainingBackticks % 2 !== 0) {
    text += '`';
  }

  // Handle unclosed bold
  const boldCount = (text.match(/\*\*/g) || []).length;
  if (boldCount % 2 !== 0) {
    text += '**';
  }

  return text;
}

export default function StreamingMarkdown({ content, isStreaming = false }) {
  const sanitizedContent = useMemo(() => {
    if (!isStreaming) return content || '';
    return sanitizeStreamingMarkdown(content);
  }, [content, isStreaming]);

  return (
    <div className={isStreaming ? 'streaming-content' : ''}>
      <ReactMarkdown>{sanitizedContent}</ReactMarkdown>
      {isStreaming && <span className="cursor-blink">|</span>}
    </div>
  );
}
