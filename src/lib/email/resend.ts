import { getEmailEnv, isProduction } from '@/lib/env';
import { ServiceError } from '@/services/errors';

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult = {
  id: string;
  channel: 'resend' | 'dev';
};

/** Send transactional email via Resend, or log in development when unconfigured. */
export async function sendTransactionalEmail(
  input: SendEmailInput
): Promise<SendEmailResult> {
  const emailEnv = getEmailEnv();

  if (emailEnv) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${emailEnv.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailEnv.RESEND_FROM_EMAIL,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    const body = (await response.json()) as { id?: string; message?: string };
    if (!response.ok) {
      throw new ServiceError(502, body.message ?? 'Email provider error');
    }

    return { id: body.id ?? 'unknown', channel: 'resend' };
  }

  if (isProduction()) {
    throw new ServiceError(
      503,
      'Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.'
    );
  }

  console.info('[dev email]', {
    to: input.to,
    subject: input.subject,
    text: input.text ?? input.html.replace(/<[^>]+>/g, ' '),
  });

  return { id: 'dev-log', channel: 'dev' };
}

export function staffInviteEmail(input: {
  fullName: string;
  gymName: string;
  role: string;
  actionLink: string;
}): SendEmailInput {
  const roleLabel = input.role === 'admin' ? 'Admin' : 'Coach';
  const subject = `You're invited to ${input.gymName} on MatsFlow`;
  const text = [
    `Hi ${input.fullName},`,
    '',
    `You've been invited as ${roleLabel} at ${input.gymName}.`,
    'Accept your invite and set your password:',
    input.actionLink,
  ].join('\n');

  return {
    to: '',
    subject,
    text,
    html: `
      <p>Hi ${escapeHtml(input.fullName)},</p>
      <p>You've been invited as <strong>${roleLabel}</strong> at <strong>${escapeHtml(input.gymName)}</strong>.</p>
      <p><a href="${escapeHtml(input.actionLink)}">Accept invite and set your password</a></p>
      <p>If you did not expect this email, you can ignore it.</p>
    `.trim(),
  };
}

export function staffAddedEmail(input: {
  fullName: string;
  gymName: string;
  role: string;
  loginLink: string;
}): SendEmailInput {
  const roleLabel = input.role === 'admin' ? 'Admin' : 'Coach';
  const subject = `You now have ${roleLabel} access at ${input.gymName}`;
  const text = [
    `Hi ${input.fullName},`,
    '',
    `You've been added as ${roleLabel} at ${input.gymName}.`,
    'Sign in to your dashboard:',
    input.loginLink,
  ].join('\n');

  return {
    to: '',
    subject,
    text,
    html: `
      <p>Hi ${escapeHtml(input.fullName)},</p>
      <p>You've been added as <strong>${roleLabel}</strong> at <strong>${escapeHtml(input.gymName)}</strong>.</p>
      <p><a href="${escapeHtml(input.loginLink)}">Open dashboard</a></p>
    `.trim(),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
