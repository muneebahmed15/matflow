'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode,  } from 'react';
import { useAsyncMount } from '@/hooks/use-async-mount';
import { supabase } from '@/lib/supabase';

export type PortalMember = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  gym_id: string;
  belt_rank: string;
  status: string;
  family_id: string | null;
  portal_role: string;
  stripe_count?: number;
  date_of_birth?: string | null;
};

type PortalMemberContextValue = {
  loading: boolean;
  authMember: PortalMember | null;
  familyMembers: PortalMember[];
  activeMember: PortalMember | null;
  setActiveMemberId: (id: string) => void;
};

const PortalMemberContext = createContext<PortalMemberContextValue | null>(null);
const STORAGE_KEY = 'portal_active_member_id';

export function PortalMemberProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authMember, setAuthMember] = useState<PortalMember | null>(null);
  const [familyMembers, setFamilyMembers] = useState<PortalMember[]>([]);
  const [activeMemberId, setActiveMemberIdState] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      setLoading(false);
      return;
    }

    const { data: member } = await supabase
      .from('members')
      .select('id, first_name, last_name, email, gym_id, belt_rank, status, family_id, portal_role, stripe_count, date_of_birth')
      .eq('email', user.email)
      .maybeSingle();

    if (!member) {
      setLoading(false);
      return;
    }

    setAuthMember(member as PortalMember);

    let members: PortalMember[] = [member as PortalMember];
    if (member.family_id) {
      const { data: family } = await supabase
        .from('members')
        .select('id, first_name, last_name, email, gym_id, belt_rank, status, family_id, portal_role, stripe_count, date_of_birth')
        .eq('family_id', member.family_id)
        .eq('gym_id', member.gym_id)
        .order('first_name');
      if (family?.length) members = family as PortalMember[];
    }

    setFamilyMembers(members);

    const stored = typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null;
    const validStored = stored && members.some((m) => m.id === stored) ? stored : member.id;
    setActiveMemberIdState(validStored);
    setLoading(false);
  }, []);

  useAsyncMount(load, [load]);

  const setActiveMemberId = useCallback((id: string) => {
    setActiveMemberIdState(id);
    sessionStorage.setItem(STORAGE_KEY, id);
  }, []);

  const activeMember = useMemo(
    () => familyMembers.find((m) => m.id === activeMemberId) ?? authMember,
    [familyMembers, activeMemberId, authMember]
  );

  const value = useMemo(
    () => ({
      loading,
      authMember,
      familyMembers,
      activeMember,
      setActiveMemberId,
    }),
    [loading, authMember, familyMembers, activeMember, setActiveMemberId]
  );

  return (
    <PortalMemberContext.Provider value={value}>{children}</PortalMemberContext.Provider>
  );
}

export function usePortalMember() {
  const ctx = useContext(PortalMemberContext);
  if (!ctx) throw new Error('usePortalMember must be used within PortalMemberProvider');
  return ctx;
}
