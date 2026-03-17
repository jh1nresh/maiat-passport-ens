import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { PrivyProvider } from '@/components/PrivyProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Maiat Passport — Free ENS Identity for Humans & Agents',
  description: "Claim your free .maiat.eth identity. Verified on ENS, trust-scored, zero gas.",
  openGraph: {
    title: 'Maiat Passport — Free ENS Identity',
    description: 'Claim your free .maiat.eth identity. Verified on ENS, trust-scored, zero gas.',
    images: [{ url: 'https://passport.maiat.io/api/og?name=passport&score=100', width: 1200, height: 630 }],
    siteName: 'Maiat Protocol',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Maiat Passport — Free ENS Identity',
    description: 'Claim your free .maiat.eth identity. Verified on ENS, trust-scored, zero gas.',
    images: ['https://passport.maiat.io/api/og?name=passport&score=100'],
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body suppressHydrationWarning className="font-sans antialiased bg-[#F9F9F7] text-[#141414]">
        <PrivyProvider>
          {children}
        </PrivyProvider>
      </body>
    </html>
  );
}
