import type { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/dashboard/outreach',
      permanent: false,
    },
  }
}

export default function AnalyticsRedirect() {
  return null
}
