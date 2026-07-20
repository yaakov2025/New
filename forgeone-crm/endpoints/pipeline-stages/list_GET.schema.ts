import { z } from "zod";
import superjson from "superjson";
import { Selectable } from "kysely";
import { PipelineStages, PipelineTypeArrayValues } from "../../helpers/schema";

export const schema = z.object({
  pipelineType: z.enum(["lead", "opportunity"]).optional(),
});

export type OutputType = { stages: Selectable<PipelineStages>[] };

export const getPipelineStages = async (
  body: z.infer<typeof schema> = {},
  init?: RequestInit
): Promise<OutputType> => {
  const qs = new URLSearchParams(Object.entries(body).reduce((a, [k, v]) => (v ? { ...a, [k]: String(v) } : a), {}));
  const result = await fetch(`/_api/pipeline-stages/list?${qs.toString()}`, {
    method: "GET", ...init, headers: { "Content-Type": "application/json" }
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};