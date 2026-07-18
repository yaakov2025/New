import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";

// Uploads a File to Convex storage and returns the resulting storageId.
// 1. Request a short-lived upload URL
// 2. POST the file contents
// 3. Return the storageId to be saved via a create mutation
export function useFileUpload() {
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  const uploadFile = async (file: File): Promise<Id<"_storage">> => {
    const uploadUrl = await generateUploadUrl();
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!res.ok) {
      throw new Error("Upload failed");
    }
    const json = (await res.json()) as { storageId: Id<"_storage"> };
    return json.storageId;
  };

  return { uploadFile };
}
