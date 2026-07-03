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
  const roleLabel =
    input.role === 'admin'
      ? 'Admin'
      : input.role === 'supervisor'
        ? 'Supervisor'
        : 'Instructor';
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
  const roleLabel =
    input.role === 'admin'
      ? 'Admin'
      : input.role === 'supervisor'
        ? 'Supervisor'
        : 'Instructor';
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

export function memberPortalInviteEmail(input: {
  fullName: string;
  gymName: string;
  actionLink: string;
}): SendEmailInput {
  const subject = `Access your ${input.gymName} member portal`;
  const text = [
    `Hi ${input.fullName},`,
    '',
    `Your gym has invited you to the member portal at ${input.gymName}.`,
    'Sign in to view attendance, waivers, and billing:',
    input.actionLink,
  ].join('\n');

  return {
    to: '',
    subject,
    text,
    html: `
      <p>Hi ${escapeHtml(input.fullName)},</p>
      <p>Your gym has invited you to the <strong>${escapeHtml(input.gymName)}</strong> member portal.</p>
      <p><a href="${escapeHtml(input.actionLink)}">Open member portal</a></p>
      <p>You can sign in with a magic link sent to this email address.</p>
    `.trim(),
  };
}

export function memberWaiverLinkEmail(input: {
  fullName: string;
  gymName: string;
  portalUrl: string;
}): SendEmailInput {
  const subject = `Sign your waiver for ${input.gymName}`;
  const text = [
    `Hi ${input.fullName},`,
    '',
    `${input.gymName} needs you to review and sign your waiver before your next visit.`,
    'Open the member portal to sign:',
    input.portalUrl,
  ].join('\n');

  return {
    to: '',
    subject,
    text,
    html: `
      <p>Hi ${escapeHtml(input.fullName)},</p>
      <p><strong>${escapeHtml(input.gymName)}</strong> needs you to review and sign your waiver before your next visit.</p>
      <p><a href="${escapeHtml(input.portalUrl)}">Sign waiver in member portal</a></p>
    `.trim(),
  };
}

export function waiverExpiryReminderEmail(input: {
  fullName: string;
  gymName: string;
  waiverTitle: string;
  expiresLabel: string;
  portalUrl: string;
}): SendEmailInput {
  const subject = `Your ${input.waiverTitle} expires on ${input.expiresLabel}`;
  const text = [
    `Hi ${input.fullName},`,
    '',
    `Your signed waiver "${input.waiverTitle}" at ${input.gymName} expires on ${input.expiresLabel}.`,
    'Please sign an updated waiver before your next check-in:',
    input.portalUrl,
  ].join('\n');

  return {
    to: '',
    subject,
    text,
    html: `
      <p>Hi ${escapeHtml(input.fullName)},</p>
      <p>Your signed waiver <strong>${escapeHtml(input.waiverTitle)}</strong> at <strong>${escapeHtml(input.gymName)}</strong> expires on <strong>${escapeHtml(input.expiresLabel)}</strong>.</p>
      <p><a href="${escapeHtml(input.portalUrl)}">Sign an updated waiver</a></p>
    `.trim(),
  };
}

export function waitlistPromotedEmail(input: {
  memberName: string;
  className: string;
  dayOfWeek: string | null;
  portalUrl: string;
}): SendEmailInput {
  const when = input.dayOfWeek ? ` on ${input.dayOfWeek}` : '';
  const subject = `Spot available: ${input.className}`;
  const text = [
    `Hi ${input.memberName},`,
    '',
    `A spot opened up for ${input.className}${when}.`,
    `View your schedule: ${input.portalUrl}`,
  ].join('\n');

  return {
    to: '',
    subject,
    text,
    html: `
      <p>Hi ${escapeHtml(input.memberName)},</p>
      <p>A spot opened up for <strong>${escapeHtml(input.className)}</strong>${escapeHtml(when)}.</p>
      <p><a href="${escapeHtml(input.portalUrl)}">View class schedule</a></p>
    `.trim(),
  };
}
