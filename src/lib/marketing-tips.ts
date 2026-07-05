import type { BusinessMetrics } from '@/services/business-assistant';

const TIPS = [
  'Post a short class recap on social media — it boosts retention and attracts trials.',
  'Ask happy members for a Google review after their 10th check-in.',
  'Run a bring-a-friend week when attendance is soft mid-month.',
  'Highlight your beginner-friendly classes in trial follow-up emails.',
  'Share belt promotion photos — they perform well on Instagram.',
];

export function marketingTipForMetrics(metrics: BusinessMetrics): string {
  if (metrics.newLeads7d === 0) {
    return 'No new leads this week — try a local Facebook ad or a free seminar post.';
  }
  if (metrics.lowAttendanceClasses > 0) {
    return 'Low attendance on some classes? Promote them in your trial welcome email sequence.';
  }
  if (metrics.inactiveByThreshold > 3) {
    return 'Several inactive members — a personal text from the coach often wins people back.';
  }
  const dayIndex = new Date().getDate() % TIPS.length;
  return TIPS[dayIndex] ?? TIPS[0]!;
}
