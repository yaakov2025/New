import { db } from "../../helpers/db";
import { getOrgContext } from "../../helpers/getOrgContext";
import { schema, OutputType } from "./save_POST.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request);
    const json = superjson.parse(await request.text());
    const { id, ...data } = schema.parse(json);

    let customerId = id;
    const values = {
      name: data.name,
      type: data.type || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zip: data.zip || null,
      notes: data.notes || null,
      isDeleted: data.isDeleted || false,
    };

    if (id) {
      await db.updateTable("customers").set({ ...values, updatedAt: new Date() })
        .where("id", "=", id).where("orgId", "=", orgId).execute();
    } else {
      const res = await db.insertInto("customers").values({
        ...values,
        orgId,
        createdBy: user.id
      }).returning("id").executeTakeFirstOrThrow();
      customerId = res.id;
    }

    return new Response(superjson.stringify({ success: true, id: customerId! } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}