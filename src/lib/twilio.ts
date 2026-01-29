// Twilio SMS helper for tenant booking notifications
import Twilio from 'twilio';

// Initialize Twilio client
function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN environment variables');
  }

  return Twilio(accountSid, authToken);
}

function getFromNumber(): string {
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!phoneNumber) {
    throw new Error('Missing TWILIO_PHONE_NUMBER environment variable');
  }
  return phoneNumber;
}

// Format phone number to E.164 format
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If it's 10 digits (US number without country code), add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If it's 11 digits starting with 1, add +
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // Otherwise assume it's already formatted or international
  return `+${digits}`;
}

// Send booking link SMS to tenant
export async function sendBookingLinkSMS(
  phone: string,
  tenantName: string,
  propertyAddress: string,
  bookingUrl: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const client = getTwilioClient();
    const fromNumber = getFromNumber();

    const message = await client.messages.create({
      body: `Hi ${tenantName}! Your landlord scheduled a property inspection at ${propertyAddress}. FL law requires 24hr notice. Select your time: ${bookingUrl} - CheckMyRental`,
      from: fromNumber,
      to: formatPhoneNumber(phone),
    });

    return { success: true, messageId: message.sid };
  } catch (error) {
    console.error('Failed to send booking link SMS:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Send confirmation SMS to tenant after they book
export async function sendConfirmationSMS(
  phone: string,
  tenantName: string,
  propertyAddress: string,
  date: string,
  time: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const client = getTwilioClient();
    const fromNumber = getFromNumber();

    const message = await client.messages.create({
      body: `Confirmed! Inspection at ${propertyAddress} on ${date} at ${time}. A CheckMyRental inspector will arrive during this window. Questions? Reply to this text. - CheckMyRental`,
      from: fromNumber,
      to: formatPhoneNumber(phone),
    });

    return { success: true, messageId: message.sid };
  } catch (error) {
    console.error('Failed to send confirmation SMS:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Send reminder SMS (24 hours before inspection)
export async function sendReminderSMS(
  phone: string,
  propertyAddress: string,
  time: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const client = getTwilioClient();
    const fromNumber = getFromNumber();

    const message = await client.messages.create({
      body: `Reminder: Property inspection tomorrow at ${time} at ${propertyAddress}. Please ensure access is available. - CheckMyRental`,
      from: fromNumber,
      to: formatPhoneNumber(phone),
    });

    return { success: true, messageId: message.sid };
  } catch (error) {
    console.error('Failed to send reminder SMS:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
