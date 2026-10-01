import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ state: string }>;
}

const STATE_RE = /^[a-z]{2}$/i;

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { state } = await props.params;
  return {
    title: `Rockhounding in ${state.toUpperCase()} · Rocky Atlas`,
    description: 'State discovery for admitted published sites only.',
  };
}

export default async function StateDiscoveryPage(props: PageProps): Promise<JSX.Element> {
  const { state } = await props.params;
  if (!STATE_RE.test(state)) notFound();
  const code = state.toUpperCase();
  return (
    <main className="min-h-screen bg-stone-100 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500">Rocky Atlas</p>
        <h1 className="text-3xl font-bold text-stone-900">{code}</h1>
        <p className="text-sm text-stone-600 rounded-xl border border-amber-200 bg-amber-50 p-4">
          Public state pages list admitted/published records only. No nationwide unverified
          inventory is generated here.
        </p>
        <Link
          href={`/fee-mines/${code.toLowerCase()}`}
          className="text-sm text-blue-700 hover:underline"
        >
          Fee mines in {code}
        </Link>
      </div>
    </main>
  );
}
