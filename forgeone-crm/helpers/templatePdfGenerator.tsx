// @ts-ignore - pdfmake has no type declarations
import PdfPrinter from "pdfmake";
import { ResolvedBlock, TemplateSettings } from "./templateBlockTypes";

// Cache fetched font buffers so they're only downloaded once per Lambda instance
let cachedFonts: Record<string, Buffer> | null = null;

const FONT_URLS: Record<string, string> = {
  normal: "https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.8/files/roboto-latin-400-normal.woff",
  bold: "https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.8/files/roboto-latin-500-normal.woff",
  italics: "https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.8/files/roboto-latin-400-italic.woff",
  bolditalics: "https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.8/files/roboto-latin-500-italic.woff",
};

async function loadFonts(): Promise<Record<string, Buffer>> {
  if (cachedFonts) return cachedFonts;
  
  const fonts: Record<string, Buffer> = {};
  for (const [key, url] of Object.entries(FONT_URLS)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch font ${key}: ${res.statusText}`);
    const arrayBuf = await res.arrayBuffer();
    fonts[key] = Buffer.from(arrayBuf);
  }
  cachedFonts = fonts;
  return fonts;
}

/**
 * Downloads network URL graphical assets as uncompressed binary streams and wraps them in a 
 * base64 Data URI sequence format which pdfmake natively respects directly in layout instructions.
 */
async function fetchImageAsBase64(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get("content-type") || "image/jpeg";
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (err) {
    console.error("Failed to fetch image:", err);
    return null;
  }
}

export async function templatePdfGenerator(
  resolvedBlocks: ResolvedBlock[],
  settings: TemplateSettings,
  orgLogoUrl?: string,
): Promise<Buffer> {
  const fonts = await loadFonts();
  const printer = new PdfPrinter({
    Roboto: {
      normal: fonts.normal,
      bold: fonts.bold,
      italics: fonts.italics,
      bolditalics: fonts.bolditalics,
    },
  });

  // Prefetch globally recognized company branding imagery ensuring layout dimensions don't reflow
  let base64OrgLogo: string | null = null;
  if (orgLogoUrl) {
    base64OrgLogo = await fetchImageAsBase64(orgLogoUrl);
  } else {
    const headerBlock = resolvedBlocks.find((b) => b.type === "header");
    if (headerBlock?.resolvedData?.logo) {
      base64OrgLogo = await fetchImageAsBase64(
        headerBlock.resolvedData.logo,
      );
    }
  }

  // Pre-fetch inline imagery requested synchronously by internal block layout elements
  const blockImages: Record<string, string> = {};
  for (const block of resolvedBlocks) {
    if (block.type === "image" && block.settings?.imageUrl) {
      const b64 = await fetchImageAsBase64(block.settings.imageUrl);
      if (b64) blockImages[block.id] = b64;
    }
    if (block.type === "orgBranding" && block.resolvedData?.logo) {
      const b64 = await fetchImageAsBase64(block.resolvedData.logo);
      if (b64) blockImages[`${block.id}_logo`] = b64;
    }
  }

  const defaultMargins = [72, 72, 72, 72];
  const docDefinition: any = {
    pageSize: settings.pageSize || "LETTER",
    pageMargins: settings.margins
      ? [
          settings.margins.left,
          settings.margins.top,
          settings.margins.right,
          settings.margins.bottom,
        ]
      : defaultMargins,
    defaultStyle: { font: "Roboto", fontSize: 11, color: "#333333" },
    content: [],
    styles: {
      headerLabel: {
        fontSize: 9,
        bold: true,
        color: "#666666",
        margin: [0, 0, 0, 2],
      },
      sectionTitle: {
        fontSize: 14,
        bold: true,
        color: "#111111",
        margin: [0, 8, 0, 8],
      },
      kvTable: { margin: [0, 0, 0, 12] },
      kvCell: { margin: [4, 4, 4, 4] },
      kvKey: { bold: true, color: "#555555" },
    },
  };

  const headerBlock = resolvedBlocks.find((b) => b.type === "header");
  if (headerBlock) {
    docDefinition.header = function (currentPage: number) {
      return {
        columns: [
          base64OrgLogo && headerBlock.settings?.showLogo
            ? { image: base64OrgLogo, width: 100 }
            : { text: "" },
          {
            text: headerBlock.settings?.showDocumentTitle
              ? headerBlock.settings.documentTitle || "Document"
              : "",
            alignment: "right",
            fontSize: 16,
            bold: true,
            color: "#111111",
          },
        ],
        margin: [
          docDefinition.pageMargins[0],
          30,
          docDefinition.pageMargins[2],
          0,
        ],
      };
    };
  }

  const footerBlock = resolvedBlocks.find((b) => b.type === "footer");
  if (footerBlock || settings.showPageNumbers) {
    docDefinition.footer = function (
      currentPage: number,
      pageCount: number,
    ) {
      return {
        text: settings.showPageNumbers
          ? `Page ${currentPage} of ${pageCount}`
          : footerBlock?.content || "",
        alignment: settings.pageNumberPosition || "center",
        margin: [
          docDefinition.pageMargins[0],
          10,
          docDefinition.pageMargins[2],
          0,
        ],
        fontSize: 9,
        color: "#666666",
      };
    };
  }

  const buildKeyValueTable = (
    data: Record<string, string>,
    title?: string,
  ) => {
    const body = [];
    for (const [key, value] of Object.entries(data)) {
      if (value) {
        body.push([
          {
            text: key,
            style: "kvKey",
            border: [false, false, false, false],
          },
          {
            text: value,
            border: [false, false, false, false],
          },
        ]);
      }
    }
    if (body.length === 0) return null;
    return {
      stack: [
        title ? { text: title, style: "sectionTitle" } : null,
        {
          table: {
            widths: ["30%", "70%"],
            body: body,
          },
          layout: {
            hLineWidth: (i: number, node: any) =>
              i > 0 && i < node.table.body.length ? 1 : 0,
            vLineWidth: () => 0,
            hLineColor: () => "#EEEEEE",
          },
          style: "kvTable",
        },
      ].filter(Boolean),
      margin: [0, 0, 0, 16],
    };
  };

  for (const block of resolvedBlocks) {
    if (block.type === "header" || block.type === "footer") continue;

    let node: any = null;

    switch (block.type) {
      case "orgBranding": {
        const logo = blockImages[`${block.id}_logo`] || base64OrgLogo;
        const d = block.resolvedData || {};
        const orgInfo = [];
        if (d.name)
          orgInfo.push({
            text: d.name,
            fontSize: 18,
            bold: true,
            margin: [0, 0, 0, 4],
          });
        if (d.address) orgInfo.push({ text: d.address });
        if (d.phone) orgInfo.push({ text: `Phone: ${d.phone}` });
        if (d.email) orgInfo.push({ text: `Email: ${d.email}` });
        if (d.website) orgInfo.push({ text: `Web: ${d.website}` });

        node = {
          columns: [
            logo ? { image: logo, width: 120 } : { text: "" },
            { stack: orgInfo, alignment: "right" },
          ],
          margin: [0, 0, 0, 24],
        };
        break;
      }

      case "customerInfo": {
        const d = block.resolvedData || {};
        node = buildKeyValueTable(
          {
            Name: d.name,
            Address: d.address,
            Phone: d.phone,
            Email: d.email,
          },
          block.settings?.title || "Customer Information",
        );
        break;
      }

      case "propertyInfo": {
        const d = block.resolvedData || {};
        node = buildKeyValueTable(
          {
            Name: d.name,
            Address: d.address,
            "Property Type": d.propertyType,
          },
          block.settings?.title || "Property Information",
        );
        break;
      }

      case "jobInfo": {
        const d = block.resolvedData || {};
        node = buildKeyValueTable(
          {
            "Job Title": d.title,
            "Job Number": d.number,
            Status: d.status,
            Type: d.type,
            "Start Date": d.startDate,
            "Target Completion": d.targetCompletionDate,
            "Estimated Value": d.value,
          },
          block.settings?.title || "Job Information",
        );
        break;
      }

      case "insuranceInfo": {
        const d = block.resolvedData || {};
        node = buildKeyValueTable(
          {
            "Claim Number": d.claimNumber,
            "Policy Number": d.policyNumber,
            Carrier: d.carrier,
            Adjuster: d.adjuster,
            "Date of Loss": d.dateOfLoss,
            Deductible: d.deductible,
          },
          block.settings?.title || "Insurance Information",
        );
        break;
      }

      case "text":
        node = {
          text: block.resolvedContent || "",
          fontSize: block.settings?.fontSize || 11,
          alignment: block.settings?.alignment || "left",
          bold: block.settings?.bold || false,
          italics: block.settings?.italic || false,
          margin: [0, 0, 0, 12],
        };
        break;

      case "heading": {
        const level = block.settings?.level || 1;
        const fontSize = level === 1 ? 18 : level === 2 ? 15 : 13;
        node = {
          text: block.resolvedContent || "",
          fontSize,
          bold: true,
          alignment: block.settings?.alignment || "left",
          margin: [0, level === 1 ? 16 : 12, 0, 8],
        };
        break;
      }

      case "columns": {
        const cols = (block.settings?.columns || []).map((c: any) => ({
          text: c.content || "",
          margin: [
            0,
            0,
            block.settings?.gap ? block.settings.gap / 2 : 10,
            0,
          ],
        }));
        if (cols.length > 0) {
          node = {
            columns: cols,
            margin: [0, 0, 0, 12],
          };
        }
        break;
      }

      case "image": {
        const img = blockImages[block.id];
        if (img) {
          node = {
            image: img,
            width: block.settings?.width || 200,
            alignment: block.settings?.alignment || "center",
            margin: [0, 0, 0, 12],
          };
          if (block.settings?.caption) {
            node = {
              stack: [
                node,
                {
                  text: block.settings.caption,
                  alignment: "center",
                  fontSize: 9,
                  color: "#666666",
                  italics: true,
                },
              ],
              margin: [0, 0, 0, 12],
            };
          }
        }
        break;
      }

      case "divider": {
        const margins = docDefinition.pageMargins;
        const pageWidth = docDefinition.pageSize === "LETTER" ? 612 : 595;
        const availableWidth = pageWidth - margins[0] - margins[2];
        node = {
          canvas: [
            {
              type: "line",
              x1: 0,
              y1: 0,
              x2: availableWidth,
              y2: 0,
              lineWidth: block.settings?.thickness || 1,
              lineColor: block.settings?.color || "#cccccc",
            },
          ],
          margin: [0, 12, 0, 12],
        };
        break;
      }

      case "estimateLineItems": {
        const items = block.resolvedData?.items || [];
        const body = [];

        body.push([
          {
            text: "Description",
            style: "headerLabel",
            border: [false, false, false, false],
          },
          {
            text: "Qty",
            style: "headerLabel",
            alignment: "right",
            border: [false, false, false, false],
          },
          {
            text: "Unit",
            style: "headerLabel",
            border: [false, false, false, false],
          },
          {
            text: "Unit Price",
            style: "headerLabel",
            alignment: "right",
            border: [false, false, false, false],
          },
          {
            text: "Total",
            style: "headerLabel",
            alignment: "right",
            border: [false, false, false, false],
          },
        ]);

        if (items.length > 0) {
          items.forEach((item: any, idx: number) => {
            const fillColor = idx % 2 === 0 ? "#FAFAFA" : "#FFFFFF";
            body.push([
              {
                text: item.description || "",
                fillColor,
                border: [false, false, false, false],
                margin: [0, 4, 0, 4],
              },
              {
                text: item.quantity?.toString() || "",
                alignment: "right",
                fillColor,
                border: [false, false, false, false],
                margin: [0, 4, 0, 4],
              },
              {
                text: item.unit || "",
                fillColor,
                border: [false, false, false, false],
                margin: [0, 4, 0, 4],
              },
              {
                text: item.unitPrice || "",
                alignment: "right",
                fillColor,
                border: [false, false, false, false],
                margin: [0, 4, 0, 4],
              },
              {
                text: item.total || "",
                alignment: "right",
                fillColor,
                border: [false, false, false, false],
                margin: [0, 4, 0, 4],
              },
            ]);
          });
        } else {
          body.push([
            {
              text: "No items",
              colSpan: 5,
              alignment: "center",
              margin: [0, 10, 0, 10],
              color: "#999999",
              border: [false, false, false, false],
            },
            {},
            {},
            {},
            {},
          ]);
        }

        node = {
          table: {
            headerRows: 1,
            widths: ["*", "auto", "auto", "auto", "auto"],
            body: body,
          },
          layout: {
            hLineWidth: (i: number, node: any) =>
              i === 1 || i === node.table.body.length ? 1 : 0,
            vLineWidth: () => 0,
            hLineColor: () => "#E0E0E0",
          },
          margin: [0, 0, 0, 16],
        };
        break;
      }

      case "totals": {
        const d = block.resolvedData || {};
        node = {
          columns: [
            { text: "" },
            {
              width: 250,
              table: {
                widths: ["*", "auto"],
                body: [
                  [
                    {
                      text: "Subtotal:",
                      alignment: "right",
                      margin: [0, 4, 8, 4],
                      border: [false, false, false, false],
                    },
                    {
                      text: d.subtotal || "$0.00",
                      alignment: "right",
                      margin: [0, 4, 0, 4],
                      border: [false, false, false, false],
                    },
                  ],
                  [
                    {
                      text: "Tax:",
                      alignment: "right",
                      margin: [0, 4, 8, 4],
                      border: [false, false, false, true],
                      borderColor: ["#000", "#000", "#000", "#E0E0E0"],
                    },
                    {
                      text: d.tax || "$0.00",
                      alignment: "right",
                      margin: [0, 4, 0, 4],
                      border: [false, false, false, true],
                      borderColor: ["#000", "#000", "#000", "#E0E0E0"],
                    },
                  ],
                  [
                    {
                      text: "Total:",
                      alignment: "right",
                      bold: true,
                      fontSize: 13,
                      margin: [0, 6, 8, 4],
                      border: [false, false, false, false],
                    },
                    {
                      text: d.total || "$0.00",
                      alignment: "right",
                      bold: true,
                      fontSize: 13,
                      margin: [0, 6, 0, 4],
                      border: [false, false, false, false],
                    },
                  ],
                ],
              },
              layout: "lightHorizontalLines",
            },
          ],
          margin: [0, 0, 0, 24],
        };
        break;
      }

      case "notes":
      case "termsAndConditions": {
        node = {
          stack: [
            {
              text:
                block.settings?.title ||
                (block.type === "notes" ? "Notes" : "Terms & Conditions"),
              style: "sectionTitle",
            },
            {
              text: block.resolvedContent || "",
              fontSize: block.type === "notes" ? 11 : 9,
              color: block.type === "notes" ? "#333333" : "#555555",
            },
          ],
          margin: [0, 0, 0, 16],
        };
        break;
      }

      case "signatureBlock": {
        const lines = block.settings?.lines || [];
        const cols = lines.map((line: any) => ({
          stack: [
            {
              canvas: [
                {
                  type: "line",
                  x1: 0,
                  y1: 0,
                  x2: 200,
                  y2: 0,
                  lineWidth: 1,
                  lineColor: "#000000",
                },
              ],
              margin: [0, 40, 0, 4],
            },
            { text: line.label || "Signature", fontSize: 10, bold: true },
            line.showDate
              ? {
                  text: "Date: ________________",
                  fontSize: 10,
                  margin: [0, 8, 0, 0],
                }
              : null,
          ].filter(Boolean),
          unbreakable: true,
          margin: [0, 0, 20, 20],
        }));

        node = {
          columns: cols,
          margin: [0, 20, 0, 20],
          unbreakable: true,
        };
        break;
      }

      case "pageBreak":
        node = { text: "", pageBreak: "after" };
        break;
    }

    if (node) {
      docDefinition.content.push(node);
    }
  }

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = printer.createPdfKitDocument(docDefinition);
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err: any) => reject(err));
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}