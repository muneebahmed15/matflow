/** Max enrollments allowed (capacity + overbook allowance). Null = unlimited. */
export function effectiveEnrollmentLimit(
  capacity: number | null,
  overbookAllowance = 0
): number | null {
  if (capacity === null || capacity <= 0) return null;
  return capacity + Math.max(0, overbookAllowance);
}

export function isAtEnrollmentLimit(
  capacity: number | null,
  activeCount: number,
  overbookAllowance = 0
): boolean {
  const limit = effectiveEnrollmentLimit(capacity, overbookAllowance);
  return limit !== null && activeCount >= limit;
}
