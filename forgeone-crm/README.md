# ForgeOne CRM
        
# ForgeOne CRM

ForgeOne is a multi-tenant CRM and job management platform for claims/restoration businesses. It uses invite-only email/password authentication, organization-based data isolation, and role-based access control (Super Admin, Admin, Manager, Sales).

## Current Status

**Stage 1 — CRM & Jobs: COMPLETE AND APPROVED**
Checkpoint: See static/__dev/notes/stage1-checkpoint.md for full details.

**Stage 2 — Template Builder & Job Documents: COMPLETE AND APPROVED**
Checkpoint: See static/__dev/notes/stage2-completion.md for full details.

### Template Builder (Organization Level)
- Block-based document template editor with dynamic tag insertion
- Dynamic tag picker with approved registry
- 5 foundation templates seeded
- Template versioning, preview with sample/real data, PDF generation via pdfmake
- Role-based permissions (Admin: full CRUD, Manager: edit + use, Sales: read active + generate PDFs)

### Job Documents System
- Documents tab on every Job Detail page
- Create job-specific documents from organization templates
- Auto-populates with job's live data (customer, property, insurance, etc.)
- Document types: Estimate, Contract, Work Order, Change Order, Certificate of Completion
- Line items editor with financial fields (subtotal, tax, discount, total)
- PDF generation from documents with org-scoped private storage
- Document versioning with snapshots
- Status tracking: draft, sent, viewed, approved, signed, declined, expired, converted, voided
- Void action (admin only)
- Server-side financial calculations and validation
- Financial fields structured for future invoice/payment modules
- Tables: job_documents, document_line_items, document_version_snapshots

### Document Email Sending
- Send documents via email with auto-generated review links
- Professional HTML email template with org branding
- PDF auto-generated if not already present
- Email log tracking (recipient, sender, message ID, version)
- Job activity logging on send
- Email sender domain: mail.forgeone.agclaimsworks.com

### Secure Customer Review Links
- Cryptographically secure tokens (nanoid + SHA-256 hashed storage)
- Token tied to specific document version
- Optional expiration (default 30 days)
- Revocable by admin/manager
- No authentication required for customer access
- Viewed status tracking with timestamp
- Job activity logging on view
- Tables: document_review_links, document_email_log

### Estimate Approval & Decline
- Customer can approve/decline from secure review page
- Records: approver name, email, IP, comment/reason, timestamp, version
- Approved estimates become immutable
- Declined status with audit trail
- Job activity logging
- Public endpoints with no auth required

### Contract Signature
- Customer signature via HTML5 canvas (mouse + touch support)
- Records: signer name, email, signature data, IP, timestamp, version
- Generates signed PDF with signature embedded
- Signed contracts are immutable (isSigned flag)
- Corrections require void + replacement workflow
- Tables: document_signatures

### Pre-Job Estimates
- Estimates can be created from Customer detail page (no job required)
- Estimates can be created from Opportunity dialog
- Estimates linked to opportunityId and/or customerId
- Estimates tab on Customer detail page
- Estimates section in Opportunity dialog

### Opportunity to Job Conversion
- Converts opportunity to job with all related data
- Automatically links pre-job estimates to newly created job
- Preserves document numbers, versions, statuses, PDFs, approvals
- Job activity logging for conversion and linked estimates

### Public Review Page
- Standalone page at /review/:token (no auth layout)
- Organization branding (logo, name, contact)
- Document content preview, financial summary
- PDF download when allowed
- Approve/Decline controls for Estimates
- Sign/Decline controls for Contracts
- Signature canvas for contract signing
- Status banners for completed documents
- Mobile responsive

## Not Yet Built
- Pre-job estimates from Customer/Opportunity to Job conversion with estimate preservation UI
- Expired status auto-transition (requires scheduled job)

## Rules

- Do NOT begin any new module or stage unless explicitly instructed.
- Do NOT redesign or refactor working Stage 1 or Stage 2 features without approval.
- Do NOT build: Invoices, Payments, Accounting, Customer Portal, Personal Finance, Reports, or Automations.
- Every business record belongs to exactly one organization. Enforce org isolation server-side on every read/write.
- Foundation templates are system-level (org_id = NULL, is_foundation = true). They are read-only and can be duplicated into an org.
- Template blocks are stored as JSONB. Tag resolution happens server-side via templateTagResolver.
- Job documents store frozen snapshots of resolved blocks, tag values, and template settings at creation time. Changes to org templates never alter existing documents.
- Signed documents must be immutable (enforced by is_signed flag).
- Email sender domain: mail.forgeone.agclaimsworks.com
- Document review tokens must be cryptographically random and stored as SHA-256 hashes
- Public endpoints must never expose orgId, internal IDs, or org-internal data
- Signed/approved documents are immutable; changes require void + replacement
- Email sending uses @floot/email with verified domain mail.forgeone.agclaimsworks.com
- Document version numbers are auto-incremented per snapshot creation

Made with Floot.

# Instructions

For security reasons, the `env.json` file is not pre-populated — you will need to generate or retrieve the values yourself.  

For **JWT secrets**, generate a value with:  

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then paste the generated value into the appropriate field.  

For the **Floot Database**, download your database content as a pg_dump from the cog icon in the database view (right pane -> data -> floot data base -> cog icon on the left of the name), upload it to your own PostgreSQL database, and then fill in the connection string value.  

**Note:** Floot OAuth will not work in self-hosted environments.  

For other external services, retrieve your API keys and fill in the corresponding values.  

Once everything is configured, you can build and start the service with:  

```
npm install -g pnpm
pnpm install
pnpm vite build
pnpm tsx server.ts
```
