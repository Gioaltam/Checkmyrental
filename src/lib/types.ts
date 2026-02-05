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
  inspectionFrequency?: string;
  invoiceNumber: string;
  lastReminderSentAt?: string;
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

// ==================== BOOKING TYPES ====================

export type ServiceZone = 'TAMPA' | 'NORTH' | 'CENTRAL' | 'SOUTH' | 'EAST' | 'UNKNOWN';

export interface Booking {
  id: string;
  createdAt: string;
  // Link to invoice/property
  invoiceId: string;
  propertyIndex: number;  // Which property in the invoice (0-based)
  propertyAddress: string;
  // Location zone for route optimization
  zipcode?: string;
  serviceZone?: ServiceZone;
  // Tenant info
  tenantName: string;
  tenantPhone: string;
  // Landlord info (from invoice)
  landlordName: string;
  landlordEmail: string;
  // Scheduling
  scheduledDate?: string;  // ISO date: "2024-02-15"
  scheduledTime?: string;  // "09:00"
  // Status
  status: 'pending_tenant' | 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  // SMS tracking
  smsBookingLinkSentAt?: string;
  smsConfirmationSentAt?: string;
  smsReminderSentAt?: string;
  // Booking token for security (unique token in booking URL)
  bookingToken: string;
  // Recurring inspection frequency
  inspectionFrequency?: string;
  // Rescheduling
  rescheduleCount?: number;
  // Google Calendar
  googleCalendarEventId?: string;
  // Admin notes
  notes?: string;
}

export interface WeeklySlot {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;  // 0=Sunday, 6=Saturday
  startTime: string;  // "09:00"
  endTime: string;    // "17:00"
}

export interface AvailabilitySchedule {
  // Recurring weekly slots
  weeklySlots: WeeklySlot[];
  // Blocked dates (holidays, vacations)
  blockedDates: string[];  // ISO dates
  // Slot duration in minutes
  slotDuration: number;  // Default 60
  // Advance booking window
  minAdvanceHours: number;  // Default 24 for FL law
  maxAdvanceDays: number;   // Default 14
  // Zone-based scheduling settings
  enableZoneFiltering?: boolean;  // Default true - filter slots by travel time
  travelBufferMinutes?: number;   // Default 0 - extra buffer on top of travel time
}

export interface TimeSlot {
  date: string;      // ISO date: "2024-02-15"
  startTime: string; // "09:00"
  endTime: string;   // "10:00"
  available: boolean;
  preferred?: boolean;  // True if same-zone as existing bookings (better for route efficiency)
}

