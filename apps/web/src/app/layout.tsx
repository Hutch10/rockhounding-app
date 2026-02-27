import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rockhounding App',
  description: 'National-scale geospatial app for rockhounding locations and geologist observations',
  manifest: '/manifest.json',
  themeColor: '#000000',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
