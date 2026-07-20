import React, { useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "./Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "./Dialog";
import { Form, FormItem, FormLabel, FormControl, FormMessage, useForm } from "./Form";
import { Input } from "./Input";
import { Textarea } from "./Textarea";
import { useSendDocument, useDocument } from "../helpers/useDocuments";

const sendDocSchema = z.object({
  recipientEmail: z.string().email("Valid email required"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().optional(),
});

export function JobDocumentsSendDialog({
  isOpen,
  setIsOpen,
  documentId,
}: {
  isOpen: boolean;
  setIsOpen: (o: boolean) => void;
  documentId: number | null;
}) {
  const { data } = useDocument(documentId || 0);
  const { mutateAsync: sendDoc, isPending } = useSendDocument();

  const form = useForm({
    schema: sendDocSchema,
    defaultValues: { recipientEmail: "", subject: "", message: "" },
  });

  useEffect(() => {
    if (data?.document && isOpen) {
      form.setValues({
        recipientEmail: "", // Note: To pre-fill if we add customer email fetching later
        subject: `${data.document.documentType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())} ${data.document.documentNumber}`,
        message: "",
      });
    }
  }, [data, isOpen, form.setValues]);

  const onSubmit = async (values: z.infer<typeof sendDocSchema>) => {
    if (!documentId) return;
    try {
      await sendDoc({
        documentId,
        recipientEmail: values.recipientEmail,
        subject: values.subject,
        message: values.message,
      });
      toast.success("Document sent successfully");
      setIsOpen(false);
      form.setValues({ recipientEmail: "", subject: "", message: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send document");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Document</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-4)" }}>
            <FormItem name="recipientEmail">
              <FormLabel>To Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="customer@example.com"
                  value={form.values.recipientEmail}
                  onChange={(e) => form.setValues((prev) => ({ ...prev, recipientEmail: e.target.value }))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>

            <FormItem name="subject">
              <FormLabel>Subject</FormLabel>
              <FormControl>
                <Input
                  placeholder="Subject"
                  value={form.values.subject}
                  onChange={(e) => form.setValues((prev) => ({ ...prev, subject: e.target.value }))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>

            <FormItem name="message">
              <FormLabel>Message (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add a custom message..."
                  value={form.values.message || ""}
                  onChange={(e) => form.setValues((prev) => ({ ...prev, message: e.target.value }))}
                  rows={4}
                />
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
                {isPending ? "Sending..." : "Send"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}