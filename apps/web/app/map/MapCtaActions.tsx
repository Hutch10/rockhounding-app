'use client';

import Link from 'next/link';

type CtaConfig = {
  href: string;
  label: string;
  id: string;
  className: string;
};

const CTAS: CtaConfig[] = [
  {
    href: '/dashboard?source=map_header_cta&intent=beta_access',
    label: 'Request Beta Access',
    id: 'map_cta_request_beta_access',
    className:
      'flex min-h-11 w-full items-center justify-center rounded-md bg-green-600 px-4 py-2.5 text-center text-sm font-semibold text-white no-underline transition hover:bg-green-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900',
  },
  {
    href: '/state-packs?source=map_header_cta&intent=browse_state_packs',
    label: 'Browse State Packs',
    id: 'map_cta_browse_state_packs',
    className:
      'flex min-h-11 w-full items-center justify-center rounded-md border border-gray-600 px-4 py-2.5 text-center text-sm font-medium text-gray-100 no-underline transition hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900',
  },
  {
    href: '/observations/new?source=map_header_cta&intent=report_location',
    label: 'Report a Location',
    id: 'map_cta_report_location',
    className:
      'flex min-h-11 w-full items-center justify-center rounded-md border border-gray-600 px-4 py-2.5 text-center text-sm font-medium text-gray-100 no-underline transition hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900',
  },
];

export function MapCtaActions(): JSX.Element {
  const trackCtaClick = (ctaId: string, ctaLabel: string): void => {
    if (typeof window === 'undefined') return;

    const eventPayload = {
      cta_id: ctaId,
      cta_label: ctaLabel,
      source: 'map_header_cta',
    };

    const win = window as Window & {
      dataLayer?: Array<Record<string, unknown>>;
      gtag?: (command: 'event', eventName: string, params: Record<string, unknown>) => void;
    };

    if (Array.isArray(win.dataLayer)) {
      win.dataLayer.push({
        event: 'map_cta_click',
        ...eventPayload,
      });
    }

    if (typeof win.gtag === 'function') {
      win.gtag('event', 'map_cta_click', eventPayload);
    }
  };

  return (
    <nav aria-label="Map actions" className="mt-4">
      <ul className="m-0 flex list-none flex-col gap-3 p-0 md:flex-row md:flex-wrap md:gap-4">
        {CTAS.map((cta) => (
          <li key={cta.id} className="min-w-0 md:flex-1 md:basis-[12rem]">
            <Link
              href={cta.href}
              className={cta.className}
              onClick={() => {
                trackCtaClick(cta.id, cta.label);
              }}
            >
              {cta.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
