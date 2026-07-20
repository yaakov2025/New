import { db } from "../../../helpers/db";
import { verifyReviewLink } from "../../../helpers/documentReviewToken";
import { schema } from "./decline_POST.schema";

export async function handle(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const { token, name, email, reason } = input;

    const verification = await verifyReviewLink(token);
    if (!verification) return new Response(JSON.stringify({ error: "Document not found or link expired" }), { status: 404, headers: { "Content-Type": "application/json" } });

    const { document } = verification;
    if (document.status !== "sent" && document.status !== "viewed") return new Response(JSON.stringify({ error: "Document is not in a valid state" }), { status: 400, headers: { "Content-Type": "application/json" } });

    await db.transaction().execute(async (trx) => {
      const maxVersion = await trx.selectFrom("documentVersionSnapshots")
        .select(trx.fn.max("versionNumber").as("maxVer"))
        .where("documentId", "=", document.id)
        .executeTakeFirst();
      const nextVersion = ((maxVersion?.maxVer as number) || 0) + 1;

      await trx.updateTable("jobDocuments").set({
        versionNumber: nextVersion,
        status: "declined",
        declinedAt: new Date(),
        declinedByName: name,
        declinedByEmail: email,
        declineReason: reason || null,
      }).where("id", "=", document.id).execute();

      const lineItems = await trx.selectFrom("documentLineItems").selectAll().where("documentId", "=", document.id).orderBy("sortOrder", "asc").execute();

      await trx.insertInto("documentVersionSnapshots").values({
        documentId: document.id,
        versionNumber: nextVersion,
        blocksSnapshot: document.blocksSnapshot,
        dataSnapshot: document.dataSnapshot,
        settingsSnapshot: document.settingsSnapshot,
        lineItemsSnapshot: lineItems,
        status: "declined",
        subtotal: document.subtotal,
        tax: document.tax,
        discount: document.discount,
        total: document.total,
        notes: document.notes,
        pdfStorageKey: document.pdfStorageKey,
        createdBy: document.createdBy,
      }).execute();

      if (document.jobId) {
        await trx.insertInto("jobActivityEvents").values({
          orgId: document.orgId,
          jobId: document.jobId,
          eventType: "document_declined",
          description: `Document ${document.documentNumber} declined by ${name}`,
        }).execute();
      }
    });

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Public decline POST error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
}