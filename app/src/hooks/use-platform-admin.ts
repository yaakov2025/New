import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api.js";

export function useIsPlatformAdmin() {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.platform.admin.checkIsPlatformAdmin, isAuthenticated ? {} : "skip") ?? false;
}
