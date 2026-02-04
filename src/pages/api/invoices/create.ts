import type { APIRoute } from 'astro';
import { createInvoice, getInquiry, updateInquiryStatus, listInvoices } from '../../../lib/db';
import type { Invoice, Property } from '../../../lib/types';

export const prerender = false;

interface CreateInvoiceRequest {
  // Either provide inquiryId or customer details
  inquiryId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  properties?: Property[];
  paymentMethod: 'square' | 'zelle';
  dueDate: string; // ISO date string
  notes?: string;
  forceDuplicate?: boolean;
}

export const POST: APIRoute = async ({ request }) => {
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

    const body: CreateInvoiceRequest = await request.json();

    // Validate required fields
    if (!body.paymentMethod || !body.dueDate) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: paymentMethod, dueDate' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let customerName: string;
    let customerEmail: string;
    let customerPhone: string;
    let properties: Property[];
    let inquiryId: string | undefined;
    let inspectionFrequency: string | undefined;

    // If inquiryId provided, fetch details from inquiry
    if (body.inquiryId) {
      const inquiry = await getInquiry(body.inquiryId);
      if (!inquiry) {
        return new Response(
          JSON.stringify({ error: 'Inquiry not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      customerName = inquiry.customerName;
      customerEmail = inquiry.customerEmail;
      customerPhone = inquiry.customerPhone;
      properties = inquiry.properties;
      inquiryId = inquiry.id;
      inspectionFrequency = inquiry.inspectionFrequency;
    } else {
      // Use provided details
      if (!body.customerName || !body.customerEmail || !body.customerPhone || !body.properties) {
        return new Response(
          JSON.stringify({ error: 'Missing required customer details' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      customerName = body.customerName;
      customerEmail = body.customerEmail;
      customerPhone = body.customerPhone;
      properties = body.properties;
    }

    // Check for duplicate invoices
    if (!body.forceDuplicate) {
      const existingInvoices = await listInvoices(100, 0);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const duplicate = existingInvoices.find(inv =>
        inv.customerEmail === customerEmail &&
        inv.createdAt > sevenDaysAgo &&
        inv.properties.length === properties.length &&
        inv.status !== 'cancelled'
      );
      if (duplicate) {
        return new Response(
          JSON.stringify({
            warning: 'duplicate_detected',
            existingInvoice: duplicate.invoiceNumber,
            message: `A similar invoice (${duplicate.invoiceNumber}) was created on ${new Date(duplicate.createdAt).toLocaleDateString()} for this customer. Create anyway?`,
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Calculate totals
    const subtotal = properties.reduce((sum, p) => sum + p.price, 0);
    const processingFee = body.paymentMethod === 'square' ? subtotal * 0.03 : 0;
    const total = subtotal + processingFee;

    // Create invoice in database
    const invoice = await createInvoice({
      inquiryId,
      customerName,
      customerEmail,
      customerPhone,
      properties,
      subtotal,
      processingFee: processingFee > 0 ? processingFee : undefined,
      total,
      paymentMethod: body.paymentMethod,
      status: 'draft',
      dueDate: body.dueDate,
      notes: body.notes,
      inspectionFrequency,
    });

    // Send invoice based on payment method
    if (body.paymentMethod === 'square') {
      // Create and send via Square
      try {
        const { createSquareInvoice } = await import('../../../lib/square');
        const { squareInvoiceId, paymentUrl } = await createSquareInvoice(invoice);

        // Update invoice with Square details
        const { updateInvoice } = await import('../../../lib/db');
        await updateInvoice(invoice.id, {
          status: 'sent',
          squareInvoiceId,
          squarePaymentUrl: paymentUrl,
        });

        invoice.status = 'sent';
        invoice.squareInvoiceId = squareInvoiceId;
        invoice.squarePaymentUrl = paymentUrl;
      } catch (squareError) {
        console.error('Square invoice error:', squareError);
        return new Response(
          JSON.stringify({
            error: 'Failed to create Square invoice',
            details: squareError instanceof Error ? squareError.message : 'Unknown error',
            invoice, // Return the draft invoice anyway
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Send Zelle invoice via email with PDF attachment
      try {
        const { generateInvoicePDF, generateInvoiceEmailHTML } = await import('../../../lib/invoice-pdf');
        const pdfBuffer = generateInvoicePDF(invoice);
        const emailHtml = generateInvoiceEmailHTML(invoice);

        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        if (!RESEND_API_KEY) {
          throw new Error('RESEND_API_KEY not configured');
        }

        // Send email with PDF attachment
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'CheckMyRental <send@checkmyrental.io>',
            to: [customerEmail],
            subject: `Invoice ${invoice.invoiceNumber} from CheckMyRental`,
            html: emailHtml,
            attachments: [
              {
                filename: `${invoice.invoiceNumber}.pdf`,
                content: pdfBuffer.toString('base64'),
              },
            ],
          }),
        });

        if (!resendResponse.ok) {
          const errorData = await resendResponse.text();
          throw new Error(`Resend API error: ${errorData}`);
        }

        // Update invoice status
        const { updateInvoice } = await import('../../../lib/db');
        await updateInvoice(invoice.id, { status: 'sent' });
        invoice.status = 'sent';

        // Also send a copy to admin
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'CheckMyRental <send@checkmyrental.io>',
            to: ['info@checkmyrental.io'],
            subject: `[Copy] Invoice ${invoice.invoiceNumber} sent to ${customerName}`,
            html: `<p>A copy of the invoice sent to ${customerName} (${customerEmail})</p>${emailHtml}`,
            attachments: [
              {
                filename: `${invoice.invoiceNumber}.pdf`,
                content: pdfBuffer.toString('base64'),
              },
            ],
          }),
        });
      } catch (emailError) {
        console.error('Email send error:', emailError);
        return new Response(
          JSON.stringify({
            error: 'Failed to send invoice email',
            details: emailError instanceof Error ? emailError.message : 'Unknown error',
            invoice, // Return the draft invoice anyway
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update inquiry status if linked
    if (inquiryId) {
      await updateInquiryStatus(inquiryId, 'invoiced', invoice.id);
    }

    return new Response(
      JSON.stringify({ success: true, invoice }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Create invoice error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
