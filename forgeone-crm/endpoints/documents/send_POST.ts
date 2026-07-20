import { db } from "../../helpers/db";
import { getOrgContext } from "../../helpers/getOrgContext";
import { schema, OutputType } from "./send_POST.schema";
import superjson from "superjson";
import { sendEmail } from "@floot/email";
import { generateReviewToken, hashToken, buildReviewUrl } from "../../helpers/documentReviewToken";
import { templatePdfGenerator } from "../../helpers/templatePdfGenerator";
import { resolveDocumentBlocksForPdf } from "../../helpers/documentBlockResolver";
import { upload } from "@floot/storage";
import { ResolvedBlock, TemplateSettings } from "../../helpers/templateBlockTypes";

const formatCurrency = (val: string | number | null | undefined) => {
  const num = Number(val);
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
};

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request, { requireOrgRole: ["admin", "manager"] });
    const input = schema.parse(superjson.parse(await request.text()));

    const document = await db.selectFrom("jobDocuments")
      .selectAll()
      .where("id", "=", input.documentId)
      .where("orgId", "=", orgId)
      .executeTakeFirst();

    if (!document) throw new Error("Document not found");
    if (document.status === "voided") throw new Error("Cannot send a voided document");

    const lineItems = await db.selectFrom("documentLineItems")
      .selectAll()
      .where("documentId", "=", document.id)
      .orderBy("sortOrder", "asc")
      .execute();

    if (["estimate", "contract", "work_order", "change_order"].includes(document.documentType) && lineItems.length === 0) {
      throw new Error("Cannot send: document has no line items. Add line items and save before sending.");
    }

    const blocks = (document.blocksSnapshot as unknown as any[]) || [];
    const missingPattern = /\[Missing:\s*[^\]]+\]/g;
    const missingPlaceholders: string[] = [];
    for (const block of blocks) {
      if (block.resolvedContent) {
        const matches = block.resolvedContent.match(missingPattern);
        if (matches) missingPlaceholders.push(...matches);
      }
    }
    if (missingPlaceholders.length > 0) {
      const unique = [...new Set(missingPlaceholders)];
      throw new Error("Cannot send: document contains unresolved placeholders: " + unique.join(", ") + ". Please save the document first to resolve these fields, or remove unused template blocks.");
    }

    let pdfKey = document.pdfStorageKey;
    if (!pdfKey) {

      const orgData = await db.selectFrom("organizations").select("logoUrl").where("id", "=", orgId).executeTakeFirst();

      const settings = (document.settingsSnapshot as unknown as TemplateSettings);

      const updatedBlocks = await resolveDocumentBlocksForPdf(blocks, document, lineItems);

      const pdfBuffer = await templatePdfGenerator(updatedBlocks, settings, orgData?.logoUrl || undefined);
      const fileName = `documents/org-${orgId}/doc-${document.id}-v${document.versionNumber}-${Date.now()}.pdf`;

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

      if (!putRes.ok) throw new Error("Failed to upload auto-generated PDF to storage");

      await db.updateTable("jobDocuments").set({ pdfStorageKey: fileName }).where("id", "=", document.id).execute();
      pdfKey = fileName;
    }

    const org = await db.selectFrom("organizations").selectAll().where("id", "=", orgId).executeTakeFirstOrThrow();
    let customerName = "Customer";
    if (document.customerId) {
      const cust = await db.selectFrom("customers").select("name").where("id", "=", document.customerId).executeTakeFirst();
      if (cust) customerName = cust.name;
    }

    const token = generateReviewToken();
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insertInto("documentReviewLinks").values({
      orgId,
      documentId: document.id,
      versionNumber: document.versionNumber,
      tokenHash,
      expiresAt,
      allowPdfDownload: true,
      createdBy: user.id
    }).execute();

    const reviewUrl = buildReviewUrl(token);
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #eaeaea; border-radius: 8px;">
        ${org.logoUrl ? `<img src="${org.logoUrl}" alt="${org.name}" style="max-height: 50px; margin-bottom: 20px;" />` : `<h2 style="margin-top:0; color: #111;">${org.name}</h2>`}
        <p>Hello ${customerName},</p>
        <p>${input.message ? input.message.replace(/\n/g, '<br/>') : 'Please review the attached document.'}</p>
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin-top: 0; font-size: 16px;">Document Summary</h3>
          <p style="margin: 5px 0;"><strong>Number:</strong> ${document.documentNumber}</p>
          <p style="margin: 5px 0;"><strong>Type:</strong> ${document.documentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
          ${document.total ? `<p style="margin: 5px 0;"><strong>Total:</strong> ${formatCurrency(document.total)}</p>` : ''}
        </div>
        <a href="${reviewUrl}" style="display: inline-block; background-color: #0f172a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin-bottom: 20px;">
          View Document
        </a>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666; margin: 0;">
          ${org.name}<br/>
          ${org.phone || ''}<br/>
          ${org.email || ''}
        </p>
      </div>
    `;

    const subject = input.subject || `${document.documentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} ${document.documentNumber} from ${org.name}`;

    const sendRes = await sendEmail({
      from: "ForgeOne <noreply@mail.forgeone.agclaimsworks.com>",
      to: input.recipientEmail,
      subject,
      html: emailHtml,
    });

    if (!sendRes.ok) throw new Error("Failed to send email: " + sendRes.error.message);

    await db.transaction().execute(async (trx) => {
      const maxVersion = await trx.selectFrom("documentVersionSnapshots")
        .select(trx.fn.max("versionNumber").as("maxVer"))
        .where("documentId", "=", document.id)
        .executeTakeFirst();
      const nextVersion = ((maxVersion?.maxVer as number) || 0) + 1;

      let newStatus = document.status;
      let sentAt = document.sentAt;
      
      if (document.status === "draft" || document.status === "sent") {
        newStatus = "sent";
        sentAt = new Date();
      }

      await trx.updateTable("jobDocuments").set({ 
        versionNumber: nextVersion,
        ...(newStatus !== document.status ? { status: newStatus } : {}),
        ...(sentAt !== document.sentAt ? { sentAt } : {})
      }).where("id", "=", document.id).execute();

      // lineItems were fetched earlier before the PDF generation check

      await trx.insertInto("documentVersionSnapshots").values({
        documentId: document.id,
        versionNumber: nextVersion,
        blocksSnapshot: document.blocksSnapshot,
        dataSnapshot: document.dataSnapshot,
        settingsSnapshot: document.settingsSnapshot,
        lineItemsSnapshot: lineItems,
        status: newStatus,
        subtotal: document.subtotal,
        tax: document.tax,
        discount: document.discount,
        total: document.total,
        notes: document.notes,
        pdfStorageKey: pdfKey,
        createdBy: user.id,
      }).execute();

      await trx.insertInto("documentEmailLog").values({
        orgId,
        documentId: document.id,
        versionNumber: document.versionNumber,
        recipientEmail: input.recipientEmail,
        senderEmail: user.email,
        subject,
        message: input.message || null,
        emailMessageId: sendRes.messageId,
        sentBy: user.id,
      }).execute();

      if (document.jobId) {
        await trx.insertInto("jobActivityEvents").values({
          orgId,
          jobId: document.jobId,
          eventType: "document_sent",
          description: `Document ${document.documentNumber} sent to ${input.recipientEmail}`,
          userId: user.id,
        }).execute();
      }
    });

    return new Response(superjson.stringify({ success: true, messageId: sendRes.messageId, reviewUrl } satisfies OutputType));
  } catch (error: any) {
    console.error("Document send error:", error);
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}