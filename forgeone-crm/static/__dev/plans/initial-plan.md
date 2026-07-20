## Migration Source

The ForgeOne Hercules source archive (file ID: 940b540b-0354-4fb2-a35f-6c53a29d1a02) must be extracted into `static/__dev/import/` first. All existing interface, routes, components, workflows, and business logic should be preserved from the source. The build agent must NOT rebuild from scratch when working code already exists in the archive. 

Replace Convex/Hercules dependencies with Floot-native equivalents (authentication, database, backend functions, storage) wherever the Hercules or Convex dependencies cannot run in Floot.

## Stage 1 Scope

**In Scope:**
- Foundation (Authentication, User Accounts, Organization Settings, Roles & Permissions)
- CRM (Customers, Contacts, Properties, Leads, Opportunities)
- Jobs (Job creation, statuses, Needs Review, Tasks, Appointments, Notes, Photos, Files, Insurance, Carrier, Adjuster, Activity timeline)
- Dashboard

**Out of Scope (Saved for later):**
- Documents (document templates and generation)
- Estimates
- Contracts
- Invoices
- Payments
- Accounting
- Customer Portal
- Personal Finance
- Reports
- Automations

## Pages

### Login
Where people sign in with email and password. People create an account with email and password, but registration is invite-only. There is no unrestricted public account creation. After signing in, they land on the Dashboard. If a user belongs to multiple organizations, they see an organization switcher in the top navigation.

### Dashboard
The home page after sign-in. Shows a snapshot of the current organization's activity:
- **Open/Active Jobs** count and quick list. This count includes every job EXCEPT Completed and Canceled.
- **Needs Review** count — jobs flagged for review
- **Open Tasks** count and list of upcoming tasks
- **Recent Jobs** — the most recently created or updated jobs
- **Upcoming Appointments** — scheduled appointments in the near future
Clicking any item navigates to the relevant detail page.

### Customers
A list page for managing customers. Each customer can have multiple contacts and properties. Users can create, view, edit, and search customers. Clicking a customer opens a detail view showing their contacts, properties, and related leads/opportunities/jobs.

### Contacts
Managed within customer detail pages. Each contact has a name, role/title, email, and phone. Contacts can be linked to leads, opportunities, and jobs.

### Properties
Managed within customer detail pages. Each property has an address and property type. Properties can be linked to leads, opportunities, and jobs.

### Leads
A list/board page for managing leads. Leads progress through pipeline stages (e.g., New, Contacted, Qualified, Dead). Users can create, edit, and search leads. A lead can be converted into an opportunity, carrying over its customer, contact, and property associations.

### Opportunities
A pipeline/board view of opportunities. Each opportunity has a value, stage, expected close date, and assigned user. Users can create, edit, and search opportunities. An opportunity can be converted into a job, carrying over all related customer, contact, property, and insurance information.

### Jobs
A list page for all jobs in the current organization. Jobs can be filtered by status (exact list: New, Scheduled, In Progress, On Hold, Completed, Canceled) and by the Needs Review flag. Users can create and edit jobs. Each job row shows the job title, status, assigned users, customer name, and last activity date.

### Job Detail
The full page for a single job. Preserve the existing structure from the imported source. Contains a header with job title, status, Needs Review flag toggle, assigned users, and customer/property info. The page is organized into tabs:
- **Overview** — Job summary, insurance details, carrier information, adjuster information (Insurance may be displayed within Overview where appropriate, but the dedicated Insurance functionality must be preserved)
- **Activity** — Auto-generated timeline of all actions on this job (status changes, task completions, notes added, files uploaded, etc.)
- **Contacts** — Contacts associated with this job (pulled from customer or manually added)
- **Tasks** — Create, assign, complete, and delete tasks for this job
- **Appointments** — Schedule and manage appointments tied to this job
- **Notes** — Add notes; notes are timestamped with author
- **Photos** — Upload and view photos for this job
- **Files** — Upload and manage documents/files for this job
- **Insurance** — Insurance details, carrier, and adjuster information functionality preserved.

