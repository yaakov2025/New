import { db } from "../../../helpers/db";
import { getOrgContext } from "../../../helpers/getOrgContext";
import { OutputType } from "./list_GET.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId } = await getOrgContext(request, { requireOrgRole: ["admin", "manager"] });
    const url = new URL(request.url);
    const templateId = Number(url.searchParams.get("templateId"));

    if (!templateId || isNaN(templateId)) throw new Error("Invalid templateId");

    const template = await db.selectFrom("documentTemplates")
      .select(["orgId"])
      .where("id", "=", templateId)
      .executeTakeFirst();

    if (!template || template.orgId !== orgId) throw new Error("Unauthorized");

    const versions = await db.selectFrom("templateVersions")
      .leftJoin("users", "templateVersions.createdBy", "users.id")
      .select([
        "templateVersions.id", "templateVersions.templateId", "templateVersions.versionNumber",
        "templateVersions.name", "templateVersions.notes", "templateVersions.createdAt",
        "users.displayName as createdByName"
      ])
      .where("templateVersions.templateId", "=", templateId)
      .orderBy("templateVersions.versionNumber", "desc")
      .execute();

    return new Response(superjson.stringify({ versions } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}