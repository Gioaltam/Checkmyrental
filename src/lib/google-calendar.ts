// Google Calendar integration for auto-syncing bookings
import { google } from 'googleapis';

function getCalendarClient() {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!credentials) {
    return null;
  }

  try {
    const key = JSON.parse(credentials);
    const auth = new google.auth.JWT(
      key.client_email,
      undefined,
      key.private_key,
      ['https://www.googleapis.com/auth/calendar']
    );

    return google.calendar({ version: 'v3', auth });
  } catch (error) {
    console.error('Failed to initialize Google Calendar client:', error);
    return null;
  }
}

function getCalendarId(): string {
  return process.env.GOOGLE_CALENDAR_ID || 'primary';
}

// Format time string "09:00" to RFC3339 datetime for a given date
function toDateTime(date: string, time: string): string {
  return `${date}T${time}:00`;
}

// Create a calendar event for a confirmed booking
export async function createCalendarEvent(params: {
  date: string;       // "2024-02-15"
  time: string;       // "09:00"
  durationMinutes: number;
  propertyAddress: string;
  tenantName: string;
  tenantPhone: string;
  landlordName: string;
  landlordEmail: string;
  bookingId: string;
}): Promise<string | null> {
  const calendar = getCalendarClient();
  if (!calendar) return null;

  const { date, time, durationMinutes, propertyAddress, tenantName, tenantPhone, landlordName, landlordEmail, bookingId } = params;

  const startDateTime = toDateTime(date, time);

  // Calculate end time
  const [hours, minutes] = time.split(':').map(Number);
  const endMinutes = hours * 60 + minutes + durationMinutes;
  const endHour = Math.floor(endMinutes / 60);
  const endMin = endMinutes % 60;
  const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
  const endDateTime = toDateTime(date, endTime);

  try {
    const event = await calendar.events.insert({
      calendarId: getCalendarId(),
      requestBody: {
        summary: `Inspection - ${propertyAddress}`,
        location: propertyAddress,
        description: [
          `Tenant: ${tenantName}`,
          `Tenant Phone: ${tenantPhone}`,
          `Landlord: ${landlordName} (${landlordEmail})`,
          `Booking ID: ${bookingId}`,
        ].join('\n'),
        start: {
          dateTime: startDateTime,
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'America/New_York',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 },
            { method: 'popup', minutes: 15 },
          ],
        },
      },
    });

    return event.data.id || null;
  } catch (error) {
    console.error('Failed to create calendar event:', error);
    return null;
  }
}

// Update a calendar event when booking is rescheduled
export async function updateCalendarEvent(params: {
  eventId: string;
  date: string;
  time: string;
  durationMinutes: number;
  propertyAddress: string;
}): Promise<boolean> {
  const calendar = getCalendarClient();
  if (!calendar) return false;

  const { eventId, date, time, durationMinutes, propertyAddress } = params;

  const startDateTime = toDateTime(date, time);

  const [hours, minutes] = time.split(':').map(Number);
  const endMinutes = hours * 60 + minutes + durationMinutes;
  const endHour = Math.floor(endMinutes / 60);
  const endMin = endMinutes % 60;
  const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
  const endDateTime = toDateTime(date, endTime);

  try {
    await calendar.events.patch({
      calendarId: getCalendarId(),
      eventId,
      requestBody: {
        summary: `Inspection - ${propertyAddress}`,
        location: propertyAddress,
        start: {
          dateTime: startDateTime,
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'America/New_York',
        },
      },
    });

    return true;
  } catch (error) {
    console.error('Failed to update calendar event:', error);
    return false;
  }
}

// Delete a calendar event when booking is cancelled
export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  const calendar = getCalendarClient();
  if (!calendar) return false;

  try {
    await calendar.events.delete({
      calendarId: getCalendarId(),
      eventId,
    });

    return true;
  } catch (error) {
    console.error('Failed to delete calendar event:', error);
    return false;
  }
}
