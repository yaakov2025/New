import { db } from "../../../helpers/db";
import { getOrgContext } from "../../../helpers/getOrgContext";
import { OutputType } from "./list_GET.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId } = await getOrgContext(request);
    
    const statuses = await db.selectFrom("jobStatuses")
      .selectAll()
      .where("orgId", "=", orgId)
      .where("isArchived", "is not", true)
      .orderBy("sortOrder", "asc")
      .execute();

    return new Response(superjson.stringify({ statuses } as OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}