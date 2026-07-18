import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getAuthenticatedUser, getOrgMembership, requireRole } from "../lib/permissions.ts";
import type { Id } from "../_generated/dataModel";

export type JobStatusCategory = "planned" | "active" | "on_hold" | "completed" | "cancelled" | "canceled";

const CATEGORY = v.union(
  v.literal("planned"),
  v.literal("active"),
  v.literal("on_hold"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("canceled"),
);

// Default operational statuses seeded for every new org.
const DEFAULT_JOB_STATUSES = [
  { name: "New", category: "planned" as const, color: "#3B82F6", order: 0, isDefault: true },
  { name: "Scheduled", category: "planned" as const, color: "#8B5CF6", order: 1, isDefault: false },
  { name: "In Progress", category: "active" as const, color: "#F59E0B", order: 2, isDefault: false },
  { name: "On Hold", category: "on_hold" as const, color: "#6B7280", order: 3, isDefault: false },
  { name: "Completed", category: "completed" as const, color: "#10B981", order: 4, isDefault: false },
  { name: "Canceled", category: "canceled" as const, color: "#EF4444", order: 5, isDefault: false },
];

// Seed default job statuses for a new org (called from org creation).
export const seedDefaultStatuses = internalMutation({
  args: { orgId: v.id("organizations"), createdBy: v.id("users") },
  handler: async (ctx, args) => {
    // Guard against double-seeding.
    const existing = await ctx.db
      .query("jobStatuses")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    if (existing) return;

    for (const s of DEFAULT_JOB_STATUSES) {
      await ctx.db.insert("jobStatuses", {
        orgId: args.orgId,
        name: s.name,
        category: s.category,
        color: s.color,
        order: s.order,
        isDefault: s.isDefault,
        isArchived: false,
        createdBy: args.createdBy,
      });
    }
  },
});

// List active (non-archived) statuses for an org, ordered by `order`.
export const list = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);

    const statuses = await ctx.db
      .query("jobStatuses")
      .withIndex("by_org_and_archived", (q) =>
        q.eq("orgId", args.orgId).eq("isArchived", false),
      )
      .collect();

    return statuses.sort((a, b) => a.order - b.order);
  },
});

// Create a new job status.
export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    name: v.string(),
    category: CATEGORY,
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const membership = await getOrgMembership(ctx, user._id, args.orgId);
    requireRole(membership.role, "admin");

    const existing = await ctx.db
      .query("jobStatuses")
      .withIndex("by_org_and_archived", (q) =>
        q.eq("orgId", args.orgId).eq("isArchived", false),
      )
      .collect();

    return await ctx.db.insert("jobStatuses", {
      orgId: args.orgId,
      name: args.name,
      category: args.category,
      color: args.color,
      order: existing.length,
      isDefault: false,
      isArchived: false,
      createdBy: user._id,
    });
  },
});

// Update a job status.
export const update = mutation({
  args: {
    statusId: v.id("jobStatuses"),
    name: v.optional(v.string()),
    category: v.optional(CATEGORY),
    color: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const status = await ctx.db.get(args.statusId);
    if (!status) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Status not found" });
    }
    const membership = await getOrgMembership(ctx, user._id, status.orgId);
    requireRole(membership.role, "admin");

    const patch: {
      name?: string;
      category?: JobStatusCategory;
      color?: string;
      order?: number;
    } = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.category !== undefined) patch.category = args.category;
    if (args.color !== undefined) patch.color = args.color;
    if (args.order !== undefined) patch.order = args.order;
    await ctx.db.patch(args.statusId, patch);
  },
});

// Archive a job status (soft delete — jobs keep their status string).
export const archive = mutation({
  args: { statusId: v.id("jobStatuses") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const status = await ctx.db.get(args.statusId);
    if (!status) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Status not found" });
    }
    const membership = await getOrgMembership(ctx, user._id, status.orgId);
    requireRole(membership.role, "admin");
    if (status.isDefault) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Cannot archive the default status" });
    }
    await ctx.db.patch(args.statusId, { isArchived: true });
  },
});

// Shared helper: map each status name → its category for an org.
// Used at job creation (resolving the default status) and by dashboard stats.
export async function buildStatusCategoryMap(
  ctx: QueryCtx | MutationCtx,
  orgId: Id<"organizations">,
): Promise<Map<string, JobStatusCategory>> {
  const statuses = await ctx.db
    .query("jobStatuses")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .collect();
  const map = new Map<string, JobStatusCategory>();
  for (const s of statuses) {
    map.set(s.name, s.category);
  }
  return map;
}

// Shared helper: resolve the org's default status name (falls back to "New").
export async function getDefaultStatusName(
  ctx: QueryCtx | MutationCtx,
  orgId: Id<"organizations">,
): Promise<string> {
  const statuses = await ctx.db
    .query("jobStatuses")
    .withIndex("by_org_and_archived", (q) =>
      q.eq("orgId", orgId).eq("isArchived", false),
    )
    .collect();
  const def = statuses.find((s) => s.isDefault);
  if (def) return def.name;
  const sorted = statuses.sort((a, b) => a.order - b.order);
  return sorted[0]?.name ?? "New";
}

// Idempotent backfill: ensures an org has default job statuses.
// Only inserts statuses whose name doesn't already exist for the org.
// Safe to call multiple times — never creates duplicates.
export const ensureDefaultStatuses = mutation({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);

    const existing = await ctx.db
      .query("jobStatuses")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const existingNames = new Set(existing.map((s) => s.name));

    let inserted = 0;
    for (const s of DEFAULT_JOB_STATUSES) {
      if (!existingNames.has(s.name)) {
        await ctx.db.insert("jobStatuses", {
          orgId: args.orgId,
          name: s.name,
          category: s.category,
          color: s.color,
          order: s.order + existing.length, // append after any existing custom statuses
          isDefault: s.isDefault && existing.length === 0, // only set default if no statuses existed
          isArchived: false,
          createdBy: user._id,
        });
        inserted++;
      }
    }
    return inserted;
  },
});
