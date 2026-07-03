import { notFound } from 'next/navigation';
import { getPublicGymBySlug } from '@/lib/gym-public';
import { buildGymPageMetadata } from '@/lib/seo/gym-seo';

type Props = { params: Promise<{ gymSlug: string }> };

export default async function GymTermsPage({ params }: Props) {
  const { gymSlug } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 prose prose-invert prose-sm">
      <h1>Terms of Service</h1>
      <p className="text-white/50 text-sm not-prose">Last updated: {new Date().toLocaleDateString()}</p>
      <p>
        By using the {gym.name} website and member services, you agree to these terms. Please read them
        carefully before participating in classes or purchasing memberships.
      </p>
      <h2>Membership &amp; billing</h2>
      <p>
        Membership fees are billed according to the plan you select. Cancellations and pauses are managed
        through the member portal or by contacting the gym directly, subject to our billing policies.
      </p>
      <h2>Assumption of risk</h2>
      <p>
        Martial arts training involves physical contact and inherent risk of injury. You must sign our
        liability waiver before participating. Minors require a parent or guardian signature.
      </p>
      <h2>Code of conduct</h2>
      <p>
        Members are expected to treat coaches and fellow students with respect, follow gym rules, and
        maintain good hygiene. The gym reserves the right to suspend membership for violations.
      </p>
      <h2>Contact</h2>
      <p>
        For questions about these terms, contact{' '}
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
  if (!gym) return { title: 'Terms' };
  return buildGymPageMetadata(gym, { title: 'Terms of Service', path: '/terms' });
}
