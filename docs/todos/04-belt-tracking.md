# Module 4: Belt Tracking (50 todos)

## Rank Storage
- [x] 4.1 `members.belt_rank` field (done)
- [~] 4.2 `members.stripe_count` integer (Wave 1)
- [ ] 4.3 Belt system per gym (BJJ vs Karate vs TKD)
- [ ] 4.4 Custom belt order configuration
- [ ] 4.5 Belt colors config in gym settings

## Promotions
- [x] 4.6 `belt_promotions` history table (done)
- [x] 4.7 Promote member UI (done)
- [x] 4.8 Promotion notes field (done)
- [ ] 4.9 Promotion ceremony date separate from promoted_at
- [ ] 4.10 Promotion certificate PDF generation
- [ ] 4.11 Bulk promotion event (belt ceremony mode)
- [ ] 4.12 Undo promotion (admin only)
- [ ] 4.13 Promotion approval workflow (coach proposes, admin approves)

## Stripes
- [~] 4.14 Add stripe on member profile
- [ ] 4.15 Stripe history log table
- [ ] 4.16 Max stripes per belt rules
- [ ] 4.17 Stripe increment/decrement UI
- [ ] 4.18 Stripes reset on belt promotion

## Requirements
- [ ] 4.19 `belt_requirements` table per gym
- [ ] 4.20 Required attendance count before promotion
- [ ] 4.21 Required time at rank (days)
- [ ] 4.22 Required techniques checklist
- [ ] 4.23 Auto-suggest ready-for-promotion list
- [ ] 4.24 Attendance count query for eligibility

## Portal
- [ ] 4.25 Member portal: view current rank + stripes
- [ ] 4.26 Member portal: promotion history
- [ ] 4.27 Member portal: progress toward next rank

## Public / Marketing
- [ ] 4.28 Public site: coaches page with ranks
- [ ] 4.29 Share promotion on social (image gen)

## Reports
- [x] 4.30 Belt distribution dashboard widget (done on belts page)
- [ ] 4.31 Students by belt export CSV
- [ ] 4.32 Promotion forecast report
- [ ] 4.33 Stagnant students (no promotion in X months)

## Permissions
- [x] 4.34 Coaches can promote (done)
- [ ] 4.35 Configurable: coach can only add stripes not belts
- [ ] 4.36 Audit log on rank changes

## Data Integrity
- [ ] 4.37 Validate to_belt is valid rank for gym
- [ ] 4.38 Prevent promotion to lower rank without admin
- [ ] 4.39 Sync belt_rank with latest promotion record

## Testing
- [ ] 4.40 Unit test promoteMember updates rank + history
- [ ] 4.41 Unit test eligibility calculator

## Future
- [ ] 4.42 Competition results factor into promotion
- [ ] 4.43 Kids vs adult belt tracks
- [ ] 4.44 Stripes as separate entity for multi-discipline gyms
- [ ] 4.45 Integration with IBJJF graduation rules preset
- [ ] 4.46 Belt order API for third-party displays
- [ ] 4.47 NFC belt display at gym entrance
- [ ] 4.48 QR code on membership card showing rank
- [ ] 4.49 Historical import from spreadsheet
- [ ] 4.50 AI assistant: "who is ready for promotion?"
