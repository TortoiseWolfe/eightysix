import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reset Password - eightysix',
  description: 'Set a new password for your eightysix account',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
