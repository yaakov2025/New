import { db } from "../../../helpers/db";
import { getOrgContext } from "../../../helpers/getOrgContext";
import { schema, OutputType } from "./list_GET.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId } = await getOrgContext(request);
    const url = new URL(request.url);
    const documentId = Number(url.searchParams.get("documentId"));
    if (!documentId) throw new Error("documentId is required");

    const document = await db.selectFrom("jobDocuments")
      .select("id")
      .where("id", "=", documentId)
      .where("orgId", "=", orgId)
      .executeTakeFirst();

    if (!document) throw new Error("Document not found");

    const links = await db.selectFrom("documentReviewLinks")
      .leftJoin("users", "documentReviewLinks.createdBy", "users.id")
      .selectAll("documentReviewLinks")
      .select("users.displayName as createdByName")
      .where("documentReviewLinks.documentId", "=", documentId)
      .where("documentReviewLinks.orgId", "=", orgId)
      .orderBy("documentReviewLinks.createdAt", "desc")
      .execute();

    const outputLinks = links.map(l => ({
      id: l.id,
      versionNumber: l.versionNumber,
      expiresAt: l.expiresAt,
      isRevoked: l.isRevoked,
      viewedAt: l.viewedAt,
      allowPdfDownload: l.allowPdfDownload,
      createdAt: l.createdAt,
      createdByName: l.createdByName
    }));

    return new Response(superjson.stringify({ links: outputLinks } satisfies OutputType));
  } catch (error: any) {
    console.error("List review links error:", error);
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}