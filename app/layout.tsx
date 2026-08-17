import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const DESCRIPTION =
  'Job search for Filipino freelancers — OnlineJobs.ph, LinkedIn, and Upwork in one click, ranked by AI, with ready-to-send applications.';

export const metadata: Metadata = {
  icons: { icon: '/icon.svg', apple: '/logo-social.svg' },
  title: 'EasyClient — Find your next online job',
  description: DESCRIPTION,
  // What Facebook shows when someone shares the link — the ads land here, so
  // the preview card matters as much as the page.
  openGraph: {
    title: 'EasyClient — Find your next online job',
    description: DESCRIPTION,
    siteName: 'EasyClient',
    locale: 'en_PH',
    type: 'website',
    images: [{ url: '/logo-social.svg', width: 512, height: 512, alt: 'EasyClient' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-white`}>
        {children}
      </body>
    </html>
  );
}
