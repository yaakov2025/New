import { db } from "../../../helpers/db";
import { getOrgContext } from "../../../helpers/getOrgContext";
import { schema, OutputType } from "./generate_POST.schema";
import superjson from "superjson";
import { upload } from "@floot/storage";
import { templatePdfGenerator } from "../../../helpers/templatePdfGenerator";
import { ResolvedBlock, TemplateSettings } from "../../../helpers/templateBlockTypes";
import { resolveDocumentBlocksForPdf } from "../../../helpers/documentBlockResolver";

export async function handle(request: Request) {
  try {
    const { orgId } = await getOrgContext(request);
    const input = schema.parse(superjson.parse(await request.text()));

    const document = await db.selectFrom("jobDocuments")
      .selectAll()
      .where("id", "=", input.documentId)
      .where("orgId", "=", orgId)
      .executeTakeFirst();

    if (!document) throw new Error("Document not found");

    const lineItems = await db.selectFrom("documentLineItems")
      .selectAll()
      .where("documentId", "=", input.documentId)
      .orderBy("sortOrder", "asc")
      .execute();

    const org = await db.selectFrom("organizations")
      .select(["logoUrl"])
      .where("id", "=", orgId)
      .executeTakeFirst();

    const blocks = (document.blocksSnapshot as unknown as ResolvedBlock[]) || [];
    const settings = (document.settingsSnapshot as unknown as TemplateSettings);

    const updatedBlocks = await resolveDocumentBlocksForPdf(blocks, document, lineItems);

    const pdfBuffer = await templatePdfGenerator(updatedBlocks, settings, org?.logoUrl || undefined);
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

    if (!putRes.ok) throw new Error("Failed to upload PDF to storage");

    await db.updateTable("jobDocuments")
      .set({ pdfStorageKey: fileName })
      .where("id", "=", document.id)
      .execute();

    return new Response(
      superjson.stringify({ url: uploadRes.url, fileName: `${document.documentNumber}.pdf` } satisfies OutputType)
    );
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}