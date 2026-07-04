export type MarketingConsentFields = {
  email_opt_out: boolean;
  marketing_email_consent: boolean;
  sms_marketing_consent?: boolean;
};

/** Whether the member may receive marketing email (campaigns, win-back). */
export function canSendMarketingEmail(member: MarketingConsentFields): boolean {
  if (member.email_opt_out) return false;
  return member.marketing_email_consent;
}

export function canSendMarketingSms(member: {
  sms_marketing_consent?: boolean;
}): boolean {
  return Boolean(member.sms_marketing_consent);
}
