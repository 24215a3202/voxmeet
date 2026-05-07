'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { StatusBar } from '@/components/match/StatusBar';
import { AudioVisualizer } from '@/components/match/AudioVisualizer';
import { MuteButton } from '@/components/match/MuteButton';
import { TextChat } from '@/components/match/TextChat';
import { ReportModal } from '@/components/match/ReportModal';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { Spinner } from '@/components/ui/Spinner';
import { useIdentity } from '@/hooks/useIdentity';
import { useFingerprint } from '@/hooks/useFingerprint';
import { useSocket } from '@/hooks/useSocket';
import { usePeer } from '@/hooks/usePeer';
import { useAudioVisualizer } from '@/hooks/useAudioVisualizer';
import { STATUS, type ConnectionStatus } from '@/lib/constants';
import type { MatchFoundPayload, TurnCredentials, InterestTag, ReportReason } from '@voxmeet/types';

interface ChatMessage {
  id: string;
  text: string;
  timestamp: number;
  isMine: boolean;
}

export default function MatchPageClient() {
  const router = useRouter();
  const { userId, isReady: isIdentityReady } = useIdentity();
  const { fingerprintHash, isReady: isFpReady } = useFingerprint();

  // State
  const [status, setStatus] = useState<ConnectionStatus>(STATUS.IDLE);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitiator, setIsInitiator] = useState(false);
  const [partnerInterests, setPartnerInterests] = useState<InterestTag[]>([]);
  const [turnCredentials, setTurnCredentials] = useState<TurnCredentials | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [bannedUntil, setBannedUntil] = useState<string | null>(null);
  const [interests, setInterests] = useState<InterestTag[]>([]);
  const [partnerId, setPartnerId] = useState<string | null>(null);

  const msgIdCounter = useRef(0);

  // Load interests from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('voxmeet_interests');
    if (stored) {
      try {
        setInterests(JSON.parse(stored));
      } catch {
        router.push('/');
      }
    } else {
      router.push('/');
    }
  }, [router]);

  // Socket callbacks
  const handleMatchFound = useCallback((payload: MatchFoundPayload) => {
    setSessionId(payload.sessionId);
    setIsInitiator(payload.isInitiator);
    setPartnerInterests(payload.partnerInterests);
    setTurnCredentials(payload.turnCredentials);
    setStatus(STATUS.MATCHED);
    setMessages([]);
  }, []);

  const handlePartnerSkipped = useCallback(() => {
    setStatus(STATUS.SEARCHING);
    setSessionId(null);
    setPartnerInterests([]);
    setMessages([]);
    // Auto re-queue
    if (userId && interests.length > 0) {
      socketActions.joinQueue(interests);
    }
  }, [userId, interests]);

  const handlePartnerLeft = useCallback(() => {
    setStatus(STATUS.SEARCHING);
    setSessionId(null);
    setPartnerInterests([]);
    setMessages([]);
    // Auto re-queue
    if (userId && interests.length > 0) {
      socketActions.joinQueue(interests);
    }
  }, [userId, interests]);

  const handleBanned = useCallback((payload: { until?: string }) => {
    setBannedUntil(payload.until || 'permanent');
    setStatus(STATUS.DISCONNECTED);
  }, []);

  const handleChatMessage = useCallback((payload: { text: string; timestamp: number }) => {
    const newMsg: ChatMessage = {
      id: `msg-${++msgIdCounter.current}`,
      text: payload.text,
      timestamp: payload.timestamp,
      isMine: false,
    };
    setMessages((prev) => [...prev, newMsg]);
  }, []);

  // WebRTC signal callbacks
  const handleWebRTCOffer = useCallback((payload: { offer: string }) => {
    peer.processSignal(payload.offer);
  }, []);

  const handleWebRTCAnswer = useCallback((payload: { answer: string }) => {
    peer.processSignal(payload.answer);
  }, []);

  const handleWebRTCIce = useCallback((payload: { candidate: string }) => {
    peer.processSignal(payload.candidate);
  }, []);

  const handleMatchFailed = useCallback((payload: { reason: string }) => {
    if (payload.reason === 'server_at_capacity') {
      setStatus(STATUS.DISCONNECTED);
    }
  }, []);

  // Socket hook
  const socketActions = useSocket({
    userId,
    fingerprintHash,
    onMatchFound: handleMatchFound,
    onPartnerSkipped: handlePartnerSkipped,
    onPartnerLeft: handlePartnerLeft,
    onBanned: handleBanned,
    onChatMessage: handleChatMessage,
    onWebRTCOffer: handleWebRTCOffer,
    onWebRTCAnswer: handleWebRTCAnswer,
    onWebRTCIce: handleWebRTCIce,
    onMatchFailed: handleMatchFailed,
  });

  // Peer hook
  const peerOptions = sessionId && turnCredentials ? {
    isInitiator,
    turnCredentials,
    sessionId,
    onSignal: (data: string) => {
      if (!sessionId) return;
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'offer') {
          socketActions.sendOffer(sessionId, data);
        } else if (parsed.type === 'answer') {
          socketActions.sendAnswer(sessionId, data);
        } else if (parsed.candidate !== undefined) {
          socketActions.sendIce(sessionId, data);
        }
      } catch { }
    },
  } : null;

  const peer = usePeer(peerOptions);

  // Audio visualizer
  const remoteViz = useAudioVisualizer(peer.remoteStream);
  const localViz = useAudioVisualizer(peer.localStream);

  // Auto-join queue when connected
  useEffect(() => {
    if (socketActions.isConnected && isIdentityReady && interests.length > 0 && status === STATUS.IDLE) {
      setStatus(STATUS.SEARCHING);
      socketActions.joinQueue(interests);
    }
  }, [socketActions.isConnected, isIdentityReady, interests, status]);

  // Update status when audio connects
  useEffect(() => {
    if (peer.isAudioConnected && status === STATUS.MATCHED) {
      setStatus(STATUS.CONNECTED);
    }
  }, [peer.isAudioConnected, status]);

  // Connection status tracking
  useEffect(() => {
    if (!socketActions.isConnected && status !== STATUS.IDLE) {
      setStatus(STATUS.CONNECTING);
    }
  }, [socketActions.isConnected]);

  // Handlers
  const handleSkip = () => {
    if (sessionId) {
      socketActions.skip(sessionId);
      peer.destroy();
      setStatus(STATUS.SEARCHING);
      setSessionId(null);
      setPartnerInterests([]);
      setMessages([]);
      // Re-queue
      setTimeout(() => {
        socketActions.joinQueue(interests);
      }, 500);
    }
  };

  const handleSendMessage = (text: string) => {
    if (!sessionId) return;
    socketActions.sendMessage(sessionId, text);
    const newMsg: ChatMessage = {
      id: `msg-${++msgIdCounter.current}`,
      text,
      timestamp: Date.now(),
      isMine: true,
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  const handleReport = (reason: ReportReason) => {
    if (!sessionId || !partnerId) return;
    socketActions.submitReport(sessionId, partnerId, reason);
  };

  const handleLeave = () => {
    if (sessionId) {
      socketActions.skip(sessionId);
    }
    peer.destroy();
    socketActions.disconnect();
    router.push('/');
  };

  // Banned state
  if (bannedUntil) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-strong p-8 max-w-md w-full text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-vox-danger/20 flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-vox-danger">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-vox-text">You've Been Banned</h2>
          <p className="text-vox-text-muted">
            {bannedUntil === 'permanent'
              ? 'Your account has been permanently banned due to multiple violations.'
              : `You are temporarily banned until ${new Date(bannedUntil).toLocaleString()}.`}
          </p>
          <Button variant="secondary" onClick={() => router.push('/')}>
            Go Home
          </Button>
        </div>
      </main>
    );
  }

  const isConnected = status === STATUS.CONNECTED;
  const isSearching = status === STATUS.SEARCHING || status === STATUS.MATCHED;

  return (
    <main className="h-screen flex flex-col bg-vox-bg overflow-hidden">
      {/* Hidden audio element for remote P2P stream */}
      <audio ref={peer.remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Top Bar */}
      <div className="p-3">
        <StatusBar status={status} isAudioConnected={peer.isAudioConnected} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row gap-3 px-3 pb-3 min-h-0">
        {/* Left: Audio Panel */}
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          {/* Audio Area */}
          <div className="flex-1 glass flex flex-col items-center justify-center gap-8 relative overflow-hidden">
            {/* Background gradient orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className={`absolute top-1/4 left-1/4 w-48 h-48 rounded-full blur-[80px] transition-all duration-1000 ${isConnected ? 'bg-vox-primary/20' : 'bg-vox-primary/5'}`} />
              <div className={`absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full blur-[80px] transition-all duration-1000 ${isConnected ? 'bg-vox-secondary/20' : 'bg-vox-secondary/5'}`} />
            </div>

            {isSearching && (
              <div className="relative z-10 flex flex-col items-center gap-6 animate-fade-in">
                <div className="relative">
                  <Spinner size="lg" />
                  <div className="absolute inset-0 w-12 h-12 rounded-full bg-vox-primary/10 animate-ping" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-medium text-vox-text">
                    {status === STATUS.MATCHED ? 'Setting up audio…' : 'Finding someone…'}
                  </p>
                  <p className="text-sm text-vox-text-muted">
                    Looking for people who share your interests
                  </p>
                </div>
              </div>
            )}

            {isConnected && (
              <div className="relative z-10 flex flex-col items-center gap-6 animate-fade-in w-full px-8">
                {/* Partner interests */}
                {partnerInterests.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {partnerInterests.map((tag) => (
                      <Pill key={tag} label={tag} isActive />
                    ))}
                  </div>
                )}

                {/* Remote audio visualizer */}
                <AudioVisualizer
                  bars={remoteViz.bars}
                  isActive={remoteViz.isActive}
                  label="Partner"
                />

                {/* Divider */}
                <div className="w-32 h-px bg-vox-border" />

                {/* Local audio visualizer */}
                <AudioVisualizer
                  bars={localViz.bars}
                  isActive={localViz.isActive && !peer.isMuted}
                  label="You"
                />
              </div>
            )}

            {status === STATUS.IDLE && (
              <div className="relative z-10 text-center space-y-3 animate-fade-in">
                <p className="text-lg text-vox-text-muted">Connecting to server…</p>
                <Spinner />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="glass px-4 py-3 flex items-center justify-center gap-3">
            {/* Mute */}
            <MuteButton
              isMuted={peer.isMuted}
              onToggle={peer.toggleMute}
              disabled={!isConnected}
            />

            {/* Skip */}
            <button
              onClick={handleSkip}
              disabled={!sessionId}
              className="p-4 rounded-2xl bg-vox-warning/10 border border-vox-warning/30 text-vox-warning
                         hover:bg-vox-warning/20 hover:border-vox-warning/50
                         transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
              id="skip-btn"
              title="Skip to next person"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5,4 15,12 5,20" />
                <line x1="19" y1="5" x2="19" y2="19" />
              </svg>
            </button>

            {/* Report */}
            <button
              onClick={() => setIsReportOpen(true)}
              disabled={!isConnected}
              className="p-4 rounded-2xl bg-vox-danger/10 border border-vox-danger/30 text-vox-danger
                         hover:bg-vox-danger/20 hover:border-vox-danger/50
                         transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
              id="report-btn"
              title="Report this user"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
            </button>

            {/* Leave */}
            <button
              onClick={handleLeave}
              className="p-4 rounded-2xl bg-vox-surface border border-vox-border text-vox-text-muted
                         hover:bg-vox-card hover:text-vox-text
                         transition-all active:scale-90"
              id="leave-btn"
              title="Leave"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16,17 21,12 16,7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right: Text Chat Panel */}
        <div className="hidden md:flex w-80 flex-col min-h-0">
          <TextChat
            messages={messages}
            onSend={handleSendMessage}
            disabled={!isConnected}
            isOpen={true}
            onToggle={() => {}}
          />
        </div>

        {/* Mobile chat */}
        <div className="md:hidden">
          {isChatOpen && (
            <div className="fixed inset-0 z-20 bg-vox-bg/95 flex flex-col animate-slide-up">
              <div className="flex-1 min-h-0">
                <TextChat
                  messages={messages}
                  onSend={handleSendMessage}
                  disabled={!isConnected}
                  isOpen={isChatOpen}
                  onToggle={() => setIsChatOpen(false)}
                />
              </div>
            </div>
          )}
          {!isChatOpen && (
            <TextChat
              messages={messages}
              onSend={handleSendMessage}
              disabled={!isConnected}
              isOpen={false}
              onToggle={() => setIsChatOpen(true)}
            />
          )}
        </div>
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        onSubmit={handleReport}
      />
    </main>
  );
}
