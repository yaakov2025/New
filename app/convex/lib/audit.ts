import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

type AuditParams = {
  orgId?: Id<"organizations">;
  userId?: Id<"users">;
  action: string;
  recordType?: string;
  recordId?: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  metadata?: Record<string, unknown>;
};

// Appends an immutable audit log entry. Never throws — audit must not block operations.
export async function writeAuditLog(ctx: MutationCtx, params: AuditParams) {
  await ctx.db.insert("auditLog", {
    orgId: params.orgId,
    userId: params.userId,
    action: params.action,
    recordType: params.recordType,
    recordId: params.recordId,
    fieldName: params.fieldName,
    oldValue: params.oldValue,
    newValue: params.newValue,
    metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
  });
}
