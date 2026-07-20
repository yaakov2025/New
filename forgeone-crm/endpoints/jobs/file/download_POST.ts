import { db } from "../../../helpers/db";
import { getOrgContext } from "../../../helpers/getOrgContext";
import { schema, OutputType } from "./download_POST.schema";
import superjson from "superjson";
import { getUrl } from "@floot/storage";

export async function handle(request: Request) {
  try {
    const { orgId } = await getOrgContext(request);
    const { fileId } = schema.parse(superjson.parse(await request.text()));

    const file = await db.selectFrom("jobFiles").selectAll().where("id", "=", fileId).where("orgId", "=", orgId).executeTakeFirst();
    if (!file) throw new Error("File not found");

    const getUrlRes = await getUrl({ visibility: "private", filename: file.storageKey });
    if (!getUrlRes.ok) throw new Error(getUrlRes.error.message);

    return new Response(superjson.stringify({ success: true, url: getUrlRes.url, fileName: file.fileName } as OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}