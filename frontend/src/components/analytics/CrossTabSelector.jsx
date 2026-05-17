import React from 'react';

const SUPPORTED_TYPES = ['boolean', 'multiple_choice', 'multi_select', 'scale', 'star'];

export default function CrossTabSelector({
  questions,
  rowQuestionId,
  columnQuestionId,
  onRowChange,
  onColumnChange,
  onAnalyze,
  loading,
}) {
  return (
    <div className="analytics-selector">
      <div className="form-group">
        <label className="form-label">Satır Sorusu</label>
        <select
          className="form-input"
          value={rowQuestionId}
          onChange={(e) => onRowChange(e.target.value)}
        >
          <option value="">Satır sorusu seçin</option>
          {questions.map((question) => (
            <option
              key={question.soru_id}
              value={question.soru_id}
              disabled={!SUPPORTED_TYPES.includes(question.soru_tipi)}
            >
              {question.soru_metni}
              {!SUPPORTED_TYPES.includes(question.soru_tipi) ? ' - Text questions are not supported for cross-tab analysis.' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Sütun Sorusu</label>
        <select
          className="form-input"
          value={columnQuestionId}
          onChange={(e) => onColumnChange(e.target.value)}
        >
          <option value="">Sütun sorusu seçin</option>
          {questions.map((question) => (
            <option
              key={question.soru_id}
              value={question.soru_id}
              disabled={!SUPPORTED_TYPES.includes(question.soru_tipi)}
            >
              {question.soru_metni}
              {!SUPPORTED_TYPES.includes(question.soru_tipi) ? ' - Text questions are not supported for cross-tab analysis.' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group analytics-selector-action">
        <button className="btn btn-primary btn-full" onClick={onAnalyze} disabled={loading}>
          {loading ? 'Analiz Ediliyor...' : 'Analyze'}
        </button>
      </div>
    </div>
  );
}
