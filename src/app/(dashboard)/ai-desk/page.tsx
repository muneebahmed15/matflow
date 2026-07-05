'use client';

import { useState } from 'react';
import { useAsyncMount } from '@/hooks/use-async-mount';
import { Bot, BookOpen, MessageSquare, BarChart3 } from 'lucide-react';
import {
  deleteAiKnowledgeAction,
  getAiAnalyticsAction,
  getConversationMessagesAction,
  listAiConversationsAction,
  listAiKnowledgeAction,
  upsertAiKnowledgeAction,
} from '@/app/(dashboard)/actions';

type Conversation = {
  id: string;
  channel: string;
  status: string;
  visitor_name: string | null;
  created_at: string;
};

export default function AiDeskPage() {
  const [knowledge, setKnowledge] = useState<{ id: string; topic: string; content: string }[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [analytics, setAnalytics] = useState<{
    resolutionRate: number | null;
    avgResponseMs: number | null;
    totalClosed: number;
    totalEscalated: number;
    avgCsat: number | null;
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: string; content: string; created_at: string }[]>([]);
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [tab, setTab] = useState<'knowledge' | 'inbox' | 'analytics'>('knowledge');

  const load = async () => {
    const [kRes, cRes, aRes] = await Promise.all([
      listAiKnowledgeAction(),
      listAiConversationsAction(),
      getAiAnalyticsAction(),
    ]);
    if (kRes.ok && kRes.data) setKnowledge(kRes.data);
    if (cRes.ok && cRes.data) setConversations(cRes.data as Conversation[]);
    if (aRes.ok && aRes.data) setAnalytics(aRes.data);
  };

  useAsyncMount(load, []);

  const openConversation = async (id: string) => {
    setSelectedId(id);
    const res = await getConversationMessagesAction(id);
    if (res.ok && res.data) setMessages(res.data);
  };

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-2">AI Front Desk</h1>
      <p className="text-white/40 text-sm mb-6">Knowledge base powers web chat replies. Enable chat in Settings.</p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {(
          [
            ['knowledge', BookOpen, 'Knowledge'],
            ['inbox', MessageSquare, 'Conversations'],
            ['analytics', BarChart3, 'Analytics'],
          ] as const
        ).map(([key, Icon, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
              tab === key ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'knowledge' ? (
        <div className="space-y-6">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-3">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Bot size={18} /> Add FAQ topic
            </h2>
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
      ) : tab === 'analytics' ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-2xl font-bold text-white">
              {analytics?.resolutionRate != null ? `${analytics.resolutionRate}%` : '—'}
            </p>
            <p className="text-white/30 text-xs">Resolution rate (30d)</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-2xl font-bold text-white">
              {analytics?.avgResponseMs != null ? `${Math.round(analytics.avgResponseMs / 1000)}s` : '—'}
            </p>
            <p className="text-white/30 text-xs">Avg response time</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-2xl font-bold text-white">{analytics?.totalEscalated ?? 0}</p>
            <p className="text-white/30 text-xs">Escalated (30d)</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-2xl font-bold text-white">
              {analytics?.avgCsat != null ? analytics.avgCsat.toFixed(1) : '—'}
            </p>
            <p className="text-white/30 text-xs">Avg CSAT (1–5)</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {conversations.length === 0 ? (
            <p className="text-white/30 text-sm">No conversations yet.</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => void openConversation(c.id)}
                className={`w-full text-left bg-white/5 border rounded-xl px-4 py-3 text-sm ${
                  selectedId === c.id ? 'border-blue-500' : 'border-white/10'
                }`}
              >
                <div className="flex justify-between">
                  <span className="text-white capitalize">
                    {c.visitor_name ?? c.channel.replace('_', ' ')}
                  </span>
                  <span
                    className={`text-xs capitalize ${
                      c.status === 'escalated' ? 'text-red-400' : 'text-white/30'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
                <span className="text-white/30 text-xs">{new Date(c.created_at).toLocaleString()}</span>
              </button>
            ))
          )}
          {selectedId && messages.length > 0 && (
            <div className="bg-[#111] border border-white/10 rounded-2xl p-4 max-h-80 overflow-y-auto space-y-2">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`text-sm rounded-lg px-3 py-2 ${
                    m.role === 'user' ? 'bg-blue-600/20 text-white' : 'bg-white/5 text-white/80'
                  }`}
                >
                  <span className="text-xs text-white/30 capitalize">{m.role}</span>
                  <p>{m.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
