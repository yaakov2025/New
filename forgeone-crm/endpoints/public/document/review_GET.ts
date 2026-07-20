import { db } from "../../../helpers/db";
import { verifyReviewLink } from "../../../helpers/documentReviewToken";
import { getUrl } from "@floot/storage";

export async function handle(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    if (!token) return new Response(JSON.stringify({ error: "Token required" }), { status: 400, headers: { "Content-Type": "application/json" } });

    const verification = await verifyReviewLink(token);
    if (!verification) {
      return new Response(JSON.stringify({ error: "Document not found or link expired" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    const { link, document } = verification;

    if (!link.viewedAt) {
      await db.transaction().execute(async (trx) => {
        await trx.updateTable("documentReviewLinks").set({ viewedAt: new Date() }).where("id", "=", link.id).execute();
        
        if (document.status === "sent") {
          await trx.updateTable("jobDocuments").set({ status: "viewed", viewedAt: new Date() }).where("id", "=", document.id).execute();
          document.status = "viewed";
          document.viewedAt = new Date();
        }
        
        if (document.jobId) {
          await trx.insertInto("jobActivityEvents").values({
            orgId: document.orgId,
            jobId: document.jobId,
            eventType: "document_viewed",
            description: `Document ${document.documentNumber} viewed by customer`,
          }).execute();
        }
      });
    }

    const org = await db.selectFrom("organizations").selectAll().where("id", "=", document.orgId).executeTakeFirst();
    const customer = document.customerId ? await db.selectFrom("customers").selectAll().where("id", "=", document.customerId).executeTakeFirst() : null;
    const property = document.propertyId ? await db.selectFrom("properties").selectAll().where("id", "=", document.propertyId).executeTakeFirst() : null;
    const lineItems = await db.selectFrom("documentLineItems").selectAll().where("documentId", "=", document.id).orderBy("sortOrder", "asc").execute();

    const signatures = await db.selectFrom("documentSignatures")
      .select(["signerName", "signerEmail", "signerRole", "signatureData", "signedAt"])
      .where("documentId", "=", document.id)
      .execute();

    let pdfUrl = null;
    if (link.allowPdfDownload && document.pdfStorageKey) {
       const urlRes = await getUrl({ visibility: "private", filename: document.pdfStorageKey });
       if (urlRes.ok) {
          pdfUrl = urlRes.url;
       }
    }

    const signaturesResponse = signatures.map(sig => ({
      signerName: sig.signerName,
      signerEmail: sig.signerEmail,
      signerRole: sig.signerRole,
      signatureData: sig.signatureData,
      signedAt: sig.signedAt?.toISOString() || null,
    }));

    const responseData = {
      document: {
        id: document.id,
        documentNumber: document.documentNumber,
        documentType: document.documentType,
        status: document.status,
        versionNumber: document.versionNumber,
        blocksSnapshot: document.blocksSnapshot,
        settingsSnapshot: document.settingsSnapshot,
        subtotal: document.subtotal,
        tax: document.tax,
        discount: document.discount,
        total: document.total,
       notes: document.notes,
       sentAt: document.sentAt?.toISOString() || null,
       approvedAt: document.approvedAt?.toISOString() || null,
       approverName: document.approverName,
       approverEmail: document.approverEmail,
       approvalComment: document.approvalComment,
       declinedByName: document.declinedByName,
       declinedByEmail: document.declinedByEmail,
       declineReason: document.declineReason,
       declinedAt: document.declinedAt?.toISOString() || null,
        signedAt: document.signedAt?.toISOString() || null,
      },
      org: org ? {
        name: org.name,
        email: org.email,
        phone: org.phone,
        logoUrl: org.logoUrl,
        address: org.address,
        city: org.city,
        state: org.state,
        zip: org.zip,
      } : null,
      customer: customer ? {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      } : null,
      property: property ? {
        address: property.address,
        city: property.city,
        state: property.state,
        zip: property.zip,
      } : null,
      lineItems: lineItems.map(li => ({
        description: li.description,
        quantity: li.quantity,
        unit: li.unit,
        unitPrice: li.unitPrice,
        lineTotal: li.lineTotal,
        notes: li.notes,
      })),
       signatures: signaturesResponse,
       allowPdfDownload: link.allowPdfDownload,
              pdfUrl,
    };

    return new Response(JSON.stringify(responseData), { headers: { "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Public review link GET error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
}