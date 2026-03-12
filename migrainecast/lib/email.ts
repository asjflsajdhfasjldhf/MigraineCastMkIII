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
    peak_krii: number;
    peak_hour: string;
    triggers: string[];
    recommendation: string;
  }
): Promise<void> {
  const { peak_krii, peak_hour, triggers, recommendation } = data;

  const peakPercentage = Math.round(peak_krii * 100);
  const triggersHtml = triggers
    .map((t) => `<li>${t}</li>`)
    .join('');

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
          .risk-badge { display: inline-block; background: #ef4444; color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold; margin: 10px 0; }
          .triggers { background: #f9fafb; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .triggers h3 { margin: 0 0 10px 0; color: #111827; font-size: 14px; text-transform: uppercase; }
          .triggers ul { margin: 0; padding-left: 20px; }
          .triggers li { margin: 5px 0; color: #374151; }
          .recommendation { background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .recommendation h3 { margin: 0 0 10px 0; color: #047857; font-size: 14px; text-transform: uppercase; }
          .recommendation p { margin: 0; color: #374151; }
          .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 15px 0; }
          .cta-button:hover { background: #5568d3; }
          .footer { background: #f3f4f6; padding: 15px 20px; text-align: center; font-size: 12px; color: #6b7280; }
          a { color: #667eea; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">⚠️ MigraineCast Warnung</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">Erhöhtes Migränerisiko erkannt</p>
          </div>

          <div class="content">
            <p>Hallo,</p>
            <p>Basierend auf den aktuellen Wetterdaten und Umweltfaktoren wurde ein erhöhtes Migränerisiko für heute erkannt.</p>

            <div style="text-align: center;">
              <p style="font-size: 14px; color: #6b7280; margin: 10px 0;">Höchstes Risiko um</p>
              <div style="font-size: 32px; font-weight: bold; color: #667eea;">${peak_hour}</div>
              <div class="risk-badge">${peakPercentage}% Risikoscore</div>
            </div>

            ${
              triggers.length > 0
                ? `
            <div class="triggers">
              <h3>Hauptauslöser:</h3>
              <ul>
                ${triggersHtml}
              </ul>
            </div>
            `
                : ''
            }

            <div class="recommendation">
              <h3>💡 Empfehlung</h3>
              <p>${recommendation}</p>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/journal" class="cta-button">📝 Attacke jetzt aufzeichnen</a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              Für detailliertere Informationen besuchen Sie bitte Ihre <a href="${process.env.NEXT_PUBLIC_APP_URL}">MigraineCast App</a>.
            </p>
          </div>

          <div class="footer">
            <p style="margin: 0;">© ${new Date().getFullYear()} MigraineCast - Intelligente Migräne-Vorhersage</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: `🚨 MigraineCast: Erhöhtes Migränerisiko um ${peak_hour}`,
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
