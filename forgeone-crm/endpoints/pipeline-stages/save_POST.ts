import { db } from "../../helpers/db";
import { getOrgContext } from "../../helpers/getOrgContext";
import { schema, OutputType } from "./save_POST.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request, { requireOrgRole: ["admin"] });
    const { id, isDefault, ...data } = schema.parse(superjson.parse(await request.text()));

    let stageId = id;
    await db.transaction().execute(async (trx) => {
      if (isDefault) {
        await trx.updateTable("pipelineStages").set({ isDefault: false }).where("orgId", "=", orgId).where("pipelineType", "=", data.pipelineType).execute();
      }

      if (id) {
        await trx.updateTable("pipelineStages").set({ ...data, isDefault }).where("id", "=", id).where("orgId", "=", orgId).execute();
      } else {
        const res = await trx.insertInto("pipelineStages").values({ ...data, isDefault, orgId, createdBy: user.id }).returning("id").executeTakeFirstOrThrow();
        stageId = res.id;
      }
    });

    return new Response(superjson.stringify({ success: true, id: stageId! } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}