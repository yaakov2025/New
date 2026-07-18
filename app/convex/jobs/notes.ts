import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthenticatedUser, getOrgMembership } from "../lib/permissions.ts";
import { getJobForOrg, recordJobActivity } from "../lib/jobActivity.ts";
import type { Doc, Id } from "../_generated/dataModel";

// List the latest version of each note for a job.
// A note is "latest" when no other note points to it as a parent.
export const list = query({
  args: { jobId: v.id("jobs"), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    await getJobForOrg(ctx, args.jobId, args.orgId);

    const notes = await ctx.db
      .query("jobNotes")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .collect();

    // Any note referenced as a parent has been superseded.
    const supersededIds = new Set<string>();
    for (const n of notes) {
      if (n.parentNoteId) supersededIds.add(n.parentNoteId);
    }
    const latest = notes.filter((n) => !supersededIds.has(n._id));

    const enriched = await Promise.all(
      latest.map(async (n) => {
        const author = await ctx.db.get(n.createdBy);
        return { ...n, authorName: author?.name ?? null };
      }),
    );

    // Newest first.
    return enriched.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// Create a new note (+ activity event).
export const create = mutation({
  args: {
    jobId: v.id("jobs"),
    orgId: v.id("organizations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    await getJobForOrg(ctx, args.jobId, args.orgId);

    const noteId = await ctx.db.insert("jobNotes", {
      orgId: args.orgId,
      jobId: args.jobId,
      content: args.content,
      version: 1,
      createdBy: user._id,
    });

    await recordJobActivity(ctx, {
      orgId: args.orgId,
      jobId: args.jobId,
      eventType: "note_added",
      description: "Note added",
      userId: user._id,
      metadata: { noteId },
    });

    return noteId;
  },
});

// Update a note by creating a new version that supersedes the current one.
export const update = mutation({
  args: {
    noteId: v.id("jobNotes"),
    orgId: v.id("organizations"),
    content: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"jobNotes">> => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);

    const current = await ctx.db.get(args.noteId);
    if (!current || current.orgId !== args.orgId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Note not found" });
    }

    // Only the latest version may be edited.
    const child = await ctx.db
      .query("jobNotes")
      .withIndex("by_parent", (q) => q.eq("parentNoteId", args.noteId))
      .first();
    if (child) {
      throw new ConvexError({ code: "CONFLICT", message: "Only the latest version of a note can be edited" });
    }

    const newVersionId = await ctx.db.insert("jobNotes", {
      orgId: current.orgId,
      jobId: current.jobId,
      content: args.content,
      version: current.version + 1,
      parentNoteId: current._id,
      createdBy: user._id,
    });

    await recordJobActivity(ctx, {
      orgId: current.orgId,
      jobId: current.jobId,
      eventType: "note_edited",
      description: "Note edited",
      userId: user._id,
      metadata: { noteId: newVersionId, previousNoteId: current._id },
    });

    return newVersionId;
  },
});

// Get all versions of a note (oldest → newest), given any version in the chain.
export const getHistory = query({
  args: { noteId: v.id("jobNotes"), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);

    const start = await ctx.db.get(args.noteId);
    if (!start || start.orgId !== args.orgId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Note not found" });
    }

    // Walk up to the root version.
    let root: Doc<"jobNotes"> = start;
    while (root.parentNoteId) {
      const parent = await ctx.db.get(root.parentNoteId);
      if (!parent) break;
      root = parent;
    }

    // Walk forward through the linear version chain.
    const versions: Doc<"jobNotes">[] = [root];
    let cursor: Doc<"jobNotes"> = root;
    for (;;) {
      const next = await ctx.db
        .query("jobNotes")
        .withIndex("by_parent", (q) => q.eq("parentNoteId", cursor._id))
        .first();
      if (!next) break;
      versions.push(next);
      cursor = next;
    }

    return await Promise.all(
      versions.map(async (n) => {
        const author = await ctx.db.get(n.createdBy);
        return { ...n, authorName: author?.name ?? null };
      }),
    );
  },
});
