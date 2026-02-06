// Auto-send payment reminders for overdue invoices at 3, 7, and 14 days past due
// Called by Vercel Cron daily at 3 PM UTC (10 AM EST)
import type { APIRoute } from 'astro';
import { listInvoices, updateInvoice } from '../../../lib/db';
import type { Invoice } from '../../../lib/types';

export const prerender = false;

// Days past due when reminders are sent
const REMINDER_SCHEDULE = [3, 7, 14];

function daysPastDue(dueDate: string): number {
  const now = new Date();
  const due = new Date(dueDate);
  return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

function shouldSendReminder(invoice: Invoice): boolean {
  const days = daysPastDue(invoice.dueDate);
  if (days < REMINDER_SCHEDULE[0]) return false;

  const count = Number(invoice.reminderCount) || 0;
  if (count >= REMINDER_SCHEDULE.length) return false;

  // Check if enough days have passed for the next reminder
  const nextReminderDay = REMINDER_SCHEDULE[count];
  return days >= nextReminderDay;
}

async function sendReminderEmail(invoice: Invoice, RESEND_API_KEY: string): Promise<void> {
  if (invoice.paymentMethod === 'zelle') {
    const { generateInvoicePDF, generateInvoiceEmailHTML } = await import('../../../lib/invoice-pdf');
    const pdfBuffer = generateInvoicePDF(invoice);
    const emailHtml = generateInvoiceEmailHTML(invoice);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'CheckMyRental <send@checkmyrental.io>',
        to: [String(invoice.customerEmail)],
        subject: `Reminder: Invoice ${invoice.invoiceNumber} from CheckMyRental`,
        html: emailHtml,
        attachments: [{
          filename: `${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer.toString('base64'),
        }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Resend API error: ${errorData}`);
    }
  } else {
    // Square - send email with payment link
    const paymentUrl = invoice.squarePaymentUrl || '';
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'CheckMyRental <send@checkmyrental.io>',
        to: [String(invoice.customerEmail)],
        subject: `Reminder: Invoice ${invoice.invoiceNumber} from CheckMyRental`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Payment Reminder</h2>
            <p>Hi ${invoice.customerName},</p>
            <p>This is a friendly reminder that invoice <strong>${invoice.invoiceNumber}</strong> for <strong>$${Number(invoice.total).toFixed(2)}</strong> is still pending.</p>
            ${paymentUrl ? `<p><a href="${paymentUrl}" style="display: inline-block; padding: 12px 24px; background: #e74c3c; color: white; text-decoration: none; border-radius: 6px;">Pay Now</a></p>` : ''}
            <p>Thank you,<br>CheckMyRental</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Resend API error: ${errorData}`);
    }
  }
}

export const GET: APIRoute = async ({ request }) => {
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const invoices = await listInvoices(200, 0);

    // Filter to unpaid, past-due invoices
    const overdueInvoices = invoices.filter(inv =>
      ['sent', 'viewed', 'overdue'].includes(inv.status) &&
      inv.dueDate &&
      daysPastDue(inv.dueDate) >= REMINDER_SCHEDULE[0] &&
      shouldSendReminder(inv)
    );

    const results: { invoiceId: string; customerName: string; reminderNumber: number; success: boolean; error?: string }[] = [];

    for (const invoice of overdueInvoices) {
      const currentCount = Number(invoice.reminderCount) || 0;
      try {
        await sendReminderEmail(invoice, RESEND_API_KEY);
        await updateInvoice(invoice.id, {
          lastReminderSentAt: new Date().toISOString(),
          reminderCount: currentCount + 1,
          status: 'overdue',
        });
        results.push({
          invoiceId: invoice.id,
          customerName: invoice.customerName,
          reminderNumber: currentCount + 1,
          success: true,
        });
      } catch (err) {
        results.push({
          invoiceId: invoice.id,
          customerName: invoice.customerName,
          reminderNumber: currentCount + 1,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalEligible: overdueInvoices.length,
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Invoice reminders cron error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
