import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthenticatedUser, getOrgMembership } from "../lib/permissions.ts";
import { paginationOptsValidator } from "convex/server";

// List opportunities for an org (paginated)
export const list = query({
  args: {
    orgId: v.id("organizations"),
    paginationOpts: paginationOptsValidator,
    stageId: v.optional(v.id("pipelineStages")),
    assignedTo: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);

    let baseQuery;
    if (args.stageId) {
      baseQuery = ctx.db
        .query("opportunities")
        .withIndex("by_org_and_stage", (q) =>
          q.eq("orgId", args.orgId).eq("stageId", args.stageId!),
        );
    } else if (args.assignedTo) {
      baseQuery = ctx.db
        .query("opportunities")
        .withIndex("by_org_and_assigned", (q) =>
          q.eq("orgId", args.orgId).eq("assignedTo", args.assignedTo),
        );
    } else {
      baseQuery = ctx.db
        .query("opportunities")
        .withIndex("by_org_and_deleted", (q) =>
          q.eq("orgId", args.orgId).eq("isDeleted", false),
        );
    }

    const result = await baseQuery.order("desc").paginate(args.paginationOpts);

    const enriched = await Promise.all(
      result.page.map(async (opp) => {
        const [customer, contact, stage] = await Promise.all([
          opp.customerId ? ctx.db.get(opp.customerId) : null,
          opp.contactId ? ctx.db.get(opp.contactId) : null,
          ctx.db.get(opp.stageId),
        ]);
        return { ...opp, customer, contact, stage };
      }),
    );

    return { ...result, page: enriched };
  },
});

// Get a single opportunity with enriched data
export const get = query({
  args: { opportunityId: v.id("opportunities"), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const opp = await ctx.db.get(args.opportunityId);
    if (!opp || opp.orgId !== args.orgId || opp.isDeleted) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Opportunity not found" });
    }
    const [customer, contact, property, stage, assignedUser, sourceLead] = await Promise.all([
      opp.customerId ? ctx.db.get(opp.customerId) : null,
      opp.contactId ? ctx.db.get(opp.contactId) : null,
      opp.propertyId ? ctx.db.get(opp.propertyId) : null,
      ctx.db.get(opp.stageId),
      opp.assignedTo ? ctx.db.get(opp.assignedTo) : null,
      opp.convertedFromLeadId ? ctx.db.get(opp.convertedFromLeadId) : null,
    ]);
    return { ...opp, customer, contact, property, stage, assignedUser, sourceLead };
  },
});

// Create an opportunity
export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    title: v.string(),
    stageId: v.id("pipelineStages"),
    customerId: v.optional(v.id("customers")),
    contactId: v.optional(v.id("contacts")),
    propertyId: v.optional(v.id("properties")),
    assignedTo: v.optional(v.id("users")),
    value: v.optional(v.number()),
    source: v.optional(v.string()),
    notes: v.optional(v.string()),
    closeDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);

    const stage = await ctx.db.get(args.stageId);
    if (!stage || stage.orgId !== args.orgId || stage.pipelineType !== "opportunity") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid stage" });
    }

    return await ctx.db.insert("opportunities", {
      ...args,
      isDeleted: false,
      createdBy: user._id,
    });
  },
});

// Update an opportunity
export const update = mutation({
  args: {
    opportunityId: v.id("opportunities"),
    orgId: v.id("organizations"),
    title: v.optional(v.string()),
    stageId: v.optional(v.id("pipelineStages")),
    customerId: v.optional(v.id("customers")),
    contactId: v.optional(v.id("contacts")),
    propertyId: v.optional(v.id("properties")),
    assignedTo: v.optional(v.id("users")),
    value: v.optional(v.number()),
    source: v.optional(v.string()),
    notes: v.optional(v.string()),
    closeDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const opp = await ctx.db.get(args.opportunityId);
    if (!opp || opp.orgId !== args.orgId || opp.isDeleted) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Opportunity not found" });
    }
    const { opportunityId, orgId, ...updates } = args;
    await ctx.db.patch(opportunityId, { ...updates, updatedAt: Date.now(), updatedBy: user._id });
  },
});

// Soft delete an opportunity
export const remove = mutation({
  args: { opportunityId: v.id("opportunities"), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const opp = await ctx.db.get(args.opportunityId);
    if (!opp || opp.orgId !== args.orgId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Opportunity not found" });
    }
    await ctx.db.patch(args.opportunityId, {
      isDeleted: true,
      deletedAt: Date.now(),
      deletedBy: user._id,
    });
  },
});
