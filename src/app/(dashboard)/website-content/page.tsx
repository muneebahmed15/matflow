'use client';

import { useEffect, useState } from 'react';
import {
  createCoachAction,
  createProgramAction,
  listProgramsAction,
  addGalleryImageAction,
  listBlogPostsAction,
  createBlogPostAction,
  publishBlogPostAction,
  deleteBlogPostAction,
} from '@/app/(dashboard)/actions';

export default function WebsiteContentPage() {
  const [programs, setPrograms] = useState<{ id: string; name: string; description: string | null }[]>([]);
  const [blogPosts, setBlogPosts] = useState<
    { id: string; title: string; slug: string; status: string; seo_score: number | null }[]
  >([]);
  const [progName, setProgName] = useState('');
  const [progDesc, setProgDesc] = useState('');
  const [coachName, setCoachName] = useState('');
  const [coachBio, setCoachBio] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [blogTitle, setBlogTitle] = useState('');
  const [blogExcerpt, setBlogExcerpt] = useState('');
  const [blogBody, setBlogBody] = useState('');

  const load = async () => {
    const [progRes, blogRes] = await Promise.all([listProgramsAction(), listBlogPostsAction()]);
    if (progRes.ok && progRes.data) setPrograms(progRes.data);
    if (blogRes.ok && blogRes.data) setBlogPosts(blogRes.data);
  };

  useEffect(() => {
    void load();
  }, []);

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold mb-2">Website Content</h1>
        <p className="text-white/40 text-sm">Manage public pages at /g/your-slug</p>
      </div>

      <section className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-3">
        <h2 className="font-semibold text-white">Programs</h2>
        <input value={progName} onChange={(e) => setProgName(e.target.value)} placeholder="Program name" className={inputClass} />
        <textarea value={progDesc} onChange={(e) => setProgDesc(e.target.value)} placeholder="Description" rows={2} className={inputClass} />
        <button
          onClick={async () => {
            await createProgramAction({ name: progName, description: progDesc });
            setProgName('');
            setProgDesc('');
            void load();
          }}
          className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl"
        >
          Add Program
        </button>
        <ul className="text-sm text-white/50 space-y-1">
          {programs.map((p) => (
            <li key={p.id}>• {p.name}</li>
          ))}
        </ul>
      </section>

      <section className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-3">
        <h2 className="font-semibold text-white">Coaches</h2>
        <input value={coachName} onChange={(e) => setCoachName(e.target.value)} placeholder="Coach name" className={inputClass} />
        <textarea value={coachBio} onChange={(e) => setCoachBio(e.target.value)} placeholder="Bio" rows={2} className={inputClass} />
        <button
          onClick={async () => {
            await createCoachAction({ name: coachName, bio: coachBio });
            setCoachName('');
            setCoachBio('');
          }}
          className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl"
        >
          Add Coach
        </button>
      </section>

      <section className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-3">
        <h2 className="font-semibold text-white">Gallery</h2>
        <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Image URL" className={inputClass} />
        <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption" className={inputClass} />
        <button
          onClick={async () => {
            await addGalleryImageAction({ imageUrl, caption });
            setImageUrl('');
            setCaption('');
          }}
          className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl"
        >
          Add Image
        </button>
      </section>

      <section className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-3">
        <h2 className="font-semibold text-white">Blog</h2>
        <input value={blogTitle} onChange={(e) => setBlogTitle(e.target.value)} placeholder="Post title" className={inputClass} />
        <input value={blogExcerpt} onChange={(e) => setBlogExcerpt(e.target.value)} placeholder="Excerpt (for SEO)" className={inputClass} />
        <textarea value={blogBody} onChange={(e) => setBlogBody(e.target.value)} placeholder="HTML body" rows={5} className={inputClass} />
        <button
          onClick={async () => {
            await createBlogPostAction({ title: blogTitle, excerpt: blogExcerpt, bodyHtml: blogBody });
            setBlogTitle('');
            setBlogExcerpt('');
            setBlogBody('');
            void load();
          }}
          className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl"
        >
          Save Draft
        </button>
        <ul className="text-sm space-y-2 mt-4">
          {blogPosts.map((p) => (
            <li key={p.id} className="flex justify-between items-center text-white/60">
              <span>
                {p.title}{' '}
                <span className="text-white/30">({p.status}{p.seo_score != null ? ` · SEO ${p.seo_score}` : ''})</span>
              </span>
              <span className="flex gap-2">
                {p.status === 'draft' && (
                  <button onClick={() => void publishBlogPostAction(p.id).then(load)} className="text-blue-400 text-xs">
                    Publish
                  </button>
                )}
                <button onClick={() => void deleteBlogPostAction(p.id).then(load)} className="text-red-400 text-xs">
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
