import { notFound } from 'next/navigation';
import { getPublicGymBySlug, formatGymAddress } from '@/lib/gym-public';
import { listLocations } from '@/services/gym-locations';
import ContactForm from '@/components/gym-public/ContactForm';

type Props = { params: Promise<{ gymSlug: string }> };

export default async function GymContactPage({ params }: Props) {
  const { gymSlug } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym) notFound();

  const address = formatGymAddress(gym);
  const locations = await listLocations(gym.id);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold mb-2">Contact Us</h1>
      <p className="text-white/40 text-sm mb-8">We&apos;d love to hear from you.</p>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div className="bg-[#111] border border-white/10 rounded-2xl p-8 space-y-6">
          {gym.contact_phone && (
            <div>
              <p className="text-xs text-white/30 uppercase tracking-wide mb-1">Phone</p>
              <a href={`tel:${gym.contact_phone}`} className="text-white hover:underline text-lg">
                {gym.contact_phone}
              </a>
            </div>
          )}
          {gym.contact_email && (
            <div>
              <p className="text-xs text-white/30 uppercase tracking-wide mb-1">Email</p>
              <a href={`mailto:${gym.contact_email}`} className="text-white hover:underline text-lg">
                {gym.contact_email}
              </a>
            </div>
          )}
          {address && (
            <div>
              <p className="text-xs text-white/30 uppercase tracking-wide mb-1">Address</p>
              <p className="text-white/70">{address}</p>
            </div>
          )}
          {!gym.contact_phone && !gym.contact_email && !address && locations.length === 0 && (
            <p className="text-white/30">Contact details coming soon.</p>
          )}
        </div>
        <ContactForm gym={gym} />
      </div>

      {locations.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-4">Locations</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {locations.map((loc) => (
              <div key={loc.id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <p className="font-medium text-white">
                  {loc.name}
                  {loc.is_primary && <span className="text-blue-400 text-xs ml-2">Primary</span>}
                </p>
                {(loc.address_line1 || loc.address_city) && (
                  <p className="text-white/50 text-sm mt-1">
                    {[loc.address_line1, loc.address_city, loc.address_state, loc.address_zip]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
