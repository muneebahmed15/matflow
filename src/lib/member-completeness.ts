export type MemberCompletenessInput = {
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  profile_photo_url: string | null;
  hasEmergencyContact: boolean;
  hasSignedWaiver: boolean;
};

export function computeMemberCompleteness(input: MemberCompletenessInput): number {
  const checks = [
    Boolean(input.email?.trim()),
    Boolean(input.phone?.trim()),
    Boolean(input.date_of_birth),
    Boolean(input.profile_photo_url),
    input.hasEmergencyContact,
    input.hasSignedWaiver,
  ];
  if (checks.length === 0) return 0;
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function completenessLabel(score: number): string {
  if (score >= 100) return 'Complete';
  if (score >= 80) return 'Almost complete';
  if (score >= 50) return 'Needs attention';
  return 'Incomplete';
}
