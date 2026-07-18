import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthenticatedUser, getOrgMembership } from "../lib/permissions.ts";
import { paginationOptsValidator } from "convex/server";

// List leads for an org (paginated, optionally filtered by stage)
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
        .query("leads")
        .withIndex("by_org_and_stage", (q) =>
          q.eq("orgId", args.orgId).eq("stageId", args.stageId!),
        );
    } else if (args.assignedTo) {
      baseQuery = ctx.db
        .query("leads")
        .withIndex("by_org_and_assigned", (q) =>
          q.eq("orgId", args.orgId).eq("assignedTo", args.assignedTo),
        );
    } else {
      baseQuery = ctx.db
        .query("leads")
        .withIndex("by_org_and_deleted", (q) =>
          q.eq("orgId", args.orgId).eq("isDeleted", false),
        );
    }

    const result = await baseQuery.order("desc").paginate(args.paginationOpts);

    // Enrich with customer/contact/stage data
    const enriched = await Promise.all(
      result.page.map(async (lead) => {
        const [customer, contact, stage] = await Promise.all([
          lead.customerId ? ctx.db.get(lead.customerId) : null,
          lead.contactId ? ctx.db.get(lead.contactId) : null,
          ctx.db.get(lead.stageId),
        ]);
        return { ...lead, customer, contact, stage };
      }),
    );

    return { ...result, page: enriched };
  },
});

// Get a single lead with enriched data
export const get = query({
  args: { leadId: v.id("leads"), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const lead = await ctx.db.get(args.leadId);
    if (!lead || lead.orgId !== args.orgId || lead.isDeleted) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Lead not found" });
    }
    const [customer, contact, property, stage, assignedUser] = await Promise.all([
      lead.customerId ? ctx.db.get(lead.customerId) : null,
      lead.contactId ? ctx.db.get(lead.contactId) : null,
      lead.propertyId ? ctx.db.get(lead.propertyId) : null,
      ctx.db.get(lead.stageId),
      lead.assignedTo ? ctx.db.get(lead.assignedTo) : null,
    ]);
    return { ...lead, customer, contact, property, stage, assignedUser };
  },
});

// Create a lead
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
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);

    // Validate stage belongs to this org
    const stage = await ctx.db.get(args.stageId);
    if (!stage || stage.orgId !== args.orgId || stage.pipelineType !== "lead") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid stage" });
    }

    return await ctx.db.insert("leads", {
      ...args,
      isDeleted: false,
      createdBy: user._id,
    });
  },
});

// Update a lead
export const update = mutation({
  args: {
    leadId: v.id("leads"),
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
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const lead = await ctx.db.get(args.leadId);
    if (!lead || lead.orgId !== args.orgId || lead.isDeleted) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Lead not found" });
    }
    const { leadId, orgId, ...updates } = args;
    await ctx.db.patch(leadId, { ...updates, updatedAt: Date.now(), updatedBy: user._id });
  },
});

// Convert lead → opportunity
export const convertToOpportunity = mutation({
  args: {
    leadId: v.id("leads"),
    orgId: v.id("organizations"),
    opportunityStageId: v.id("pipelineStages"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const lead = await ctx.db.get(args.leadId);
    if (!lead || lead.orgId !== args.orgId || lead.isDeleted) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Lead not found" });
    }
    if (lead.convertedToOpportunityId) {
      throw new ConvexError({ code: "CONFLICT", message: "Lead already converted" });
    }

    const oppStage = await ctx.db.get(args.opportunityStageId);
    if (!oppStage || oppStage.orgId !== args.orgId || oppStage.pipelineType !== "opportunity") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid opportunity stage" });
    }

    const opportunityId = await ctx.db.insert("opportunities", {
      orgId: args.orgId,
      title: args.title ?? lead.title,
      customerId: lead.customerId,
      contactId: lead.contactId,
      propertyId: lead.propertyId,
      stageId: args.opportunityStageId,
      assignedTo: lead.assignedTo,
      value: lead.value,
      source: lead.source,
      notes: lead.notes,
      convertedFromLeadId: args.leadId,
      isDeleted: false,
      createdBy: user._id,
    });

    await ctx.db.patch(args.leadId, {
      convertedToOpportunityId: opportunityId,
      convertedAt: Date.now(),
      convertedBy: user._id,
      updatedAt: Date.now(),
      updatedBy: user._id,
    });

    return opportunityId;
  },
});

// Soft delete a lead
export const remove = mutation({
  args: { leadId: v.id("leads"), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const lead = await ctx.db.get(args.leadId);
    if (!lead || lead.orgId !== args.orgId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Lead not found" });
    }
    await ctx.db.patch(args.leadId, {
      isDeleted: true,
      deletedAt: Date.now(),
      deletedBy: user._id,
    });
  },
});
