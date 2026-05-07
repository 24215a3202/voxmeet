import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { JsonLd } from '@/components/seo/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://voxmeet.app';
const SITE_NAME = 'VoxMeet';
const SITE_DESCRIPTION =
  'Anonymous audio-only chat with random strangers. No accounts, no video — just pick your interests and start talking instantly. P2P encrypted, 100% anonymous.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  // ── Core ──────────────────────────────────────────────────────────────────
  title: {
    default: `${SITE_NAME} — Talk to Strangers Anonymously`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'audio chat',
    'random chat',
    'talk to strangers',
    'anonymous chat',
    'voice chat',
    'random voice chat',
    'omegle alternative',
    'anonymous voice call',
    'stranger chat',
    'interest-based chat',
    'peer to peer audio',
    'no signup chat',
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  applicationName: SITE_NAME,
  generator: 'Next.js',

  // ── Canonical / Alternate ─────────────────────────────────────────────────
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/',
    },
  },

  // ── Robots ───────────────────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // ── Open Graph ───────────────────────────────────────────────────────────
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Talk to Strangers Anonymously`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'VoxMeet — Anonymous Audio Chat',
      },
    ],
  },

  // ── Twitter Card ─────────────────────────────────────────────────────────
  twitter: {
    card: 'summary_large_image',
    site: '@voxmeet',
    creator: '@voxmeet',
    title: `${SITE_NAME} — Talk to Strangers Anonymously`,
    description: SITE_DESCRIPTION,
    images: ['/og-image.png'],
  },

  // ── Icons ─────────────────────────────────────────────────────────────────
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    shortcut: '/favicon-32x32.png',
  },

  // ── Manifest ─────────────────────────────────────────────────────────────
  manifest: '/manifest.json',

  // ── Verification ─────────────────────────────────────────────────────────
  // Add your tokens once you have them:
  // verification: {
  //   google: 'YOUR_GOOGLE_VERIFICATION_TOKEN',
  //   yandex: 'YOUR_YANDEX_TOKEN',
  // },

  // ── Category ─────────────────────────────────────────────────────────────
  category: 'social',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0f0f14' },
    { media: '(prefers-color-scheme: light)', color: '#7c3aed' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <JsonLd type="WebApplication" />
        <JsonLd type="WebSite" />
      </head>
      <body className="min-h-screen bg-vox-bg antialiased">
        {children}
      </body>
    </html>
  );
}
