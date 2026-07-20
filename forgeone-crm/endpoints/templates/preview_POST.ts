import { db } from "../../helpers/db";
import { getOrgContext } from "../../helpers/getOrgContext";
import { schema, OutputType } from "./preview_POST.schema";
import superjson from "superjson";
import { templateTagResolver } from "../../helpers/templateTagResolver";
import { TemplateBlock } from "../../helpers/templateBlockTypes";

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request);
    const input = schema.parse(superjson.parse(await request.text()));

    const template = await db.selectFrom("documentTemplates")
      .select(["blocks", "orgId", "isFoundation"])
      .where("id", "=", input.templateId)
      .executeTakeFirst();

    if (!template) throw new Error("Template not found");
    if (template.orgId !== orgId && !template.isFoundation) throw new Error("Unauthorized");

    const blocks = (template.blocks || []) as unknown as TemplateBlock[];

    const { resolvedBlocks, tagValues, warnings } = await templateTagResolver(blocks, {
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

    return new Response(superjson.stringify({ resolvedBlocks, tagValues, warnings } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}