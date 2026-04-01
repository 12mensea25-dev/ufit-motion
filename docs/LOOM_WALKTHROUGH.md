# Loom Walkthrough

Use this as the high-level outline for a 4-6 minute recording.

## 1. Open with the assignment goal

- This is Ufit Motion, a staff-facing PE operations app for Ufit Technologies.
- The build is focused on two roles only: admin and coach.
- The assignment asked for role-based access, school filtering, end-of-day reports, incident reporting, coach scoring, and visible alerts.

## 2. Show the two portal entry points

- Start on the landing page.
- Point out the separate `Admin Portal` and `Coach Portal`.
- Mention that each role only sees the tools that belong to that workflow.

## 3. Show the coach workflow first

- Sign in as `coach1` with password `coach123`.
- In `Overview`, explain the simple daily workflow.
- In `Capture`, show:
  - photo upload or live camera
  - PE session entry
  - engagement rating
  - skill score inputs
  - score impact preview
- Save one class entry.

## 4. Show the end-of-day report flow

- Go to `Activity`.
- Explain that the coach performance score is not just based on engagement.
- Show that the end-of-day report is what drives the completion side of the score.
- Submit an end-of-day report.
- Point out the score impact card before or after saving.

## 5. Show the incident flow

- Go to `Incidents`.
- Submit a quick incident report.
- Explain that this creates a visible admin alert and a record in the incident center.

## 6. Switch to the admin side

- Use `Switch Account`.
- Sign in as `admin` with password `admin123`.
- In `Overview`, show:
  - live stats
  - latest coach handoff
  - alert banners
- Explain that the admin side updates from coach submissions and can be refreshed manually with `Refresh Data`.

## 7. Show the reporting requirements from the PDF

- Go to `Reports`.
- Use the school filter.
- Show:
  - engagement summary
  - end-of-day reports
  - district comparison area
  - coach performance scorecard
- Explain the formula:
  - up to 50 points from engagement
  - up to 50 points from end-of-day report completion

## 8. Show incident review and follow-up

- Go to `Incidents`.
- Show the incident summary card.
- Open the coach-submitted incident.
- Add an admin reply.
- Save a follow-up date or note.
- Explain that the admin can mark it seen, note it, and track next steps.

## 9. Close with system explanation and next steps

- Mention the written explanation document covers:
  - core tables
  - data relationships
  - coach submission flow
  - scaling risks
- Close with what you would improve next:
  - persistent hosted database
  - stronger onboarding and audit history
  - mobile packaging
