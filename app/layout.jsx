export const metadata = {
  title: "CHXNDLER — Cockpit",
  description: "Pilot the cockpit, switch channels, and drift through space.",
};

import "./globals.css";
// Use a local font via @font-face in globals.css to avoid network fetches.

import ClickTracker from "../components/ClickTracker";
import AnalyticsWidget from "../components/AnalyticsWidget";
import DevBadge from "../components/DevBadge";
import BuildInfoFooter from "../components/BuildInfoFooter";

export default function RootLayout({ children }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;            // e.g., G-XXXXXXX
  const mpId = process.env.NEXT_PUBLIC_META_PIXEL_ID;    // e.g., 1234567890

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        
        {/* Favicon */}
        <link rel="icon" href="/logo/CHXNDLER_Logo.png" sizes="any" />
        <link rel="icon" href="/logo/CHXNDLER_Logo.png" type="image/png" />
        
        {/* Preload social media images for instant visibility */}
        <link rel="preload" as="image" href="/elements/instagram.png" />
        <link rel="preload" as="image" href="/elements/tiktok.png" />
        <link rel="preload" as="image" href="/elements/youtube.png" />
        <link rel="preload" as="image" href="/elements/spotify.png" />
        <link rel="preload" as="image" href="/elements/apple.png" />
        {/* GA4 (optional) */}
        {gaId ? (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaId}');
                `,
              }}
            />
          </>
        ) : null}

        {/* Meta Pixel (optional) */}
        {mpId ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s){
                  if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                  n.queue=[];t=b.createElement(e);t.async=!0;
                  t.src=v;s=b.getElementsByTagName(e)[0];
                  s.parentNode.insertBefore(t,s)
                }(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${mpId}');
                fbq('track', 'PageView');
              `,
            }}
          />
        ) : null}
      </head>
      <body className={`font-sans`}>
        <ClickTracker />
        <AnalyticsWidget />
        <DevBadge />
        {children}
        <BuildInfoFooter />

        {/* Meta Pixel <noscript> */}
        {mpId ? (
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${mpId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        ) : null}
      </body>
    </html>
  );
}
