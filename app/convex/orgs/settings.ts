import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthenticatedUser, getOrgMembership, requireRole } from "../lib/permissions.ts";

// Get settings for an org
export const get = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    return await ctx.db
      .query("orgSettings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .unique();
  },
});

// Update visibility policy (admin only)
export const updateVisibilityPolicy = mutation({
  args: {
    orgId: v.id("organizations"),
    policy: v.union(
      v.literal("own_and_assigned"),
      v.literal("team"),
      v.literal("all_org"),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const membership = await getOrgMembership(ctx, user._id, args.orgId);
    requireRole(membership.role, "admin");
    const settings = await ctx.db
      .query("orgSettings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .unique();
    if (settings) {
      await ctx.db.patch(settings._id, { recordVisibilityPolicy: args.policy });
    } else {
      await ctx.db.insert("orgSettings", {
        orgId: args.orgId,
        recordVisibilityPolicy: args.policy,
      });
    }
  },
});

// Get all feature flags for an org
export const getFeatureFlags = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const flags = await ctx.db
      .query("featureFlags")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    // Return as a keyed object for easy consumption
    const result: Record<string, boolean> = {};
    for (const flag of flags) {
      result[flag.flagName] = flag.enabled;
    }
    return result;
  },
});

// Toggle a feature flag (admin only)
export const toggleFeatureFlag = mutation({
  args: {
    orgId: v.id("organizations"),
    flagName: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const membership = await getOrgMembership(ctx, user._id, args.orgId);
    requireRole(membership.role, "admin");
    const flag = await ctx.db
      .query("featureFlags")
      .withIndex("by_org_and_flag", (q) =>
        q.eq("orgId", args.orgId).eq("flagName", args.flagName),
      )
      .unique();
    if (flag) {
      await ctx.db.patch(flag._id, { enabled: args.enabled });
    } else {
      await ctx.db.insert("featureFlags", {
        orgId: args.orgId,
        flagName: args.flagName,
        enabled: args.enabled,
      });
    }
  },
});
