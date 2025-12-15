import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />

        {/* Primary SEO Meta Tags */}
        <meta name="title" content="ReviewFlo - Stop Bad Reviews, Get More Good Ones" />
        <meta name="description" content="Intercept negative reviews before they go public. Make getting 5-star reviews effortless." />
        <meta name="keywords" content="review management, customer reviews, business reviews, google reviews, online reputation, feedback management, service business, local business, review collection, bad reviews, 5-star reviews" />
        <meta name="author" content="ReviewFlo" />
        <meta name="robots" content="index, follow" />

        {/* Open Graph / Facebook / iMessage / Slack */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://usereviewflo.com" />
        <meta property="og:title" content="ReviewFlo - Stop Bad Reviews, Get More Good Ones" />
        <meta property="og:description" content="Intercept negative reviews before they go public. Make getting 5-star reviews effortless." />
        <meta property="og:site_name" content="ReviewFlo" />
        <meta property="og:image" content="https://usereviewflo.com/images/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/png" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://usereviewflo.com" />
        <meta name="twitter:title" content="ReviewFlo - Stop Bad Reviews, Get More Good Ones" />
        <meta name="twitter:description" content="Intercept negative reviews before they go public. Make getting 5-star reviews effortless." />
        <meta name="twitter:image" content="https://usereviewflo.com/images/og-image.png" />

        {/* Additional Meta Tags */}
        <meta name="theme-color" content="#4A3428" />
        <link rel="canonical" href="https://usereviewflo.com" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
