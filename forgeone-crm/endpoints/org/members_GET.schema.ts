import { z } from "zod";
import superjson from "superjson";
import { Selectable } from "kysely";
import { Users, OrgMemberships } from "../../helpers/schema";

export const schema = z.object({});

export type MemberDetails = Pick<Selectable<Users>, "id" | "displayName" | "email" | "avatarUrl"> & {
  role: Selectable<OrgMemberships>["role"];
  joinedAt: Date | null;
};

export type OutputType = { members: MemberDetails[] };

export const getOrgMembers = async (
  body: z.infer<typeof schema> = {},
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch(`/_api/org/members`, {
    method: "GET",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};