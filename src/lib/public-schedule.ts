import { classAccentColor } from '@/lib/class-tags';

export const SCHEDULE_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export type PublicScheduleClass = {
  name: string;
  instructor: string | null;
  day_of_week: string | null;
  start_time: string | null;
  end_time: string | null;
  capacity: number | null;
  category_tag: string | null;
  color: string | null;
};

export type GroupedSchedule = Record<string, PublicScheduleClass[]>;

export function groupClassesByDay(classes: PublicScheduleClass[]): GroupedSchedule {
  return SCHEDULE_DAYS.reduce((acc, day) => {
    acc[day] = classes.filter((c) => c.day_of_week === day);
    return acc;
  }, {} as GroupedSchedule);
}

export function scheduleAccent(cls: PublicScheduleClass): string {
  return classAccentColor(cls.color);
}
