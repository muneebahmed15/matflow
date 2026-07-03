export type StaffRole = 'admin' | 'supervisor' | 'coach';

export type Capability =
  | 'members.read'
  | 'members.write'
  | 'billing.read'
  | 'billing.write'
  | 'leads.read'
  | 'leads.write'
  | 'settings.write'
  | 'staff.manage'
  | 'marketing.read'
  | 'marketing.write'
  | 'classes.manage'
  | 'classes.manage_own'
  | 'checkin.write'
  | 'belts.promote'
  | 'reports.read'
  | 'shop.read'
  | 'shop.write';

export const CAPABILITIES: Record<Capability, StaffRole[]> = {
  'members.read': ['admin', 'supervisor', 'coach'],
  'members.write': ['admin', 'supervisor'],
  'billing.read': ['admin', 'supervisor'],
  'billing.write': ['admin'],
  'leads.read': ['admin', 'supervisor'],
  'leads.write': ['admin', 'supervisor'],
  'settings.write': ['admin'],
  'staff.manage': ['admin'],
  'marketing.read': ['admin', 'supervisor'],
  'marketing.write': ['admin', 'supervisor'],
  'classes.manage': ['admin', 'supervisor'],
  'classes.manage_own': ['coach'],
  'checkin.write': ['admin', 'supervisor', 'coach'],
  'belts.promote': ['admin', 'supervisor'],
  'reports.read': ['admin', 'supervisor'],
  'shop.read': ['admin', 'supervisor'],
  'shop.write': ['admin'],
};

const ROUTE_CAPABILITY: { prefix: string; capability: Capability }[] = [
  { prefix: '/settings', capability: 'settings.write' },
  { prefix: '/staff', capability: 'staff.manage' },
  { prefix: '/plans', capability: 'billing.write' },
  { prefix: '/subscriptions', capability: 'billing.read' },
  { prefix: '/leads', capability: 'leads.read' },
  { prefix: '/migration', capability: 'settings.write' },
  { prefix: '/marketing', capability: 'marketing.read' },
  { prefix: '/inbox', capability: 'marketing.read' },
  { prefix: '/shop', capability: 'shop.read' },
  { prefix: '/insights', capability: 'reports.read' },
  { prefix: '/website-content', capability: 'settings.write' },
  { prefix: '/audit', capability: 'reports.read' },
  { prefix: '/families', capability: 'members.read' },
  { prefix: '/ai-desk', capability: 'marketing.read' },
];

export function hasCapability(role: StaffRole | null, capability: Capability): boolean {
  if (!role) return false;
  if (role === 'admin') return true;
  return CAPABILITIES[capability]?.includes(role) ?? false;
}

export function canAccessRoute(role: StaffRole | null, path: string): boolean {
  if (!role) return false;
  if (role === 'admin') return true;

  for (const { prefix, capability } of ROUTE_CAPABILITY) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return hasCapability(role, capability);
    }
  }

  return hasCapability(role, 'members.read');
}

export function staffRoleLabel(role: StaffRole): string {
  if (role === 'coach') return 'Instructor';
  if (role === 'supervisor') return 'Supervisor';
  return 'Admin';
}
