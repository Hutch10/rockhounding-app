/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-floating-promises */
'use client';
import { useState, useEffect } from 'react';

import { initStorageManager } from '@/lib/storage/manager';
import { syncManager } from '@/lib/sync/orchestrator';

export default function Providers({ children }: { children: React.ReactNode }): JSX.Element {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  );

  useEffect(() => {
    async function init() {
      try {
        await initStorageManager();
        syncManager.startHeartbeat(15000); // 15s interval for dev/staging
      } catch (err) {
        console.error('Failed to initialize sync context:', err);
      }
    }
    init();
    return () => syncManager.stopHeartbeat();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
