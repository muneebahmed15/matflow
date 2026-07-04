'use client'

import { useState } from 'react'
import { useAsyncMount, useClientMount } from '@/hooks/use-async-mount'
import { redirectTo } from '@/lib/navigation'
import Link from 'next/link'
import { ExternalLink, Globe, Monitor } from 'lucide-react'
import { getGymSettingsAction, updateGymSettingsAction, getGbpStatusAction, syncDirectoryListingsAction, syncGbpHoursAction } from '@/app/(dashboard)/actions'
import type { GymSettings } from '@/services/gym'
import { resolveBeltSystem } from '@/lib/belt-systems'
import { defaultBeltHex, getBeltBadgeStyle } from '@/lib/belt-colors'
import LocationsPanel from '@/components/settings/LocationsPanel'
import ApiKeysPanel from '@/components/settings/ApiKeysPanel'
import ScheduleEmbedSnippet from '@/components/public/ScheduleEmbedSnippet'
import CalendarSubscribeSnippet from '@/components/public/CalendarSubscribeSnippet'

export default function SettingsPage() {
  const [settings, setSettings] = useState<GymSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [origin, setOrigin] = useState('')
  const [gbpStatus, setGbpStatus] = useState<{ connected: boolean; oauthUrl: string | null } | null>(null)

  useClientMount(() => setOrigin(window.location.origin), [])

  useAsyncMount(async () => {
    const { supabase } = await import('@/lib/supabase')
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setUserEmail(user.email || '')

    const result = await getGymSettingsAction()
    if (result.ok && result.data) setSettings(result.data)
    const gbp = await getGbpStatusAction()
    if (gbp.ok && gbp.data) setGbpStatus({ connected: gbp.data.connected, oauthUrl: gbp.data.oauthUrl })
    setLoading(false)
  }, [])

  const update = (patch: Partial<GymSettings>) => {
    if (!settings) return
    setSettings({ ...settings, ...patch })
  }

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    setError('')
    const result = await updateGymSettingsAction({
      name: settings.name,
      slug: settings.slug,
      kioskEnabled: settings.kiosk_enabled,
      websiteEnabled: settings.website_enabled,
      storeEnabled: settings.store_enabled,
      aiFrontDeskEnabled: settings.ai_front_desk_enabled,
      dailyDigestEnabled: settings.daily_digest_enabled,
      logoUrl: settings.logo_url,
      faviconUrl: settings.favicon_url,
      heroImageUrl: settings.hero_image_url,
      primaryColor: settings.primary_color,
      tagline: settings.tagline,
      aboutText: settings.about_text,
      contactEmail: settings.contact_email,
      contactPhone: settings.contact_phone,
      addressLine1: settings.address_line1,
      addressCity: settings.address_city,
      addressState: settings.address_state,
      addressZip: settings.address_zip,
      customDomain: settings.custom_domain,
      whiteLabelEnabled: settings.white_label_enabled,
      storeReturnPolicy: settings.store_return_policy,
      ga4MeasurementId: settings.ga4_measurement_id,
      metaPixelId: settings.meta_pixel_id,
      googlePlaceId: settings.google_place_id,
      googleAdsConversionId: settings.google_ads_conversion_id,
      reviewCheckinThreshold: settings.review_checkin_threshold,
      requireWaiverForCheckin: settings.require_waiver_for_checkin,
      timezone: settings.timezone ?? 'America/New_York',
      beltSystem: settings.belt_system ?? 'bjj_adult',
      beltCustomOrder: settings.belt_custom_order,
      beltColorOverrides: settings.belt_color_overrides,
      bookingCancelHours: settings.booking_cancel_hours ?? 2,
      classReminderHours: settings.class_reminder_hours ?? 2,
      marketingEnabled: settings.marketing_enabled,
      heroAbEnabled: settings.hero_ab_enabled,
      heroVariantBHeadline: settings.hero_variant_b_headline,
      heroVariantBSubheadline: settings.hero_variant_b_subheadline,
      seoKeywords: settings.seo_keywords,
      publicTranslations: settings.public_translations,
      locale: settings.locale,
    })
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (result.data) setSettings(result.data)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  const publicUrl = settings?.slug && origin ? `${origin}/g/${settings.slug}` : ''
  const scheduleEmbedUrl = settings?.slug && origin ? `${origin}/embed/schedule/${settings.slug}` : ''
  const scheduleIcsUrl = settings?.slug && origin ? `${origin}/g/${settings.slug}/schedule.ics` : ''
  const kioskUrl = settings?.slug && origin ? `${origin}/kiosk/${settings.slug}` : ''

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>
  if (!settings) return <div className="p-8 text-gray-400">Unable to load settings.</div>

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">Settings</h1>
        <p className="text-white/40 text-sm mt-1">Manage your gym account, branding, and public website.</p>
      </div>

      <div className="space-y-6">
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">Account</h2>
          <div className="flex justify-between items-center py-3 border-b border-white/10">
            <span className="text-gray-400 text-sm">Email</span>
            <span className="text-white text-sm">{userEmail}</span>
          </div>
          <button
            onClick={async () => {
              const { supabase } = await import('@/lib/supabase')
              await supabase.auth.signOut()
              redirectTo('/login')
            }}
            className="mt-4 text-blue-400 text-sm hover:underline"
          >
            Sign out
          </button>
        </div>

        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-white">Gym Profile</h2>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Gym Name</label>
            <input value={settings.name} onChange={(e) => update({ name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Gym Slug</label>
            <input
              value={settings.slug}
              onChange={(e) => update({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              className={`${inputClass} font-mono`}
            />
            <p className="text-white/20 text-xs mt-1">Used in kiosk and public website URLs.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Timezone</label>
            <select
              value={settings.timezone ?? 'America/New_York'}
              onChange={(e) => update({ timezone: e.target.value })}
              className={inputClass}
            >
              <option value="America/New_York" className="bg-gray-900">Eastern (America/New_York)</option>
              <option value="America/Chicago" className="bg-gray-900">Central (America/Chicago)</option>
              <option value="America/Denver" className="bg-gray-900">Mountain (America/Denver)</option>
              <option value="America/Los_Angeles" className="bg-gray-900">Pacific (America/Los_Angeles)</option>
              <option value="America/Phoenix" className="bg-gray-900">Arizona (America/Phoenix)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Belt system</label>
            <select
              value={settings.belt_system ?? 'bjj_adult'}
              onChange={(e) => update({ belt_system: e.target.value })}
              className={inputClass}
            >
              <option value="bjj_adult" className="bg-gray-900">BJJ (Adult)</option>
              <option value="bjj_kids" className="bg-gray-900">BJJ (Kids)</option>
              <option value="karate" className="bg-gray-900">Karate</option>
              <option value="tkd" className="bg-gray-900">Taekwondo</option>
            </select>
            <p className="text-white/20 text-xs mt-1">Controls belt order and valid ranks for promotions.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Custom belt order (optional)</label>
            <textarea
              value={(settings.belt_custom_order ?? []).join('\n')}
              onChange={(e) => {
                const lines = e.target.value
                  .split('\n')
                  .map((line) => line.trim().toLowerCase())
                  .filter(Boolean)
                update({ belt_custom_order: lines.length > 0 ? lines : null })
              }}
              rows={4}
              placeholder={'white\nblue\npurple\nbrown\nblack'}
              className={inputClass}
            />
            <p className="text-white/20 text-xs mt-1">One belt per line. Leave empty to use the preset order above.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Belt colors</label>
            <div className="space-y-2">
              {resolveBeltSystem(settings.belt_system, settings.belt_custom_order).belts.map((belt) => {
                const badge = getBeltBadgeStyle(belt, settings.belt_color_overrides)
                return (
                  <div key={belt} className="flex items-center justify-between gap-3">
                    <span className={badge.className} style={badge.style}>
                      {belt}
                    </span>
                    <input
                      type="color"
                      value={settings.belt_color_overrides?.[belt] ?? defaultBeltHex(belt)}
                      onChange={(e) => {
                        const next = { ...(settings.belt_color_overrides ?? {}), [belt]: e.target.value }
                        update({ belt_color_overrides: next })
                      }}
                      className="h-9 w-14 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                      aria-label={`Color for ${belt} belt`}
                    />
                  </div>
                )
              })}
            </div>
            <p className="text-white/20 text-xs mt-1">Overrides badge colors on member lists and the portal.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Booking cancellation window (hours)</label>
            <input
              type="number"
              min={0}
              value={settings.booking_cancel_hours ?? 2}
              onChange={(e) => update({ booking_cancel_hours: parseInt(e.target.value, 10) || 0 })}
              className={inputClass}
            />
            <p className="text-white/20 text-xs mt-1">Members must cancel drop-in bookings at least this many hours before class.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Class reminder lead time (hours)</label>
            <input
              type="number"
              min={0}
              max={24}
              value={settings.class_reminder_hours ?? 2}
              onChange={(e) => update({ class_reminder_hours: parseInt(e.target.value, 10) || 0 })}
              className={inputClass}
            />
            <p className="text-white/20 text-xs mt-1">
              Email enrolled members and drop-in bookers this many hours before class. Set to 0 to disable.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Tagline</label>
            <input
              value={settings.tagline ?? ''}
              onChange={(e) => update({ tagline: e.target.value })}
              placeholder="e.g. Building champions on the East Coast"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">About (public website)</label>
            <textarea
              value={settings.about_text ?? ''}
              onChange={(e) => update({ about_text: e.target.value })}
              rows={4}
              className={inputClass}
            />
          </div>
        </div>

        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-white">Branding</h2>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Logo URL</label>
            <input
              value={settings.logo_url ?? ''}
              onChange={(e) => update({ logo_url: e.target.value })}
              placeholder="https://..."
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Favicon URL</label>
            <input
              value={settings.favicon_url ?? ''}
              onChange={(e) => update({ favicon_url: e.target.value })}
              placeholder="https://.../favicon.ico"
              className={inputClass}
            />
            <p className="text-white/20 text-xs mt-1">Shown in browser tabs for your public site at /g/{settings.slug}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Hero background image URL</label>
            <input
              value={settings.hero_image_url ?? ''}
              onChange={(e) => update({ hero_image_url: e.target.value })}
              placeholder="https://.../hero.jpg"
              className={inputClass}
            />
            <p className="text-white/20 text-xs mt-1">Wide banner behind the home page hero section</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Primary Color</label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={settings.primary_color ?? '#2563eb'}
                onChange={(e) => update({ primary_color: e.target.value })}
                className="h-10 w-14 rounded cursor-pointer bg-transparent border border-white/10"
              />
              <input
                value={settings.primary_color ?? '#2563eb'}
                onChange={(e) => update({ primary_color: e.target.value })}
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>
        </div>

        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-white">Contact (public website)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={settings.contact_email ?? ''}
                onChange={(e) => update({ contact_email: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
              <input
                value={settings.contact_phone ?? ''}
                onChange={(e) => update({ contact_phone: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
            <input
              value={settings.address_line1 ?? ''}
              onChange={(e) => update({ address_line1: e.target.value })}
              placeholder="Street address"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input
              value={settings.address_city ?? ''}
              onChange={(e) => update({ address_city: e.target.value })}
              placeholder="City"
              className={inputClass}
            />
            <input
              value={settings.address_state ?? ''}
              onChange={(e) => update({ address_state: e.target.value })}
              placeholder="State"
              className={inputClass}
            />
            <input
              value={settings.address_zip ?? ''}
              onChange={(e) => update({ address_zip: e.target.value })}
              placeholder="ZIP"
              className={inputClass}
            />
          </div>
        </div>

        <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
              <Globe size={18} className="text-green-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Public Website</h2>
              <p className="text-white/40 text-sm">Mobile-friendly site at /g/your-slug</p>
            </div>
          </div>
          <label className="flex items-center justify-between gap-4 py-3 border-b border-white/10 mb-4">
            <span className="text-gray-300 text-sm">Enable public website</span>
            <input
              type="checkbox"
              checked={settings.website_enabled}
              onChange={(e) => update({ website_enabled: e.target.checked })}
              className="h-4 w-4 rounded accent-blue-500"
            />
          </label>
          {settings.website_enabled && publicUrl && (
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-green-300 bg-black/40 border border-white/10 rounded-lg px-3 py-2 truncate">
                {publicUrl}
              </code>
              <Link
                href={`/g/${settings.slug}`}
                target="_blank"
                className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 whitespace-nowrap"
              >
                Preview <ExternalLink size={14} />
              </Link>
            </div>
          )}
          {settings.website_enabled && scheduleEmbedUrl && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-sm font-medium text-gray-300 mb-1">Schedule embed widget</p>
              <p className="text-white/30 text-xs mb-2">
                Embed your class schedule on WordPress, Squarespace, or any external site.
              </p>
              <ScheduleEmbedSnippet embedUrl={scheduleEmbedUrl} />
            </div>
          )}
          {settings.website_enabled && scheduleIcsUrl && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-sm font-medium text-gray-300 mb-1">Google Calendar sync</p>
              <CalendarSubscribeSnippet icsFeedUrl={scheduleIcsUrl} />
            </div>
          )}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">Custom Domain</label>
            <input
              value={settings.custom_domain ?? ''}
              onChange={(e) => update({ custom_domain: e.target.value.toLowerCase().trim() || null })}
              placeholder="e.g. mygym.com"
              className={`${inputClass} font-mono`}
            />
            <p className="text-white/20 text-xs mt-1">Optional. Point DNS to your host; visitors see your site at this domain.</p>
          </div>
        </div>

        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-white">Marketing & Analytics</h2>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">GA4 Measurement ID</label>
            <input
              value={settings.ga4_measurement_id ?? ''}
              onChange={(e) => update({ ga4_measurement_id: e.target.value || null })}
              placeholder="G-XXXXXXXXXX"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Meta Pixel ID</label>
            <input
              value={settings.meta_pixel_id ?? ''}
              onChange={(e) => update({ meta_pixel_id: e.target.value || null })}
              placeholder="1234567890"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Google Ads conversion ID</label>
            <input
              value={settings.google_ads_conversion_id ?? ''}
              onChange={(e) => update({ google_ads_conversion_id: e.target.value || null })}
              placeholder="AW-XXXXXXXXX"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Google Place ID</label>
            <input
              value={settings.google_place_id ?? ''}
              onChange={(e) => update({ google_place_id: e.target.value || null })}
              placeholder="For Google review links"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Auto review after check-ins</label>
            <input
              type="number"
              min={0}
              max={50}
              value={settings.review_checkin_threshold ?? 5}
              onChange={(e) => update({ review_checkin_threshold: parseInt(e.target.value, 10) || 0 })}
              className={inputClass}
            />
            <p className="text-white/20 text-xs mt-1">Set to 0 to disable automatic review requests.</p>
          </div>
        </div>

        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-white">Google Business Profile</h2>
          {gbpStatus?.connected ? (
            <p className="text-green-400 text-sm">Connected to Google Business Profile</p>
          ) : gbpStatus?.oauthUrl ? (
            <a
              href={gbpStatus.oauthUrl}
              className="inline-block bg-white text-black text-sm font-semibold px-4 py-2 rounded-xl"
            >
              Connect Google Business Profile
            </a>
          ) : (
            <p className="text-white/40 text-sm">Set GOOGLE_GBP_CLIENT_ID and GOOGLE_GBP_CLIENT_SECRET to enable.</p>
          )}
          <button
            onClick={async () => {
              const res = await syncDirectoryListingsAction()
              if (res.ok) alert(`Directory sync: ${res.data?.provider}`)
            }}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Sync directory listings (Yext/Moz)
          </button>
          <button
            onClick={async () => {
              const res = await syncGbpHoursAction()
              if (res.ok && res.data) alert(res.data.message)
            }}
            className="block text-sm text-blue-400 hover:text-blue-300"
          >
            Sync hours from class schedule
          </button>
        </div>

        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-white">Public site A/B & translations</h2>
          <label className="flex items-center justify-between gap-4 py-2">
            <span className="text-gray-300 text-sm">Hero A/B test</span>
            <input
              type="checkbox"
              checked={settings.hero_ab_enabled}
              onChange={(e) => update({ hero_ab_enabled: e.target.checked })}
              className="h-4 w-4 rounded accent-blue-500"
            />
          </label>
          <input
            value={settings.hero_variant_b_headline ?? ''}
            onChange={(e) => update({ hero_variant_b_headline: e.target.value || null })}
            placeholder="Variant B headline (optional)"
            className={inputClass}
          />
          <input
            value={settings.hero_variant_b_subheadline ?? ''}
            onChange={(e) => update({ hero_variant_b_subheadline: e.target.value || null })}
            placeholder="Variant B subheadline (optional)"
            className={inputClass}
          />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Spanish tagline</label>
            <input
              value={(settings.public_translations as { es?: { tagline?: string } })?.es?.tagline ?? ''}
              onChange={(e) =>
                update({
                  public_translations: {
                    ...settings.public_translations,
                    es: {
                      ...(settings.public_translations as { es?: Record<string, string> })?.es,
                      tagline: e.target.value,
                    },
                  },
                })
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Spanish about text</label>
            <textarea
              value={(settings.public_translations as { es?: { about_text?: string } })?.es?.about_text ?? ''}
              onChange={(e) =>
                update({
                  public_translations: {
                    ...settings.public_translations,
                    es: {
                      ...(settings.public_translations as { es?: Record<string, string> })?.es,
                      about_text: e.target.value,
                    },
                  },
                })
              }
              rows={3}
              className={inputClass}
            />
          </div>
        </div>

        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-white">API keys</h2>
          <ApiKeysPanel />
        </div>

        <LocationsPanel />

        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-white">Features</h2>
          <label className="flex items-center justify-between gap-4 py-3 border-b border-white/10">
            <div>
              <span className="text-gray-300 text-sm">Marketing module</span>
              <p className="text-white/30 text-xs">Campaigns, SMS, and review tools in dashboard</p>
            </div>
            <input
              type="checkbox"
              checked={settings.marketing_enabled}
              onChange={(e) => update({ marketing_enabled: e.target.checked })}
              className="h-4 w-4 rounded accent-blue-500"
            />
          </label>
          <label className="flex items-center justify-between gap-4 py-3 border-b border-white/10">
            <div>
              <span className="text-gray-300 text-sm">Online store</span>
              <p className="text-white/30 text-xs">Show /shop on public website</p>
            </div>
            <input
              type="checkbox"
              checked={settings.store_enabled}
              onChange={(e) => update({ store_enabled: e.target.checked })}
              className="h-4 w-4 rounded accent-blue-500"
            />
          </label>
          <label className="flex items-center justify-between gap-4 py-3 border-b border-white/10">
            <div>
              <span className="text-gray-300 text-sm">AI front desk chat</span>
              <p className="text-white/30 text-xs">Web chat widget on public site</p>
            </div>
            <input
              type="checkbox"
              checked={settings.ai_front_desk_enabled}
              onChange={(e) => update({ ai_front_desk_enabled: e.target.checked })}
              className="h-4 w-4 rounded accent-blue-500"
            />
          </label>
          <label className="flex items-center justify-between gap-4 py-3 border-b border-white/10">
            <div>
              <span className="text-gray-300 text-sm">Daily business digest</span>
              <p className="text-white/30 text-xs">Email insights to gym owner (cron)</p>
            </div>
            <input
              type="checkbox"
              checked={settings.daily_digest_enabled}
              onChange={(e) => update({ daily_digest_enabled: e.target.checked })}
              className="h-4 w-4 rounded accent-blue-500"
            />
          </label>
          <label className="flex items-center justify-between gap-4 py-3 border-b border-white/10">
            <div>
              <span className="text-gray-300 text-sm">White-label mode</span>
              <p className="text-white/30 text-xs">Hide MatFlow branding on portal and public site</p>
            </div>
            <input
              type="checkbox"
              checked={settings.white_label_enabled}
              onChange={(e) => update({ white_label_enabled: e.target.checked })}
              className="h-4 w-4 rounded accent-blue-500"
            />
          </label>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Store return policy</label>
            <textarea
              value={settings.store_return_policy ?? ''}
              onChange={(e) => update({ store_return_policy: e.target.value })}
              rows={3}
              placeholder="Returns accepted within 14 days..."
              className={inputClass}
            />
          </div>
        </div>

        <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Monitor size={18} className="text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Kiosk Check-In</h2>
              <p className="text-white/40 text-sm">Front-desk tablet self check-in.</p>
            </div>
          </div>
          <label className="flex items-center justify-between gap-4 py-3 border-b border-white/10">
            <span className="text-gray-300 text-sm">Enable kiosk mode</span>
            <input
              type="checkbox"
              checked={settings.kiosk_enabled}
              onChange={(e) => update({ kiosk_enabled: e.target.checked })}
              className="h-4 w-4 rounded accent-blue-500"
            />
          </label>
          <label className="flex items-center justify-between gap-4 py-3 border-b border-white/10">
            <span className="text-gray-300 text-sm">Require valid waiver before check-in</span>
            <input
              type="checkbox"
              checked={settings.require_waiver_for_checkin ?? true}
              onChange={(e) => update({ require_waiver_for_checkin: e.target.checked })}
              className="h-4 w-4 rounded accent-blue-500"
            />
          </label>
          {settings.slug && kioskUrl && (
            <div className="mt-4 flex items-center gap-2">
              <code className="flex-1 text-xs text-blue-300 bg-black/40 border border-white/10 rounded-lg px-3 py-2 truncate">
                {kioskUrl}
              </code>
              <Link href={`/kiosk/${settings.slug}`} target="_blank" className="text-sm text-blue-400">
                Open
              </Link>
            </div>
          )}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {saved && <p className="text-green-400 text-sm">Settings saved!</p>}
        <button
          onClick={() => void handleSave()}
          disabled={saving || !settings.name}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition"
        >
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>
    </div>
  )
}
