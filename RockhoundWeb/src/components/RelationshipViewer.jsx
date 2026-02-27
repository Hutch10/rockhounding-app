// RelationshipViewer.jsx - v1.4.0
import React from 'react';

export default function RelationshipViewer({ relatedSpecimens }) {
  return (
    <div>
      <h4>Related Specimens</h4>
      <ul>
        {relatedSpecimens.map(s => (
          <li key={s.id}>{s.name}</li>
        ))}
      </ul>
    </div>
  );
}
