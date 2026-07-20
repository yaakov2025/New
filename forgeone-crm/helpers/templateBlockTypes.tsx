import { nanoid } from 'nanoid';

export type BlockType =
  | 'header'
  | 'orgBranding'
  | 'customerInfo'
  | 'propertyInfo'
  | 'jobInfo'
  | 'insuranceInfo'
  | 'text'
  | 'heading'
  | 'columns'
  | 'image'
  | 'divider'
  | 'estimateLineItems'
  | 'totals'
  | 'notes'
  | 'termsAndConditions'
  | 'signatureBlock'
  | 'pageBreak'
  | 'footer';

export interface TemplateBlock {
  id: string;
  type: BlockType;
  label: string;
  content?: string;
  settings: Record<string, any>;
}

export interface TemplateSettings {
  pageSize: 'LETTER';
  margins: { top: number; right: number; bottom: number; left: number };
  headerContent?: string;
  footerContent?: string;
  showPageNumbers: boolean;
  pageNumberPosition: 'left' | 'center' | 'right';
}

export const DEFAULT_TEMPLATE_SETTINGS: TemplateSettings = {
  pageSize: 'LETTER',
  margins: { top: 72, right: 72, bottom: 72, left: 72 }, // 1 inch defaults
  showPageNumbers: true,
  pageNumberPosition: 'center',
};

export interface BlockTypeDefinition {
  type: BlockType;
  label: string;
  description: string;
  icon: string;
  category: 'layout' | 'content' | 'data' | 'document';
  defaultSettings: Record<string, any>;
  defaultContent?: string;
}

export const BLOCK_TYPE_DEFINITIONS: BlockTypeDefinition[] = [
  // Layout
  {
    type: 'header',
    label: 'Header',
    description: 'Document header with optional logo, title, and organization info',
    icon: 'panel-top',
    category: 'layout',
    defaultSettings: { showLogo: true, showOrgName: true, showOrgAddress: true, showDocumentTitle: true, alignment: 'left' }
  },
  {
    type: 'footer',
    label: 'Footer',
    description: 'Document footer with optional page numbers',
    icon: 'panel-bottom',
    category: 'layout',
    defaultSettings: { showPageNumbers: true, content: '', alignment: 'center' }
  },
  {
    type: 'columns',
    label: 'Columns',
    description: 'Multi-column layout block',
    icon: 'columns',
    category: 'layout',
    defaultSettings: { columnCount: 2, gap: 20, columns: [{ content: '' }, { content: '' }] }
  },
  {
    type: 'divider',
    label: 'Divider',
    description: 'Horizontal line to separate content',
    icon: 'minus',
    category: 'layout',
    defaultSettings: { style: 'solid', thickness: 1, color: '#cccccc' }
  },
  {
    type: 'pageBreak',
    label: 'Page Break',
    description: 'Forces subsequent content to the next page',
    icon: 'file-dashed',
    category: 'layout',
    defaultSettings: {}
  },

  // Content
  {
    type: 'heading',
    label: 'Heading',
    description: 'Section heading text',
    icon: 'heading',
    category: 'content',
    defaultSettings: { level: 1, alignment: 'left' },
    defaultContent: 'New Heading'
  },
  {
    type: 'text',
    label: 'Text',
    description: 'Standard text block with formatting support',
    icon: 'type',
    category: 'content',
    defaultSettings: { fontSize: 11, alignment: 'left', bold: false, italic: false },
    defaultContent: 'Enter your text here...'
  },
  {
    type: 'image',
    label: 'Image',
    description: 'Image placeholder or uploaded file',
    icon: 'image',
    category: 'content',
    defaultSettings: { width: 200, alignment: 'center', caption: '' }
  },
  {
    type: 'notes',
    label: 'Notes',
    description: 'A block dedicated to additional notes',
    icon: 'sticky-note',
    category: 'content',
    defaultSettings: { title: 'Notes', content: '' },
    defaultContent: '{{job.notes}}'
  },
  {
    type: 'termsAndConditions',
    label: 'Terms & Conditions',
    description: 'Standard terms block',
    icon: 'scale',
    category: 'content',
    defaultSettings: { title: 'Terms and Conditions', content: '' }
  },

  // Data
  {
    type: 'orgBranding',
    label: 'Organization Branding',
    description: 'Details about your own company',
    icon: 'building-2',
    category: 'data',
    defaultSettings: { showLogo: true, showName: true, showAddress: true, showPhone: true, showEmail: true, showWebsite: false }
  },
  {
    type: 'customerInfo',
    label: 'Customer Info',
    description: 'Customer contact details',
    icon: 'user',
    category: 'data',
    defaultSettings: { showName: true, showEmail: true, showPhone: true, showAddress: true, title: 'Customer Information' }
  },
  {
    type: 'propertyInfo',
    label: 'Property Info',
    description: 'Job location and property details',
    icon: 'home',
    category: 'data',
    defaultSettings: { showName: true, showAddress: true, showPropertyType: true, title: 'Property Information' }
  },
  {
    type: 'jobInfo',
    label: 'Job Info',
    description: 'General job details',
    icon: 'briefcase',
    category: 'data',
    defaultSettings: { showTitle: true, showJobNumber: true, showStatus: true, showType: true, showDates: true, showValue: false, title: 'Job Information' }
  },
  {
    type: 'insuranceInfo',
    label: 'Insurance Info',
    description: 'Claim and carrier details',
    icon: 'shield',
    category: 'data',
    defaultSettings: { showClaimNumber: true, showPolicyNumber: true, showCarrier: true, showAdjuster: true, showDateOfLoss: true, showDeductible: false, title: 'Insurance Information' }
  },
  {
    type: 'estimateLineItems',
    label: 'Estimate Line Items',
    description: 'Table of line items for estimates or contracts',
    icon: 'list',
    category: 'data',
    defaultSettings: { showDescription: true, showQuantity: true, showUnit: true, showUnitPrice: true, showLineTotal: true, showCategory: false, showNotes: false }
  },
  {
    type: 'totals',
    label: 'Totals Block',
    description: 'Subtotal, tax, and grand total overview',
    icon: 'calculator',
    category: 'data',
    defaultSettings: { showSubtotal: true, showTax: true, showTotal: true, showDiscount: false }
  },

  // Document
  {
    type: 'signatureBlock',
    label: 'Signature Block',
    description: 'Signature lines with date placeholders',
    icon: 'pen-tool',
    category: 'document',
    defaultSettings: { lines: [{ label: 'Customer Signature', showDate: true }, { label: 'Company Representative', showDate: true }] }
  }
];

export interface TemplateDataContext {
  orgId: number;
  customerId?: number;
  jobId?: number;
  contactId?: number;
  propertyId?: number;
  leadId?: number;
  opportunityId?: number;
  currentUserId?: number;
  useSampleData?: boolean;
  documentNumber?: string;
  documentType?: string;
}

export interface ResolvedBlock extends TemplateBlock {
  resolvedContent?: string;
  resolvedData?: Record<string, any>;
  warnings?: string[];
}

export function getBlockTypeDefinition(type: BlockType): BlockTypeDefinition | undefined {
   return BLOCK_TYPE_DEFINITIONS.find((def) => def.type === type);
 }

export function createBlock(type: BlockType, overrides?: Partial<TemplateBlock>): TemplateBlock {
  const def = getBlockTypeDefinition(type);
  if (!def) {
    throw new Error(`Invalid block type: ${type}`);
  }

  return {
    id: nanoid(),
    type,
    label: def.label,
    settings: { ...def.defaultSettings },
    content: def.defaultContent,
    ...overrides,
  };
}