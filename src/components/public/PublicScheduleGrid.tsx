'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  groupClassesByDay,
  SCHEDULE_DAYS,
  scheduleAccent,
  type PublicScheduleClass,
} from '@/lib/public-schedule';
import { formatClassTime } from '@/lib/gym-public-time';
import { weekdayNameForDate } from '@/lib/todays-classes';

type Props = {
  classes: PublicScheduleClass[];
  timezone: string;
  gymSlug: string;
  gymName: string;
  compact?: boolean;
  showTrialLinks?: boolean;
};

function ClassCard({
  cls,
  timezone,
  gymSlug,
  accent,
  showTrialLinks,
}: {
  cls: PublicScheduleClass;
  timezone: string;
  gymSlug: string;
  accent: string;
  showTrialLinks: boolean;
}) {
  return (
    <div
      className="bg-[#111] border border-white/10 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:justify-between gap-3 min-h-[88px]"
      style={{ borderLeftWidth: 4, borderLeftColor: accent }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-white">{cls.name}</p>
          {cls.category_tag && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-medium border"
              style={{
                color: accent,
                borderColor: `${accent}40`,
                backgroundColor: `${accent}15`,
              }}
            >
              {cls.category_tag}
            </span>
          )}
        </div>
        <p className="text-xs text-white/30 mt-0.5">{cls.instructor}</p>
      </div>
      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
        <div className="text-sm text-white/50 text-left sm:text-right">
          <p>
            {formatClassTime(cls.start_time, timezone)} – {formatClassTime(cls.end_time, timezone)}
          </p>
          {cls.capacity != null && (
            <p className="text-xs text-white/25">{cls.capacity} spots</p>
          )}
        </div>
        {showTrialLinks && (
          <Link
            href={`/g/${gymSlug}/trial?class=${encodeURIComponent(cls.name)}`}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 border border-blue-400/30 rounded-lg px-3 py-1.5 whitespace-nowrap"
          >
            Book trial
          </Link>
        )}
      </div>
    </div>
  );
}

export default function PublicScheduleGrid({
  classes,
  timezone,
  gymSlug,
  gymName,
  compact = false,
  showTrialLinks = true,
}: Props) {
  const grouped = useMemo(() => groupClassesByDay(classes), [classes]);
  const activeDays = useMemo(
    () => SCHEDULE_DAYS.filter((d) => (grouped[d]?.length ?? 0) > 0),
    [grouped]
  );
  const todayName = weekdayNameForDate();
  const [mobileDay, setMobileDay] = useState(
    activeDays.includes(todayName as (typeof SCHEDULE_DAYS)[number])
      ? todayName
      : activeDays[0] ?? SCHEDULE_DAYS[0]
  );

  if (classes.length === 0) {
    return <p className="text-white/30 text-center py-12">Schedule coming soon.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Mobile: day picker + single-day grid */}
      <div className="md:hidden space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {activeDays.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setMobileDay(day)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                mobileDay === day
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-200'
                  : 'bg-white/5 border-white/10 text-white/50'
              }`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-2">
          {(grouped[mobileDay] ?? []).map((cls, i) => (
            <ClassCard
              key={`${mobileDay}-${i}`}
              cls={cls}
              timezone={timezone}
              gymSlug={gymSlug}
              accent={scheduleAccent(cls)}
              showTrialLinks={showTrialLinks}
            />
          ))}
        </div>
      </div>

      {/* Desktop / tablet: grouped by day with responsive card grid */}
      <div className="hidden md:block space-y-6">
        {activeDays.map((day) => (
          <div key={day}>
            <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-2">
              {day}
            </h2>
            <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
              {grouped[day]!.map((cls, i) => (
                <ClassCard
                  key={`${day}-${i}`}
                  cls={cls}
                  timezone={timezone}
                  gymSlug={gymSlug}
                  accent={scheduleAccent(cls)}
                  showTrialLinks={showTrialLinks}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {!compact && (
        <p className="text-white/20 text-xs text-center md:hidden">
          Weekly schedule for {gymName}
        </p>
      )}
    </div>
  );
}
