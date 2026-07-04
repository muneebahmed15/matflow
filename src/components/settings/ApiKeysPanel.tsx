'use client';

import { useState } from 'react';
import { useAsyncMount } from '@/hooks/use-async-mount';
import {
  createApiKeyAction,
  listApiKeysAction,
  revokeApiKeyAction,
} from '@/app/(dashboard)/actions';

export default function ApiKeysPanel() {
  const [keys, setKeys] = useState<
    { id: string; name: string; key_prefix: string; last_used_at: string | null; created_at: string }[]
  >([]);
  const [name, setName] = useState('');
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await listApiKeysAction();
    if (res.ok && res.data) setKeys(res.data);
    setLoading(false);
  };

  useAsyncMount(load, []);

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (loading) return <p className="text-white/40 text-sm">Loading API keys…</p>;

  return (
    <div className="space-y-4">
      <p className="text-white/40 text-sm">
        Generate keys for enterprise integrations. Keys are shown once at creation.
      </p>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name (e.g. Zapier)"
          className={inputClass}
        />
        <button
          type="button"
          onClick={async () => {
            const res = await createApiKeyAction(name);
            if (res.ok && res.data) {
              setNewRawKey(res.data.rawKey);
              setName('');
              void load();
            }
          }}
          className="shrink-0 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl"
        >
          Create
        </button>
      </div>
      {newRawKey && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm">
          <p className="text-amber-200 font-medium mb-1">Copy your key now — it won&apos;t be shown again:</p>
          <code className="text-amber-100 break-all">{newRawKey}</code>
        </div>
      )}
      <ul className="space-y-2 text-sm">
        {keys.map((key) => (
          <li key={key.id} className="flex justify-between items-center bg-white/5 rounded-xl px-4 py-3">
            <div>
              <p className="text-white font-medium">{key.name}</p>
              <p className="text-white/40 text-xs font-mono">{key.key_prefix}…</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await revokeApiKeyAction(key.id);
                void load();
              }}
              className="text-red-400 text-xs hover:text-red-300"
            >
              Revoke
            </button>
          </li>
        ))}
        {keys.length === 0 && <li className="text-white/30">No active API keys.</li>}
      </ul>
    </div>
  );
}
