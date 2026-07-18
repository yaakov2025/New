import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthenticatedUser, isPlatformAdmin } from "../lib/permissions.ts";
import { writeAuditLog } from "../lib/audit.ts";

// List all organizations (platform admin only)
export const listAll = query({
  args: {},
  handler: async (ctx): Promise<{ _id: string; name: string; slug: string; status: string; plan: string; _creationTime: number }[]> => {
    const user = await getAuthenticatedUser(ctx);
    const isAdmin = await isPlatformAdmin(ctx, user._id);
    if (!isAdmin) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Platform admin access required" });
    }
    const orgs = await ctx.db
      .query("organizations")
      .withIndex("by_is_deleted", (q) => q.eq("isDeleted", false))
      .collect();
    return orgs.map((o) => ({
      _id: o._id,
      name: o.name,
      slug: o.slug,
      status: o.status,
      plan: o.plan,
      _creationTime: o._creationTime,
    }));
  },
});

// Get a single org (platform admin, or member of that org)
export const getById = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const isAdmin = await isPlatformAdmin(ctx, user._id);
    if (!isAdmin) {
      // Must be a member
      const membership = await ctx.db
        .query("userOrgMemberships")
        .withIndex("by_org_and_user", (q) =>
          q.eq("orgId", args.orgId).eq("userId", user._id),
        )
        .unique();
      if (!membership || membership.status !== "active") {
        throw new ConvexError({ code: "FORBIDDEN", message: "Access denied" });
      }
    } else {
      // Log platform admin access
      await writeAuditLog(ctx as Parameters<typeof writeAuditLog>[0], {
        userId: user._id,
        orgId: args.orgId,
        action: "PLATFORM_ADMIN_ACCESS",
        recordType: "organization",
        recordId: args.orgId,
      });
    }
    return await ctx.db.get(args.orgId);
  },
});

// Create a new organization
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    // Validate slug uniqueness
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) {
      throw new ConvexError({ code: "CONFLICT", message: "An organization with this URL already exists" });
    }
    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      slug: args.slug,
      plan: "free",
      status: "active",
      createdBy: user._id,
      isDeleted: false,
    });
    // Create the creator's membership as admin
    await ctx.db.insert("userOrgMemberships", {
      orgId,
      userId: user._id,
      role: "admin",
      status: "active",
      joinedAt: Date.now(),
    });
    // Seed default feature flags (all disabled)
    const flags = [
      "estimates", "invoices", "transactions",
      "financials", "personal_finance", "customer_portal",
    ];
    for (const flagName of flags) {
      await ctx.db.insert("featureFlags", { orgId, flagName, enabled: false });
    }
    // Seed default org settings
    await ctx.db.insert("orgSettings", {
      orgId,
      recordVisibilityPolicy: "own_and_assigned",
    });
    // Seed default pipeline stages
    const leadStages = [
      { name: "New", color: "#6366f1", order: 0, isDefault: true },
      { name: "Contacted", color: "#f59e0b", order: 1, isDefault: false },
      { name: "Qualified", color: "#10b981", order: 2, isDefault: false },
      { name: "Lost", color: "#ef4444", order: 3, isDefault: false },
    ];
    const oppStages = [
      { name: "Discovery", color: "#6366f1", order: 0, isDefault: true },
      { name: "Proposal", color: "#f59e0b", order: 1, isDefault: false },
      { name: "Negotiation", color: "#8b5cf6", order: 2, isDefault: false },
      { name: "Won", color: "#10b981", order: 3, isDefault: false },
      { name: "Lost", color: "#ef4444", order: 4, isDefault: false },
    ];
    for (const s of leadStages) {
      await ctx.db.insert("pipelineStages", { orgId, pipelineType: "lead", ...s, isArchived: false, createdBy: user._id });
    }
    for (const s of oppStages) {
      await ctx.db.insert("pipelineStages", { orgId, pipelineType: "opportunity", ...s, isArchived: false, createdBy: user._id });
    }
    // Seed default job statuses
    const jobStatuses = [
      { name: "New", category: "planned" as const, color: "#3B82F6", order: 0, isDefault: true },
      { name: "Scheduled", category: "planned" as const, color: "#8B5CF6", order: 1, isDefault: false },
      { name: "In Progress", category: "active" as const, color: "#F59E0B", order: 2, isDefault: false },
      { name: "On Hold", category: "on_hold" as const, color: "#6B7280", order: 3, isDefault: false },
      { name: "Completed", category: "completed" as const, color: "#10B981", order: 4, isDefault: false },
      { name: "Canceled", category: "canceled" as const, color: "#EF4444", order: 5, isDefault: false },
    ];
    for (const s of jobStatuses) {
      await ctx.db.insert("jobStatuses", { orgId, ...s, isArchived: false, createdBy: user._id });
    }
    await writeAuditLog(ctx, {
      orgId,
      userId: user._id,
      action: "ORG_CREATED",
      recordType: "organization",
      recordId: orgId,
    });
    return orgId;
  },
});

// Update org profile/branding
export const update = mutation({
  args: {
    orgId: v.id("organizations"),
    name: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    secondaryColor: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zip: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const membership = await ctx.db
      .query("userOrgMemberships")
      .withIndex("by_org_and_user", (q) =>
        q.eq("orgId", args.orgId).eq("userId", user._id),
      )
      .unique();
    if (!membership || membership.status !== "active" || membership.role !== "admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Admin role required" });
    }
    const { orgId, ...fields } = args;
    await ctx.db.patch(orgId, { ...fields, updatedAt: Date.now(), updatedBy: user._id });
    await writeAuditLog(ctx, {
      orgId,
      userId: user._id,
      action: "ORG_UPDATED",
      recordType: "organization",
      recordId: orgId,
    });
  },
});

// Get logo upload URL
export const generateLogoUploadUrl = mutation({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const membership = await ctx.db
      .query("userOrgMemberships")
      .withIndex("by_org_and_user", (q) =>
        q.eq("orgId", args.orgId).eq("userId", user._id),
      )
      .unique();
    if (!membership || membership.status !== "active" || membership.role !== "admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Admin role required" });
    }
    return await ctx.storage.generateUploadUrl();
  },
});

// Save logo storage ID after upload
export const saveLogo = mutation({
  args: { orgId: v.id("organizations"), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const membership = await ctx.db
      .query("userOrgMemberships")
      .withIndex("by_org_and_user", (q) =>
        q.eq("orgId", args.orgId).eq("userId", user._id),
      )
      .unique();
    if (!membership || membership.status !== "active" || membership.role !== "admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Admin role required" });
    }
    await ctx.db.patch(args.orgId, {
      logoStorageId: args.storageId,
      updatedAt: Date.now(),
      updatedBy: user._id,
    });
  },
});

// Get logo URL
export const getLogoUrl = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args): Promise<string | null> => {
    const org = await ctx.db.get(args.orgId);
    if (!org?.logoStorageId) return null;
    return await ctx.storage.getUrl(org.logoStorageId);
  },
});
