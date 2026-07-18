import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

type ActivityParams = {
  orgId: Id<"organizations">;
  jobId: Id<"jobs">;
  eventType: string;
  description: string;
  userId: Id<"users">;
  metadata?: Record<string, unknown>;
};

// Appends an immutable job activity event.
export async function recordJobActivity(ctx: MutationCtx, params: ActivityParams) {
  await ctx.db.insert("jobActivityEvents", {
    orgId: params.orgId,
    jobId: params.jobId,
    eventType: params.eventType,
    description: params.description,
    userId: params.userId,
    metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
  });
}

// Resolves a job that belongs to the org and is not deleted. Throws otherwise.
export async function getJobForOrg(
  ctx: QueryCtx | MutationCtx,
  jobId: Id<"jobs">,
  orgId: Id<"organizations">,
): Promise<Doc<"jobs">> {
  const job = await ctx.db.get(jobId);
  if (!job || job.orgId !== orgId || job.isDeleted) {
    throw new ConvexError({ code: "NOT_FOUND", message: "Job not found" });
  }
  return job;
}
