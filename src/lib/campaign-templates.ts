export type CampaignTemplate = {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  audience: string;
};

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome new members',
    subject: 'Welcome to {{gym_name}}!',
    bodyHtml:
      '<p>Hi {{first_name}},</p><p>Welcome to the team! We are excited to train with you. Your first class is the hardest — after that it gets easier.</p><p>See you on the mats,<br/>{{gym_name}}</p>',
    audience: 'active_members',
  },
  {
    id: 'winback',
    name: 'Win-back inactive members',
    subject: 'We miss you at {{gym_name}}',
    bodyHtml:
      '<p>Hi {{first_name}},</p><p>It has been a while since we have seen you. Come back this week — your spot on the mat is waiting.</p><p>Reply to this email if you need help getting back on schedule.</p>',
    audience: 'inactive_members',
  },
  {
    id: 'trial_followup',
    name: 'Trial follow-up',
    subject: 'How was your trial at {{gym_name}}?',
    bodyHtml:
      '<p>Hi {{first_name}},</p><p>Thanks for trying a class with us! We would love to hear how it went and help you pick the right membership.</p><p>Book a quick chat or drop in anytime.</p>',
    audience: 'leads',
  },
  {
    id: 'past_due',
    name: 'Past due reminder',
    subject: 'Action needed: membership payment',
    bodyHtml:
      '<p>Hi {{first_name}},</p><p>Your membership payment did not go through. Please update your billing so you can keep checking in without interruption.</p>',
    audience: 'past_due',
  },
  {
    id: 'promotion',
    name: 'Promotion announcement',
    subject: 'Special offer at {{gym_name}} — limited time!',
    bodyHtml:
      '<p>Hi {{first_name}},</p><p>We are running a special promotion this month at {{gym_name}}. Lock in your spot before it fills up.</p><p><strong>Offer details:</strong> Add your promotion terms here.</p><p>See you on the mats!</p>',
    audience: 'all_members',
  },
];
