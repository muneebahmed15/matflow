# Module 11: Marketing Platform (52 todos)

## SEO
- [x] 11.1 Platform sitemap (done)
- [x] 11.2 Per-gym meta tags
- [x] 11.3 Keyword suggestions in CMS (`suggestSeoKeywords` + Website Content panel)
- [x] 11.4 Auto-generated location pages (`/g/[slug]/locations/[locationSlug]`)
- [x] 11.5 Schema.org markup per gym (LocalBusiness JSON-LD)

## Google Business Profile
- [x] 11.6 GBP OAuth connection (`src/services/gbp.ts` + settings UI)
- [x] 11.7 Sync hours from class schedule (`syncGbpHoursFromSchedule` + Settings button)
- [x] 11.8 Post updates from dashboard (`createAndPublishGbpPost` + Marketing GBP panel)
- [x] 11.9 Reply to reviews from MatsFlow (`replyToGbpReview` + cached reviews UI)

## Blog
- [x] 11.10 `blog_posts` table per gym
- [x] 11.11 Rich text editor (`BlogRichTextEditor` toolbar for blog HTML)
- [x] 11.12 AI blog draft generator (`generateBlogDraftAction` + template/OpenAI fallback)
- [x] 11.13 SEO score for post (`computeSeoScore`)
- [x] 11.14 Publish to public site `/g/[slug]/blog`

## Email Campaigns
- [x] 11.15 `email_campaigns` table
- [x] 11.16 Audience segments (all, active, inactive, past_due, leads)
- [~] 11.17 Template editor (plain HTML body form)
- [x] 11.18 Send via Resend
- [x] 11.19 Open/click tracking (pixel + click redirect APIs)
- [x] 11.20 Unsubscribe compliance (HMAC one-click unsubscribe + opt-out filtering)

## SMS Campaigns
- [x] 11.21 SMS campaign builder (`sms_campaigns` table + Marketing page)
- [x] 11.23 Twilio send integration (`sendSmsCampaign` via existing Twilio lib)
- [x] 11.24 Character count / segment preview (`smsSegmentInfo` in UI)

## Review Requests
- [x] 11.25 Auto-request after N check-ins (review-automation service)
- [x] 11.26 Google review link generator
- [x] 11.27 Track review conversion (`link_clicked_at` + tracked review-click URL + dashboard stats)

## Social Content
- [x] 11.28 AI generate Instagram caption (`generateInstagramCaptionAction`)
- [x] 11.29 Promotion announcement template (campaign template)
- [x] 11.30 Export image with gym branding (`SocialPromoExporter` canvas PNG)
- [ ] 11.31 Schedule posts (Buffer integration future)

## Ads — Future
- [x] 11.32 Google Ads conversion pixel hook (`google_ads_conversion_id` + MarketingPixels)
- [x] 11.33 Meta Ads pixel hook (MarketingPixels)
- [x] 11.34 ROAS dashboard (campaign engagement + ad spend)

## Analytics
- [x] 11.35 Marketing dashboard page
- [x] 11.36 Lead source breakdown
- [x] 11.37 Campaign list with sent counts
- [x] 11.38 Funnel: lead → trial → member

## Automations
- [x] 11.39 Workflow: new lead → email sequence (lead automation)
- [x] 11.40 Workflow: trial reminder (lead reminders cron)
- [x] 11.41 Workflow: win-back inactive 30d

## Compliance
- [x] 11.42 CAN-SPAM footer in emails
- [x] 11.43 TCPA consent log (`sms_consent_log`)
- [x] 11.44 GDPR marketing preferences per member

## Admin UI
- [x] 11.45 Marketing nav section (admin only)
- [x] 11.46 Campaign draft / scheduled / sent / cancelled states (+ cron sender)

## Testing
- [x] 11.47 Unit test segment query builders
- [x] 11.48 Sandbox email send in dev (logs when Resend unconfigured)

## East Coast MMA Pilot
- [x] 11.49 Import existing GBP data (`importGbpLocationData` — reviews + hours)
- [x] 11.50 First email campaign template
- [x] 11.51 Review request after Nth check-in (configurable `review_checkin_threshold`, default 5)
- [x] 11.52 Marketing module feature flag (`gyms.marketing_enabled` + nav gate)
