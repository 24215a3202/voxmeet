// ============================================
// JSON-LD Structured Data Component
// ============================================

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://voxmeet.app';

interface JsonLdProps {
  type?: 'WebApplication' | 'WebSite';
}

export function JsonLd({ type = 'WebApplication' }: JsonLdProps) {
  const webApplicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'VoxMeet',
    url: SITE_URL,
    applicationCategory: 'CommunicationApplication',
    operatingSystem: 'Web',
    description:
      'Anonymous audio-only chat with random strangers. No accounts, no video — just pick your interests and start talking instantly. P2P encrypted, 100% anonymous.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'Anonymous audio chat',
      'Interest-based matching',
      'P2P encrypted audio',
      'No account required',
      'Instant connection',
    ],
    browserRequirements: 'Requires WebRTC support',
    isAccessibleForFree: true,
  };

  const webSiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'VoxMeet',
    url: SITE_URL,
    description:
      'Anonymous audio-only chat with random strangers. P2P encrypted, 100% anonymous.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const schema = type === 'WebApplication' ? webApplicationSchema : webSiteSchema;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
