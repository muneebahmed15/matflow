# Module 3: Class Management (52 todos)



## Schedule

- [x] 3.1 Classes table with day/time/capacity (done)

- [x] 3.2 Create class form (done)

- [x] 3.3 Delete class (done)

- [x] 3.4 Group classes by day of week UI (done)

- [x] 3.5 Edit class (update action missing)

- [ ] 3.6 Duplicate class to another day

- [ ] 3.7 Recurring class series (RRULE or template)

- [ ] 3.8 One-off class exceptions (cancellations)

- [ ] 3.9 Class color/category tags

- [ ] 3.10 Class description field



## Instructors

- [x] 3.11 Instructor as text field (done)

- [ ] 3.12 `instructor_id` FK to staff_roles

- [ ] 3.13 Substitute instructor field

- [ ] 3.14 Instructor conflict detection

- [ ] 3.15 Public site shows instructor bios



## Capacity

- [x] 3.16 Capacity integer on class (done)

- [ ] 3.17 Enrolled count per class session

- [ ] 3.18 Capacity warning when near full

- [ ] 3.19 Block enrollment when at capacity

- [ ] 3.20 Overbooking allowance setting



## Waitlists

- [x] 3.21 `class_waitlist` table (Wave 1)

- [x] 3.22 Join waitlist from class page

- [x] 3.23 Waitlist position ordering

- [x] 3.24 Auto-promote from waitlist on cancellation

- [x] 3.25 Waitlist notification email

- [x] 3.26 Member portal: view waitlist status



## Attendance per Class

- [x] 3.27 `class_sessions` table (date + class_id)

- [x] 3.28 `class_attendance` links member to session

- [x] 3.29 Staff marks attendance for a class session

- [ ] 3.30 Attendance report per class

- [ ] 3.31 Link kiosk check-in to optional class_id



## Booking / Enrollment

- [ ] 3.32 Member enrolls in recurring class

- [ ] 3.33 Drop-in booking for single session

- [ ] 3.34 Booking cancellation policy

- [ ] 3.35 Trial class booking from public site



## Public Schedule

- [x] 3.36 Public schedule page `/g/[slug]/schedule` (Wave 1)

- [x] 3.37 iCal export per gym

- [ ] 3.38 Embed widget for external websites

- [ ] 3.39 Timezone-aware display

- [ ] 3.40 Mobile-friendly schedule grid



## Integrations

- [ ] 3.41 Google Calendar sync (export)

- [ ] 3.42 Reminder notifications before class

- [ ] 3.43 Low attendance class alert (AI assistant)



## Admin

- [ ] 3.44 Bulk import class schedule CSV

- [ ] 3.45 Copy schedule from another gym (template)

- [ ] 3.46 Seasonal schedule templates

- [ ] 3.47 Class analytics: avg attendance

- [ ] 3.48 Class analytics: revenue attribution



## Permissions

- [x] 3.49 Coaches can manage classes (done)

- [ ] 3.50 Coaches cannot delete past session attendance

- [ ] 3.51 Class-level permission overrides



## Testing

- [ ] 3.52 Unit tests for waitlist ordering logic

