import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  UsersRound,
  Dumbbell,
  UserCheck,
  Calendar,
  Award,
  Trophy,
  CalendarDays,
  FileText,
  CreditCard,
  Megaphone,
  Inbox,
  StickyNote,
  Globe,
  ShoppingBag,
  Bot,
  Sparkles,
  Upload,
  ShieldCheck,
  ScrollText,
  Settings,
} from 'lucide-react';

export type DashboardNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Hide when gym marketing module is disabled */
  requiresMarketing?: boolean;
};

export type DashboardNavGroup = {
  label: string;
  items: DashboardNavItem[];
};

export const DASHBOARD_NAV_GROUPS: DashboardNavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'People',
    items: [
      { label: 'Members', href: '/members', icon: Users },
      { label: 'Leads', href: '/leads', icon: UserPlus },
      { label: 'Families', href: '/families', icon: UsersRound },
    ],
  },
  {
    label: 'Classes & Attendance',
    items: [
      { label: 'Classes', href: '/classes', icon: Dumbbell },
      { label: 'Check-In', href: '/attendance/check-in', icon: UserCheck },
      { label: 'Attendance Log', href: '/attendance/log', icon: Calendar },
    ],
  },
  {
    label: 'Progress',
    items: [
      { label: 'Belts', href: '/belts', icon: Award },
      { label: 'Competitions', href: '/competitions', icon: Trophy },
      { label: 'Events', href: '/events', icon: CalendarDays },
    ],
  },
  {
    label: 'Billing',
    items: [
      { label: 'Plans', href: '/plans', icon: CreditCard },
      { label: 'Subscriptions', href: '/subscriptions', icon: CreditCard },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { label: 'Campaigns', href: '/marketing', icon: Megaphone, requiresMarketing: true },
      { label: 'Inbox', href: '/inbox', icon: Inbox },
      { label: 'Notes', href: '/notes', icon: StickyNote },
      { label: 'Website', href: '/website-content', icon: Globe },
      { label: 'Shop', href: '/shop', icon: ShoppingBag },
    ],
  },
  {
    label: 'AI & Insights',
    items: [
      { label: 'AI Desk', href: '/ai-desk', icon: Bot },
      { label: 'Insights', href: '/insights', icon: Sparkles },
    ],
  },
  {
    label: 'Compliance',
    items: [{ label: 'Waivers', href: '/waivers', icon: FileText }],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Staff', href: '/staff', icon: ShieldCheck },
      { label: 'Migration', href: '/migration', icon: Upload },
      { label: 'Audit Log', href: '/audit', icon: ScrollText },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];
