import Link from 'next/link';

export default function FieldPage(): JSX.Element {
  return (
    <main className="min-h-screen bg-zinc-950 p-6 max-w-lg mx-auto">
      <h1 className="text-xl font-black text-white uppercase">Field Mode</h1>
      <p className="text-sm text-white/50 mt-2">Full field UX ships in Sprint 4.</p>
      <Link href="/" className="mt-6 inline-block text-sm text-blue-400 hover:underline">
        ← Home
      </Link>
    </main>
  );
}
