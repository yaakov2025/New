import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthenticatedUser, getOrgMembership, requireRole } from "../lib/permissions.ts";
import { writeAuditLog } from "../lib/audit.ts";
import { nanoid } from "nanoid";

// Get all memberships for an org (admin only)
export const listByOrg = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const membership = await getOrgMembership(ctx, user._id, args.orgId);
    requireRole(membership.role, "admin");
    const memberships = await ctx.db
      .query("userOrgMemberships")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    // Fetch user details for each membership
    return await Promise.all(
      memberships.map(async (m) => {
        const u = await ctx.db.get(m.userId);
        return { ...m, userName: u?.name, userEmail: u?.email };
      }),
    );
  },
});

// Get all orgs the current user belongs to
export const listMyOrgs = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const memberships = await ctx.db
      .query("userOrgMemberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const activeMemberships = memberships.filter((m) => m.status === "active");
    return await Promise.all(
      activeMemberships.map(async (m) => {
        const org = await ctx.db.get(m.orgId);
        return { ...m, org };
      }),
    );
  },
});

// List active members of an org (available to any member).
// Used for assignment / "assign to" dropdowns across the app.
export const listActiveMembers = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    const memberships = await ctx.db
      .query("userOrgMemberships")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    const active = memberships.filter((m) => m.status === "active");
    return await Promise.all(
      active.map(async (m) => {
        const u = await ctx.db.get(m.userId);
        return {
          membershipId: m._id,
          userId: m.userId,
          role: m.role,
          userName: u?.name ?? null,
          userEmail: u?.email ?? null,
          userAvatarUrl: u?.avatarUrl ?? null,
        };
      }),
    );
  },
});

// Get active membership for current user in a specific org
export const getMyMembership = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    return await ctx.db
      .query("userOrgMemberships")
      .withIndex("by_org_and_user", (q) =>
        q.eq("orgId", args.orgId).eq("userId", user._id),
      )
      .unique();
  },
});

// Invite a user by email (creates a pending invitation)
export const invite = mutation({
  args: {
    orgId: v.id("organizations"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("sales")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const membership = await getOrgMembership(ctx, user._id, args.orgId);
    requireRole(membership.role, "admin");
    // Check for existing active membership by email
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .unique();
    if (existingUser) {
      const existingMembership = await ctx.db
        .query("userOrgMemberships")
        .withIndex("by_org_and_user", (q) =>
          q.eq("orgId", args.orgId).eq("userId", existingUser._id),
        )
        .unique();
      if (existingMembership?.status === "active") {
        throw new ConvexError({ code: "CONFLICT", message: "This person is already a member of this organization" });
      }
    }
    // Check for existing pending invitation
    const existingInvite = await ctx.db
      .query("orgInvitations")
      .withIndex("by_org_and_status", (q) =>
        q.eq("orgId", args.orgId).eq("status", "pending"),
      )
      .filter((q) => q.eq(q.field("email"), args.email))
      .unique();
    if (existingInvite) {
      throw new ConvexError({ code: "CONFLICT", message: "An invitation has already been sent to this email" });
    }
    const token = nanoid(32);
    const invitationId = await ctx.db.insert("orgInvitations", {
      orgId: args.orgId,
      email: args.email.toLowerCase(),
      role: args.role,
      token,
      invitedBy: user._id,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      status: "pending",
    });
    await writeAuditLog(ctx, {
      orgId: args.orgId,
      userId: user._id,
      action: "USER_INVITED",
      recordType: "orgInvitations",
      recordId: invitationId,
      metadata: { email: args.email, role: args.role },
    });
    return { invitationId, token };
  },
});

// Accept an invitation (called after sign-in)
export const acceptInvitation = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const invitation = await ctx.db
      .query("orgInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!invitation) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Invitation not found" });
    }
    if (invitation.status !== "pending") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "This invitation is no longer valid" });
    }
    if (invitation.expiresAt < Date.now()) {
      await ctx.db.patch(invitation._id, { status: "expired" });
      throw new ConvexError({ code: "BAD_REQUEST", message: "This invitation has expired" });
    }
    // Create membership
    await ctx.db.insert("userOrgMemberships", {
      orgId: invitation.orgId,
      userId: user._id,
      role: invitation.role,
      status: "active",
      invitedBy: invitation.invitedBy,
      joinedAt: Date.now(),
    });
    // Mark invitation accepted
    await ctx.db.patch(invitation._id, {
      status: "accepted",
      acceptedAt: Date.now(),
      acceptedBy: user._id,
    });
    await writeAuditLog(ctx, {
      orgId: invitation.orgId,
      userId: user._id,
      action: "INVITATION_ACCEPTED",
      recordType: "orgInvitations",
      recordId: invitation._id,
    });
    return invitation.orgId;
  },
});

// List pending invitations for an org
export const listInvitations = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const membership = await getOrgMembership(ctx, user._id, args.orgId);
    requireRole(membership.role, "admin");
    return await ctx.db
      .query("orgInvitations")
      .withIndex("by_org_and_status", (q) =>
        q.eq("orgId", args.orgId).eq("status", "pending"),
      )
      .collect();
  },
});

// Revoke an invitation
export const revokeInvitation = mutation({
  args: { invitationId: v.id("orgInvitations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Invitation not found" });
    }
    const membership = await getOrgMembership(ctx, user._id, invitation.orgId);
    requireRole(membership.role, "admin");
    await ctx.db.patch(invitation._id, {
      status: "revoked",
      revokedAt: Date.now(),
      revokedBy: user._id,
    });
    await writeAuditLog(ctx, {
      orgId: invitation.orgId,
      userId: user._id,
      action: "INVITATION_REVOKED",
      recordType: "orgInvitations",
      recordId: invitation._id,
    });
  },
});

// Deactivate a member
export const deactivateMember = mutation({
  args: { membershipId: v.id("userOrgMemberships") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const target = await ctx.db.get(args.membershipId);
    if (!target) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Membership not found" });
    }
    const membership = await getOrgMembership(ctx, user._id, target.orgId);
    requireRole(membership.role, "admin");
    if (target.userId === user._id) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "You cannot deactivate your own membership" });
    }
    await ctx.db.patch(target._id, {
      status: "deactivated",
      deactivatedAt: Date.now(),
      deactivatedBy: user._id,
    });
    await writeAuditLog(ctx, {
      orgId: target.orgId,
      userId: user._id,
      action: "MEMBER_DEACTIVATED",
      recordType: "userOrgMemberships",
      recordId: target._id,
    });
  },
});

// Update a member's role
export const updateRole = mutation({
  args: {
    membershipId: v.id("userOrgMemberships"),
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("sales")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const target = await ctx.db.get(args.membershipId);
    if (!target) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Membership not found" });
    }
    const membership = await getOrgMembership(ctx, user._id, target.orgId);
    requireRole(membership.role, "admin");
    await ctx.db.patch(target._id, { role: args.role });
    await writeAuditLog(ctx, {
      orgId: target.orgId,
      userId: user._id,
      action: "MEMBER_ROLE_UPDATED",
      recordType: "userOrgMemberships",
      recordId: target._id,
      newValue: args.role,
    });
  },
});
