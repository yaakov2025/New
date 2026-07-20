import { db } from "../../helpers/db";
import { getOrgContext } from "../../helpers/getOrgContext";
import { OutputType } from "./list_GET.schema";
import superjson from "superjson";
import { DocumentType } from "../../helpers/schema";

export async function handle(request: Request) {
  try {
    const { orgId, orgRole } = await getOrgContext(request);
    const url = new URL(request.url);
    const documentType = url.searchParams.get("documentType");
    const isActiveStr = url.searchParams.get("isActive");
    
    let isActive: boolean | undefined = undefined;
    if (isActiveStr === "true") isActive = true;
    if (isActiveStr === "false") isActive = false;
    
    // Sales users are only allowed to see active templates
    if (orgRole === "sales") {
      isActive = true;
    }

    let query = db.selectFrom("documentTemplates")
      .leftJoin("users", "documentTemplates.createdBy", "users.id")
      .select([
        "documentTemplates.id", "documentTemplates.name", "documentTemplates.documentType",
        "documentTemplates.isActive", "documentTemplates.isFoundation",
        "documentTemplates.createdAt", "documentTemplates.updatedAt",
        "documentTemplates.orgId", "documentTemplates.createdBy",
        "documentTemplates.blocks", "documentTemplates.settings",
        "users.displayName as createdByName"
      ])
      .where("documentTemplates.orgId", "=", orgId);

    if (documentType) {
      query = query.where("documentTemplates.documentType", "=", documentType as DocumentType);
    }
    if (isActive !== undefined) {
      query = query.where("documentTemplates.isActive", "=", isActive);
    }

    const templates = await query.orderBy("documentTemplates.updatedAt", "desc").execute();

    let foundationQuery = db.selectFrom("documentTemplates")
      .leftJoin("users", "documentTemplates.createdBy", "users.id")
      .select([
        "documentTemplates.id", "documentTemplates.name", "documentTemplates.documentType",
        "documentTemplates.isActive", "documentTemplates.isFoundation",
        "documentTemplates.createdAt", "documentTemplates.updatedAt",
        "documentTemplates.orgId", "documentTemplates.createdBy",
        "documentTemplates.blocks", "documentTemplates.settings",
        "users.displayName as createdByName"
      ])
      .where("documentTemplates.orgId", "is", null)
      .where("documentTemplates.isFoundation", "=", true);

    if (documentType) {
      foundationQuery = foundationQuery.where("documentTemplates.documentType", "=", documentType as DocumentType);
    }
    
    const foundationTemplates = await foundationQuery.orderBy("documentTemplates.updatedAt", "desc").execute();

    return new Response(superjson.stringify({ templates, foundationTemplates } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}