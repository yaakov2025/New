import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "manager", "sales"]),
});

export type OutputType = { success: boolean; token: string; inviteUrl: string; emailSent: boolean; emailError?: string };

export const postInviteMember = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/org/invite`, {
    method: "POST",
    body: superjson.stringify(schema.parse(body)),
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};