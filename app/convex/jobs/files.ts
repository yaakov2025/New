import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthenticatedUser, getOrgMembership } from "../lib/permissions.ts";
import { getJobForOrg, recordJobActivity } from "../lib/jobActivity.ts";

export const list = query({
  args: { jobId: v.id("jobs"), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    await getJobForOrg(ctx, args.jobId, args.orgId);

    const files = await ctx.db
      .query("jobFiles")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .order("desc")
      .collect();

    return await Promise.all(
      files.map(async (f) => {
        const url = await ctx.storage.getUrl(f.storageId);
        const createdByUser = await ctx.db.get(f.createdBy);
        return { ...f, url, createdByUser };
      }),
    );
  },
});

export const create = mutation({
  args: {
    jobId: v.id("jobs"),
    orgId: v.id("organizations"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    await getJobForOrg(ctx, args.jobId, args.orgId);

    const fileId = await ctx.db.insert("jobFiles", {
      orgId: args.orgId,
      jobId: args.jobId,
      storageId: args.storageId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      createdBy: user._id,
    });

    await recordJobActivity(ctx, {
      orgId: args.orgId,
      jobId: args.jobId,
      eventType: "file_added",
      description: `File "${args.fileName}" uploaded`,
      userId: user._id,
    });

    return fileId;
  },
});

export const remove = mutation({
  args: { fileId: v.id("jobFiles"), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const file = await ctx.db.get(args.fileId);
    if (!file || file.orgId !== args.orgId) {
      throw new Error("File not found");
    }
    await ctx.storage.delete(file.storageId);
    await ctx.db.delete(args.fileId);

    await recordJobActivity(ctx, {
      orgId: args.orgId,
      jobId: file.jobId,
      eventType: "file_removed",
      description: `File "${file.fileName}" removed`,
      userId: user._id,
    });
  },
});
