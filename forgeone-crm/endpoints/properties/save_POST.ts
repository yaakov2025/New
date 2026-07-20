import { db } from "../../helpers/db";
import { getOrgContext } from "../../helpers/getOrgContext";
import { schema, OutputType } from "./save_POST.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request);
    const { id, customerId, isDeleted, ...data } = schema.parse(superjson.parse(await request.text()));

    const customer = await db.selectFrom("customers").select("id").where("id", "=", customerId).where("orgId", "=", orgId).executeTakeFirst();
    if (!customer) throw new Error("Customer not found or access denied");

    let propertyId = id;
    if (id) {
      await db.updateTable("properties").set({ ...data, isDeleted: isDeleted || false }).where("id", "=", id).where("orgId", "=", orgId).execute();
    } else {
      const res = await db.insertInto("properties").values({ ...data, customerId, orgId, createdBy: user.id }).returning("id").executeTakeFirstOrThrow();
      propertyId = res.id;
    }

    return new Response(superjson.stringify({ success: true, id: propertyId! } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}