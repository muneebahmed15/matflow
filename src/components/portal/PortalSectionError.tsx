'use client';

import ErrorState from '@/components/ErrorState';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
  section?: string;
};

export default function PortalSectionError({ error, reset, section }: Props) {
  const label = section ? ` in ${section}` : '';
  return (
    <ErrorState
      message={error.message || `Something went wrong${label}.`}
      onRetry={reset}
    />
  );
}
