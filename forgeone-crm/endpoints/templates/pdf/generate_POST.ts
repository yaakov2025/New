import { db } from "../../../helpers/db";
import { getOrgContext } from "../../../helpers/getOrgContext";
import { schema, OutputType } from "./generate_POST.schema";
import superjson from "superjson";
import { templateTagResolver } from "../../../helpers/templateTagResolver";
import { templatePdfGenerator } from "../../../helpers/templatePdfGenerator";
import { TemplateBlock, TemplateSettings, DEFAULT_TEMPLATE_SETTINGS } from "../../../helpers/templateBlockTypes";
import { upload } from "@floot/storage";

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request);
    const input = schema.parse(superjson.parse(await request.text()));

    const template = await db.selectFrom("documentTemplates")
      .select(["id", "name", "blocks", "settings", "orgId", "isFoundation"])
      .where("id", "=", input.templateId)
      .executeTakeFirst();

    if (!template) throw new Error("Template not found");
    if (template.orgId !== orgId && !template.isFoundation) throw new Error("Unauthorized");

    const org = await db.selectFrom("organizations")
      .select(["logoUrl"])
      .where("id", "=", orgId)
      .executeTakeFirst();

    const blocks = (template.blocks || []) as unknown as TemplateBlock[];
    const settings = (template.settings as unknown as TemplateSettings) || DEFAULT_TEMPLATE_SETTINGS;

    const { resolvedBlocks } = await templateTagResolver(blocks, {
      orgId,
      useSampleData: input.useSampleData,
      customerId: input.customerId,
      jobId: input.jobId,
      contactId: input.contactId,
      propertyId: input.propertyId,
      leadId: input.leadId,
      opportunityId: input.opportunityId,
      currentUserId: user.id
    });

            const pdfBuffer = await templatePdfGenerator(resolvedBlocks, settings, org?.logoUrl || undefined);
    
    const fileName = `documents/org-${orgId}/template-${template.id}-${Date.now()}.pdf`;

    const uploadRes = await upload({
      visibility: "private",
      filename: fileName,
      contentType: "application/pdf",
      sizeBytes: pdfBuffer.length
    });

    if (!uploadRes.ok) {
      throw new Error(uploadRes.error.message);
    }

    const putRes = await fetch(uploadRes.presignedUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/pdf" },
      body: pdfBuffer
    });

    if (!putRes.ok) {
      throw new Error("Failed to upload PDF to storage");
    }

    return new Response(superjson.stringify({ url: uploadRes.url, fileName: `${template.name}.pdf` } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}