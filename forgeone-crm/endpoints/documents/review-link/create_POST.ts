import { db } from "../../../helpers/db";
import { getOrgContext } from "../../../helpers/getOrgContext";
import { schema, OutputType } from "./create_POST.schema";
import superjson from "superjson";
import { generateReviewToken, hashToken, buildReviewUrl } from "../../../helpers/documentReviewToken";

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request, { requireOrgRole: ["admin", "manager"] });
    const input = schema.parse(superjson.parse(await request.text()));

    const document = await db.selectFrom("jobDocuments")
      .select(["id", "pdfStorageKey", "versionNumber"])
      .where("id", "=", input.documentId)
      .where("orgId", "=", orgId)
      .executeTakeFirst();

    if (!document) throw new Error("Document not found");
    if (!document.pdfStorageKey) throw new Error("Document PDF has not been generated yet. Please generate or send it first.");

    const token = generateReviewToken();
    const tokenHash = await hashToken(token);
    const expiresAt = input.expiresInDays 
      ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000) 
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insertInto("documentReviewLinks").values({
      orgId,
      documentId: document.id,
      versionNumber: document.versionNumber,
      tokenHash,
      expiresAt,
      allowPdfDownload: input.allowPdfDownload ?? true,
      createdBy: user.id
    }).execute();

    return new Response(superjson.stringify({
      token,
      url: buildReviewUrl(token),
      expiresAt
    } satisfies OutputType));
  } catch (error: any) {
    console.error("Create review link error:", error);
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}