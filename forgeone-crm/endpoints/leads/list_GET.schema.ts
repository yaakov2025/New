import { z } from "zod";
import superjson from "superjson";
import { Selectable } from "kysely";
import { Leads } from "../../helpers/schema";

export const schema = z.object({
  search: z.string().optional(),
  stageId: z.number().optional(),
  assignedTo: z.number().optional(),
});

export type LeadWithDetails = Selectable<Leads> & {
  stageName: string | null;
  stageColor: string | null;
  customerName: string | null;
  contactName: string | null;
  assigneeName: string | null;
};

export type OutputType = { leads: LeadWithDetails[] };

export const getLeadList = async (
  body: z.infer<typeof schema> = {},
  init?: RequestInit
): Promise<OutputType> => {
  const qs = new URLSearchParams(Object.entries(body).reduce((a, [k, v]) => (v ? { ...a, [k]: String(v) } : a), {}));
  const result = await fetch(`/_api/leads/list?${qs.toString()}`, {
    method: "GET", ...init, headers: { "Content-Type": "application/json" }
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};