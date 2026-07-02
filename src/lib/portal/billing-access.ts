export type PortalRole = 'primary' | 'dependent';

export function canManageBilling(portalRole: PortalRole | string | null | undefined): boolean {
  return (portalRole ?? 'primary') === 'primary';
}

export function canEditProfile(portalRole: PortalRole | string | null | undefined): boolean {
  return (portalRole ?? 'primary') === 'primary';
}
