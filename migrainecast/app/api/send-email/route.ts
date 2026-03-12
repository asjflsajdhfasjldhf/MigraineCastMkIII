// API route for sending emails
import { sendTestEmail, sendDailyWarningEmail } from '@/lib/email';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, email, data } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    if (type === 'test') {
      await sendTestEmail(email);
      return NextResponse.json({ success: true, message: 'Test email sent' });
    } else if (type === 'daily-warning') {
      if (!data) {
        return NextResponse.json(
          { error: 'Data is required for daily warning email' },
          { status: 400 }
        );
      }
      await sendDailyWarningEmail(email, {
        date: data.date || new Date().toLocaleDateString('de-DE'),
        peak_krii: data.peak_krii ?? 0,
        peak_hour: data.peak_hour || '--:--',
        trigger_details: data.trigger_details || data.triggers || [],
        recommendation: data.recommendation || 'Keine Empfehlung hinterlegt.',
      });
      return NextResponse.json({ success: true, message: 'Warning email sent' });
    }

    return NextResponse.json(
      { error: 'Invalid email type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Send email API error:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
