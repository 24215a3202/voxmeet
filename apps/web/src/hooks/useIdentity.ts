// ============================================
// Hook: useIdentity — Anonymous UUID stored in localStorage
// ============================================

'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'voxmeet_user_id';

export function useIdentity() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Try to retrieve existing ID from localStorage
    let id = localStorage.getItem(STORAGE_KEY);

    if (!id) {
      // Generate a cryptographically secure UUID — never Math.random()
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }

    // Validate the stored ID is a proper UUID v4
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      // Corrupted — regenerate
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }

    setUserId(id);
    setIsReady(true);
  }, []);

  return { userId, isReady };
}
