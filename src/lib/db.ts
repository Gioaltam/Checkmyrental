// Database helper using Upstash Redis
import { Redis } from '@upstash/redis';
import type { Invoice, Inquiry, Booking, AvailabilitySchedule } from './types';

// Initialize Redis client
export function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variables');
  }

  return new Redis({ url, token });
}

// Strip null/undefined values before storing in Redis (hset doesn't support them)
function stripNulls(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== null && v !== undefined)
  );
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Generate invoice number (INV-YYYYMM-XXXX)
async function generateInvoiceNumber(): Promise<string> {
  const redis = getRedis();
  const date = new Date();
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const counterKey = `invoice_counter:${yearMonth}`;

  const count = await redis.incr(counterKey);
  // Set expiry to 2 months to clean up old counters
  await redis.expire(counterKey, 60 * 60 * 24 * 60);

  return `INV-${yearMonth}-${String(count).padStart(4, '0')}`;
}

// ==================== INQUIRIES ====================

export async function createInquiry(data: Omit<Inquiry, 'id' | 'createdAt' | 'status'>): Promise<Inquiry> {
  const redis = getRedis();
  const id = generateId();
  const inquiry: Inquiry = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
    status: 'new',
  };

  await redis.hset(`inquiry:${id}`, stripNulls(inquiry as Record<string, unknown>));
  await redis.lpush('inquiries:list', id);

  return inquiry;
}

export async function getInquiry(id: string): Promise<Inquiry | null> {
  const redis = getRedis();
  const data = await redis.hgetall(`inquiry:${id}`);
  if (!data || Object.keys(data).length === 0) return null;
  return data as unknown as Inquiry;
}

export async function listInquiries(limit = 50, offset = 0): Promise<Inquiry[]> {
  const redis = getRedis();
  const ids = await redis.lrange('inquiries:list', offset, offset + limit - 1);

  if (!ids.length) return [];

  const inquiries = await Promise.all(
    ids.map(id => getInquiry(id as string))
  );

  return inquiries.filter((i): i is Inquiry => i !== null);
}

export async function updateInquiryStatus(
  id: string,
  status: Inquiry['status'],
  invoiceId?: string
): Promise<void> {
  const redis = getRedis();
  const updates: Record<string, string> = { status };
  if (invoiceId) updates.invoiceId = invoiceId;
  await redis.hset(`inquiry:${id}`, updates);
}

// ==================== INVOICES ====================

export async function createInvoice(
  data: Omit<Invoice, 'id' | 'createdAt' | 'invoiceNumber'>
): Promise<Invoice> {
  const redis = getRedis();
  const id = generateId();
  const invoiceNumber = await generateInvoiceNumber();

  const invoice: Invoice = {
    ...data,
    id,
    invoiceNumber,
    createdAt: new Date().toISOString(),
  };

  await redis.hset(`invoice:${id}`, stripNulls(invoice as Record<string, unknown>));
  await redis.lpush('invoices:list', id);

  // If linked to inquiry, update inquiry status
  if (data.inquiryId) {
    await updateInquiryStatus(data.inquiryId, 'invoiced', id);
  }

  return invoice;
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const redis = getRedis();
  const data = await redis.hgetall(`invoice:${id}`);
  if (!data || Object.keys(data).length === 0) return null;
  return data as unknown as Invoice;
}

export async function getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | null> {
  const redis = getRedis();
  // Search through invoices to find by number
  const ids = await redis.lrange('invoices:list', 0, -1);

  for (const id of ids) {
    const invoice = await getInvoice(id as string);
    if (invoice?.invoiceNumber === invoiceNumber) {
      return invoice;
    }
  }

  return null;
}

export async function listInvoices(limit = 50, offset = 0): Promise<Invoice[]> {
  const redis = getRedis();
  const ids = await redis.lrange('invoices:list', offset, offset + limit - 1);

  if (!ids.length) return [];

  const invoices = await Promise.all(
    ids.map(id => getInvoice(id as string))
  );

  return invoices.filter((i): i is Invoice => i !== null);
}

