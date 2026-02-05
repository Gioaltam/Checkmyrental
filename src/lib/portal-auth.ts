// Portal authentication using magic links
// Sessions stored in Upstash Redis, magic links sent via Resend
import { getRedis } from './db';

const MAGIC_LINK_TTL = 900;      // 15 minutes
const SESSION_TTL = 2592000;      // 30 days

function generateToken(length = 48): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Create a magic link token for a given email
export async function createMagicLink(email: string): Promise<string> {
  const redis = getRedis();
  const token = generateToken();
  const normalizedEmail = email.toLowerCase().trim();

  await redis.set(`portal:magic:${token}`, normalizedEmail, { ex: MAGIC_LINK_TTL });

  return token;
}

// Verify a magic link token and return the email
export async function verifyMagicLink(token: string): Promise<string | null> {
  const redis = getRedis();
  const email = await redis.get(`portal:magic:${token}`);

  if (!email) return null;

  // Delete the token so it can't be reused
  await redis.del(`portal:magic:${token}`);

  return email as string;
}

// Create a session for a verified user
export async function createSession(email: string): Promise<string> {
  const redis = getRedis();
  const sessionId = generateToken();
  const normalizedEmail = email.toLowerCase().trim();

  await redis.set(`portal:session:${sessionId}`, normalizedEmail, { ex: SESSION_TTL });

  return sessionId;
}

// Get the email associated with a session
export async function getSessionEmail(sessionId: string): Promise<string | null> {
  const redis = getRedis();
  const email = await redis.get(`portal:session:${sessionId}`);
  return email as string | null;
}

// Destroy a session
export async function destroySession(sessionId: string): Promise<void> {
  const redis = getRedis();
  await redis.del(`portal:session:${sessionId}`);
}

// Send magic link email via Resend
export async function sendMagicLinkEmail(email: string, magicLinkUrl: string): Promise<boolean> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'CheckMyRental <send@checkmyrental.io>',
        to: [email],
        subject: 'Your CheckMyRental Login Link',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: #fff; margin: 0; font-size: 24px;">CheckMyRental</h1>
            </div>
            <div style="padding: 30px; background: #fff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #1e293b; margin-top: 0;">Sign In to Your Portal</h2>
              <p style="color: #475569; line-height: 1.6;">
                Click the button below to sign in to your landlord portal. This link expires in 15 minutes.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${magicLinkUrl}" style="display: inline-block; padding: 14px 32px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Sign In
                </a>
              </div>
              <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">
                If you didn't request this link, you can safely ignore this email.<br>
                This link can only be used once and expires in 15 minutes.
              </p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
              <p style="color: #94a3b8; font-size: 12px;">
                CheckMyRental - Professional Property Inspections<br>
                Tampa Bay, Florida
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send magic link email:', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send magic link email:', error);
    return false;
  }
}
