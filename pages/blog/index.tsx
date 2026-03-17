import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'
import { getPublishedPosts } from '@/lib/blog-schedule'
import { getBlogPost } from '@/lib/blog-posts'
import { BlogPostLayout } from '@/components/BlogPostLayout'

interface BlogIndexPageProps {
  posts: Array<{
    slug: string
    title: string
    description: string
    publishDate: string
  }>
}

export default function BlogIndexPage({ posts }: BlogIndexPageProps) {
  return (
    <>
      <Head>
        <title>Blog | ReviewFlo</title>
        <meta
          name="description"
          content="Tips and guides for small businesses on getting more Google reviews, preventing bad reviews, and managing your reputation."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://usereviewflo.com/blog" />
      </Head>
      <BlogPostLayout>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#E8DCC8]/30 via-white to-[#E8DCC8]/30 py-12 sm:py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E8DCC8] text-[#4A3428] text-xs font-bold rounded-full mb-4 tracking-wide uppercase">
              <BookOpen className="w-3 h-3" />
              ReviewFlo Blog
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Tips &amp; Guides
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Practical advice for small service businesses on reviews, reputation, and getting more 5-star feedback.
            </p>
          </div>
        </section>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-[#E8DCC8]/60 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-[#4A3428]/50" />
              </div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">No posts yet</h2>
              <p className="text-gray-500 text-sm">Check back soon — guides and tips are on the way.</p>
            </div>
          ) : (
            <ul className="grid sm:grid-cols-2 gap-6 list-none">
              {posts.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group block bg-white border border-gray-200 rounded-xl p-6 hover:border-[#C9A961]/60 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 h-full"
                  >
                    <article className="flex flex-col h-full">
                      <time
                        dateTime={post.publishDate}
                        className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3"
                      >
                        {new Date(post.publishDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </time>
                      <h2 className="text-base font-bold text-gray-900 mb-2 group-hover:text-[#4A3428] transition-colors leading-snug">
                        {post.title}
                      </h2>
                      <p className="text-gray-500 text-sm leading-relaxed flex-1">
                        {post.description}
                      </p>
                      <div className="flex items-center gap-1 mt-4 text-[#4A3428] text-sm font-semibold">
                        Read more
                        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                      </div>
                    </article>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </main>
      </BlogPostLayout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<BlogIndexPageProps> = async () => {
  const publishedPosts = getPublishedPosts()

  const posts = publishedPosts.map((scheduled) => {
    const post = getBlogPost(scheduled.slug)
    return {
      slug: scheduled.slug,
      title: post?.frontmatter.title ?? scheduled.slug,
      description: post?.frontmatter.description ?? '',
      publishDate: scheduled.publishDate,
    }
  })

  return {
    props: { posts },
  }
}
