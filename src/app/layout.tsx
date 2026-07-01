import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { rootMetadata } from '@/lib/seo/metadata'
import { siteConfig } from '@/lib/seo/site'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  ...rootMetadata,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/icon', type: 'image/png' }],
    apple: [{ url: '/icon', type: 'image/png' }],
  },
  other: {
    ...(rootMetadata.other ?? {}),
    'application-name': siteConfig.name,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang={siteConfig.language}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
