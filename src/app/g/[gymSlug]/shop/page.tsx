import { notFound } from 'next/navigation';
import { getPublicGymBySlug, gymPrimaryColor } from '@/lib/gym-public';
import { listProducts } from '@/services/merchandise';
import { getAdminClient } from '@/lib/supabase/admin';
import PublicShopCatalog from '@/components/gym-public/PublicShopCatalog';
import { resolveGymPageMetadata } from '@/lib/seo/gym-seo';

type Props = { params: Promise<{ gymSlug: string }> };

export async function generateMetadata({ params }: Props) {
  const { gymSlug } = await params;
  return resolveGymPageMetadata(gymSlug, { title: 'Shop', path: '/shop' });
}

export default async function GymShopPage({ params }: Props) {
  const { gymSlug } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym || !gym.store_enabled) notFound();

  const products = (await listProducts(gym.id, true)).filter((p) => !p.members_only);
  const accent = gymPrimaryColor(gym.primary_color);
  const admin = getAdminClient();
  const { data: gymMeta } = await admin.from('gyms').select('store_return_policy').eq('id', gym.id).single();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold mb-2">Shop</h1>
      <p className="text-white/40 text-sm mb-4">Official {gym.name} gear — pick up at the gym.</p>
      {gymMeta?.store_return_policy && (
        <p className="text-white/30 text-xs mb-6 bg-white/5 border border-white/10 rounded-xl p-3">
          {gymMeta.store_return_policy}
        </p>
      )}
      <PublicShopCatalog
        gymId={gym.id}
        gymSlug={gym.slug}
        accent={accent}
        products={products}
      />
    </div>
  );
}
