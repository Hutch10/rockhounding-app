import Link from 'next/link';

export default function TripsPage(): JSX.Element {
  return (
    <main className="min-h-screen bg-zinc-950 p-6 max-w-lg mx-auto">
      <h1 className="text-xl font-black text-white uppercase">Trips</h1>
      <p className="text-sm text-white/50 mt-2">Trip planning ships in Sprint 5.</p>
      <Link href="/" className="mt-6 inline-block text-sm text-blue-400 hover:underline">
        ← Home
      </Link>
    </main>
  );
}
