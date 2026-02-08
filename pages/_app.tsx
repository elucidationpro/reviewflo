import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { PostHogProvider } from "@/lib/posthog-provider";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <PostHogProvider>
      <Component {...pageProps} />
    </PostHogProvider>
  );
}
