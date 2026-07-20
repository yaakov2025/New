import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  id: z.number(),
  notes: z.string().optional().nullable(),
  lineItems: z.array(
    z.object({
      id: z.number().optional(),
      description: z.string(),
      quantity: z.number(),
      unit: z.string().optional().nullable(),
      unitPrice: z.number(),
      category: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
      sortOrder: z.number(),
    })
  ).optional(),
  subtotal: z.number().optional().nullable(),
  tax: z.number().optional().nullable(),
  discount: z.number().optional().nullable(),
  total: z.number().optional().nullable(),
});

export type OutputType = { success: boolean; id: number };

export const postSaveDocument = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/documents/save`, {
    method: "POST",
    body: superjson.stringify(schema.parse(body)),
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};