import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export type OrgRole = "admin" | "manager" | "sales";

// Resolves the authenticated user record. Throws if unauthenticated.
export async function getAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
  }
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) {
    throw new ConvexError({ code: "NOT_FOUND", message: "User record not found" });
  }
  return user;
}

// Checks if the user is a platform super admin.
export async function isPlatformAdmin(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<boolean> {
  const record = await ctx.db
    .query("platformAdmins")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  return record !== null;
}

// Resolves the user's active membership in an org. Throws if not a member or deactivated.
export async function getOrgMembership(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  orgId: Id<"organizations">,
) {
  const membership = await ctx.db
    .query("userOrgMemberships")
    .withIndex("by_org_and_user", (q) =>
      q.eq("orgId", orgId).eq("userId", userId),
    )
    .unique();
  if (!membership || membership.status !== "active") {
    throw new ConvexError({ code: "FORBIDDEN", message: "No active membership in this organization" });
  }
  return membership;
}

// Role hierarchy: admin > manager > sales
const ROLE_LEVEL: Record<OrgRole, number> = { admin: 3, manager: 2, sales: 1 };

export function requireRole(actual: OrgRole, minimum: OrgRole) {
  if (ROLE_LEVEL[actual] < ROLE_LEVEL[minimum]) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: `Requires role '${minimum}' or higher`,
    });
  }
}

// Validates an org exists, is active, and is not deleted.
export async function getActiveOrg(
  ctx: QueryCtx | MutationCtx,
  orgId: Id<"organizations">,
) {
  const org = await ctx.db.get(orgId);
  if (!org || org.isDeleted || org.status !== "active") {
    throw new ConvexError({ code: "NOT_FOUND", message: "Organization not found or inactive" });
  }
  return org;
}
