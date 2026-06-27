'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

interface Member {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  belt_rank: string
  status: string
}

export default function MemberDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMember = async () => {
      const { data } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .single()

      if (data) setMember(data)
      setLoading(false)
    }

    fetchMember()
  }, [id])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this member?')) return
    await supabase.from('members').delete().eq('id', id)
    router.push('/members')
  }

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>
  if (!member) return <div className="p-6 text-gray-400">Member not found.</div>

  return (
    <div className="max-w-lg mx-auto mt-10 p-6 bg-white rounded-xl shadow">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{member.first_name} {member.last_name}</h1>
        <button onClick={handleDelete} className="text-red-500 text-sm hover:underline">
          Delete
        </button>
      </div>

      <div className="space-y-3 text-sm text-gray-700">
        <div className="flex justify-between border-b pb-2">
          <span className="font-medium">Email</span>
          <span>{member.email}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="font-medium">Phone</span>
          <span>{member.phone}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="font-medium">Belt Rank</span>
          <span className="capitalize">{member.belt_rank}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="font-medium">Status</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {member.status}
          </span>
        </div>
      </div>

      <button
        onClick={() => router.push('/members')}
        className="mt-6 w-full border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition"
      >
        ← Back to Members
      </button>
    </div>
  )
}