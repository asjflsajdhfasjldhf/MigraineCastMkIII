// Email sending utilities using Nodemailer

import nodemailer from 'nodemailer';

// Configure SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send email
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP configuration incomplete, skipping email send');
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      ...options,
    });
    console.log(`Email sent to ${options.to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Send daily migraine warning email
 */
export async function sendDailyWarningEmail(
  email: string,
  data: {
    date: string;
    peak_krii: number;
    peak_hour: string;
    trigger_details: string[];
    recommendation: string;
  }
): Promise<void> {
  const { date, peak_krii, peak_hour, trigger_details, recommendation } = data;

  const peakPercentage = Math.round(peak_krii * 100);
  const triggerLines = trigger_details
    .slice(0, 3)
    .map((t) => `<li>${t}</li>`)
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="de" dir="ltr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Inter, Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; color: #0f172a; }
          .container { max-width: 680px; margin: 20px auto; background: white; border: 1px solid #e5e7eb; border-radius: 8px; }
          .content { padding: 24px; }
          h1 { margin: 0 0 16px 0; font-size: 20px; font-weight: 600; }
          .section { margin-top: 16px; }
          .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; margin-bottom: 6px; }
          .value { font-size: 15px; font-weight: 500; color: #111827; }
          ul { margin: 0; padding-left: 18px; }
          li { margin: 4px 0; }
          .cta { display: inline-block; margin-top: 18px; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 6px; color: #0f172a; text-decoration: none; font-weight: 500; }
          .footer { border-top: 1px solid #e5e7eb; margin-top: 20px; padding-top: 14px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <h1>MigraineCast Tageswarnung</h1>

            <div class="section">
              <div class="label">Datum</div>
              <div class="value">${date}</div>
            </div>

            <div class="section">
              <div class="label">Peak-KRII</div>
              <div class="value">${peakPercentage}%</div>
            </div>

            <div class="section">
              <div class="label">Uhrzeit Peak</div>
              <div class="value">${peak_hour}</div>
            </div>

            <div class="section">
              <div class="label">Top 3 Trigger</div>
              <ul>
                ${triggerLines || '<li>Keine Triggerdaten verfuegbar</li>'}
              </ul>
            </div>

            <div class="section">
              <div class="label">Empfehlung</div>
              <div class="value">${recommendation}</div>
            </div>

            <a href="${process.env.NEXT_PUBLIC_APP_URL}/journal" class="cta">Zum Tagebuch</a>

            <div class="footer">MigraineCast automatischer Warnbericht</div>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: `MigraineCast Warnung ${date} - Peak ${peakPercentage}% um ${peak_hour}`,
    html,
  });
}

/**
 * Send test email
 */
export async function sendTestEmail(email: string): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html lang="de" dir="ltr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .footer { background: #f3f4f6; padding: 15px 20px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">✅ Test-E-Mail erfolgreich</h1>
          </div>

          <div class="content">
            <p>Hallo,</p>
            <p>Dies ist eine Test-E-Mail von MigraineCast. Wenn Sie diese E-Mail erhalten haben, funktionieren Ihre E-Mail-Benachrichtigungen korrekt.</p>
            <p>Sie werden ab sofort tägliche Migräne-Risiko-Warnungen erhalten, falls die KRII-Risikovorhersage über 50% liegt.</p>

            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/journal" class="cta-button">📝 Zum Tagebuch</a>
            </div>

            <p style="margin-top: 20px;">Viel Erfolg mit MigraineCast! 💜</p>
          </div>

          <div class="footer">
            <p style="margin: 0;">© ${new Date().getFullYear()} MigraineCast</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: '✅ MigraineCast: Test-E-Mail erfolgreich',
    html,
  });
}
