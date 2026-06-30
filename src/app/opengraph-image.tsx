import { ImageResponse } from 'next/og'
import { siteConfig } from '@/lib/seo/site'

export const alt = `${siteConfig.name} — ${siteConfig.tagline}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #050505 0%, #0a1628 55%, #05101f 100%)',
          color: 'white',
          padding: '64px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #0a7cff, #0047c8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 40,
              fontWeight: 800,
            }}
          >
            M
          </div>
          <div style={{ fontSize: 36, fontWeight: 700 }}>{siteConfig.name}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900 }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            The Home of Brazilian Jiu Jitsu
          </div>
          <div style={{ fontSize: 30, lineHeight: 1.4, color: 'rgba(255,255,255,0.72)' }}>
            {siteConfig.shortDescription}
          </div>
        </div>

        <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.45)' }}>{siteConfig.url.replace('https://', '')}</div>
      </div>
    ),
    size
  )
}
