'use client';

import { useEffect, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';

const STORAGE_KEY = 'matflow-pilot-checklist';

const SECTIONS = [
  {
    title: 'Pre-import (staging)',
    items: [
      'Wave 2/3/4 migrations applied on staging',
      'ECMMA field mapping reviewed',
      'CSV dry-run validated',
      'Google Sheets import tested (if used)',
      'Waiver PDF batch tested',
      'Photo zip import tested',
      'Rollback tested on sample job',
    ],
  },
  {
    title: 'Pilot import (8.45)',
    items: [
      'Staging gym isolated from production',
      'Members import committed — spot-check 10 records',
      'Leads, classes, attendance, belts imported',
      'Stripe customer IDs mapped (no card data)',
      'Waiver PDFs linked by email',
      'Profile photos on member records',
      'Operations lead sign-off',
      'Billing admin sign-off',
      'Gym owner sign-off',
    ],
  },
];

export default function PilotChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      // ignore
    }
  }, []);

  const toggle = (key: string) => {
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const total = SECTIONS.reduce((n, s) => n + s.items.length, 0);
  const done = Object.values(checked).filter(Boolean).length;

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <ClipboardCheck size={18} /> Pilot import checklist
        </h2>
        <span className="text-white/40 text-xs">
          {done}/{total} complete
        </span>
      </div>
      <p className="text-white/30 text-xs mb-4">
        Track staging pilot progress (8.45). Saved in this browser only. See docs/WAVE2_MIGRATION_SIGNOFF.md in the repo for printable sign-off.
      </p>
      <div className="space-y-4">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="text-white/50 text-xs font-medium mb-2">{section.title}</p>
            <ul className="space-y-2">
              {section.items.map((item) => {
                const key = `${section.title}:${item}`;
                return (
                  <li key={key}>
                    <label className="flex items-start gap-2 text-sm text-white/70 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(checked[key])}
                        onChange={() => toggle(key)}
                        className="mt-0.5 h-4 w-4 rounded accent-blue-500"
                      />
                      {item}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
