# Module 7: Public Website (56 todos)

## Routing & Tenancy
- [x] 7.1 Route group `/g/[gymSlug]/*` (Wave 1)
- [x] 7.2 Resolve gym by slug middleware/helper (`getPublicGymBySlug`)
- [x] 7.3 Custom domain → gym resolution (proxy rewrite in `src/lib/supabase/proxy.ts`)
- [x] 7.4 404 when website_enabled=false (`getPublicGymBySlug` filters + `notFound()`)
- [~] 7.5 Canonical URL (gym-level via layout; per-subpage paths only on blog/locations)

## Pages — Core
- [x] 7.6 Home page (Wave 1)
- [x] 7.7 About page
- [x] 7.8 Programs page
- [x] 7.9 Coaches page
- [x] 7.10 Schedule page (classes, .ics export, book-trial links)
- [x] 7.11 Pricing page (plans)
- [x] 7.12 Contact page
- [x] 7.13 Trial booking page → creates lead
- [x] 7.14 Reviews page
- [x] 7.15 Gallery page

## Content Management
- [x] 7.16 Gym content tables/columns (gym_programs, gym_coaches, gym_gallery, tagline, about_text)
- [x] 7.17 Admin CMS (`/website-content` page)
- [~] 7.18 Logo URL upload (no dedicated hero image)
- [x] 7.19 Programs list create/delete (no edit)
- [~] 7.20 Coach bios CRUD (not linked to staff_roles)

## Branding
- [x] 7.21 Apply gym primary_color to public CSS variables (Wave 1)
- [x] 7.22 Logo in public header (Wave 1)
- [ ] 7.23 Favicon per gym
- [x] 7.24 Footer with gym address/contact + newsletter signup

## SEO
- [x] 7.25 sitemap.ts exists (platform level)
- [x] 7.26 robots.ts exists
- [x] 7.27 Per-gym metadata (title, description) via `buildGymPageMetadata`
- [x] 7.28 JSON-LD LocalBusiness schema per gym (layout)
- [x] 7.29 OG images per gym (logo used for og/twitter images)
- [x] 7.30 Dynamic sitemap includes all public gyms

## Lead Capture
- [x] 7.31 Trial booking form → leads table (Wave 1)
- [x] 7.32 Contact form → leads + email notification
- [x] 7.33 Newsletter signup (footer + `/api/public/newsletter`)
- [x] 7.34 Chat widget (AI front desk widget)
- [x] 7.35 UTM parameter capture on leads

## Performance
- [x] 7.36 ISR/cache public pages (revalidate=300 on gym layout)
- [~] 7.37 Image optimization via next/image (logo uses img for remote domains)
- [ ] 7.38 Lighthouse score > 90 mobile (manual check)

## Mobile
- [x] 7.39 Responsive layout all pages (Wave 1)
- [x] 7.40 Sticky mobile CTA (Book Trial)
- [x] 7.41 Click-to-call phone links

## Integrations
- [x] 7.42 Google Maps embed on contact
- [x] 7.43 Facebook pixel hook (MarketingPixels)
- [x] 7.44 Google Analytics 4 per gym (MarketingPixels)

## Settings Link
- [x] 7.45 Dashboard settings: preview public site URL (Wave 1)
- [x] 7.46 Toggle website_enabled (Wave 1)

## Testing
- [ ] 7.47 E2E: public home loads for enabled gym
- [ ] 7.48 E2E: trial form creates lead
- [ ] 7.49 E2E: disabled gym returns 404

## Future
- [x] 7.50 Blog posts per gym
- [ ] 7.51 Multi-language public site
- [ ] 7.52 A/B test hero variants
- [x] 7.53 Online class booking from schedule (book-trial links + portal drop-ins)
- [x] 7.54 Member login link in header
- [x] 7.55 Privacy policy page template
- [x] 7.56 Terms of service page template
