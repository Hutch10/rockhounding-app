'use client';

import { BottomTabNav } from './BottomTabNav';

interface MainShellProps {
  children: React.ReactNode;
}

export function MainShell({ children }: MainShellProps): JSX.Element {
  return (
    <>
      {children}
      <BottomTabNav />
    </>
  );
}
