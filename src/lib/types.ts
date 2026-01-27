// Invoice and Inquiry types for CheckMyRental

export interface Property {
  type: 'apartment' | 'single_family' | 'multifamily';
  address: string;
  tenantName?: string;
  tenantPhone?: string;
  price: number;
}

export interface Inquiry {
  id: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  properties: Property[];
  preferredTimeframe: string;
  inspectionFrequency: string;
  paymentPreference: 'zelle' | 'card';
  notes?: string;
  total: number;
  status: 'new' | 'invoiced' | 'archived';
  invoiceId?: string;
}

export interface Invoice {
  id: string;
  createdAt: string;
  inquiryId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  properties: Property[];
  subtotal: number;
  processingFee?: number;
  total: number;
  paymentMethod: 'square' | 'zelle';
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string;
  squareInvoiceId?: string;
  squarePaymentUrl?: string;
  paidAt?: string;
  notes?: string;
  invoiceNumber: string;
}

// Pricing constants
export const PRICES = {
  card: {
    apartment: 72.33,
    single_family: 103.20,
    multifamily: 170.09,
  },
  zelle: {
    apartment: 70.00,
    single_family: 100.00,
    multifamily: 165.00,
  },
} as const;

export const PROPERTY_TYPE_LABELS: Record<Property['type'], string> = {
  apartment: 'Apartment',
  single_family: 'Single Family Home',
  multifamily: 'Multifamily Home',
};

export const TIMEFRAME_LABELS: Record<string, string> = {
  asap: 'As soon as possible',
  this_week: 'This week',
  next_week: 'Next week',
  this_month: 'Within this month',
  flexible: 'Flexible',
};

export const FREQUENCY_LABELS: Record<string, string> = {
  quarterly: 'Quarterly',
  monthly: 'Monthly',
  bimonthly: 'Every 2 Months',
  weekly: 'Weekly',
  one_time: 'One Time',
  custom: 'Custom Schedule',
};
