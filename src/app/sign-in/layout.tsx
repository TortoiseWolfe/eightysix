import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In - eightysix',
  description: 'Sign in to your eightysix account',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
