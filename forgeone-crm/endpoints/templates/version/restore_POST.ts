import { db } from "../../../helpers/db";
import { getOrgContext } from "../../../helpers/getOrgContext";
import { schema, OutputType } from "./restore_POST.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId } = await getOrgContext(request, { requireOrgRole: ["admin"] });
    const { templateId, versionId } = schema.parse(superjson.parse(await request.text()));

    let updatedTemplate;
    await db.transaction().execute(async (trx) => {
      const template = await trx.selectFrom("documentTemplates")
        .select(["orgId"])
        .where("id", "=", templateId)
        .executeTakeFirst();
        
      if (!template || template.orgId !== orgId) throw new Error("Unauthorized template");

      const version = await trx.selectFrom("templateVersions")
        .select(["blocks", "settings", "templateId"])
        .where("id", "=", versionId)
        .executeTakeFirst();
        
      if (!version || version.templateId !== templateId) throw new Error("Invalid version");

      updatedTemplate = await trx.updateTable("documentTemplates")
        .set({
          blocks: version.blocks,
          settings: version.settings,
          updatedAt: new Date()
        })
        .where("id", "=", templateId)
        .returning(["id", "blocks", "settings", "updatedAt"])
        .executeTakeFirstOrThrow();
    });

    return new Response(superjson.stringify({ template: updatedTemplate! } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}