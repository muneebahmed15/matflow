import { notFound } from 'next/navigation';
import { getPublicGymBySlug } from '@/lib/gym-public';
import GymPublicShell from '@/components/gym-public/GymPublicShell';
import AiChatWidget from '@/components/gym-public/AiChatWidget';
import MarketingPixels from '@/components/gym-public/MarketingPixels';
import StickyMobileCta from '@/components/gym-public/StickyMobileCta';
import { gymPrimaryColor } from '@/lib/gym-public';
import { buildGymLocalBusinessJsonLd, buildGymPageMetadata } from '@/lib/seo/gym-seo';

// Cache public gym pages and refresh every 5 minutes (ISR)
export const revalidate = 300;

type Props = {
  children: React.ReactNode;
  params: Promise<{ gymSlug: string }>;
};

export default async function GymPublicLayout({ children, params }: Props) {
  const { gymSlug } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym) notFound();

  const jsonLd = buildGymLocalBusinessJsonLd(gym);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingPixels gym={gym} />
      <GymPublicShell gym={gym}>
        {children}
        {gym.ai_front_desk_enabled && (
          <AiChatWidget
            gymId={gym.id}
            gymName={gym.name}
            gymSlug={gym.slug}
            accent={gymPrimaryColor(gym.primary_color)}
          />
        )}
        <StickyMobileCta gym={gym} />
      </GymPublicShell>
    </>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ gymSlug: string }> }) {
  const { gymSlug } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym) return { title: 'Gym not found' };

  return buildGymPageMetadata(gym, {});
}
