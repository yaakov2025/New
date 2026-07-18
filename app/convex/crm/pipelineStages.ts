import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthenticatedUser, getOrgMembership, requireRole } from "../lib/permissions.ts";

const DEFAULT_LEAD_STAGES = [
  { name: "New", color: "#6366f1", order: 0 },
  { name: "Contacted", color: "#f59e0b", order: 1 },
  { name: "Qualified", color: "#10b981", order: 2 },
  { name: "Lost", color: "#ef4444", order: 3 },
];

const DEFAULT_OPPORTUNITY_STAGES = [
  { name: "Discovery", color: "#6366f1", order: 0 },
  { name: "Proposal", color: "#f59e0b", order: 1 },
  { name: "Negotiation", color: "#8b5cf6", order: 2 },
  { name: "Won", color: "#10b981", order: 3 },
  { name: "Lost", color: "#ef4444", order: 4 },
];

// Seed default stages for a new org
export const seedDefaultStages = mutation({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const membership = await getOrgMembership(ctx, user._id, args.orgId);
    requireRole(membership.role, "admin");

    for (const stage of DEFAULT_LEAD_STAGES) {
      await ctx.db.insert("pipelineStages", {
        orgId: args.orgId,
        pipelineType: "lead",
        name: stage.name,
        color: stage.color,
        order: stage.order,
        isArchived: false,
        isDefault: stage.order === 0,
        createdBy: user._id,
      });
    }
    for (const stage of DEFAULT_OPPORTUNITY_STAGES) {
      await ctx.db.insert("pipelineStages", {
        orgId: args.orgId,
        pipelineType: "opportunity",
        name: stage.name,
        color: stage.color,
        order: stage.order,
        isArchived: false,
        isDefault: stage.order === 0,
        createdBy: user._id,
      });
    }
  },
});

// List stages by type for an org (excludes archived by default)
export const list = query({
  args: {
    orgId: v.id("organizations"),
    pipelineType: v.union(v.literal("lead"), v.literal("opportunity")),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);

    const stages = await ctx.db
      .query("pipelineStages")
      .withIndex("by_org_and_type_and_archived", (q) =>
        q
          .eq("orgId", args.orgId)
          .eq("pipelineType", args.pipelineType)
          .eq("isArchived", args.includeArchived ? true : false),
      )
      .collect();

    if (args.includeArchived) {
      // Get both archived and non-archived
      const nonArchived = await ctx.db
        .query("pipelineStages")
        .withIndex("by_org_and_type_and_archived", (q) =>
          q.eq("orgId", args.orgId).eq("pipelineType", args.pipelineType).eq("isArchived", false),
        )
        .collect();
      return [...nonArchived, ...stages].sort((a, b) => a.order - b.order);
    }

    return stages.sort((a, b) => a.order - b.order);
  },
});

// Create a new stage
export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    pipelineType: v.union(v.literal("lead"), v.literal("opportunity")),
    name: v.string(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const membership = await getOrgMembership(ctx, user._id, args.orgId);
    requireRole(membership.role, "admin");

    const existing = await ctx.db
      .query("pipelineStages")
      .withIndex("by_org_and_type_and_archived", (q) =>
        q.eq("orgId", args.orgId).eq("pipelineType", args.pipelineType).eq("isArchived", false),
      )
      .collect();

    return await ctx.db.insert("pipelineStages", {
      orgId: args.orgId,
      pipelineType: args.pipelineType,
      name: args.name,
      color: args.color,
      order: existing.length,
      isArchived: false,
      isDefault: false,
      createdBy: user._id,
    });
  },
});

// Update a stage
export const update = mutation({
  args: {
    stageId: v.id("pipelineStages"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const stage = await ctx.db.get(args.stageId);
    if (!stage) throw new ConvexError({ code: "NOT_FOUND", message: "Stage not found" });
    const membership = await getOrgMembership(ctx, user._id, stage.orgId);
    requireRole(membership.role, "admin");

    const { stageId, ...updates } = args;
    const patch: Partial<typeof stage> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.color !== undefined) patch.color = updates.color;
    if (updates.order !== undefined) patch.order = updates.order;
    await ctx.db.patch(stageId, patch);
  },
});

// Archive a stage (soft delete — records in this stage keep their stageId)
export const archive = mutation({
  args: { stageId: v.id("pipelineStages") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const stage = await ctx.db.get(args.stageId);
    if (!stage) throw new ConvexError({ code: "NOT_FOUND", message: "Stage not found" });
    const membership = await getOrgMembership(ctx, user._id, stage.orgId);
    requireRole(membership.role, "admin");
    if (stage.isDefault) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Cannot archive the default stage" });
    }
    await ctx.db.patch(args.stageId, { isArchived: true });
  },
});
