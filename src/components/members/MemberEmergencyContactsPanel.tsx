'use client';

import { useState } from 'react';
import { useAsyncMount } from '@/hooks/use-async-mount';
import { Plus, Trash2, User } from 'lucide-react';
import {
  createEmergencyContactAction,
  deleteEmergencyContactAction,
  listEmergencyContactsAction,
} from '@/app/(dashboard)/actions';
import type { EmergencyContact } from '@/services/emergency-contacts';

type Props = { memberId: string };

export default function MemberEmergencyContactsPanel({ memberId }: Props) {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Parent');
  const [isPrimary, setIsPrimary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const result = await listEmergencyContactsAction(memberId);
    if (result.ok && result.data) setContacts(result.data);
    setLoading(false);
  };

  useAsyncMount(load, [memberId]);

  const handleAdd = async () => {
    setSubmitting(true);
    setError('');
    const result = await createEmergencyContactAction({
      memberId,
      fullName,
      phone,
      relationship,
      isPrimary,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.data) {
      setContacts((prev) => {
        const next = isPrimary
          ? prev.map((c) => ({ ...c, is_primary: false }))
          : [...prev];
        return [...next, result.data!].sort(
          (a, b) => Number(b.is_primary) - Number(a.is_primary)
        );
      });
    }
    setFullName('');
    setPhone('');
    setRelationship('Parent');
    setIsPrimary(false);
    setShowForm(false);
  };

  const handleDelete = async (contactId: string) => {
    const result = await deleteEmergencyContactAction(memberId, contactId);
    if (result.ok) setContacts((prev) => prev.filter((c) => c.id !== contactId));
  };

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (loading) return <p className="text-white/30 text-sm py-8 text-center">Loading contacts...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-white/40 text-sm">Emergency contacts on file for this member.</p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-sm text-blue-400 hover:underline"
        >
          <Plus size={14} /> Add contact
        </button>
      </div>

      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            className={inputClass}
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
            className={inputClass}
          />
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className={inputClass}
          >
            {['Parent', 'Spouse', 'Sibling', 'Guardian', 'Other'].map((r) => (
              <option key={r} value={r} className="bg-gray-900">
                {r}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-white/60">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="rounded accent-blue-500"
            />
            Primary emergency contact
          </label>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => void handleAdd()}
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-xl"
            >
              {submitting ? 'Saving...' : 'Save Contact'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 text-white/40 text-sm hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {contacts.length === 0 ? (
        <div className="text-center py-10">
          <User size={32} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/30 text-sm">No emergency contacts on file.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="flex justify-between items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3"
            >
              <div>
                <p className="text-white font-medium text-sm">
                  {c.full_name}
                  {c.is_primary && (
                    <span className="ml-2 text-xs text-blue-400 font-normal">Primary</span>
                  )}
                </p>
                <p className="text-white/40 text-xs">
                  {c.relationship} · {c.phone}
                </p>
              </div>
              <button
                onClick={() => void handleDelete(c.id)}
                className="text-white/20 hover:text-red-400 p-1"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
