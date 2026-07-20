import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  id: z.number().optional(),
  pipelineType: z.enum(["lead", "opportunity"]),
  name: z.string().min(1),
  color: z.string().optional().nullable(),
  sortOrder: z.number().optional(),
  isDefault: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export type OutputType = { success: boolean; id: number };

export const postSavePipelineStage = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/pipeline-stages/save`, {
    method: "POST",
    body: superjson.stringify(schema.parse(body)),
    ...init,
    headers: { "Content-Type": "application/json" },
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};