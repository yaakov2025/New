import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTemplateList, useSaveTemplate, useDuplicateTemplate } from "../helpers/useTemplates";
import { useAuth } from "../helpers/useAuth";
import { Button } from "../components/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/Dialog";
import { Form, FormItem, FormLabel, FormControl, FormMessage, useForm } from "../components/Form";
import { Input } from "../components/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { Badge } from "../components/Badge";
import { Skeleton } from "../components/Skeleton";
import { Plus, Copy, Lock, FileText } from "lucide-react";
import { z } from "zod";
import { DocumentTypeArrayValues } from "../helpers/schema";
import styles from "./templates.module.css";

const formatDocumentType = (type: string) => {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const newTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  documentType: z.enum(DocumentTypeArrayValues, { required_error: "Document type is required" }),
});

export default function TemplatesPage() {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const { data, isFetching } = useTemplateList();
  const { mutateAsync: duplicateTemplate, isPending: isDuplicating } = useDuplicateTemplate();

  const userRole = authState.type === "authenticated" ? authState.user.currentOrgRole : "sales";
  const canCreate = userRole === "admin" || userRole === "manager";

  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleDuplicate = async (sourceTemplateId: number, originalName: string) => {
    try {
      const result = await duplicateTemplate({ sourceTemplateId, name: `${originalName} (Copy)` });
      navigate(`/templates/${result.template.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const renderSkeletons = () => (
    <div className={styles.grid}>
      {[1, 2, 3].map((i) => (
        <div key={i} className={styles.cardSkeleton}>
          <Skeleton className={styles.skeletonTitle} />
          <Skeleton className={styles.skeletonBadge} />
          <Skeleton className={styles.skeletonDate} />
        </div>
      ))}
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Templates</h1>
          <p className={styles.subtitle}>Manage document templates for your organization</p>
        </div>
        {canCreate && (
          <CreateTemplateDialog 
            open={createDialogOpen} 
            onOpenChange={setCreateDialogOpen} 
            onSuccess={(id) => navigate(`/templates/${id}`)}
          />
        )}
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Organization Templates</h2>
        {isFetching && !data ? (
          renderSkeletons()
        ) : data?.templates.length === 0 ? (
          <div className={styles.emptyState}>
            <FileText size={48} className={styles.emptyIcon} />
            <h3>No organization templates</h3>
            <p>You haven't created any custom templates yet.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {data?.templates.map((template) => (
              <div 
                key={template.id} 
                className={styles.card} 
                onClick={() => navigate(`/templates/${template.id}`)}
              >
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>{template.name}</h3>
                  <Badge variant={template.isActive ? "success" : "secondary"}>
                    {template.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className={styles.cardFooter}>
                  <Badge variant="outline">{formatDocumentType(template.documentType)}</Badge>
                  <span className={styles.dateText}>
                    Updated {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(template.updatedAt))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Foundation Templates</h2>
        <p className={styles.sectionDescription}>Standard templates provided by the system. Duplicate them to customize for your organization.</p>
        
        {isFetching && !data ? (
          renderSkeletons()
        ) : data?.foundationTemplates.length === 0 ? (
          <div className={styles.emptyState}>
            <Lock size={48} className={styles.emptyIcon} />
            <h3>No foundation templates</h3>
            <p>System templates are currently unavailable.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {data?.foundationTemplates.map((template) => (
              <div key={template.id} className={styles.foundationCard}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>{template.name}</h3>
                  <div className={styles.systemLabel}>
                    <Lock size={12} /> System Template
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <Badge variant="outline">{formatDocumentType(template.documentType)}</Badge>
                  {canCreate && (
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(template.id, template.name);
                      }}
                      disabled={isDuplicating}
                    >
                      <Copy size={14} /> Duplicate
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CreateTemplateDialog({ open, onOpenChange, onSuccess }: { open: boolean, onOpenChange: (open: boolean) => void, onSuccess: (id: number) => void }) {
  const { mutateAsync: saveTemplate, isPending } = useSaveTemplate();
  
  const form = useForm({
    schema: newTemplateSchema,
    defaultValues: {
      name: "",
      documentType: undefined,
    }
  });

  const onSubmit = async (values: z.infer<typeof newTemplateSchema>) => {
    try {
      const result = await saveTemplate({
        name: values.name,
        documentType: values.documentType,
        isActive: false,
        blocks: [],
        settings: {}
      });
      onOpenChange(false);
      onSuccess(result.template.id);
    } catch (e) {
      console.error(e);
      if (e instanceof Error) {
        form.setFieldError("name", e.message);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button><Plus size={16} /> Create Template</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Template</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className={styles.form}>
            <FormItem name="name">
              <FormLabel>Template Name</FormLabel>
              <FormControl>
                <Input 
                  value={form.values.name} 
                  onChange={(e) => form.setValues(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Standard Work Order" 
                  autoFocus
                />
              </FormControl>
              <FormMessage />
            </FormItem>
            
            <FormItem name="documentType">
              <FormLabel>Document Type</FormLabel>
              <Select 
                value={form.values.documentType || "_empty"} 
                onValueChange={(v) => form.setValues(prev => ({ ...prev, documentType: v === "_empty" ? undefined : v as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {DocumentTypeArrayValues.map((type) => (
                    <SelectItem key={type} value={type}>
                      {formatDocumentType(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create Template"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}