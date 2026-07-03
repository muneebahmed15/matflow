import { CreditCard } from 'lucide-react'
import { requireStaffSessionForPage } from '@/lib/auth/staff'
import { listAllPlans } from '@/services/plans'
import NewPlanForm from '@/components/plans/NewPlanForm'
import PlanToggleButton from '@/components/plans/PlanToggleButton'

export default async function PlansPage() {
  const auth = await requireStaffSessionForPage({ adminOnly: true })
  const plans = await listAllPlans(auth.gymId)

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <NewPlanForm gymId={auth.gymId} />

      {plans.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
          <CreditCard size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40 font-medium">No plans yet</p>
          <p className="text-white/20 text-sm mt-1">Create your first membership plan.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-[#111] border border-white/10 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <CreditCard size={18} className="text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">{plan.name}</p>
                  <p className="text-xs text-white/30">{plan.description}</p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <p className="text-white font-bold">${((plan.price_cents ?? 0) / 100).toFixed(2)}<span className="text-white/30 font-normal text-xs"> / {plan.interval}</span></p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${plan.is_active ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/30'}`}>
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <PlanToggleButton planId={plan.id} isActive={plan.is_active} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
