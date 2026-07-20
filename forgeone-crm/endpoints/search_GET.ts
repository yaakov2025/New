import { db } from "../helpers/db";
import { getOrgContext } from "../helpers/getOrgContext";
import { OutputType, SearchResult } from "./search_GET.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId } = await getOrgContext(request);
    const url = new URL(request.url);
    const q = url.searchParams.get("q");
    if (!q || q.length < 2) return new Response(superjson.stringify({ results: [] }));
    const term = `%${q}%`;

    const [customers, contacts, leads, opps, jobs] = await Promise.all([
      db.selectFrom("customers").select(["id", "name", "email"]).where("orgId", "=", orgId).where("isDeleted", "is not", true).where((eb) => eb.or([eb("name", "ilike", term), eb("email", "ilike", term)])).limit(5).execute(),
      db.selectFrom("contacts").select(["id", "firstName", "lastName", "email", "customerId"]).where("orgId", "=", orgId).where("isDeleted", "is not", true).where((eb) => eb.or([eb("firstName", "ilike", term), eb("lastName", "ilike", term), eb("email", "ilike", term)])).limit(5).execute(),
      db.selectFrom("leads").select(["id", "name", "source"]).where("orgId", "=", orgId).where("isDeleted", "is not", true).where("name", "ilike", term).limit(5).execute(),
      db.selectFrom("opportunities").select(["id", "name"]).where("orgId", "=", orgId).where("isDeleted", "is not", true).where("name", "ilike", term).limit(5).execute(),
      db.selectFrom("jobs").select(["id", "name", "status"]).where("orgId", "=", orgId).where("isDeleted", "is not", true).where("name", "ilike", term).limit(5).execute(),
    ]);

    const results: SearchResult[] = [
      ...customers.map(c => ({ id: c.id, title: c.name, subtitle: c.email || "", type: "customer" as const, link: `/customers/${c.id}` })),
      ...contacts.map(c => ({ id: c.id, title: `${c.firstName} ${c.lastName || ""}`.trim(), subtitle: c.email || "", type: "contact" as const, link: `/customers/${c.customerId}` })),
      ...leads.map(l => ({ id: l.id, title: l.name, subtitle: l.source || "", type: "lead" as const, link: `/leads` })),
      ...opps.map(o => ({ id: o.id, title: o.name, subtitle: "", type: "opportunity" as const, link: `/opportunities` })),
      ...jobs.map(j => ({ id: j.id, title: j.name, subtitle: j.status || "", type: "job" as const, link: `/jobs/${j.id}` })),
    ];

    return new Response(superjson.stringify({ results } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}