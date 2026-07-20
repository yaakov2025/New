import { db } from "../../helpers/db";
import { getOrgContext } from "../../helpers/getOrgContext";
import { OutputType } from "./get_GET.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId } = await getOrgContext(request);
    const url = new URL(request.url);
    const id = Number(url.searchParams.get("id"));
    if (!id) throw new Error("Document ID is required");

    const document = await db.selectFrom("jobDocuments")
      .leftJoin("users", "jobDocuments.createdBy", "users.id")
      .leftJoin("documentTemplates", "jobDocuments.templateId", "documentTemplates.id")
      .leftJoin("customers", "jobDocuments.customerId", "customers.id")
      .leftJoin("properties", "jobDocuments.propertyId", "properties.id")
      .selectAll("jobDocuments")
      .select([
        "users.displayName as createdByName",
        "documentTemplates.name as templateName",
        "customers.name as customerName",
        "properties.address as propertyAddress"
      ])
      .where("jobDocuments.id", "=", id)
      .where("jobDocuments.orgId", "=", orgId)
      .executeTakeFirst();

    if (!document) throw new Error("Document not found");

    const lineItems = await db.selectFrom("documentLineItems")
      .selectAll()
      .where("documentId", "=", id)
      .where("orgId", "=", orgId)
      .orderBy("sortOrder", "asc")
      .execute();

    const reviewLinks = await db.selectFrom("documentReviewLinks")
      .leftJoin("users", "documentReviewLinks.createdBy", "users.id")
      .select([
        "documentReviewLinks.id",
        "documentReviewLinks.versionNumber",
        "documentReviewLinks.expiresAt",
        "documentReviewLinks.isRevoked",
        "documentReviewLinks.viewedAt",
        "documentReviewLinks.allowPdfDownload",
        "documentReviewLinks.createdAt",
        "documentReviewLinks.revokedAt",
        "users.displayName as createdByName"
      ])
      .where("documentReviewLinks.documentId", "=", id)
      .where("documentReviewLinks.orgId", "=", orgId)
      .orderBy("documentReviewLinks.createdAt", "desc")
      .execute();

    const emailLog = await db.selectFrom("documentEmailLog")
      .leftJoin("users", "documentEmailLog.sentBy", "users.id")
      .select([
        "documentEmailLog.id",
        "documentEmailLog.versionNumber",
        "documentEmailLog.recipientEmail",
        "documentEmailLog.subject",
        "documentEmailLog.sentAt",
        "documentEmailLog.emailMessageId",
        "users.displayName as sentByName"
      ])
      .where("documentEmailLog.documentId", "=", id)
      .where("documentEmailLog.orgId", "=", orgId)
      .orderBy("documentEmailLog.sentAt", "desc")
      .execute();

    const signatures = await db.selectFrom("documentSignatures")
      .select([
        "id",
        "versionNumber",
        "signerRole",
        "signerName",
        "signerEmail",
        "signedAt",
        "ipAddress"
      ])
      .where("documentId", "=", id)
      .where("orgId", "=", orgId)
      .orderBy("signedAt", "desc")
      .execute();

    return new Response(
      superjson.stringify({ document: { ...document, lineItems, reviewLinks, emailLog, signatures } } satisfies OutputType)
    );
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}