'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { usePortalMember } from '@/lib/portal-member-context';
import { canEditProfile } from '@/lib/portal/billing-access';

type Contact = {
  id: string;
  full_name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
};

export default function PortalProfilePage() {
  const { activeMember, loading: memberLoading } = usePortalMember();
  const [phone, setPhone] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [ecName, setEcName] = useState('');
  const [ecPhone, setEcPhone] = useState('');
  const [ecRel, setEcRel] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const editAllowed = activeMember ? canEditProfile(activeMember.portal_role) : false;

  const loadContacts = async (memberId: string) => {
    const { data } = await supabase
      .from('emergency_contacts')
      .select('id, full_name, phone, relationship, is_primary')
      .eq('member_id', memberId);
    setContacts((data as Contact[]) ?? []);
  };

  useEffect(() => {
    if (!activeMember) return;
    void (async () => {
      setPhone('');
      const { data: member } = await supabase
        .from('members')
        .select('phone')
        .eq('id', activeMember.id)
        .single();
      setPhone(member?.phone ?? '');
      await loadContacts(activeMember.id);
      setLoading(false);
    })();
  }, [activeMember]);

  const save = async () => {
    if (!activeMember || !editAllowed) return;
    setSaving(true);
    setSaved(false);
    const res = await fetch('/api/portal/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, member_id: activeMember.id }),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
  };

  const addContact = async () => {
    if (!activeMember || !editAllowed) return;
    const res = await fetch('/api/portal/emergency-contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: ecName,
        phone: ecPhone,
        relationship: ecRel,
        is_primary: contacts.length === 0,
        member_id: activeMember.id,
      }),
    });
    if (res.ok) {
      setEcName('');
      setEcPhone('');
      setEcRel('');
      await loadContacts(activeMember.id);
    }
  };

  if (memberLoading || loading || !activeMember) {
    return <p className="text-white/40 py-12 text-center">Loading...</p>;
  }

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="space-y-6">
      <div>
        <Link href="/portal" className="text-sm text-gray-400 hover:text-white">← Back</Link>
        <h1 className="text-2xl font-bold mt-2">My Profile</h1>
        <p className="text-white/40 text-sm mt-1">
          {activeMember.first_name} {activeMember.last_name}
        </p>
      </div>

      {!editAllowed && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white/50">
          Profile edits are managed by the primary account holder for this family.
        </div>
      )}

      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-4">
        <div>
          <label className="text-white/40 text-xs">Name</label>
          <p className="text-white font-medium">
            {activeMember.first_name} {activeMember.last_name}
          </p>
        </div>
        <div>
          <label className="text-white/40 text-xs">Email</label>
          <p className="text-white/60 text-sm">{activeMember.email ?? '—'}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            placeholder="555-0100"
            disabled={!editAllowed}
          />
        </div>
        {saved && <p className="text-green-400 text-sm">Profile saved.</p>}
        {editAllowed && (
          <button
            onClick={() => void save()}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        )}
      </div>

      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-white">Emergency Contacts</h2>
        {contacts.length === 0 ? (
          <p className="text-white/30 text-sm">No emergency contacts on file.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {contacts.map((c) => (
              <li key={c.id} className="text-white/70">
                {c.full_name} · {c.relationship} · {c.phone}
                {c.is_primary && <span className="text-blue-400 text-xs ml-1">Primary</span>}
              </li>
            ))}
          </ul>
        )}
        {editAllowed && (
          <>
            <input value={ecName} onChange={(e) => setEcName(e.target.value)} placeholder="Contact name" className={inputClass} />
            <input value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} placeholder="Phone" className={inputClass} />
            <input value={ecRel} onChange={(e) => setEcRel(e.target.value)} placeholder="Relationship" className={inputClass} />
            <button
              onClick={() => void addContact()}
              disabled={!ecName || !ecPhone || !ecRel}
              className="w-full bg-white/10 hover:bg-white/15 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50"
            >
              Add Emergency Contact
            </button>
          </>
        )}
      </div>
    </div>
  );
}
