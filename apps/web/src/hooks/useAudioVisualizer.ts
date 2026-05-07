// ============================================
// Hook: useAudioVisualizer — Web Audio API FFT bars
// ============================================

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export function useAudioVisualizer(stream: MediaStream | null) {
  const [bars, setBars] = useState<number[]>(new Array(32).fill(0));
  const [isActive, setIsActive] = useState(false);
  const animFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream) {
      setBars(new Array(32).fill(0));
      setIsActive(false);
      return;
    }

    try {
      const audioContext = new AudioContext();
      contextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const draw = () => {
        analyser.getByteFrequencyData(dataArray);

        const normalizedBars = Array.from(dataArray).map((v) => v / 255);
        setBars(normalizedBars);

        // Check if there's actual audio activity
        const avgLevel = normalizedBars.reduce((a, b) => a + b, 0) / normalizedBars.length;
        setIsActive(avgLevel > 0.02);

        animFrameRef.current = requestAnimationFrame(draw);
      };

      draw();
    } catch (err) {
      console.error('Audio visualizer error:', err);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (contextRef.current) {
        contextRef.current.close().catch(() => {});
      }
    };
  }, [stream]);

  return { bars, isActive };
}
