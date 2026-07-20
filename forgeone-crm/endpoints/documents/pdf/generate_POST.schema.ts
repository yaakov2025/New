import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  documentId: z.number(),
});

export type OutputType = { url: string; fileName: string };

export const postGenerateDocumentPdf = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/documents/pdf/generate`, {
    method: "POST",
    body: superjson.stringify(schema.parse(body)),
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};