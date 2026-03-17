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

  return (
    <div>
      <meta httpEquiv="refresh" content={`2;url=/?ref=${cleanName}`} />
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#000', color: '#fff',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <p style={{ fontSize: '14px', opacity: 0.6 }}>
          Redirecting to {cleanName}.maiat.eth...
        </p>
      </div>
    </div>
  );
}
