'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentStaffInfo } from '@/lib/permissions'
import { UserPlus, Plus, ArrowRight } from 'lucide-react'
import {
  convertLeadAction,
  createLeadAction,
  updateLeadStatusAction,
} from '@/app/(dashboard)/actions'
import { useAppUi } from '@/components/ui/AppUiProvider'
import { ListSkeleton } from '@/components/LoadingSkeleton'

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  source: string
  status: string
  notes: string
  interested_in: string
  created_at: string
}

const STATUSES = ['new', 'contacted', 'trial_scheduled', 'trial_completed', 'converted', 'lost']

const statusColors: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  contacted: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  trial_scheduled: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  trial_completed: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  converted: 'bg-green-500/10 text-green-400 border-green-500/20',
  lost: 'bg-white/5 text-white/30 border-white/10',
}

const statusLabels: Record<string, string> = {
  new: 'New', contacted: 'Contacted', trial_scheduled: 'Trial Scheduled',
  trial_completed: 'Trial Completed', converted: 'Converted', lost: 'Lost',
}

export default function LeadsPage() {
  const { confirm, error: showError, success } = useAppUi()
  const [leads, setLeads] = useState<Lead[]>([])
  const [gymId, setGymId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [source, setSource] = useState('walk-in')
  const [interestedIn, setInterestedIn] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const info = await getCurrentStaffInfo()
      if (!info.gymId) return
      setGymId(info.gymId)
      const { data } = await supabase.from('leads').select('*').eq('gym_id', info.gymId).order('created_at', { ascending: false })
      setLeads(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const handleSubmit = async () => {
    if (!firstName || !lastName) { setError('First and last name are required.'); return }
    setSubmitting(true)
    setError('')
    const result = await createLeadAction({
      firstName,
      lastName,
      email,
      phone,
      source,
      interestedIn,
    })
    if (!result.ok) {
      setError(result.error)
      setSubmitting(false)
      return
    }
    const { data } = await supabase.from('leads').select('*').eq('gym_id', gymId).order('created_at', { ascending: false })
    setLeads(data || [])
    setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setSource('walk-in'); setInterestedIn('')
    setShowForm(false)
    setSubmitting(false)
  }

  const handleStatusChange = async (id: string, status: string) => {
    const result = await updateLeadStatusAction(id, status)
    if (result.ok) {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    }
  }

  const handleConvert = async (lead: Lead) => {
    const ok = await confirm({
      title: 'Convert lead to member',
      message: `Create a full member profile for ${lead.first_name} ${lead.last_name}?`,
      confirmLabel: 'Convert',
    })
    if (!ok) return
    const result = await convertLeadAction(lead.id)
    if (!result.ok) {
      showError(result.error)
      return
    }
    success(`${lead.first_name} ${lead.last_name} converted to member.`)
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'converted' } : l))
  }

  const filteredLeads = filter === 'all' ? leads : leads.filter(l => l.status === filter)
  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

  if (loading) return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <ListSkeleton count={5} />
    </div>
  )

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold">Leads</h1>
          <p className="text-white/40 text-sm mt-1">Track prospects before they become members.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
          <Plus size={16} /> Add Lead
        </button>
      </div>

      {showForm && (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-white">New Lead</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">First Name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Last Name</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Source</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} className={inputClass}>
                <option value="walk-in" className="bg-gray-900">Walk-in</option>
                <option value="referral" className="bg-gray-900">Referral</option>
                <option value="social" className="bg-gray-900">Social Media</option>
                <option value="website" className="bg-gray-900">Website</option>
                <option value="other" className="bg-gray-900">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Interested In</label>
              <input value={interestedIn} onChange={(e) => setInterestedIn(e.target.value)} placeholder="e.g. BJJ classes" className={inputClass} />
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition">
              {submitting ? 'Saving...' : 'Add Lead'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 border border-white/10 text-gray-400 rounded-xl hover:bg-white/5 transition">Cancel</button>
          </div>
        </div>
      )}

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === 'all' ? 'bg-white/10 text-white' : 'bg-white/5 text-white/40'}`}>
          All ({leads.length})
        </button>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === s ? 'bg-white/10 text-white' : 'bg-white/5 text-white/40'}`}>
            {statusLabels[s]} ({leads.filter(l => l.status === s).length})
          </button>
        ))}
      </div>

      {filteredLeads.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
          <UserPlus size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40 font-medium">No leads {filter !== 'all' ? `with status "${statusLabels[filter]}"` : 'yet'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeads.map((lead) => (
            <div key={lead.id} className="bg-[#111] border border-white/10 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center font-bold text-sm text-white/60">
                    {lead.first_name[0]}{lead.last_name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{lead.first_name} {lead.last_name}</p>
                    <p className="text-xs text-white/30">{lead.email || lead.phone || 'No contact info'}</p>
                    {lead.interested_in && <p className="text-xs text-white/20 mt-0.5">Interested in: {lead.interested_in}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select value={lead.status} onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusColors[lead.status]} bg-transparent`}>
                    {STATUSES.map(s => (
                      <option key={s} value={s} className="bg-gray-900 text-white">{statusLabels[s]}</option>
                    ))}
                  </select>
                  {lead.status !== 'converted' && (
                    <button onClick={() => handleConvert(lead)} className="flex items-center gap-1 text-xs text-green-400 hover:underline font-medium">
                      Convert <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5 text-xs text-white/20">
                <span className="capitalize">{lead.source}</span>
                <span>&middot;</span>
                <span>{new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
