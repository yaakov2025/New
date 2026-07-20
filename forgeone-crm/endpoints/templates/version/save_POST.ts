import { db } from "../../../helpers/db";
import { getOrgContext } from "../../../helpers/getOrgContext";
import { schema, OutputType } from "./save_POST.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request, { requireOrgRole: ["admin", "manager"] });
    const { templateId, name, notes } = schema.parse(superjson.parse(await request.text()));

    let version;
    await db.transaction().execute(async (trx) => {
      const template = await trx.selectFrom("documentTemplates")
        .select(["orgId", "blocks", "settings"])
        .where("id", "=", templateId)
        .executeTakeFirst();
        
      if (!template || template.orgId !== orgId) {
        throw new Error("Unauthorized");
      }

      const versionData = await trx.selectFrom("templateVersions")
        .select(trx.fn.max("versionNumber").as("maxVersion"))
        .where("templateId", "=", templateId)
        .executeTakeFirst();
        
      const nextVersion = versionData?.maxVersion ? Number(versionData.maxVersion) + 1 : 1;

      version = await trx.insertInto("templateVersions")
        .values({
          templateId,
          versionNumber: nextVersion,
          name,
          notes: notes || null,
          blocks: template.blocks,
          settings: template.settings,
          createdBy: user.id
        })
        .returning(["id", "versionNumber", "name", "createdAt"])
        .executeTakeFirstOrThrow();
    });

    return new Response(superjson.stringify({ version: version! } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}