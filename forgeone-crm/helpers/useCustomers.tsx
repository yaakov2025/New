import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Assumed imports based on requested requirements for interacting with existing or generic endpoints
import { getCustomerList } from "../endpoints/customers/list_GET.schema";
import { postSaveCustomer } from "../endpoints/customers/save_POST.schema";
import { postSaveContact } from "../endpoints/contacts/save_POST.schema";
import { postSaveProperty } from "../endpoints/properties/save_POST.schema";

export function useCustomerList(params?: { search?: string }) {
  return useQuery({
    queryKey: ["customers", params],
    queryFn: () => getCustomerList(params),
  });
}

export function useCustomerDetail(id: number | null) {
  return useQuery({
    queryKey: ["customers", id],
    queryFn: async () => {
      const res = await getCustomerList({ id: id! } as any);
      return res.customers[0] ?? null;
    },
    enabled: !!id,
  });
}

export function useSaveCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postSaveCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => postSaveCustomer({ id, isDeleted: true } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useSaveContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postSaveContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useSaveProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postSaveProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}