-- Hand-reconstructed from helpers/schema.tsx (kysely-codegen output).
-- No migrations were included in the export, so this recreates a
-- working local schema for development/demo purposes only.

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'user')),
  last_org_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_passwords (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  current_org_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_accessed TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE login_attempts (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT now(),
  success BOOLEAN DEFAULT false
);

CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  email TEXT,
  phone TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  plan TEXT DEFAULT 'free',
  status TEXT DEFAULT 'active',
  is_deleted BOOLEAN DEFAULT false,
  created_by INTEGER,
  updated_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE org_memberships (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  org_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'sales' CHECK (role IN ('admin', 'manager', 'sales')),
  status TEXT DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE org_invitations (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'sales' CHECK (role IN ('admin', 'manager', 'sales')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('accepted', 'cancelled', 'expired', 'pending')),
  token TEXT NOT NULL,
  invited_by INTEGER,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE org_settings (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL,
  record_visibility_policy TEXT DEFAULT 'org',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE feature_flags (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL,
  flag_name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false
);

CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  org_id INTEGER,
  user_id INTEGER,
  action TEXT NOT NULL,
  record_type TEXT,
  record_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'residential',
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  notes TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE contacts (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  title TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE properties (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  name TEXT,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip TEXT,
  property_type TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pipeline_stages (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL,
  pipeline_type TEXT NOT NULL CHECK (pipeline_type IN ('lead', 'opportunity')),
  name TEXT NOT NULL,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  customer_id INTEGER,
  contact_id INTEGER,
  property_id INTEGER,
  stage_id INTEGER,
  source TEXT,
  estimated_value NUMERIC,
  notes TEXT,
  assigned_to INTEGER,
  is_converted BOOLEAN DEFAULT false,
  converted_opportunity_id INTEGER,
  is_deleted BOOLEAN DEFAULT false,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE opportunities (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  customer_id INTEGER,
  contact_id INTEGER,
  property_id INTEGER,
  stage_id INTEGER,
  lead_id INTEGER,
  value NUMERIC,
  expected_close_date TIMESTAMPTZ,
  notes TEXT,
  assigned_to INTEGER,
  is_won BOOLEAN DEFAULT false,
  converted_job_id INTEGER,
  is_deleted BOOLEAN DEFAULT false,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE job_statuses (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'active' CHECK (category IN ('active', 'canceled', 'completed', 'on_hold', 'planned')),
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE jobs (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  customer_id INTEGER,
  property_id INTEGER,
  opportunity_id INTEGER,
  job_type TEXT,
  status TEXT DEFAULT 'planned',
  estimated_value NUMERIC,
  is_insurance_job BOOLEAN DEFAULT false,
  needs_review BOOLEAN DEFAULT false,
  next_step TEXT,
  notes TEXT,
  start_date TIMESTAMPTZ,
  target_completion_date TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  created_by INTEGER,
  updated_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE job_assignments (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE job_contacts (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  contact_id INTEGER NOT NULL,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE job_notes (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE job_tasks (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  assigned_to INTEGER,
  is_completed BOOLEAN DEFAULT false,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE job_appointments (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration INTEGER,
  location TEXT,
  assigned_to INTEGER,
  notes TEXT,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE job_files (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  storage_key TEXT NOT NULL,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE job_photos (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  storage_key TEXT NOT NULL,
  caption TEXT,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE job_insurance (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  carrier TEXT,
  carrier_phone TEXT,
  carrier_email TEXT,
  policy_number TEXT,
  claim_number TEXT,
  adjuster_name TEXT,
  adjuster_phone TEXT,
  adjuster_email TEXT,
  coverage_type TEXT,
  deductible NUMERIC,
  date_of_loss TIMESTAMPTZ,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE job_activity_events (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  user_id INTEGER,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE document_templates (
  id SERIAL PRIMARY KEY,
  org_id INTEGER,
  document_type TEXT NOT NULL CHECK (document_type IN ('certificate_of_completion', 'change_order', 'contract', 'estimate', 'work_order')),
  name TEXT NOT NULL,
  blocks JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_foundation BOOLEAN DEFAULT false,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE template_versions (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL,
  version_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  blocks JSONB NOT NULL,
  settings JSONB DEFAULT '{}',
  notes TEXT,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE job_documents (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL,
  document_number TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('certificate_of_completion', 'change_order', 'contract', 'estimate', 'work_order')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('approved', 'converted', 'declined', 'draft', 'expired', 'sent', 'signed', 'viewed', 'voided')),
  job_id INTEGER,
  opportunity_id INTEGER,
  customer_id INTEGER,
  property_id INTEGER,
  template_id INTEGER,
  template_version_number INTEGER,
  version_number INTEGER DEFAULT 1,
  blocks_snapshot JSONB DEFAULT '[]',
  data_snapshot JSONB DEFAULT '{}',
  settings_snapshot JSONB DEFAULT '{}',
  subtotal NUMERIC,
  discount NUMERIC,
  tax NUMERIC,
  total NUMERIC,
  notes TEXT,
  is_signed BOOLEAN DEFAULT false,
  pdf_storage_key TEXT,
  signed_pdf_storage_key TEXT,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approver_name TEXT,
  approver_email TEXT,
  approval_comment TEXT,
  approval_ip TEXT,
  declined_at TIMESTAMPTZ,
  declined_by_name TEXT,
  declined_by_email TEXT,
  decline_reason TEXT,
  signed_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  voided_by INTEGER,
  void_reason TEXT,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE document_line_items (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL,
  document_id INTEGER NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT,
  quantity NUMERIC DEFAULT 1,
  unit TEXT,
  unit_price NUMERIC DEFAULT 0,
  line_total NUMERIC DEFAULT 0,
  notes TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE document_version_snapshots (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL,
  version_number INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('approved', 'converted', 'declined', 'draft', 'expired', 'sent', 'signed', 'viewed', 'voided')),
  blocks_snapshot JSONB NOT NULL,
  data_snapshot JSONB DEFAULT '{}',
  settings_snapshot JSONB DEFAULT '{}',
  line_items_snapshot JSONB,
  subtotal NUMERIC,
  discount NUMERIC,
  tax NUMERIC,
  total NUMERIC,
  notes TEXT,
  pdf_storage_key TEXT,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE document_review_links (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL,
  document_id INTEGER NOT NULL,
  version_number INTEGER NOT NULL,
  token_hash TEXT NOT NULL,
  allow_pdf_download BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  is_revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revoked_by INTEGER,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE document_email_log (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL,
  document_id INTEGER NOT NULL,
  version_number INTEGER NOT NULL,
  recipient_email TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  subject TEXT,
  message TEXT,
  email_message_id TEXT,
  sent_by INTEGER,
  sent_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE document_signatures (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL,
  document_id INTEGER NOT NULL,
  version_number INTEGER NOT NULL,
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  signer_role TEXT NOT NULL DEFAULT 'customer',
  signature_data TEXT NOT NULL,
  ip_address TEXT,
  signed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON contacts (customer_id);
CREATE INDEX ON properties (customer_id);
CREATE INDEX ON jobs (org_id);
CREATE INDEX ON customers (org_id);
CREATE INDEX ON leads (org_id);
CREATE INDEX ON opportunities (org_id);
CREATE INDEX ON job_documents (org_id);
CREATE INDEX ON org_memberships (user_id);
CREATE INDEX ON org_memberships (org_id);
CREATE INDEX ON sessions (user_id);
