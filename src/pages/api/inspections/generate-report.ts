// Generate PDF report and email to landlord
import type { APIRoute } from 'astro';
import { getInspection, updateInspection } from '../../../lib/inspection-db';
import type { ItemCondition } from '../../../lib/types';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || authHeader !== `Bearer ${adminPassword}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { inspectionId } = body;

    if (!inspectionId) {
      return new Response(
        JSON.stringify({ error: 'inspectionId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const inspection = await getInspection(inspectionId);
    if (!inspection) {
      return new Response(
        JSON.stringify({ error: 'Inspection not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate HTML report (can be converted to PDF by the client or a service)
    const conditionColors: Record<ItemCondition, string> = {
      good: '#16a34a',
      fair: '#ca8a04',
      poor: '#ea580c',
      damaged: '#dc2626',
    };

    const conditionLabels: Record<ItemCondition, string> = {
      good: 'Good',
      fair: 'Fair',
      poor: 'Poor',
      damaged: 'Damaged',
    };

    const reportDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    // Count conditions
    let totalItems = 0;
    let goodCount = 0;
    let fairCount = 0;
    let poorCount = 0;
    let damagedCount = 0;

    for (const room of inspection.rooms) {
      for (const item of room.items) {
        if (item.condition) {
          totalItems++;
          if (item.condition === 'good') goodCount++;
          else if (item.condition === 'fair') fairCount++;
          else if (item.condition === 'poor') poorCount++;
          else if (item.condition === 'damaged') damagedCount++;
        }
      }
    }

    const overallScore = totalItems > 0
      ? Math.round(((goodCount * 3 + fairCount * 2 + poorCount * 1) / (totalItems * 3)) * 100)
      : 0;

    const reportHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #1e293b;">
        <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">Property Inspection Report</h1>
          <p style="color: #94a3b8; margin: 8px 0 0;">${reportDate}</p>
        </div>

        <div style="padding: 24px; background: #fff; border: 1px solid #e2e8f0; border-top: none;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 0;"><strong>Property:</strong></td>
              <td style="padding: 8px 0;">${inspection.propertyAddress}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Tenant:</strong></td>
              <td style="padding: 8px 0;">${inspection.tenantName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Inspector:</strong></td>
              <td style="padding: 8px 0;">${inspection.inspectorName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Landlord:</strong></td>
              <td style="padding: 8px 0;">${inspection.landlordName}</td>
            </tr>
          </table>

          <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 24px; display: flex; gap: 24px; flex-wrap: wrap;">
            <div style="text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: ${overallScore >= 80 ? '#16a34a' : overallScore >= 60 ? '#ca8a04' : '#dc2626'};">${overallScore}%</div>
              <div style="font-size: 12px; color: #64748b;">Overall Score</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #16a34a;">${goodCount}</div>
              <div style="font-size: 12px; color: #64748b;">Good</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #ca8a04;">${fairCount}</div>
              <div style="font-size: 12px; color: #64748b;">Fair</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #ea580c;">${poorCount}</div>
              <div style="font-size: 12px; color: #64748b;">Poor</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #dc2626;">${damagedCount}</div>
              <div style="font-size: 12px; color: #64748b;">Damaged</div>
            </div>
          </div>

          ${inspection.rooms.map(room => `
            <div style="margin-bottom: 24px;">
              <h3 style="font-size: 18px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">${room.name}</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #f8fafc;">
                    <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Item</th>
                    <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Condition</th>
                    <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${room.items.map(item => `
                    <tr>
                      <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9;">${item.name}</td>
                      <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9;">
                        ${item.condition
                          ? `<span style="display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; color: #fff; background: ${conditionColors[item.condition]};">${conditionLabels[item.condition]}</span>`
                          : '<span style="color: #94a3b8;">Not inspected</span>'
                        }
                      </td>
                      <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; color: #475569; font-size: 13px;">${item.notes || '-'}</td>
                    </tr>
                    ${(item.photoUrls && item.photoUrls.length > 0) ? `
                      <tr>
                        <td colspan="3" style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9;">
                          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            ${item.photoUrls.map(url => `<img src="${url}" style="width: 120px; height: 90px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0;" />`).join('')}
                          </div>
                        </td>
                      </tr>
                    ` : ''}
                  `).join('')}
                </tbody>
              </table>
            </div>
          `).join('')}

          ${inspection.overallNotes ? `
            <div style="margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 8px;">
              <h3 style="font-size: 16px; margin-bottom: 8px;">Additional Notes</h3>
              <p style="color: #475569; white-space: pre-wrap;">${inspection.overallNotes}</p>
            </div>
          ` : ''}

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            Generated by CheckMyRental - Professional Property Inspections<br>
            Tampa Bay, Florida | checkmyrental.io
          </p>
        </div>
      </div>
    `;

    // Email report to landlord
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    let emailSent = false;

    if (RESEND_API_KEY) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'CheckMyRental <send@checkmyrental.io>',
            to: [inspection.landlordEmail],
            subject: `Inspection Report - ${inspection.propertyAddress}`,
            html: reportHtml,
          }),
        });

        if (emailResponse.ok) {
          emailSent = true;
          await updateInspection(inspection.id, {
            reportEmailSentAt: new Date().toISOString(),
          });
        }
      } catch (emailError) {
        console.error('Failed to email report:', emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        reportHtml,
        emailSent,
        overallScore,
        summary: { totalItems, goodCount, fairCount, poorCount, damagedCount },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Generate report error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
