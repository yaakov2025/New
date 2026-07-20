import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getJobList } from "../endpoints/jobs/list_GET.schema";
import { getJobDetail } from "../endpoints/jobs/get_GET.schema";
import { postSaveJob } from "../endpoints/jobs/save_POST.schema";
import { postSaveJobTask } from "../endpoints/jobs/task/save_POST.schema";
import { postUploadJobPhoto } from "../endpoints/jobs/photo/upload_POST.schema";
import { postSaveJobAppointment } from "../endpoints/jobs/appointment/save_POST.schema";
import { postSaveJobNote } from "../endpoints/jobs/note/save_POST.schema";
import { postSaveJobContact } from "../endpoints/jobs/contact/save_POST.schema";
import { postDeleteJobPhoto } from "../endpoints/jobs/photo/delete_POST.schema";
import { postUploadJobFile } from "../endpoints/jobs/file/upload_POST.schema";
import { postDeleteJobFile } from "../endpoints/jobs/file/delete_POST.schema";
import { postDownloadJobFile } from "../endpoints/jobs/file/download_POST.schema";
import { postSaveJobInsurance } from "../endpoints/jobs/insurance/save_POST.schema";
import { postSaveJobAssignment } from "../endpoints/jobs/assignment/save_POST.schema";
import { getJobStatuses } from "../endpoints/jobs/statuses/list_GET.schema";

export const useJobList = (filters: any) => useQuery({ queryKey: ["jobs", filters], queryFn: () => getJobList(filters) });

export const useJobDetail = (id: number) => useQuery({ queryKey: ["job", id], queryFn: () => getJobDetail({ id }), enabled: !!id });

export const useSaveJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postSaveJob,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["job"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });
};

export const useSaveTask = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: postSaveJobTask, onSuccess: () => qc.invalidateQueries({ queryKey: ["job"] }) });
};

export const useUploadPhoto = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: postUploadJobPhoto, onSuccess: () => qc.invalidateQueries({ queryKey: ["job"] }) });
};

export const useSaveAppointment = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: postSaveJobAppointment, onSuccess: () => qc.invalidateQueries({ queryKey: ["job"] }) });
};

export const useSaveNote = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: postSaveJobNote, onSuccess: () => qc.invalidateQueries({ queryKey: ["job"] }) });
};

export const useSaveJobContact = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: postSaveJobContact, onSuccess: () => qc.invalidateQueries({ queryKey: ["job"] }) });
};

export const useDeletePhoto = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: postDeleteJobPhoto, onSuccess: () => qc.invalidateQueries({ queryKey: ["job"] }) });
};

export const useUploadFile = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: postUploadJobFile, onSuccess: () => qc.invalidateQueries({ queryKey: ["job"] }) });
};

export const useDeleteFile = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: postDeleteJobFile, onSuccess: () => qc.invalidateQueries({ queryKey: ["job"] }) });
};

export const useDownloadFile = () => {
  return useMutation({ mutationFn: postDownloadJobFile });
};

export const useSaveInsurance = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: postSaveJobInsurance, onSuccess: () => qc.invalidateQueries({ queryKey: ["job"] }) });
};

export const useSaveAssignment = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: postSaveJobAssignment, onSuccess: () => qc.invalidateQueries({ queryKey: ["job"] }) });
};

export const useJobStatuses = () => useQuery({ queryKey: ["job-statuses"], queryFn: () => getJobStatuses() });