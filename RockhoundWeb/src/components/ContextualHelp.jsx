// ContextualHelp.jsx - v1.4.0
import React from 'react';

export default function ContextualHelp({ contextKey, onClose }) {
  // Minimal deterministic help
  return (
    <div className="contextual-help">
      <h3>Help: {contextKey}</h3>
      <p>Contextual help content for {contextKey}.</p>
      <button onClick={onClose}>Close</button>
    </div>
  );
}
