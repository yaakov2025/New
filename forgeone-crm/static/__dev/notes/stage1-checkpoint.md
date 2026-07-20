# ForgeOne Stage 1 — CRM & Jobs Complete

**Status:** APPROVED  
**Date:** 2026-07-18  

## Verified Features
- Email/password authentication (invite-only, no public signup)
- Organization multi-tenancy with server-side isolation
- Organization switcher with last-selected memory
- Role system: Super Admin, Admin, Manager, Sales
- Role permissions enforced both backend and frontend
- Customers, Contacts, Properties
- Leads with customizable pipeline stages
- Opportunities with customizable pipeline stages
- Lead → Opportunity conversion
- Opportunity → Job conversion
- Jobs with 6 statuses, Needs Review toggle, assignments
- Job detail tabs: Overview, Activity, Contacts, Tasks, Appointments, Notes, Photos, Files, Insurance
- Private storage for photos/files with presigned URLs
- Activity timeline auto-logging
- Dashboard: Open Jobs, Needs Review, Open Tasks, Recent Jobs, Upcoming Appointments
- Global org-scoped search
- Invitation email delivery via @floot/email (mail.forgeone.agclaimsworks.com)
- Pending invitations list with Resend and Copy Link
- Admin panel for Super Admin

## Not Built (by design)
Documents, Estimates, Contracts, Invoices, Payments, Accounting, Customer Portal, Personal Finance, Reports, Automations

## Key Architecture Notes
- getOrgContext enforces org isolation on every read/write
- Super Admin bypass removed — SA needs org membership for operational access
- Email from: ForgeOne <invites@mail.forgeone.agclaimsworks.com>
- Private storage uses @floot/storage with visibility: "private"
- All job write endpoints require admin or manager role
- Sales role: CRM read/write, Jobs read-only, no org settings