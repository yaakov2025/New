import React, { useRef } from "react";
import {
  TemplateBlock,
  getBlockTypeDefinition,
} from "../helpers/templateBlockTypes";
import { Button } from "./Button";
import { Input } from "./Input";
import { Textarea } from "./Textarea";
import { Switch } from "./Switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./Select";
import { TagPicker } from "./TagPicker";
import { Badge } from "./Badge";
import { Trash2, Copy, Braces, Plus, X } from "lucide-react";
import styles from "./TemplateBlockEditor.module.css";

interface TemplateBlockEditorProps {
  block: TemplateBlock;
  onChange: (updatedBlock: TemplateBlock) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export const TemplateBlockEditor: React.FC<TemplateBlockEditorProps> = ({
  block,
  onChange,
  onDelete,
  onDuplicate,
}) => {
  const def = getBlockTypeDefinition(block.type);

  // We maintain a reference to the active text field to insert tags at the cursor.
  const cursorRef = useRef<{
    start: number;
    target: "content" | `settings.${string}` | `columns.${number}`;
  }>({ start: 0, target: "content" });

  const updateSetting = (key: string, value: any) => {
    onChange({
      ...block,
      settings: { ...block.settings, [key]: value },
    });
  };

  const updateContent = (value: string) => {
    onChange({ ...block, content: value });
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
    target: "content" | `settings.${string}` | `columns.${number}`,
  ) => {
    cursorRef.current = {
      start: e.target.selectionStart || 0,
      target,
    };
  };

  const handleInsertTag = (tagKey: string) => {
    const { start, target } = cursorRef.current;
    const tag = `{{${tagKey}}}`;

    if (target === "content") {
      const current = block.content || "";
      const newStr = current.substring(0, start) + tag + current.substring(start);
      updateContent(newStr);
      cursorRef.current.start = start + tag.length;
    } else if (target.startsWith("columns.")) {
      const colIndex = parseInt(target.split(".")[1], 10);
      const columns = [...(block.settings.columns || [])];
      const current = columns[colIndex]?.content || "";
      const newStr = current.substring(0, start) + tag + current.substring(start);
      columns[colIndex] = { ...columns[colIndex], content: newStr };
      updateSetting("columns", columns);
      cursorRef.current.start = start + tag.length;
    } else if (target.startsWith("settings.")) {
      const key = target.split(".")[1];
      const current = block.settings[key] || "";
      const newStr = current.substring(0, start) + tag + current.substring(start);
      updateSetting(key, newStr);
      cursorRef.current.start = start + tag.length;
    }
  };

  if (!def) return null;

  return (
    <div className={styles.editorContainer}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h3 className={styles.title}>{block.label || def.label}</h3>
          <Badge variant="outline" className={styles.typeBadge}>
            {def.category}
          </Badge>
        </div>
        <div className={styles.headerActions}>
          <Button variant="ghost" size="icon-sm" onClick={onDuplicate} title="Duplicate">
            <Copy size={16} />
          </Button>
          <Button variant="destructive" size="icon-sm" onClick={onDelete} title="Delete">
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      <div className={styles.fields}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Admin Label</label>
          <Input
            value={block.label}
            onChange={(e) => onChange({ ...block, label: e.target.value })}
            placeholder="Internal identifier"
          />
        </div>

        {/* --- COMMON CONTENT BASED BLOCKS --- */}
        {["text", "heading", "notes", "termsAndConditions"].includes(block.type) && (
          <>
            {["notes", "termsAndConditions"].includes(block.type) && (
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Title</label>
                <Input
                  value={block.settings.title || ""}
                  onChange={(e) => updateSetting("title", e.target.value)}
                  onBlur={(e) => handleBlur(e, "settings.title")}
                />
              </div>
            )}
            {block.type === "heading" && (
              <div className={styles.fieldGroupRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Heading Level</label>
                  <Select
                    value={String(block.settings.level || "1")}
                    onValueChange={(val) => updateSetting("level", parseInt(val, 10))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">H1 (Main Title)</SelectItem>
                      <SelectItem value="2">H2 (Section)</SelectItem>
                      <SelectItem value="3">H3 (Subsection)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Alignment</label>
                  <Select
                    value={block.settings.alignment || "left"}
                    onValueChange={(val) => updateSetting("alignment", val)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabelRow}>
                <label className={styles.label}>Content</label>
                <TagPicker
                  onInsert={handleInsertTag}
                  trigger={
                    <Button variant="outline" size="sm" className={styles.tagBtn}>
                      <Braces size={14} /> Insert Data
                    </Button>
                  }
                />
              </div>
              {block.type === "heading" ? (
                <Input
                  value={block.content || ""}
                  onChange={(e) => updateContent(e.target.value)}
                  onBlur={(e) => handleBlur(e, "content")}
                />
              ) : (
                <Textarea
                  value={block.content || ""}
                  onChange={(e) => updateContent(e.target.value)}
                  onBlur={(e) => handleBlur(e, "content")}
                  rows={6}
                />
              )}
            </div>

            {block.type === "text" && (
              <div className={styles.fieldGroupRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Size (pt)</label>
                  <Input
                    type="number"
                    min={8}
                    max={36}
                    value={block.settings.fontSize || 11}
                    onChange={(e) => updateSetting("fontSize", parseInt(e.target.value, 10))}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Alignment</label>
                  <Select
                    value={block.settings.alignment || "left"}
                    onValueChange={(val) => updateSetting("alignment", val)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                      <SelectItem value="justify">Justify</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className={styles.fieldGroupToggle}>
                  <Switch
                    checked={block.settings.bold || false}
                    onCheckedChange={(c) => updateSetting("bold", c)}
                    id="bold-sw"
                  />
                  <label htmlFor="bold-sw" className={styles.inlineLabel}>Bold</label>
                </div>
                <div className={styles.fieldGroupToggle}>
                  <Switch
                    checked={block.settings.italic || false}
                    onCheckedChange={(c) => updateSetting("italic", c)}
                    id="ital-sw"
                  />
                  <label htmlFor="ital-sw" className={styles.inlineLabel}>Italic</label>
                </div>
              </div>
            )}
          </>
        )}

        {/* --- COLUMNS --- */}
        {block.type === "columns" && (
          <>
            <div className={styles.fieldGroupRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Columns</label>
                <Select
                  value={String(block.settings.columnCount || 2)}
                  onValueChange={(val) => {
                    const count = parseInt(val, 10);
                    const cols = [...(block.settings.columns || [])];
                    while (cols.length < count) cols.push({ content: "" });
                    while (cols.length > count) cols.pop();
                    updateSetting("columnCount", count);
                    updateSetting("columns", cols);
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 Columns</SelectItem>
                    <SelectItem value="3">3 Columns</SelectItem>
                    <SelectItem value="4">4 Columns</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Gap (px)</label>
                <Input
                  type="number"
                  value={block.settings.gap || 20}
                  onChange={(e) => updateSetting("gap", parseInt(e.target.value, 10))}
                />
              </div>
            </div>
            {(block.settings.columns || []).map((col: any, idx: number) => (
              <div key={idx} className={styles.fieldGroup}>
                <div className={styles.fieldLabelRow}>
                  <label className={styles.label}>Column {idx + 1}</label>
                  <TagPicker
                    onInsert={handleInsertTag}
                    trigger={
                      <Button variant="ghost" size="sm" className={styles.tagBtn}>
                        <Braces size={14} /> Insert
                      </Button>
                    }
                  />
                </div>
                <Textarea
                  value={col.content}
                  onChange={(e) => {
                    const cols = [...block.settings.columns];
                    cols[idx] = { ...cols[idx], content: e.target.value };
                    updateSetting("columns", cols);
                  }}
                  onBlur={(e) => handleBlur(e, `columns.${idx}`)}
                  rows={4}
                />
              </div>
            ))}
          </>
        )}

        {/* --- RECORD INFO BLOCKS --- */}
        {["customerInfo", "propertyInfo", "jobInfo", "insuranceInfo", "orgBranding"].includes(
          block.type,
        ) && (
          <>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Section Title</label>
              <Input
                value={block.settings.title || ""}
                onChange={(e) => updateSetting("title", e.target.value)}
              />
            </div>
            <div className={styles.switchesGrid}>
              {Object.keys(block.settings)
                .filter((k) => k.startsWith("show"))
                .map((key) => (
                  <div key={key} className={styles.fieldGroupToggle}>
                    <Switch
                      checked={block.settings[key]}
                      onCheckedChange={(c) => updateSetting(key, c)}
                      id={`sw-${block.id}-${key}`}
                    />
                    <label htmlFor={`sw-${block.id}-${key}`} className={styles.inlineLabel}>
                      {key.replace("show", "")}
                    </label>
                  </div>
                ))}
            </div>
          </>
        )}

        {/* --- ESTIMATE & TOTALS --- */}
        {["estimateLineItems", "totals"].includes(block.type) && (
          <div className={styles.switchesGrid}>
            {Object.keys(block.settings)
              .filter((k) => k.startsWith("show"))
              .map((key) => (
                <div key={key} className={styles.fieldGroupToggle}>
                  <Switch
                    checked={block.settings[key]}
                    onCheckedChange={(c) => updateSetting(key, c)}
                    id={`sw-${block.id}-${key}`}
                  />
                  <label htmlFor={`sw-${block.id}-${key}`} className={styles.inlineLabel}>
                    {key.replace("show", "")}
                  </label>
                </div>
              ))}
          </div>
        )}

        {/* --- SIGNATURE BLOCK --- */}
        {block.type === "signatureBlock" && (
          <div className={styles.signatureList}>
            {(block.settings.lines || []).map((line: any, idx: number) => (
              <div key={idx} className={styles.signatureLineEditor}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Signee Role/Label</label>
                  <Input
                    value={line.label}
                    onChange={(e) => {
                      const lines = [...block.settings.lines];
                      lines[idx] = { ...line, label: e.target.value };
                      updateSetting("lines", lines);
                    }}
                  />
                </div>
                <div className={styles.fieldGroupToggle}>
                  <Switch
                    checked={line.showDate}
                    onCheckedChange={(c) => {
                      const lines = [...block.settings.lines];
                      lines[idx] = { ...line, showDate: c };
                      updateSetting("lines", lines);
                    }}
                    id={`sig-dt-${idx}`}
                  />
                  <label htmlFor={`sig-dt-${idx}`} className={styles.inlineLabel}>Date Line</label>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className={styles.removeSigBtn}
                  onClick={() => {
                    const lines = block.settings.lines.filter((_: any, i: number) => i !== idx);
                    updateSetting("lines", lines);
                  }}
                >
                  <X size={16} />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const lines = [...(block.settings.lines || []), { label: "New Signature", showDate: true }];
                updateSetting("lines", lines);
              }}
            >
              <Plus size={16} /> Add Line
            </Button>
          </div>
        )}

        {/* --- HEADER & FOOTER --- */}
        {["header", "footer"].includes(block.type) && (
          <>
            <div className={styles.switchesGrid}>
              {Object.keys(block.settings)
                .filter((k) => k.startsWith("show"))
                .map((key) => (
                  <div key={key} className={styles.fieldGroupToggle}>
                    <Switch
                      checked={block.settings[key]}
                      onCheckedChange={(c) => updateSetting(key, c)}
                      id={`sw-${block.id}-${key}`}
                    />
                    <label htmlFor={`sw-${block.id}-${key}`} className={styles.inlineLabel}>
                      {key.replace("show", "")}
                    </label>
                  </div>
                ))}
            </div>
            {block.type === "header" && block.settings.showDocumentTitle && (
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Document Title</label>
                <Input
                  value={block.settings.documentTitle || ""}
                  onChange={(e) => updateSetting("documentTitle", e.target.value)}
                  placeholder="e.g. Estimate, Contract"
                />
              </div>
            )}
            {block.type === "footer" && (
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Footer Content</label>
                <Textarea
                  value={block.settings.content || ""}
                  onChange={(e) => updateSetting("content", e.target.value)}
                  rows={2}
                />
              </div>
            )}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Alignment</label>
              <Select
                value={block.settings.alignment || "center"}
                onValueChange={(val) => updateSetting("alignment", val)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* --- IMAGE --- */}
        {block.type === "image" && (
          <>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Image URL</label>
              <Input
                value={block.settings.imageUrl || ""}
                onChange={(e) => updateSetting("imageUrl", e.target.value)}
                placeholder="https://"
              />
            </div>
            <div className={styles.fieldGroupRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Width (px)</label>
                <Input
                  type="number"
                  value={block.settings.width || 200}
                  onChange={(e) => updateSetting("width", parseInt(e.target.value, 10))}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Alignment</label>
                <Select
                  value={block.settings.alignment || "center"}
                  onValueChange={(val) => updateSetting("alignment", val)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Caption</label>
              <Input
                value={block.settings.caption || ""}
                onChange={(e) => updateSetting("caption", e.target.value)}
              />
            </div>
          </>
        )}

        {/* --- DIVIDER --- */}
        {block.type === "divider" && (
          <div className={styles.fieldGroupRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Style</label>
              <Select
                value={block.settings.style || "solid"}
                onValueChange={(val) => updateSetting("style", val)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                  <SelectItem value="dotted">Dotted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Thickness</label>
              <Input
                type="number"
                value={block.settings.thickness || 1}
                onChange={(e) => updateSetting("thickness", parseInt(e.target.value, 10))}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Color</label>
              <Input
                type="color"
                value={block.settings.color || "#cccccc"}
                onChange={(e) => updateSetting("color", e.target.value)}
                className={styles.colorInput}
              />
            </div>
          </div>
        )}

        {/* --- PAGE BREAK --- */}
        {block.type === "pageBreak" && (
          <div className={styles.readOnlyNote}>
            Forces a physical page break when generating PDFs.
          </div>
        )}
      </div>
    </div>
  );
};