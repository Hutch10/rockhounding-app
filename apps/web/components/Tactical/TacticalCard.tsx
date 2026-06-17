'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface TacticalCardProps {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
}

export function TacticalCard({
  title,
  icon: Icon,
  children,
  className = '',
  headerAction,
}: TacticalCardProps): JSX.Element {
  return (
    <div className={`tactical-panel flex flex-col ${className}`}>
      <div className="tactical-header justify-between">
        <div className="flex items-center gap-3">
          {Icon != null ? <Icon className="w-4 h-4 text-blue-400" /> : null}
          <span className="gradient-text">{title}</span>
        </div>
        {headerAction != null ? (
          <div className="flex items-center gap-2">{headerAction}</div>
        ) : null}
      </div>
      <div className="flex-1 p-4 relative">{children}</div>
    </div>
  );
}
