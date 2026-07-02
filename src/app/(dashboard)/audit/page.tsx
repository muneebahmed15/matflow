'use client';

import { useEffect, useState } from 'react';
import { listAuditEventsAction } from '@/app/(dashboard)/actions';
import type { AuditEvent } from '@/services/audit';

export default function AuditLogPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await listAuditEventsAction();
      if (res.ok && res.data) setEvents(res.data);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-2">Audit Log</h1>
      <p className="text-white/40 text-sm mb-8">Admin activity history for your gym.</p>
      {loading ? (
        <p className="text-white/30 text-sm">Loading...</p>
      ) : events.length === 0 ? (
        <p className="text-white/30 text-sm">No audit events yet.</p>
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <div key={e.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-white font-medium">{e.action}</span>
                <span className="text-white/30 text-xs shrink-0">
                  {new Date(e.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-white/40 text-xs mt-1">
                {e.entity_type}
                {e.entity_id ? ` · ${e.entity_id}` : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
