import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { getAuthenticatedUser, getOrgMembership } from "../lib/permissions.ts";
import { getJobForOrg, recordJobActivity } from "../lib/jobActivity.ts";
import type { Doc } from "../_generated/dataModel";

// List appointments for a job, ordered by scheduledAt (soonest first).
export const list = query({
  args: { jobId: v.id("jobs"), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    await getJobForOrg(ctx, args.jobId, args.orgId);

    const appointments = await ctx.db
      .query("jobAppointments")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .collect();

    const sorted = appointments.sort((a, b) =>
      a.scheduledAt < b.scheduledAt ? -1 : a.scheduledAt > b.scheduledAt ? 1 : 0,
    );

    return await Promise.all(
      sorted.map(async (a) => {
        const assignee = a.assignedTo ? await ctx.db.get(a.assignedTo) : null;
        return { ...a, assignee };
      }),
    );
  },
});

// List upcoming appointments for an org, for the dashboard (paginated).
export const listUpcoming = query({
  args: { orgId: v.id("organizations"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);

    const nowIso = new Date().toISOString();
    const result = await ctx.db
      .query("jobAppointments")
      .withIndex("by_org_and_scheduled", (q) =>
        q.eq("orgId", args.orgId).gte("scheduledAt", nowIso),
      )
      .order("asc")
      .paginate(args.paginationOpts);

    const enriched = await Promise.all(
      result.page.map(async (a: Doc<"jobAppointments">) => {
        const [job, assignee] = await Promise.all([
          ctx.db.get(a.jobId),
          a.assignedTo ? ctx.db.get(a.assignedTo) : null,
        ]);
        return { ...a, job, assignee };
      }),
    );
    return { ...result, page: enriched };
  },
});

// Create an appointment (+ activity event).
export const create = mutation({
  args: {
    jobId: v.id("jobs"),
    orgId: v.id("organizations"),
    title: v.string(),
    description: v.optional(v.string()),
    scheduledAt: v.string(),
    duration: v.optional(v.number()),
    assignedTo: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    await getJobForOrg(ctx, args.jobId, args.orgId);

    const appointmentId = await ctx.db.insert("jobAppointments", {
      orgId: args.orgId,
      jobId: args.jobId,
      title: args.title,
      description: args.description,
      scheduledAt: args.scheduledAt,
      duration: args.duration,
      assignedTo: args.assignedTo,
      createdBy: user._id,
    });

    await recordJobActivity(ctx, {
      orgId: args.orgId,
      jobId: args.jobId,
      eventType: "appointment_scheduled",
      description: `Appointment "${args.title}" scheduled`,
      userId: user._id,
      metadata: { appointmentId, scheduledAt: args.scheduledAt },
    });

    return appointmentId;
  },
});

// Update an appointment.
export const update = mutation({
  args: {
    appointmentId: v.id("jobAppointments"),
    orgId: v.id("organizations"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    scheduledAt: v.optional(v.string()),
    duration: v.optional(v.number()),
    assignedTo: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment || appointment.orgId !== args.orgId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Appointment not found" });
    }
    const { appointmentId, orgId, ...updates } = args;
    await ctx.db.patch(appointmentId, updates);
  },
});

// Delete an appointment.
export const remove = mutation({
  args: { appointmentId: v.id("jobAppointments"), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment || appointment.orgId !== args.orgId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Appointment not found" });
    }
    await ctx.db.delete(args.appointmentId);
  },
});
