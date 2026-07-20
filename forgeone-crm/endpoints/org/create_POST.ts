import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { schema, OutputType } from "./create_POST.schema";
import superjson from "superjson";
import { nanoid } from "nanoid";

export async function handle(request: Request) {
  try {
    const { user, session } = await getServerUserSession(request);
    const json = superjson.parse(await request.text());
    const input = schema.parse(json);

    const slug = `${input.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${nanoid(6)}`;

    const result = await db.transaction().execute(async (trx) => {
      const org = await trx
        .insertInto("organizations")
        .values({
          name: input.name,
          slug,
          email: input.email || null,
          phone: input.phone || null,
          address: input.address || null,
          website: input.website || null,
          createdBy: user.id,
        })
        .returning("id")
        .executeTakeFirstOrThrow();

      await trx.insertInto("orgSettings").values({ orgId: org.id }).execute();

      await trx.insertInto("orgMemberships").values({
        orgId: org.id,
        userId: user.id,
        role: "admin",
      }).execute();

      await trx.updateTable("users").set({ lastOrgId: org.id }).where("id", "=", user.id).execute();
      await trx.updateTable("sessions").set({ currentOrgId: org.id }).where("id", "=", session.id).execute();

      const leadStages = ["New", "Contacted", "Qualified", "Lost"];
      await trx.insertInto("pipelineStages").values(
        leadStages.map((name, i) => ({ orgId: org.id, name, pipelineType: "lead" as const, sortOrder: i }))
      ).execute();

      const oppStages = ["Discovery", "Proposal", "Negotiation", "Won", "Lost"];
      await trx.insertInto("pipelineStages").values(
        oppStages.map((name, i) => ({ orgId: org.id, name, pipelineType: "opportunity" as const, sortOrder: i }))
      ).execute();

      const statuses = [
        { name: "New", category: "planned" as const, color: "#e2e8f0", sortOrder: 0 },
        { name: "Scheduled", category: "planned" as const, color: "#fef08a", sortOrder: 1 },
        { name: "In Progress", category: "active" as const, color: "#60a5fa", sortOrder: 2 },
        { name: "On Hold", category: "on_hold" as const, color: "#f87171", sortOrder: 3 },
        { name: "Completed", category: "completed" as const, color: "#4ade80", sortOrder: 4 },
        { name: "Canceled", category: "canceled" as const, color: "#9ca3af", sortOrder: 5 },
      ];
      await trx.insertInto("jobStatuses").values(
        statuses.map(s => ({ ...s, orgId: org.id }))
      ).execute();

      return org.id;
    });

    return new Response(superjson.stringify({ success: true, orgId: result } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}