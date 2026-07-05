export type MemberRequiredFields = {
  email?: boolean;
  phone?: boolean;
  date_of_birth?: boolean;
  emergency_contact?: boolean;
};

export function parseMemberRequiredFields(raw: unknown): MemberRequiredFields {
  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;
  return {
    email: Boolean(obj.email),
    phone: Boolean(obj.phone),
    date_of_birth: Boolean(obj.date_of_birth),
    emergency_contact: Boolean(obj.emergency_contact),
  };
}

export function validateMemberRequiredFields(input: {
  config: MemberRequiredFields;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  hasEmergencyContact: boolean;
}): string | null {
  if (input.config.email && !input.email?.trim()) {
    return 'Email is required for active members at this gym.';
  }
  if (input.config.phone && !input.phone?.trim()) {
    return 'Phone is required for active members at this gym.';
  }
  if (input.config.date_of_birth && !input.dateOfBirth) {
    return 'Date of birth is required for active members at this gym.';
  }
  if (input.config.emergency_contact && !input.hasEmergencyContact) {
    return 'Emergency contact is required for active members at this gym.';
  }
  return null;
}
