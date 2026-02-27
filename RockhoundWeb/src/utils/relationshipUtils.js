// relationshipUtils.js - v1.4.0
export function addBidirectionalRelationship(specimens, idA, idB) {
  return specimens.map(s => {
    if (s.id === idA && !s.relatedIds.includes(idB) && s.id !== idB) {
      return { ...s, relatedIds: [...s.relatedIds, idB] };
    }
    if (s.id === idB && !s.relatedIds.includes(idA) && s.id !== idA) {
      return { ...s, relatedIds: [...s.relatedIds, idA] };
    }
    return s;
  });
}

export function removeBidirectionalRelationship(specimens, idA, idB) {
  return specimens.map(s => {
    if (s.id === idA) {
      return { ...s, relatedIds: s.relatedIds.filter(id => id !== idB) };
    }
    if (s.id === idB) {
      return { ...s, relatedIds: s.relatedIds.filter(id => id !== idA) };
    }
    return s;
  });
}

export function removeAllReferencesToId(specimens, id) {
  return specimens.map(s => ({ ...s, relatedIds: s.relatedIds.filter(rid => rid !== id) }));
}
