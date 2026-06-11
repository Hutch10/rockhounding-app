import { Suspense } from 'react';

export default function LoginLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>{children}</Suspense>;
}
