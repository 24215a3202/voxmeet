// ============================================
// FingerprintJS Initialization
// ============================================

'use client';

import FingerprintJS from '@fingerprintjs/fingerprintjs';

let fpPromise: Promise<string> | null = null;

export async function getFingerprint(): Promise<string> {
  if (fpPromise) return fpPromise;

  fpPromise = (async () => {
    try {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      return result.visitorId;
    } catch {
      return 'unknown';
    }
  })();

  return fpPromise;
}
