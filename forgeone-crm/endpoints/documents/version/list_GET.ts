import { db } from "../../../helpers/db";
import { getOrgContext } from "../../../helpers/getOrgContext";
import { schema, OutputType } from "./list_GET.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId } = await getOrgContext(request);
    const url = new URL(request.url);
    const documentId = Number(url.searchParams.get("documentId"));
    if (!documentId) throw new Error("Document ID is required");

    const document = await db.selectFrom("jobDocuments")
      .select("id")
      .where("id", "=", documentId)
      .where("orgId", "=", orgId)
      .executeTakeFirst();

    if (!document) throw new Error("Document not found");

    const versions = await db.selectFrom("documentVersionSnapshots")
      .leftJoin("users", "documentVersionSnapshots.createdBy", "users.id")
      .selectAll("documentVersionSnapshots")
      .select("users.displayName as createdByName")
      .where("documentVersionSnapshots.documentId", "=", documentId)
      .orderBy("documentVersionSnapshots.versionNumber", "desc")
      .execute();

    return new Response(superjson.stringify({ versions } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}