export const BOOKING_STATUS_LABELS: Record<Booking['status'], string> = {
  pending_tenant: 'Awaiting Tenant',
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

export const DAY_LABELS: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

// ==================== INSPECTION TYPES ====================

export type ItemCondition = 'good' | 'fair' | 'poor' | 'damaged';

export interface InspectionItem {
  name: string;
  condition?: ItemCondition;
  notes?: string;
  photoUrls?: string[];
}

export interface InspectionRoom {
  name: string;
  items: InspectionItem[];
}

export interface InspectionReport {
  id: string;
  createdAt: string;
  bookingId: string;
  inspectorName: string;
  propertyAddress: string;
  tenantName: string;
  landlordName: string;
  landlordEmail: string;
  rooms: InspectionRoom[];
  overallNotes?: string;
  status: 'in_progress' | 'completed';
  completedAt?: string;
  reportPdfUrl?: string;
  reportEmailSentAt?: string;
  inspectionToken: string;
}

// Room templates by property type
export const ROOM_TEMPLATES: Record<Property['type'], InspectionRoom[]> = {
  apartment: [
    {
      name: 'Kitchen',
      items: [
        { name: 'Countertops' }, { name: 'Sink & Faucet' }, { name: 'Appliances' },
        { name: 'Cabinets' }, { name: 'Flooring' }, { name: 'Walls & Ceiling' },
      ],
    },
    {
      name: 'Bathroom',
      items: [
        { name: 'Toilet' }, { name: 'Sink & Faucet' }, { name: 'Tub / Shower' },
        { name: 'Tile & Grout' }, { name: 'Ventilation' }, { name: 'Walls & Ceiling' },
      ],
    },
    {
      name: 'Bedroom',
      items: [
        { name: 'Walls & Ceiling' }, { name: 'Flooring' }, { name: 'Windows' },
        { name: 'Closet' }, { name: 'Doors' }, { name: 'Smoke Detector' },
      ],
    },
    {
      name: 'Living Room',
      items: [
        { name: 'Walls & Ceiling' }, { name: 'Flooring' }, { name: 'Windows' },
        { name: 'HVAC Vents' }, { name: 'Outlets & Switches' },
      ],
    },
    {
      name: 'Entry / Hallway',
      items: [
        { name: 'Front Door & Lock' }, { name: 'Flooring' }, { name: 'Lighting' },
      ],
    },
  ],
  single_family: [
    {
      name: 'Kitchen',
      items: [
        { name: 'Countertops' }, { name: 'Sink & Faucet' }, { name: 'Appliances' },
        { name: 'Cabinets' }, { name: 'Flooring' }, { name: 'Walls & Ceiling' },
      ],
    },
    {
      name: 'Bathroom 1',
      items: [
        { name: 'Toilet' }, { name: 'Sink & Faucet' }, { name: 'Tub / Shower' },
        { name: 'Tile & Grout' }, { name: 'Ventilation' }, { name: 'Walls & Ceiling' },
      ],
    },
    {
      name: 'Bathroom 2',
      items: [
        { name: 'Toilet' }, { name: 'Sink & Faucet' }, { name: 'Tub / Shower' },
        { name: 'Tile & Grout' }, { name: 'Ventilation' }, { name: 'Walls & Ceiling' },
      ],
    },
    {
      name: 'Bedroom 1',
      items: [
        { name: 'Walls & Ceiling' }, { name: 'Flooring' }, { name: 'Windows' },
        { name: 'Closet' }, { name: 'Doors' }, { name: 'Smoke Detector' },
      ],
    },
    {
      name: 'Bedroom 2',
      items: [
        { name: 'Walls & Ceiling' }, { name: 'Flooring' }, { name: 'Windows' },
        { name: 'Closet' }, { name: 'Doors' }, { name: 'Smoke Detector' },
      ],
    },
    {
      name: 'Living Room',
      items: [
        { name: 'Walls & Ceiling' }, { name: 'Flooring' }, { name: 'Windows' },
        { name: 'HVAC Vents' }, { name: 'Outlets & Switches' },
      ],
    },
    {
      name: 'Exterior',
      items: [
        { name: 'Front Door & Lock' }, { name: 'Siding / Paint' }, { name: 'Roof (visible)' },
        { name: 'Gutters' }, { name: 'Walkways' }, { name: 'Landscaping' },
      ],
    },
    {
      name: 'Garage',
      items: [
        { name: 'Door & Opener' }, { name: 'Flooring' }, { name: 'Walls' }, { name: 'Lighting' },
      ],
    },
  ],
  multifamily: [
    {
      name: 'Kitchen',
      items: [
        { name: 'Countertops' }, { name: 'Sink & Faucet' }, { name: 'Appliances' },
        { name: 'Cabinets' }, { name: 'Flooring' }, { name: 'Walls & Ceiling' },
      ],
    },
    {
      name: 'Bathroom',
      items: [
        { name: 'Toilet' }, { name: 'Sink & Faucet' }, { name: 'Tub / Shower' },
        { name: 'Tile & Grout' }, { name: 'Ventilation' }, { name: 'Walls & Ceiling' },
      ],
    },
    {
      name: 'Bedroom',
      items: [
        { name: 'Walls & Ceiling' }, { name: 'Flooring' }, { name: 'Windows' },
        { name: 'Closet' }, { name: 'Doors' }, { name: 'Smoke Detector' },
      ],
    },
    {
      name: 'Living Room',
      items: [
        { name: 'Walls & Ceiling' }, { name: 'Flooring' }, { name: 'Windows' },
        { name: 'HVAC Vents' }, { name: 'Outlets & Switches' },
      ],
    },
    {
      name: 'Common Areas',
      items: [
        { name: 'Hallways' }, { name: 'Stairways' }, { name: 'Mailboxes' },
        { name: 'Parking Area' }, { name: 'Laundry Room' },
      ],
    },
    {
      name: 'Exterior',
      items: [
        { name: 'Entry Doors & Locks' }, { name: 'Siding / Paint' }, { name: 'Roof (visible)' },
        { name: 'Gutters' }, { name: 'Walkways' }, { name: 'Landscaping' },
      ],
    },
  ],
};

export const CONDITION_LABELS: Record<ItemCondition, string> = {
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  damaged: 'Damaged',
};
