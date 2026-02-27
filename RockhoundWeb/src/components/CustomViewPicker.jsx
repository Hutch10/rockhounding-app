// CustomViewPicker.jsx - v1.4.0
import React from 'react';

export default function CustomViewPicker({ views, activeViewId, onSelect }) {
  return (
    <select value={activeViewId} onChange={e => onSelect(e.target.value)}>
      {views.map(view => (
        <option key={view.id} value={view.id}>{view.name}</option>
      ))}
    </select>
  );
}
