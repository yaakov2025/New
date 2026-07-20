export interface TagDefinition {
  key: string;
  label: string;
  category: string;
  format?: 'text' | 'currency' | 'date' | 'phone' | 'address' | 'url';
  fallback?: string;
}

export const TAG_CATEGORIES = [
  'Organization',
  'Customer',
  'Contact',
  'Property',
  'Lead',
  'Opportunity',
  'Job',
  'Insurance',
  'Carrier',
  'Adjuster',
  'Estimate',
  'Contract',
  'Work Order',
  'Signatures',
  'Assigned User',
  'Current User',
  'Dates'
] as const;

export const templateTagRegistry: TagDefinition[] = [
  // Organization
  { key: 'organization.name', label: 'Organization Name', category: 'Organization' },
  { key: 'organization.logo', label: 'Organization Logo', category: 'Organization', format: 'url' },
  { key: 'organization.phone', label: 'Organization Phone', category: 'Organization', format: 'phone' },
  { key: 'organization.email', label: 'Organization Email', category: 'Organization' },
  { key: 'organization.address', label: 'Organization Address', category: 'Organization' },
  { key: 'organization.city', label: 'Organization City', category: 'Organization' },
  { key: 'organization.state', label: 'Organization State', category: 'Organization' },
  { key: 'organization.zip', label: 'Organization ZIP', category: 'Organization' },
  { key: 'organization.website', label: 'Organization Website', category: 'Organization' },
  { key: 'organization.fullAddress', label: 'Organization Full Address', category: 'Organization', format: 'address' },

  // Customer
  { key: 'customer.name', label: 'Customer Name', category: 'Customer' },
  { key: 'customer.email', label: 'Customer Email', category: 'Customer' },
  { key: 'customer.phone', label: 'Customer Phone', category: 'Customer', format: 'phone' },
  { key: 'customer.address', label: 'Customer Address', category: 'Customer' },
  { key: 'customer.city', label: 'Customer City', category: 'Customer' },
  { key: 'customer.state', label: 'Customer State', category: 'Customer' },
  { key: 'customer.zip', label: 'Customer ZIP', category: 'Customer' },
  { key: 'customer.fullAddress', label: 'Customer Full Address', category: 'Customer', format: 'address' },
  { key: 'customer.type', label: 'Customer Type', category: 'Customer' },

  // Contact
  { key: 'contact.firstName', label: 'Contact First Name', category: 'Contact' },
  { key: 'contact.lastName', label: 'Contact Last Name', category: 'Contact' },
  { key: 'contact.fullName', label: 'Contact Full Name', category: 'Contact' },
  { key: 'contact.email', label: 'Contact Email', category: 'Contact' },
  { key: 'contact.phone', label: 'Contact Phone', category: 'Contact', format: 'phone' },
  { key: 'contact.title', label: 'Contact Title', category: 'Contact' },

  // Property
  { key: 'property.name', label: 'Property Name', category: 'Property' },
  { key: 'property.address', label: 'Property Address', category: 'Property' },
  { key: 'property.city', label: 'Property City', category: 'Property' },
  { key: 'property.state', label: 'Property State', category: 'Property' },
  { key: 'property.zip', label: 'Property ZIP', category: 'Property' },
  { key: 'property.fullAddress', label: 'Property Full Address', category: 'Property', format: 'address' },
  { key: 'property.propertyType', label: 'Property Type', category: 'Property' },

  // Lead
  { key: 'lead.name', label: 'Lead Name', category: 'Lead' },
  { key: 'lead.source', label: 'Lead Source', category: 'Lead' },
  { key: 'lead.estimatedValue', label: 'Lead Estimated Value', category: 'Lead', format: 'currency' },
  { key: 'lead.stage', label: 'Lead Stage', category: 'Lead' },
  { key: 'lead.notes', label: 'Lead Notes', category: 'Lead' },

  // Opportunity
  { key: 'opportunity.name', label: 'Opportunity Name', category: 'Opportunity' },
  { key: 'opportunity.value', label: 'Opportunity Value', category: 'Opportunity', format: 'currency' },
  { key: 'opportunity.stage', label: 'Opportunity Stage', category: 'Opportunity' },
  { key: 'opportunity.expectedCloseDate', label: 'Expected Close Date', category: 'Opportunity', format: 'date' },
  { key: 'opportunity.notes', label: 'Opportunity Notes', category: 'Opportunity' },

  // Job
  { key: 'job.title', label: 'Job Title', category: 'Job' },
  { key: 'job.number', label: 'Job Number', category: 'Job' },
  { key: 'job.status', label: 'Job Status', category: 'Job' },
  { key: 'job.jobType', label: 'Job Type', category: 'Job' },
  { key: 'job.startDate', label: 'Job Start Date', category: 'Job', format: 'date' },
  { key: 'job.targetCompletionDate', label: 'Target Completion Date', category: 'Job', format: 'date' },
  { key: 'job.estimatedValue', label: 'Job Estimated Value', category: 'Job', format: 'currency' },
  { key: 'job.nextStep', label: 'Job Next Step', category: 'Job' },
  { key: 'job.notes', label: 'Job Notes', category: 'Job' },
  { key: 'job.needsReview', label: 'Job Needs Review', category: 'Job' },

  // Insurance
  { key: 'insurance.claimNumber', label: 'Claim Number', category: 'Insurance' },
  { key: 'insurance.policyNumber', label: 'Policy Number', category: 'Insurance' },
  { key: 'insurance.carrierName', label: 'Carrier Name', category: 'Insurance' },
  { key: 'insurance.carrierPhone', label: 'Carrier Phone', category: 'Insurance', format: 'phone' },
  { key: 'insurance.carrierEmail', label: 'Carrier Email', category: 'Insurance' },
  { key: 'insurance.adjusterName', label: 'Adjuster Name', category: 'Insurance' },
  { key: 'insurance.adjusterPhone', label: 'Adjuster Phone', category: 'Insurance', format: 'phone' },
  { key: 'insurance.adjusterEmail', label: 'Adjuster Email', category: 'Insurance' },
  { key: 'insurance.dateOfLoss', label: 'Date of Loss', category: 'Insurance', format: 'date' },
  { key: 'insurance.deductible', label: 'Deductible', category: 'Insurance', format: 'currency' },
  { key: 'insurance.coverageType', label: 'Coverage Type', category: 'Insurance' },

  // Carrier
  { key: 'carrier.name', label: 'Carrier Name', category: 'Carrier' },
  { key: 'carrier.phone', label: 'Carrier Phone', category: 'Carrier', format: 'phone' },
  { key: 'carrier.email', label: 'Carrier Email', category: 'Carrier' },

  // Adjuster
  { key: 'adjuster.name', label: 'Adjuster Name', category: 'Adjuster' },
  { key: 'adjuster.phone', label: 'Adjuster Phone', category: 'Adjuster', format: 'phone' },
  { key: 'adjuster.email', label: 'Adjuster Email', category: 'Adjuster' },

  // Estimate
  { key: 'estimate.number', label: 'Estimate Number', category: 'Estimate' },
  { key: 'estimate.issueDate', label: 'Estimate Issue Date', category: 'Estimate', format: 'date' },
  { key: 'estimate.total', label: 'Estimate Total', category: 'Estimate', format: 'currency' },
  { key: 'estimate.subtotal', label: 'Estimate Subtotal', category: 'Estimate', format: 'currency' },
  { key: 'estimate.tax', label: 'Estimate Tax', category: 'Estimate', format: 'currency' },
  { key: 'estimate.notes', label: 'Estimate Notes', category: 'Estimate' },

  // Contract
  { key: 'contract.number', label: 'Contract Number', category: 'Contract' },
  { key: 'contract.amount', label: 'Contract Amount', category: 'Contract', format: 'currency' },
  { key: 'contract.startDate', label: 'Contract Start Date', category: 'Contract', format: 'date' },
  { key: 'contract.endDate', label: 'Contract End Date', category: 'Contract', format: 'date' },
  { key: 'contract.notes', label: 'Contract Notes', category: 'Contract' },

  // Work Order
  { key: 'workOrder.number', label: 'Work Order Number', category: 'Work Order' },
  { key: 'workOrder.title', label: 'Work Order Title', category: 'Work Order' },
  { key: 'workOrder.notes', label: 'Work Order Notes', category: 'Work Order' },

  // Signatures
  { key: 'signature.customerName', label: 'Customer Signature Name', category: 'Signatures' },
  { key: 'signature.customerDate', label: 'Customer Signature Date', category: 'Signatures', format: 'date' },
  { key: 'signature.companyRepName', label: 'Company Rep Signature Name', category: 'Signatures' },
  { key: 'signature.companyRepDate', label: 'Company Rep Signature Date', category: 'Signatures', format: 'date' },

  // Assigned User
  { key: 'assignedUser.name', label: 'Assigned User Name', category: 'Assigned User' },
  { key: 'assignedUser.email', label: 'Assigned User Email', category: 'Assigned User' },

  // Current User
  { key: 'currentUser.name', label: 'Current User Name', category: 'Current User' },
  { key: 'currentUser.email', label: 'Current User Email', category: 'Current User' },

  // Dates
  { key: 'dates.today', label: 'Today', category: 'Dates', format: 'date' },
  { key: 'dates.currentDate', label: 'Current Date', category: 'Dates', format: 'date' },
  { key: 'dates.currentTime', label: 'Current Time', category: 'Dates' },
  { key: 'dates.currentDateTime', label: 'Current Date & Time', category: 'Dates' },
];

export function getTagsByCategory(category: string): TagDefinition[] {
  return templateTagRegistry.filter((tag) => tag.category === category);
}

export function getTagDefinition(key: string): TagDefinition | undefined {
  return templateTagRegistry.find((tag) => tag.key === key);
}

export function formatTagValue(value: any, format?: TagDefinition['format']): string {
  if (value === null || value === undefined || value === '') {
    const def = Object.values(templateTagRegistry).find(t => t.format === format);
    return def?.fallback ?? '';
  }

  try {
    switch (format) {
      case 'currency': {
        const num = Number(value);
        if (isNaN(num)) return String(value);
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
      }
      case 'date': {
        const date = new Date(value);
        if (isNaN(date.getTime())) return String(value);
        return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
      }
      case 'phone': {
        const cleaned = String(value).replace(/\D/g, '');
        if (cleaned.length === 10) {
          return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        }
        return String(value);
      }
      case 'address':
      case 'url':
      case 'text':
      default:
        return String(value);
    }
  } catch (err) {
    console.error('Error formatting tag value:', err);
    return String(value);
  }
}