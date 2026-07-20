import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  q: z.string().min(2),
});

 export type SearchResult = { id: number; title: string; subtitle: string; type: "customer" | "contact" | "lead" | "opportunity" | "job"; link?: string };
export type OutputType = { results: SearchResult[] };

export const getSearch = async (body: z.infer<typeof schema>, init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/search?q=${encodeURIComponent(body.q)}`, { method: "GET", ...init, headers: { "Content-Type": "application/json" } });
  if (!result.ok) throw new Error(superjson.parse<{ error: string }>(await result.text()).error);
  return superjson.parse<OutputType>(await result.text());
};