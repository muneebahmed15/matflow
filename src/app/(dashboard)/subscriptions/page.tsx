'use client';

import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { CreditCard, CheckCircle, XCircle, Download, AlertTriangle, Plus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import {
  getRevenueMetricsAction,
  exportSubscriptionsCsvAction,
  createManualSubscriptionAction,
  getSubscriptionsPageDataAction,
} from '@/app/(dashboard)/actions';
import { useAppUi } from '@/components/ui/AppUiProvider';

type Subscription = {
  id: string;
  status: string;
  current_period_end: string | null;
  stripe_subscription_id: string | null;
  payment_method?: string | null;
  members: { first_name: string; last_name: string; email: string } | null;
  plans: { name: string; price: number; interval: string } | null;
};

type Metrics = {
  mrrCents: number;
  activeSubscriptions: number;
  pastDueCount: number;
  churnRate30d: number;
  revenueByPlan: { planName: string; subscribers: number; mrrCents: number }[];
};

type Option = { id: string; label: string };

function SubscriptionsContent() {
  const searchParams = useSearchParams();
  const { error: showError, success: showSuccess } = useAppUi();
  const success = searchParams.get('success');
  const cancelled = searchParams.get('cancelled');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showManual, setShowManual] = useState(false);
  const [memberOptions, setMemberOptions] = useState<Option[]>([]);
  const [planOptions, setPlanOptions] = useState<Option[]>([]);
  const [manualMember, setManualMember] = useState('');
  const [manualPlan, setManualPlan] = useState('');
  const [manualMethod, setManualMethod] = useState<'cash' | 'check' | 'other'>('cash');
  const [submitting, setSubmitting] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);

  const load = async () => {
    const [pageResult, metricsResult] = await Promise.all([
      getSubscriptionsPageDataAction(),
      getRevenueMetricsAction(),
    ]);
    if (pageResult.ok && pageResult.data) {
      setSubscriptions(pageResult.data.subscriptions);
      setMemberOptions(pageResult.data.memberOptions);
      setPlanOptions(pageResult.data.planOptions.map((p) => ({ id: p.id, label: p.name })));
    }
    if (metricsResult.ok && metricsResult.data) setMetrics(metricsResult.data);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const handleExport = async () => {
    const result = await exportSubscriptionsCsvAction();
    if (!result.ok || !result.data) {
      showError(!result.ok ? result.error : 'Export failed');
      return;
    }
    const blob = new Blob([result.data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subscriptions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleManualCreate = async () => {
    if (!manualMember || !manualPlan) return;
    setSubmitting(true);
    const result = await createManualSubscriptionAction({
      memberId: manualMember,
      planId: manualPlan,
      paymentMethod: manualMethod,
    });
    setSubmitting(false);
    if (!result.ok) {
      showError(result.error);
      return;
    }
    showSuccess('Manual subscription added');
    setShowManual(false);
    setManualMember('');
    setManualPlan('');
    await load();
  };

  const statusColor = (s: string) => {
    if (s === 'active') return 'bg-green-500/10 text-green-400 border-green-500/20';
    if (s === 'cancelled' || s === 'canceled') return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (s === 'past_due') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    return 'bg-white/5 text-white/40 border-white/10';
  };

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">Subscriptions</h1>
          <p className="text-white/40 text-sm mt-1">All member billing subscriptions.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void handleExport()}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-sm font-semibold px-4 py-2.5 rounded-xl transition"
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            onClick={() => setShowManual(!showManual)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
          >
            <Plus size={16} /> Manual
          </button>
        </div>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-4">
            <p className="text-white/40 text-xs">MRR</p>
            <p className="text-2xl font-bold text-white mt-1">${(metrics.mrrCents / 100).toLocaleString()}</p>
          </div>
          <div className="bg-[#111] border border-white/10 rounded-2xl p-4">
            <p className="text-white/40 text-xs">Active</p>
            <p className="text-2xl font-bold text-white mt-1">{metrics.activeSubscriptions}</p>
          </div>
          <div className="bg-[#111] border border-white/10 rounded-2xl p-4">
            <p className="text-white/40 text-xs">Churn (30d)</p>
            <p className="text-2xl font-bold text-white mt-1">{metrics.churnRate30d}%</p>
          </div>
          <div
            className={`rounded-2xl p-4 border ${metrics.pastDueCount > 0 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-[#111] border-white/10'}`}
          >
            <p className={`text-xs ${metrics.pastDueCount > 0 ? 'text-yellow-300' : 'text-white/40'}`}>Past due</p>
            <p className={`text-2xl font-bold mt-1 ${metrics.pastDueCount > 0 ? 'text-yellow-300' : 'text-white'}`}>
              {metrics.pastDueCount}
            </p>
          </div>
        </div>
      )}

      {metrics && metrics.pastDueCount > 0 && (
        <div className="mb-6 flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-yellow-400 shrink-0" />
          <p className="text-yellow-300 text-sm">
            {metrics.pastDueCount} subscription{metrics.pastDueCount === 1 ? '' : 's'} past due — members are blocked from
            check-in until payment is resolved.
          </p>
        </div>
      )}

      {metrics && metrics.revenueByPlan.length > 0 && (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-5 mb-6">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">Revenue by plan</p>
          <div className="space-y-2">
            {metrics.revenueByPlan.map((p) => (
              <div key={p.planName} className="flex justify-between text-sm">
                <span className="text-white">{p.planName}</span>
                <span className="text-white/50">
                  {p.subscribers} · ${(p.mrrCents / 100).toLocaleString()}/mo
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showManual && (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-white">Manual Subscription (cash / check)</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Member</label>
              <select value={manualMember} onChange={(e) => setManualMember(e.target.value)} className={inputClass}>
                <option value="" className="bg-gray-900">
                  Select...
                </option>
                {memberOptions.map((m) => (
                  <option key={m.id} value={m.id} className="bg-gray-900">
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Plan</label>
              <select value={manualPlan} onChange={(e) => setManualPlan(e.target.value)} className={inputClass}>
                <option value="" className="bg-gray-900">
                  Select...
                </option>
                {planOptions.map((p) => (
                  <option key={p.id} value={p.id} className="bg-gray-900">
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Payment method</label>
              <select
                value={manualMethod}
                onChange={(e) => setManualMethod(e.target.value as 'cash' | 'check' | 'other')}
                className={inputClass}
              >
                <option value="cash" className="bg-gray-900">
                  Cash
                </option>
                <option value="check" className="bg-gray-900">
                  Check
                </option>
                <option value="other" className="bg-gray-900">
                  Other
                </option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => void handleManualCreate()}
              disabled={submitting || !manualMember || !manualPlan}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition"
            >
              {submitting ? 'Saving...' : 'Add Subscription'}
            </button>
            <button onClick={() => setShowManual(false)} className="px-4 border border-white/10 text-gray-400 rounded-xl hover:bg-white/5 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
          <CheckCircle size={16} className="text-green-400" />
          <p className="text-green-400 text-sm font-medium">Subscription created successfully!</p>
        </div>
      )}
      {cancelled && (
        <div className="mb-6 flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
          <XCircle size={16} className="text-yellow-400" />
          <p className="text-yellow-400 text-sm font-medium">Checkout was cancelled.</p>
        </div>
      )}

      {subscriptions.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
          <CreditCard size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40 font-medium">No subscriptions yet</p>
          <p className="text-white/20 text-sm mt-1">Subscribe a member from their profile page.</p>
          <Link href="/members" className="mt-6 inline-block text-blue-400 text-sm hover:underline">
            Go to Members →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => setSelectedSub(sub)}
              className="w-full bg-[#111] border border-white/10 rounded-2xl p-5 flex items-center justify-between gap-4 text-left hover:border-white/20 transition"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CreditCard size={18} className="text-white/40" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">
                    {sub.members ? `${sub.members.first_name} ${sub.members.last_name}` : 'Unknown'}
                  </p>
                  <p className="text-xs text-white/30">{sub.members?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="text-sm text-white font-medium">{sub.plans?.name || '—'}</p>
                  <p className="text-xs text-white/30">
                    ${sub.plans?.price?.toFixed(2)} / {sub.plans?.interval}
                    {sub.payment_method && sub.payment_method !== 'stripe' ? ` · ${sub.payment_method}` : ''}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusColor(sub.status)}`}>
                  {sub.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedSub && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close" onClick={() => setSelectedSub(null)} />
          <div className="relative w-full max-w-md bg-[#111] border-l border-white/10 p-6 overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Subscription details</h2>
              <button type="button" onClick={() => setSelectedSub(null)} className="text-white/40 hover:text-white text-sm">
                Close
              </button>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wide mb-1">Member</p>
                <p className="text-white font-medium">
                  {selectedSub.members ? `${selectedSub.members.first_name} ${selectedSub.members.last_name}` : 'Unknown'}
                </p>
                <p className="text-white/40">{selectedSub.members?.email}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wide mb-1">Plan</p>
                <p className="text-white">{selectedSub.plans?.name ?? '—'}</p>
                <p className="text-white/40">
                  ${selectedSub.plans?.price?.toFixed(2)} / {selectedSub.plans?.interval}
                </p>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wide mb-1">Status</p>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusColor(selectedSub.status)}`}>
                  {selectedSub.status}
                </span>
              </div>
              {selectedSub.current_period_end && (
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wide mb-1">Current period ends</p>
                  <p className="text-white">
                    {new Date(selectedSub.current_period_end).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              )}
              {selectedSub.payment_method && (
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wide mb-1">Payment method</p>
                  <p className="text-white capitalize">{selectedSub.payment_method}</p>
                </div>
              )}
              {selectedSub.stripe_subscription_id && (
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wide mb-1">Stripe ID</p>
                  <p className="text-white/60 font-mono text-xs break-all">{selectedSub.stripe_subscription_id}</p>
                </div>
              )}
              {selectedSub.members && (
                <Link
                  href={`/members?search=${encodeURIComponent(selectedSub.members.email)}`}
                  className="inline-block text-blue-400 hover:underline"
                >
                  View member profile →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SubscriptionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">Loading...</div>}>
      <SubscriptionsContent />
    </Suspense>
  );
}
