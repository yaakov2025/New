import { db } from "../../../helpers/db";
import { verifyReviewLink } from "../../../helpers/documentReviewToken";
import { schema } from "./approve_POST.schema";

export async function handle(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const { token, approverName, approverEmail, comment } = input;

    const verification = await verifyReviewLink(token);
    if (!verification) return new Response(JSON.stringify({ error: "Document not found or link expired" }), { status: 404, headers: { "Content-Type": "application/json" } });

    const { document } = verification;
    if (document.documentType !== "estimate") return new Response(JSON.stringify({ error: "Only estimates can be approved" }), { status: 400, headers: { "Content-Type": "application/json" } });
    if (document.status !== "sent" && document.status !== "viewed") return new Response(JSON.stringify({ error: "Document is not in a valid state for approval" }), { status: 400, headers: { "Content-Type": "application/json" } });

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;

    await db.transaction().execute(async (trx) => {
      const maxVersion = await trx.selectFrom("documentVersionSnapshots")
        .select(trx.fn.max("versionNumber").as("maxVer"))
        .where("documentId", "=", document.id)
        .executeTakeFirst();
      const nextVersion = ((maxVersion?.maxVer as number) || 0) + 1;

      await trx.updateTable("jobDocuments").set({
        versionNumber: nextVersion,
        status: "approved",
        approvedAt: new Date(),
        approverName,
        approverEmail,
        approvalIp: ipAddress,
        approvalComment: comment || null,
      }).where("id", "=", document.id).execute();

      const lineItems = await trx.selectFrom("documentLineItems").selectAll().where("documentId", "=", document.id).orderBy("sortOrder", "asc").execute();

      await trx.insertInto("documentVersionSnapshots").values({
        documentId: document.id,
        versionNumber: nextVersion,
        blocksSnapshot: document.blocksSnapshot,
        dataSnapshot: document.dataSnapshot,
        settingsSnapshot: document.settingsSnapshot,
        lineItemsSnapshot: lineItems,
        status: "approved",
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
          eventType: "document_approved",
          description: `Estimate ${document.documentNumber} approved by ${approverName}`,
        }).execute();
      }
    });

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Public approve POST error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
}