### Settings
Organization settings page. Org Admins can manage organization details, invite users, and assign roles (Admin, Manager, Sales). Users can update their own profile (name, email, password).

### Admin (Super Admin only)
A platform-level page visible only to Super Admins. Shows all organizations, user counts, and platform-wide metrics. Super Admins may inspect organizations platform-wide but may NOT edit an organization's operational data unless they also have an organization membership that grants edit access.

## User accounts
People create an account with email and password, but registration is invite-only. There is no unrestricted public account creation. Each person has a name, email, password, and a platform-level role (Super Admin or regular user). Within each organization they belong to, they also have an organization role (Admin, Manager, or Sales). The app remembers which organization they last selected, their role in each organization, and their personal profile preferences.

## What gets saved

- **Users**: name, email, password hash, email verification status, platform role (Super Admin or regular). Each user is a person who can sign in.
- **Organizations**: name, and branding settings. Each organization is a separate workspace.
- **Organization Memberships**: links a user to an organization with a specific role (Admin, Manager, or Sales). A user can belong to multiple organizations.
- **Customers**: name, company name, email, phone, address, notes. Each belongs to an organization.
- **Contacts**: name, email, phone, role/title. Each belongs to a customer and an organization.
- **Properties**: address, property type. Each belongs to a customer and an organization.
- **Leads**: name, source, stage, assigned user, notes, created date. Each belongs to an organization and can be linked to a customer, contact, and property.
- **Pipeline Stages**: name, order/position, type (lead stage or opportunity stage). Each belongs to an organization (organizations can customize their own stages).
- **Opportunities**: name, value, stage, expected close date, assigned user, notes. Each belongs to an organization and can be linked to a customer, contact, property, and the lead it was converted from.
- **Jobs**: title, status (New, Scheduled, In Progress, On Hold, Completed, Canceled), Needs Review flag, assigned users, created date, last updated date. Each belongs to an organization and can be linked to a customer, contact, property, and the opportunity it was converted from.
- **Tasks**: title, description, due date, completed status, assigned user. Each belongs to a job and an organization.
- **Appointments**: title, date/time, location, notes. Each belongs to a job and an organization.
- **Notes**: content, author, created date. Each belongs to a job and an organization.
- **Activity Entries**: action type (e.g., "status changed", "note added", "task completed"), description, author, timestamp. Each belongs to a job and an organization. Auto-generated by the system.
- **Photos**: image file, caption, uploaded by, upload date. Each belongs to a job and an organization.
- **Files**: file name, file data, uploaded by, upload date. Each belongs to a job and an organization.
- **Insurance Details**: policy number, claim number, deductible amount, coverage type. Each belongs to a job and an organization.
- **Carrier Information**: carrier name, phone, email. Each belongs to a job and an organization.
- **Adjuster Information**: adjuster name, phone, email. Each belongs to a job and an organization.

## How it works

- **Organization isolation**: Every piece of data — customers, leads, jobs, tasks, notes, everything — belongs to exactly one organization. All queries are filtered by the user's current organization. A user in Organization A can never see Organization B's data, even if they belong to both. Switching organizations changes the entire visible dataset. All isolation must be enforced server-side. Frontend-only filtering is not acceptable.
- **Organization switcher**: Users who belong to multiple organizations see a switcher in the top navigation. Switching reloads all data for the newly selected organization. The last-selected organization is remembered per user.
- **Roles and permissions**:
  - **Super Admin**: Platform-level role. Can see all organizations, manage platform users, and view any organization's data. Does not get org-level editing unless they are also a member with an org role.
  - **Org Admin**: Full access within their organization — can manage users, settings, and all CRM/Jobs data.
  - **Manager**: Can manage all CRM and Jobs data within their organization but cannot manage org settings or users.
  - **Sales**: Can manage leads, opportunities, and customers. Has read-only access to jobs. Cannot manage org settings or users.
