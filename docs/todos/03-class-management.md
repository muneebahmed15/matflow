# Module 3: Class Management (52 todos)



## Schedule

- [x] 3.1 Classes table with day/time/capacity (done)

- [x] 3.2 Create class form (done)

- [x] 3.3 Delete class (done)

- [x] 3.4 Group classes by day of week UI (done)

- [x] 3.5 Edit class (update action missing)

- [x] 3.6 Duplicate class to another day

- [x] 3.7 Recurring class series (RRULE or template)

- [x] 3.8 One-off class exceptions (cancellations)

- [x] 3.9 Class color/category tags

- [x] 3.10 Class description field



## Instructors

- [x] 3.11 Instructor as text field (done)

- [x] 3.12 `instructor_staff_id` FK to staff_roles + staff picker UI

- [x] 3.13 Substitute instructor field

- [x] 3.14 Instructor conflict detection

- [x] 3.15 Public site shows instructor bios (coaches page)



## Capacity

- [x] 3.16 Capacity integer on class (done)

- [x] 3.17 Enrolled count per class session (classes page shows enrolled/capacity)

- [x] 3.18 Capacity warning when near full (count turns red at capacity)

- [x] 3.19 Block enrollment when at capacity (service throws 409, suggests waitlist)

- [x] 3.20 Overbooking allowance setting



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

- [x] 3.30 Attendance report per class (30-day avg on classes page)

- [x] 3.31 Link kiosk check-in to optional class_id



## Booking / Enrollment

- [x] 3.32 Member enrolls in recurring class (`class_enrollments` + portal booking)

- [x] 3.33 Drop-in booking for single session (portal + `class_session_bookings`)

- [x] 3.34 Booking cancellation policy (`gyms.booking_cancel_hours`)

- [x] 3.35 Trial class booking from public site (schedule → trial link with class pre-fill)



## Public Schedule

- [x] 3.36 Public schedule page `/g/[slug]/schedule` (Wave 1)

- [x] 3.37 iCal export per gym

- [x] 3.38 Embed widget for external websites

- [x] 3.39 Timezone-aware display

- [x] 3.40 Mobile-friendly schedule grid



## Integrations

- [x] 3.41 Google Calendar sync (export)

- [x] 3.42 Reminder notifications before class

- [x] 3.43 Low attendance class alert (AI assistant)



## Admin

- [x] 3.44 Bulk import class schedule CSV

- [x] 3.45 Copy schedule from another gym (template)

- [x] 3.46 Seasonal schedule templates

- [x] 3.47 Class analytics: avg attendance

- [x] 3.48 Class analytics: revenue attribution



## Permissions

- [x] 3.49 Coaches can manage classes (done)

- [x] 3.50 Coaches cannot delete past session attendance

- [x] 3.51 Class-level permission overrides



## Testing

- [x] 3.52 Unit tests for waitlist ordering logic

