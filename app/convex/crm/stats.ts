import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthenticatedUser, getOrgMembership } from "../lib/permissions.ts";

// Dashboard counts for CRM and Jobs
export const pipelineCounts = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);

    const leads = await ctx.db
      .query("leads")
      .withIndex("by_org_and_deleted", (q) =>
        q.eq("orgId", args.orgId).eq("isDeleted", false),
      )
      .collect();

    const opportunities = await ctx.db
      .query("opportunities")
      .withIndex("by_org_and_deleted", (q) =>
        q.eq("orgId", args.orgId).eq("isDeleted", false),
      )
      .collect();

    const openLeads = leads.filter((l) => !l.convertedToOpportunityId).length;
    const openOpportunities = opportunities.length;

    // Jobs stats
    const activeJobs = await ctx.db
      .query("jobs")
      .withIndex("by_org_and_deleted", (q) =>
        q.eq("orgId", args.orgId).eq("isDeleted", false),
      )
      .collect();

    // Get job statuses to determine which are "active" category
    const statuses = await ctx.db
      .query("jobStatuses")
      .withIndex("by_org_and_archived", (q) =>
        q.eq("orgId", args.orgId).eq("isArchived", false),
      )
      .collect();
    const activeStatusNames = statuses
      .filter((s) => s.category === "active" || s.category === "planned")
      .map((s) => s.name);

    const activeJobCount = activeJobs.filter((j) =>
      activeStatusNames.includes(j.status),
    ).length;

    const needsReviewCount = activeJobs.filter((j) => j.needsReview).length;

    // Open tasks
    const openTasks = await ctx.db
      .query("jobTasks")
      .withIndex("by_org_and_completed", (q) =>
        q.eq("orgId", args.orgId).eq("isCompleted", false),
      )
      .take(200);

    // Recent jobs (last 5)
    const recentJobs = activeJobs
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 5);
    const recentJobsEnriched = await Promise.all(
      recentJobs.map(async (job) => {
        const customer = job.customerId ? await ctx.db.get(job.customerId) : null;
        return { _id: job._id, name: job.name, status: job.status, customerName: customer?.name };
      }),
    );

    // Upcoming appointments (next 5)
    const now = new Date().toISOString();
    const upcoming = await ctx.db
      .query("jobAppointments")
      .withIndex("by_org_and_scheduled", (q) =>
        q.eq("orgId", args.orgId).gte("scheduledAt", now),
      )
      .order("asc")
      .take(5);
    const upcomingEnriched = await Promise.all(
      upcoming.map(async (appt) => {
        const job = await ctx.db.get(appt.jobId);
        return { ...appt, jobName: job?.name };
      }),
    );

    return {
      openLeads,
      openOpportunities,
      activeJobCount,
      needsReviewCount,
      openTasksCount: openTasks.length,
      recentJobs: recentJobsEnriched,
      upcomingAppointments: upcomingEnriched,
    };
  },
});
