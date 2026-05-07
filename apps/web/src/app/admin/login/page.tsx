// ============================================
// Admin Login Page
// ============================================

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Login',
  robots: {
    index: false,
    follow: false,
  },
};

'use client';


import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function AdminLoginPage() {
  const router = useRouter();
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid credentials');
        setIsLoading(false);
        return;
      }

      // Store JWT in memory (not localStorage for security)
      sessionStorage.setItem('admin_token', data.token);
      router.push('/admin');
    } catch {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-vox-bg">
      <div className="glass-strong p-8 max-w-sm w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold gradient-text">Admin Panel</h1>
          <p className="text-sm text-vox-text-muted mt-2">Enter the admin secret to continue</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Admin secret"
            className="input-field"
            id="admin-secret-input"
            autoFocus
          />

          {error && (
            <div className="text-sm text-vox-danger bg-vox-danger/10 px-4 py-2 rounded-xl border border-vox-danger/20">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="w-full"
            id="admin-login-btn"
          >
            Login
          </Button>
        </form>
      </div>
    </main>
  );
}