export async function updateInvoice(
  id: string,
  updates: Partial<Pick<Invoice, 'status' | 'paidAt' | 'squareInvoiceId' | 'squarePaymentUrl' | 'customerName' | 'customerEmail' | 'customerPhone' | 'dueDate' | 'notes' | 'paymentMethod' | 'lastReminderSentAt' | 'reminderCount'>>
): Promise<void> {
  const redis = getRedis();
  await redis.hset(`invoice:${id}`, stripNulls(updates as Record<string, unknown>));
}

// ==================== STATS ====================

export async function getStats(): Promise<{
  totalInquiries: number;
  newInquiries: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingAmount: number;
}> {
  const redis = getRedis();

  const inquiryIds = await redis.lrange('inquiries:list', 0, -1);
  const invoiceIds = await redis.lrange('invoices:list', 0, -1);

  const inquiries = await Promise.all(inquiryIds.map(id => getInquiry(id as string)));
  const invoices = await Promise.all(invoiceIds.map(id => getInvoice(id as string)));

  const validInquiries = inquiries.filter((i): i is Inquiry => i !== null);
  const validInvoices = invoices.filter((i): i is Invoice => i !== null);

  return {
    totalInquiries: validInquiries.length,
    newInquiries: validInquiries.filter(i => i.status === 'new').length,
    totalInvoices: validInvoices.length,
    paidInvoices: validInvoices.filter(i => i.status === 'paid').length,
    pendingAmount: validInvoices
      .filter(i => i.status === 'draft' || i.status === 'sent' || i.status === 'viewed' || i.status === 'overdue')
      .reduce((sum, i) => sum + i.total, 0),
  };
}

// ==================== BOOKINGS ====================

// Generate secure booking token
function generateBookingToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function createBooking(
  data: Omit<Booking, 'id' | 'createdAt' | 'bookingToken' | 'status'>
): Promise<Booking> {
  const redis = getRedis();
  const id = generateId();
  const bookingToken = generateBookingToken();

  const booking: Booking = {
    ...data,
    id,
    bookingToken,
    createdAt: new Date().toISOString(),
    status: 'pending_tenant',
  };

  await redis.hset(`booking:${id}`, stripNulls(booking as Record<string, unknown>));
  await redis.lpush('bookings:list', id);
  // Index by token for lookup
  await redis.set(`booking:token:${bookingToken}`, id);
  // Index by invoice
  await redis.lpush(`bookings:invoice:${data.invoiceId}`, id);

  return booking;
}

export async function getBooking(id: string): Promise<Booking | null> {
  const redis = getRedis();
  const data = await redis.hgetall(`booking:${id}`);
  if (!data || Object.keys(data).length === 0) return null;
  return data as unknown as Booking;
}

export async function getBookingByToken(token: string): Promise<Booking | null> {
  const redis = getRedis();
  const id = await redis.get(`booking:token:${token}`);
  if (!id) return null;
  return getBooking(id as string);
}

export async function listBookings(
  limit = 50,
  offset = 0,
  statusFilter?: Booking['status']
): Promise<Booking[]> {
  const redis = getRedis();
  const ids = await redis.lrange('bookings:list', offset, offset + limit - 1);

  if (!ids.length) return [];

  const bookings = await Promise.all(
    ids.map(id => getBooking(id as string))
  );

  let result = bookings.filter((b): b is Booking => b !== null);

  if (statusFilter) {
    result = result.filter(b => b.status === statusFilter);
  }

  return result;
}

export async function getBookingsByInvoice(invoiceId: string): Promise<Booking[]> {
  const redis = getRedis();
  const ids = await redis.lrange(`bookings:invoice:${invoiceId}`, 0, -1);

  if (!ids.length) return [];

  const bookings = await Promise.all(
    ids.map(id => getBooking(id as string))
  );

  return bookings.filter((b): b is Booking => b !== null);
}

