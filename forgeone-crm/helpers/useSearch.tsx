import { useQuery } from "@tanstack/react-query";
import { getSearch } from "../endpoints/search_GET.schema";

export function useGlobalSearch(q: string) {
  return useQuery({
    queryKey: ["search", q],
    queryFn: async () => {
      const { results } = await getSearch({ q });
      
      const grouped = results.reduce((acc, curr) => {
        if (!acc[curr.type]) acc[curr.type] = [];
        acc[curr.type].push(curr);
        return acc;
      }, {} as Record<string, typeof results>);

      return grouped;
    },
    enabled: q.length >= 2,
  });
}