import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthenticatedUser, getOrgMembership } from "../lib/permissions.ts";
import { getJobForOrg } from "../lib/jobActivity.ts";

// List contacts linked to a job (enriched with contact details).
export const list = query({
  args: { jobId: v.id("jobs"), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    await getJobForOrg(ctx, args.jobId, args.orgId);

    const links = await ctx.db
      .query("jobContacts")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .collect();

    return await Promise.all(
      links.map(async (link) => {
        const contact = await ctx.db.get(link.contactId);
        return { ...link, contact };
      }),
    );
  },
});

// Add a contact to a job.
export const add = mutation({
  args: {
    jobId: v.id("jobs"),
    orgId: v.id("organizations"),
    contactId: v.id("contacts"),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    await getJobForOrg(ctx, args.jobId, args.orgId);

    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.orgId !== args.orgId || contact.isDeleted) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Contact not found" });
    }

    const existing = await ctx.db
      .query("jobContacts")
      .withIndex("by_org_and_job", (q) =>
        q.eq("orgId", args.orgId).eq("jobId", args.jobId),
      )
      .collect();
    if (existing.some((c) => c.contactId === args.contactId)) {
      throw new ConvexError({ code: "CONFLICT", message: "Contact is already linked to this job" });
    }

    return await ctx.db.insert("jobContacts", {
      orgId: args.orgId,
      jobId: args.jobId,
      contactId: args.contactId,
      role: args.role,
      createdBy: user._id,
    });
  },
});

// Remove a contact from a job.
export const remove = mutation({
  args: { jobContactId: v.id("jobContacts"), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const link = await ctx.db.get(args.jobContactId);
    if (!link || link.orgId !== args.orgId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Job contact not found" });
    }
    await ctx.db.delete(args.jobContactId);
  },
});
