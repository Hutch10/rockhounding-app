// CustomViewManager.jsx - v1.4.0
import React, { useState } from 'react';

export default function CustomViewManager({ views, activeViewId, onCreate, onEdit, onDelete, onSelect }) {
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');

  return (
    <div>
      <h3>Custom Views</h3>
      <ul>
        {views.map(view => (
          <li key={view.id}>
            <button onClick={() => onSelect(view.id)}>{view.name}</button>
            <button onClick={() => { setEditing(view.id); setName(view.name); }}>Edit</button>
            <button onClick={() => onDelete(view.id)}>Delete</button>
          </li>
        ))}
      </ul>
      <div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="View name" />
        <button onClick={() => { onCreate({ id: name.toLowerCase().replace(/\s+/g, '-'), name }); setName(''); }}>Create</button>
        {editing && <button onClick={() => { onEdit({ id: editing, name }); setEditing(null); setName(''); }}>Save</button>}
      </div>
    </div>
  );
}
