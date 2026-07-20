import React, { useState, useEffect, useMemo } from 'react';
import { 
  useTemplate, 
  useSaveTemplate, 
  useTemplateVersions, 
  useSaveTemplateVersion, 
  useRestoreTemplateVersion, 
  useTemplatePreview, 
  useGenerateTemplatePdf 
} from '../helpers/useTemplates';
import { useJobList } from '../helpers/useJobs';
import { useCustomerList } from '../helpers/useCustomers';
import { useAuth } from '../helpers/useAuth';
import { 
  createBlock, 
  BLOCK_TYPE_DEFINITIONS, 
  TemplateBlock, 
  TemplateSettings, 
  DEFAULT_TEMPLATE_SETTINGS, 
  BlockType,
  ResolvedBlock 
} from '../helpers/templateBlockTypes';
import { TemplatePreview } from './TemplatePreview';
import { TemplateBlockEditor } from './TemplateBlockEditor';
import { Button } from './Button';
import { Input } from './Input';
import { Badge } from './Badge';
import { Switch } from './Switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './Dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './Sheet';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from './Select';
import { Skeleton } from './Skeleton';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';

// Icons
import {
  ArrowLeft, Eye, PenTool as PenToolIcon, History, Download, Save, Plus,
  ChevronUp, ChevronDown, Copy, Trash2, AlertTriangle, Blocks,
  PanelTop, PanelBottom, Columns, Minus, FileText, Heading, Type, 
  Image as ImageIcon, StickyNote, Scale, Building2, User, Home, 
  Briefcase, Shield, List, Calculator
} from 'lucide-react';

import styles from './TemplateBuilder.module.css';

interface TemplateBuilderProps {
  templateId: number;
  onBack: () => void;
}

const BlockIcon = ({ name, size = 16, className }: { name: string, size?: number, className?: string }) => {
  const map: Record<string, React.ElementType> = {
    'panel-top': PanelTop,
    'panel-bottom': PanelBottom,
    'columns': Columns,
    'minus': Minus,
    'file-dashed': FileText,
    'heading': Heading,
    'type': Type,
    'image': ImageIcon,
    'sticky-note': StickyNote,
    'scale': Scale,
    'building-2': Building2,
    'user': User,
    'home': Home,
    'briefcase': Briefcase,
    'shield': Shield,
    'list': List,
    'calculator': Calculator,
    'pen-tool': PenToolIcon
  };
  const Comp = map[name] || Blocks;
  return <Comp size={size} className={className} />;
};

