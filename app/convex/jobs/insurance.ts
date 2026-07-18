import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthenticatedUser, getOrgMembership } from "../lib/permissions.ts";
import { getJobForOrg } from "../lib/jobActivity.ts";

export const get = query({
  args: { jobId: v.id("jobs"), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    await getJobForOrg(ctx, args.jobId, args.orgId);

    const record = await ctx.db
      .query("jobInsurance")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .first();

    return record;
  },
});

export const upsert = mutation({
  args: {
    jobId: v.id("jobs"),
    orgId: v.id("organizations"),
    carrier: v.optional(v.string()),
    policyNumber: v.optional(v.string()),
    claimNumber: v.optional(v.string()),
    deductible: v.optional(v.number()),
    adjusterName: v.optional(v.string()),
    adjusterPhone: v.optional(v.string()),
    adjusterEmail: v.optional(v.string()),
    dateOfLoss: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    await getJobForOrg(ctx, args.jobId, args.orgId);

    const existing = await ctx.db
      .query("jobInsurance")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .first();

    const data = {
      carrier: args.carrier,
      policyNumber: args.policyNumber,
      claimNumber: args.claimNumber,
      deductible: args.deductible,
      adjusterName: args.adjusterName,
      adjusterPhone: args.adjusterPhone,
      adjusterEmail: args.adjusterEmail,
      dateOfLoss: args.dateOfLoss,
      notes: args.notes,
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...data,
        updatedBy: user._id,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("jobInsurance", {
        orgId: args.orgId,
        jobId: args.jobId,
        ...data,
        createdBy: user._id,
      });
    }
  },
});
