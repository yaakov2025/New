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

    const photos = await ctx.db
      .query("jobPhotos")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .order("desc")
      .collect();

    return await Promise.all(
      photos.map(async (p) => {
        const url = await ctx.storage.getUrl(p.storageId);
        const createdByUser = await ctx.db.get(p.createdBy);
        return { ...p, url, createdByUser };
      }),
    );
  },
});

export const create = mutation({
  args: {
    jobId: v.id("jobs"),
    orgId: v.id("organizations"),
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    await getJobForOrg(ctx, args.jobId, args.orgId);

    const photoId = await ctx.db.insert("jobPhotos", {
      orgId: args.orgId,
      jobId: args.jobId,
      storageId: args.storageId,
      caption: args.caption,
      category: args.category,
      createdBy: user._id,
    });

    await recordJobActivity(ctx, {
      orgId: args.orgId,
      jobId: args.jobId,
      eventType: "photo_added",
      description: "Photo uploaded",
      userId: user._id,
    });

    return photoId;
  },
});

export const update = mutation({
  args: {
    photoId: v.id("jobPhotos"),
    orgId: v.id("organizations"),
    caption: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const photo = await ctx.db.get(args.photoId);
    if (!photo || photo.orgId !== args.orgId) {
      throw new Error("Photo not found");
    }
    await ctx.db.patch(args.photoId, {
      caption: args.caption,
      category: args.category,
    });
  },
});

export const remove = mutation({
  args: { photoId: v.id("jobPhotos"), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const photo = await ctx.db.get(args.photoId);
    if (!photo || photo.orgId !== args.orgId) {
      throw new Error("Photo not found");
    }
    await ctx.storage.delete(photo.storageId);
    await ctx.db.delete(args.photoId);

    await recordJobActivity(ctx, {
      orgId: args.orgId,
      jobId: photo.jobId,
      eventType: "photo_removed",
      description: "Photo removed",
      userId: user._id,
    });
  },
});
