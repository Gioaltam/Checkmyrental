import type { APIRoute } from 'astro';
import { getInvoice, updateInvoice } from '../../../lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  try {
    // Simple auth check
    const authHeader = request.headers.get('Authorization');
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || authHeader !== `Bearer ${adminPassword}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id } = params;
    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Invoice ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const invoice = await getInvoice(id);
    if (!invoice) {
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If Square invoice, sync status
    if (invoice.squareInvoiceId && invoice.status !== 'paid' && invoice.status !== 'cancelled') {
      try {
        const { getSquareInvoiceStatus } = await import('../../../lib/square');
        const squareStatus = await getSquareInvoiceStatus(invoice.squareInvoiceId);

        let newStatus = invoice.status;
        if (squareStatus.status === 'PAID') {
          newStatus = 'paid';
          await updateInvoice(id, { status: 'paid', paidAt: new Date().toISOString() });
          invoice.status = 'paid';
          invoice.paidAt = new Date().toISOString();
        } else if (squareStatus.status === 'CANCELED') {
          newStatus = 'cancelled';
          await updateInvoice(id, { status: 'cancelled' });
          invoice.status = 'cancelled';
        }
      } catch (squareError) {
        console.error('Error syncing Square status:', squareError);
        // Continue with cached status
      }
    }

    return new Response(
      JSON.stringify({ invoice }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get invoice error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    // Simple auth check
    const authHeader = request.headers.get('Authorization');
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || authHeader !== `Bearer ${adminPassword}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id } = params;
    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Invoice ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const invoice = await getInvoice(id);
    if (!invoice) {
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { action, status } = body;

    // Handle specific actions
    if (action === 'mark_paid') {
      await updateInvoice(id, { status: 'paid', paidAt: new Date().toISOString() });
      invoice.status = 'paid';
      invoice.paidAt = new Date().toISOString();

      // Automatically send booking links to tenants
      try {
        const { createBooking, updateBooking: updateBookingDb } = await import('../../../lib/db');
        const { sendBookingLinkSMS } = await import('../../../lib/twilio');
        const baseUrl = process.env.PUBLIC_SITE_URL || 'https://checkmyrental.io';

        for (let i = 0; i < invoice.properties.length; i++) {
          const property = invoice.properties[i];
          if (property.tenantPhone) {
            const booking = await createBooking({
              invoiceId: id,
              propertyIndex: i,
              propertyAddress: property.address,
              tenantName: property.tenantName || 'Tenant',
              tenantPhone: property.tenantPhone,
              landlordName: invoice.customerName,
              landlordEmail: invoice.customerEmail,
            });

            const bookingUrl = `${baseUrl}/book/${booking.bookingToken}`;
            const smsResult = await sendBookingLinkSMS(
              property.tenantPhone,
              property.tenantName || 'Tenant',
              property.address,
              bookingUrl
            );

            if (smsResult.success) {
              await updateBookingDb(booking.id, {
                smsBookingLinkSentAt: new Date().toISOString(),
              });
            }
          }
        }
      } catch (bookingError) {
        console.error('Error sending booking links:', bookingError);
        // Don't fail the mark_paid action if booking links fail
      }
    } else if (action === 'cancel') {
      // If Square invoice, cancel in Square too
      if (invoice.squareInvoiceId) {
        try {
          const { cancelSquareInvoice } = await import('../../../lib/square');
          await cancelSquareInvoice(invoice.squareInvoiceId);
        } catch (squareError) {
          console.error('Error canceling Square invoice:', squareError);
          // Continue anyway
        }
      }
      await updateInvoice(id, { status: 'cancelled' });
      invoice.status = 'cancelled';
    } else if (action === 'retry_send') {
      // Retry sending a draft invoice
      if (invoice.paymentMethod === 'square') {
        const { createSquareInvoice } = await import('../../../lib/square');
        const { squareInvoiceId, paymentUrl } = await createSquareInvoice(invoice);
        await updateInvoice(id, { status: 'sent', squareInvoiceId, squarePaymentUrl: paymentUrl });
        invoice.status = 'sent';
      } else {
        // Zelle — generate PDF and send email
        const { generateInvoicePDF, generateInvoiceEmailHTML } = await import('../../../lib/invoice-pdf');
        const pdfBuffer = generateInvoicePDF(invoice);
        const emailHtml = generateInvoiceEmailHTML(invoice);

        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        if (!RESEND_API_KEY) {
          throw new Error('RESEND_API_KEY not configured');
        }

        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'CheckMyRental <send@checkmyrental.io>',
            to: [String(invoice.customerEmail)],
            subject: `Invoice ${invoice.invoiceNumber} from CheckMyRental`,
            html: emailHtml,
            attachments: [{
              filename: `${invoice.invoiceNumber}.pdf`,
              content: pdfBuffer.toString('base64'),
            }],
          }),
        });

        if (!resendResponse.ok) {
          const errorData = await resendResponse.text();
          throw new Error(`Resend API error: ${errorData}`);
        }

        await updateInvoice(id, { status: 'sent' });
        invoice.status = 'sent';

        // Send copy to admin
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'CheckMyRental <send@checkmyrental.io>',
            to: ['info@checkmyrental.io'],
            subject: `[Copy] Invoice ${invoice.invoiceNumber} sent to ${invoice.customerName}`,
            html: `<p>A copy of the invoice sent to ${invoice.customerName} (${invoice.customerEmail})</p>${emailHtml}`,
            attachments: [{
              filename: `${invoice.invoiceNumber}.pdf`,
              content: pdfBuffer.toString('base64'),
            }],
          }),
        });
      }
    } else if (action === 'edit') {
      // Edit invoice metadata (only for non-paid/non-cancelled)
      if (invoice.status === 'paid' || invoice.status === 'cancelled') {
        return new Response(
          JSON.stringify({ error: 'Cannot edit a paid or cancelled invoice' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const editableFields: Record<string, string> = {};
      if (body.customerName) editableFields.customerName = body.customerName;
      if (body.customerEmail) editableFields.customerEmail = body.customerEmail;
      if (body.customerPhone) editableFields.customerPhone = body.customerPhone;
      if (body.dueDate) editableFields.dueDate = body.dueDate;
      if (body.notes !== undefined) editableFields.notes = body.notes;

      await updateInvoice(id, editableFields as any);
      Object.assign(invoice, editableFields);
    } else if (action === 'send_reminder') {
      // Send payment reminder for unpaid invoices
      if (invoice.status === 'paid' || invoice.status === 'cancelled') {
        return new Response(
          JSON.stringify({ error: 'Cannot send reminder for paid or cancelled invoice' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      if (!RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY not configured');
      }

      if (invoice.paymentMethod === 'zelle') {
        const { generateInvoicePDF, generateInvoiceEmailHTML } = await import('../../../lib/invoice-pdf');
        const pdfBuffer = generateInvoicePDF(invoice);
        const emailHtml = generateInvoiceEmailHTML(invoice);

        const resendResponse = await fetch('https://api.resend.com/emails', {
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

        if (!resendResponse.ok) {
          const errorData = await resendResponse.text();
          throw new Error(`Resend API error: ${errorData}`);
        }
      } else {
        // Square - send email with payment link
        const paymentUrl = invoice.squarePaymentUrl || '';
        const resendResponse = await fetch('https://api.resend.com/emails', {
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
                <p>This is a friendly reminder that invoice <strong>${invoice.invoiceNumber}</strong> for <strong>$${invoice.total.toFixed(2)}</strong> is still pending.</p>
                ${paymentUrl ? `<p><a href="${paymentUrl}" style="display: inline-block; padding: 12px 24px; background: #e74c3c; color: white; text-decoration: none; border-radius: 6px;">Pay Now</a></p>` : ''}
                <p>Thank you,<br>CheckMyRental</p>
              </div>
            `,
          }),
        });

        if (!resendResponse.ok) {
          const errorData = await resendResponse.text();
          throw new Error(`Resend API error: ${errorData}`);
        }
      }

      await updateInvoice(id, { lastReminderSentAt: new Date().toISOString() });
      invoice.lastReminderSentAt = new Date().toISOString();
    } else if (status) {
      // Direct status update
      await updateInvoice(id, { status });
      invoice.status = status;
    }

    return new Response(
      JSON.stringify({ success: true, invoice }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Update invoice error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
