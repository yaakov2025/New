import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Name is required"),
  type: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().or(z.literal("")).nullable(),
  address: z.string().optional().or(z.literal("")).nullable(),
  city: z.string().optional().or(z.literal("")).nullable(),
  state: z.string().optional().or(z.literal("")).nullable(),
  zip: z.string().optional().or(z.literal("")).nullable(),
  notes: z.string().optional().nullable(),
  isDeleted: z.boolean().optional(),
});

export type OutputType = { success: boolean; id: number };

export const postSaveCustomer = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/customers/save`, {
    method: "POST",
    body: superjson.stringify(schema.parse(body)),
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};