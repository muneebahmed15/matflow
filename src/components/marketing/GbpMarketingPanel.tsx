'use client';

import { useState } from 'react';
import {
  createGbpPostAction,
  importGbpDataAction,
  listGbpPostsAction,
  listGbpReviewsAction,
  replyGbpReviewAction,
} from '@/app/(dashboard)/actions';

type GbpPost = {
  id: string;
  summary: string;
  status: string;
  posted_at: string | null;
};

type GbpReview = {
  id: string;
  author_name: string | null;
  rating: number | null;
  comment: string | null;
  review_reply: string | null;
};

export default function GbpMarketingPanel() {
  const [posts, setPosts] = useState<GbpPost[]>([]);
  const [reviews, setReviews] = useState<GbpReview[]>([]);
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  const load = async () => {
    const [postRes, reviewRes] = await Promise.all([listGbpPostsAction(), listGbpReviewsAction()]);
    if (postRes.ok && postRes.data) setPosts(postRes.data);
    if (reviewRes.ok && reviewRes.data) setReviews(reviewRes.data);
  };

  const runImport = async () => {
    setLoading(true);
    const res = await importGbpDataAction();
    if (res.ok && res.data) setMessage(res.data.message);
    await load();
    setLoading(false);
  };

  const publish = async () => {
    const res = await createGbpPostAction({ summary, body });
    if (res.ok && res.data) {
      setMessage(res.data.message);
      setSummary('');
      setBody('');
      void load();
    }
  };

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-white">Google Business Profile</h2>
        <button
          type="button"
          disabled={loading}
          onClick={() => void runImport()}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          {loading ? 'Importing…' : 'Import GBP data'}
        </button>
      </div>
      {message && <p className="text-white/40 text-xs">{message}</p>}

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-white/80">Post an update</h3>
        <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Headline" className={inputClass} />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Optional details" rows={2} className={inputClass} />
        <button type="button" onClick={() => void publish()} className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl">
          Publish to GBP
        </button>
      </div>

      {posts.length > 0 && (
        <ul className="text-xs text-white/50 space-y-1">
          {posts.slice(0, 5).map((p) => (
            <li key={p.id}>
              {p.summary} · {p.status}
              {p.posted_at ? ` · ${new Date(p.posted_at).toLocaleDateString()}` : ''}
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 pt-2 border-t border-white/10">
        <h3 className="text-sm font-medium text-white/80">Reviews</h3>
        {reviews.length === 0 ? (
          <p className="text-white/30 text-xs">Import GBP data to load reviews.</p>
        ) : (
          reviews.slice(0, 10).map((r) => (
            <div key={r.id} className="bg-white/5 rounded-xl p-3 space-y-2">
              <p className="text-white text-sm font-medium">
                {r.author_name ?? 'Anonymous'} {r.rating ? `· ${r.rating}★` : ''}
              </p>
              {r.comment && <p className="text-white/50 text-xs">{r.comment}</p>}
              {r.review_reply ? (
                <p className="text-green-400/80 text-xs">Replied: {r.review_reply}</p>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={replyDrafts[r.id] ?? ''}
                    onChange={(e) => setReplyDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                    placeholder="Write a reply…"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await replyGbpReviewAction(r.id, replyDrafts[r.id] ?? '');
                      if (res.ok && res.data) setMessage(res.data.message);
                      void load();
                    }}
                    className="shrink-0 text-blue-400 text-xs hover:text-blue-300 px-2"
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