export async function updateBooking(
  id: string,
  updates: Partial<Pick<Booking, 'status' | 'scheduledDate' | 'scheduledTime' | 'smsBookingLinkSentAt' | 'smsConfirmationSentAt' | 'smsReminderSentAt' | 'smsFollowUpSentAt' | 'zipcode' | 'serviceZone' | 'rescheduleCount' | 'noShowCount' | 'notes' | 'googleCalendarEventId'>>
): Promise<void> {
  const redis = getRedis();
  await redis.hset(`booking:${id}`, stripNulls(updates as Record<string, unknown>));
}

// ==================== DATE INDEX (for efficient per-date lookups) ====================

// Add a booking to the date index when confirmed/rescheduled
export async function addBookingToDateIndex(bookingId: string, date: string): Promise<void> {
  const redis = getRedis();
  await redis.sadd(`bookings:date:${date}`, bookingId);
  // Auto-expire after 30 days to prevent unbounded growth
  await redis.expire(`bookings:date:${date}`, 60 * 60 * 24 * 30);
}

// Remove a booking from the date index when cancelled/completed/rescheduled away
export async function removeBookingFromDateIndex(bookingId: string, date: string): Promise<void> {
  const redis = getRedis();
  await redis.srem(`bookings:date:${date}`, bookingId);
}

// Get all bookings for a specific date (for zone-aware scheduling)
// Uses date index when available, falls back to full scan + lazy backfill
export async function getBookingsForDate(date: string): Promise<Booking[]> {
  const redis = getRedis();

  // Try date index first (fast path)
  const indexedIds = await redis.smembers(`bookings:date:${date}`);

  if (indexedIds.length > 0) {
    const bookings = await Promise.all(
      indexedIds.map(id => getBooking(id as string))
    );
    return bookings.filter((b): b is Booking =>
      b !== null &&
      b.scheduledDate === date &&
      (b.status === 'scheduled' || b.status === 'pending_tenant')
    );
  }

  // Fallback: scan all bookings (for pre-index data)
  const allBookings = await listBookings(200, 0);
  const matching = allBookings.filter(b =>
    b.scheduledDate === date &&
    (b.status === 'scheduled' || b.status === 'pending_tenant')
  );

  // Lazily populate index for future calls
  for (const b of matching) {
    await redis.sadd(`bookings:date:${date}`, b.id);
    await redis.expire(`bookings:date:${date}`, 60 * 60 * 24 * 30);
  }

  return matching;
}

// ==================== RECURRING BOOKINGS ====================

const FREQUENCY_INTERVAL_DAYS: Record<string, number> = {
  weekly: 7,
  bimonthly: 60,
  monthly: 30,
  quarterly: 90,
};

/**
 * Create the next recurring booking after a completed inspection.
 * Returns the new booking or null if frequency is one_time/custom/unknown.
 */
export async function createNextRecurringBooking(
  completedBooking: Booking
): Promise<Booking | null> {
  const frequency = completedBooking.inspectionFrequency;
  if (!frequency || frequency === 'one_time' || frequency === 'custom') {
    return null;
  }

  const intervalDays = FREQUENCY_INTERVAL_DAYS[frequency];
  if (!intervalDays) return null;

  return createBooking({
    invoiceId: completedBooking.invoiceId,
    propertyIndex: completedBooking.propertyIndex,
    propertyAddress: completedBooking.propertyAddress,
    tenantName: completedBooking.tenantName,
    tenantPhone: completedBooking.tenantPhone,
    landlordName: completedBooking.landlordName,
    landlordEmail: completedBooking.landlordEmail,
    inspectionFrequency: completedBooking.inspectionFrequency,
  });
}

// ==================== AVAILABILITY ====================

