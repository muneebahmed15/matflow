import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPublicGymBySlug, gymPrimaryColor } from '@/lib/gym-public';
import { getProduct } from '@/services/merchandise';
import { resolveGymPageMetadata } from '@/lib/seo/gym-seo';
import ProductDetailClient from '@/components/gym-public/ProductDetailClient';

type Props = { params: Promise<{ gymSlug: string; productId: string }> };

export async function generateMetadata({ params }: Props) {
  const { gymSlug, productId } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym) return { title: 'Product' };
  const product = await getProduct(gym.id, productId);
  return resolveGymPageMetadata(gymSlug, {
    title: product?.name ?? 'Product',
    path: `/shop/${productId}`,
  });
}

export default async function GymProductDetailPage({ params }: Props) {
  const { gymSlug, productId } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym || !gym.store_enabled) notFound();

  const product = await getProduct(gym.id, productId);
  if (!product || !product.is_active || product.members_only) notFound();

  const accent = gymPrimaryColor(gym.primary_color);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link
        href={`/g/${gym.slug}/shop`}
        className="text-sm text-white/40 hover:text-white mb-6 inline-block"
      >
        ← Back to shop
      </Link>
      <ProductDetailClient
        gymSlug={gym.slug}
        accent={accent}
        product={product}
      />
    </div>
  );
}
