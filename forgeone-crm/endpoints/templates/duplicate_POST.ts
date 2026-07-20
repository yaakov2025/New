import { db } from "../../helpers/db";
import { getOrgContext } from "../../helpers/getOrgContext";
import { schema, OutputType } from "./duplicate_POST.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request, { requireOrgRole: ["admin", "manager"] });
    const { sourceTemplateId, name } = schema.parse(superjson.parse(await request.text()));

    const source = await db.selectFrom("documentTemplates")
      .selectAll()
      .where("id", "=", sourceTemplateId)
      .executeTakeFirst();

    if (!source) throw new Error("Source template not found");
    if (source.orgId !== orgId && (!source.isFoundation || source.orgId !== null)) {
      throw new Error("Unauthorized");
    }

    const created = await db.insertInto("documentTemplates")
      .values({
        name: name || `Copy of ${source.name}`,
        documentType: source.documentType,
        isActive: true,
        isFoundation: false,
        orgId,
        createdBy: user.id,
        blocks: source.blocks,
        settings: source.settings
      })
      .returning(["id", "name", "documentType"])
      .executeTakeFirstOrThrow();

    return new Response(superjson.stringify({ template: created } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}