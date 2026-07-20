import { db } from '../../../helpers/db';
import { getOrgContext } from '../../../helpers/getOrgContext';
import { schema, OutputType } from "./upload_POST.schema";
import superjson from "superjson";
import { upload } from "@floot/storage";
import { nanoid } from "nanoid";

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request, { requireOrgRole: ["admin", "manager"] });
    const { jobId, fileName, fileSize, contentType, caption } = schema.parse(superjson.parse(await request.text()));

    const job = await db.selectFrom("jobs").select("id").where("id", "=", jobId).where("orgId", "=", orgId).where("isDeleted", "is not", true).executeTakeFirst();
    if (!job) throw new Error("Job not found in current organization");

    const ext = fileName.split('.').pop() || "bin";
    const storageKey = `org/${orgId}/jobs/${jobId}/photos/${nanoid(10)}.${ext}`;

    const uploadRes = await upload({
      visibility: "private",
      filename: storageKey,
      contentType,
      sizeBytes: fileSize
    });

    if (!uploadRes.ok) throw new Error(uploadRes.error.message);

    let photoId = 0;
    await db.transaction().execute(async (trx) => {
      const res = await trx.insertInto("jobPhotos").values({
        jobId, orgId, storageKey, caption: caption || null, createdBy: user.id
      }).returning("id").executeTakeFirstOrThrow();
      photoId = res.id;

      await trx.insertInto("jobActivityEvents").values({
        orgId, jobId, eventType: "photo_added", description: `Photo uploaded: ${fileName}`, userId: user.id
      }).execute();
    });

    return new Response(superjson.stringify({ success: true, photoId, presignedUrl: uploadRes.presignedUrl } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}