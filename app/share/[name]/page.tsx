import { Metadata } from 'next';
import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ name: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const cleanName = name.replace(/\.maiat\.eth$/, '').toLowerCase();
  const ogUrl = `https://passport.maiat.io/api/og?name=${encodeURIComponent(cleanName)}`;

  return {
    title: `${cleanName}.maiat.eth — Maiat Passport`,
    description: `${cleanName}.maiat.eth is verified on Maiat. Claim your free ENS identity too.`,
    openGraph: {
      title: `${cleanName}.maiat.eth — Verified Identity`,
      description: `${cleanName}.maiat.eth is verified on Maiat. Claim your free ENS identity too.`,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${cleanName}.maiat.eth — Verified Identity`,
      description: `${cleanName}.maiat.eth is verified on Maiat. Claim your free ENS identity too.`,
      images: [ogUrl],
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { name } = await params;
  const cleanName = name.replace(/\.maiat\.eth$/, '').toLowerCase();
  // Redirect to main page with referral
  redirect(`/?ref=${cleanName}`);
}
