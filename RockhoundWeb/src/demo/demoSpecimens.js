// Demo Specimens for v1.4.0
export const demoSpecimens = [
  {
    id: 1,
    name: 'Quartz Cluster',
    notes: 'Clear quartz with minor inclusions.',
    tags: ['Quartz', 'Cluster'],
    photos: ['photo1.jpg'],
    customFields: [],
    history: [],
    attachments: [],
    attachmentTypes: [],
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
    templateId: undefined,
    relatedIds: [2],
    annotations: [
      {
        id: 'a1',
        type: 'text',
        target: { type: 'photo', ref: 'photo1.jpg' },
        data: 'Note on photo',
        createdAt: '2026-01-01T10:01:00Z',
        updatedAt: '2026-01-01T10:01:00Z'
      }
    ]
  },
  {
    id: 2,
    name: 'Amethyst Point',
    notes: 'Deep purple, single point.',
    tags: ['Amethyst'],
    photos: ['photo2.jpg'],
    customFields: [],
    history: [],
    attachments: [],
    attachmentTypes: [],
    createdAt: '2026-01-01T11:00:00Z',
    updatedAt: '2026-01-01T11:00:00Z',
    templateId: undefined,
    relatedIds: [1],
    annotations: [
      {
        id: 'a2',
        type: 'marker',
        target: { type: 'photo', ref: 'photo2.jpg', region: { x: 0.5, y: 0.5 } },
        data: { color: 'red' },
        createdAt: '2026-01-01T11:01:00Z',
        updatedAt: '2026-01-01T11:01:00Z'
      }
    ]
  }
];
