import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { PostHogProvider } from "@/lib/posthog-provider";
import LaunchBanner from "@/components/LaunchBanner";
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://usereviewflo.com").replace(/\/$/, "");
  const canonicalPath = (router.asPath || "/").split("?")[0] || "/";
  const canonicalUrl = `${baseUrl}${canonicalPath === "/" ? "" : canonicalPath}`;

  useEffect(() => {
    // Handle Supabase auth tokens in URL hash (recovery, invite, etc.)
    // If Supabase redirects to homepage with tokens, redirect to appropriate page
    // Only run this if we're NOT already on the target page to avoid loops
    if (typeof window !== 'undefined' && window.location.hash && router.pathname !== '/update-password') {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const access_token = hashParams.get('access_token');
      const type = hashParams.get('type');

      if (access_token && type === 'recovery') {
        // Password reset/recovery token - redirect to update-password page
        router.replace(`/update-password${window.location.hash}`);
        return;
      }

      // Google OAuth → magic link: if redirectTo isn't allowlisted, Supabase falls back to Site URL (/).
      // Session tokens still arrive in the hash; rf_magic_next was set by the OAuth callback.
      if (
        access_token &&
        type === 'magiclink' &&
        router.pathname === '/' &&
        /(?:^|; )rf_magic_next=/.test(document.cookie)
      ) {
        const match = document.cookie.match(/(?:^|; )rf_magic_next=([^;]+)/);
        const raw = match?.[1]?.trim();
        const next = raw === 'google-confirm' ? 'google-confirm' : 'dashboard';
        document.cookie = 'rf_magic_next=; Path=/; Max-Age=0';
        window.location.replace(
          `${window.location.origin}/auth/magic-landing?next=${next}${window.location.hash}`
        );
      }
    }
  }, [router.pathname]); // Only depend on pathname, not entire router object

  return (
    <PostHogProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href={canonicalUrl} />
      </Head>
      <Component {...pageProps} />
    </PostHogProvider>
  );
}
