import { db } from "../../helpers/db";
import { getOrgContext } from "../../helpers/getOrgContext";
import { OutputType } from "./get_GET.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId, orgRole } = await getOrgContext(request);
    const url = new URL(request.url);
    const id = Number(url.searchParams.get("id"));

    if (!id || isNaN(id)) throw new Error("Invalid id");

    const template = await db.selectFrom("documentTemplates")
      .leftJoin("users", "documentTemplates.createdBy", "users.id")
      .select([
        "documentTemplates.id", "documentTemplates.name", "documentTemplates.documentType",
        "documentTemplates.isActive", "documentTemplates.isFoundation",
        "documentTemplates.createdAt", "documentTemplates.updatedAt",
        "documentTemplates.orgId", "documentTemplates.createdBy",
        "documentTemplates.blocks", "documentTemplates.settings",
        "users.displayName as createdByName"
      ])
      .where("documentTemplates.id", "=", id)
      .executeTakeFirst();

    if (!template) throw new Error("Template not found");
    
    // Strict org tenant isolation, gracefully falling back for universally shared foundation templates
    if (template.orgId !== orgId && !template.isFoundation) {
      throw new Error("Unauthorized");
    }
    
    if (orgRole === "sales" && !template.isActive) {
      throw new Error("Unauthorized");
    }

    const versionData = await db.selectFrom("templateVersions")
      .select(db.fn.max("versionNumber").as("latestVersionNumber"))
      .where("templateId", "=", id)
      .executeTakeFirst();
      
    const latestVersionNumber = versionData?.latestVersionNumber ? Number(versionData.latestVersionNumber) : 0;

    return new Response(superjson.stringify({ template: { ...template, latestVersionNumber } } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}