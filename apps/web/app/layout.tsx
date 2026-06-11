import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';

import Providers from './providers';

import { ConnectivityListener } from '@/components/ConnectivityListener';
import { MainShell } from '@/components/Navigation/MainShell';
import { SyncStatusPanel } from '@/components/Sync/SyncStatusPanel';

import './globals.css';

export const metadata: Metadata = {
  title: 'Rockhounding App',
  description:
    'National-scale geospatial app for rockhounding locations and geologist observations',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body>
        <Providers>
          <MainShell>{children}</MainShell>
          <ConnectivityListener />
          <SyncStatusPanel />
          <Toaster position="top-center" expand={false} richColors />
        </Providers>
      </body>
    </html>
  );
}
