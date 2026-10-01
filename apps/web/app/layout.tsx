import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';

import Providers from './providers';

import { ConnectivityListener } from '@/components/ConnectivityListener';
import { HighGlareBoot } from '@/components/Field/HighGlareControl';
import { MainShell } from '@/components/Navigation/MainShell';
import { SyncStatusPanel } from '@/components/Sync/SyncStatusPanel';

import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const siteDescription =
  'Launch-cohort rockhounding map and field log. Recorded access is not collecting permission; geological context is not a verified claim.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Rocky Atlas',
  description: siteDescription,
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'Rocky Atlas',
    description: siteDescription,
    type: 'website',
    siteName: 'Rocky Atlas',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body>
        <Providers>
          <HighGlareBoot />
          <MainShell>{children}</MainShell>
          <ConnectivityListener />
          <SyncStatusPanel />
          <Toaster position="top-center" expand={false} richColors />
        </Providers>
      </body>
    </html>
  );
}
