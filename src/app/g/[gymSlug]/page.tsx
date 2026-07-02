import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicGymBySlug, gymPrimaryColor } from '@/lib/gym-public';

type Props = { params: Promise<{ gymSlug: string }> };

export default async function GymHomePage({ params }: Props) {
  const { gymSlug } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym) notFound();

  const accent = gymPrimaryColor(gym.primary_color);
  const base = `/g/${gym.slug}`;

  return (
    <div>
      <section className="max-w-5xl mx-auto px-4 py-16 md:py-24 text-center">
        {gym.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gym.logo_url}
            alt={gym.name}
            className="h-20 w-20 rounded-2xl mx-auto mb-6 object-cover"
          />
        )}
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{gym.name}</h1>
        {gym.tagline && (
          <p className="mt-4 text-lg text-white/50 max-w-xl mx-auto">{gym.tagline}</p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={`${base}/trial`}
            className="px-6 py-3 rounded-xl font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: accent }}
          >
            Book Free Trial
          </Link>
          <Link
            href={`${base}/schedule`}
            className="px-6 py-3 rounded-xl font-semibold border border-white/20 text-white/80 hover:bg-white/5 transition"
          >
            View Schedule
          </Link>
        </div>
      </section>

      {gym.about_text && (
        <section className="max-w-3xl mx-auto px-4 pb-16">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-4">About Us</h2>
            <p className="text-white/60 leading-relaxed whitespace-pre-wrap">{gym.about_text}</p>
            <Link href={`${base}/about`} className="inline-block mt-4 text-sm hover:underline" style={{ color: accent }}>
              Learn more →
            </Link>
          </div>
        </section>
      )}

      <section className="max-w-5xl mx-auto px-4 pb-20 grid md:grid-cols-3 gap-4">
        {[
          { title: 'Expert Coaching', desc: 'Learn from experienced instructors dedicated to your growth.' },
          { title: 'Flexible Schedule', desc: 'Classes throughout the week for all ages and skill levels.' },
          { title: 'Welcoming Community', desc: 'A supportive environment for beginners and competitors alike.' },
        ].map((item) => (
          <div key={item.title} className="bg-[#111] border border-white/10 rounded-2xl p-6">
            <h3 className="font-semibold text-white">{item.title}</h3>
            <p className="text-white/40 text-sm mt-2">{item.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
