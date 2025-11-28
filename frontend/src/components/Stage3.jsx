import StreamingMarkdown from './StreamingMarkdown';
import './Stage3.css';

export default function Stage3({ finalResponse, streaming }) {
  // Show streaming content while loading, final content when done
  const isStreaming = !!streaming;
  const displayContent = streaming || finalResponse?.response || '';

  if (!finalResponse && !streaming) {
    return (
      <div className="stage stage3">
        <h3 className="stage-title">Stage 3: Final Council Answer</h3>
        <div className="stage-loading">
          <div className="spinner"></div>
          <span>Chairman is synthesizing the final answer...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="stage stage3">
      <h3 className="stage-title">Stage 3: Final Council Answer</h3>
      <div className="final-response">
        <div className="chairman-label">
          Chairman: {finalResponse?.model?.split('/')[1] || finalResponse?.model || 'Synthesizing...'}
          {isStreaming && <span className="streaming-indicator"> (streaming...)</span>}
        </div>
        <div className="final-text markdown-content">
          <StreamingMarkdown content={displayContent} isStreaming={isStreaming} />
        </div>
      </div>
    </div>
  );
}
