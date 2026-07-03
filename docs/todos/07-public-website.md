# Module 7: Public Website (56 todos)

## Routing & Tenancy
- [~] 7.1 Route group `/g/[gymSlug]/*` (Wave 1)
- [~] 7.2 Resolve gym by slug middleware/helper
- [ ] 7.3 Custom domain → gym resolution
- [ ] 7.4 404 when website_enabled=false
- [ ] 7.5 Canonical URL per page

## Pages — Core
- [~] 7.6 Home page (Wave 1)
- [~] 7.7 About page
- [~] 7.8 Programs page
- [~] 7.9 Coaches page
- [~] 7.10 Schedule page (classes)
- [~] 7.11 Pricing page (plans)
- [~] 7.12 Contact page
- [~] 7.13 Trial booking page → creates lead
- [ ] 7.14 Reviews page
- [ ] 7.15 Gallery page

## Content Management
- [ ] 7.16 `gym_website_content` JSONB or table
- [ ] 7.17 Admin CMS in settings for each page section
- [ ] 7.18 Hero image upload
- [ ] 7.19 Programs list CRUD
- [ ] 7.20 Coach bios CRUD linked to staff

## Branding
- [~] 7.21 Apply gym primary_color to public CSS variables (Wave 1)
- [~] 7.22 Logo in public header (Wave 1)
- [ ] 7.23 Favicon per gym
- [ ] 7.24 Footer with gym address/social links

## SEO
- [x] 7.25 sitemap.ts exists (platform level)
- [x] 7.26 robots.ts exists
- [ ] 7.27 Per-gym metadata (title, description)
- [ ] 7.28 JSON-LD LocalBusiness schema per gym
- [ ] 7.29 OG images per gym
- [ ] 7.30 Dynamic sitemap includes all public gyms

## Lead Capture
- [~] 7.31 Trial booking form → leads table (Wave 1)
- [ ] 7.32 Contact form → leads + email notification
- [ ] 7.33 Newsletter signup
- [ ] 7.34 Chat widget placeholder (AI module)
- [ ] 7.35 UTM parameter capture on leads

## Performance
- [ ] 7.36 ISR/cache public pages
- [ ] 7.37 Image optimization via next/image
- [ ] 7.38 Lighthouse score > 90 mobile

## Mobile
- [~] 7.39 Responsive layout all pages (Wave 1)
- [ ] 7.40 Sticky mobile CTA (Book Trial)
- [ ] 7.41 Click-to-call phone links

## Integrations
- [ ] 7.42 Google Maps embed on contact
- [ ] 7.43 Facebook pixel hook
- [ ] 7.44 Google Analytics 4 per gym

## Settings Link
- [~] 7.45 Dashboard settings: preview public site URL (Wave 1)
- [~] 7.46 Toggle website_enabled (Wave 1)

## Testing
- [ ] 7.47 E2E: public home loads for enabled gym
- [ ] 7.48 E2E: trial form creates lead
- [ ] 7.49 E2E: disabled gym returns 404

## Future
- [ ] 7.50 Blog posts per gym
- [ ] 7.51 Multi-language public site
- [ ] 7.52 A/B test hero variants
- [ ] 7.53 Online class booking from schedule
- [x] 7.54 Member login link in header
- [ ] 7.55 Privacy policy page template
- [ ] 7.56 Terms of service page template
