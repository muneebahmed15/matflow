'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { safeNextPath } from '@/lib/auth/safe-next-path';
import Logo from '@/components/Logo';
import { SpringButton } from '@/components/SpringButton';

function authCallbackUrl(next: string): string {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get('next'), '/dashboard');
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResetSent(false);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (signInError) {
      setError(signInError.message);
    } else {
      router.push(nextPath);
    }

    setLoading(false);
  };

  const handlePasswordReset = async () => {
    if (!form.email) {
      setError('Enter your email address first.');
      return;
    }
    setLoading(true);
    setError('');
    setResetSent(false);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: authCallbackUrl('/login'),
    });

    setLoading(false);
    if (resetError) setError(resetError.message);
    else setResetSent(true);
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-5">
            <Logo size={28} />
            <span className="font-bold text-lg">MatFlow</span>
          </div>
          <h1 className="text-3xl font-extrabold mb-2">Welcome back</h1>
          <p className="text-white/50">Log in to your MatFlow account</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            name="email"
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {resetSent && (
            <p className="text-green-400 text-sm">Password reset email sent. Check your inbox.</p>
          )}

          <SpringButton type="submit" disabled={loading} size="lg" className="w-full">
            {loading ? 'Logging in...' : 'Log In'}
          </SpringButton>
        </form>

        <button
          type="button"
          onClick={handlePasswordReset}
          disabled={loading}
          className="w-full text-center text-sm text-blue-400 hover:underline mt-3 disabled:opacity-50"
        >
          Forgot password?
        </button>

        <p className="text-center text-white/40 text-sm mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-blue-400 hover:underline">
            Start free trial
          </Link>
        </p>

        <p className="text-center text-white/30 text-sm mt-4">
          Member at a gym?{' '}
          <Link href="/portal/login" className="text-blue-400 hover:underline">
            Sign in to the member portal
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <LoginForm />
    </Suspense>
  );
}
