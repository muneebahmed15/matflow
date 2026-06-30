export type FeatureLink = {
  title: string
  staffPath: string
  portalPath?: string
}

export const featureLinks: Record<string, FeatureLink> = {
  'Training Log': {
    title: 'Training Log',
    staffPath: '/attendance/log',
    portalPath: '/portal/attendance',
  },
  'Training Schedule': {
    title: 'Training Schedule',
    staffPath: '/classes',
  },
  'Gym Community': {
    title: 'Gym Community',
    staffPath: '/members',
    portalPath: '/portal',
  },
  'Belt Tracking': {
    title: 'Belt Tracking',
    staffPath: '/belts',
  },
  Competitions: {
    title: 'Competitions',
    staffPath: '/competitions',
  },
  'Events & Open Mats': {
    title: 'Events & Open Mats',
    staffPath: '/events',
  },
  'Kiosk Check-In': {
    title: 'Kiosk Check-In',
    staffPath: '/settings',
  },
  'Gym Management': {
    title: 'Gym Management',
    staffPath: '/dashboard',
  },
  'Digital Waivers': {
    title: 'Digital Waivers',
    staffPath: '/waivers',
    portalPath: '/portal/waivers',
  },
}

export function loginHrefForFeature(title: string) {
  const link = featureLinks[title]
  if (!link) return '/login'
  return `/login?next=${encodeURIComponent(link.staffPath)}`
}

export function portalLoginHrefForFeature(title: string) {
  const link = featureLinks[title]
  if (!link?.portalPath) return '/portal/login'
  return `/portal/login?next=${encodeURIComponent(link.portalPath)}`
}
