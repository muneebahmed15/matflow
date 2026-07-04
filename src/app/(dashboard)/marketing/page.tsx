'use client';

import { useState } from 'react';
import { useAsyncMount } from '@/hooks/use-async-mount';
import { Megaphone, Send, BarChart3 } from 'lucide-react';
import {
  createCampaignAction,
  listCampaignsAction,
  sendCampaignAction,
  scheduleCampaignAction,
  cancelScheduledCampaignAction,
  getMarketingFunnelAction,
  getLeadSourceStatsAction,
  updateCampaignAdSpendAction,
} from '@/app/(dashboard)/actions';
import { CAMPAIGN_TEMPLATES } from '@/lib/campaign-templates';
import { computeCampaignRoas, summarizeCampaignRoas } from '@/lib/campaign-roas';

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<
    {
      id: string;
      name: string;
      subject: string;
      audience: string;
      status: string;
      sent_count: number;
      open_count?: number;
      click_count?: number;
      ad_spend_cents?: number;
    }[]
  >([]);
  const [funnel, setFunnel] = useState({
    leads: 0,
    trialScheduled: 0,
    contacted: 0,
    converted: 0,
    lost: 0,
  });
  const [sources, setSources] = useState<{ source: string; count: number }[]>([]);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [audience, setAudience] = useState('active_members');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [campaignRes, funnelRes, sourceRes] = await Promise.all([
      listCampaignsAction(),
      getMarketingFunnelAction(),
      getLeadSourceStatsAction(),
    ]);
    if (campaignRes.ok && campaignRes.data) setCampaigns(campaignRes.data);
    if (funnelRes.ok && funnelRes.data) setFunnel(funnelRes.data);
    if (sourceRes.ok && sourceRes.data) setSources(sourceRes.data);
    setLoading(false);
  };

  useAsyncMount(load, []);

  const create = async () => {
    const res = await createCampaignAction({ name, subject, bodyHtml, audience });
    if (res.ok) {
      setName('');
      setSubject('');
      setBodyHtml('');
      void load();
    }
  };

  const send = async (id: string) => {
    await sendCampaignAction(id);
    void load();
  };

  const schedule = async (id: string) => {
    const when = window.prompt('Send at (YYYY-MM-DD HH:MM, local time):');
    if (!when) return;
    const date = new Date(when);
    if (Number.isNaN(date.getTime())) return;
    await scheduleCampaignAction(id, date.toISOString());
    void load();
  };

  const cancelSchedule = async (id: string) => {
    await cancelScheduledCampaignAction(id);
    void load();
  };

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  const funnelTotal = funnel.leads || 1;
  const sentCampaigns = campaigns.filter((c) => c.status === 'sent' && c.sent_count > 0);
  const roasSummary = summarizeCampaignRoas(
    sentCampaigns.map((c) => ({
      sent_count: c.sent_count,
      open_count: c.open_count ?? 0,
      click_count: c.click_count ?? 0,
      ad_spend_cents: c.ad_spend_cents ?? 0,
    }))
  );

  const saveAdSpend = async (campaignId: string, dollars: string) => {
    const cents = Math.round(parseFloat(dollars || '0') * 100);
    if (Number.isNaN(cents)) return;
    await updateCampaignAdSpendAction(campaignId, cents);
    void load();
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-2">Marketing</h1>
      <p className="text-white/40 text-sm mb-8">Campaigns, funnel analytics, and lead sources.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Leads', value: funnel.leads, color: 'text-white' },
          { label: 'Trial Scheduled', value: funnel.trialScheduled, color: 'text-blue-400' },
          { label: 'Converted', value: funnel.converted, color: 'text-green-400' },
          { label: 'Lost', value: funnel.lost, color: 'text-red-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#111] border border-white/10 rounded-2xl p-5">
            <p className="text-white/40 text-xs uppercase tracking-wide">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={18} className="text-blue-400" />
          <h2 className="font-semibold text-white">Lead → Member Funnel</h2>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Leads', count: funnel.leads },
            { label: 'Trial Scheduled', count: funnel.trialScheduled },
            { label: 'Contacted', count: funnel.contacted },
            { label: 'Converted', count: funnel.converted },
          ].map((step) => (
            <div key={step.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/60">{step.label}</span>
                <span className="text-white">{step.count}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${Math.round((step.count / funnelTotal) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {sources.length > 0 && (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-8">
          <h2 className="font-semibold text-white mb-4">Lead Sources</h2>
          <div className="space-y-2">
            {sources.map((s) => (
              <div key={s.source} className="flex justify-between text-sm">
                <span className="text-white/60 capitalize">{s.source.replace(/_/g, ' ')}</span>
                <span className="text-white font-medium">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-8">
        <h2 className="font-semibold text-white mb-3">Campaign templates</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {CAMPAIGN_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setName(t.name);
                setSubject(t.subject);
                setBodyHtml(t.bodyHtml);
                setAudience(t.audience);
              }}
              className="text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-3 transition"
            >
              <p className="text-white text-sm font-medium">{t.name}</p>
              <p className="text-white/40 text-xs mt-0.5 truncate">{t.subject}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={18} className="text-green-400" />
          <h2 className="font-semibold text-white">Campaign ROAS</h2>
        </div>
        <p className="text-white/40 text-xs mb-4">
          Track email engagement and optional ad spend. Enter spend on sent campaigns to see clicks per dollar.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Emails sent', value: roasSummary.totalSent },
            { label: 'Avg open rate', value: `${Math.round(roasSummary.avgOpenRate * 100)}%` },
            { label: 'Avg click rate', value: `${Math.round(roasSummary.avgClickRate * 100)}%` },
            {
              label: 'Clicks / $',
              value: roasSummary.aggregateClicksPerDollar != null
                ? roasSummary.aggregateClicksPerDollar.toFixed(2)
                : '—',
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/5 rounded-xl p-3">
              <p className="text-white/40 text-xs">{stat.label}</p>
              <p className="text-lg font-bold text-white mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
        {sentCampaigns.length === 0 ? (
          <p className="text-white/30 text-sm">Send a campaign to see ROAS metrics.</p>
        ) : (
          <div className="space-y-2">
            {sentCampaigns.map((c) => {
              const metrics = computeCampaignRoas({
                sent_count: c.sent_count,
                open_count: c.open_count ?? 0,
                click_count: c.click_count ?? 0,
                ad_spend_cents: c.ad_spend_cents ?? 0,
              });
              return (
                <div
                  key={c.id}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm"
                >
                  <div>
                    <p className="text-white font-medium">{c.name}</p>
                    <p className="text-white/40 text-xs">
                      {c.sent_count} sent · {Math.round(metrics.openRate * 100)}% opens ·{' '}
                      {Math.round(metrics.clickRate * 100)}% clicks
                      {metrics.clicksPerDollar != null && ` · ${metrics.clicksPerDollar.toFixed(2)} clicks/$`}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-white/50">
                    Ad spend $
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={((c.ad_spend_cents ?? 0) / 100).toFixed(2)}
                      onBlur={(e) => void saveAdSpend(c.id, e.target.value)}
                      className="w-24 bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-white"
                    />
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-8 space-y-3">
        <h2 className="font-semibold text-white">New Campaign</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name" className={inputClass} />
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject" className={inputClass} />
        <textarea value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} placeholder="HTML body" rows={5} className={inputClass} />
        <select value={audience} onChange={(e) => setAudience(e.target.value)} className={inputClass}>
          <option value="all_members" className="bg-gray-900">All members</option>
          <option value="active_members" className="bg-gray-900">Active members</option>
          <option value="inactive_members" className="bg-gray-900">Inactive members</option>
          <option value="past_due" className="bg-gray-900">Past due</option>
          <option value="leads" className="bg-gray-900">Leads</option>
        </select>
        <button onClick={() => void create()} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm">
          Save Draft
        </button>
      </div>

      <h2 className="font-semibold text-white mb-3">Campaigns</h2>
      {loading ? (
        <p className="text-white/30 text-sm">Loading...</p>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-12 text-white/30">
          <Megaphone size={40} className="mx-auto mb-3 opacity-30" />
          No campaigns yet.
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.map((c) => (
            <div key={c.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex justify-between items-center">
              <div>
                <p className="text-white font-medium text-sm">{c.name}</p>
                <p className="text-white/40 text-xs">
                  {c.status} · {c.sent_count} sent
                  {c.status === 'sent' && (c.open_count != null || c.click_count != null)
                    ? ` · ${c.open_count ?? 0} opens · ${c.click_count ?? 0} clicks`
                    : ''}
                </p>
              </div>
              {c.status === 'draft' && (
                <div className="flex items-center gap-3">
                  <button onClick={() => void schedule(c.id)} className="text-white/40 text-sm hover:text-white">
                    Schedule
                  </button>
                  <button onClick={() => void send(c.id)} className="flex items-center gap-1 text-blue-400 text-sm hover:text-blue-300">
                    <Send size={14} /> Send now
                  </button>
                </div>
              )}
              {c.status === 'scheduled' && (
                <button onClick={() => void cancelSchedule(c.id)} className="text-yellow-400 text-sm hover:text-yellow-300">
                  Cancel schedule
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
