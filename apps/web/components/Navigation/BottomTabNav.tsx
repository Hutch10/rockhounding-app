'use client';

import { Compass, Home, Map, Package, Route } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const TABS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/map', label: 'Map', icon: Map },
  { href: '/field', label: 'Field', icon: Compass },
  { href: '/trips', label: 'Trips', icon: Route },
  { href: '/collection', label: 'Collection', icon: Package },
] as const;

export function BottomTabNav(): JSX.Element | null {
  const pathname = usePathname();

  const showTabs =
    TABS.some(
      (t) => pathname === t.href || (t.href !== '/' && pathname.startsWith(`${t.href}/`))
    ) ||
    pathname.startsWith('/finds') ||
    pathname.startsWith('/location/');

  useEffect(() => {
    if (showTabs) {
      document.body.classList.add('has-tab-nav');
    } else {
      document.body.classList.remove('has-tab-nav');
    }
    return () => document.body.classList.remove('has-tab-nav');
  }, [showTabs]);

  if (!showTabs) {
    return null;
  }

  const fieldActive = pathname.startsWith('/field');

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-zinc-950/95 backdrop-blur-md safe-area-pb"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-2">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
          const isField = href === '/field';

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  active
                    ? 'text-blue-400'
                    : isField && fieldActive
                      ? 'text-emerald-400'
                      : 'text-white/40 hover:text-white/70'
                }`}
              >
                <Icon className={`h-5 w-5 ${isField && fieldActive ? 'text-emerald-400' : ''}`} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
