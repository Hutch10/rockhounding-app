// Demo Custom Views for v1.4.0
export const demoCustomViews = [
  {
    id: 'favorites',
    name: 'Favorites',
    filters: { tags: ['Favorite'] },
    sort: { field: 'name', direction: 'asc' },
    visibleFields: ['name', 'tags', 'photos'],
    createdAt: '2026-01-01T12:00:00Z',
    updatedAt: '2026-01-01T12:00:00Z'
  },
  {
    id: 'by-quartz',
    name: 'By Tag: Quartz',
    filters: { tags: ['Quartz'] },
    sort: { field: 'createdAt', direction: 'desc' },
    visibleFields: ['name', 'tags', 'createdAt'],
    createdAt: '2026-01-01T12:05:00Z',
    updatedAt: '2026-01-01T12:05:00Z'
  }
];
