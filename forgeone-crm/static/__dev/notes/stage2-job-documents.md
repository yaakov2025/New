# Stage 2 — Job Documents Architecture

## Tables
- `job_documents` — Main document records (org-scoped, linked to jobs/customers/properties)
- `document_line_items` — Line items for estimates/work orders (FK to job_documents)
- `document_version_snapshots` — Frozen version history (FK to job_documents)
- `document_status` enum: draft, sent, viewed, approved, signed, voided
- Reuses `document_type` enum from templates

## Key Design Decisions
- `blocks_snapshot` stores ResolvedBlock[] (already tag-resolved), not raw TemplateBlock[]
- `data_snapshot` stores the raw tag values dictionary for audit
- `settings_snapshot` stores template settings (page size, margins, etc.)
- When generating PDF from a document, line items from document_line_items override the estimateLineItems block data, and financial fields override the totals block
- Document numbers are auto-generated per org per type: EST-0001, CON-0001, WO-0001, CO-0001, COC-0001
- PDF storage path: documents/org-{orgId}/doc-{docId}-v{version}-{timestamp}.pdf (private visibility)

## Endpoints (8 total)
- documents/list_GET — filter by jobId, customerId, opportunityId, documentType, status
- documents/get_GET — includes line items, template name, creator name
- documents/create_POST — resolves template tags with job data, creates snapshot, inserts line items
- documents/save_POST — updates draft docs (notes, line items, financials)
- documents/pdf/generate_POST — generates PDF from stored blocks+settings, uploads to private storage
- documents/void_POST — admin only, sets status=voided
- documents/version/list_GET — lists version snapshots
- documents/version/save_POST — creates a snapshot of current state

## Frontend
- `components/JobDocumentsTab` — Full document management UI with create dialog, list view, detail sheet with preview and line items editor
- `helpers/useDocuments` — React Query hooks for all document endpoints
- Documents tab added to `pages/jobs.$jobId` after Insurance tab

## Bugs Fixed
- TemplateBuilder role check used wrong property (orgRole → currentOrgRole)
- TemplateBuilder PDF error handler swallowed actual error messages
- Job detail page overview tab crashed when rendering notes array as string (pre-existing naming collision between Jobs.notes field and joined JobNotes[] array)