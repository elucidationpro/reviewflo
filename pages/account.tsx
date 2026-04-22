import type { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/settings?section=profile',
      permanent: false,
    },
  }
}

export default function AccountRedirect() {
  return null
}
