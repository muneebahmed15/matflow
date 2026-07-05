# Lighthouse Audit Checklist (7.38)

Manual performance and accessibility audit steps for public gym sites (`/g/[gymSlug]/*`).

## Before you start

- Use Chrome DevTools → Lighthouse (or PageSpeed Insights) in **Incognito** to avoid extensions.
- Test both **Mobile** and **Desktop** profiles.
- Run against production or a Vercel preview URL with `website_enabled` true.

## Pages to audit

1. Home — `/g/{slug}`
2. Schedule — `/g/{slug}/schedule`
3. Pricing — `/g/{slug}/pricing`
4. Contact / trial — `/g/{slug}/contact` and trial form
5. Embed schedule (if used) — `/embed/schedule/{slug}`

## Performance targets

- [ ] LCP under 2.5s on mobile
- [ ] CLS under 0.1
- [ ] INP / TBT acceptable (no long main-thread blocks)
- [ ] Hero image uses Next.js image optimization or reasonable file size
- [ ] No render-blocking third-party scripts on first paint (defer GA4 / Meta pixel)

## Accessibility

- [ ] Page has a single logical `h1`
- [ ] Color contrast passes on primary buttons and nav links
- [ ] Form inputs have associated labels
- [ ] Focus states visible on interactive elements
- [ ] Alt text on logo and hero images

## SEO

- [ ] Unique title and meta description per page
- [ ] Canonical URL correct for custom domain gyms
- [ ] Open Graph tags present on home page

## Best practices

- [ ] HTTPS only
- [ ] No console errors on load
- [ ] Cookie/consent banner if marketing pixels enabled

## Record results

| Page | Mobile perf | Mobile a11y | Desktop perf | Notes |
|------|-------------|-------------|--------------|-------|
| Home | | | | |
| Schedule | | | | |
| Pricing | | | | |

Fix regressions before marking 7.38 complete.
