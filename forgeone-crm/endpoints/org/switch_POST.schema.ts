import { z } from "zod";
import superjson from "superjson";
import { User } from "../../helpers/User";

export const schema = z.object({
  orgId: z.number(),
});

export type OutputType = { user: User };

export const postSwitchOrg = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/org/switch`, {
    method: "POST",
    body: superjson.stringify(schema.parse(body)),
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};