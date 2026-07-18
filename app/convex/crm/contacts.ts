import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthenticatedUser, getOrgMembership } from "../lib/permissions.ts";

// List contacts for an org (optionally filtered by customer)
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
        .query("contacts")
        .withIndex("by_org_and_customer", (q) =>
          q.eq("orgId", args.orgId).eq("customerId", args.customerId),
        )
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .collect();
    }

    return await ctx.db
      .query("contacts")
      .withIndex("by_org_and_deleted", (q) =>
        q.eq("orgId", args.orgId).eq("isDeleted", false),
      )
      .collect();
  },
});

// Get a single contact
export const get = query({
  args: { contactId: v.id("contacts"), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.orgId !== args.orgId || contact.isDeleted) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Contact not found" });
    }
    return contact;
  },
});

// Create a contact
export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    customerId: v.optional(v.id("customers")),
    firstName: v.string(),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    title: v.optional(v.string()),
    isPrimary: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);

    // If making primary, unset any existing primary for that customer
    if (args.isPrimary && args.customerId) {
      const existing = await ctx.db
        .query("contacts")
        .withIndex("by_org_and_customer", (q) =>
          q.eq("orgId", args.orgId).eq("customerId", args.customerId),
        )
        .filter((q) => q.eq(q.field("isPrimary"), true))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { isPrimary: false });
      }
    }

    return await ctx.db.insert("contacts", {
      orgId: args.orgId,
      customerId: args.customerId,
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      phone: args.phone,
      title: args.title,
      isPrimary: args.isPrimary ?? false,
      notes: args.notes,
      isDeleted: false,
      createdBy: user._id,
    });
  },
});

// Update a contact
export const update = mutation({
  args: {
    contactId: v.id("contacts"),
    orgId: v.id("organizations"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    title: v.optional(v.string()),
    isPrimary: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.orgId !== args.orgId || contact.isDeleted) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Contact not found" });
    }

    // If making primary, unset existing primary
    if (args.isPrimary && contact.customerId) {
      const existing = await ctx.db
        .query("contacts")
        .withIndex("by_org_and_customer", (q) =>
          q.eq("orgId", args.orgId).eq("customerId", contact.customerId),
        )
        .filter((q) => q.eq(q.field("isPrimary"), true))
        .first();
      if (existing && existing._id !== args.contactId) {
        await ctx.db.patch(existing._id, { isPrimary: false });
      }
    }

    const { contactId, orgId, ...updates } = args;
    await ctx.db.patch(contactId, { ...updates, updatedAt: Date.now(), updatedBy: user._id });
  },
});

// Soft delete a contact
export const remove = mutation({
  args: { contactId: v.id("contacts"), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.orgId !== args.orgId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Contact not found" });
    }
    await ctx.db.patch(args.contactId, {
      isDeleted: true,
      deletedAt: Date.now(),
      deletedBy: user._id,
    });
  },
});
