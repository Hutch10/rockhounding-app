'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { SyncStatusPanel } from '@/components/Sync/SyncStatusPanel';

import { createClient } from '@/lib/supabase/client';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  missing_code: 'Magic link was incomplete. Request a new link.',
  config: 'Authentication is not configured. Contact support.',
  auth: 'Sign-in failed. Request a new magic link.',
};

function LoginContent(): JSX.Element {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/';
  const authError = searchParams.get('error');
  const callbackError =
    authError != null ? (AUTH_ERROR_MESSAGES[authError] ?? 'Sign-in failed.') : null;

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (email.trim() === '') {
      return;
    }

    setStatus('sending');
    setMessage('');

    const supabase = createClient();
    const origin = window.location.origin;

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
      },
    });

    if (error != null) {
      setStatus('error');
      setMessage(error.message);
      return;
    }

    setStatus('sent');
    setMessage('Check your email for the magic link.');
  }

  return (
    <main className="min-h-[100dvh] bg-zinc-950 flex flex-col items-center justify-center p-6 gap-6">
      <div className="w-full max-w-md flex flex-col gap-6 w-full">
        <div className="w-full rounded-2xl border border-white/10 bg-zinc-900/80 p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">Rockhound</h1>
            <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-2">
              Field Intelligence Login
            </p>
          </div>

          {status === 'sent' ? (
            <div className="text-center space-y-4">
              <p className="text-emerald-400 text-sm font-medium">{message}</p>
              <button
                type="button"
                onClick={() => router.push(redirectTo)}
                className="text-xs text-white/50 hover:text-white underline"
              >
                Return to app
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
              <label className="flex flex-col w-full">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                  Email
                </span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 focus:border-blue-500 focus:outline-none"
                />
              </label>

              {callbackError != null && (
                <p className="text-rose-400 text-sm" role="alert">
                  {callbackError}
                </p>
              )}

              {status === 'error' && (
                <p className="text-rose-400 text-sm" role="alert">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full rounded-xl bg-blue-600 py-3 mt-2 text-sm font-bold text-white uppercase tracking-wider hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {status === 'sending' ? 'Sending…' : 'Send Magic Link'}
              </button>
            </form>
          )}
        </div>

        {/* Compact card beneath the form */}
        <SyncStatusPanel inline />
      </div>
    </main>
  );
}

export default function LoginForm(): JSX.Element {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-zinc-950 w-full" />}>
      <LoginContent />
    </Suspense>
  );
}
