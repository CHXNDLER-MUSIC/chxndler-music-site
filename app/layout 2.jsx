export const metadata = {
  title: "CHXNDLER — Cockpit",
  description: "Pilot the cockpit, switch channels, and drift through space.",
};

import "./globals.css";
// Use a local font via @font-face in globals.css to avoid network fetches.

export default function RootLayout({ children }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;            // e.g., G-XXXXXXX
  const mpId = process.env.NEXT_PUBLIC_META_PIXEL_ID;    // e.g., 1234567890

  return (
    <html lang="en">
      <head>
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
        {children}

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
