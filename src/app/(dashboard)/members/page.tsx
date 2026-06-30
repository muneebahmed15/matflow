'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentStaffInfo } from '@/lib/permissions'
import Link from 'next/link'
import { Users, Plus, Search } from 'lucide-react'

interface Member {
  id: string
  first_name: string
  last_name: string
  email: string
  belt_rank: string
  status: string
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [filtered, setFiltered] = useState<Member[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMembers = async () => {
      const info = await getCurrentStaffInfo()
      if (!info.gymId) return
      const { data } = await supabase.from('members').select('*').eq('gym_id', info.gymId).order('first_name')
      if (data) { setMembers(data); setFiltered(data) }
      setLoading(false)
    }
    fetchMembers()
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(members.filter(m =>
      m.first_name.toLowerCase().includes(q) ||
      m.last_name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q)
    ))
  }, [search, members])

  const beltColor: Record<string, string> = {
    white: 'bg-white/10 text-white', yellow: 'bg-yellow-500/20 text-yellow-400',
    orange: 'bg-orange-500/20 text-orange-400', green: 'bg-green-500/20 text-green-400',
    blue: 'bg-blue-500/20 text-blue-400', purple: 'bg-purple-500/20 text-purple-400',
    brown: 'bg-amber-700/20 text-amber-600', black: 'bg-white/5 text-white/60',
  }

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold">Members</h1>
          <p className="text-white/40 text-sm mt-1">{members.length} total members</p>
        </div>
        <Link href="/members/new" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
          <Plus size={16} /> Add Member
        </Link>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
          <Users size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40 font-medium">No members found</p>
          <Link href="/members/new" className="mt-4 inline-block text-blue-400 text-sm hover:underline">Add your first member →</Link>
        </div>
      ) : (
        <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10">
              <tr className="text-white/30 text-xs uppercase tracking-wider">
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left hidden md:table-cell">Email</th>
                <th className="px-5 py-3 text-left">Belt</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-white/3 transition">
                  <td className="px-5 py-3 font-medium text-white">{m.first_name} {m.last_name}</td>
                  <td className="px-5 py-3 text-white/40 hidden md:table-cell">{m.email}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${beltColor[m.belt_rank] || 'bg-white/5 text-white/40'}`}>
                      {m.belt_rank}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/30'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/members/${m.id}`} className="text-blue-400 hover:underline text-xs">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
