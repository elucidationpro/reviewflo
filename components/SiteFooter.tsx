'use client';

import Link from 'next/link';
import { useRouter } from 'next/router';
import { trackEvent } from '@/lib/posthog-provider';

export default function SiteFooter() {
  const router = useRouter();

  const handleFooterClick = (link: 'how-it-works' | 'pricing' | 'blog' | 'about' | 'contact' | 'terms' | 'privacy') =>
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      // Allow normal navigation but also track click
      trackEvent('footer_link_clicked', {
        link,
        path: router.asPath,
      });

      if (link === 'how-it-works') {
        // If already on homepage, smooth scroll instead of full navigation
        if (router.pathname === '/') {
          event.preventDefault();
          const el = document.getElementById('how-it-works');
          if (el) {
            const headerOffset = 80;
            const rect = el.getBoundingClientRect();
            const scrollTop = window.scrollY + rect.top - headerOffset;
            window.scrollTo({ top: scrollTop, behavior: 'smooth' });
          }
        }
      }
    };

  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">ReviewFlo</h3>
            <p className="mt-3 text-sm text-gray-600 max-w-xs">
              Stop bad reviews before they go public. Simple review management for small service businesses.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900">Product</h4>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>
                <Link
                  href="/#how-it-works"
                  onClick={handleFooterClick('how-it-works')}
                  className="hover:text-[#4A3428] transition-colors"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  onClick={handleFooterClick('pricing')}
                  className="hover:text-[#4A3428] transition-colors"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900">Company</h4>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>
                <Link
                  href="/blog"
                  onClick={handleFooterClick('blog')}
                  className="hover:text-[#4A3428] transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  onClick={handleFooterClick('about')}
                  className="hover:text-[#4A3428] transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <a
                  href="mailto:jeremy@usereviewflo.com"
                  onClick={handleFooterClick('contact')}
                  className="hover:text-[#4A3428] transition-colors"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900">Legal</h4>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>
                <Link
                  href="/terms"
                  onClick={handleFooterClick('terms')}
                  className="hover:text-[#4A3428] transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  onClick={handleFooterClick('privacy')}
                  className="hover:text-[#4A3428] transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-gray-500">
          <p>© 2026 ReviewFlo. Based in Utah.</p>
          <p className="text-center sm:text-right">
            Built for barbers, auto detailers, plumbers, electricians, cleaners, HVAC pros, and more.
          </p>
        </div>
      </div>
    </footer>
  );
}

