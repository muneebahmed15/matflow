import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export default function PortalEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: Props) {
  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-10 text-center">
      <Icon size={40} className="text-white/20 mx-auto mb-4" />
      <p className="text-white font-medium">{title}</p>
      <p className="text-white/40 text-sm mt-1 max-w-sm mx-auto">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-block mt-5 text-sm font-semibold text-blue-400 hover:underline"
        >
          {actionLabel} →
        </Link>
      )}
    </div>
  );
}
