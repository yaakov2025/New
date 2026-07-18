import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";
import { Plus, Pencil, StickyNote } from "lucide-react";

type Props = { jobId: Id<"jobs">; orgId: Id<"organizations"> };

export default function NotesTab({ jobId, orgId }: Props) {
  const notes = useQuery(api.jobs.notes.list, { jobId, orgId });
  const createNote = useMutation(api.jobs.notes.create);
  const updateNote = useMutation(api.jobs.notes.update);
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<Id<"jobNotes"> | null>(null);
  const [editContent, setEditContent] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newContent.trim()) return;
    setCreating(true);
    try {
      await createNote({ jobId, orgId, content: newContent.trim() });
      setNewContent("");
      toast.success("Note added");
    } catch {
      toast.error("Failed to add note");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (noteId: Id<"jobNotes">) => {
    if (!editContent.trim()) return;
    try {
      await updateNote({ noteId, orgId, content: editContent.trim() });
      setEditingId(null);
      toast.success("Note updated");
    } catch {
      toast.error("Failed to update note");
    }
  };

  if (notes === undefined) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Create form */}
      <div className="space-y-2">
        <Textarea
          placeholder="Add a note..."
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          rows={3}
        />
        <Button size="sm" onClick={handleCreate} disabled={creating || !newContent.trim()} className="gap-1.5">
          <Plus className="size-3.5" /> Add Note
        </Button>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <StickyNote className="size-4" /> No notes yet
        </p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note._id} className="border border-border rounded-lg p-4 space-y-2">
              {editingId === note._id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleUpdate(note._id)}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-foreground whitespace-pre-line">{note.content}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      v{note.version} · {new Date(note._creationTime).toLocaleDateString()}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1"
                      onClick={() => { setEditingId(note._id); setEditContent(note.content); }}
                    >
                      <Pencil className="size-3" /> Edit
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
