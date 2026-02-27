// AnnotationPanel.jsx - v1.4.0
import React from 'react';

export default function AnnotationPanel({ annotations, target, onAdd, onEdit, onDelete }) {
  const filtered = annotations.filter(a => a.target.type === target.type && a.target.ref === target.ref);
  return (
    <div>
      <h4>Annotations</h4>
      <ul>
        {filtered.map(a => (
          <li key={a.id}>
            [{a.type}] {typeof a.data === 'string' ? a.data : JSON.stringify(a.data)}
            <button onClick={() => onEdit(a)}>Edit</button>
            <button onClick={() => onDelete(a.id)}>Delete</button>
          </li>
        ))}
      </ul>
      <button onClick={() => onAdd({
        id: Math.random().toString(36).slice(2),
        type: 'text',
        target,
        data: 'New annotation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })}>Add Annotation</button>
    </div>
  );
}
