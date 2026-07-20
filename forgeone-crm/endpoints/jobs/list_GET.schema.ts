import { z } from "zod";
import superjson from "superjson";
import { Selectable } from "kysely";
import { Jobs } from "../../helpers/schema";

export const schema = z.object({
  status: z.string().optional(),
  needsReview: z.boolean().optional(),
  search: z.string().optional(),
  assignedTo: z.number().optional(),
});

export type JobWithDetails = Selectable<Jobs> & {
  customerName: string | null;
  propertyAddress: string | null;
  assignees: string[];
  statusColor: string | null;
};

export type OutputType = { jobs: JobWithDetails[] };

export const getJobList = async (
  body: z.infer<typeof schema> = {},
  init?: RequestInit
): Promise<OutputType> => {
  const qs = new URLSearchParams(Object.entries(body).reduce((a, [k, v]) => (v !== undefined ? { ...a, [k]: String(v) } : a), {}));
  const result = await fetch(`/_api/jobs/list?${qs.toString()}`, {
    method: "GET", ...init, headers: { "Content-Type": "application/json" }
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};