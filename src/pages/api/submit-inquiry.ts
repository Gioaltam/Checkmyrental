import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    // Extract form fields
    const fullName = formData.get('full_name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const preferredTimeframe = formData.get('preferred_timeframe') as string;
    const inspectionFrequency = formData.get('inspection_frequency') as string;
    const paymentPreference = formData.get('payment_preference') as string;
    const notes = formData.get('notes') as string;
    const calculatedTotal = formData.get('calculated_total') as string;

    // Collect all properties
    const properties: Array<{
      index: number;
      type: string;
      address: string;
      tenantName: string;
      tenantPhone: string;
    }> = [];

    // Find all property entries (up to 10)
    for (let i = 1; i <= 10; i++) {
      const address = formData.get(`property_${i}_address`) as string;
      if (address) {
        properties.push({
          index: i,
          type: formData.get(`property_${i}_type`) as string || 'single_family',
          address,
          tenantName: formData.get(`property_${i}_tenant_name`) as string || '',
          tenantPhone: formData.get(`property_${i}_tenant_phone`) as string || '',
        });
      }
    }

    // Format property type for display
    const formatType = (type: string) => {
      const types: Record<string, string> = {
        apartment: 'Apartment',
        single_family: 'Single Family Home',
        multifamily: 'Multifamily Home',
      };
      return types[type] || type;
    };

    // Format timeframe for display
    const formatTimeframe = (tf: string) => {
      const timeframes: Record<string, string> = {
        asap: 'As soon as possible',
        this_week: 'This week',
        next_week: 'Next week',
        this_month: 'Within this month',
        flexible: 'Flexible',
      };
      return timeframes[tf] || tf;
    };

    // Format frequency for display
    const formatFrequency = (freq: string) => {
      const frequencies: Record<string, string> = {
        quarterly: 'Quarterly',
        monthly: 'Monthly',
        bimonthly: 'Every 2 Months',
        weekly: 'Weekly',
        one_time: 'One Time',
        custom: 'Custom Schedule',
      };
      return frequencies[freq] || freq;
    };

    // Build properties HTML
    const propertiesHtml = properties.map((p, idx) => `
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
        <strong style="color: #e74c3c;">Property ${idx + 1}: ${formatType(p.type)}</strong><br>
        <span style="color: #333;">📍 ${p.address}</span><br>
        ${p.tenantName ? `<span style="color: #666;">👤 Tenant: ${p.tenantName}</span><br>` : ''}
        ${p.tenantPhone ? `<span style="color: #666;">📞 Tenant Phone: ${p.tenantPhone}</span>` : ''}
      </div>
    `).join('');

    // Build email HTML
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New Inspection Request</h1>
        </div>

        <div style="padding: 30px; background: white;">
          <h2 style="color: #333; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">Contact Information</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 140px;">Name:</td>
              <td style="padding: 8px 0; color: #333; font-weight: 600;">${fullName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Email:</td>
              <td style="padding: 8px 0; color: #333;"><a href="mailto:${email}" style="color: #e74c3c;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Phone:</td>
              <td style="padding: 8px 0; color: #333;"><a href="tel:${phone}" style="color: #e74c3c;">${phone}</a></td>
            </tr>
          </table>

          <h2 style="color: #333; border-bottom: 2px solid #e74c3c; padding-bottom: 10px; margin-top: 30px;">Properties (${properties.length})</h2>
          ${propertiesHtml}

          <h2 style="color: #333; border-bottom: 2px solid #e74c3c; padding-bottom: 10px; margin-top: 30px;">Schedule & Payment</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 140px;">Timeframe:</td>
              <td style="padding: 8px 0; color: #333;">${formatTimeframe(preferredTimeframe)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Frequency:</td>
              <td style="padding: 8px 0; color: #333;">${formatFrequency(inspectionFrequency)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Payment Method:</td>
              <td style="padding: 8px 0; color: #333;">${paymentPreference === 'zelle' ? 'Zelle' : 'Credit/Debit Card'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Per-Visit Total:</td>
              <td style="padding: 8px 0; color: #e74c3c; font-weight: 700; font-size: 18px;">${calculatedTotal}</td>
            </tr>
          </table>

          ${notes ? `
          <h2 style="color: #333; border-bottom: 2px solid #e74c3c; padding-bottom: 10px; margin-top: 30px;">Additional Notes</h2>
          <p style="color: #333; background: #f8f9fa; padding: 15px; border-radius: 8px;">${notes}</p>
          ` : ''}
        </div>

        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
          This inquiry was submitted from checkmyrental.io
        </div>
      </div>
    `;

    // Send via Resend
    const RESEND_API_KEY = (import.meta as any).env?.RESEND_API_KEY || process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'CheckMyRental <send@checkmyrental.io>',
        to: ['info@checkmyrental.io'],
        subject: `New Inspection Request: ${fullName} - ${properties.length} ${properties.length === 1 ? 'property' : 'properties'}`,
        html: emailHtml,
        reply_to: email,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error('Resend API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to send email' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await resendResponse.json();
    console.log('Email sent successfully:', result);

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Submit inquiry error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
