import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />

        {/* Primary SEO Meta Tags */}
        <meta name="title" content="ReviewFlo - Smart Review Management for Service Businesses" />
        <meta name="description" content="Collect 5-star reviews and catch problems before they go public. Simple review management for local businesses." />
        <meta name="keywords" content="review management, customer reviews, business reviews, google reviews, online reputation, feedback management, service business, local business, review collection" />
        <meta name="author" content="ReviewFlo" />
        <meta name="robots" content="index, follow" />

        {/* Open Graph / Facebook / iMessage / Slack */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://usereviewflo.com" />
        <meta property="og:title" content="ReviewFlo - Smart Review Management for Service Businesses" />
        <meta property="og:description" content="Collect 5-star reviews and catch problems before they go public. Simple review management for local businesses." />
        <meta property="og:site_name" content="ReviewFlo" />
        {/* TODO: Create and add og:image (1200x630px) for link previews */}
        {/* <meta property="og:image" content="https://usereviewflo.com/og-image.png" /> */}
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://usereviewflo.com" />
        <meta name="twitter:title" content="ReviewFlo - Smart Review Management for Service Businesses" />
        <meta name="twitter:description" content="Collect 5-star reviews and catch problems before they go public. Simple review management for local businesses." />
        {/* TODO: Create and add twitter:image (1200x630px) for link previews */}
        {/* <meta name="twitter:image" content="https://usereviewflo.com/og-image.png" /> */}

        {/* Additional Meta Tags */}
        <meta name="theme-color" content="#3B82F6" />
        <link rel="canonical" href="https://usereviewflo.com" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
