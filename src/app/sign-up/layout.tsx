import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up - eightysix',
  description: 'Create a new eightysix account',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
