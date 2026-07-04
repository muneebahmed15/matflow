import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicGymBySlug, gymPrimaryColor } from '@/lib/gym-public';
import GymHeroSection from '@/components/gym-public/GymHeroSection';
import { parsePublicLocale, parsePublicTranslations, resolvePublicText } from '@/lib/public-i18n';

type Props = {
  params: Promise<{ gymSlug: string }>;
  searchParams: Promise<{ lang?: string }>;
};

export default async function GymHomePage({ params, searchParams }: Props) {
  const { gymSlug } = await params;
  const { lang } = await searchParams;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym) notFound();

  const locale = parsePublicLocale(lang);
  const translations = parsePublicTranslations(gym.public_translations);
  const accent = gymPrimaryColor(gym.primary_color);
  const base = `/g/${gym.slug}`;
  const aboutText = resolvePublicText(locale, gym.about_text, translations, 'about_text');

  return (
    <div>
      <GymHeroSection gym={gym} locale={locale} />

      {aboutText && (
        <section className="max-w-3xl mx-auto px-4 pb-16">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-4">{locale === 'es' ? 'Sobre nosotros' : 'About Us'}</h2>
            <p className="text-white/60 leading-relaxed whitespace-pre-wrap">{aboutText}</p>
            <Link href={`${base}/about`} className="inline-block mt-4 text-sm hover:underline" style={{ color: accent }}>
              {locale === 'es' ? 'Saber más →' : 'Learn more →'}
            </Link>
          </div>
        </section>
      )}

      <section className="max-w-5xl mx-auto px-4 pb-20 grid md:grid-cols-3 gap-4">
        {(locale === 'es'
          ? [
              { title: 'Entrenadores expertos', desc: 'Aprende de instructores dedicados a tu progreso.' },
              { title: 'Horario flexible', desc: 'Clases toda la semana para todas las edades y niveles.' },
              { title: 'Comunidad acogedora', desc: 'Un ambiente de apoyo para principiantes y competidores.' },
            ]
          : [
              { title: 'Expert Coaching', desc: 'Learn from experienced instructors dedicated to your growth.' },
              { title: 'Flexible Schedule', desc: 'Classes throughout the week for all ages and skill levels.' },
              { title: 'Welcoming Community', desc: 'A supportive environment for beginners and competitors alike.' },
            ]
        ).map((item) => (
          <div key={item.title} className="bg-[#111] border border-white/10 rounded-2xl p-6">
            <h3 className="font-semibold text-white">{item.title}</h3>
            <p className="text-white/40 text-sm mt-2">{item.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
