/** IBJJF adult BJJ graduation minimums (simplified preset). */
export const IBJJF_BELT_REQUIREMENTS: Array<{
  belt: string;
  minDaysAtRank: number;
  minAttendance: number;
  minCompetitionWins: number;
}> = [
  { belt: 'White', minDaysAtRank: 0, minAttendance: 0, minCompetitionWins: 0 },
  { belt: 'Blue', minDaysAtRank: 365, minAttendance: 100, minCompetitionWins: 0 },
  { belt: 'Purple', minDaysAtRank: 730, minAttendance: 150, minCompetitionWins: 1 },
  { belt: 'Brown', minDaysAtRank: 365, minAttendance: 120, minCompetitionWins: 2 },
  { belt: 'Black', minDaysAtRank: 365, minAttendance: 100, minCompetitionWins: 3 },
];

export async function applyIbjjfPreset(gymId: string): Promise<number> {
  const { getAdminClient } = await import('@/lib/supabase/admin');
  const admin = getAdminClient();

  let upserted = 0;
  for (const req of IBJJF_BELT_REQUIREMENTS) {
    const { error } = await admin.from('belt_requirements').upsert(
      {
        gym_id: gymId,
        belt: req.belt,
        min_days_at_rank: req.minDaysAtRank,
        min_attendance: req.minAttendance,
        min_competition_wins: req.minCompetitionWins,
      },
      { onConflict: 'gym_id,belt' }
    );
    if (!error) upserted++;
  }

  await admin.from('gyms').update({ belt_graduation_preset: 'ibjjf' }).eq('id', gymId);
  return upserted;
}
