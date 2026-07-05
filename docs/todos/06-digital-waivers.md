# Module 6: Digital Waivers (51 todos)

## Waiver Templates
- [x] 6.1 Waivers table (done)
- [x] 6.2 Create waiver (done)
- [x] 6.3 Toggle active/inactive (done)
- [x] 6.4 Waiver list page (done)
- [x] 6.5 Waiver rich text editor
- [x] 6.6 Waiver version numbering (`waivers.version`, bumped on content edit)
- [x] 6.7 Waiver expires_at field (Wave 1)
- [x] 6.8 Require re-sign on template update (compliance checks signed version)
- [x] 6.9 Waiver templates library (General, BJJ, MMA presets)
- [x] 6.10 Multi-language waiver support (`waiver_translations` table)

## Signing
- [x] 6.11 waiver_signatures table (done)
- [x] 6.12 Staff-assisted signing (done)
- [x] 6.13 Member portal signing (done)
- [x] 6.14 Canvas signature capture (draw)
- [x] 6.15 Parent signs for minor (guardian_name required when member is under 18)
- [x] 6.16 IP address + user agent on signature
- [x] 6.17 Signature timestamp timezone-aware display

## Storage & Compliance
- [x] 6.18 Store signed PDF in Supabase Storage
- [x] 6.19 Immutable signature record (no delete)
- [x] 6.20 GDPR export member waiver history
- [x] 6.21 Retention policy config per gym
- [x] 6.22 Legal hold flag on signature

## Expiration
- [x] 6.23 Check waiver expiry on check-in (Wave 1)
- [x] 6.24 Dashboard: members with expired waivers
- [x] 6.25 Email reminder before expiry
- [x] 6.26 Block check-in if waiver expired (configurable)

## Notifications
- [x] 6.27 waiver_signed notification type (done)
- [x] 6.28 Send waiver link via email to member
- [x] 6.29 Bulk send waiver to all active members
- [x] 6.30 Waiver completion rate report

## Portal
- [x] 6.31 Portal waivers page (done)
- [x] 6.32 Download signed waiver PDF
- [x] 6.33 Show pending vs signed status

## Staff Views
- [x] 6.34 Waiver detail with signatures (done)
- [x] 6.35 Member profile waivers tab (done)
- [x] 6.36 Export signatures CSV
- [x] 6.37 Print-friendly waiver view (`/waivers/[id]/print`)

## Kiosk / Onboarding
- [x] 6.38 Kiosk waiver sign before first check-in (inline modal when check-in blocked)
- [x] 6.39 New member auto-assigned active waivers (active waivers show as pending for all members)
- [x] 6.40 Trial member waiver flow

## API
- [x] 6.41 Public API: get active waivers for gym (anon, kiosk-gated)
- [x] 6.42 Webhook on signature completed (`gyms.signature_webhook_url`)

## Testing
- [x] 6.43 Unit test signWaiver idempotency
- [x] 6.44 RLS: member can only sign own waivers (family portal read test)

## Integrations
- [x] 6.45 DocuSign export path (`exportSignatureForDocuSign` + webhook)
- [x] 6.46 Import signed waivers from PDF upload (Migration Center bulk import)
- [x] 6.47 Waiver merge fields (member name, date)
- [x] 6.48 Minor age verification field (`members.date_of_birth`)
- [x] 6.49 Witness signature field
- [x] 6.50 State-specific waiver templates (`STATE_WAIVER_TEMPLATES` library)
- [x] 6.51 Audit log on waiver template edits
