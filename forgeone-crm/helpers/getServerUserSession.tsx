import { db } from "./db";
import { User } from "./User";

import {
  CleanupProbability,
  getServerSessionOrThrow,
  NotAuthenticatedError,
  SessionExpirationSeconds,
} from "./getSetServerSession";

export async function getServerUserSession(request: Request) {
  const session = await getServerSessionOrThrow(request);

  // Occasionally clean up expired sessions
  if (Math.random() < CleanupProbability) {
    const expirationDate = new Date(
      Date.now() - SessionExpirationSeconds * 1000
    );
    try {
      await db
        .deleteFrom("sessions")
        .where("lastAccessed", "<", expirationDate)
        .execute();
    } catch (cleanupError) {
      // Log but don't fail the request if cleanup fails
      console.error("Session cleanup error:", cleanupError);
    }
  }

  // Query the sessions and users tables in a single join query
  const results = await db
    .selectFrom("sessions")
    .innerJoin("users", "sessions.userId", "users.id")
    .select([
      "sessions.id as sessionId",
      "sessions.createdAt as sessionCreatedAt",
      "sessions.lastAccessed as sessionLastAccessed",
      "sessions.currentOrgId as sessionCurrentOrgId",
      "users.id",
      "users.email",
      "users.displayName",
      "users.role",
      "users.avatarUrl",
      "users.lastOrgId",
    ])
    .where("sessions.id", "=", session.id)
    .limit(1)
    .execute();

  if (results.length === 0) {
    throw new NotAuthenticatedError();
  }

  const result = results[0];

  // Determine the effective currentOrgId
  let currentOrgId: number | null = result.sessionCurrentOrgId ?? null;
  if (currentOrgId === null) {
    currentOrgId = result.lastOrgId ?? null;
  }
  if (currentOrgId === null) {
    const firstMembership = await db
      .selectFrom("orgMemberships")
      .select("orgId")
      .where("userId", "=", result.id)
      .limit(1)
      .executeTakeFirst();
    currentOrgId = firstMembership?.orgId ?? null;
  }

  let currentOrgRole: "admin" | "manager" | "sales" | null = null;
  let currentOrgName: string | null = null;

  if (currentOrgId !== null) {
    const orgContext = await db
      .selectFrom("orgMemberships")
      .innerJoin("organizations", "orgMemberships.orgId", "organizations.id")
      .select(["orgMemberships.role", "organizations.name"])
      .where("orgMemberships.userId", "=", result.id)
      .where("orgMemberships.orgId", "=", currentOrgId)
      .limit(1)
      .executeTakeFirst();

    if (orgContext) {
      currentOrgRole = orgContext.role;
      currentOrgName = orgContext.name;
    }
  }

  const user = {
    id: result.id,
    email: result.email,
    displayName: result.displayName,
    avatarUrl: result.avatarUrl,
    role: result.role,
    currentOrgId,
    currentOrgRole,
    currentOrgName,
  };

  // Update the session's lastAccessed timestamp
  const now = new Date();
  await db
    .updateTable("sessions")
    .set({ lastAccessed: now, currentOrgId: user.currentOrgId })
    .where("id", "=", session.id)
    .execute();

  return {
    user: user satisfies User,
    // make sure to update the session in cookie
    session: {
      ...session,
      lastAccessed: now,
    },
  };
}