import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { Plus, Trash2, Camera } from "lucide-react";

const CATEGORIES = ["before", "after", "damage", "progress", "other"];

type Props = { jobId: Id<"jobs">; orgId: Id<"organizations"> };

export default function PhotosTab({ jobId, orgId }: Props) {
  const photos = useQuery(api.jobs.photos.list, { jobId, orgId });
  const createPhoto = useMutation(api.jobs.photos.create);
  const updatePhoto = useMutation(api.jobs.photos.update);
  const removePhoto = useMutation(api.jobs.photos.remove);
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
      await createPhoto({ jobId, orgId, storageId, caption: file.name });
      toast.success("Photo uploaded");
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (photos === undefined) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-1.5">
          <Plus className="size-3.5" /> {uploading ? "Uploading..." : "Upload Photo"}
        </Button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>

      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Camera className="size-4" /> No photos yet
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div key={photo._id} className="border border-border rounded-lg overflow-hidden group relative">
              {photo.url && (
                <img src={photo.url} alt={photo.caption ?? ""} className="w-full h-32 object-cover" />
              )}
              <div className="p-2 space-y-1">
                <Input
                  defaultValue={photo.caption ?? ""}
                  placeholder="Caption"
                  className="h-7 text-xs"
                  onBlur={(e) => {
                    if (e.target.value !== (photo.caption ?? "")) {
                      updatePhoto({ photoId: photo._id, orgId, caption: e.target.value });
                    }
                  }}
                />
                <Select
                  defaultValue={photo.category ?? "other"}
                  onValueChange={(v) => updatePhoto({ photoId: photo._id, orgId, category: v })}
                >
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="text-xs capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-1 right-1 size-6 opacity-0 group-hover:opacity-100 bg-background/80"
                onClick={() => removePhoto({ photoId: photo._id, orgId })}
              >
                <Trash2 className="size-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
