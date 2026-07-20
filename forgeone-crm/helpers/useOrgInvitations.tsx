import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrgInvitationsList } from "../endpoints/org/invitations/list_GET.schema";
import { postResendInvitation } from "../endpoints/org/invitations/resend_POST.schema";
import { toast } from "sonner";

export const ORG_INVITATIONS_QUERY_KEY = ["orgInvitations", "list"];

export function useOrgInvitations() {
  return useQuery({
    queryKey: ORG_INVITATIONS_QUERY_KEY,
    queryFn: async () => {
      return getOrgInvitationsList();
    },
  });
}

export function useResendInvitation() {
  return useMutation({
    mutationFn: async (invitationId: number) => {
      return postResendInvitation({ invitationId });
    },
    onSuccess: (data) => {
      if (data.emailSent) {
        toast.success("Invitation resent successfully.");
      } else {
        toast.error(`Invitation resent but email failed to send: ${data.emailError}`);
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to resend invitation.");
    },
  });
}