import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthenticatedUser, getOrgMembership } from "../lib/permissions.ts";
import { paginationOptsValidator } from "convex/server";

// List customers for an org (paginated)
export const list = query({
  args: {
    orgId: v.id("organizations"),
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);

    let q = ctx.db
      .query("customers")
      .withIndex("by_org_and_deleted", (q) =>
        q.eq("orgId", args.orgId).eq("isDeleted", false),
      )
      .order("desc");

    const result = await q.paginate(args.paginationOpts);

    // Client-side search filter (full-text search would be added in a later pass)
    if (args.search) {
      const term = args.search.toLowerCase();
      return {
        ...result,
        page: result.page.filter(
          (c) =>
            c.name.toLowerCase().includes(term) ||
            c.email?.toLowerCase().includes(term) ||
            c.phone?.includes(term),
        ),
      };
    }

    return result;
  },
});

// Get a single customer
export const get = query({
  args: { customerId: v.id("customers"), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.orgId !== args.orgId || customer.isDeleted) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Customer not found" });
    }
    return customer;
  },
});

// Create a customer
export const create = mutation({
  args: {
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
    source: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);

    // Duplicate check: same name and email in same org
    if (args.email) {
      const existing = await ctx.db
        .query("customers")
        .withIndex("by_org_and_deleted", (q) =>
          q.eq("orgId", args.orgId).eq("isDeleted", false),
        )
        .filter((q) => q.eq(q.field("email"), args.email))
        .first();
      if (existing) {
        throw new ConvexError({
          code: "CONFLICT",
          message: `A customer with email "${args.email}" already exists`,
        });
      }
    }

    const { orgId, ...rest } = args;
    return await ctx.db.insert("customers", {
      ...rest,
      orgId,
      isDeleted: false,
      createdBy: user._id,
    });
  },
});

// Update a customer
export const update = mutation({
  args: {
    customerId: v.id("customers"),
    orgId: v.id("organizations"),
    name: v.optional(v.string()),
    type: v.optional(v.union(v.literal("company"), v.literal("individual"))),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zip: v.optional(v.string()),
    notes: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    source: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.orgId !== args.orgId || customer.isDeleted) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Customer not found" });
    }
    const { customerId, orgId, ...updates } = args;
    await ctx.db.patch(customerId, { ...updates, updatedAt: Date.now(), updatedBy: user._id });
  },
});

// Soft delete a customer
export const remove = mutation({
  args: { customerId: v.id("customers"), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.orgId !== args.orgId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Customer not found" });
    }
    await ctx.db.patch(args.customerId, {
      isDeleted: true,
      deletedAt: Date.now(),
      deletedBy: user._id,
    });
  },
});
