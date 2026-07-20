import { db } from "../../helpers/db";
import { getOrgContext } from "../../helpers/getOrgContext";
import { schema, OutputType } from "./create_POST.schema";
import superjson from "superjson";
import { templateTagResolver } from "../../helpers/templateTagResolver";

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request, { requireOrgRole: ["admin", "manager"] });
    const input = schema.parse(superjson.parse(await request.text()));

    const template = await db.selectFrom("documentTemplates")
      .selectAll()
      .where("id", "=", input.templateId)
      .executeTakeFirst();

    if (!template) throw new Error("Template not found");
    if (template.orgId !== orgId && !template.isFoundation) throw new Error("Unauthorized");

    const maxVersionRes = await db.selectFrom("templateVersions")
      .select(db.fn.max("versionNumber").as("maxVersion"))
      .where("templateId", "=", template.id)
      .executeTakeFirst();
    const templateVersionNumber = maxVersionRes?.maxVersion ? Number(maxVersionRes.maxVersion) : 1;

    const countRes = await db.selectFrom("jobDocuments")
      .select(db.fn.count("id").as("count"))
      .where("orgId", "=", orgId)
      .where("documentType", "=", template.documentType)
      .executeTakeFirst();
    
    const count = Number(countRes?.count || 0);

    const prefixes: Record<string, string> = {
      estimate: "EST",
      contract: "CON",
      work_order: "WO",
      change_order: "CO",
      certificate_of_completion: "COC",
    };
    const prefix = prefixes[template.documentType] || "DOC";
    const documentNumber = `${prefix}-${(count + 1).toString().padStart(4, "0")}`;

    let resolvedCustomerId = input.customerId;
    let resolvedPropertyId = input.propertyId;

    if (input.jobId) {
      const job = await db.selectFrom("jobs")
        .select(["customerId", "propertyId"])
        .where("id", "=", input.jobId)
        .where("orgId", "=", orgId)
        .executeTakeFirst();
      if (job) {
        if (!resolvedCustomerId) resolvedCustomerId = job.customerId;
        if (!resolvedPropertyId) resolvedPropertyId = job.propertyId;
      }
    }

    const { resolvedBlocks, tagValues } = await templateTagResolver(
      (template.blocks as any) || [],
      {
        orgId,
        jobId: input.jobId || undefined,
        customerId: resolvedCustomerId || undefined,
        propertyId: resolvedPropertyId || undefined,
        opportunityId: input.opportunityId || undefined,
        documentNumber,
        documentType: template.documentType,
        currentUserId: user.id,
        useSampleData: false,
      }
    );

    let createdDocumentId = 0;

    await db.transaction().execute(async (trx) => {
      const docRes = await trx.insertInto("jobDocuments").values({
        orgId,
        jobId: input.jobId || null,
        customerId: resolvedCustomerId || null,
        propertyId: resolvedPropertyId || null,
        opportunityId: input.opportunityId || null,
        templateId: template.id,
        templateVersionNumber,
        documentType: template.documentType,
        documentNumber,
        versionNumber: 1,
        status: "draft",
        blocksSnapshot: resolvedBlocks as any,
        dataSnapshot: tagValues as any,
        settingsSnapshot: (template.settings as any) || {},
        createdBy: user.id,
        isSigned: false,
      }).returning("id").executeTakeFirstOrThrow();

      createdDocumentId = docRes.id;

      const lineItemsBlock = resolvedBlocks.find(b => b.type === "estimateLineItems");
      const items = lineItemsBlock?.resolvedData?.items || [];
      
      if (items.length > 0) {
        const linesToInsert = items.map((item: any, index: number) => ({
          orgId,
          documentId: createdDocumentId,
          description: item.description || "",
          quantity: item.quantity ? Number(item.quantity) : 1,
          unit: item.unit || "",
          unitPrice: item.unitPrice ? Number(String(item.unitPrice).replace(/[^0-9.-]+/g, "")) : 0,
          lineTotal: item.total ? Number(String(item.total).replace(/[^0-9.-]+/g, "")) : 0,
          sortOrder: index,
        }));
        await trx.insertInto("documentLineItems").values(linesToInsert).execute();
      }

      if (input.jobId) {
        await trx.insertInto("jobActivityEvents").values({
          orgId,
          jobId: input.jobId,
          eventType: "document_created",
          description: `Document ${documentNumber} created`,
          userId: user.id,
        }).execute();
      }
    });

    return new Response(superjson.stringify({ success: true, id: createdDocumentId, documentNumber } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}