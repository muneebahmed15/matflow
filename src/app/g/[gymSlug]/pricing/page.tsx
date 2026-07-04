import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminClient } from '@/lib/supabase/admin';
import { getPublicGymBySlug, gymPrimaryColor } from '@/lib/gym-public';
import { resolveGymPageMetadata } from '@/lib/seo/gym-seo';

type Props = { params: Promise<{ gymSlug: string }> };

export async function generateMetadata({ params }: Props) {
  const { gymSlug } = await params;
  return resolveGymPageMetadata(gymSlug, { title: 'Pricing', path: '/pricing' });
}

export default async function GymPricingPage({ params }: Props) {
  const { gymSlug } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym) notFound();

  const accent = gymPrimaryColor(gym.primary_color);
  const admin = getAdminClient();
  const { data: plans } = await admin
    .from('plans')
    .select('name, description, price_cents, interval')
    .eq('gym_id', gym.id)
    .eq('is_active', true)
    .order('price_cents', { ascending: true });

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold mb-2">Membership Plans</h1>
      <p className="text-white/40 text-sm mb-8">Choose the plan that fits your training goals.</p>

      {!plans?.length ? (
        <p className="text-white/30 text-center py-12">Pricing coming soon. Book a trial to learn more.</p>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="bg-[#111] border border-white/10 rounded-2xl p-6 flex justify-between items-start gap-4"
            >
              <div>
                <p className="font-semibold text-lg text-white">{plan.name}</p>
                {plan.description && (
                  <p className="text-white/40 text-sm mt-1">{plan.description}</p>
                )}
              </div>
              <p className="text-xl font-bold shrink-0" style={{ color: accent }}>
                ${((plan.price_cents ?? 0) / 100).toFixed(0)}
                <span className="text-sm font-normal text-white/40">/{plan.interval}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 text-center">
        <Link
          href={`/g/${gym.slug}/trial`}
          className="inline-block px-6 py-3 rounded-xl font-semibold text-white"
          style={{ backgroundColor: accent }}
        >
          Start with a Free Trial
        </Link>
      </div>
    </div>
  );
}
