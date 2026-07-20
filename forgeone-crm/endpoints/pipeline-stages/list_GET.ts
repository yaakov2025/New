import { db } from "../../helpers/db";
import { getOrgContext } from "../../helpers/getOrgContext";
import { OutputType } from "./list_GET.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId } = await getOrgContext(request);
    const url = new URL(request.url);
    const pipelineType = url.searchParams.get("pipelineType") as "lead" | "opportunity" | null;

    let query = db.selectFrom("pipelineStages").selectAll().where("orgId", "=", orgId).where("isArchived", "is not", true);
    if (pipelineType) query = query.where("pipelineType", "=", pipelineType);

    const stages = await query.orderBy("sortOrder", "asc").execute();
    return new Response(superjson.stringify({ stages } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}