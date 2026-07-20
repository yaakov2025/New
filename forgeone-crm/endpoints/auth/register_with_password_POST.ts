// adapt this to the database schema and helpers if necessary
import { db } from "../../helpers/db";
import { schema } from "./register_with_password_POST.schema";
import { randomBytes } from "crypto";
import {
  setServerSession,
  SessionExpirationSeconds,
} from "../../helpers/getSetServerSession";
import { generatePasswordHash } from "../../helpers/generatePasswordHash";
import { User } from "../../helpers/User";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const json = superjson.parse(await request.text());
    const { email, password, displayName, token } = schema.parse(json);

    // 1. Validate the invitation token
    const invitation = await db
      .selectFrom("orgInvitations")
      .select([
        "id",
        "orgId",
        "role",
        "status",
        "expiresAt",
      ])
      .where("token", "=", token)
      .where("email", "=", email.toLowerCase())
      .limit(1)
      .executeTakeFirst();

    if (!invitation) {
      return new Response(
        superjson.stringify({ message: "Invalid or expired invitation" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (invitation.status !== "pending" || invitation.expiresAt < new Date()) {
      return new Response(
        superjson.stringify({ message: "Invalid or expired invitation" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Check if email already exists
    const existingUser = await db
      .selectFrom("users")
      .select("id")
      .where("email", "=", email)
      .limit(1)
      .execute();

    if (existingUser.length > 0) {
      return new Response(
        superjson.stringify({ message: "email already in use" }),
        {
          status: 409,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const passwordHash = await generatePasswordHash(password);

    // Create new user and org membership in a transaction
    const newUser = await db.transaction().execute(async (trx) => {
      // Insert the user
      const [user] = await trx
        .insertInto("users")
        .values({
          email,
          displayName,
          role: "user", // Default platform role
          lastOrgId: invitation.orgId,
        })
        .returning(["id", "email", "displayName", "createdAt", "role"])
        .execute();

      // Store the password hash in another table
      await trx
        .insertInto("userPasswords")
        .values({
          userId: user.id,
          passwordHash,
        })
        .execute();

      // Create org membership
      await trx
        .insertInto("orgMemberships")
        .values({
          userId: user.id,
          orgId: invitation.orgId,
          role: invitation.role,
        })
        .execute();

      // Update the invitation status to "accepted"
      await trx
        .updateTable("orgInvitations")
        .set({ status: "accepted" })
        .where("id", "=", invitation.id)
        .execute();

      return user;
    });

    // Get the org context for the response
    const orgContext = await db
      .selectFrom("orgMemberships")
      .innerJoin("organizations", "orgMemberships.orgId", "organizations.id")
      .select(["orgMemberships.role", "organizations.name"])
      .where("orgMemberships.userId", "=", newUser.id)
      .where("orgMemberships.orgId", "=", invitation.orgId)
      .limit(1)
      .executeTakeFirst();

    // Create a new session
    const sessionId = randomBytes(32).toString("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SessionExpirationSeconds * 1000);

    await db
      .insertInto("sessions")
      .values({
        id: sessionId,
        userId: newUser.id,
        createdAt: now,
        lastAccessed: now,
        expiresAt,
        currentOrgId: invitation.orgId,
      })
      .execute();

    const userData: User = {
      id: newUser.id,
      email: newUser.email,
      displayName: newUser.displayName,
      avatarUrl: null,
      role: newUser.role,
      currentOrgId: invitation.orgId,
      currentOrgRole: orgContext?.role ?? null,
      currentOrgName: orgContext?.name ?? null,
    };

    // Create response with user data
    const response = new Response(
      superjson.stringify({
        user: userData satisfies User,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // Set session cookie
    await setServerSession(response, {
      id: sessionId,
      createdAt: now.getTime(),
      lastAccessed: now.getTime(),
    });

    return response;
  } catch (error: unknown) {
    console.error("Registration error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Registration failed";
    return new Response(
      superjson.stringify({ message: errorMessage }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}