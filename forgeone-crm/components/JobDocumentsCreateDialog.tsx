import React, { useMemo } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "./Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "./Dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./Select";
import { Form, FormItem, FormLabel, FormControl, FormMessage, useForm } from "./Form";
import { useCreateDocument } from "../helpers/useDocuments";
import { useTemplateList } from "../helpers/useTemplates";
import { DocumentTypeArrayValues } from "../helpers/schema";
import { formatDocType } from "./JobDocumentsShared";

const createDocSchema = z.object({
  documentType: z.string().min(1, "Please select a document type"),
  templateId: z.number().optional(),
});

export function JobDocumentsCreateDialog({
  isOpen,
  setIsOpen,
  jobId,
}: {
  isOpen: boolean;
  setIsOpen: (o: boolean) => void;
  jobId: number;
}) {
  const { data: templateData, isLoading: isLoadingTemplates } = useTemplateList({ isActive: true });
  const { mutateAsync: createDoc, isPending } = useCreateDocument();

  const form = useForm({
    schema: createDocSchema,
    defaultValues: { documentType: "", templateId: 0 },
  });

  const selectedType = form.values.documentType;

  const availableTemplates = useMemo(() => {
    if (!templateData) return [];
    const all = [...(templateData.templates || []), ...(templateData.foundationTemplates || [])];
    return selectedType ? all.filter((t) => t.documentType === selectedType) : all;
  }, [templateData, selectedType]);

  const onSubmit = async (values: z.infer<typeof createDocSchema>) => {
    if (!values.templateId) {
      toast.error("Please select a template");
      return;
    }
    try {
      const res = await createDoc({ templateId: values.templateId, jobId });
      toast.success(`Document ${res.documentNumber} created successfully`);
      setIsOpen(false);
      form.setValues({ documentType: "", templateId: 0 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create document");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Document</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-4)" }}>
            <FormItem name="documentType">
              <FormLabel>Document Type</FormLabel>
              <FormControl>
                <Select
                  value={form.values.documentType || "__empty"}
                  onValueChange={(val) => {
                    form.setValues((prev) => ({ ...prev, documentType: val === "__empty" ? "" : val, templateId: 0 }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__empty">Select type...</SelectItem>
                    {DocumentTypeArrayValues.map((type) => (
                      <SelectItem key={type} value={type}>
                        {formatDocType(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>

            <FormItem name="templateId">
              <FormLabel>Template</FormLabel>
              <FormControl>
                <Select
                  disabled={!selectedType || isLoadingTemplates}
                  value={form.values.templateId ? String(form.values.templateId) : "__empty"}
                  onValueChange={(val) => {
                    form.setValues((prev) => ({ ...prev, templateId: val === "__empty" ? 0 : Number(val) }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__empty">Select template...</SelectItem>
                    {availableTemplates.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                    {selectedType && availableTemplates.length === 0 && (
                      <SelectItem value="none" disabled>
                        No templates available for this type
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}