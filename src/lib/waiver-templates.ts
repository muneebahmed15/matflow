export type WaiverTemplate = {
  key: string;
  label: string;
  title: string;
  body: string;
};

export const WAIVER_TEMPLATES: WaiverTemplate[] = [
  {
    key: 'general_liability',
    label: 'General Liability',
    title: 'Liability Waiver and Release',
    body: `I, {{member_name}}, acknowledge that participation in physical training activities at {{gym_name}} involves inherent risks of injury.

In consideration of being permitted to participate, I voluntarily assume all risks and release {{gym_name}}, its owners, instructors, and staff from any and all liability, claims, or causes of action arising out of my participation.

I confirm that I am physically fit and have no medical condition that would prevent safe participation.

Signed on {{date}}.`,
  },
  {
    key: 'bjj',
    label: 'BJJ / Grappling',
    title: 'Brazilian Jiu-Jitsu Training Waiver',
    body: `I, {{member_name}}, understand that Brazilian Jiu-Jitsu and grappling involve close physical contact, joint locks, chokeholds, and throws that carry a risk of serious injury.

I voluntarily accept these risks and agree to train with control and respect for my training partners at {{gym_name}}. I release {{gym_name}}, its owners, instructors, and staff from all liability for injuries sustained during training, sparring, or competition preparation.

I agree to follow all gym rules and to tap early and often.

Signed on {{date}}.`,
  },
  {
    key: 'mma',
    label: 'MMA / Striking',
    title: 'Mixed Martial Arts Training Waiver',
    body: `I, {{member_name}}, acknowledge that mixed martial arts training includes striking, sparring, and full-contact drills that carry significant risk of injury, including concussion.

I voluntarily assume all risks associated with this training and release {{gym_name}}, its owners, instructors, and staff from all liability. I agree to use required protective equipment at all times and to notify staff of any injury or medical condition.

Signed on {{date}}.`,
  },
];

/** Replace {{member_name}}, {{gym_name}} and {{date}} merge fields in a waiver body. */
export function renderWaiverMergeFields(
  body: string,
  fields: { memberName?: string; gymName?: string; date?: string }
): string {
  return body
    .replaceAll('{{member_name}}', fields.memberName ?? '____________________')
    .replaceAll('{{gym_name}}', fields.gymName ?? 'the gym')
    .replaceAll('{{date}}', fields.date ?? new Date().toLocaleDateString());
}
