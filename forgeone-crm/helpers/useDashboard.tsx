import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary } from "../endpoints/dashboard/summary_GET.schema";

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardSummary(),
  });
}