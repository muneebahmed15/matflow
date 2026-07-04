'use client';

import { useState } from 'react';

export default function ScheduleEmbedSnippet({ embedUrl }: { embedUrl: string }) {
  const [copied, setCopied] = useState(false);
  const snippet = `<iframe src="${embedUrl}" width="100%" height="640" style="border:0;border-radius:12px" title="Class schedule" loading="lazy"></iframe>`;

  const copy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <pre className="text-xs text-white/50 bg-black/30 border border-white/10 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap break-all">
        {snippet}
      </pre>
      <button
        type="button"
        onClick={() => void copy()}
        className="text-sm text-blue-400 hover:underline"
      >
        {copied ? 'Copied!' : 'Copy embed code'}
      </button>
    </div>
  );
}
