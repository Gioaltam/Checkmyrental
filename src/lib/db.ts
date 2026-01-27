// Database helper using Upstash Redis
import { Redis } from '@upstash/redis';
import type { Invoice, Inquiry } from './types';

// Initialize Redis client
function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variables');
  }

  return new Redis({ url, token });
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

  await redis.hset(`inquiry:${id}`, inquiry as Record<string, unknown>);
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

  await redis.hset(`invoice:${id}`, invoice as Record<string, unknown>);
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
  updates: Partial<Pick<Invoice, 'status' | 'paidAt' | 'squareInvoiceId' | 'squarePaymentUrl'>>
): Promise<void> {
  const redis = getRedis();
  await redis.hset(`invoice:${id}`, updates as Record<string, unknown>);
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
      .filter(i => i.status === 'sent' || i.status === 'viewed' || i.status === 'overdue')
      .reduce((sum, i) => sum + i.total, 0),
  };
}
