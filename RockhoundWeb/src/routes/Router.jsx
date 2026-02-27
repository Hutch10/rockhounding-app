// Router.jsx - v1.4.0
import React from 'react';
import ListView from '../components/ListView';
import SpecimenForm from '../components/SpecimenForm';
import SpecimenDetail from './SpecimenDetail';

export default function Router({ specimens, setSpecimens, customViews, setCustomViews }) {
  // For simplicity, always show ListView (replace with real routing as needed)
  return (
    <ListView
      specimens={specimens}
      setSpecimens={setSpecimens}
      customViews={customViews}
      setCustomViews={setCustomViews}
    />
  );
}
