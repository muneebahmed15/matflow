const DEFAULT_SITE_URL = 'https://mymatflow.com'

export const siteConfig = {
  name: 'MatFlow',
  legalName: 'MatFlow',
  tagline: 'The Home of Brazilian Jiu Jitsu',
  description:
    'MatFlow is the all-in-one Brazilian Jiu-Jitsu platform for students, instructors, and gym owners. Track training, manage academies, handle attendance, belts, waivers, and memberships in one place.',
  shortDescription:
    'One place for everything BJJ. Train. Track. Connect. Compete. Run your academy.',
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL).replace(/\/$/, ''),
  locale: 'en_US',
  language: 'en',
  themeColor: '#050505',
  category: 'Sports & Fitness Software',
  keywords: [
    'Brazilian Jiu Jitsu software',
    'BJJ gym management',
    'martial arts academy software',
    'BJJ attendance tracking',
    'belt tracking software',
    'gym member portal',
    'BJJ waiver management',
    'jiu jitsu gym app',
    'academy management platform',
    'MatFlow',
  ],
  contact: {
    email: 'hello@matflow.com',
    contactType: 'customer support',
  },
  publisher: {
    name: 'Crafted Systems',
    parentOrganization: 'Crafted Systems',
  },
  eeat: {
    experience:
      'Built by active Brazilian Jiu-Jitsu practitioners who operate and train at real academies.',
    expertise:
      'Purpose-built for BJJ workflows including belt promotions, open mats, competition tracking, kiosk check-in, and academy operations.',
    authoritativeness:
      'MatFlow focuses exclusively on Brazilian Jiu-Jitsu rather than generic fitness or gym software.',
    trustworthiness:
      'Secure, gym-isolated data, digital waivers, member portals, and transparent pricing with free tiers for students and small academies.',
  },
  founders: [
    {
      name: 'MatFlow Team',
      jobTitle: 'BJJ Practitioners & Product Builders',
      description:
        'Practitioners and builders who train Brazilian Jiu-Jitsu and design software for academies.',
      knowsAbout: [
        'Brazilian Jiu-Jitsu',
        'Gym Operations',
        'Academy Management',
        'Member Experience',
      ],
    },
  ],
  knowsAbout: [
    'Brazilian Jiu-Jitsu',
    'Grappling',
    'Martial Arts Academy Management',
    'Attendance Tracking',
    'Belt Promotions',
    'Competition Management',
    'Digital Waivers',
    'Gym Subscriptions',
  ],
  sameAs: ['https://mymatflow.com'],
  featureList: [
    'Training log and attendance tracking',
    'Class scheduling and gym calendar',
    'Belt and stripe promotion history',
    'Kiosk member check-in',
    'Digital waiver collection',
    'Member portal and subscriptions',
    'Gym owner dashboard and analytics',
  ],
  offers: {
    price: '0',
    priceCurrency: 'USD',
    description: 'Free for students and free tier for small academies',
  },
} as const

export const publicRoutes = {
  home: '/',
  login: '/login',
  signup: '/signup',
  portalLogin: '/portal/login',
  portalSignup: '/portal/signup',
} as const

export const privateRoutePrefixes = [
  '/api',
  '/dashboard',
  '/members',
  '/leads',
  '/classes',
  '/attendance',
  '/belts',
  '/waivers',
  '/plans',
  '/subscriptions',
  '/staff',
  '/settings',
  '/kiosk',
  '/portal/attendance',
  '/portal/subscription',
  '/portal/waivers',
] as const

export function absoluteUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${siteConfig.url}${normalizedPath === '/' ? '' : normalizedPath}`
}
