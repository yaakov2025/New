import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthenticatedUser, getOrgMembership } from "../lib/permissions.ts";
import { getJobForOrg, recordJobActivity } from "../lib/jobActivity.ts";

// List assignments for a job (enriched with the assigned user's name).
export const list = query({
  args: { jobId: v.id("jobs"), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    await getJobForOrg(ctx, args.jobId, args.orgId);

    const assignments = await ctx.db
      .query("jobAssignments")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .collect();

    return await Promise.all(
      assignments.map(async (a) => {
        const assignee = await ctx.db.get(a.userId);
        return {
          ...a,
          userName: assignee?.name ?? null,
          userEmail: assignee?.email ?? null,
          userAvatarUrl: assignee?.avatarUrl ?? null,
        };
      }),
    );
  },
});

// Assign a user to a job (+ activity event). Idempotent per user.
export const assign = mutation({
  args: {
    jobId: v.id("jobs"),
    orgId: v.id("organizations"),
    userId: v.id("users"),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    await getJobForOrg(ctx, args.jobId, args.orgId);

    // The assignee must be an active member of the org.
    await getOrgMembership(ctx, args.userId, args.orgId);

    const existing = await ctx.db
      .query("jobAssignments")
      .withIndex("by_org_and_job", (q) =>
        q.eq("orgId", args.orgId).eq("jobId", args.jobId),
      )
      .collect();
    if (existing.some((a) => a.userId === args.userId)) {
      throw new ConvexError({ code: "CONFLICT", message: "User is already assigned to this job" });
    }

    const assignmentId = await ctx.db.insert("jobAssignments", {
      orgId: args.orgId,
      jobId: args.jobId,
      userId: args.userId,
      role: args.role,
      assignedBy: user._id,
    });

    const assignee = await ctx.db.get(args.userId);
    await recordJobActivity(ctx, {
      orgId: args.orgId,
      jobId: args.jobId,
      eventType: "assigned",
      description: `${assignee?.name ?? "A user"} was assigned to the job`,
      userId: user._id,
      metadata: { userId: args.userId, role: args.role },
    });

    return assignmentId;
  },
});

// Remove an assignment (+ activity event).
export const unassign = mutation({
  args: { assignmentId: v.id("jobAssignments"), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment || assignment.orgId !== args.orgId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Assignment not found" });
    }

    await ctx.db.delete(args.assignmentId);

    const assignee = await ctx.db.get(assignment.userId);
    await recordJobActivity(ctx, {
      orgId: args.orgId,
      jobId: assignment.jobId,
      eventType: "unassigned",
      description: `${assignee?.name ?? "A user"} was removed from the job`,
      userId: user._id,
      metadata: { userId: assignment.userId },
    });
  },
});
