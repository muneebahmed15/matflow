'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

type Props = { gymId: string; gymName: string; gymSlug: string; accent: string };

export default function AiChatWidget({ gymId, gymName, gymSlug, accent }: Props) {
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationToken, setConversationToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [visitorPhone, setVisitorPhone] = useState('');
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [showCsat, setShowCsat] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const ensureConversation = async () => {
    if (conversationId && conversationToken) {
      return { conversationId, conversationToken };
    }
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', gym_id: gymId }),
    });
    const data = await res.json();
    if (data.conversation_id && data.conversation_token) {
      setConversationId(data.conversation_id);
      setConversationToken(data.conversation_token);
      const intro =
        data.off_hours && data.off_hours_message
          ? `${data.off_hours_message as string}\n\n`
          : '';
      setMessages([
        {
          role: 'assistant',
          text: `${intro}Hi! I'm the ${gymName} assistant. Ask about schedule, pricing, or booking a free trial. (Not medical advice — consult a doctor for injuries.)`,
        },
      ]);
      return {
        conversationId: data.conversation_id as string,
        conversationToken: data.conversation_token as string,
      };
    }
    return null;
  };

  const sendSmsFollowUp = async (convId: string, token: string, phone: string) => {
    await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sms_followup',
        conversation_id: convId,
        conversation_token: token,
        phone,
      }),
    });
  };

  const submitCsat = async (rating: number) => {
    if (!conversationId || !conversationToken) return;
    await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'csat',
        conversation_id: conversationId,
        conversation_token: conversationToken,
        rating,
      }),
    });
    setShowCsat(false);
    setOpen(false);
  };

  const handleClose = async () => {
    if (conversationId && conversationToken && messages.length > 2 && !showCsat) {
      setShowCsat(true);
      return;
    }
    if (conversationId && conversationToken && visitorPhone.trim()) {
      await sendSmsFollowUp(conversationId, conversationToken, visitorPhone.trim());
    } else if (conversationId && messages.length > 2) {
      setShowPhonePrompt(true);
      return;
    }
    setOpen(false);
    setShowPhonePrompt(false);
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', text }]);
    setLoading(true);

    const session = await ensureConversation();
    if (!session) {
      setMessages((m) => [...m, { role: 'assistant', text: 'Chat is unavailable right now.' }]);
      setLoading(false);
      return;
    }

    const payload = {
      conversation_id: session.conversationId,
      conversation_token: session.conversationToken,
      message: text,
    };

    const res = await fetch('/api/ai/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok && res.headers.get('content-type')?.includes('text/event-stream') && res.body) {
      setMessages((m) => [...m, { role: 'assistant', text: '' }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let leadCaptured = false;
      let finalReply = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data:')) continue;
          try {
            const event = JSON.parse(line.slice(5).trim()) as {
              type?: string;
              text?: string;
              reply?: string;
              leadCaptured?: boolean;
            };
            if (event.type === 'delta' && event.text) {
              finalReply += event.text;
              setMessages((m) => {
                const next = [...m];
                const last = next[next.length - 1];
                if (last?.role === 'assistant') {
                  next[next.length - 1] = { ...last, text: finalReply };
                }
                return next;
              });
            }
            if (event.type === 'done') {
              if (event.reply) finalReply = event.reply;
              leadCaptured = Boolean(event.leadCaptured);
            }
          } catch {
            // skip malformed chunk
          }
        }
      }

      if (!finalReply) {
        setMessages((m) => {
          const next = [...m];
          const last = next[next.length - 1];
          if (last?.role === 'assistant' && !last.text) {
            next[next.length - 1] = { ...last, text: 'Sorry, something went wrong.' };
          }
          return next;
        });
      }

      if (leadCaptured && !visitorPhone) {
        setShowPhonePrompt(true);
      }

      setLoading(false);
      return;
    }

    const fallback = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'message', ...payload }),
    });
    const data = await fallback.json();
    setMessages((m) => [...m, { role: 'assistant', text: data.reply ?? 'Sorry, something went wrong.' }]);

    if (data.lead_captured && !visitorPhone) {
      setShowPhonePrompt(true);
    }

    setLoading(false);
  };

  return (
    <>
      <button
        onClick={() => (open ? void handleClose() : setOpen(true))}
        className="fixed bottom-20 md:bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white"
        style={{ backgroundColor: accent }}
        aria-label="Open chat"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div className="fixed bottom-36 md:bottom-24 right-6 z-50 w-[min(100vw-2rem,380px)] bg-[#111] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 font-semibold text-sm flex justify-between items-center">
            <span>{gymName} Assistant</span>
            <div className="flex items-center gap-3">
              <a href={`/g/${gymSlug}/contact`} className="text-xs opacity-60 hover:opacity-100">
                Talk to staff
              </a>
              <a href={`/g/${gymSlug}/trial`} className="text-xs opacity-60 hover:opacity-100">
                Book trial
              </a>
            </div>
          </div>
          <div className="flex-1 max-h-80 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-sm rounded-xl px-3 py-2 max-w-[85%] ${
                  m.role === 'user'
                    ? 'ml-auto bg-white/10 text-white'
                    : 'mr-auto bg-white/5 text-white/80'
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && <p className="text-xs text-white/30">Typing...</p>}
            <div ref={bottomRef} />
          </div>
          {showCsat && (
            <div className="px-3 py-3 border-t border-white/10 bg-white/5">
              <p className="text-xs text-white/50 mb-2">How was this chat?</p>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => void submitCsat(n)}
                    className="text-lg hover:scale-110 transition"
                    aria-label={`Rate ${n} out of 5`}
                  >
                    {n <= 3 ? '😐' : '🙂'}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCsat(false);
                  setOpen(false);
                }}
                className="mt-2 w-full text-xs text-white/40 hover:text-white"
              >
                Skip
              </button>
            </div>
          )}
          {showPhonePrompt && (
            <div className="px-3 py-2 border-t border-white/10 bg-white/5">
              <p className="text-xs text-white/50 mb-2">Get a text with trial booking link:</p>
              <div className="flex gap-2">
                <input
                  value={visitorPhone}
                  onChange={(e) => setVisitorPhone(e.target.value)}
                  placeholder="Your phone"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white"
                />
                <button
                  onClick={() => {
                    if (conversationId && conversationToken && visitorPhone.trim()) {
                      void sendSmsFollowUp(conversationId, conversationToken, visitorPhone.trim());
                    }
                    setShowPhonePrompt(false);
                    setOpen(false);
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg text-white"
                  style={{ backgroundColor: accent }}
                >
                  Send
                </button>
              </div>
            </div>
          )}
          <div className="p-3 border-t border-white/10 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void send()}
              placeholder="Ask a question..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none"
            />
            <button
              onClick={() => void send()}
              disabled={loading}
              className="p-2 rounded-xl text-white disabled:opacity-50"
              style={{ backgroundColor: accent }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
