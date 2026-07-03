'use client';

import { useEffect, useState } from 'react';
import { Smartphone, X } from 'lucide-react';

const DISMISS_KEY = 'portal_install_dismissed';

export default function PortalInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    setVisible(false);
    sessionStorage.setItem(DISMISS_KEY, '1');
  };

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem(DISMISS_KEY, '1');
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto bg-[#111] border border-white/10 rounded-2xl p-4 shadow-xl flex gap-3 items-start">
      <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center shrink-0">
        <Smartphone size={18} className="text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium">Add to home screen</p>
        <p className="text-white/40 text-xs mt-1">Quick access to your member portal.</p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => void install()}
            className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg"
          >
            Install
          </button>
          <button onClick={dismiss} className="text-xs text-white/40 hover:text-white px-2">
            Not now
          </button>
        </div>
      </div>
      <button onClick={dismiss} className="text-white/30 hover:text-white shrink-0" aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
