'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Plan = {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: string;
  is_active: boolean;
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [interval, setInterval] = useState('month');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    setLoading(true);
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setPlans(data);
    setLoading(false);
  }

  async function handleSubmit() {
    if (!name || !price) return;
    setSaving(true);

    const res = await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        price: parseFloat(price),
        interval,
        gym_id: null,
      }),
    });

    const data = await res.json();

    if (data.success) {
      setName('');
      setDescription('');
      setPrice('');
      setInterval('month');
      setShowForm(false);
      fetchPlans();
    } else {
      alert('Error: ' + data.error);
    }

    setSaving(false);
  }
  async function toggleActive(id: string, current: boolean) {
    await supabase
      .from('plans')
      .update({ is_active: !current })
      .eq('id', id);
    fetchPlans();
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Membership Plans</h1>
            <p className="text-gray-400 text-sm mt-1">Create and manage plans for your gym</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            {showForm ? 'Cancel' : '+ New Plan'}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">New Plan</h2>
            <div className="grid grid-cols-1 gap-4">
              <input
                type="text"
                placeholder="Plan name (e.g. Basic Monthly)"
                value={name}
                onChange={e => setName(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm"
              />
              <div className="flex gap-4">
                <input
                  type="number"
                  placeholder="Price (e.g. 99)"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm flex-1"
                />
                <select
                  value={interval}
                  onChange={e => setInterval(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm"
                >
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                </select>
              </div>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                {saving ? 'Saving...' : 'Save Plan'}
              </button>
            </div>
          </div>
        )}

        {/* Plans List */}
        {loading ? (
          <p className="text-gray-400">Loading plans...</p>
        ) : plans.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg">No plans yet</p>
            <p className="text-sm mt-1">Click "+ New Plan" to create your first membership plan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map(plan => (
              <div
                key={plan.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${plan.is_active ? 'bg-green-900 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {plan.description && (
                  <p className="text-gray-400 text-sm mb-3">{plan.description}</p>
                )}
                <p className="text-2xl font-bold text-white">
                  ${plan.price}
                  <span className="text-sm text-gray-400 font-normal">/{plan.interval}</span>
                </p>
                <button
                  onClick={() => toggleActive(plan.id, plan.is_active)}
                  className="mt-4 text-xs text-gray-400 hover:text-white underline"
                >
                  {plan.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}