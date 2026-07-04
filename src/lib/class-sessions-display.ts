export function effectiveSessionInstructor(session: {
  instructor: string | null;
  substitute_instructor: string | null;
}): string | null {
  return session.substitute_instructor?.trim() || session.instructor?.trim() || null;
}
