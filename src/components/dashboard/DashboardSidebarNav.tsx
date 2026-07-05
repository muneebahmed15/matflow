'use client';

import type { StaffRole } from '@/lib/permissions';
import { canAccessRoute } from '@/lib/permissions';
import { DASHBOARD_NAV_GROUPS } from '@/lib/dashboard-nav';

type Props = {
  pathname: string;
  role: StaffRole | null;
  marketingEnabled: boolean;
  onNavigate?: () => void;
};

function isNavActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardSidebarNav({
  pathname,
  role,
  marketingEnabled,
  onNavigate,
}: Props) {
  const groups = DASHBOARD_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.requiresMarketing && !marketingEnabled) return false;
      return canAccessRoute(role, item.href);
    }),
  })).filter((group) => group.items.length > 0);

  return (
    <nav className="flex-1 px-3 py-4 overflow-y-auto">
      {groups.map((group, groupIndex) => (
        <div key={group.label} className={groupIndex > 0 ? 'mt-5' : ''}>
          <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map(({ label, href, icon: Icon }) => {
              const active = isNavActive(pathname, href);
              return (
                <a
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-blue-600/15 text-white border border-blue-600/20'
                      : 'text-gray-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={18} className={active ? 'text-blue-500' : ''} />
                  {label}
                  {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
                </a>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
