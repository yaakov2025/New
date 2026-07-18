import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ─── Users ────────────────────────────────────────────────────────────────
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),

  // ─── Platform-level super admins (separate authority, not an org role) ────
  platformAdmins: defineTable({
    userId: v.id("users"),
    grantedBy: v.optional(v.id("users")),
  }).index("by_user", ["userId"]),

  // ─── Organizations (tenants) ───────────────────────────────────────────────
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    logoStorageId: v.optional(v.id("_storage")),
    primaryColor: v.optional(v.string()),
    secondaryColor: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zip: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    plan: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("suspended"),
      v.literal("deleted"),
    ),
    createdBy: v.id("users"),
    updatedAt: v.optional(v.number()),
    updatedBy: v.optional(v.id("users")),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    deletedBy: v.optional(v.id("users")),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_is_deleted", ["isDeleted"]),

  // ─── User-org memberships (roles: admin, manager, sales only) ─────────────
  userOrgMemberships: defineTable({
    orgId: v.id("organizations"),
    userId: v.id("users"),
    role: v.union(
      v.literal("admin"),
      v.literal("manager"),
      v.literal("sales"),
    ),
    status: v.union(v.literal("active"), v.literal("deactivated")),
    invitedBy: v.optional(v.id("users")),
    joinedAt: v.optional(v.number()),
    deactivatedAt: v.optional(v.number()),
    deactivatedBy: v.optional(v.id("users")),
  })
    .index("by_org", ["orgId"])
    .index("by_user", ["userId"])
    .index("by_org_and_user", ["orgId", "userId"])
    .index("by_org_and_status", ["orgId", "status"]),

  // ─── Pending invitations by email (user may not have an account yet) ───────
  orgInvitations: defineTable({
    orgId: v.id("organizations"),
    email: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("manager"),
      v.literal("sales"),
    ),
    token: v.string(),
    invitedBy: v.id("users"),
    expiresAt: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("expired"),
      v.literal("revoked"),
    ),
    acceptedAt: v.optional(v.number()),
    acceptedBy: v.optional(v.id("users")),
    revokedAt: v.optional(v.number()),
    revokedBy: v.optional(v.id("users")),
  })
    .index("by_token", ["token"])
    .index("by_org", ["orgId"])
    .index("by_email", ["email"])
    .index("by_org_and_status", ["orgId", "status"]),

  // ─── Org-level settings ───────────────────────────────────────────────────
  orgSettings: defineTable({
    orgId: v.id("organizations"),
    recordVisibilityPolicy: v.union(
      v.literal("own_and_assigned"),
      v.literal("team"),
      v.literal("all_org"),
    ),
  }).index("by_org", ["orgId"]),

  // ─── Feature flags per org ────────────────────────────────────────────────
  featureFlags: defineTable({
    orgId: v.id("organizations"),
    flagName: v.string(),
    enabled: v.boolean(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_and_flag", ["orgId", "flagName"]),

  // ─── Audit log (append-only, never deleted or updated) ────────────────────
  auditLog: defineTable({
    orgId: v.optional(v.id("organizations")),
    userId: v.optional(v.id("users")),
    action: v.string(),
    recordType: v.optional(v.string()),
    recordId: v.optional(v.string()),
    fieldName: v.optional(v.string()),
    oldValue: v.optional(v.string()),
    newValue: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    metadata: v.optional(v.string()),
  })
    .index("by_org", ["orgId"])
    .index("by_user", ["userId"])
    .index("by_record", ["recordType", "recordId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 1B: CRM — Customers, Contacts, Properties, Leads, Opportunities
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Pipeline stages (configurable per org, per pipeline type) ─────────────
  // pipelineType: "lead" | "opportunity"
  pipelineStages: defineTable({
    orgId: v.id("organizations"),
    pipelineType: v.union(v.literal("lead"), v.literal("opportunity")),
    name: v.string(),
    color: v.optional(v.string()),
    order: v.number(),
    isArchived: v.boolean(),
    isDefault: v.boolean(), // auto-assigned on record creation
    createdBy: v.id("users"),
  })
    .index("by_org", ["orgId"])
    .index("by_org_and_type", ["orgId", "pipelineType"])
    .index("by_org_and_type_and_archived", ["orgId", "pipelineType", "isArchived"]),

  // ─── Customers (companies or individuals that buy services) ─────────────────
  customers: defineTable({
    orgId: v.id("organizations"),
    name: v.string(),
    type: v.union(v.literal("company"), v.literal("individual")),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zip: v.optional(v.string()),
    notes: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    tags: v.optional(v.array(v.string())),
    source: v.optional(v.string()), // how they found us
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    deletedBy: v.optional(v.id("users")),
    createdBy: v.id("users"),
    updatedAt: v.optional(v.number()),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_org", ["orgId"])
    .index("by_org_and_deleted", ["orgId", "isDeleted"])
    .index("by_org_and_assigned", ["orgId", "assignedTo"]),

  // ─── Contacts (people, linked to a customer or standalone) ──────────────────
  contacts: defineTable({
    orgId: v.id("organizations"),
    customerId: v.optional(v.id("customers")), // null = standalone contact
    firstName: v.string(),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    title: v.optional(v.string()), // job title
    isPrimary: v.boolean(), // primary contact for the customer
    notes: v.optional(v.string()),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    deletedBy: v.optional(v.id("users")),
    createdBy: v.id("users"),
    updatedAt: v.optional(v.number()),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_org", ["orgId"])
    .index("by_org_and_customer", ["orgId", "customerId"])
    .index("by_org_and_deleted", ["orgId", "isDeleted"]),

  // ─── Properties (service locations) ─────────────────────────────────────────
  properties: defineTable({
    orgId: v.id("organizations"),
    customerId: v.id("customers"),
    name: v.optional(v.string()), // e.g. "Main Office", "Warehouse"
    address: v.string(),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zip: v.optional(v.string()),
    notes: v.optional(v.string()),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    deletedBy: v.optional(v.id("users")),
    createdBy: v.id("users"),
    updatedAt: v.optional(v.number()),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_org", ["orgId"])
    .index("by_org_and_customer", ["orgId", "customerId"])
    .index("by_org_and_deleted", ["orgId", "isDeleted"]),

  // ─── Leads ────────────────────────────────────────────────────────────────
  leads: defineTable({
    orgId: v.id("organizations"),
    title: v.string(),
    customerId: v.optional(v.id("customers")),
    contactId: v.optional(v.id("contacts")),
    propertyId: v.optional(v.id("properties")),
    stageId: v.id("pipelineStages"),
    assignedTo: v.optional(v.id("users")),
    value: v.optional(v.number()), // estimated value in cents
    source: v.optional(v.string()),
    notes: v.optional(v.string()),
    // Conversion tracking
    convertedToOpportunityId: v.optional(v.id("opportunities")),
    convertedAt: v.optional(v.number()),
    convertedBy: v.optional(v.id("users")),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    deletedBy: v.optional(v.id("users")),
    createdBy: v.id("users"),
    updatedAt: v.optional(v.number()),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_org", ["orgId"])
    .index("by_org_and_stage", ["orgId", "stageId"])
    .index("by_org_and_deleted", ["orgId", "isDeleted"])
    .index("by_org_and_assigned", ["orgId", "assignedTo"]),

  // ─── Opportunities ────────────────────────────────────────────────────────
  opportunities: defineTable({
    orgId: v.id("organizations"),
    title: v.string(),
    customerId: v.optional(v.id("customers")),
    contactId: v.optional(v.id("contacts")),
    propertyId: v.optional(v.id("properties")),
    stageId: v.id("pipelineStages"),
    assignedTo: v.optional(v.id("users")),
    value: v.optional(v.number()), // estimated value in cents
    source: v.optional(v.string()),
    notes: v.optional(v.string()),
    // Lead lineage
    convertedFromLeadId: v.optional(v.id("leads")),
    // Job conversion
    convertedToJobId: v.optional(v.string()), // will be v.id("jobs") in 1C
    convertedAt: v.optional(v.number()),
    convertedBy: v.optional(v.id("users")),
    closeDate: v.optional(v.string()), // ISO date string
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    deletedBy: v.optional(v.id("users")),
    createdBy: v.id("users"),
    updatedAt: v.optional(v.number()),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_org", ["orgId"])
    .index("by_org_and_stage", ["orgId", "stageId"])
    .index("by_org_and_deleted", ["orgId", "isDeleted"])
    .index("by_org_and_assigned", ["orgId", "assignedTo"]),

  // ─── Custom field definitions ─────────────────────────────────────────────
  customFieldDefs: defineTable({
    orgId: v.id("organizations"),
    entityType: v.union(
      v.literal("customer"),
      v.literal("contact"),
      v.literal("property"),
      v.literal("lead"),
      v.literal("opportunity"),
    ),
    fieldKey: v.string(), // internal key, snake_case
    label: v.string(),
    fieldType: v.union(
      v.literal("text"),
      v.literal("number"),
      v.literal("date"),
      v.literal("boolean"),
      v.literal("select"),
    ),
    options: v.optional(v.array(v.string())), // for select type
    required: v.boolean(),
    order: v.number(),
    isArchived: v.boolean(),
    createdBy: v.id("users"),
  })
    .index("by_org", ["orgId"])
    .index("by_org_and_entity", ["orgId", "entityType"]),

  // ─── Custom field values ──────────────────────────────────────────────────
  customFieldValues: defineTable({
    orgId: v.id("organizations"),
    entityType: v.string(),
    entityId: v.string(), // document _id as string
    fieldKey: v.string(),
    value: v.optional(v.string()), // all values stored as strings
  })
    .index("by_entity", ["entityType", "entityId"])
    .index("by_org_and_entity", ["orgId", "entityType", "entityId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 1C: Jobs & Operations
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Jobs (the core job record) ─────────────────────────────────────────────
  jobs: defineTable({
    orgId: v.id("organizations"),
    name: v.string(),
    customerId: v.optional(v.id("customers")),
    contactId: v.optional(v.id("contacts")),
    propertyId: v.optional(v.id("properties")),
    jobType: v.optional(v.string()),
    status: v.string(), // operational status (configurable per org)
    needsReview: v.boolean(),
    nextStep: v.optional(v.string()),
    startDate: v.optional(v.string()), // ISO date
    targetCompletionDate: v.optional(v.string()), // ISO date
    estimatedValue: v.optional(v.number()), // cents
    isInsuranceJob: v.boolean(),
    convertedFromOpportunityId: v.optional(v.id("opportunities")),
    notes: v.optional(v.string()),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    deletedBy: v.optional(v.id("users")),
    createdBy: v.id("users"),
    updatedAt: v.optional(v.number()),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_org", ["orgId"])
    .index("by_org_and_deleted", ["orgId", "isDeleted"])
    .index("by_org_and_status", ["orgId", "status"])
    .index("by_org_and_needs_review", ["orgId", "needsReview"]),

  // ─── Job assignments (sole source of truth for who is on a job) ─────────────
  jobAssignments: defineTable({
    orgId: v.id("organizations"),
    jobId: v.id("jobs"),
    userId: v.id("users"),
    role: v.optional(v.string()), // e.g. "lead", "helper"
    assignedBy: v.id("users"),
  })
    .index("by_job", ["jobId"])
    .index("by_org_and_user", ["orgId", "userId"])
    .index("by_org_and_job", ["orgId", "jobId"]),

  // ─── Job contacts (contacts linked to a job with roles) ─────────────────────
  jobContacts: defineTable({
    orgId: v.id("organizations"),
    jobId: v.id("jobs"),
    contactId: v.id("contacts"),
    role: v.optional(v.string()), // e.g. "site contact", "billing"
    createdBy: v.id("users"),
  })
    .index("by_job", ["jobId"])
    .index("by_org_and_job", ["orgId", "jobId"]),

  // ─── Job statuses (configurable operational statuses per org) ───────────────
  jobStatuses: defineTable({
    orgId: v.id("organizations"),
    name: v.string(),
    category: v.union(
      v.literal("planned"),
      v.literal("active"),
      v.literal("on_hold"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("canceled"),
    ),
    color: v.optional(v.string()),
    order: v.number(),
    isDefault: v.boolean(),
    isArchived: v.boolean(),
    createdBy: v.id("users"),
  })
    .index("by_org", ["orgId"])
    .index("by_org_and_archived", ["orgId", "isArchived"]),

  // ─── Job tasks ──────────────────────────────────────────────────────────────
  jobTasks: defineTable({
    orgId: v.id("organizations"),
    jobId: v.id("jobs"),
    title: v.string(),
    description: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    dueDate: v.optional(v.string()), // ISO date
    isCompleted: v.boolean(),
    completedAt: v.optional(v.number()),
    completedBy: v.optional(v.id("users")),
    createdBy: v.id("users"),
  })
    .index("by_job", ["jobId"])
    .index("by_org_and_completed", ["orgId", "isCompleted"])
    .index("by_org", ["orgId"]),

  // ─── Job appointments ────────────────────────────────────────────────────────
  jobAppointments: defineTable({
    orgId: v.id("organizations"),
    jobId: v.id("jobs"),
    title: v.string(),
    description: v.optional(v.string()),
    scheduledAt: v.string(), // ISO datetime
    duration: v.optional(v.number()), // minutes
    assignedTo: v.optional(v.id("users")),
    createdBy: v.id("users"),
  })
    .index("by_job", ["jobId"])
    .index("by_org", ["orgId"])
    .index("by_org_and_scheduled", ["orgId", "scheduledAt"]),

  // ─── Job notes (editable with version history) ──────────────────────────────
  jobNotes: defineTable({
    orgId: v.id("organizations"),
    jobId: v.id("jobs"),
    content: v.string(),
    version: v.number(),
    parentNoteId: v.optional(v.id("jobNotes")), // previous version of the same note
    createdBy: v.id("users"),
  })
    .index("by_job", ["jobId"])
    .index("by_parent", ["parentNoteId"]),

  // ─── Job activity events (immutable system events) ──────────────────────────
  jobActivityEvents: defineTable({
    orgId: v.id("organizations"),
    jobId: v.id("jobs"),
    eventType: v.string(), // e.g. "created", "status_changed", "assigned"
    description: v.string(),
    metadata: v.optional(v.string()), // JSON stringified additional data
    userId: v.id("users"), // who triggered it
  }).index("by_job", ["jobId"]),

  // ─── Job photos ──────────────────────────────────────────────────────────────
  jobPhotos: defineTable({
    orgId: v.id("organizations"),
    jobId: v.id("jobs"),
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
    category: v.optional(v.string()), // e.g. "before", "after", "damage", "progress"
    createdBy: v.id("users"),
  }).index("by_job", ["jobId"]),

  // ─── Job files ────────────────────────────────────────────────────────────────
  jobFiles: defineTable({
    orgId: v.id("organizations"),
    jobId: v.id("jobs"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    createdBy: v.id("users"),
  }).index("by_job", ["jobId"]),

  // ─── Job insurance (insurance-specific fields, one per job) ─────────────────
  jobInsurance: defineTable({
    orgId: v.id("organizations"),
    jobId: v.id("jobs"),
    carrier: v.optional(v.string()),
    policyNumber: v.optional(v.string()),
    claimNumber: v.optional(v.string()),
    deductible: v.optional(v.number()), // cents
    adjusterName: v.optional(v.string()),
    adjusterPhone: v.optional(v.string()),
    adjusterEmail: v.optional(v.string()),
    dateOfLoss: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    updatedBy: v.optional(v.id("users")),
    updatedAt: v.optional(v.number()),
  }).index("by_job", ["jobId"]),
});
