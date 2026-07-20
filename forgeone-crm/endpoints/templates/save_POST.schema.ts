import { z } from "zod";
import superjson from "superjson";
import { Selectable } from "kysely";
import { DocumentTemplates, DocumentTypeArrayValues } from "../../helpers/schema";

export const schema = z.object({
  id: z.number().optional(),
  name: z.string().min(1),
  documentType: z.enum(DocumentTypeArrayValues),
  isActive: z.boolean().optional(),
  blocks: z.any().optional(), // Expected to be template blocks JSON mapping structure
  settings: z.any().optional(), // Expected to be settings JSON
});

export type OutputType = { template: Selectable<DocumentTemplates> };

export const postSaveTemplate = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/templates/save`, {
    method: "POST",
    body: superjson.stringify(schema.parse(body)),
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};