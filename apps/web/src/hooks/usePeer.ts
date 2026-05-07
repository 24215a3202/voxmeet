// ============================================
// Hook: usePeer — WebRTC Audio via simple-peer
// ============================================

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { TurnCredentials } from '@voxmeet/types';

interface UsePeerOptions {
  isInitiator: boolean;
  turnCredentials: TurnCredentials;
  sessionId: string;
  onSignal: (data: string) => void;
}

export function usePeer(options: UsePeerOptions | null) {
  const [isAudioConnected, setIsAudioConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const peerRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize peer connection
  useEffect(() => {
    if (!options) return;

    let mounted = true;
    let Peer: any;

    const init = async () => {
      try {
        // Dynamic import simple-peer (browser-only)
        const SimplePeer = (await import('simple-peer')).default;
        Peer = SimplePeer;

        // Request microphone access — audio only, never video
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);

        // Build ICE server config
        const iceServers: RTCIceServer[] = [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ];

        // Add TURN servers if available
        if (options.turnCredentials.urls.length > 0) {
          iceServers.push({
            urls: options.turnCredentials.urls,
            username: options.turnCredentials.username,
            credential: options.turnCredentials.credential,
          });
        }

        // Create peer
        const peer = new Peer({
          initiator: options.isInitiator,
          trickle: true,
          stream,
          config: {
            iceServers,
          },
        });

        peerRef.current = peer;

        // Signal data → send to server for relay
        peer.on('signal', (data: any) => {
          if (!mounted) return;
          options.onSignal(JSON.stringify(data));
        });

        // Remote stream received
        peer.on('stream', (remoteStream: MediaStream) => {
          if (!mounted) return;
          setRemoteStream(remoteStream);
          setIsAudioConnected(true);

          // Auto-play remote audio
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.play().catch(() => {
              // Autoplay blocked — user interaction needed
            });
          }
        });

        peer.on('connect', () => {
          if (!mounted) return;
          setIsAudioConnected(true);
        });

        peer.on('error', (err: Error) => {
          if (!mounted) return;
          console.error('Peer error:', err);
          setError(err.message);
        });

        peer.on('close', () => {
          if (!mounted) return;
          setIsAudioConnected(false);
        });
      } catch (err: any) {
        if (!mounted) return;
        console.error('Peer init error:', err);
        setError(err.message || 'Failed to access microphone');
      }
    };

    init();

    return () => {
      mounted = false;
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      setIsAudioConnected(false);
      setRemoteStream(null);
      setLocalStream(null);
    };
  }, [options?.sessionId, options?.isInitiator]);

  // Process incoming signal from partner
  const processSignal = useCallback((signalData: string) => {
    try {
      const data = JSON.parse(signalData);
      if (peerRef.current && !peerRef.current.destroyed) {
        peerRef.current.signal(data);
      }
    } catch (err) {
      console.error('Signal processing error:', err);
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted((prev) => !prev);
    }
  }, []);

  // Destroy peer
  const destroy = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setIsAudioConnected(false);
    setRemoteStream(null);
    setLocalStream(null);
  }, []);

  return {
    isAudioConnected,
    isMuted,
    remoteStream,
    localStream,
    error,
    processSignal,
    toggleMute,
    destroy,
    remoteAudioRef,
  };
}
