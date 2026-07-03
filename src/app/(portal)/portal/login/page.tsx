'use client'

import { Suspense, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { safeNextPath } from '@/lib/auth/safe-next-path'
import { linkMemberAuthUser } from '@/lib/portal-auth'

function authCallbackUrl(next: string): string {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
}

function PortalLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = safeNextPath(searchParams.get('next'), '/portal')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'password' | 'magic'>('password')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const finishLogin = async (userEmail: string) => {
    const linked = await linkMemberAuthUser(userEmail)
    if (!linked) {
      setError('No member profile found for this email. Contact your gym admin.')
      await supabase.auth.signOut()
      return false
    }
    router.push(nextPath)
    return true
  }

  const handleLogin = async () => {
    if (!email) {
      setError('Please enter your email.')
      return
    }
    setLoading(true)
    setError('')
    setMessage('')

    if (mode === 'magic') {
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: authCallbackUrl('/portal') },
      })
      setLoading(false)
      if (err) setError(err.message)
      else setMessage('Check your email for a magic link to sign in.')
      return
    }

    if (!password) {
      setError('Please enter your password.')
      setLoading(false)
      return
    }

    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    if (data.user) await finishLogin(email)
    setLoading(false)
  }

  const handlePasswordReset = async () => {
    if (!email) {
      setError('Enter your email first.')
      return
    }
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authCallbackUrl('/portal/login'),
    })
    setLoading(false)
    if (err) setError(err.message)
    else setMessage('Password reset email sent.')
  }

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Logo size={32} />
          <span className="font-bold text-xl">MatFlow</span>
        </div>

        <div className="bg-[#111] border border-white/10 rounded-2xl p-8">
          <h1 className="text-2xl font-bold mb-1">Member Portal</h1>
          <p className="text-white/40 text-sm mb-6">Sign in to view your membership</p>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('password')}
              className={`flex-1 text-xs py-2 rounded-lg ${mode === 'password' ? 'bg-blue-600/20 text-white' : 'text-white/40'}`}
            >
              Password
            </button>
            <button
              onClick={() => setMode('magic')}
              className={`flex-1 text-xs py-2 rounded-lg ${mode === 'magic' ? 'bg-blue-600/20 text-white' : 'text-white/40'}`}
            >
              Magic link
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className={inputClass}
                onKeyDown={(e) => e.key === 'Enter' && void handleLogin()}
              />
            </div>
            {mode === 'password' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                  onKeyDown={(e) => e.key === 'Enter' && void handleLogin()}
                />
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            {message && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                <p className="text-green-400 text-sm">{message}</p>
              </div>
            )}

            <button
              onClick={() => void handleLogin()}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition"
            >
              {loading ? 'Please wait...' : mode === 'magic' ? 'Send Magic Link' : 'Sign In'}
            </button>

            {mode === 'password' && (
              <button
                type="button"
                onClick={() => void handlePasswordReset()}
                className="w-full text-white/40 text-sm hover:text-white"
              >
                Forgot password?
              </button>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-white/30 text-sm">
              Don&apos;t have an account?{' '}
              <Link href="/portal/signup" className="text-blue-400 hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PortalLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A]" />}>
      <PortalLoginForm />
    </Suspense>
  )
}
