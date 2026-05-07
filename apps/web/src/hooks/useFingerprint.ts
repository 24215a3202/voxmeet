// ============================================
// Hook: useFingerprint — Browser fingerprint hash
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { getFingerprint } from '@/lib/fingerprint';

export function useFingerprint() {
  const [fingerprintHash, setFingerprintHash] = useState<string>('unknown');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    getFingerprint().then((hash) => {
      setFingerprintHash(hash);
      setIsReady(true);
    });
  }, []);

  return { fingerprintHash, isReady };
}
