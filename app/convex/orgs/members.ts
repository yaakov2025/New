import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthenticatedUser, getOrgMembership } from "../lib/permissions.ts";

// List active members of an org (for assignment dropdowns)
export const listMembers = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);

    const memberships = await ctx.db
      .query("userOrgMemberships")
      .withIndex("by_org_and_status", (q) =>
        q.eq("orgId", args.orgId).eq("status", "active"),
      )
      .collect();

    const members = await Promise.all(
      memberships.map(async (m) => {
        const u = await ctx.db.get(m.userId);
        return { _id: m.userId, name: u?.name ?? "Unknown", email: u?.email, role: m.role };
      }),
    );
    return members;
  },
});
