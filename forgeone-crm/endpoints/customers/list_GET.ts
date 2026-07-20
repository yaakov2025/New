import { db } from "../../helpers/db";
import { getOrgContext } from "../../helpers/getOrgContext";
import { OutputType, CustomerWithCounts } from "./list_GET.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId } = await getOrgContext(request);
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const search = url.searchParams.get("search");

    let query = db.selectFrom("customers")
      .select([
        "customers.id", "customers.name", "customers.email", "customers.phone", 
        "customers.address", "customers.city", "customers.state", "customers.zip",
        "customers.type", "customers.notes", "customers.createdAt", "customers.updatedAt", "customers.orgId"
      ])
      .select((eb) =>
        eb.selectFrom("contacts").select(eb.fn.count("id").as("cnt")).whereRef("customerId", "=", "customers.id").where("isDeleted", "is not", true).as("contactCount")
      )
      .select((eb) =>
        eb.selectFrom("properties").select(eb.fn.count("id").as("cnt")).whereRef("customerId", "=", "customers.id").where("isDeleted", "is not", true).as("propertyCount")
      )
      .where("customers.orgId", "=", orgId)
      .where("customers.isDeleted", "is not", true);

    if (id) {
      query = query.where("customers.id", "=", Number(id));
    }
    if (search) {
      const s = `%${search}%`;
      query = query.where((eb) => eb.or([
        eb("customers.name", "ilike", s),
        eb("customers.email", "ilike", s),
        eb("customers.phone", "ilike", s)
      ]));
    }

    const customers = await query.orderBy("customers.name", "asc").execute();

        const mapped = customers.map(c => ({
...c,
contactCount: Number(c.contactCount || 0),
propertyCount: Number(c.propertyCount || 0)
}));

let result: any = { customers: mapped };

if (id && mapped.length > 0) {
const [contacts, properties] = await Promise.all([
db.selectFrom("contacts").selectAll().where("customerId", "=", Number(id)).where("isDeleted", "is not", true).execute(),
db.selectFrom("properties").selectAll().where("customerId", "=", Number(id)).where("isDeleted", "is not", true).execute()
]);
result = { customers: [{ ...mapped[0], contacts, properties }, ...mapped.slice(1)] };
}

return new Response(superjson.stringify(result as OutputType), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error in customers/list_GET:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(superjson.stringify({ error: message }), { status: 400 });
  }
}