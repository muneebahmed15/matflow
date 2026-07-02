'use client';

import { useEffect, useState } from 'react';
import { createLocationAction, deleteLocationAction, listLocationsAction } from '@/app/(dashboard)/actions';
import type { GymLocation } from '@/services/gym-locations';

export default function LocationsPanel() {
  const [locations, setLocations] = useState<GymLocation[]>([]);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await listLocationsAction();
    if (res.ok && res.data) setLocations(res.data);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const add = async () => {
    if (!name.trim()) return;
    await createLocationAction({
      name,
      addressLine1: address,
      isPrimary: locations.length === 0,
    });
    setName('');
    setAddress('');
    void load();
  };

  const remove = async (id: string) => {
    await deleteLocationAction(id);
    void load();
  };

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-4">
      <h2 className="font-semibold text-white">Locations</h2>
      <p className="text-white/30 text-xs">Multi-location gyms can list additional training sites.</p>
      <div className="grid grid-cols-2 gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Location name" className={inputClass} />
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" className={inputClass} />
      </div>
      <button onClick={() => void add()} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold">
        Add Location
      </button>
      {loading ? (
        <p className="text-white/30 text-sm">Loading...</p>
      ) : locations.length === 0 ? (
        <p className="text-white/30 text-sm">No additional locations.</p>
      ) : (
        <ul className="space-y-2">
          {locations.map((loc) => (
            <li key={loc.id} className="flex justify-between items-center bg-white/5 rounded-xl px-4 py-2 text-sm">
              <span className="text-white">
                {loc.name}
                {loc.is_primary && <span className="text-blue-400 text-xs ml-2">Primary</span>}
                {loc.address_line1 && <span className="text-white/30 text-xs block">{loc.address_line1}</span>}
              </span>
              <button onClick={() => void remove(loc.id)} className="text-red-400 text-xs hover:underline">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
