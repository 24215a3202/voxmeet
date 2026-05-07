// ============================================
// Hook: useSocket — Socket.io connection management
// ============================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket, disconnectSocket } from '@/lib/socket';
import type { Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  MatchFoundPayload,
  BannedPayload,
  RateLimitedPayload,
} from '@voxmeet/types';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface UseSocketOptions {
  userId: string | null;
  fingerprintHash: string;
  onMatchFound?: (payload: MatchFoundPayload) => void;
  onPartnerSkipped?: () => void;
  onPartnerLeft?: () => void;
  onBanned?: (payload: BannedPayload) => void;
  onRateLimited?: (payload: RateLimitedPayload) => void;
  onChatMessage?: (payload: { text: string; timestamp: number }) => void;
  onWebRTCOffer?: (payload: { offer: string }) => void;
  onWebRTCAnswer?: (payload: { answer: string }) => void;
  onWebRTCIce?: (payload: { candidate: string }) => void;
  onMatchFailed?: (payload: { reason: string }) => void;
}

export function useSocket(options: UseSocketOptions) {
  const {
    userId,
    fingerprintHash,
    onMatchFound,
    onPartnerSkipped,
    onPartnerLeft,
    onBanned,
    onRateLimited,
    onChatMessage,
    onWebRTCOffer,
    onWebRTCAnswer,
    onWebRTCIce,
    onMatchFailed,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<TypedSocket | null>(null);

  // Store callbacks in refs to avoid re-registering events
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  useEffect(() => {
    if (!userId) return;

    const socket = getSocket(userId, fingerprintHash);
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      setConnectionError(err.message);
      setIsConnected(false);
    });

    // Server events
    socket.on('match:found', (payload) => {
      callbacksRef.current.onMatchFound?.(payload);
    });

    socket.on('match:failed', (payload) => {
      callbacksRef.current.onMatchFailed?.(payload);
    });

    socket.on('partner:skipped', () => {
      callbacksRef.current.onPartnerSkipped?.();
    });

    socket.on('partner:left', () => {
      callbacksRef.current.onPartnerLeft?.();
    });

    socket.on('banned', (payload) => {
      callbacksRef.current.onBanned?.(payload);
    });

    socket.on('rate_limited', (payload) => {
      callbacksRef.current.onRateLimited?.(payload);
    });

    socket.on('chat:message', (payload) => {
      callbacksRef.current.onChatMessage?.(payload);
    });

    socket.on('webrtc:offer', (payload) => {
      callbacksRef.current.onWebRTCOffer?.(payload);
    });

    socket.on('webrtc:answer', (payload) => {
      callbacksRef.current.onWebRTCAnswer?.(payload);
    });

    socket.on('webrtc:ice', (payload) => {
      callbacksRef.current.onWebRTCIce?.(payload);
    });

    return () => {
      // Don't fully disconnect — let the socket persist across navigations
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('match:found');
      socket.off('match:failed');
      socket.off('partner:skipped');
      socket.off('partner:left');
      socket.off('banned');
      socket.off('rate_limited');
      socket.off('chat:message');
      socket.off('webrtc:offer');
      socket.off('webrtc:answer');
      socket.off('webrtc:ice');
    };
  }, [userId, fingerprintHash]);

  // Emit helpers
  const joinQueue = useCallback(
    (interests: string[]) => {
      socketRef.current?.emit('queue:join', { userId: userId!, interests: interests as any });
    },
    [userId]
  );

  const leaveQueue = useCallback(() => {
    socketRef.current?.emit('queue:leave', { userId: userId! });
  }, [userId]);

  const skip = useCallback(
    (sessionId: string) => {
      socketRef.current?.emit('skip', { sessionId });
    },
    []
  );

  const sendMessage = useCallback(
    (sessionId: string, text: string) => {
      socketRef.current?.emit('chat:message', { sessionId, text });
    },
    []
  );

  const sendOffer = useCallback(
    (sessionId: string, offer: string) => {
      socketRef.current?.emit('webrtc:offer', { sessionId, offer });
    },
    []
  );

  const sendAnswer = useCallback(
    (sessionId: string, answer: string) => {
      socketRef.current?.emit('webrtc:answer', { sessionId, answer });
    },
    []
  );

  const sendIce = useCallback(
    (sessionId: string, candidate: string) => {
      socketRef.current?.emit('webrtc:ice', { sessionId, candidate });
    },
    []
  );

  const submitReport = useCallback(
    (sessionId: string, reportedId: string, reason: string) => {
      socketRef.current?.emit('report:submit', { sessionId, reportedId, reason: reason as any });
    },
    []
  );

  const disconnect = useCallback(() => {
    disconnectSocket();
    setIsConnected(false);
  }, []);

  return {
    isConnected,
    connectionError,
    joinQueue,
    leaveQueue,
    skip,
    sendMessage,
    sendOffer,
    sendAnswer,
    sendIce,
    submitReport,
    disconnect,
  };
}
