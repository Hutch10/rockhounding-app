// SpecimenForm.jsx - v1.4.0 (partial, deterministic shell)
import React from 'react';
import RelationshipEditor from './RelationshipEditor';
import AnnotationPanel from './AnnotationPanel';

export default function SpecimenForm({ specimen, allSpecimens, onChange }) {
  // Deterministic update handlers
  const handleRelatedAdd = id => {
    if (!specimen.relatedIds.includes(id) && id !== specimen.id) {
      onChange({ ...specimen, relatedIds: [...specimen.relatedIds, id] });
    }
  };
  const handleRelatedRemove = id => {
    onChange({ ...specimen, relatedIds: specimen.relatedIds.filter(rid => rid !== id) });
  };
  const handleAnnotationAdd = annotation => {
    onChange({ ...specimen, annotations: [...specimen.annotations, annotation] });
  };
  const handleAnnotationEdit = annotation => {
    onChange({ ...specimen, annotations: specimen.annotations.map(a => a.id === annotation.id ? annotation : a) });
  };
  const handleAnnotationDelete = id => {
    onChange({ ...specimen, annotations: specimen.annotations.filter(a => a.id !== id) });
  };
  return (
    <div>
      <h3>Edit Specimen: {specimen.name}</h3>
      {/* ...other fields... */}
      <RelationshipEditor
        specimenId={specimen.id}
        allSpecimens={allSpecimens}
        relatedIds={specimen.relatedIds}
        onAdd={handleRelatedAdd}
        onRemove={handleRelatedRemove}
      />
      <AnnotationPanel
        annotations={specimen.annotations}
        target={{ type: 'specimen', ref: specimen.id }}
        onAdd={handleAnnotationAdd}
        onEdit={handleAnnotationEdit}
        onDelete={handleAnnotationDelete}
      />
    </div>
  );
}
