import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthenticatedUser, getOrgMembership } from "../lib/permissions.ts";

// List properties for an org (optionally filtered by customer)
export const list = query({
  args: {
    orgId: v.id("organizations"),
    customerId: v.optional(v.id("customers")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);

    if (args.customerId) {
      return await ctx.db
        .query("properties")
        .withIndex("by_org_and_customer", (q) =>
          q.eq("orgId", args.orgId).eq("customerId", args.customerId!),
        )
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .collect();
    }

    return await ctx.db
      .query("properties")
      .withIndex("by_org_and_deleted", (q) =>
        q.eq("orgId", args.orgId).eq("isDeleted", false),
      )
      .collect();
  },
});

// Get a single property
export const get = query({
  args: { propertyId: v.id("properties"), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.orgId !== args.orgId || property.isDeleted) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Property not found" });
    }
    return property;
  },
});

// Create a property
export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    customerId: v.id("customers"),
    name: v.optional(v.string()),
    address: v.string(),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zip: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);

    // Validate customer belongs to org
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.orgId !== args.orgId || customer.isDeleted) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Customer not found" });
    }

    return await ctx.db.insert("properties", {
      ...args,
      isDeleted: false,
      createdBy: user._id,
    });
  },
});

// Update a property
export const update = mutation({
  args: {
    propertyId: v.id("properties"),
    orgId: v.id("organizations"),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zip: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.orgId !== args.orgId || property.isDeleted) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Property not found" });
    }
    const { propertyId, orgId, ...updates } = args;
    await ctx.db.patch(propertyId, { ...updates, updatedAt: Date.now(), updatedBy: user._id });
  },
});

// Soft delete a property
export const remove = mutation({
  args: { propertyId: v.id("properties"), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.orgId !== args.orgId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Property not found" });
    }
    await ctx.db.patch(args.propertyId, {
      isDeleted: true,
      deletedAt: Date.now(),
      deletedBy: user._id,
    });
  },
});
