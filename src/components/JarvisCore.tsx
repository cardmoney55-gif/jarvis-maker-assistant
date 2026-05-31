/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';

interface JarvisCoreProps {
  status: 'idle' | 'thinking' | 'scanning' | 'success' | 'error';
  isSpeaking?: boolean;
  isListening?: boolean;
  onCoreClick?: () => void;
  message?: string;
}

export default function JarvisCore({ status, isSpeaking = false, isListening = false, onCoreClick, message }: JarvisCoreProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Determine status glow & typography colors
  const getStatusColor = () => {
    switch (status) {
      case 'thinking':
        return 'text-amber-400 border-amber-500 shadow-[0_0_30px_rgba(251,191,36,0.55)]';
      case 'scanning':
        return 'text-purple-400 border-purple-500 shadow-[0_0_30px_rgba(192,132,252,0.55)]';
      case 'success':
        return 'text-emerald-400 border-emerald-500 shadow-[0_0_30px_rgba(52,211,153,0.55)]';
      case 'error':
        return 'text-rose-500 border-rose-600 shadow-[0_0_30px_rgba(239,68,68,0.55)]';
      case 'idle':
      default:
        return 'text-cyan-400 border-cyan-500 shadow-[0_0_30px_rgba(34,211,238,0.45)]';
    }
  };

  const activeColorTheme = () => {
    switch (status) {
      case 'thinking': return '#fbbf24';
      case 'scanning': return '#c084fc';
      case 'success': return '#34d399';
      case 'error': return '#ef4444';
      default: return '#22d3ee';
    }
  };

  // Canvas drawing routine for high-tech neural visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let phase = 0;

    const render = () => {
      // Clear with radial gradient overlay for depths
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = 64;

      phase += 0.05;

      // Draw outer geometric layout circles
      ctx.strokeStyle = `${activeColorTheme()}15`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 22, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, radius - 15, 0, Math.PI * 2);
      ctx.stroke();

      // Configure visual settings based on speech & listening state
      let speed = 0.03;
      let waveCount = 3;
      let maxAmplitude = 6;

      if (isSpeaking) {
        speed = 0.12;
        waveCount = 4;
        maxAmplitude = 22;
      } else if (isListening) {
        speed = 0.22;
        waveCount = 5;
        maxAmplitude = 34;
      } else if (status === 'thinking') {
        speed = 0.08;
        waveCount = 3;
        maxAmplitude = 12;
      }

      // Draw quantum orbit particles
      const particleCount = 8;
      for (let i = 0; i < particleCount; i++) {
        const offsetAngle = (i * Math.PI * 2) / particleCount + phase * (isSpeaking ? 1.5 : 0.4);
        const distance = radius + 22 + (isSpeaking ? Math.sin(phase * 2 + i) * 6 : Math.sin(phase * 0.5 + i) * 2);
        const px = cx + Math.cos(offsetAngle) * distance;
        const py = cy + Math.sin(offsetAngle) * distance;
        
        ctx.fillStyle = activeColorTheme();
        ctx.beginPath();
        let pRadius = isSpeaking ? 2.5 : 1.5;
        if (isListening && i % 2 === 0) pRadius = 4;
        ctx.arc(px, py, pRadius, 0, Math.PI * 2);
        ctx.fill();

        // Subtle glow lines connecting orbit particles to center
        ctx.strokeStyle = `${activeColorTheme()}08`;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(px, py);
        ctx.stroke();
      }

      // Draw 3D-like rotating segmented rings on canvas
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 14, 25, 10]);
      ctx.strokeStyle = `${activeColorTheme()}40`;
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 10, -phase * 0.6, Math.PI * 2 - phase * 0.6);
      ctx.stroke();

      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = `${activeColorTheme()}25`;
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 15, phase * 0.3, Math.PI * 2 + phase * 0.3);
      ctx.stroke();
      ctx.setLineDash([]); // clear dash

      // Render overlapping multi-frequency waves at the center
      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        ctx.lineWidth = w === 0 ? 2 : 1;
        
        let strokeColor = `${activeColorTheme()}90`;
        if (w === 1) strokeColor = `${activeColorTheme()}45`;
        if (w === 2) strokeColor = '#f59e0b55'; // holographic gold highlight

        ctx.strokeStyle = strokeColor;
        ctx.shadowBlur = w === 0 ? 8 : 0;
        ctx.shadowColor = activeColorTheme();

        const amplitude = maxAmplitude - (w * 3);
        const wavelength = 24 + w * 12;

        for (let x = cx - radius; x <= cx + radius; x++) {
          const dx = x - cx;
          const distFromCenter = Math.sqrt(dx * dx);
          // Bell curve to taper edges cleanly
          const taper = Math.max(0, 1 - (distFromCenter / radius));
          
          let y = cy + Math.sin(dx / wavelength + phase * (w + 1) * speed) * amplitude * taper;

          // Added chaotic pulse frequency for voice output modeling
          if (isListening) {
            y += (Math.random() - 0.5) * 5 * taper;
          }

          if (x === cx - radius) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      ctx.shadowBlur = 0; // reset shadow

      // Innermost reactive core reactor
      ctx.fillStyle = isListening ? '#f43f5e20' : `${activeColorTheme()}12`;
      ctx.strokeStyle = activeColorTheme();
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const innerCoreRad = 20 + (isSpeaking ? Math.sin(phase * 4) * 4 : isListening ? Math.sin(phase * 6) * 6 : Math.sin(phase) * 1.5);
      ctx.arc(cx, cy, innerCoreRad, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isListening ? '#ef4444' : activeColorTheme();
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [status, isSpeaking, isListening]);

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 select-none">
      <div 
        onClick={onCoreClick}
        className={`relative w-48 h-48 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-700 bg-slate-950/80 ${getStatusColor()}`}
        style={{ perspective: '800px' }}
      >
        {/* Holographic scanning overlay lines */}
        <div className="absolute inset-0 rounded-full overflow-hidden opacity-10 pointer-events-none">
          <div className="w-full h-1 bg-current animate-bounce duration-1000" />
        </div>

        {/* Dynamic Canvas representing living neural flows */}
        <canvas 
          ref={canvasRef} 
          width={192} 
          height={192} 
          className="absolute inset-x-0 inset-y-0 rounded-full w-full h-full pointer-events-none"
        />

        {/* Outer orbital rings (styled as 3D holographic segments) */}
        <div className="absolute w-40 h-40 rounded-full border border-current opacity-5 animate-pulse" />
        <div className="absolute w-32 h-32 rounded-full border border-dashed border-current opacity-10" />
      </div>

      {/* Subsystem status readouts */}
      <div className="mt-4 text-center">
        <p className="font-mono text-[10px] tracking-widest text-[#a1a1aa] uppercase">
          JARVIS Sublink Protocol
        </p>
        <p className="font-mono text-sm font-semibold tracking-wider transition-colors duration-400 mt-0.5">
          {isListening && <span className="text-red-500 animate-pulse">● JARVIS LISTENING_</span>}
          {!isListening && isSpeaking && <span className="text-cyan-400 animate-pulse">⚡ JARVIS SPEAKING_</span>}
          {!isListening && !isSpeaking && (
            <>
              {status === 'idle' && <span className="text-cyan-400">● SYSTEM ONLINE</span>}
              {status === 'thinking' && <span className="text-amber-400 animate-pulse">⚡ ANALYZING PATHWAYS...</span>}
              {status === 'scanning' && <span className="text-purple-400 animate-pulse">📷 CAPTURING TELEMETRY...</span>}
              {status === 'success' && <span className="text-emerald-400">✓ TELEMETRY LOADED</span>}
              {status === 'error' && <span className="text-rose-500 animate-bounce">⚒ COUPLING ERROR</span>}
            </>
          )}
        </p>
        {message && (
          <p className="font-sans text-xs text-slate-400 max-w-xs mt-1 italic">
            "{message}"
          </p>
        )}
      </div>
    </div>
  );
}
