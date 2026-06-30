import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// This uses Supabase's built-in email or you can swap for Resend/SendGrid
// For now we log emails to a notifications table and can send via Supabase Auth emails

export async function POST(req: NextRequest) {
  const { type, member_id, gym_id, data } = await req.json();

  try {
    // Get member details
    const { data: member } = await supabaseAdmin
      .from('members')
      .select('first_name, last_name, email')
      .eq('id', member_id)
      .single();

    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    // Get gym details
    const { data: gym } = await supabaseAdmin
      .from('gyms')
      .select('name')
      .eq('id', gym_id)
      .single();

    // Log notification to DB
    await supabaseAdmin.from('notifications').insert({
      gym_id,
      member_id,
      type,
      subject: getSubject(type, gym?.name),
      body: getBody(type, member.first_name, gym?.name, data),
      sent_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Email error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function getSubject(type: string, gymName: string) {
  switch (type) {
    case 'welcome': return `Welcome to ${gymName}!`;
    case 'checkin': return `Check-in confirmed at ${gymName}`;
    case 'waiver_signed': return `Waiver signed - ${gymName}`;
    case 'subscription_created': return `Subscription activated - ${gymName}`;
    case 'belt_promotion': return `Congratulations on your promotion! - ${gymName}`;
    default: return `Notification from ${gymName}`;
  }
}

function getBody(type: string, firstName: string, gymName: string, data: any) {
  switch (type) {
    case 'welcome':
      return `Hi ${firstName}, welcome to ${gymName}! We're excited to have you train with us.`;
    case 'checkin':
      return `Hi ${firstName}, your check-in at ${gymName} has been recorded on ${new Date().toLocaleDateString()}.`;
    case 'waiver_signed':
      return `Hi ${firstName}, your waiver has been successfully signed at ${gymName}.`;
    case 'subscription_created':
      return `Hi ${firstName}, your membership subscription at ${gymName} is now active. Plan: ${data?.plan_name}.`;
    case 'belt_promotion':
      return `Hi ${firstName}, congratulations on your promotion to ${data?.to_belt} belt at ${gymName}!`;
    default:
      return `Hi ${firstName}, you have a notification from ${gymName}.`;
  }
}
