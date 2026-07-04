'use client';

import Script from 'next/script';
import type { PublicGymProfile } from '@/lib/gym-public';

type Props = { gym: PublicGymProfile };

export default function MarketingPixels({ gym }: Props) {
  const ga4 = gym.ga4_measurement_id;
  const metaPixel = gym.meta_pixel_id;
  const googleAds = gym.google_ads_conversion_id;

  if (!ga4 && !metaPixel && !googleAds) return null;

  return (
    <>
      {ga4 && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`}
            strategy="afterInteractive"
          />
          <Script id={`ga4-${gym.id}`} strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${ga4}');
            `}
          </Script>
        </>
      )}
      {googleAds && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAds}`}
            strategy="afterInteractive"
          />
          <Script id={`gads-${gym.id}`} strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${googleAds}');
            `}
          </Script>
        </>
      )}
      {metaPixel && (
        <Script id={`meta-pixel-${gym.id}`} strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${metaPixel}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}
    </>
  );
}
