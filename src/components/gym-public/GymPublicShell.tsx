import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { PublicGymProfile } from '@/lib/gym-public';
import { formatGymAddress, gymPrimaryColor } from '@/lib/gym-public';
import NewsletterSignup from '@/components/gym-public/NewsletterSignup';
import PublicHeaderExtras from '@/components/gym-public/PublicHeaderExtras';

const BASE_NAV = [
  { href: '', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/programs', label: 'Programs' },
  { href: '/coaches', label: 'Coaches' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
] as const;

function buildNav(gym: PublicGymProfile): { href: string; label: string }[] {
  const items: { href: string; label: string }[] = BASE_NAV.map((n) => ({ ...n }));
  if (gym.store_enabled) {
    items.splice(items.length - 1, 0, { href: '/shop', label: 'Shop' });
  }
  return items;
}

type Props = {
  gym: PublicGymProfile;
  children: React.ReactNode;
};

export default function GymPublicShell({ gym, children }: Props) {
  const base = `/g/${gym.slug}`;
  const accent = gymPrimaryColor(gym.primary_color);
  const address = formatGymAddress(gym);
  const nav = buildNav(gym);

  return (
    <div
      className="min-h-screen bg-[#0A0A0A] text-white"
      style={{ '--gym-accent': accent } as CSSProperties}
    >
      <header className="border-b border-white/10 bg-[#111]/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link href={base} className="flex items-center gap-3 min-w-0">
            {gym.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={gym.logo_url} alt="" className="h-9 w-9 rounded-lg object-cover" />
            ) : (
              <div
                className="h-9 w-9 rounded-lg flex items-center justify-center text-sm font-black text-white"
                style={{ backgroundColor: accent }}
              >
                {gym.name[0]?.toUpperCase()}
              </div>
            )}
            <span className="font-bold truncate">{gym.name}</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {nav.map(({ href, label }) => (
              <Link
                key={href}
                href={`${base}${href}`}
                className="px-3 py-2 text-sm text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition"
              >
                {label}
              </Link>
            ))}
          </nav>
          <PublicHeaderExtras base={base} accent={accent} />
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-20 md:pb-0">{children}</main>

      <footer className="border-t border-white/10 mt-16">
        <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col md:flex-row justify-between gap-6 text-sm text-white/40">
          <div>
            <p className="font-semibold text-white">{gym.name}</p>
            {gym.tagline && <p className="mt-1">{gym.tagline}</p>}
            {address && <p className="mt-2">{address}</p>}
          </div>
          <div className="max-w-xs">
            <p className="font-semibold text-white mb-2">Stay in the loop</p>
            <NewsletterSignup gymSlug={gym.slug} accent={accent} />
          </div>
          <div className="flex flex-col gap-1">
            {gym.contact_phone && (
              <a href={`tel:${gym.contact_phone}`} className="hover:text-white">
                {gym.contact_phone}
              </a>
            )}
            {gym.contact_email && (
              <a href={`mailto:${gym.contact_email}`} className="hover:text-white">
                {gym.contact_email}
              </a>
            )}
            <Link href={`${base}/privacy`} className="text-white/30 hover:text-white text-xs">
              Privacy
            </Link>
            <Link href={`${base}/terms`} className="text-white/30 hover:text-white text-xs">
              Terms
            </Link>
            <Link href="/portal/login" className="text-white/30 hover:text-white text-xs">
              Member login →
            </Link>
            {!gym.white_label_enabled && (
              <p className="mt-3 text-white/20 text-xs">Powered by MatFlow</p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
