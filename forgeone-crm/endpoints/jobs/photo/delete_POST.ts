import { db } from "../../../helpers/db";
import { getOrgContext } from "../../../helpers/getOrgContext";
import { schema, OutputType } from "./delete_POST.schema";
import superjson from "superjson";
import { remove } from "@floot/storage";

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request, { requireOrgRole: ["admin", "manager"] });
    const { photoId } = schema.parse(superjson.parse(await request.text()));

    const photo = await db.selectFrom("jobPhotos").selectAll().where("id", "=", photoId).where("orgId", "=", orgId).executeTakeFirst();
    if (!photo) throw new Error("Photo not found");

    const rmRes = await remove({ visibility: "private", filename: photo.storageKey });
    if (!rmRes.ok) throw new Error(rmRes.error.message);

    await db.transaction().execute(async (trx) => {
      await trx.deleteFrom("jobPhotos").where("id", "=", photoId).execute();
      await trx.insertInto("jobActivityEvents").values({
        orgId,
        jobId: photo.jobId,
        eventType: "photo_deleted",
        description: "Photo deleted",
        userId: user.id
      }).execute();
    });

    return new Response(superjson.stringify({ success: true } as OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}