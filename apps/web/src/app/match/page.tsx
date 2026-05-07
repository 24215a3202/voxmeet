// ============================================
// Match Page — Server wrapper (metadata only)
// ============================================

import type { Metadata } from 'next';
import MatchPageClient from './MatchPageClient';

export const metadata: Metadata = {
  title: 'Chat Room | VoxMeet',
  robots: {
    index: false,
    follow: false,
  },
};

export default function MatchPage() {
  return <MatchPageClient />;
}
