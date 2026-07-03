'use client';

import { useCallback, useEffect, useState } from 'react';
import { Calendar, Plus } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import {
  createGymEventAction,
  deleteGymEventAction,
  listGymEventsAction,
} from '@/app/(dashboard)/actions';
import type { GymEvent } from '@/services/gym-events';

const EVENT_TYPES = [
  { value: 'open_mat', label: 'Open Mat' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'tournament', label: 'In-House Tournament' },
  { value: 'belt_ceremony', label: 'Belt Ceremony' },
] as const;

export default function EventsPage() {
  const [events, setEvents] = useState<GymEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<string>('open_mat');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('20:00');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('30');

  const loadEvents = useCallback(async () => {
    const result = await listGymEventsAction();
    if (result.ok && result.data) setEvents(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const handleSubmit = async () => {
    if (!title.trim() || !eventDate) {
      setError('Title and date are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    const result = await createGymEventAction({
      title: title.trim(),
      eventType,
      eventDate,
      startTime: startTime || null,
      endTime: endTime || null,
      location: location || null,
      description: description || null,
      capacity: capacity ? parseInt(capacity, 10) : null,
    });
    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    await loadEvents();
    setTitle('');
    setEventType('open_mat');
    setEventDate('');
    setStartTime('18:00');
    setEndTime('20:00');
    setLocation('');
    setDescription('');
    setCapacity('30');
    setShowForm(false);
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    const result = await deleteGymEventAction(id);
    if (result.ok) setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const typeLabel = (value: string) => EVENT_TYPES.find((t) => t.value === value)?.label ?? value;

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold">Events & Open Mats</h1>
          <p className="text-white/40 text-sm mt-1">Seminars, open mats, belt ceremonies, and gym events.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <Plus size={16} /> New Event
        </button>
      </div>

      {showForm && (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-white">Create event</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Saturday Open Mat" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
              <select value={eventType} onChange={(e) => setEventType(e.target.value)} className={inputClass}>
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value} className="bg-gray-900">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Main mat" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Start time</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">End time</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Capacity</label>
              <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Details for your members..."
              className={inputClass}
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition"
            >
              {submitting ? 'Saving...' : 'Create event'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 border border-white/10 text-gray-400 rounded-xl hover:bg-white/5 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <EmptyState icon={Calendar} title="No events scheduled" description="Create your first open mat, seminar, or belt ceremony." />
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="bg-[#111] border border-white/10 rounded-2xl p-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Calendar size={18} className="text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">{event.title}</p>
                  <p className="text-xs text-blue-400/80 mt-0.5">{typeLabel(event.event_type)}</p>
                  <p className="text-xs text-white/40 mt-1">
                    {new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    {event.start_time ? ` · ${event.start_time.slice(0, 5)}` : ''}
                    {event.end_time ? ` – ${event.end_time.slice(0, 5)}` : ''}
                    {event.location ? ` · ${event.location}` : ''}
                  </p>
                  {event.description && <p className="text-sm text-white/45 mt-2">{event.description}</p>}
                </div>
              </div>
              <button onClick={() => handleDelete(event.id)} className="text-white/20 hover:text-red-400 text-xs transition flex-shrink-0">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
