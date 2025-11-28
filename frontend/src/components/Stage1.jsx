import { useState, useEffect } from 'react';
import StreamingMarkdown from './StreamingMarkdown';
import './Stage1.css';

export default function Stage1({ responses, streaming }) {
  const [activeTab, setActiveTab] = useState(0);

  // Build display data from streaming or final responses
  const hasStreaming = streaming && Object.keys(streaming).length > 0;

  const displayData = hasStreaming
    ? Object.entries(streaming).map(([model, content]) => ({
        model,
        response: content,
        isStreaming: true
      }))
    : (responses || []).map(r => ({ ...r, isStreaming: false }));

  // Reset active tab if it's out of bounds
  useEffect(() => {
    if (activeTab >= displayData.length && displayData.length > 0) {
      setActiveTab(0);
    }
  }, [displayData.length, activeTab]);

  if (displayData.length === 0) {
    return (
      <div className="stage stage1">
        <h3 className="stage-title">Stage 1: Individual Responses</h3>
        <div className="stage-loading">
          <div className="spinner"></div>
          <span>Collecting responses from models...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="stage stage1">
      <h3 className="stage-title">Stage 1: Individual Responses</h3>

      <div className="tabs">
        {displayData.map((resp, index) => (
          <button
            key={resp.model}
            className={`tab ${activeTab === index ? 'active' : ''} ${resp.isStreaming ? 'streaming' : ''}`}
            onClick={() => setActiveTab(index)}
          >
            {resp.model.split('/')[1] || resp.model}
            {resp.isStreaming && <span className="streaming-dot"></span>}
          </button>
        ))}
      </div>

      <div className="tab-content">
        <div className="model-name">{displayData[activeTab].model}</div>
        <div className="response-text markdown-content">
          <StreamingMarkdown
            content={displayData[activeTab].response}
            isStreaming={displayData[activeTab].isStreaming}
          />
        </div>
      </div>
    </div>
  );
}
