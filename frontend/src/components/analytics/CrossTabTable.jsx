import React from 'react';

export default function CrossTabTable({ analysis }) {
  if (!analysis?.table?.length) return null;

  return (
    <div className="crosstab-table-wrap">
      <div className="crosstab-meta">
        <span>Geçerli yanıt: {analysis.totalValidResponses}</span>
        <span>Eksik/eşleşmeyen yanıt: {analysis.missingResponses}</span>
        {analysis.expandedObservationCount !== analysis.totalValidResponses && (
          <span>Analiz gözlemi: {analysis.expandedObservationCount}</span>
        )}
      </div>

      <table className="crosstab-table">
        <thead>
          <tr>
            <th>{analysis.rowQuestion.text}</th>
            {analysis.columnTotals.map((column) => (
              <th key={column.columnValue}>
                {column.columnValue}
                <span>{column.count} toplam</span>
              </th>
            ))}
            <th>Satır Toplamı</th>
          </tr>
        </thead>
        <tbody>
          {analysis.table.map((row) => (
            <tr key={row.rowValue}>
              <th>{row.rowValue}</th>
              {row.columns.map((cell) => (
                <td key={`${row.rowValue}-${cell.columnValue}`}>
                  <strong>{cell.count}</strong>
                  <span>Satır: %{cell.rowPercentage}</span>
                  <span>Toplam: %{cell.totalPercentage}</span>
                </td>
              ))}
              <td className="crosstab-total">{row.rowTotal}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
