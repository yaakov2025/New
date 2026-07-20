import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  templateId: z.number(),
  name: z.string().min(1),
  notes: z.string().optional(),
});

export type OutputType = {
  version: {
    id: number;
    versionNumber: number;
    name: string;
    createdAt: Date;
  };
};

export const postSaveTemplateVersion = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/templates/version/save`, {
    method: "POST",
    body: superjson.stringify(schema.parse(body)),
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};