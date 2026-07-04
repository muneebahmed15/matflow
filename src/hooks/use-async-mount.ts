'use client';

import { useEffect } from 'react';

/**
 * Run client-side async work after mount. Defers execution to a microtask so
 * state updates do not run synchronously inside the effect body (React 19 lint).
 */
export function useAsyncMount(effect: () => void | Promise<void>, deps: readonly unknown[]) {
  useEffect(() => {
    queueMicrotask(() => {
      void effect();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps forwarded from caller
  }, deps);
}

/**
 * Run synchronous client-only setup after mount (e.g. reading window/localStorage).
 */
export function useClientMount(setup: () => void, deps: readonly unknown[] = []) {
  useEffect(() => {
    queueMicrotask(setup);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps forwarded from caller
  }, deps);
}
