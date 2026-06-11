'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { createClient } from '@/lib/supabase/client';

export default function LoginPage(): JSX.Element {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/';

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
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/80 p-8 shadow-2xl">
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
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <label className="block">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                Email
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 focus:border-blue-500 focus:outline-none"
              />
            </label>

            {status === 'error' && (
              <p className="text-rose-400 text-sm" role="alert">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white uppercase tracking-wider hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {status === 'sending' ? 'Sending…' : 'Send Magic Link'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
