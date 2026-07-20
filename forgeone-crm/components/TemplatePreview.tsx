import React from "react";
import { ResolvedBlock, TemplateSettings } from "../helpers/templateBlockTypes";
import { Skeleton } from "./Skeleton";
import styles from "./TemplatePreview.module.css";

interface TemplatePreviewProps {
  resolvedBlocks: ResolvedBlock[];
  settings: TemplateSettings;
  isLoading?: boolean;
  mode?: "editor" | "document";
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  resolvedBlocks,
  settings,
  isLoading = false,
  mode = "editor",
}) => {
  const marginStyles = {
    paddingTop: `${settings.margins.top}px`,
    paddingRight: `${settings.margins.right}px`,
    paddingBottom: `${settings.margins.bottom}px`,
    paddingLeft: `${settings.margins.left}px`,
  };

  const renderPreviewText = (text?: string) => {
    if (!text) return null;

    if (mode === "document") {
      const cleanText = text.replace(/\{\{.*?\}\}|\[Missing: .*?\]/g, "");
      return cleanText.trim() === "" ? null : <span>{cleanText}</span>;
    }

    const regex = /(\{\{.*?\}\}|\[Missing: .*?\])/g;
    const parts = text.split(regex);
    return parts.map((part, i) => {
      if (part.startsWith("{{") && part.endsWith("}}")) {
        return (
          <span key={i} className={styles.unresolvedTag}>
            {part}
          </span>
        );
      }
      if (part.startsWith("[Missing:") && part.endsWith("]")) {
        return (
          <span key={i} className={styles.missingTag}>
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const renderBlock = (block: ResolvedBlock) => {
    switch (block.type) {
      case "header":
        return (
          <div
            className={styles.headerBlock}
            style={{ textAlign: block.settings.alignment || "left" }}
          >
            {block.settings.showLogo && (
              <div className={styles.placeholderImage}>Logo Placeholder</div>
            )}
            <div className={styles.headerText}>
              {block.settings.showOrgName && <h2>Organization Name</h2>}
              {block.settings.showOrgAddress && <p>Organization Address</p>}
              {block.settings.showDocumentTitle && (
                <h1>{block.settings.documentTitle}</h1>
              )}
            </div>
          </div>
        );

      case "footer":
        return (
          <div
            className={styles.footerBlock}
            style={{ textAlign: block.settings.alignment || "center" }}
          >
            {block.settings.content && <p>{block.settings.content}</p>}
            {block.settings.showPageNumbers && (
              <span className={styles.pageNumber}>Page 1 of 1</span>
            )}
          </div>
        );

      case "text":
        return (
          <div
            className={styles.textBlock}
            style={{
              fontSize: `${block.settings.fontSize || 11}pt`,
              textAlign: block.settings.alignment || "left",
              fontWeight: block.settings.bold ? "bold" : "normal",
              fontStyle: block.settings.italic ? "italic" : "normal",
            }}
          >
            {renderPreviewText(block.resolvedContent)}
          </div>
        );

            case "heading": {
        const headingLevel = block.settings.level || 1;
        const headingStyle: React.CSSProperties = { textAlign: block.settings.alignment || "left" };
        const headingContent = renderPreviewText(block.resolvedContent);
        if (headingLevel === 2) return <h2 className={styles.headingBlock} style={headingStyle}>{headingContent}</h2>;
        if (headingLevel === 3) return <h3 className={styles.headingBlock} style={headingStyle}>{headingContent}</h3>;
        return <h1 className={styles.headingBlock} style={headingStyle}>{headingContent}</h1>;
      }

      case "orgBranding":
        return (
          <div className={styles.orgBrandingBlock}>
            {block.settings.showLogo && block.resolvedData?.logo && (
              <img
                src={block.resolvedData.logo}
                alt="Org Logo"
                className={styles.orgLogo}
              />
            )}
            <div className={styles.orgDetails}>
              {block.settings.showName && <strong>{block.resolvedData?.name || "Organization Name"}</strong>}
              {block.settings.showAddress && <div>{block.resolvedData?.address || "Address"}</div>}
              {block.settings.showPhone && <div>{block.resolvedData?.phone || "Phone"}</div>}
              {block.settings.showEmail && <div>{block.resolvedData?.email || "Email"}</div>}
            </div>
          </div>
        );

      case "customerInfo":
      case "propertyInfo":
      case "jobInfo":
      case "insuranceInfo":
        return (
          <div className={styles.recordInfoBlock}>
            {block.settings.title && <h3 className={styles.recordTitle}>{block.settings.title}</h3>}
            <table className={styles.recordTable}>
              <tbody>
                {Object.entries(block.resolvedData || {}).map(([k, v]) => {
                  if (!v) return null;
                  return (
                    <tr key={k}>
                      <td className={styles.recordKey}>{k.replace(/([A-Z])/g, " $1").trim()}</td>
                      <td className={styles.recordVal}>{v}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );

      case "estimateLineItems":
        const items = block.resolvedData?.items || [];
        return (
          <div className={styles.tableBlock}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  {block.settings.showDescription && <th>Description</th>}
                  {block.settings.showQuantity && <th>Qty</th>}
                  {block.settings.showUnit && <th>Unit</th>}
                  {block.settings.showUnitPrice && <th>Unit Price</th>}
                  {block.settings.showLineTotal && <th>Total</th>}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.emptyTable}>
                      No items
                    </td>
                  </tr>
                ) : (
                  items.map((item: any, i: number) => (
                    <tr key={i}>
                      {block.settings.showDescription && <td>{item.description}</td>}
                      {block.settings.showQuantity && <td>{item.quantity}</td>}
                      {block.settings.showUnit && <td>{item.unit}</td>}
                      {block.settings.showUnitPrice && <td>{item.unitPrice}</td>}
                      {block.settings.showLineTotal && <td>{item.total}</td>}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        );

      case "totals":
        return (
          <div className={styles.totalsBlock}>
            <table className={styles.totalsTable}>
              <tbody>
                {block.settings.showSubtotal && (
                  <tr>
                    <td>Subtotal</td>
                    <td>{block.resolvedData?.subtotal || "$0.00"}</td>
                  </tr>
                )}
                {block.settings.showTax && (
                  <tr>
                    <td>Tax</td>
                    <td>{block.resolvedData?.tax || "$0.00"}</td>
                  </tr>
                )}
                {block.settings.showTotal && (
                  <tr className={styles.grandTotal}>
                    <td>Total</td>
                    <td>{block.resolvedData?.total || "$0.00"}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );

      case "notes":
      case "termsAndConditions":
        return (
          <div className={styles.notesBlock}>
            {block.settings.title && <h3>{block.settings.title}</h3>}
            <div className={styles.notesContent}>
              {renderPreviewText(block.resolvedContent)}
            </div>
          </div>
        );

      case "signatureBlock":
        return (
          <div className={styles.signatureBlock}>
            {(block.settings.lines || []).map((line: any, i: number) => (
              <div key={i} className={styles.signatureLine}>
                <div className={styles.signatureRule} />
                <div className={styles.signatureLabels}>
                  <span>{line.label}</span>
                  {line.showDate && <span>Date</span>}
                </div>
              </div>
            ))}
          </div>
        );

      case "columns":
        const count = block.settings.columnCount || 2;
        return (
          <div
            className={styles.columnsBlock}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${count}, 1fr)`,
              gap: `${block.settings.gap || 20}px`,
            }}
          >
            {(block.settings.columns || []).map((col: any, i: number) => (
              <div key={i} className={styles.columnContent}>
                {renderPreviewText(col.content)}
              </div>
            ))}
          </div>
        );

      case "image":
        return (
          <div
            className={styles.imageBlock}
            style={{ textAlign: block.settings.alignment || "center" }}
          >
            {block.settings.imageUrl ? (
              <img
                src={block.settings.imageUrl}
                alt={block.settings.caption || "Image"}
                style={{ width: `${block.settings.width || 200}px`, maxWidth: "100%" }}
              />
            ) : (
              <div
                className={styles.placeholderImageInline}
                style={{ width: `${block.settings.width || 200}px` }}
              >
                Image Placeholder
              </div>
            )}
            {block.settings.caption && (
              <div className={styles.imageCaption}>{block.settings.caption}</div>
            )}
          </div>
        );

      case "divider":
        return (
          <hr
            className={styles.dividerBlock}
            style={{
              borderTopStyle: block.settings.style || "solid",
              borderTopWidth: `${block.settings.thickness || 1}px`,
              borderTopColor: block.settings.color || "#cccccc",
            }}
          />
        );

      case "pageBreak":
        if (mode === "document") return null;
        return (
          <div className={styles.pageBreakBlock}>
            <span>— Page Break —</span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.previewEnvironment}>
      <div className={styles.paperSheet} style={marginStyles}>
        {isLoading ? (
          <div className={styles.loadingState}>
            <Skeleton style={{ height: "40px", width: "60%" }} />
            <Skeleton style={{ height: "20px", width: "100%", marginTop: "20px" }} />
            <Skeleton style={{ height: "20px", width: "100%", marginTop: "10px" }} />
            <Skeleton style={{ height: "20px", width: "80%", marginTop: "10px" }} />
            <Skeleton style={{ height: "200px", width: "100%", marginTop: "40px" }} />
          </div>
        ) : (
          <div className={styles.documentFlow}>
            {resolvedBlocks.map((block) => (
              <div key={block.id} className={styles.blockWrapper}>
                {renderBlock(block)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};