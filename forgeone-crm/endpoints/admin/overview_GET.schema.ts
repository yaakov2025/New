import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({});

export type OutputType = {
  totalOrgs: number;
  totalUsers: number;
  organizations: {
    id: number;
    name: string;
    slug: string;
    memberCount: number;
    jobCount: number;
    createdAt: Date | null;
  }[];
};

export const getAdminOverview = async (body: z.infer<typeof schema> = {}, init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/admin/overview`, {
    method: "GET",
    ...init,
    headers: { "Content-Type": "application/json" }
  });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};