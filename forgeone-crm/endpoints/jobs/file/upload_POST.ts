import { db } from "../../../helpers/db";
import { getOrgContext } from "../../../helpers/getOrgContext";
import { schema, OutputType } from "./upload_POST.schema";
import superjson from "superjson";
import { upload } from "@floot/storage";
import { nanoid } from "nanoid";

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request, { requireOrgRole: ["admin", "manager"] });
    const { jobId, fileName, fileSize, contentType } = schema.parse(superjson.parse(await request.text()));

    const job = await db.selectFrom("jobs").select("id").where("id", "=", jobId).where("orgId", "=", orgId).executeTakeFirst();
    if (!job) throw new Error("Job not found");

    const storageKey = `org/${orgId}/jobs/${jobId}/files/${nanoid()}_${fileName}`;
    const uploadRes = await upload({ visibility: "private", filename: storageKey, contentType, sizeBytes: fileSize });
    if (!uploadRes.ok) throw new Error(uploadRes.error.message);

    let fileId = 0;
    await db.transaction().execute(async (trx) => {
      const res = await trx.insertInto("jobFiles").values({
        jobId,
        orgId,
        fileName,
        fileSize,
        mimeType: contentType,
        storageKey,
        createdBy: user.id
      }).returning("id").executeTakeFirstOrThrow();
      fileId = res.id;

      await trx.insertInto("jobActivityEvents").values({
        orgId,
        jobId,
        eventType: "file_added",
        description: `File "${fileName}" uploaded`,
        userId: user.id
      }).execute();
    });

    return new Response(superjson.stringify({ success: true, fileId, presignedUrl: uploadRes.presignedUrl, url: uploadRes.url } as OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}