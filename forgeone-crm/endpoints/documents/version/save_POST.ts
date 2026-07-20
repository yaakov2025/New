import { db } from "../../../helpers/db";
import { getOrgContext } from "../../../helpers/getOrgContext";
import { schema, OutputType } from "./save_POST.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request, { requireOrgRole: ["admin", "manager"] });
    const input = schema.parse(superjson.parse(await request.text()));

    let createdVersion = 0;

    await db.transaction().execute(async (trx) => {
      const document = await trx.selectFrom("jobDocuments")
        .selectAll()
        .where("id", "=", input.documentId)
        .where("orgId", "=", orgId)
        .executeTakeFirst();

      if (!document) throw new Error("Document not found");

      const lineItems = await trx.selectFrom("documentLineItems")
        .selectAll()
        .where("documentId", "=", input.documentId)
        .orderBy("sortOrder", "asc")
        .execute();

      const maxVersionRes = await trx.selectFrom("documentVersionSnapshots")
        .select(db.fn.max("versionNumber").as("maxVersion"))
        .where("documentId", "=", input.documentId)
        .executeTakeFirst();
      
      const nextVersionNumber = maxVersionRes?.maxVersion ? Number(maxVersionRes.maxVersion) + 1 : 1;

      await trx.insertInto("documentVersionSnapshots").values({
        documentId: document.id,
        versionNumber: nextVersionNumber,
        blocksSnapshot: document.blocksSnapshot,
        dataSnapshot: document.dataSnapshot,
        settingsSnapshot: document.settingsSnapshot,
        lineItemsSnapshot: lineItems as any,
        pdfStorageKey: document.pdfStorageKey,
        status: document.status,
        subtotal: document.subtotal,
        tax: document.tax,
        discount: document.discount,
        total: document.total,
        createdBy: user.id,
        notes: input.notes || null,
      }).execute();

      await trx.updateTable("jobDocuments")
        .set({ versionNumber: document.versionNumber + 1 })
        .where("id", "=", document.id)
        .execute();

      createdVersion = nextVersionNumber;
    });

    return new Response(
      superjson.stringify({ success: true, versionNumber: createdVersion } satisfies OutputType)
    );
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}