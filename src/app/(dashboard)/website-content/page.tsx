'use client';

import { useState } from 'react';
import { useAsyncMount } from '@/hooks/use-async-mount';
import {
  createCoachAction,
  createProgramAction,
  listProgramsAction,
  listCoachesAction,
  deleteProgramAction,
  deleteCoachAction,
  updateProgramAction,
  updateCoachAction,
  addGalleryImageAction,
  listBlogPostsAction,
  createBlogPostAction,
  publishBlogPostAction,
  deleteBlogPostAction,
  listStaffAction,
  suggestSeoKeywordsAction,
  getGymSettingsAction,
  updateGymSettingsAction,
} from '@/app/(dashboard)/actions';

type StaffOption = { id: string; full_name: string; role: string };

export default function WebsiteContentPage() {
  const [programs, setPrograms] = useState<{ id: string; name: string; description: string | null }[]>([]);
  const [coaches, setCoaches] = useState<
    { id: string; name: string; bio: string | null; staff_role_id: string | null }[]
  >([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [blogPosts, setBlogPosts] = useState<
    { id: string; title: string; slug: string; status: string; seo_score: number | null }[]
  >([]);
  const [progName, setProgName] = useState('');
  const [progDesc, setProgDesc] = useState('');
  const [coachName, setCoachName] = useState('');
  const [coachBio, setCoachBio] = useState('');
  const [coachStaffId, setCoachStaffId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [blogTitle, setBlogTitle] = useState('');
  const [blogExcerpt, setBlogExcerpt] = useState('');
  const [blogBody, setBlogBody] = useState('');
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [editProgName, setEditProgName] = useState('');
  const [editProgDesc, setEditProgDesc] = useState('');
  const [editingCoachId, setEditingCoachId] = useState<string | null>(null);
  const [editCoachName, setEditCoachName] = useState('');
  const [editCoachBio, setEditCoachBio] = useState('');
  const [editCoachStaffId, setEditCoachStaffId] = useState('');
  const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([]);
  const [savedKeywords, setSavedKeywords] = useState<string[]>([]);

  const load = async () => {
    const [progRes, coachRes, blogRes, staffRes] = await Promise.all([
      listProgramsAction(),
      listCoachesAction(),
      listBlogPostsAction(),
      listStaffAction(),
    ]);
    if (progRes.ok && progRes.data) setPrograms(progRes.data);
    if (coachRes.ok && coachRes.data) setCoaches(coachRes.data);
    if (blogRes.ok && blogRes.data) setBlogPosts(blogRes.data);
    if (staffRes.ok && staffRes.data) {
      setStaff(staffRes.data.map((s) => ({ id: s.id, full_name: s.full_name, role: s.role })));
    }
    const settingsRes = await getGymSettingsAction();
    if (settingsRes.ok && settingsRes.data?.seo_keywords) {
      setSavedKeywords(settingsRes.data.seo_keywords);
    }
  };

  useAsyncMount(load, []);

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  const staffSelect = (
    value: string,
    onChange: (id: string) => void,
    onStaffPick?: (name: string) => void
  ) => (
    <select
      value={value}
      onChange={(e) => {
        const id = e.target.value;
        onChange(id);
        const picked = staff.find((s) => s.id === id);
        if (picked && onStaffPick) onStaffPick(picked.full_name);
      }}
      className={inputClass}
    >
      <option value="" className="bg-gray-900">No linked staff (standalone bio)</option>
      {staff.map((s) => (
        <option key={s.id} value={s.id} className="bg-gray-900">
          {s.full_name} ({s.role})
        </option>
      ))}
    </select>
  );

  const staffLabel = (staffRoleId: string | null) => {
    if (!staffRoleId) return null;
    const linked = staff.find((s) => s.id === staffRoleId);
    return linked ? `Linked: ${linked.full_name}` : 'Linked staff';
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold mb-2">Website Content</h1>
        <p className="text-white/40 text-sm">Manage public pages at /g/your-slug</p>
      </div>

      <section className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-3">
        <h2 className="font-semibold text-white">SEO keywords</h2>
        <p className="text-white/40 text-sm">Suggested from gym name, city, programs, and tagline.</p>
        <button
          type="button"
          onClick={async () => {
            const res = await suggestSeoKeywordsAction();
            if (res.ok && res.data) setKeywordSuggestions(res.data);
          }}
          className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl"
        >
          Generate suggestions
        </button>
        {(keywordSuggestions.length > 0 || savedKeywords.length > 0) && (
          <div className="flex flex-wrap gap-2 pt-2">
            {(keywordSuggestions.length > 0 ? keywordSuggestions : savedKeywords).map((kw) => (
              <span key={kw} className="text-xs bg-white/5 border border-white/10 rounded-full px-3 py-1 text-white/70">
                {kw}
              </span>
            ))}
          </div>
        )}
        {keywordSuggestions.length > 0 && (
          <button
            type="button"
            onClick={async () => {
              const settingsRes = await getGymSettingsAction();
              if (!settingsRes.ok || !settingsRes.data) return;
              const s = settingsRes.data;
              await updateGymSettingsAction({
                name: s.name,
                slug: s.slug,
                kioskEnabled: s.kiosk_enabled,
                seoKeywords: keywordSuggestions,
              });
              setSavedKeywords(keywordSuggestions);
            }}
            className="text-blue-400 text-sm hover:text-blue-300"
          >
            Save keywords to gym
          </button>
        )}
      </section>

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
        <ul className="text-sm text-white/50 space-y-3">
          {programs.map((p) => (
            <li key={p.id} className="border border-white/5 rounded-xl p-3 space-y-2">
              {editingProgramId === p.id ? (
                <>
                  <input value={editProgName} onChange={(e) => setEditProgName(e.target.value)} className={inputClass} />
                  <textarea value={editProgDesc} onChange={(e) => setEditProgDesc(e.target.value)} rows={2} className={inputClass} />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await updateProgramAction({
                          programId: p.id,
                          name: editProgName,
                          description: editProgDesc || null,
                        });
                        setEditingProgramId(null);
                        void load();
                      }}
                      className="text-blue-400 text-xs"
                    >
                      Save
                    </button>
                    <button type="button" onClick={() => setEditingProgramId(null)} className="text-white/40 text-xs">
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-start gap-2">
                  <span>• {p.name}{p.description ? ` — ${p.description}` : ''}</span>
                  <span className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProgramId(p.id);
                        setEditProgName(p.name);
                        setEditProgDesc(p.description ?? '');
                      }}
                      className="text-blue-400 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteProgramAction(p.id).then(load)}
                      className="text-red-400 text-xs"
                    >
                      Delete
                    </button>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-3">
        <h2 className="font-semibold text-white">Coaches</h2>
        {staffSelect(coachStaffId, setCoachStaffId, setCoachName)}
        <input value={coachName} onChange={(e) => setCoachName(e.target.value)} placeholder="Coach name" className={inputClass} />
        <textarea value={coachBio} onChange={(e) => setCoachBio(e.target.value)} placeholder="Bio" rows={2} className={inputClass} />
        <button
          onClick={async () => {
            await createCoachAction({
              name: coachName,
              bio: coachBio,
              staffRoleId: coachStaffId || null,
            });
            setCoachName('');
            setCoachBio('');
            setCoachStaffId('');
            void load();
          }}
          className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl"
        >
          Add Coach
        </button>
        <ul className="text-sm text-white/50 space-y-3">
          {coaches.map((c) => (
            <li key={c.id} className="border border-white/5 rounded-xl p-3 space-y-2">
              {editingCoachId === c.id ? (
                <>
                  {staffSelect(editCoachStaffId, setEditCoachStaffId, setEditCoachName)}
                  <input value={editCoachName} onChange={(e) => setEditCoachName(e.target.value)} className={inputClass} />
                  <textarea value={editCoachBio} onChange={(e) => setEditCoachBio(e.target.value)} rows={2} className={inputClass} />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await updateCoachAction({
                          coachId: c.id,
                          name: editCoachName,
                          bio: editCoachBio || null,
                          staffRoleId: editCoachStaffId || null,
                        });
                        setEditingCoachId(null);
                        void load();
                      }}
                      className="text-blue-400 text-xs"
                    >
                      Save
                    </button>
                    <button type="button" onClick={() => setEditingCoachId(null)} className="text-white/40 text-xs">
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-start gap-2">
                  <span>
                    • {c.name}
                    {c.bio ? ` — ${c.bio.slice(0, 60)}${c.bio.length > 60 ? '…' : ''}` : ''}
                    {staffLabel(c.staff_role_id) ? (
                      <span className="block text-white/30 text-xs mt-0.5">{staffLabel(c.staff_role_id)}</span>
                    ) : null}
                  </span>
                  <span className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCoachId(c.id);
                        setEditCoachName(c.name);
                        setEditCoachBio(c.bio ?? '');
                        setEditCoachStaffId(c.staff_role_id ?? '');
                      }}
                      className="text-blue-400 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteCoachAction(c.id).then(load)}
                      className="text-red-400 text-xs"
                    >
                      Delete
                    </button>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
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
