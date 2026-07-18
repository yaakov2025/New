import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { getAuthenticatedUser, getOrgMembership } from "../lib/permissions.ts";
import { getJobForOrg, recordJobActivity } from "../lib/jobActivity.ts";
import { getDefaultStatusName } from "./statuses.ts";
import type { Doc } from "../_generated/dataModel";

// List jobs for an org (paginated), with optional filters.
// assignedTo is resolved through jobAssignments (the sole source of truth).
export const list = query({
  args: {
    orgId: v.id("organizations"),
    paginationOpts: paginationOptsValidator,
    status: v.optional(v.string()),
    needsReview: v.optional(v.boolean()),
    assignedTo: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);

    const enrich = async (job: Doc<"jobs">) => {
      const [customer, property, contact] = await Promise.all([
        job.customerId ? ctx.db.get(job.customerId) : null,
        job.propertyId ? ctx.db.get(job.propertyId) : null,
        job.contactId ? ctx.db.get(job.contactId) : null,
      ]);
      return { ...job, customer, property, contact };
    };

    // Filter by assignee via the jobAssignments join table.
    if (args.assignedTo) {
      const assignedTo = args.assignedTo;
      const result = await ctx.db
        .query("jobAssignments")
        .withIndex("by_org_and_user", (q) =>
          q.eq("orgId", args.orgId).eq("userId", assignedTo),
        )
        .order("desc")
        .paginate(args.paginationOpts);

      const jobs = await Promise.all(
        result.page.map((a) => ctx.db.get(a.jobId)),
      );
      const visible = jobs.filter(
        (j): j is Doc<"jobs"> =>
          j !== null &&
          !j.isDeleted &&
          (args.status === undefined || j.status === args.status) &&
          (args.needsReview === undefined || j.needsReview === args.needsReview),
      );
      const enriched = await Promise.all(visible.map(enrich));
      return { ...result, page: enriched };
    }

    let baseQuery;
    if (args.status !== undefined) {
      const status = args.status;
      baseQuery = ctx.db
        .query("jobs")
        .withIndex("by_org_and_status", (q) =>
          q.eq("orgId", args.orgId).eq("status", status),
        );
    } else if (args.needsReview !== undefined) {
      const needsReview = args.needsReview;
      baseQuery = ctx.db
        .query("jobs")
        .withIndex("by_org_and_needs_review", (q) =>
          q.eq("orgId", args.orgId).eq("needsReview", needsReview),
        );
    } else {
      baseQuery = ctx.db
        .query("jobs")
        .withIndex("by_org_and_deleted", (q) =>
          q.eq("orgId", args.orgId).eq("isDeleted", false),
        );
    }

    const result = await baseQuery.order("desc").paginate(args.paginationOpts);
    // The status / needsReview indexes may include soft-deleted rows.
    const visible = result.page.filter((j) => !j.isDeleted);
    const enriched = await Promise.all(visible.map(enrich));
    return { ...result, page: enriched };
  },
});

// Get a single job with customer / property / contact enrichment.
export const get = query({
  args: { jobId: v.id("jobs"), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const job = await getJobForOrg(ctx, args.jobId, args.orgId);

    const [customer, contact, property, createdByUser, opportunity] = await Promise.all([
      job.customerId ? ctx.db.get(job.customerId) : null,
      job.contactId ? ctx.db.get(job.contactId) : null,
      job.propertyId ? ctx.db.get(job.propertyId) : null,
      ctx.db.get(job.createdBy),
      job.convertedFromOpportunityId ? ctx.db.get(job.convertedFromOpportunityId) : null,
    ]);
    return { ...job, customer, contact, property, createdByUser, opportunity };
  },
});

// Create a job (+ "created" activity event, + optional user assignments).
export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    name: v.string(),
    customerId: v.optional(v.id("customers")),
    contactId: v.optional(v.id("contacts")),
    propertyId: v.optional(v.id("properties")),
    jobType: v.optional(v.string()),
    status: v.optional(v.string()),
    needsReview: v.optional(v.boolean()),
    nextStep: v.optional(v.string()),
    startDate: v.optional(v.string()),
    targetCompletionDate: v.optional(v.string()),
    estimatedValue: v.optional(v.number()),
    isInsuranceJob: v.optional(v.boolean()),
    convertedFromOpportunityId: v.optional(v.id("opportunities")),
    notes: v.optional(v.string()),
    assigneeIds: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);

    const status = args.status ?? (await getDefaultStatusName(ctx, args.orgId));

    const jobId = await ctx.db.insert("jobs", {
      orgId: args.orgId,
      name: args.name,
      customerId: args.customerId,
      contactId: args.contactId,
      propertyId: args.propertyId,
      jobType: args.jobType,
      status,
      needsReview: args.needsReview ?? false,
      nextStep: args.nextStep,
      startDate: args.startDate,
      targetCompletionDate: args.targetCompletionDate,
      estimatedValue: args.estimatedValue,
      isInsuranceJob: args.isInsuranceJob ?? false,
      convertedFromOpportunityId: args.convertedFromOpportunityId,
      notes: args.notes,
      isDeleted: false,
      createdBy: user._id,
    });

    await recordJobActivity(ctx, {
      orgId: args.orgId,
      jobId,
      eventType: "created",
      description: `Job "${args.name}" created`,
      userId: user._id,
    });

    // Optionally assign users up front.
    if (args.assigneeIds && args.assigneeIds.length > 0) {
      for (const userId of args.assigneeIds) {
        await ctx.db.insert("jobAssignments", {
          orgId: args.orgId,
          jobId,
          userId,
          assignedBy: user._id,
        });
        const assignee = await ctx.db.get(userId);
        await recordJobActivity(ctx, {
          orgId: args.orgId,
          jobId,
          eventType: "assigned",
          description: `${assignee?.name ?? "A user"} was assigned to the job`,
          userId: user._id,
          metadata: { userId },
        });
      }
    }

    return jobId;
  },
});

// Update a job (+ activity event when the status changes).
export const update = mutation({
  args: {
    jobId: v.id("jobs"),
    orgId: v.id("organizations"),
    name: v.optional(v.string()),
    customerId: v.optional(v.id("customers")),
    contactId: v.optional(v.id("contacts")),
    propertyId: v.optional(v.id("properties")),
    jobType: v.optional(v.string()),
    status: v.optional(v.string()),
    needsReview: v.optional(v.boolean()),
    nextStep: v.optional(v.string()),
    startDate: v.optional(v.string()),
    targetCompletionDate: v.optional(v.string()),
    estimatedValue: v.optional(v.number()),
    isInsuranceJob: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const job = await getJobForOrg(ctx, args.jobId, args.orgId);

    const { jobId, orgId, ...updates } = args;
    await ctx.db.patch(jobId, { ...updates, updatedAt: Date.now(), updatedBy: user._id });

    if (updates.status !== undefined && updates.status !== job.status) {
      await recordJobActivity(ctx, {
        orgId: args.orgId,
        jobId,
        eventType: "status_changed",
        description: `Status changed from "${job.status}" to "${updates.status}"`,
        userId: user._id,
        metadata: { from: job.status, to: updates.status },
      });
    }
  },
});

// Soft delete a job.
export const remove = mutation({
  args: { jobId: v.id("jobs"), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const job = await ctx.db.get(args.jobId);
    if (!job || job.orgId !== args.orgId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Job not found" });
    }
    await ctx.db.patch(args.jobId, {
      isDeleted: true,
      deletedAt: Date.now(),
      deletedBy: user._id,
    });
  },
});
