import Link from 'next/link';

export const frontmatter = {
  title: 'How to Get Your Google Review Link (Step-by-Step Guide)',
  description: 'Simple step-by-step instructions to get your Google review link. Three easy methods with screenshots-level detail. Takes less than 5 minutes.',
  publishedAt: '2025-02-10',
  slug: 'how-to-get-google-review-link',
  keywords: ['google review link', 'how to get google review link', 'google place id', 'google review link generator', 'write a review link google'],
};

export default function HowToGetGoogleReviewLinkContent() {
  return (
    <>
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#4A3428] mb-4">
          {frontmatter.title}
        </h1>
        <p className="text-[#4A3428]/80 text-base sm:text-lg">
          Your Google review link is a direct URL that takes customers straight to your review page. No searching, no clicking around — just one tap and they&apos;re there. Here&apos;s exactly how to get yours.
        </p>
      </header>

      <div className="space-y-10 text-[#4A3428]/90 leading-relaxed">
        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[#4A3428] mb-3">
            Before you start: Make sure your Google Business Profile is set up
          </h2>
          <p className="mb-3">
            You need an active Google Business Profile to get a review link. If you haven&apos;t set one up yet, go to <a href="https://www.google.com/business/" target="_blank" rel="noopener noreferrer" className="text-[#4A3428] font-medium underline hover:no-underline">google.com/business</a> and follow the steps to claim and verify your business.
          </p>
          <p>
            Once your profile is verified and active, come back here and use one of the three methods below.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[#4A3428] mb-4">
            Method 1: The "Get More Reviews" Button (Easiest)
          </h2>
          <p className="mb-4 text-lg text-[#4A3428]/80">
            This is the fastest way if you have access to the Google account that manages your business.
          </p>

          <div className="space-y-4">
            <div className="bg-white border-l-4 border-[#4A3428] p-4">
              <p className="font-semibold text-[#4A3428] mb-2">Step 1: Log into Google</p>
              <p>Make sure you&apos;re logged into the Google account associated with your Google Business Profile. This is the account you used to set up and verify your business.</p>
            </div>

            <div className="bg-white border-l-4 border-[#4A3428] p-4">
              <p className="font-semibold text-[#4A3428] mb-2">Step 2: Search for your business</p>
              <p>Open Google Search or Google Maps and type in your business name exactly as it appears on your Business Profile.</p>
            </div>

            <div className="bg-white border-l-4 border-[#4A3428] p-4">
              <p className="font-semibold text-[#4A3428] mb-2">Step 3: Look for "Get more reviews"</p>
              <p>In the Business Profile panel (the box that shows your business info on the right side of search results), look for a button or link that says "Get more reviews," "Ask for reviews," or "Share review form."</p>
            </div>

            <div className="bg-white border-l-4 border-[#4A3428] p-4">
              <p className="font-semibold text-[#4A3428] mb-2">Step 4: Click it and copy your link</p>
              <p>Click the button. Google will show you a shareable review link. Copy it and save it somewhere safe (notes app, spreadsheet, wherever you&apos;ll remember).</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-amber-900">
              <strong>Note:</strong> You&apos;ll only see this option when logged into your business account. If you don&apos;t see it, use Method 2 or 3 below.
            </p>
          </div>

          <p className="mt-4">
            Your link will look something like: <code className="bg-[#E8DCC8]/50 px-1.5 py-0.5 rounded text-sm">https://g.page/r/[random-characters]/review</code>
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[#4A3428] mb-4">
            Method 2: Build It Yourself with Your Place ID (Most Reliable)
          </h2>
          <p className="mb-4 text-lg text-[#4A3428]/80">
            This method works every time and doesn&apos;t require being logged in. You just need to find your Place ID and add it to a base URL.
          </p>

          <h3 className="text-xl font-semibold text-[#4A3428] mb-3 mt-6">
            Part A: Find Your Place ID
          </h3>

          <div className="space-y-4 mb-8">
            <div className="bg-white border-l-4 border-[#4A3428] p-4">
              <p className="font-semibold text-[#4A3428] mb-2">Step 1: Go to Google&apos;s Place ID Finder</p>
              <p>Open this link in a new tab: <a href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder" target="_blank" rel="noopener noreferrer" className="text-[#4A3428] font-medium underline hover:no-underline">developers.google.com/maps/documentation/javascript/examples/places-placeid-finder</a></p>
            </div>

            <div className="bg-white border-l-4 border-[#4A3428] p-4">
              <p className="font-semibold text-[#4A3428] mb-2">Step 2: Search for your business</p>
              <p>In the search box on the page, type your business name and location. Click on your business when it appears in the dropdown.</p>
            </div>

            <div className="bg-white border-l-4 border-[#4A3428] p-4">
              <p className="font-semibold text-[#4A3428] mb-2">Step 3: Copy your Place ID</p>
              <p>Look at the panel on the right side. You&apos;ll see your Place ID listed there. It&apos;s a string of random characters that looks something like this: <code className="bg-[#E8DCC8]/50 px-1.5 py-0.5 rounded text-sm">ChIJN1t_tDeuEmsRUsoyG83frY4</code></p>
              <p className="mt-2">Click to highlight it, then copy it (Ctrl+C or Cmd+C).</p>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-[#4A3428] mb-3">
            Part B: Build Your Review Link
          </h3>

          <div className="space-y-4">
            <div className="bg-white border-l-4 border-[#4A3428] p-4">
              <p className="font-semibold text-[#4A3428] mb-2">Step 4: Start with the base URL</p>
              <p>Copy this base URL:</p>
              <div className="bg-[#E8DCC8]/30 rounded p-3 mt-2 font-mono text-sm break-all">
                https://search.google.com/local/writereview?placeid=
              </div>
            </div>

            <div className="bg-white border-l-4 border-[#4A3428] p-4">
              <p className="font-semibold text-[#4A3428] mb-2">Step 5: Add your Place ID to the end</p>
              <p>Paste your Place ID right after the equals sign. No spaces. It should look like this:</p>
              <div className="bg-[#E8DCC8]/30 rounded p-3 mt-2 font-mono text-xs sm:text-sm break-all">
                https://search.google.com/local/writereview?placeid=<span className="bg-amber-100">ChIJN1t_tDeuEmsRUsoyG83frY4</span>
              </div>
            </div>

            <div className="bg-white border-l-4 border-[#4A3428] p-4">
              <p className="font-semibold text-[#4A3428] mb-2">Step 6: Test your link</p>
              <p>Paste the full URL into your browser and hit enter. It should take you straight to the review form for your business. If it does, you&apos;re all set. Save that link.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[#4A3428] mb-4">
            Method 3: Use a Free Generator Tool (Fastest)
          </h2>
          <p className="mb-4 text-lg text-[#4A3428]/80">
            Don&apos;t want to mess with Place IDs? Use a free tool that does it for you.
          </p>

          <div className="space-y-4">
            <div className="bg-white border-l-4 border-[#4A3428] p-4">
              <p className="font-semibold text-[#4A3428] mb-2">Step 1: Find a generator tool</p>
              <p>Search Google for "Google review link generator free" or check out tools like Podium&apos;s free review link generator (under their free tools section) or similar services.</p>
            </div>

            <div className="bg-white border-l-4 border-[#4A3428] p-4">
              <p className="font-semibold text-[#4A3428] mb-2">Step 2: Enter your business name and location</p>
              <p>Type in your exact business name and city/address. The tool will search for your business.</p>
            </div>

            <div className="bg-white border-l-4 border-[#4A3428] p-4">
              <p className="font-semibold text-[#4A3428] mb-2">Step 3: Generate and copy your link</p>
              <p>Click the generate button. The tool will create your review link instantly. Copy it.</p>
            </div>

            <div className="bg-white border-l-4 border-[#4A3428] p-4">
              <p className="font-semibold text-[#4A3428] mb-2">Step 4: Test it</p>
              <p>Before you start using it, paste the link into your browser and make sure it goes to the right business. You don&apos;t want to accidentally send customers to a competitor&apos;s review page.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[#4A3428] mb-4">
            You&apos;ve Got Your Link — Now What?
          </h2>
          <p className="mb-4">
            Save your Google review link somewhere you can easily access it. You&apos;ll use it to ask customers for reviews via text, email, QR codes, or automated tools.
          </p>
          <p className="mb-4">
            For tips on when and how to ask customers for reviews (without being annoying), check out our full guide: <Link href="/blog/how-to-get-more-google-reviews" className="text-[#4A3428] font-medium underline hover:no-underline">How to Get More Google Reviews</Link>.
          </p>
          <p>
            And if you want to automate the whole process — sending review requests automatically and routing unhappy customers to you privately before they post — <Link href="/" className="text-[#4A3428] font-medium underline hover:no-underline">ReviewFlo</Link> handles that for you.
          </p>
        </section>

        <section className="border-t border-[#E8DCC8] pt-10 mt-12">
          <h2 className="text-xl font-semibold text-[#4A3428] mb-6">
            Common Questions
          </h2>
          <section className="space-y-6">
            <section>
              <h3 className="font-semibold text-[#4A3428] mb-2">
                What if I have multiple locations?
              </h3>
              <p>
                Each location has its own Place ID, so you&apos;ll need a separate review link for each one. Just repeat whichever method you used (Method 1, 2, or 3) for each location.
              </p>
            </section>
            <section>
              <h3 className="font-semibold text-[#4A3428] mb-2">
                Does the link expire?
              </h3>
              <p>
                Nope. Your Google review link doesn&apos;t expire. Once you have it, you can use it forever — as long as your Google Business Profile stays active.
              </p>
            </section>
            <section>
              <h3 className="font-semibold text-[#4A3428] mb-2">
                Can I shorten the link?
              </h3>
              <p>
                Yep. Use a URL shortener like Bitly or TinyURL to make it cleaner. Just make sure to test the shortened link before sending it to customers.
              </p>
            </section>
            <section>
              <h3 className="font-semibold text-[#4A3428] mb-2">
                What if the link doesn&apos;t work?
              </h3>
              <p>
                Double-check that you copied your Place ID correctly (no extra spaces or missing characters). Also make sure your Google Business Profile is verified and active. If it&apos;s still not working, try Method 1 or 3 instead.
              </p>
            </section>
          </section>
        </section>
      </div>
    </>
  );
}
