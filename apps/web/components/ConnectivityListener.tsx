/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises */
'use client';

import { Wifi, WifiOff } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { syncManager } from '@/lib/sync/orchestrator';

export function ConnectivityListener() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleOnline = () => {
      toast.success('Back Online', {
        description: 'Syncing queued field logs…',
        icon: <Wifi className="w-4 h-4 text-green-500" />,
      });

      void syncManager.flush();

      if (pathname === '/offline') {
        router.push('/');
      }
    };

    const handleOffline = () => {
      toast.error('Signal Lost', {
        description: 'You are now working in offline mode.',
        icon: <WifiOff className="w-4 h-4 text-red-500" />,
        duration: Infinity,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pathname, router]);

  return null;
}
