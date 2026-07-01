'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Logo from '@/components/Logo'

export default function PortalSignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSignup = async () => {
    if (!email || !password) { setError('Please fill in all fields.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    setError('')

    // Check if member exists with this email
    const { data: member } = await supabase.from('members').select('id, first_name').eq('email', email).single()
    if (!member) {
      setError('No member profile found for this email. Contact your gym to get added first.')
      setLoading(false)
      return
    }

    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: member.first_name } }
    })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('members')
        .update({ auth_user_id: user.id })
        .eq('id', member.id)
        .eq('email', email)
    }

    setSuccess(true)
    setLoading(false)
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"

  if (success) return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✅</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">Check your email</h2>
        <p className="text-white/40">We sent a confirmation link to <span className="text-white">{email}</span>. Click it to activate your account.</p>
        <Link href="/portal/login" prefetch={false} className="mt-6 inline-block text-blue-400 hover:underline text-sm">Back to login →</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Logo size={32} />
          <span className="font-bold text-xl">MatsFlow</span>
        </div>

        <div className="bg-[#111] border border-white/10 rounded-2xl p-8">
          <h1 className="text-2xl font-bold mb-1">Create Account</h1>
          <p className="text-white/40 text-sm mb-6">Use the email your gym has on file for you</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className={inputClass}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleSignup}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-white/30 text-sm">
              Already have an account?{' '}
              <Link href="/portal/login" prefetch={false} className="text-blue-400 hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
