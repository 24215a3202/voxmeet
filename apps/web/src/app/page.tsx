// ============================================
// Landing Page
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { InterestSelector } from '@/components/landing/InterestSelector';
import { Button } from '@/components/ui/Button';
import { useIdentity } from '@/hooks/useIdentity';


export default function LandingPage() {
  const router = useRouter();
  const { userId, isReady } = useIdentity();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    setIsAnimated(true);
  }, []);

  const handleStart = () => {
    if (selectedInterests.length === 0) return;

    // Store interests in sessionStorage for the match page
    sessionStorage.setItem('voxmeet_interests', JSON.stringify(selectedInterests));
    router.push('/match');
  };

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-vox-primary/20 rounded-full blur-[128px] animate-pulse-slow" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-vox-secondary/15 rounded-full blur-[128px] animate-pulse-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-vox-accent/5 rounded-full blur-[200px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-16">
        {/* Hero */}
        <div className={`text-center space-y-6 mb-12 transition-all duration-1000 ${isAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Logo */}
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-vox-primary to-vox-secondary flex items-center justify-center shadow-lg shadow-vox-primary/30">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-vox-success rounded-full animate-pulse" />
            </div>
            <h1 className="text-3xl font-display font-bold tracking-tight">
              <span className="gradient-text">VoxMeet</span>
            </h1>
          </div>

          <h2 className="text-4xl md:text-6xl font-display font-bold text-white leading-tight max-w-3xl">
            Talk to{' '}
            <span className="relative inline-block">
              <span className="gradient-text">Strangers</span>
              <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-vox-primary via-vox-secondary to-vox-accent rounded-full" />
            </span>
            <br />
            Audio Only
          </h2>

          <p className="text-lg md:text-xl text-vox-text-muted max-w-xl mx-auto leading-relaxed">
            No video. No accounts. Just pick your interests and jump into
            anonymous voice conversations with people around the world.
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 pt-2">
            <div className="text-center">
              <div className="text-2xl font-bold text-vox-primary">P2P</div>
              <div className="text-xs text-vox-text-dim">Encrypted Audio</div>
            </div>
            <div className="w-px h-8 bg-vox-border" />
            <div className="text-center">
              <div className="text-2xl font-bold text-vox-secondary">100%</div>
              <div className="text-xs text-vox-text-dim">Anonymous</div>
            </div>
            <div className="w-px h-8 bg-vox-border" />
            <div className="text-center">
              <div className="text-2xl font-bold text-vox-accent">Zero</div>
              <div className="text-xs text-vox-text-dim">Data Stored</div>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div
          className={`w-full max-w-lg glass-strong p-8 space-y-6 transition-all duration-1000 delay-300 ${
            isAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Interest Selector */}
          <InterestSelector
            selected={selectedInterests}
            onChange={setSelectedInterests}
          />

          {/* Start Button */}
          <Button
            variant="primary"
            size="lg"
            className="w-full text-lg font-display"
            onClick={handleStart}
            disabled={!isReady || selectedInterests.length === 0}
            id="start-talking-btn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            </svg>
            {selectedInterests.length === 0
              ? 'Select at least one interest'
              : 'Start Talking'
            }
          </Button>

          {/* Info */}
          <p className="text-xs text-vox-text-dim text-center">
            By clicking "Start Talking" you agree to be respectful.
            Abuse leads to permanent bans.
          </p>
        </div>

        {/* Features */}
        <div
          className={`grid grid-cols-1 md:grid-cols-3 gap-4 mt-16 max-w-3xl w-full transition-all duration-1000 delay-500 ${
            isAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {[
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              ),
              title: 'End-to-End Secure',
              desc: 'Audio is peer-to-peer encrypted. Never touches our servers.',
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              ),
              title: 'Interest Matching',
              desc: 'Get matched with people who share your interests.',
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" /></svg>
              ),
              title: 'Instant Connect',
              desc: 'No sign-up needed. Start talking in under 10 seconds.',
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="glass p-5 text-center space-y-3 hover:border-vox-primary/30 transition-colors duration-300"
            >
              <div className="inline-flex p-3 rounded-xl bg-vox-primary/10 text-vox-primary">
                {feature.icon}
              </div>
              <h3 className="font-semibold text-vox-text">{feature.title}</h3>
              <p className="text-sm text-vox-text-muted">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-xs text-vox-text-dim">
          <p>VoxMeet — Audio conversations with strangers</p>
          <p className="mt-1">No data stored. No accounts. Just talk.</p>
        </footer>
      </div>
    </main>
  );
}
