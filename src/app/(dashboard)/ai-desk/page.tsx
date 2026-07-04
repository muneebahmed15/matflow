'use client';

import { useState } from 'react';
import { useAsyncMount } from '@/hooks/use-async-mount';
import { Bot, BookOpen, MessageSquare } from 'lucide-react';
import {
  deleteAiKnowledgeAction,
  listAiConversationsAction,
  listAiKnowledgeAction,
  upsertAiKnowledgeAction,
} from '@/app/(dashboard)/actions';

export default function AiDeskPage() {
  const [knowledge, setKnowledge] = useState<{ id: string; topic: string; content: string }[]>([]);
  const [conversations, setConversations] = useState<{ id: string; channel: string; status: string; created_at: string }[]>([]);
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [tab, setTab] = useState<'knowledge' | 'inbox'>('knowledge');

  const load = async () => {
    const [kRes, cRes] = await Promise.all([listAiKnowledgeAction(), listAiConversationsAction()]);
    if (kRes.ok && kRes.data) setKnowledge(kRes.data);
    if (cRes.ok && cRes.data) setConversations(cRes.data as typeof conversations);
  };

  useAsyncMount(load, []);

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-2">AI Front Desk</h1>
      <p className="text-white/40 text-sm mb-6">Knowledge base powers web chat replies. Enable chat in Settings.</p>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('knowledge')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
            tab === 'knowledge' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50'
          }`}
        >
          <BookOpen size={16} /> Knowledge
        </button>
        <button
          onClick={() => setTab('inbox')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
            tab === 'inbox' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50'
          }`}
        >
          <MessageSquare size={16} /> Conversations
        </button>
      </div>

      {tab === 'knowledge' ? (
        <div className="space-y-6">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-3">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Bot size={18} /> Add FAQ topic
            </h2>
            <p className="text-white/30 text-xs">Topics match keywords in visitor messages (e.g. &quot;hours&quot;, &quot;pricing&quot;).</p>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic keyword" className={inputClass} />
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Answer text" rows={3} className={inputClass} />
            <button
              onClick={async () => {
                await upsertAiKnowledgeAction({ topic, content });
                setTopic('');
                setContent('');
                void load();
              }}
              className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl"
            >
              Save
            </button>
          </div>
          <ul className="space-y-2">
            {knowledge.map((k) => (
              <li key={k.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <div className="flex justify-between">
                  <span className="text-white font-medium text-sm">{k.topic}</span>
                  <button
                    onClick={() => void deleteAiKnowledgeAction(k.id).then(() => load())}
                    className="text-red-400 text-xs hover:underline"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-white/50 text-xs mt-1">{k.content}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.length === 0 ? (
            <p className="text-white/30 text-sm">No conversations yet.</p>
          ) : (
            conversations.map((c) => (
              <div key={c.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex justify-between text-sm">
                <span className="text-white/70 capitalize">{c.channel.replace('_', ' ')}</span>
                <span className="text-white/30 text-xs">{new Date(c.created_at).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
