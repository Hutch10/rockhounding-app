'use client';

import React, { useState } from 'react';

import { QuickAddModal } from '@/components/Finds/QuickAddModal';

/**
 * QUICK ADD TRIGGER
 *
 * Simple client-side toggle for the field logging modal.
 */

export const QuickAddButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-900/40 transition-all active:scale-95 flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
            clipRule="evenodd"
          />
        </svg>
        Log Find
      </button>

      {isOpen && <QuickAddModal onClose={() => setIsOpen(false)} />}
    </>
  );
};