- **Lead-to-opportunity conversion**: When a lead is converted to an opportunity, a new opportunity is created with the lead's customer, contact, and property associations carried over. The original lead is marked as converted and linked to the new opportunity.
- **Opportunity-to-job conversion**: When an opportunity is converted to a job, a new job is created with the opportunity's customer, contact, property, and any insurance details carried over. The original opportunity is marked as won/converted and linked to the new job.
- **Activity timeline**: The system automatically logs activity entries when actions happen on a job — status changes, task completions, notes added, files/photos uploaded, appointments scheduled. These entries are read-only and shown in reverse chronological order.
- **Needs Review flag**: Any job can be flagged as "Needs Review" by any user with edit access. The flag is a simple on/off toggle. The Dashboard surfaces all flagged jobs in a dedicated section.
- **Global search**: A search bar in the top navigation searches across customers, contacts, leads, opportunities, and jobs within the current organization. Results are grouped by type and link to the relevant detail page.
- **Pipeline stages**: Each organization has its own set of lead stages and opportunity stages. Default stages are created when an organization is set up, but Org Admins can customize them (rename, reorder, add, remove).

## Look & feel

- **Mood**: Refined and trustworthy — premium B2B aesthetic. The app should feel like a serious, professional tool that contractors and restoration professionals can rely on daily.
- **Audience**: Contractors, restoration, and construction professionals who manage insurance claims and field work. They need efficiency and clarity over decoration.
- **Design reference**: Keep the AGFST project (https://floot.com/project/67a750fc-ed3f-4d8a-847e-6423fae0dce8) as a reference for proven Floot patterns only — do NOT modify it.

## Outside services

- **Cloud storage**: Must use private storage with authorization checks before access. Use Floot-native storage (`@floot/storage`) with private visibility for storing job photos and files uploaded by users.
- **Email service (Resend)**: for sending invitation emails to new users and notification emails (e.g., task assignments, appointment reminders).

## Working Method

1. Inspect the uploaded source first.
2. Identify reusable frontend components from the source.
3. Identify Hercules-specific dependencies.
4. Identify Convex queries/mutations/schema/storage dependencies.
5. Map existing entities to the Floot database.
6. NOT redesign working pages or remove features.

## Testing Requirements

Test workflows to be executed:
1. Verify Super Admin can view all organizations but cannot edit without membership.
2. Verify Org Admin can invite new users and assign roles.
3. Verify invited users can complete registration securely.
4. Verify Organization Switcher loads correct datasets.
5. Verify Sales role restrictions (read-only jobs, no org settings).
6. Verify Manager role restrictions (manage CRM/Jobs, no org settings).
7. Verify server-side organization isolation on a cross-tenant data fetch attempt.
8. Verify creating a new Customer with linked Contacts and Properties.
9. Verify Lead progression through custom pipeline stages.
10. Verify Lead-to-Opportunity conversion mapping accuracy.
11. Verify Opportunity-to-Job conversion mapping accuracy.
12. Verify Job statuses update correctly (New, Scheduled, In Progress, On Hold, Completed, Canceled).
13. Verify Open/Active Jobs count excludes Completed and Canceled jobs on Dashboard.
14. Verify Needs Review flag toggle and Dashboard surfacing.
15. Verify File uploads use Floot-native private storage with authorization.
16. Verify Photo uploads use Floot-native private storage with authorization.
17. Verify Activity Timeline auto-generates entries for actions.
18. Verify Task creation, assignment, and completion workflows.
19. Verify Appointment scheduling and management.
20. Verify Insurance, Carrier, and Adjuster information updates and associations.

## Build Deliverables

Upon completion of Stage 1, the build agent should report:
- A summary of components migrated from Hercules source.
- Details of Convex/Hercules replacements implemented using Floot-native features.
- Confirmation of successful mapping for all CRM and Job entities.
- Confirmation that all 20 test workflows have passed.
- Any challenges faced and how they were resolved.