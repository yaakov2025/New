import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTemplateList } from "../endpoints/templates/list_GET.schema";
import { getTemplate } from "../endpoints/templates/get_GET.schema";
import { postSaveTemplate } from "../endpoints/templates/save_POST.schema";
import { postDuplicateTemplate } from "../endpoints/templates/duplicate_POST.schema";
import { getTemplateVersions } from "../endpoints/templates/version/list_GET.schema";
import { postSaveTemplateVersion } from "../endpoints/templates/version/save_POST.schema";
import { postRestoreTemplateVersion } from "../endpoints/templates/version/restore_POST.schema";
import { postPreviewTemplate } from "../endpoints/templates/preview_POST.schema";
import { postGenerateTemplatePdf } from "../endpoints/templates/pdf/generate_POST.schema";

export const useTemplateList = (filters?: { documentType?: string; isActive?: boolean }) => {
  return useQuery({
    queryKey: ["templates", filters],
    queryFn: () => getTemplateList(filters)
  });
};

export const useTemplate = (id?: number) => {
  return useQuery({
    queryKey: ["template", id],
    queryFn: () => getTemplate({ id: id! }),
    enabled: !!id
  });
};

export const useSaveTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postSaveTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      qc.invalidateQueries({ queryKey: ["template"] });
    }
  });
};

export const useDuplicateTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postDuplicateTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
    }
  });
};

export const useTemplateVersions = (templateId?: number) => {
  return useQuery({
    queryKey: ["template-versions", templateId],
    queryFn: () => getTemplateVersions({ templateId: templateId! }),
    enabled: !!templateId
  });
};

export const useSaveTemplateVersion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postSaveTemplateVersion,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["template-versions", variables.templateId] });
      qc.invalidateQueries({ queryKey: ["template", variables.templateId] });
    }
  });
};

export const useRestoreTemplateVersion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postRestoreTemplateVersion,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["template", variables.templateId] });
      qc.invalidateQueries({ queryKey: ["template-versions", variables.templateId] });
    }
  });
};

export const useTemplatePreview = () => {
  return useMutation({
    mutationFn: postPreviewTemplate
  });
};

export const useGenerateTemplatePdf = () => {
  return useMutation({
    mutationFn: postGenerateTemplatePdf
  });
};