import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { PostHogProvider } from "@/lib/posthog-provider";
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

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
      // Other types (invite, etc.) can be handled here if needed
    }
  }, [router.pathname]); // Only depend on pathname, not entire router object

  return (
    <PostHogProvider>
      <Component {...pageProps} />
    </PostHogProvider>
  );
}
