import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Script from 'next/script'
import { getBlogPost } from '@/lib/blog-posts'
import { isPostPublished, getScheduleEntry } from '@/lib/blog-schedule'
import { BlogPostLayout, BlogPostCTA } from '@/components/BlogPostLayout'

interface BlogPostPageProps {
  slug: string
  title: string
  description: string
  publishedAt: string
  keywords: string[]
}

export default function BlogPostPage({ slug, title, description, publishedAt, keywords }: BlogPostPageProps) {
  const post = getBlogPost(slug)
  if (!post) return null
  const Content = post.Content
  const url = `https://usereviewflo.com/blog/${slug}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    datePublished: publishedAt,
    author: {
      '@type': 'Organization',
      name: 'ReviewFlo',
      url: 'https://usereviewflo.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'ReviewFlo',
      url: 'https://usereviewflo.com',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  }

  return (
    <>
      <Head>
        <title>{`${title} | ReviewFlo`}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords.join(', ')} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={url} />
      </Head>
      <Script
        id="blog-jsonld"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogPostLayout>
        <section className="relative overflow-hidden bg-gradient-to-br from-[#E8DCC8]/30 via-white to-[#E8DCC8]/30 py-12 sm:py-20">
          <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <Content />
            <BlogPostCTA />
          </article>
        </section>
      </BlogPostLayout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const slug = params?.slug as string
  const post = getBlogPost(slug)

  if (!post) {
    return { notFound: true }
  }

  // Return 404 if post is not yet published (publishDate has not passed)
  if (!isPostPublished(slug)) {
    return { notFound: true }
  }

  // Use schedule publishDate for SEO; fallback to frontmatter
  const scheduleEntry = getScheduleEntry(slug)
  const publishedAt = scheduleEntry?.publishDate ?? post.frontmatter.publishedAt

  return {
    props: {
      slug: post.frontmatter.slug,
      title: post.frontmatter.title,
      description: post.frontmatter.description,
      publishedAt,
      keywords: post.frontmatter.keywords,
    },
  }
}
