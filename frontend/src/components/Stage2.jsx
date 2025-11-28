import { useState, useEffect } from 'react';
import StreamingMarkdown from './StreamingMarkdown';
import CopyButton from './CopyButton';
import './Stage2.css';

function deAnonymizeText(text, labelToModel) {
  if (!labelToModel) return text;

  let result = text;
  // Replace each "Response X" with the actual model name
  Object.entries(labelToModel).forEach(([label, model]) => {
    const modelShortName = model.split('/')[1] || model;
    result = result.replace(new RegExp(label, 'g'), `**${modelShortName}**`);
  });
  return result;
}

export default function Stage2({ rankings, streaming, labelToModel, aggregateRankings }) {
  const [activeTab, setActiveTab] = useState(0);

  // Build display data from streaming or final rankings
  const hasStreaming = streaming && Object.keys(streaming).length > 0;

  const displayData = hasStreaming
    ? Object.entries(streaming).map(([model, content]) => ({
        model,
        ranking: content,
        parsed_ranking: [],
        isStreaming: true
      }))
    : (rankings || []).map(r => ({ ...r, isStreaming: false }));

  // Reset active tab if it's out of bounds
  useEffect(() => {
    if (activeTab >= displayData.length && displayData.length > 0) {
      setActiveTab(0);
    }
  }, [displayData.length, activeTab]);

  if (displayData.length === 0) {
    return (
      <div className="stage stage2">
        <h3 className="stage-title">Stage 2: Peer Rankings</h3>
        <div className="stage-loading">
          <div className="spinner"></div>
          <span>Models are evaluating each other's responses...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="stage stage2">
      <h3 className="stage-title">Stage 2: Peer Rankings</h3>

      <h4>Raw Evaluations</h4>
      <p className="stage-description">
        Each model evaluated all responses (anonymized as Response A, B, C, etc.) and provided rankings.
        {!hasStreaming && ' Below, model names are shown in '}
        {!hasStreaming && <strong>bold</strong>}
        {!hasStreaming && ' for readability, but the original evaluation used anonymous labels.'}
      </p>

      <div className="tabs">
        {displayData.map((rank, index) => (
          <button
            key={rank.model}
            className={`tab ${activeTab === index ? 'active' : ''} ${rank.isStreaming ? 'streaming' : ''}`}
            onClick={() => setActiveTab(index)}
          >
            {rank.model.split('/')[1] || rank.model}
            {rank.isStreaming && <span className="streaming-dot"></span>}
          </button>
        ))}
      </div>

      <div className="tab-content">
        <div className="content-header">
          <div className="ranking-model">
            {displayData[activeTab].model}
          </div>
          {!displayData[activeTab].isStreaming && (
            <CopyButton text={deAnonymizeText(displayData[activeTab].ranking, labelToModel)} />
          )}
        </div>
        <div className="ranking-content markdown-content">
          <StreamingMarkdown
            content={
              displayData[activeTab].isStreaming
                ? displayData[activeTab].ranking
                : deAnonymizeText(displayData[activeTab].ranking, labelToModel)
            }
            isStreaming={displayData[activeTab].isStreaming}
          />
        </div>

        {!displayData[activeTab].isStreaming &&
         displayData[activeTab].parsed_ranking &&
         displayData[activeTab].parsed_ranking.length > 0 && (
          <div className="parsed-ranking">
            <strong>Extracted Ranking:</strong>
            <ol>
              {displayData[activeTab].parsed_ranking.map((label, i) => (
                <li key={i}>
                  {labelToModel && labelToModel[label]
                    ? labelToModel[label].split('/')[1] || labelToModel[label]
                    : label}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {aggregateRankings && aggregateRankings.length > 0 && (
        <div className="aggregate-rankings">
          <h4>Aggregate Rankings (Street Cred)</h4>
          <p className="stage-description">
            Combined results across all peer evaluations (lower score is better):
          </p>
          <div className="aggregate-list">
            {aggregateRankings.map((agg, index) => (
              <div key={index} className="aggregate-item">
                <span className="rank-position">#{index + 1}</span>
                <span className="rank-model">
                  {agg.model.split('/')[1] || agg.model}
                </span>
                <span className="rank-score">
                  Avg: {agg.average_rank.toFixed(2)}
                </span>
                <span className="rank-count">
                  ({agg.rankings_count} votes)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
