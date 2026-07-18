import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";
import { Plus, Trash2, FileIcon, Download } from "lucide-react";

type Props = { jobId: Id<"jobs">; orgId: Id<"organizations"> };

export default function FilesTab({ jobId, orgId }: Props) {
  const files = useQuery(api.jobs.files.list, { jobId, orgId });
  const createFile = useMutation(api.jobs.files.create);
  const removeFile = useMutation(api.jobs.files.remove);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await generateUploadUrl({});
      const result = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await result.json() as { storageId: Id<"_storage"> };
      await createFile({ jobId, orgId, storageId, fileName: file.name, fileSize: file.size, mimeType: file.type });
      toast.success("File uploaded");
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (files === undefined) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-1.5">
          <Plus className="size-3.5" /> {uploading ? "Uploading..." : "Upload File"}
        </Button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
      </div>

      {files.length === 0 ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <FileIcon className="size-4" /> No files yet
        </p>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div key={file._id} className="flex items-center gap-3 border border-border rounded-lg p-3">
              <FileIcon className="size-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.fileName}</p>
                <p className="text-xs text-muted-foreground">{formatSize(file.fileSize)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {file.url && (
                  <Button size="icon" variant="ghost" className="size-7" asChild>
                    <a href={file.url} download={file.fileName} target="_blank" rel="noreferrer">
                      <Download className="size-3.5" />
                    </a>
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-destructive"
                  onClick={() => removeFile({ fileId: file._id, orgId })}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
