// RelationshipEditor.jsx - v1.4.0
import React from 'react';

export default function RelationshipEditor({ specimenId, allSpecimens, relatedIds, onAdd, onRemove }) {
  return (
    <div>
      <h4>Related Specimens</h4>
      <ul>
        {relatedIds.map(id => {
          const s = allSpecimens.find(sp => sp.id === id);
          return s ? (
            <li key={id}>{s.name} <button onClick={() => onRemove(id)}>Remove</button></li>
          ) : null;
        })}
      </ul>
      <select onChange={e => onAdd(Number(e.target.value))} value="">
        <option value="">Add related specimen...</option>
        {allSpecimens.filter(s => s.id !== specimenId && !relatedIds.includes(s.id)).map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </div>
  );
}
