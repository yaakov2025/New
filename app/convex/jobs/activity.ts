import { v } from "convex/values";
import { query } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { getAuthenticatedUser, getOrgMembership } from "../lib/permissions.ts";
import { getJobForOrg } from "../lib/jobActivity.ts";
import type { Doc } from "../_generated/dataModel";

// List activity events for a job, most recent first (paginated).
export const list = query({
  args: {
    jobId: v.id("jobs"),
    orgId: v.id("organizations"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await getOrgMembership(ctx, user._id, args.orgId);
    await getJobForOrg(ctx, args.jobId, args.orgId);

    const result = await ctx.db
      .query("jobActivityEvents")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .order("desc")
      .paginate(args.paginationOpts);

    const enriched = await Promise.all(
      result.page.map(async (event: Doc<"jobActivityEvents">) => {
        const actor = await ctx.db.get(event.userId);
        return {
          ...event,
          userName: actor?.name ?? null,
          userAvatarUrl: actor?.avatarUrl ?? null,
        };
      }),
    );
    return { ...result, page: enriched };
  },
});
