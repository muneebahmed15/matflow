'use client';

import { useEffect, useState } from 'react';
import { usePortalMember } from '@/lib/portal-member-context';

type Props = {
  verifyUrl: string;
};

export default function MemberRankQr({ verifyUrl }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const QRCode = await import('qrcode');
      const url = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 180 });
      if (!cancelled) setDataUrl(url);
    })();
    return () => {
      cancelled = true;
    };
  }, [verifyUrl]);

  if (!dataUrl) {
    return <div className="w-[180px] h-[180px] bg-white/5 rounded-xl animate-pulse mx-auto" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={dataUrl} alt="Membership rank QR code" className="mx-auto rounded-xl bg-white p-2" width={180} height={180} />
  );
}

export function MemberRankCardSection() {
  const { activeMember } = usePortalMember();
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeMember) return;
    void (async () => {
      const res = await fetch('/api/portal/member-rank-card');
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not load membership card');
        return;
      }
      setVerifyUrl(data.verify_url as string);
    })();
  }, [activeMember?.id]);

  if (error || !verifyUrl) return null;

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6 text-center">
      <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Membership card</p>
      <MemberRankQr verifyUrl={verifyUrl} />
      <p className="text-white/30 text-xs mt-3">Scan to verify rank at events or the front desk</p>
    </div>
  );
}
