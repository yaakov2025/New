import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrgList } from "../endpoints/org/list_GET.schema";
import { getOrgMembers } from "../endpoints/org/members_GET.schema";
import { postSwitchOrg } from "../endpoints/org/switch_POST.schema";
import { postCreateOrg } from "../endpoints/org/create_POST.schema";
import { AUTH_QUERY_KEY } from "./useAuth";

export const useOrgList = () => useQuery({ queryKey: ["orgList"], queryFn: () => getOrgList() });

export const useOrgMembers = () => useQuery({ queryKey: ["orgMembers"], queryFn: () => getOrgMembers() });

export const useSwitchOrg = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postSwitchOrg,
    onSuccess: (data) => {
      // Set auth first, then clear all non-auth queries for the new org
      qc.setQueryData(AUTH_QUERY_KEY, data.user);
      qc.removeQueries({ predicate: (query) => query.queryKey[0] !== "auth" });
    }
  });
};

export const useCreateOrg = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postCreateOrg,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orgList"] })
  });
};