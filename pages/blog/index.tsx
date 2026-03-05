import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
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
        <section className="relative overflow-hidden bg-gradient-to-br from-[#E8DCC8]/30 via-white to-[#E8DCC8]/30 py-12 sm:py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Blog
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-2">
              Tips and guides for small service businesses on reviews, reputation, and getting more 5-star feedback.
            </p>
          </div>
        </section>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          {posts.length === 0 ? (
            <p className="text-gray-600 text-center py-12">
              No posts published yet. Check back soon.
            </p>
          ) : (
            <ul className="space-y-10 list-none">
              {posts.map((post) => (
                <li key={post.slug}>
                  <article className="border-b border-gray-200 pb-10 last:border-0 last:pb-0">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      <Link
                        href={`/blog/${post.slug}`}
                        className="hover:text-[#4A3428] transition-colors"
                      >
                        {post.title}
                      </Link>
                    </h2>
                    <p className="text-gray-600 text-sm mb-2">
                      {post.description}
                    </p>
                    <time
                      dateTime={post.publishDate}
                      className="text-gray-500 text-sm"
                    >
                      {new Date(post.publishDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                  </article>
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
