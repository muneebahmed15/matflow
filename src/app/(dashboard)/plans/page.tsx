import Link from 'next/link'
import { CreditCard, Users } from 'lucide-react'
import { requireStaffSessionForPage } from '@/lib/auth/staff'
import { listAllPlans } from '@/services/plans'
import { getAdminClient } from '@/lib/supabase/admin'
import NewPlanForm from '@/components/plans/NewPlanForm'
import PlanToggleButton from '@/components/plans/PlanToggleButton'
import { sanitizeBasicHtml, htmlToPlainPreview } from '@/lib/html-sanitize'

export default async function PlansPage() {
  const auth = await requireStaffSessionForPage({ adminOnly: true })
  const [plans, subscriberCounts] = await Promise.all([
    listAllPlans(auth.gymId),
    getActiveSubscriberCounts(auth.gymId),
  ])

  const activePlans = plans.filter((p) => p.is_active).length

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Membership Plans</h1>
          <p className="text-white/40 text-sm mt-1">
            {plans.length} plan{plans.length === 1 ? '' : 's'} · {activePlans} active
          </p>
        </div>
        <Link
          href="/subscriptions"
          className="text-sm text-blue-400 hover:underline shrink-0"
        >
          View subscriptions →
        </Link>
      </div>

      <NewPlanForm gymId={auth.gymId} />

      {plans.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
          <CreditCard size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40 font-medium">No plans yet</p>
          <p className="text-white/20 text-sm mt-1">Create your first membership plan above.</p>
        </div>
      ) : (
        <div className="space-y-3 mt-6">
          {plans.map((plan) => {
            const subscribers = subscriberCounts.get(plan.id) ?? 0
            return (
              <div
                key={plan.id}
                className="bg-[#111] border border-white/10 rounded-2xl p-5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
                    <CreditCard size={18} className="text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{plan.name}</p>
                    {plan.description && (
                      <p className="text-xs text-white/30 truncate" title={htmlToPlainPreview(plan.description)}>
                        {htmlToPlainPreview(plan.description, 80)}
                      </p>
                    )}
                    <p className="text-xs text-white/20 mt-1 flex items-center gap-1">
                      <Users size={12} />
                      {subscribers} active subscriber{subscribers === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2 shrink-0">
                  <p className="text-white font-bold">
                    ${((plan.price_cents ?? 0) / 100).toFixed(2)}
                    <span className="text-white/30 font-normal text-xs"> / {plan.interval}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        plan.is_active
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-white/5 text-white/30'
                      }`}
                    >
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <PlanToggleButton planId={plan.id} isActive={plan.is_active} />
                  </div>
                  {plan.description && (
                    <div
                      className="text-xs text-white/40 max-w-xs text-right prose prose-invert prose-sm"
                      dangerouslySetInnerHTML={{ __html: sanitizeBasicHtml(plan.description) }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

async function getActiveSubscriberCounts(gymId: string): Promise<Map<string, number>> {
  const admin = getAdminClient()
  const { data } = await admin
    .from('subscriptions')
    .select('plan_id')
    .eq('gym_id', gymId)
    .eq('status', 'active')

  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    if (!row.plan_id) continue
    counts.set(row.plan_id, (counts.get(row.plan_id) ?? 0) + 1)
  }
  return counts
}
