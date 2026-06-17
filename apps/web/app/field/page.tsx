import type { Metadata } from 'next';

import { FieldModeClient } from './FieldModeClient';

export const metadata: Metadata = {
  title: 'Field Mode - Rockhound',
  description: 'Full-screen field logging and GPS shell',
};

export default function FieldPage(): JSX.Element {
  return <FieldModeClient />;
}
