import { z } from "zod";
import superjson from "superjson";
import { Selectable } from "kysely";
import { Organizations, OrgMemberships } from "../../helpers/schema";

export const schema = z.object({});

export type OrgWithDetails = Selectable<Organizations> & {
  role: string | null;
  memberCount: number;
};

export type OutputType = {
  orgs: OrgWithDetails[];
};

export const getOrgList = async (
  body: z.infer<typeof schema> = {},
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/org/list`, {
    method: "GET",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};