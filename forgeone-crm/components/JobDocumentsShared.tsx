import React from "react";
import {
  FileText,
  FileCheck,
  Receipt,
  FileSignature,
  FileDiff,
} from "lucide-react";
import { Badge } from "./Badge";

export const formatDocType = (type: string) => {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const getDocIcon = (type: string) => {
  switch (type) {
    case "estimate":
      return <Receipt size={16} />;
    case "contract":
      return <FileSignature size={16} />;
    case "work_order":
      return <FileCheck size={16} />;
    case "change_order":
      return <FileDiff size={16} />;
    case "certificate_of_completion":
      return <FileText size={16} />;
    default:
      return <FileText size={16} />;
  }
};

export const getStatusBadge = (status: string) => {
  switch (status) {
    case "draft":
      return <Badge variant="outline">Draft</Badge>;
    case "sent":
      return <Badge variant="primary">Sent</Badge>;
    case "viewed":
      return <Badge variant="secondary">Viewed</Badge>;
    case "approved":
    case "signed":
      return <Badge variant="success">{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
    case "declined":
      return <Badge variant="destructive">Declined</Badge>;
    case "voided":
      return <Badge variant="destructive">Voided</Badge>;
    case "expired":
      return <Badge variant="outline">Expired</Badge>;
    case "converted":
      return <Badge variant="secondary">Converted</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};