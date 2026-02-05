// Inspection CRUD operations using Upstash Redis
import { getRedis } from './db';
import type { InspectionReport, InspectionRoom } from './types';

function generateId(): string {
  return `insp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function generateToken(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Create a new inspection
export async function createInspection(data: {
  bookingId: string;
  inspectorName: string;
  propertyAddress: string;
  tenantName: string;
  landlordName: string;
  landlordEmail: string;
  rooms: InspectionRoom[];
}): Promise<InspectionReport> {
  const redis = getRedis();
  const id = generateId();
  const inspectionToken = generateToken();

  const inspection: InspectionReport = {
    id,
    createdAt: new Date().toISOString(),
    bookingId: data.bookingId,
    inspectorName: data.inspectorName,
    propertyAddress: data.propertyAddress,
    tenantName: data.tenantName,
    landlordName: data.landlordName,
    landlordEmail: data.landlordEmail,
    rooms: data.rooms,
    status: 'in_progress',
    inspectionToken,
  };

  // Store as a single JSON blob (inspection data is complex/nested)
  await redis.set(`inspection:${id}`, JSON.stringify(inspection));
  await redis.lpush('inspections:list', id);
  // Index by token
  await redis.set(`inspection:token:${inspectionToken}`, id);
  // Index by booking
  await redis.set(`inspection:booking:${data.bookingId}`, id);

  return inspection;
}

// Get inspection by ID
export async function getInspection(id: string): Promise<InspectionReport | null> {
  const redis = getRedis();
  const data = await redis.get(`inspection:${id}`);
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) : data as InspectionReport;
}

// Get inspection by token
export async function getInspectionByToken(token: string): Promise<InspectionReport | null> {
  const redis = getRedis();
  const id = await redis.get(`inspection:token:${token}`);
  if (!id) return null;
  return getInspection(id as string);
}

// Get inspection by booking ID
export async function getInspectionByBooking(bookingId: string): Promise<InspectionReport | null> {
  const redis = getRedis();
  const id = await redis.get(`inspection:booking:${bookingId}`);
  if (!id) return null;
  return getInspection(id as string);
}

// Update inspection data (rooms, notes, status, etc.)
export async function updateInspection(
  id: string,
  updates: Partial<Pick<InspectionReport, 'rooms' | 'overallNotes' | 'status' | 'completedAt' | 'reportPdfUrl' | 'reportEmailSentAt'>>
): Promise<void> {
  const inspection = await getInspection(id);
  if (!inspection) throw new Error('Inspection not found');

  const updated = { ...inspection, ...updates };
  const redis = getRedis();
  await redis.set(`inspection:${id}`, JSON.stringify(updated));
}

// List all inspections
export async function listInspections(limit = 50, offset = 0): Promise<InspectionReport[]> {
  const redis = getRedis();
  const ids = await redis.lrange('inspections:list', offset, offset + limit - 1);

  if (!ids.length) return [];

  const inspections = await Promise.all(
    ids.map(id => getInspection(id as string))
  );

  return inspections.filter((i): i is InspectionReport => i !== null);
}
