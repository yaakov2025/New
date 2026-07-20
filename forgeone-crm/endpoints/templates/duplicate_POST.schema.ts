import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  sourceTemplateId: z.number(),
  name: z.string().optional(),
});

export type OutputType = {
  template: {
    id: number;
    name: string;
    documentType: string;
  };
};

export const postDuplicateTemplate = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/templates/duplicate`, {
    method: "POST",
    body: superjson.stringify(schema.parse(body)),
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};