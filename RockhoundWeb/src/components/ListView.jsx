// ListView.jsx - v1.4.0
import React, { useState } from 'react';
import CustomViewPicker from './CustomViewPicker';

export default function ListView({ specimens, setSpecimens, customViews, setCustomViews }) {
  const [activeViewId, setActiveViewId] = useState(customViews[0]?.id || 'default');
  const activeView = customViews.find(v => v.id === activeViewId) || {
    id: 'default',
    name: 'Default View',
    filters: {},
    sort: {},
    visibleFields: ['name', 'tags', 'photos'],
  };

  // Deterministic filter/sort logic (placeholder)
  const filteredSpecimens = specimens; // TODO: apply activeView.filters/sort

  return (
    <div>
      <CustomViewPicker
        views={[{ id: 'default', name: 'Default View' }, ...customViews]}
        activeViewId={activeViewId}
        onSelect={setActiveViewId}
      />
      <ul>
        {filteredSpecimens.map(s => (
          <li key={s.id}>{s.name} ({s.tags.join(', ')})</li>
        ))}
      </ul>
    </div>
  );
}
