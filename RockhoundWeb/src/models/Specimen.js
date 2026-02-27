// Canonical Specimen Model for v1.4.0
export const SpecimenModelV140 = {
  id: 0,
  name: '',
  notes: '',
  tags: [],
  photos: [],
  customFields: [],
  history: [],
  attachments: [],
  attachmentTypes: [],
  createdAt: '',
  updatedAt: '',
  templateId: undefined,
  relatedIds: [],
  annotations: []
};

// TypeScript type for reference
type Annotation = {
  id: string;
  type: 'text' | 'marker' | 'drawing' | 'audio' | 'other';
  target: {
    type: 'photo' | 'attachment' | 'specimen';
    ref: string;
    region?: { x: number; y: number; w?: number; h?: number };
  };
  data: any;
  createdAt: string;
  updatedAt: string;
};
