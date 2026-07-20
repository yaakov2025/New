import { useMutation } from "@tanstack/react-query";
import { postUpdateMember } from "../endpoints/org/member/update_POST.schema";

export function useUpdateMember() {
  return useMutation({
    mutationFn: postUpdateMember,
  });
}