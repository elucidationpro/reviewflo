import type { GetStaticPaths, GetStaticProps } from 'next';
import IndustryLandingPage from '@/components/IndustryLandingPage';
import { getIndustryData, getIndustrySlugs, type IndustryData } from '@/lib/industries';

interface IndustryPageProps {
  industry: IndustryData;
}

export default function IndustryPage({ industry }: IndustryPageProps) {
  return <IndustryLandingPage industry={industry} />;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = getIndustrySlugs();

  return {
    paths: slugs.map((slug) => ({ params: { industry: slug } })),
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps<IndustryPageProps> = async ({ params }) => {
  const slug = params?.industry as string | undefined;
  if (!slug) return { notFound: true, revalidate: 86400 };

  const industry = getIndustryData(slug);
  if (!industry) return { notFound: true, revalidate: 86400 };

  return {
    props: { industry },
    revalidate: 86400,
  };
};

