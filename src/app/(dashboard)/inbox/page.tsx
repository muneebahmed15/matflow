'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Inbox, MessageCircle, UserPlus } from 'lucide-react';
import {
  listInboxAction,
  getConversationMessagesAction,
} from '@/app/(dashboard)/actions';

type InboxItem = {
  id: string;
  type: 'lead' | 'chat' | 'sms';
  title: string;
  subtitle: string | null;
  status: string;
  channel: string;
  createdAt: string;
  leadId?: string;
  conversationId?: string;
};

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [selected, setSelected] = useState<InboxItem | null>(null);
  const [messages, setMessages] = useState<{ role: string; content: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await listInboxAction();
    if (res.ok && res.data) setItems(res.data);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const selectItem = async (item: InboxItem) => {
    setSelected(item);
    if (item.conversationId) {
      const res = await getConversationMessagesAction(item.conversationId);
      if (res.ok && res.data) setMessages(res.data);
    } else {
      setMessages([]);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-2">Inbox</h1>
      <p className="text-white/40 text-sm mb-8">Leads and chat conversations in one place.</p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          {loading ? (
            <p className="text-white/30 text-sm">Loading...</p>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-white/30">
              <Inbox size={40} className="mx-auto mb-3 opacity-30" />
              No open inquiries.
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                onClick={() => void selectItem(item)}
                className={`w-full text-left bg-white/5 border rounded-xl px-4 py-3 transition ${
                  selected?.id === item.id ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  {item.type === 'chat' ? (
                    <MessageCircle size={16} className="text-blue-400" />
                  ) : (
                    <UserPlus size={16} className="text-green-400" />
                  )}
                  <span className="font-medium text-white text-sm">{item.title}</span>
                  <span className="ml-auto text-xs text-white/30 capitalize">{item.status}</span>
                </div>
                {item.subtitle && <p className="text-white/40 text-xs mt-1 ml-6">{item.subtitle}</p>}
                <p className="text-white/20 text-xs mt-1 ml-6">
                  {item.channel} · {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 min-h-[300px]">
          {!selected ? (
            <p className="text-white/30 text-sm">Select an item to view details.</p>
          ) : (
            <>
              <h2 className="font-semibold text-white mb-1">{selected.title}</h2>
              <p className="text-white/40 text-xs mb-4 capitalize">{selected.type} · {selected.channel}</p>
              {selected.leadId && (
                <Link href="/leads" className="text-blue-400 text-sm hover:underline mb-4 inline-block">
                  View in Leads →
                </Link>
              )}
              {messages.length > 0 && (
                <div className="space-y-2 mt-4 max-h-80 overflow-y-auto">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`text-sm rounded-lg px-3 py-2 ${
                        m.role === 'user' ? 'bg-white/10 ml-4' : 'bg-white/5 mr-4'
                      }`}
                    >
                      {m.content}
                    </div>
                  ))}
                </div>
              )}
              {selected.type === 'lead' && !messages.length && (
                <p className="text-white/30 text-sm">Lead captured — follow up from the Leads page.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
