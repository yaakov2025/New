import { db } from "../../helpers/db";
import { getOrgContext } from "../../helpers/getOrgContext";
import { schema, OutputType } from "./void_POST.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request, { requireOrgRole: ["admin"] });
    const input = schema.parse(superjson.parse(await request.text()));

    await db.transaction().execute(async (trx) => {
      const document = await trx.selectFrom("jobDocuments")
        .select(["status", "isSigned", "jobId", "documentNumber"])
        .where("id", "=", input.id)
        .where("orgId", "=", orgId)
        .executeTakeFirst();

      if (!document) throw new Error("Document not found");
      if (document.status === "voided") throw new Error("Document is already voided");
      if (document.isSigned) throw new Error("Cannot void a signed document");

      await trx.updateTable("jobDocuments")
        .set({
          status: "voided",
          voidedAt: new Date(),
          voidedBy: user.id,
          voidReason: input.reason || null,
        })
        .where("id", "=", input.id)
        .execute();

      if (document.jobId) {
        await trx.insertInto("jobActivityEvents").values({
          orgId,
          jobId: document.jobId,
          eventType: "document_voided",
          description: `Document ${document.documentNumber} voided`,
          userId: user.id,
        }).execute();
      }
    });

    return new Response(superjson.stringify({ success: true } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}