import { z } from "zod";
import superjson from "superjson";
import { Selectable } from "kysely";
import { JobStatuses } from "../../../helpers/schema";

export const schema = z.object({});

export type OutputType = { statuses: Selectable<JobStatuses>[] };

export const getJobStatuses = async (body: z.infer<typeof schema> = {}, init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/jobs/statuses/list`, {
    method: "GET",
    ...init,
    headers: { "Content-Type": "application/json" }
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};