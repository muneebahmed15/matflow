import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a7cff, #0047c8)',
          color: 'white',
          fontSize: 280,
          fontWeight: 800,
          borderRadius: 96,
        }}
      >
        M
      </div>
    ),
    size
  )
}
