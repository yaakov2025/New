import { db } from "../../../helpers/db";
import { getOrgContext } from "../../../helpers/getOrgContext";
import { schema, OutputType } from "./delete_POST.schema";
import superjson from "superjson";
import { remove } from "@floot/storage";

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request, { requireOrgRole: ["admin", "manager"] });
    const { fileId } = schema.parse(superjson.parse(await request.text()));

    const file = await db.selectFrom("jobFiles").selectAll().where("id", "=", fileId).where("orgId", "=", orgId).executeTakeFirst();
    if (!file) throw new Error("File not found");

    const rmRes = await remove({ visibility: "private", filename: file.storageKey });
    if (!rmRes.ok) throw new Error(rmRes.error.message);

    await db.transaction().execute(async (trx) => {
      await trx.deleteFrom("jobFiles").where("id", "=", fileId).execute();
      await trx.insertInto("jobActivityEvents").values({
        orgId,
        jobId: file.jobId,
        eventType: "file_deleted",
        description: `File "${file.fileName}" deleted`,
        userId: user.id
      }).execute();
    });

    return new Response(superjson.stringify({ success: true } as OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}