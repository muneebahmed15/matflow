'use client';

import { useState } from 'react';

type Props = {
  memberName: string;
  onSign: (typedName: string) => Promise<void>;
  alreadySigned?: boolean;
  signedAt?: string;
};

export default function WaiverSignatureBox({ memberName, onSign, alreadySigned, signedAt }: Props) {
  const [typedName, setTypedName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSign = async () => {
    if (typedName.trim().toLowerCase() !== memberName.trim().toLowerCase()) {
      setError('Name must match exactly as shown above.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSign(typedName.trim());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign waiver.');
    } finally {
      setLoading(false);
    }
  };

  if (alreadySigned) {
    return (
      <div className="mt-6 rounded-xl border border-green-500/30 bg-green-500/10 p-5">
        <p className="text-green-400 font-semibold">✅ Waiver already signed</p>
        {signedAt && (
          <p className="text-sm text-gray-400 mt-1">
            Signed on {new Date(signedAt).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
      <div>
        <p className="text-sm text-gray-400 mb-1">
          Type your full name to sign:{' '}
          <span className="text-white font-semibold">{memberName}</span>
        </p>
        <input
          type="text"
          placeholder="Type your full name here"
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        onClick={handleSign}
        disabled={loading || !typedName}
        className="w-full rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition"
      >
        {loading ? 'Signing…' : 'I Agree & Sign Waiver'}
      </button>
      <p className="text-xs text-gray-500">
        By typing your name and clicking sign, you agree this constitutes a legally binding
        electronic signature under the E-SIGN Act.
      </p>
    </div>
  );
}