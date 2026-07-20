import { db } from "../../helpers/db";
import { getOrgContext } from "../../helpers/getOrgContext";
import { schema, OutputType } from "./save_POST.schema";
import superjson from "superjson";
import { DocumentType } from "../../helpers/schema";

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request, { requireOrgRole: ["admin", "manager"] });
    const json = superjson.parse(await request.text());
    const data = schema.parse(json);

    let templateId = data.id;

    if (templateId) {
      const existing = await db.selectFrom("documentTemplates")
        .select(["orgId", "isFoundation"])
        .where("id", "=", templateId)
        .executeTakeFirst();
        
      if (!existing) throw new Error("Template not found");
      if (existing.orgId !== orgId) throw new Error("Unauthorized");
      if (existing.isFoundation) throw new Error("Cannot edit foundation templates");
      
      const updateData: any = {
        name: data.name,
        documentType: data.documentType as DocumentType,
        updatedAt: new Date()
      };
      
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.blocks) updateData.blocks = data.blocks;
      if (data.settings) updateData.settings = data.settings;

      const updated = await db.updateTable("documentTemplates")
        .set(updateData)
        .where("id", "=", templateId)
        .returningAll()
        .executeTakeFirstOrThrow();
        
      return new Response(superjson.stringify({ template: updated } satisfies OutputType));
    } else {
      const insertData = {
        name: data.name,
        documentType: data.documentType as DocumentType,
        isActive: data.isActive ?? true,
        isFoundation: false,
        orgId,
        createdBy: user.id,
        blocks: data.blocks ?? [],
        settings: data.settings ?? {}
      };
      
      const created = await db.insertInto("documentTemplates")
        .values(insertData)
        .returningAll()
        .executeTakeFirstOrThrow();
        
      return new Response(superjson.stringify({ template: created } satisfies OutputType));
    }
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}