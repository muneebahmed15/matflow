'use client';

import { buildGoogleCalendarSubscribeUrl } from '@/lib/ical';

type Props = {
  icsFeedUrl: string;
};

export default function CalendarSubscribeSnippet({ icsFeedUrl }: Props) {
  if (!icsFeedUrl) return null;

  const googleUrl = buildGoogleCalendarSubscribeUrl(icsFeedUrl);

  return (
    <div className="space-y-3">
      <p className="text-white/40 text-xs">
        Subscribe in Google Calendar or download the ICS feed for Apple Calendar and Outlook.
      </p>
      <div className="flex flex-wrap gap-3 text-sm">
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-xl bg-white/10 px-4 py-2 text-white hover:bg-white/15 transition"
        >
          Add to Google Calendar
        </a>
        <a href={icsFeedUrl} className="inline-flex items-center text-blue-400 hover:underline">
          Download .ics feed
        </a>
      </div>
      <p className="text-white/30 text-xs break-all">{icsFeedUrl}</p>
    </div>
  );
}
