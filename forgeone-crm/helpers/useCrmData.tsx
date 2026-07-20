import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Assumed and provided imports
import { getLeadList } from "../endpoints/leads/list_GET.schema";
import { postSaveLead } from "../endpoints/leads/save_POST.schema";
import { getOpportunityList } from "../endpoints/opportunities/list_GET.schema";
import { postSaveOpportunity } from "../endpoints/opportunities/save_POST.schema";
import { getPipelineStages } from "../endpoints/pipeline-stages/list_GET.schema";
import { postSavePipelineStage } from "../endpoints/pipeline-stages/save_POST.schema";

export function useLeadList(params?: any) {
  return useQuery({
    queryKey: ["leads", params],
    queryFn: () => getLeadList(params),
  });
}

export function useSaveLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postSaveLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
}

export function useOpportunityList(params?: any) {
  return useQuery({
    queryKey: ["opportunities", params],
    queryFn: () => getOpportunityList(params),
  });
}

export function useSaveOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postSaveOpportunity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function usePipelineStages(type?: "lead" | "opportunity") {
  return useQuery({
    queryKey: ["pipeline-stages", type],
    queryFn: () => getPipelineStages({ pipelineType: type }),
  });
}

export function useSavePipelineStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postSavePipelineStage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages"] });
    },
  });
}