export const TemplateBuilder: React.FC<TemplateBuilderProps> = ({ templateId, onBack }) => {
  const { authState } = useAuth();
  const userOrgRole = authState.type === "authenticated" ? authState.user.currentOrgRole : null;
  const isSuperAdmin = authState.type === "authenticated" && authState.user.role === "super_admin";
  const canEdit = isSuperAdmin || userOrgRole === "admin" || userOrgRole === "manager";
  const canRestore = isSuperAdmin || userOrgRole === "admin";

  const [mode, setMode] = useState<'edit' | 'preview'>(canEdit ? 'edit' : 'preview');
  const [initialized, setInitialized] = useState(false);
  
  // Local state for edits
  const [localName, setLocalName] = useState("");
  const [localIsActive, setLocalIsActive] = useState(false);
  const [localBlocks, setLocalBlocks] = useState<TemplateBlock[]>([]);
  const [localSettings, setLocalSettings] = useState<any>({});
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // UI state
  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  
  // Queries & Mutations
  const templateQuery = useTemplate(templateId);
  const saveMutation = useSaveTemplate();
  const previewMutation = useTemplatePreview();
  const pdfMutation = useGenerateTemplatePdf();
  
  const versionsQuery = useTemplateVersions(versionsOpen ? templateId : undefined);
  const versionMutation = useSaveTemplateVersion();
  const restoreMutation = useRestoreTemplateVersion();

  // Reference data
  const { data: customersData } = useCustomerList();
  const { data: jobsData } = useJobList({});

  // Sync server data to local state
  useEffect(() => {
    if (templateQuery.data?.template && !initialized) {
      const t = templateQuery.data.template;
      setLocalName(t.name);
      setLocalIsActive(t.isActive);
      setLocalBlocks((t.blocks as unknown as TemplateBlock[]) || []);
      setLocalSettings(t.settings || {});
      setInitialized(true);
    }
  }, [templateQuery.data, initialized]);

  // Dirty check
  const isDirty = useMemo(() => {
    if (!templateQuery.data?.template) return false;
    const t = templateQuery.data.template;
    return localName !== t.name || 
           localIsActive !== t.isActive || 
           JSON.stringify(localBlocks) !== JSON.stringify(t.blocks || []) || 
           JSON.stringify(localSettings) !== JSON.stringify(t.settings || {});
  }, [localName, localIsActive, localBlocks, localSettings, templateQuery.data]);

  // Action: Back
  const handleBackClick = () => {
    if (isDirty) {
      if (window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
        onBack();
      }
    } else {
      onBack();
    }
  };

  // Action: Save Template
  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({
        id: templateId,
        name: localName,
        documentType: templateQuery.data?.template.documentType as any,
        isActive: localIsActive,
        blocks: localBlocks,
        settings: localSettings
      });
      toast.success("Template saved successfully");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save template");
    }
  };

  // Block Manipulation
  const handleAddBlock = (type: BlockType) => {
    const newBlock = createBlock(type);
    setLocalBlocks([...localBlocks, newBlock]);
    setSelectedBlockId(newBlock.id);
    setAddBlockOpen(false);
  };

  const handleDuplicate = (block: TemplateBlock) => {
    const newBlock = { ...block, id: nanoid() };
    const index = localBlocks.findIndex(b => b.id === block.id);
    const newBlocks = [...localBlocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setLocalBlocks(newBlocks);
    setSelectedBlockId(newBlock.id);
  };

  const confirmDelete = (blockId: string) => {
    if (window.confirm("Are you sure you want to delete this block?")) {
       setLocalBlocks(localBlocks.filter(b => b.id !== blockId));
       if (selectedBlockId === blockId) setSelectedBlockId(null);
    }
  };

  const onMoveUp = (index: number) => {
    if (index === 0) return;
    const newBlocks = [...localBlocks];
    [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
    setLocalBlocks(newBlocks);
  };

  const onMoveDown = (index: number) => {
    if (index === localBlocks.length - 1) return;
    const newBlocks = [...localBlocks];
    [newBlocks[index + 1], newBlocks[index]] = [newBlocks[index], newBlocks[index + 1]];
    setLocalBlocks(newBlocks);
  };

  // Preview Handling
  const [previewBlocks, setPreviewBlocks] = useState<ResolvedBlock[]>([]);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);
  const [previewSettings, setPreviewSettings] = useState({
    useSampleData: true,
    customerId: "__empty",
    jobId: "__empty"
  });

  const loadPreview = async () => {
    try {
      const res = await previewMutation.mutateAsync({
        templateId,
        useSampleData: previewSettings.useSampleData,
        customerId: previewSettings.customerId !== "__empty" ? parseInt(previewSettings.customerId) : undefined,
        jobId: previewSettings.jobId !== "__empty" ? parseInt(previewSettings.jobId) : undefined,
      });
      setPreviewBlocks(res.resolvedBlocks);
      setPreviewWarnings(res.warnings || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview failed");
    }
  };

  useEffect(() => {
    if (mode === 'preview') {
      loadPreview();
    }
  }, [mode, previewSettings]);

  // PDF Generation
  const [pdfSettings, setPdfSettings] = useState({
    useSampleData: true,
    customerId: "__empty",
    jobId: "__empty"
  });

  const handleGeneratePdf = async (params: any) => {
    try {
      const res = await pdfMutation.mutateAsync({
        templateId,
        ...params
      });
      window.open(res.url, "_blank");
      toast.success("PDF generated successfully!");
      setPdfDialogOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate PDF");
    }
  };

  const onGeneratePdfClick = () => {
    if (mode === 'preview') {
      handleGeneratePdf({
         useSampleData: previewSettings.useSampleData,
         customerId: previewSettings.customerId !== "__empty" ? parseInt(previewSettings.customerId) : undefined,
         jobId: previewSettings.jobId !== "__empty" ? parseInt(previewSettings.jobId) : undefined
      });
    } else {
      setPdfDialogOpen(true);
    }
  };

  // Versions Handling
  const [newVersionName, setNewVersionName] = useState("");
  const [newVersionNotes, setNewVersionNotes] = useState("");

  const handleCreateVersion = async () => {
    if (!newVersionName) {
      toast.error("Version name is required");
      return;
    }
    try {
      await versionMutation.mutateAsync({
        templateId,
        name: newVersionName,
        notes: newVersionNotes
      });
      toast.success("Version created");
      setNewVersionName("");
      setNewVersionNotes("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create version");
    }
  };

  const handleRestore = async (versionId: number) => {
    if (!window.confirm("Are you sure you want to restore this version? This will overwrite your current unsaved changes.")) return;
    try {
      await restoreMutation.mutateAsync({
        templateId,
        versionId
      });
      toast.success("Version restored");
      setInitialized(false);
      setVersionsOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to restore version");
    }
  };

  if (templateQuery.isLoading) {
    return (
      <div className={styles.loadingPage}>
        <Skeleton className={styles.fullSkeleton} />
      </div>
    );
  }

  if (!templateQuery.data?.template) {
    return <div className={styles.errorPage}>Template not found</div>;
  }

  const blockCategories = ['layout', 'content', 'data', 'document'] as const;

  return (
    <div className={styles.templateBuilder}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <Button variant="ghost" size="icon" onClick={handleBackClick}>
            <ArrowLeft size={18} />
          </Button>
          <div className={styles.titleWrapper}>
            <Input 
              value={localName} 
              onChange={e => setLocalName(e.target.value)} 
              disabled={!canEdit}
              className={styles.titleInput}
            />
            <Badge variant="secondary" className={styles.docTypeBadge}>
              {templateQuery.data.template.documentType.replace(/_/g, ' ')}
            </Badge>
          </div>
        </div>
        
        <div className={styles.topBarRight}>
          <div className={styles.switchRow}>
            <Switch id="active-switch" checked={localIsActive} onCheckedChange={setLocalIsActive} disabled={!canEdit} />
            <label htmlFor="active-switch" className={styles.switchLabel}>Active</label>
          </div>
          
          <div className={styles.divider} />
          
          {isDirty && canEdit && <span className={styles.dirtyDot} title="Unsaved changes" />}
          
          {canEdit && (
            <Button variant="outline" onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}>
              {mode === 'edit' ? <><Eye size={16} /> Preview</> : <><PenToolIcon size={16} /> Edit</>}
            </Button>
          )}
          
          {canEdit && (
            <Button variant="outline" onClick={() => setVersionsOpen(true)}>
              <History size={16} /> Versions
            </Button>
          )}
          
          <Button variant="outline" onClick={onGeneratePdfClick} disabled={pdfMutation.isPending}>
            <Download size={16} /> PDF
          </Button>
          
          {canEdit && (
            <Button variant="primary" onClick={handleSave} disabled={saveMutation.isPending || !isDirty}>
              <Save size={16} /> Save
            </Button>
          )}
        </div>
      </div>

      {/* Main Area */}
      <div className={styles.mainArea}>
        {mode === 'edit' && canEdit ? (
          <div className={styles.editMode}>
            {/* Left Panel */}
            <div className={styles.leftPanel}>
              <div className={styles.leftPanelHeader}>
                <h3 className={styles.panelTitle}>Blocks</h3>
                <Button variant="outline" size="sm" onClick={() => setAddBlockOpen(true)}>
                  <Plus size={16} /> Add Block
                </Button>
              </div>
              
              <div className={styles.blockList}>
                {localBlocks.length === 0 && (
                  <div className={styles.emptyBlocks}>No blocks added yet.</div>
                )}
                {localBlocks.map((block, index) => (
                  <div 
                    key={block.id} 
                    className={styles.blockCard} 
                    data-selected={selectedBlockId === block.id}
                    onClick={() => setSelectedBlockId(block.id)}
                  >
                    <BlockIcon name={BLOCK_TYPE_DEFINITIONS.find(d => d.type === block.type)?.icon || 'blocks'} className={styles.blockCardIcon} />
                    <div className={styles.blockCardLabel}>{block.label || block.type}</div>
                    
                    <div className={styles.blockCardActions}>
                      <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); onMoveUp(index); }} disabled={index === 0}>
                        <ChevronUp size={16} />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); onMoveDown(index); }} disabled={index === localBlocks.length - 1}>
                        <ChevronDown size={16} />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); handleDuplicate(block); }}>
                        <Copy size={16} />
                      </Button>
                      <Button variant="destructive" size="icon-sm" onClick={(e) => { e.stopPropagation(); confirmDelete(block.id); }}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Center Panel */}
            <div className={styles.centerPanel}>
              {selectedBlockId ? (
                <TemplateBlockEditor
                  block={localBlocks.find(b => b.id === selectedBlockId)!}
                  onChange={(updated) => setLocalBlocks(localBlocks.map(b => b.id === updated.id ? updated : b))}
                  onDelete={() => confirmDelete(selectedBlockId)}
                  onDuplicate={() => handleDuplicate(localBlocks.find(b => b.id === selectedBlockId)!)}
                />
              ) : (
                <div className={styles.emptyCenter}>
                  <Blocks size={48} className={styles.emptyIcon} />
                  <h3>Select a block to edit</h3>
                  <p>Click on a block in the left panel to configure its properties.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.previewMode}>
            <div className={styles.previewControls}>
              <div className={styles.previewDataSelectors}>
                <div className={styles.switchRow}>
                  <Switch 
                    id="preview-sample" 
                    checked={previewSettings.useSampleData} 
                    onCheckedChange={c => setPreviewSettings({...previewSettings, useSampleData: c})} 
                  />
                  <label htmlFor="preview-sample" className={styles.switchLabel}>Use Sample Data</label>
                </div>
                
                {!previewSettings.useSampleData && (
                  <>
                    <Select value={previewSettings.customerId} onValueChange={v => setPreviewSettings({...previewSettings, customerId: v})}>
                      <SelectTrigger className={styles.dataSelect}><SelectValue placeholder="Select Customer" /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="__empty">None</SelectItem>
                          {customersData?.customers.map(c => (
                              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    
                    <Select value={previewSettings.jobId} onValueChange={v => setPreviewSettings({...previewSettings, jobId: v})}>
                      <SelectTrigger className={styles.dataSelect}><SelectValue placeholder="Select Job" /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="__empty">None</SelectItem>
                          {jobsData?.jobs.map(j => (
                              <SelectItem key={j.id} value={String(j.id)}>{j.name}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
              <Button variant="secondary" onClick={loadPreview} disabled={previewMutation.isPending}>
                Refresh Preview
              </Button>
            </div>
            
            {previewWarnings.length > 0 && (
              <div className={styles.warningsBar}>
                <strong><AlertTriangle size={14} className={styles.warningIcon} /> Warnings:</strong>
                <ul className={styles.warningsList}>
                  {previewWarnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
            
            <div className={styles.previewScrollArea}>
              <TemplatePreview
                resolvedBlocks={previewBlocks}
                settings={(localSettings as TemplateSettings) || DEFAULT_TEMPLATE_SETTINGS}
                isLoading={previewMutation.isPending}
              />
            </div>
          </div>
        )}
      </div>

      {/* Add Block Dialog */}
      <Dialog open={addBlockOpen} onOpenChange={setAddBlockOpen}>
        <DialogContent className={styles.addBlockDialog}>
          <DialogHeader>
            <DialogTitle>Add Block</DialogTitle>
          </DialogHeader>
          <div className={styles.blockListGrid}>
            {blockCategories.map(cat => (
              <div key={cat}>
                <h4 className={styles.blockCategoryTitle}>{cat}</h4>
                <div className={styles.blockCards}>
                  {BLOCK_TYPE_DEFINITIONS.filter(d => d.category === cat).map(def => (
                    <button key={def.type} className={styles.addBlockCard} onClick={() => handleAddBlock(def.type)}>
                      <BlockIcon name={def.icon} className={styles.addBlockCardIcon} />
                      <div className={styles.addBlockCardLabel}>{def.label}</div>
                      <div className={styles.addBlockCardDesc}>{def.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Generation Dialog */}
      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate PDF</DialogTitle>
          </DialogHeader>
          <div className={styles.pdfDialogContent}>
            {isDirty && (
              <div className={styles.infoBanner}>
                Note: PDF will be generated using the last <strong>saved</strong> version of this template.
              </div>
            )}
            <div className={styles.switchRow}>
              <Switch 
                id="pdf-sample" 
                checked={pdfSettings.useSampleData} 
                onCheckedChange={c => setPdfSettings({...pdfSettings, useSampleData: c})} 
              />
              <label htmlFor="pdf-sample" className={styles.switchLabel}>Use Sample Data</label>
            </div>
            
            {!pdfSettings.useSampleData && (
              <div className={styles.realDataSelects}>
                <div className={styles.field}>
                  <label>Customer Context</label>
                  <Select value={pdfSettings.customerId} onValueChange={v => setPdfSettings({...pdfSettings, customerId: v})}>
                    <SelectTrigger><SelectValue placeholder="Select Customer" /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="__empty">None</SelectItem>
                        {customersData?.customers.map(c => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className={styles.field}>
                  <label>Job Context</label>
                  <Select value={pdfSettings.jobId} onValueChange={v => setPdfSettings({...pdfSettings, jobId: v})}>
                    <SelectTrigger><SelectValue placeholder="Select Job" /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="__empty">None</SelectItem>
                        {jobsData?.jobs.map(j => (
                            <SelectItem key={j.id} value={String(j.id)}>{j.name}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPdfDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => handleGeneratePdf({
              useSampleData: pdfSettings.useSampleData,
              customerId: pdfSettings.customerId !== "__empty" ? parseInt(pdfSettings.customerId) : undefined,
              jobId: pdfSettings.jobId !== "__empty" ? parseInt(pdfSettings.jobId) : undefined
            })} disabled={pdfMutation.isPending}>
              {pdfMutation.isPending ? "Generating..." : "Generate PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Sheet */}
      <Sheet open={versionsOpen} onOpenChange={setVersionsOpen}>
        <SheetContent side="right" className={styles.versionSheet}>
          <SheetHeader>
            <SheetTitle>Version History</SheetTitle>
          </SheetHeader>
          <div className={styles.versionSheetContent}>
            
            <div className={styles.newVersionBox}>
              <h4 className={styles.versionBoxTitle}>Save New Version</h4>
              {isDirty ? (
                <div className={styles.dirtyVersionWarning}>
                  Please save your template changes first before creating a version snapshot.
                </div>
              ) : (
                <>
                  <Input placeholder="Version Name (e.g. v1.2)" value={newVersionName} onChange={e => setNewVersionName(e.target.value)} />
                  <textarea 
                    className={styles.textarea} 
                    placeholder="Notes (optional)" 
                    value={newVersionNotes} 
                    onChange={e => setNewVersionNotes(e.target.value)} 
                    rows={3} 
                  />
                  <Button onClick={handleCreateVersion} disabled={versionMutation.isPending}>
                    Create Snapshot
                  </Button>
                </>
              )}
            </div>
            
            <div className={styles.versionList}>
              <h4 className={styles.versionBoxTitle}>Previous Versions</h4>
              {versionsQuery.isLoading ? <Skeleton style={{height: 100}} /> : 
                versionsQuery.data?.versions.length === 0 ? (
                  <div className={styles.emptyVersions}>No versions saved yet.</div>
                ) : (
                versionsQuery.data?.versions.map(v => (
                  <div key={v.id} className={styles.versionItem}>
                     <div className={styles.versionHeader}>
                       <strong>{v.name}</strong>
                       <Badge variant="outline">v{v.versionNumber}</Badge>
                     </div>
                     <div className={styles.versionMeta}>
                       {new Date(v.createdAt).toLocaleString()} • by {v.createdByName || 'Unknown'}
                     </div>
                     {v.notes && <div className={styles.versionNotes}>{v.notes}</div>}
                     {canRestore && (
                       <Button variant="outline" size="sm" className={styles.restoreBtn} onClick={() => handleRestore(v.id)}>
                         Restore Version
                       </Button>
                     )}
                  </div>
                ))
              )}
            </div>
            
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
};