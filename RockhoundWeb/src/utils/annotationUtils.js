// annotationUtils.js - v1.4.0
export function filterAnnotationsByTarget(annotations, targetType, ref) {
  return annotations.filter(a => a.target.type === targetType && a.target.ref === ref);
}

export function removeAnnotationsForTarget(annotations, targetType, ref) {
  return annotations.filter(a => !(a.target.type === targetType && a.target.ref === ref));
}

export function isValidAnnotationTarget(specimen, target) {
  if (target.type === 'photo') return specimen.photos.includes(target.ref);
  if (target.type === 'attachment') return specimen.attachments.includes(target.ref);
  if (target.type === 'specimen') return specimen.id === target.ref;
  return false;
}
