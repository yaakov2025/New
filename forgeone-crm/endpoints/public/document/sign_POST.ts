import { db } from "../../../helpers/db";
import { verifyReviewLink } from "../../../helpers/documentReviewToken";
import { templatePdfGenerator } from "../../../helpers/templatePdfGenerator";
import { upload } from "@floot/storage";
import { ResolvedBlock, TemplateSettings } from "../../../helpers/templateBlockTypes";
import { schema } from "./sign_POST.schema";

export async function handle(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const { token, signerName, signerEmail, signatureData, signerRole = "customer" } = input;

    const verification = await verifyReviewLink(token);
    if (!verification) return new Response(JSON.stringify({ error: "Document not found or link expired" }), { status: 404, headers: { "Content-Type": "application/json" } });

    const { document } = verification;
    if (document.documentType !== "contract") return new Response(JSON.stringify({ error: "Only contracts can be signed" }), { status: 400, headers: { "Content-Type": "application/json" } });
    if (document.status !== "sent" && document.status !== "viewed") return new Response(JSON.stringify({ error: "Document is not in a valid state for signing" }), { status: 400, headers: { "Content-Type": "application/json" } });

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;

    const org = await db.selectFrom("organizations").select("logoUrl").where("id", "=", document.orgId).executeTakeFirst();

    const blocks = (document.blocksSnapshot as unknown as ResolvedBlock[]) || [];
    const settings = (document.settingsSnapshot as unknown as TemplateSettings);

    const updatedBlocks = [...blocks];
    const signatureIndex = updatedBlocks.findIndex(b => b.type === "signatureBlock");
    
    if (signatureIndex !== -1) {
      updatedBlocks.splice(signatureIndex + 1, 0, {
        id: `sig_img_${Date.now()}`,
        type: "image",
        label: "Signature Image",
        settings: {
          imageUrl: signatureData,
          width: 200,
          alignment: "left"
        }
      });
      updatedBlocks.splice(signatureIndex + 2, 0, {
        id: `sig_txt_${Date.now()}`,
        type: "text",
        label: "Signature Text",
        settings: { fontSize: 11, alignment: "left" },
        resolvedContent: `Signed by ${signerName} on ${new Intl.DateTimeFormat('en-US').format(new Date())}`
      });
    }

    const pdfBuffer = await templatePdfGenerator(updatedBlocks, settings, org?.logoUrl || undefined);
    const fileName = `documents/org-${document.orgId}/doc-${document.id}-signed-${Date.now()}.pdf`;

    const uploadRes = await upload({
      visibility: "private",
      filename: fileName,
      contentType: "application/pdf",
      sizeBytes: pdfBuffer.length
    });

    if (!uploadRes.ok) throw new Error(uploadRes.error.message);

    const putRes = await fetch(uploadRes.presignedUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/pdf" },
      body: pdfBuffer
    });

    if (!putRes.ok) throw new Error("Failed to upload signed PDF");

    await db.transaction().execute(async (trx) => {
      await trx.insertInto("documentSignatures").values({
        documentId: document.id,
        orgId: document.orgId,
        versionNumber: document.versionNumber,
        signerRole,
        signerName,
        signerEmail,
        signatureData,
        ipAddress,
      }).execute();

      const maxVersion = await trx.selectFrom("documentVersionSnapshots")
        .select(trx.fn.max("versionNumber").as("maxVer"))
        .where("documentId", "=", document.id)
        .executeTakeFirst();
      const nextVersion = ((maxVersion?.maxVer as number) || 0) + 1;

      await trx.updateTable("jobDocuments").set({
        versionNumber: nextVersion,
        status: "signed",
        signedAt: new Date(),
        isSigned: true,
        signedPdfStorageKey: fileName,
      }).where("id", "=", document.id).execute();

      const lineItems = await trx.selectFrom("documentLineItems").selectAll().where("documentId", "=", document.id).orderBy("sortOrder", "asc").execute();

      await trx.insertInto("documentVersionSnapshots").values({
        documentId: document.id,
        versionNumber: nextVersion,
        blocksSnapshot: document.blocksSnapshot,
        dataSnapshot: document.dataSnapshot,
        settingsSnapshot: document.settingsSnapshot,
        lineItemsSnapshot: lineItems,
        status: "signed",
        subtotal: document.subtotal,
        tax: document.tax,
        discount: document.discount,
        total: document.total,
        notes: document.notes,
        pdfStorageKey: fileName,
        createdBy: document.createdBy,
      }).execute();

      if (document.jobId) {
        await trx.insertInto("jobActivityEvents").values({
          orgId: document.orgId,
          jobId: document.jobId,
          eventType: "document_signed",
          description: `Contract ${document.documentNumber} signed by ${signerName}`,
        }).execute();
      }
    });

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Public sign POST error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
}