import Link from 'next/link';

/**
 * Collection gallery and scientific-record framing.
 * Remote specimen rows require an active backend session, so this page does not invent them.
 * Empty datasets must render; discovery ledger mapping is fail-closed without throwing.
 */
export default function CollectionPage(): JSX.Element {
  return (
    <main
      className="mx-auto min-h-screen max-w-lg space-y-4 bg-zinc-950 p-4 text-white"
      data-testid="collection-page"
    >
      <h1 className="text-xl font-black uppercase">Collection</h1>
      <section className="rounded-xl border border-white/15 p-3" aria-label="Collection gallery">
        <h2 className="text-sm font-bold uppercase tracking-wide">Gallery</h2>
        <p className="mt-2 text-sm text-white/80">
          No specimen images are loaded on this screen. A gallery card would be a candidate record,
          not a confirmed identification. An empty collection is a valid state.
        </p>
        <Link
          href="/finds"
          className="mt-3 inline-flex min-h-12 items-center text-sm font-bold text-amber-300"
          data-testid="collection-open-finds"
        >
          Open discovery ledger
        </Link>
      </section>
      <section className="rounded-xl border border-white/15 p-3" aria-label="Scientific record">
        <h2 className="text-sm font-bold uppercase tracking-wide">Scientific record</h2>
        <p className="mt-2 text-sm text-white/80">
          An observation is not a confirmed identification. Later notes are a new record. They do
          not rewrite the original observation. Provenance explains lineage and is not shown here as
          truth.
        </p>
      </section>
    </main>
  );
}