const DEFAULT_AVAILABILITY: AvailabilitySchedule = {
  weeklySlots: [
    { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },  // Monday
    { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },  // Tuesday
    { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },  // Wednesday
    { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },  // Thursday
    { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },  // Friday
    { dayOfWeek: 6, startTime: '09:00', endTime: '17:00' },  // Saturday
  ],
  blockedDates: [],
  slotDuration: 30,      // 30 min slots for high volume
  minAdvanceHours: 24,   // FL law: 24 hour notice
  maxAdvanceDays: 14,    // 2 weeks out
  enableZoneFiltering: true,   // Enable travel time filtering
  travelBufferMinutes: 0,      // Extra buffer on top of travel time
  maxBookingsPerDay: 7,        // Weekday cap (1 inspector)
  multiUnitMaxBookings: 12,    // Cap when same-address bookings exist
  weekendMaxBookings: 12,      // Weekend cap (2 inspectors)
};

export async function getAvailability(): Promise<AvailabilitySchedule> {
  const redis = getRedis();
  const data = await redis.get('availability:schedule');

  if (!data) {
    return DEFAULT_AVAILABILITY;
  }

  return data as AvailabilitySchedule;
}

export async function setAvailability(schedule: AvailabilitySchedule): Promise<void> {
  const redis = getRedis();
  await redis.set('availability:schedule', JSON.stringify(schedule));
}

// Atomic slot lock to prevent double-booking
export async function acquireSlotLock(date: string, time: string, bookingId: string): Promise<boolean> {
  const redis = getRedis();
  const lockKey = `slot:lock:${date}:${time}`;
  const result = await redis.set(lockKey, bookingId, { nx: true, ex: 300 });
  return result === 'OK';
}

export async function releaseSlotLock(date: string, time: string): Promise<void> {
  const redis = getRedis();
  await redis.del(`slot:lock:${date}:${time}`);
}

// List active slot locks
export async function listSlotLocks(): Promise<Array<{ date: string; time: string; bookingId: string; ttl: number }>> {
  const redis = getRedis();
  const locks: Array<{ date: string; time: string; bookingId: string; ttl: number }> = [];

  // Scan for slot:lock:* keys
  let cursor = 0;
  do {
    const result = await redis.scan(cursor, { match: 'slot:lock:*', count: 100 });
    cursor = result[0] as number;
    const keys = result[1] as string[];
    for (const key of keys) {
      const bookingId = await redis.get(key) as string;
      const ttl = await redis.ttl(key);
      const parts = key.replace('slot:lock:', '').split(':');
      if (parts.length >= 2) {
        locks.push({ date: parts[0], time: parts[1], bookingId: bookingId || '', ttl });
      }
    }
  } while (cursor !== 0);

  return locks;
}

// Get booked slots for a specific date (uses date index via getBookingsForDate)
export async function getBookedSlotsForDate(date: string): Promise<string[]> {
  const bookings = await getBookingsForDate(date);
  return bookings
    .filter(b => b.status === 'scheduled')
    .map(b => b.scheduledTime!)
    .filter(Boolean);
}

// ==================== BOOKING STATS ====================

export async function getBookingStats(): Promise<{
  pendingBookings: number;
  scheduledThisWeek: number;
  completedThisMonth: number;
}> {
  const bookings = await listBookings(200, 0);

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    pendingBookings: bookings.filter(b => b.status === 'pending_tenant').length,
    scheduledThisWeek: bookings.filter(b => {
      if (b.status !== 'scheduled' || !b.scheduledDate) return false;
      const date = new Date(b.scheduledDate);
      return date >= startOfWeek && date < endOfWeek;
    }).length,
    completedThisMonth: bookings.filter(b => {
      if (b.status !== 'completed' || !b.scheduledDate) return false;
      const date = new Date(b.scheduledDate);
      return date >= startOfMonth && date <= endOfMonth;
    }).length,
  };
}
