'use client';

import BusinessInsightsWidget from '@/components/dashboard/BusinessInsightsWidget';
import { StatsSkeleton } from '@/components/LoadingSkeleton';
import { Suspense } from 'react';

export default function InsightsPage() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-2">Business Insights</h1>
      <p className="text-white/40 text-sm mb-8">AI-powered daily summary and recommended actions.</p>
      <Suspense fallback={<StatsSkeleton />}>
        <BusinessInsightsWidget />
      </Suspense>
    </div>
  );
}
