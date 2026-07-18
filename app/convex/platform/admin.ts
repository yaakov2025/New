import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthenticatedUser, isPlatformAdmin } from "../lib/permissions.ts";
import { writeAuditLog } from "../lib/audit.ts";

// Check if current user is platform admin
export const checkIsPlatformAdmin = query({
  args: {},
  handler: async (ctx): Promise<boolean> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return false;
    return isPlatformAdmin(ctx, user._id);
  },
});

// Get all orgs for platform admin
export const listAllOrgs = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const isAdmin = await isPlatformAdmin(ctx, user._id);
    if (!isAdmin) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Platform admin access required" });
    }
    return await ctx.db
      .query("organizations")
      .withIndex("by_is_deleted", (q) => q.eq("isDeleted", false))
      .collect();
  },
});

// Get all users for platform admin
export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const isAdmin = await isPlatformAdmin(ctx, user._id);
    if (!isAdmin) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Platform admin access required" });
    }
    return await ctx.db.query("users").collect();
  },
});

// Grant platform admin (existing platform admins only)
export const grantPlatformAdmin = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const actor = await getAuthenticatedUser(ctx);
    const isAdmin = await isPlatformAdmin(ctx, actor._id);
    if (!isAdmin) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Platform admin access required" });
    }
    const existing = await ctx.db
      .query("platformAdmins")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (existing) {
      throw new ConvexError({ code: "CONFLICT", message: "User is already a platform admin" });
    }
    await ctx.db.insert("platformAdmins", { userId: args.userId, grantedBy: actor._id });
    await writeAuditLog(ctx, {
      userId: actor._id,
      action: "PLATFORM_ADMIN_GRANTED",
      recordType: "users",
      recordId: args.userId,
    });
  },
});

// Get platform audit log for an org
export const getOrgAuditLog = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const isAdmin = await isPlatformAdmin(ctx, user._id);
    if (!isAdmin) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Platform admin access required" });
    }
    return await ctx.db
      .query("auditLog")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(200);
  },
});
