import { notFound } from 'next/navigation';
import { getPublicGymBySlug } from '@/lib/gym-public';
import { buildGymPageMetadata } from '@/lib/seo/gym-seo';

type Props = { params: Promise<{ gymSlug: string }> };

export default async function GymPrivacyPage({ params }: Props) {
  const { gymSlug } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 prose prose-invert prose-sm">
      <h1>Privacy Policy</h1>
      <p className="text-white/50 text-sm not-prose">Last updated: {new Date().toLocaleDateString()}</p>
      <p>
        {gym.name} (&quot;we&quot;, &quot;us&quot;) respects your privacy. This policy describes how we collect
        and use personal information when you visit our website, book a trial, or use the member portal.
      </p>
      <h2>Information we collect</h2>
      <ul>
        <li>Contact details (name, email, phone) when you submit forms or sign up</li>
        <li>Attendance, billing, and waiver records for active members</li>
        <li>Usage data via analytics cookies when enabled by the gym</li>
      </ul>
      <h2>How we use information</h2>
      <p>
        We use your information to operate classes, process memberships, send service-related communications,
        and improve our programs. Marketing emails are optional and can be unsubscribed in the member portal.
      </p>
      <h2>Data storage</h2>
      <p>
        Data is stored securely via MatFlow and Supabase infrastructure. We do not sell personal information
        to third parties.
      </p>
      <h2>Contact</h2>
      <p>
        Questions? Email{' '}
        {gym.contact_email ? (
          <a href={`mailto:${gym.contact_email}`}>{gym.contact_email}</a>
        ) : (
          'your gym administrator'
        )}
        .
      </p>
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { gymSlug } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym) return { title: 'Privacy' };
  return buildGymPageMetadata(gym, { title: 'Privacy Policy', path: '/privacy' });
}
