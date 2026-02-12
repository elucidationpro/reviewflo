import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Favicons */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

        {/* Primary SEO Meta Tags */}
        <meta name="title" content="ReviewFlo - Stop Bad Reviews, Get More Good Ones" />
        <meta name="description" content="Intercept negative reviews before they go public. Make getting 5-star reviews effortless." />
        <meta name="keywords" content="review management, customer reviews, business reviews, google reviews, online reputation, feedback management, service business, local business, review collection, bad reviews, 5-star reviews" />
        <meta name="author" content="ReviewFlo" />
        <meta name="robots" content="index, follow" />

        {/* Open Graph / Twitter are set per-page so business pages can use neutral images */}

        {/* Additional Meta Tags */}
        <meta name="theme-color" content="#4A3428" />
        <link rel="canonical" href="https://usereviewflo.com" />

        {/* Google Analytics (GA4) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-8DS0XBY8J7"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-8DS0XBY8J7');
          `}
        </Script>
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
