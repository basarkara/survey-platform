import React from 'react';

export default function RelationshipInsightCard({ analysis }) {
  if (!analysis) return null;

  const { statistics, interpretation, warnings } = analysis;

  return (
    <div className="relationship-card">
      <div className={`relationship-status ${statistics.isSignificant ? 'significant' : 'neutral'}`}>
        {statistics.isSignificant
          ? 'Anlamlı ilişki görüldü'
          : 'Anlamlı ilişki görülmedi'}
      </div>

      <p className="relationship-summary">{interpretation.summary}</p>

      <div className="relationship-metrics">
        <div>
          <span>p-value</span>
          <strong>{statistics.pValue ?? '-'}</strong>
          <small>{statistics.pValue !== null ? '0.05 altı anlamlı kabul edilir' : 'Yetersiz veri'}</small>
        </div>
        <div>
          <span>Cramer's V</span>
          <strong>{statistics.cramersV ?? '-'}</strong>
          <small>İlişki gücü</small>
        </div>
        <div>
          <span>Ki-kare</span>
          <strong>{statistics.chiSquare ?? '-'}</strong>
          <small>df: {statistics.degreesOfFreedom ?? '-'}</small>
        </div>
      </div>

      <div className="relationship-details">
        {interpretation.details.map((detail, index) => (
          <p key={index}>{detail}</p>
        ))}
      </div>

      <div className="decision-advice">
        <strong>Karar önerisi</strong>
        <p>{interpretation.decisionAdvice}</p>
      </div>

      {warnings?.length > 0 && (
        <div className="relationship-warnings">
          {warnings.map((warning, index) => (
            <p key={index}>{warning}</p>
          ))}
        </div>
      )}
    </div>
  );
}
