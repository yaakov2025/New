import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDocumentList } from "../endpoints/documents/list_GET.schema";
import { getDocument } from "../endpoints/documents/get_GET.schema";
import { postCreateDocument } from "../endpoints/documents/create_POST.schema";
import { postSaveDocument } from "../endpoints/documents/save_POST.schema";
import { postGenerateDocumentPdf } from "../endpoints/documents/pdf/generate_POST.schema";
import { postVoidDocument } from "../endpoints/documents/void_POST.schema";
import { getDocumentVersions } from "../endpoints/documents/version/list_GET.schema";
import { postSaveDocumentVersion } from "../endpoints/documents/version/save_POST.schema";
import { postSendDocument } from "../endpoints/documents/send_POST.schema";
import { postCreateReviewLink } from "../endpoints/documents/review-link/create_POST.schema";
import { postRevokeReviewLink } from "../endpoints/documents/review-link/revoke_POST.schema";
import { getReviewLinksList } from "../endpoints/documents/review-link/list_GET.schema";

export const useDocumentList = (filters: any) =>
  useQuery({ queryKey: ["documents", filters], queryFn: () => getDocumentList(filters) });

export const useDocument = (id: number) =>
  useQuery({ queryKey: ["document", id], queryFn: () => getDocument({ id }), enabled: !!id });

export const useCreateDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postCreateDocument,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["job"] });
    },
  });
};

export const useSaveDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postSaveDocument,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["document"] });
    },
  });
};

export const useGenerateDocumentPdf = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postGenerateDocumentPdf,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["document"] });
    },
  });
};

export const useVoidDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postVoidDocument,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["document"] });
      qc.invalidateQueries({ queryKey: ["job"] });
    },
  });
};

export const useDocumentVersions = (documentId: number) =>
  useQuery({
    queryKey: ["document-versions", documentId],
    queryFn: () => getDocumentVersions({ documentId }),
    enabled: !!documentId,
  });

export const useSaveDocumentVersion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postSaveDocumentVersion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-versions"] });
      qc.invalidateQueries({ queryKey: ["document"] });
    },
  });
};

export const useSendDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postSendDocument,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["document"] });
      qc.invalidateQueries({ queryKey: ["job"] });
    },
  });
};

export const useCreateReviewLink = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postCreateReviewLink,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-review-links"] });
    },
  });
};

export const useRevokeReviewLink = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postRevokeReviewLink,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-review-links"] });
    },
  });
};

export const useDocumentReviewLinks = (documentId: number) =>
  useQuery({
    queryKey: ["document-review-links", documentId],
    queryFn: () => getReviewLinksList({ documentId }),
    enabled: !!documentId,
  });

export const fetchPublicDocumentReview = async (token: string) => {
  const res = await fetch(`/_api/public/document/review?token=${token}`);
  if (!res.ok) {
    const text = await res.text();
    let err = text;
    try { err = JSON.parse(text).error; } catch {}
    throw new Error(err);
  }
  return res.json();
};

export const submitApproval = async (data: { token: string; approverName: string; approverEmail: string; comment?: string }) => {
  const res = await fetch(`/_api/public/document/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const text = await res.text();
    let err = text;
    try { err = JSON.parse(text).error; } catch {}
    throw new Error(err);
  }
  return res.json();
};

export const submitDecline = async (data: { token: string; name: string; email: string; reason?: string }) => {
  const res = await fetch(`/_api/public/document/decline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const text = await res.text();
    let err = text;
    try { err = JSON.parse(text).error; } catch {}
    throw new Error(err);
  }
  return res.json();
};

export const submitSignature = async (data: { token: string; signerName: string; signerEmail: string; signatureData: string }) => {
  const res = await fetch(`/_api/public/document/sign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const text = await res.text();
    let err = text;
    try { err = JSON.parse(text).error; } catch {}
    throw new Error(err);
  }
  return res.json();
};