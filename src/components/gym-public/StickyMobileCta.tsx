'use client';

import Link from 'next/link';
import type { PublicGymProfile } from '@/lib/gym-public';
import { gymPrimaryColor } from '@/lib/gym-public';

type Props = { gym: PublicGymProfile };

export default function StickyMobileCta({ gym }: Props) {
  const accent = gymPrimaryColor(gym.primary_color);
  const base = `/g/${gym.slug}`;

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-[#0A0A0A]/95 border-t border-white/10 backdrop-blur">
      <div className="flex gap-2">
        {gym.contact_phone && (
          <a
            href={`tel:${gym.contact_phone.replace(/\D/g, '')}`}
            className="flex-1 text-center py-3 rounded-xl text-sm font-semibold border border-white/20 text-white"
          >
            Call
          </a>
        )}
        <Link
          href={`${base}/trial`}
          className="flex-[2] text-center py-3 rounded-xl text-sm font-semibold text-white"
          style={{ backgroundColor: accent }}
        >
          Book Free Trial
        </Link>
      </div>
    </div>
  );
}
