'use client';

import { useEffect, useState } from 'react';
import { listLocationsAction } from '@/app/(dashboard)/actions';

const STORAGE_KEY = 'matflow_dashboard_location';

export function getDashboardLocationFilter(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setDashboardLocationFilter(locationId: string | null): void {
  if (typeof window === 'undefined') return;
  if (locationId) localStorage.setItem(STORAGE_KEY, locationId);
  else localStorage.removeItem(STORAGE_KEY);
}

export default function LocationFilterBar() {
  const [locations, setLocations] = useState<{ id: string; name: string; is_primary: boolean }[]>([]);
  const [selected, setSelected] = useState<string>('');

  useEffect(() => {
    void (async () => {
      const res = await listLocationsAction();
      if (res.ok && res.data) {
        setLocations(res.data);
        const saved = getDashboardLocationFilter();
        if (saved && res.data.some((l) => l.id === saved)) setSelected(saved);
      }
    })();
  }, []);

  if (locations.length <= 1) return null;

  return (
    <div className="px-4 py-2 border-b border-white/5 bg-black/20">
      <label className="flex items-center gap-2 text-xs text-white/50">
        Location
        <select
          value={selected}
          onChange={(e) => {
            const value = e.target.value;
            setSelected(value);
            setDashboardLocationFilter(value || null);
            window.dispatchEvent(new Event('matflow-location-filter'));
          }}
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs"
        >
          <option value="" className="bg-gray-900">All locations</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id} className="bg-gray-900">
              {loc.name}{loc.is_primary ? ' (primary)' : ''}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
