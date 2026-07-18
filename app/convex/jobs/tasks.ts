import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { getAuthenticatedUser, getOrgMembership } from "../lib/permissions.ts";
import { getJobForOrg, recordJobActivity } from "../lib/jobActivity.ts";
import type { Doc } from "../_generated/dataModel";

// List tasks for a job, newest first.
export const list = query({
  args: { jobId: v.id("jobs"), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    await getJobForOrg(ctx, args.jobId, args.orgId);

    const tasks = await ctx.db
      .query("jobTasks")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .order("desc")
      .collect();

    return await Promise.all(
      tasks.map(async (t) => {
        const assignee = t.assignedTo ? await ctx.db.get(t.assignedTo) : null;
        return { ...t, assignee };
      }),
    );
  },
});

// List open (incomplete) tasks for an org, for the dashboard (paginated).
export const listOpen = query({
  args: { orgId: v.id("organizations"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);

    const result = await ctx.db
      .query("jobTasks")
      .withIndex("by_org_and_completed", (q) =>
        q.eq("orgId", args.orgId).eq("isCompleted", false),
      )
      .order("desc")
      .paginate(args.paginationOpts);

    const enriched = await Promise.all(
      result.page.map(async (t: Doc<"jobTasks">) => {
        const [job, assignee] = await Promise.all([
          ctx.db.get(t.jobId),
          t.assignedTo ? ctx.db.get(t.assignedTo) : null,
        ]);
        return { ...t, job, assignee };
      }),
    );
    return { ...result, page: enriched };
  },
});

// Create a task (+ activity event).
export const create = mutation({
  args: {
    jobId: v.id("jobs"),
    orgId: v.id("organizations"),
    title: v.string(),
    description: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    await getJobForOrg(ctx, args.jobId, args.orgId);

    const taskId = await ctx.db.insert("jobTasks", {
      orgId: args.orgId,
      jobId: args.jobId,
      title: args.title,
      description: args.description,
      assignedTo: args.assignedTo,
      dueDate: args.dueDate,
      isCompleted: false,
      createdBy: user._id,
    });

    await recordJobActivity(ctx, {
      orgId: args.orgId,
      jobId: args.jobId,
      eventType: "task_added",
      description: `Task "${args.title}" added`,
      userId: user._id,
      metadata: { taskId },
    });

    return taskId;
  },
});

// Update a task's fields.
export const update = mutation({
  args: {
    taskId: v.id("jobTasks"),
    orgId: v.id("organizations"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const task = await ctx.db.get(args.taskId);
    if (!task || task.orgId !== args.orgId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Task not found" });
    }
    const { taskId, orgId, ...updates } = args;
    await ctx.db.patch(taskId, updates);
  },
});

// Mark a task complete or incomplete (+ activity event on completion).
export const complete = mutation({
  args: {
    taskId: v.id("jobTasks"),
    orgId: v.id("organizations"),
    isCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const task = await ctx.db.get(args.taskId);
    if (!task || task.orgId !== args.orgId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Task not found" });
    }

    const isCompleted = args.isCompleted ?? true;
    await ctx.db.patch(args.taskId, {
      isCompleted,
      completedAt: isCompleted ? Date.now() : undefined,
      completedBy: isCompleted ? user._id : undefined,
    });

    if (isCompleted && !task.isCompleted) {
      await recordJobActivity(ctx, {
        orgId: args.orgId,
        jobId: task.jobId,
        eventType: "task_completed",
        description: `Task "${task.title}" completed`,
        userId: user._id,
        metadata: { taskId: args.taskId },
      });
    }
  },
});

// Delete a task.
export const remove = mutation({
  args: { taskId: v.id("jobTasks"), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const task = await ctx.db.get(args.taskId);
    if (!task || task.orgId !== args.orgId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Task not found" });
    }
    await ctx.db.delete(args.taskId);
  },
});
