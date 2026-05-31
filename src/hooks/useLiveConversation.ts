/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * JARVIS live conversation — a self-contained, free streaming voice loop:
 *  - continuous microphone listening (no button)
 *  - energy-based Voice Activity Detection (start/stop of speech)
 *  - barge-in: user speaking over JARVIS interrupts him
 *  - auto-send each finished utterance
 *
 * No paid "Live API" needed. STT/LLM/TTS are wired by the caller via callbacks,
 * so this works on any machine (and scales to a real server with local Whisper).
 */

import { useEffect, useRef } from 'react';

interface LiveOptions {
  enabled: boolean;
  /** Current assistant state so the loop knows when to capture / barge in. */
  getState: () => { speaking: boolean; processing: boolean };
  /** A finished user utterance (audio) is ready for transcription. */
  onUtterance: (blob: Blob, mimeType: string) => void;
  /** User started talking while JARVIS was speaking — interrupt him. */
  onBargeIn: () => void;
  /** Listening indicator changes (user is actively speaking). */
  onListeningChange?: (listening: boolean) => void;
  /** Microphone could not be opened. */
  onError?: (err: any) => void;
}

// VAD tuning (energy / RMS based).
const SPEECH_TH = 0.018; // RMS above this = speech
const SILENCE_HOLD = 750; // ms of silence that ends an utterance
const MIN_SPEECH = 250; // ms — ignore shorter blips
const FALSE_START = 1800; // ms — discard if no real speech materialised
const MAX_UTTER = 15000; // ms — hard cap per utterance

export function useLiveConversation(opts: LiveOptions) {
  // Keep latest callbacks/state without restarting the audio graph each render.
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (!opts.enabled) return;
    let cancelled = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let recorder: MediaRecorder | null = null;
    let chunks: Blob[] = [];
    let capturing = false;
    let hadSpeech = false;
    let speechStart = 0;
    let lastVoice = 0;
    let mimeType = '';

    const startCapture = () => {
      chunks = [];
      const cand = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4'];
      mimeType = cand.find((t) => MediaRecorder.isTypeSupported(t)) || '';
      try {
        recorder = new MediaRecorder(stream!, mimeType ? { mimeType } : undefined);
      } catch {
        recorder = new MediaRecorder(stream!);
      }
      recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const type = recorder?.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type });
        if (hadSpeech && blob.size > 1200) optsRef.current.onUtterance(blob, type);
      };
      recorder.start();
      capturing = true;
      hadSpeech = false;
      speechStart = performance.now();
      lastVoice = speechStart;
      optsRef.current.onListeningChange?.(true);
    };

    const finishCapture = (discard = false) => {
      if (recorder && recorder.state !== 'inactive') {
        if (discard) recorder.onstop = null;
        recorder.stop();
      }
      capturing = false;
      optsRef.current.onListeningChange?.(false);
    };

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch (err) {
        optsRef.current.onError?.(err);
        return;
      }
      if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const data = new Float32Array(analyser.fftSize);

      const loop = () => {
        if (cancelled) return;
        analyser.getFloatTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
        const rms = Math.sqrt(sum / data.length);
        const now = performance.now();
        const { speaking, processing } = optsRef.current.getState();

        if (rms > SPEECH_TH) {
          lastVoice = now;
          if (!capturing) {
            if (speaking) optsRef.current.onBargeIn(); // interrupt JARVIS
            if (!processing) startCapture(); // don't capture while busy
          }
          if (capturing && now - speechStart > MIN_SPEECH) hadSpeech = true;
        } else if (capturing) {
          if (hadSpeech && now - lastVoice > SILENCE_HOLD) finishCapture();
          else if (!hadSpeech && now - speechStart > FALSE_START) finishCapture(true);
        }
        if (capturing && now - speechStart > MAX_UTTER) finishCapture();

        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    };

    start();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      try { if (recorder && recorder.state !== 'inactive') { recorder.onstop = null; recorder.stop(); } } catch {}
      try { stream?.getTracks().forEach((t) => t.stop()); } catch {}
      try { ctx?.close(); } catch {}
      optsRef.current.onListeningChange?.(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.enabled]);
}
