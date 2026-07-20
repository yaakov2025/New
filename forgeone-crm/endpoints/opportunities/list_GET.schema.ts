import { z } from "zod";
import superjson from "superjson";
import { Selectable } from "kysely";
import { Opportunities } from "../../helpers/schema";

export const schema = z.object({
  search: z.string().optional(),
  stageId: z.number().optional(),
  assignedTo: z.number().optional(),
});

export type OpportunityWithDetails = Selectable<Opportunities> & {
  stageName: string | null;
  stageColor: string | null;
  customerName: string | null;
  assigneeName: string | null;
};

export type OutputType = { opportunities: OpportunityWithDetails[] };

export const getOpportunityList = async (
  body: z.infer<typeof schema> = {},
  init?: RequestInit
): Promise<OutputType> => {
  const qs = new URLSearchParams(Object.entries(body).reduce((a, [k, v]) => (v ? { ...a, [k]: String(v) } : a), {}));
  const result = await fetch(`/_api/opportunities/list?${qs.toString()}`, {
    method: "GET", ...init, headers: { "Content-Type": "application/json" }
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};