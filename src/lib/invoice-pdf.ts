// PDF Invoice generation for Zelle payments
import { jsPDF } from 'jspdf';
import type { Invoice, PROPERTY_TYPE_LABELS } from './types';

const PROPERTY_LABELS: Record<string, string> = {
  apartment: 'Apartment Inspection',
  single_family: 'Single Family Home Inspection',
  multifamily: 'Multifamily Home Inspection',
};

// Company info
const COMPANY = {
  name: 'CheckMyRental',
  tagline: 'Professional Property Inspections',
  address: 'Tampa Bay Area, Florida',
  email: 'info@checkmyrental.io',
  phone: '(813) 252-0524',
  website: 'checkmyrental.io',
};

// Colors
const COLORS = {
  primary: [231, 76, 60] as [number, number, number],      // #e74c3c
  dark: [30, 41, 59] as [number, number, number],          // #1e293b
  gray: [100, 116, 139] as [number, number, number],       // #64748b
  lightGray: [241, 245, 249] as [number, number, number],  // #f1f5f9
  white: [255, 255, 255] as [number, number, number],
};

export function generateInvoicePDF(invoice: Invoice): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper functions
  const setColor = (color: [number, number, number]) => {
    doc.setTextColor(color[0], color[1], color[2]);
  };

  const setFillColor = (color: [number, number, number]) => {
    doc.setFillColor(color[0], color[1], color[2]);
  };

  // ==================== HEADER ====================

  // Company name
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  setColor(COLORS.dark);
  doc.text('CheckMy', margin, y);
  setColor(COLORS.primary);
  doc.text('Rental', margin + doc.getTextWidth('CheckMy'), y);

  // Invoice label (right aligned)
  doc.setFontSize(32);
  setColor(COLORS.dark);
  doc.text('INVOICE', pageWidth - margin, y, { align: 'right' });

  y += 8;

  // Tagline
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  setColor(COLORS.gray);
  doc.text(COMPANY.tagline, margin, y);

  // Invoice number (right aligned)
  doc.setFontSize(11);
  setColor(COLORS.gray);
  doc.text(String(invoice.invoiceNumber), pageWidth - margin, y, { align: 'right' });

  y += 15;

  // Divider line
  setFillColor(COLORS.primary);
  doc.rect(margin, y, contentWidth, 1, 'F');

  y += 15;

  // ==================== INVOICE DETAILS ====================

  const col1X = margin;
  const col2X = pageWidth / 2 + 10;

  // Left column: Bill To
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  setColor(COLORS.gray);
  doc.text('BILL TO', col1X, y);

  // Right column: Invoice Details
  doc.text('INVOICE DETAILS', col2X, y);

  y += 6;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  setColor(COLORS.dark);

  // Customer info
  doc.text(String(invoice.customerName), col1X, y);
  y += 5;
  setColor(COLORS.gray);
  doc.setFontSize(10);
  doc.text(String(invoice.customerEmail), col1X, y);
  y += 5;
  doc.text(String(invoice.customerPhone), col1X, y);

  // Invoice details (right column)
  let detailY = y - 10;
  doc.setFontSize(10);

  const addDetail = (label: string, value: string) => {
    setColor(COLORS.gray);
    doc.text(label + ':', col2X, detailY);
    setColor(COLORS.dark);
    doc.text(value, col2X + 35, detailY);
    detailY += 5;
  };

  const invoiceDate = new Date(invoice.createdAt);
  const dueDate = new Date(invoice.dueDate);

  addDetail('Invoice Date', invoiceDate.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  }));
  addDetail('Due Date', dueDate.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  }));
  addDetail('Status', invoice.status.toUpperCase());

  y += 20;

  // ==================== LINE ITEMS TABLE ====================

  // Table header
  setFillColor(COLORS.dark);
  doc.rect(margin, y, contentWidth, 8, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  setColor(COLORS.white);
  doc.text('DESCRIPTION', margin + 3, y + 5.5);
  doc.text('AMOUNT', pageWidth - margin - 3, y + 5.5, { align: 'right' });

  y += 12;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  invoice.properties.forEach((property, index) => {
    // Alternate row background
    if (index % 2 === 0) {
      setFillColor(COLORS.lightGray);
      doc.rect(margin, y - 4, contentWidth, 12, 'F');
    }

    setColor(COLORS.dark);
    doc.setFont('helvetica', 'bold');
    doc.text(String(PROPERTY_LABELS[property.type] || property.type), margin + 3, y);

    doc.setFont('helvetica', 'normal');
    setColor(COLORS.gray);
    doc.setFontSize(9);
    doc.text(String(property.address), margin + 3, y + 5);

    doc.setFontSize(10);
    setColor(COLORS.dark);
    doc.text(`$${Number(property.price).toFixed(2)}`, pageWidth - margin - 3, y + 2, { align: 'right' });

    y += 14;
  });

  y += 5;

  // ==================== TOTALS ====================

  const totalsX = pageWidth - margin - 60;

  // Subtotal
  doc.setFontSize(10);
  setColor(COLORS.gray);
  doc.text('Subtotal:', totalsX, y);
  setColor(COLORS.dark);
  doc.text(`$${Number(invoice.subtotal).toFixed(2)}`, pageWidth - margin - 3, y, { align: 'right' });

  y += 8;

  // Divider
  doc.setDrawColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);
  doc.line(totalsX - 10, y - 3, pageWidth - margin, y - 3);

  // Total
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  setColor(COLORS.dark);
  doc.text('Total Due:', totalsX, y + 3);
  setColor(COLORS.primary);
  doc.text(`$${Number(invoice.total).toFixed(2)}`, pageWidth - margin - 3, y + 3, { align: 'right' });

  y += 25;

  // ==================== PAYMENT INSTRUCTIONS ====================

  // Payment box
  setFillColor(COLORS.lightGray);
  doc.roundedRect(margin, y, contentWidth, 45, 3, 3, 'F');

  y += 8;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  setColor(COLORS.primary);
  doc.text('Payment Instructions - Zelle', margin + 8, y);

  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  setColor(COLORS.dark);

  const zelleEmail = process.env.ZELLE_EMAIL || 'payments@checkmyrental.io';
  const zellePhone = process.env.ZELLE_PHONE || '(813) 252-0524';

  doc.text('Please send payment via Zelle to:', margin + 8, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text(`Email: ${zelleEmail}`, margin + 8, y);
  y += 5;
  doc.text(`Phone: ${zellePhone}`, margin + 8, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  setColor(COLORS.gray);
  doc.setFontSize(9);
  doc.text(`Please include invoice number ${invoice.invoiceNumber} in the memo/note.`, margin + 8, y);

  y += 25;

  // ==================== FOOTER ====================

  // Notes (if any)
  if (invoice.notes) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    setColor(COLORS.gray);
    doc.text('NOTES', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    setColor(COLORS.dark);
    const noteLines = doc.splitTextToSize(invoice.notes, contentWidth);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4 + 10;
  }

  // Footer line
  const footerY = doc.internal.pageSize.getHeight() - 20;

  doc.setDrawColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.setFontSize(9);
  setColor(COLORS.gray);
  doc.text(
    `${COMPANY.website}  |  ${COMPANY.email}  |  ${COMPANY.phone}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  doc.setFontSize(8);
  doc.text(
    'Thank you for choosing CheckMyRental for your property inspection needs.',
    pageWidth / 2,
    footerY + 5,
    { align: 'center' }
  );

  // Return as buffer
  return Buffer.from(doc.output('arraybuffer'));
}

// Generate invoice email HTML
export function generateInvoiceEmailHTML(invoice: Invoice): string {
  const dueDate = new Date(invoice.dueDate);
  const zelleEmail = process.env.ZELLE_EMAIL || 'payments@checkmyrental.io';
  const zellePhone = process.env.ZELLE_PHONE || '(813) 252-0524';

  const propertiesHTML = invoice.properties.map(p => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
        <strong>${PROPERTY_LABELS[p.type] || p.type}</strong><br>
        <span style="color: #64748b; font-size: 14px;">${p.address}</span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">
        $${Number(p.price).toFixed(2)}
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 30px; text-align: center;">
            <img src="https://checkmyrental.io/logo-icon.png" alt="CheckMyRental" width="60" height="60" style="display: block; margin: 0 auto 12px auto; border-radius: 12px;" />
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">
              CheckMy<span style="color: #e74c3c;">Rental</span>
            </h1>
            <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px;">Professional Property Inspections</p>
          </td>
        </tr>

        <!-- Invoice Header -->
        <tr>
          <td style="padding: 30px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <h2 style="margin: 0; color: #1e293b; font-size: 24px;">Invoice ${invoice.invoiceNumber}</h2>
                  <p style="margin: 5px 0 0 0; color: #64748b;">Due: ${dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </td>
                <td style="text-align: right;">
                  <span style="display: inline-block; background-color: #fef3c7; color: #92400e; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                    Payment Due
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Bill To -->
        <tr>
          <td style="padding: 0 30px;">
            <p style="color: #64748b; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px;">Bill To</p>
            <p style="color: #1e293b; font-size: 16px; margin: 0; font-weight: 600;">${invoice.customerName}</p>
            <p style="color: #64748b; margin: 3px 0;">${invoice.customerEmail}</p>
          </td>
        </tr>

        <!-- Line Items -->
        <tr>
          <td style="padding: 30px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <tr style="background-color: #1e293b;">
                <th style="padding: 12px; text-align: left; color: #ffffff; font-size: 14px;">Description</th>
                <th style="padding: 12px; text-align: right; color: #ffffff; font-size: 14px;">Amount</th>
              </tr>
              ${propertiesHTML}
              <tr style="background-color: #f8fafc;">
                <td style="padding: 15px; text-align: right; font-weight: 600; color: #1e293b; font-size: 18px;">
                  Total Due
                </td>
                <td style="padding: 15px; text-align: right; font-weight: 700; color: #e74c3c; font-size: 24px;">
                  $${Number(invoice.total).toFixed(2)}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Payment Instructions -->
        <tr>
          <td style="padding: 0 30px 30px 30px;">
            <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); border-radius: 12px; padding: 25px; color: #ffffff;">
              <h3 style="margin: 0 0 15px 0; font-size: 18px;">Pay with Zelle</h3>
              <p style="margin: 0 0 10px 0; font-size: 15px;">
                <strong>Email:</strong> ${zelleEmail}
              </p>
              <p style="margin: 0 0 15px 0; font-size: 15px;">
                <strong>Phone:</strong> ${zellePhone}
              </p>
              <p style="margin: 0; font-size: 13px; opacity: 0.9;">
                Please include <strong>${invoice.invoiceNumber}</strong> in the memo/note when sending payment.
              </p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #64748b; font-size: 14px;">
              Questions? Contact us at <a href="mailto:info@checkmyrental.io" style="color: #e74c3c;">info@checkmyrental.io</a>
            </p>
            <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 12px;">
              CheckMyRental | Tampa Bay Area, Florida | checkmyrental.io
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
