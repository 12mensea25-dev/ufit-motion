# Ufit Motion Written Explanation

## What I improved

I aligned the app to the build test requirements so the demo now clearly shows:

1. Separate admin and coach portals
2. Coach submission tools for PE class data, end-of-day reports, and incidents
3. Admin visibility across schools with a school filter
4. Coach performance scoring based on engagement plus end-of-day report completion
5. Visible incident alerts in the admin dashboard
6. Admin-side report review for end-of-day submissions

## Core tables

- `schools`
  Stores each school and its district.
- `grades`
  Stores grade labels and display order.
- `skills`
  Stores PE skills, abbreviations, units, and whether a lower or higher score is better.
- `users`
  Stores admin and coach logins, school assignment, and verification fields.
- `pe_sessions`
  Stores coach-submitted class entries by school, grade, date, coach, and engagement rating.
- `session_results`
  Stores the individual skill scores tied to each PE session.
- `eod_reports`
  Stores the coach end-of-day reports, including daily summary, celebrations, follow-up, and support needs.
- `incidents`
  Stores coach-submitted incident reports and admin follow-up.
- `alerts`
  Stores unread admin alerts tied to incidents.

## How the data is connected

- A coach belongs to one school through `users.school_id`.
- A PE session belongs to a school and grade through `pe_sessions.school_id` and `pe_sessions.grade_id`.
- A PE session can have many skill scores through `session_results.session_id`.
- An end-of-day report belongs to a school and coach through `eod_reports.school_id` and `eod_reports.created_by`.
- An incident belongs to a school and coach through `incidents.school_id` and `incidents.created_by`.
- An unread admin alert points to a submitted incident through `alerts.incident_id`.

## How a coach submission flows through the system

1. A coach signs in through the coach portal.
2. The coach saves a PE class entry in `Capture`.
3. That class entry stores engagement and skill scores in `pe_sessions` and `session_results`.
4. The coach then submits an end-of-day report in `Activity`.
5. That report is stored in `eod_reports`.
6. The admin dashboard pulls fresh data from the backend and recalculates the coach score.
7. If a coach submits an incident, the app creates an `incident` record and an unread `alert` for admin.

## How the coach score works

The coach performance score is intentionally simple:

- Up to 50 points come from average engagement rating
- Up to 50 points come from completion of end-of-day reports in the last 30 days

This means the admin scorecard reflects both:

- quality of engagement during class
- consistency of coach reporting

## What would break if usage increased

The app works well for a demo and small local use, but a few things would need to be upgraded for larger usage:

1. SQLite would become a bottleneck with many concurrent users
2. Real-time refresh would need a stronger approach like websockets or event-based updates
3. File/photo processing would need queueing and background jobs
4. Auth would need production-grade password reset, invite flows, and audit logging
5. Hosting would need persistent managed storage and a real Postgres database

## What I would improve next

1. Finish the Supabase/Postgres connection for persistent hosted data
2. Add invite-based coach onboarding instead of open account creation
3. Add exportable school and district reports
4. Add edit history for incidents, EOD reports, and score changes
5. Add class roster tools so coaches can organize grade groups more easily

## What I would build after that

1. Native-feeling mobile packaging for iPhone and Android
2. Push or email notifications for urgent incident alerts
3. Bulk CSV import for historical PE data
4. District benchmarking across date ranges
5. Supervisor dashboards for multi-school program oversight
