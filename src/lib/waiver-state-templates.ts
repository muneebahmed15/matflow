import type { WaiverTemplate } from '@/lib/waiver-templates';

export type StateWaiverTemplate = WaiverTemplate & { state: string };

export const STATE_WAIVER_TEMPLATES: StateWaiverTemplate[] = [
  {
    key: 'ca_liability',
    state: 'CA',
    label: 'California — Liability',
    title: 'California Liability Waiver',
    body: `Under California Civil Code, I, {{member_name}}, knowingly and voluntarily assume all risks of martial arts training at {{gym_name}} and release the gym from liability to the fullest extent permitted by law.

Signed on {{date}} in California.`,
  },
  {
    key: 'tx_liability',
    state: 'TX',
    label: 'Texas — Liability',
    title: 'Texas Express Assumption of Risk',
    body: `I, {{member_name}}, understand that Texas law allows participants to assume inherent risks of contact sports. I release {{gym_name}} from claims arising from ordinary negligence related to inherent risks.

Signed on {{date}} in Texas.`,
  },
  {
    key: 'ny_liability',
    state: 'NY',
    label: 'New York — Liability',
    title: 'New York General Release',
    body: `I, {{member_name}}, agree that participation at {{gym_name}} is voluntary. I release {{gym_name}} from liability except where prohibited by New York law.

Signed on {{date}} in New York.`,
  },
];

export function getStateWaiverTemplate(stateCode: string): StateWaiverTemplate | undefined {
  return STATE_WAIVER_TEMPLATES.find((t) => t.state === stateCode.toUpperCase());
}
