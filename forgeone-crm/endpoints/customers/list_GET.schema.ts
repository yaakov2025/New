import { z } from "zod";
import superjson from "superjson";
import { Selectable } from "kysely";
import { Customers, Contacts, Properties } from "../../helpers/schema";

export const schema = z.object({
  id: z.number().optional(),
  search: z.string().optional(),
});

export type CustomerWithCounts = Selectable<Customers> & {
  contactCount: number;
  propertyCount: number;
  contacts?: Selectable<Contacts>[];
  properties?: Selectable<Properties>[];
};

export type OutputType = { customers: CustomerWithCounts[] };

export const getCustomerList = async (
  body: z.infer<typeof schema> = {},
  init?: RequestInit
): Promise<OutputType> => {
  const qs = new URLSearchParams();
  if (body.id) qs.set("id", body.id.toString());
  if (body.search) qs.set("search", body.search);
  
  const result = await fetch(`/_api/customers/list?${qs.toString()}`, {
    method: "GET",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};