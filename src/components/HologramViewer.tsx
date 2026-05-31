/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * JARVIS holographic 3D viewer — renders a rotatable, Iron-Man-style hologram of
 * an electronic component from a simple spec, with floating pin labels.
 * Procedural low-poly models keep it fast even on software WebGL (no GPU).
 * Drag to rotate, scroll to zoom.
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export interface HologramSpec {
  type: string;
  label: string;
  bodyColor?: string;
  pins?: number;
  bands?: string[];
  pinLabels?: string[];
  description?: string;
}

interface Props {
  spec: HologramSpec;
  onClose: () => void;
}

const EDGE_COLOR = 0x67e8f9; // cyan-300
const LEAD_COLOR = 0xcbd5e1; // silver leads

interface LeadAnchor { pos: THREE.Vector3; name: string; }

function bodyMaterial(color: THREE.ColorRepresentation, opacity = 0.6) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(color).multiplyScalar(0.3),
    metalness: 0.35,
    roughness: 0.45,
    transparent: true,
    opacity,
  });
}

function withEdges(mesh: THREE.Mesh): THREE.Mesh {
  const edges = new THREE.EdgesGeometry(mesh.geometry, 25);
  const line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: EDGE_COLOR, transparent: true, opacity: 0.85 })
  );
  mesh.add(line);
  return mesh;
}

const leadMat = () => new THREE.MeshStandardMaterial({ color: LEAD_COLOR, metalness: 0.8, roughness: 0.3 });

// Vertical lead (pin pointing down). Returns mesh; tip is at the bottom.
function vLead(x: number, z = 0, length = 0.9, radius = 0.035) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 8), leadMat());
  m.position.set(x, -0.5 - length / 2 + 0.1, z);
  return m;
}
// Horizontal lead (pointing along x).
function hLead(x: number, length = 0.7, radius = 0.035) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 8), leadMat());
  m.rotation.z = Math.PI / 2;
  m.position.set(x, 0, 0);
  return m;
}

function buildModel(spec: HologramSpec): { group: THREE.Group; leads: LeadAnchor[] } {
  const g = new THREE.Group();
  const leads: LeadAnchor[] = [];
  const color = new THREE.Color(spec.bodyColor || '#64748b');
  const pins = Math.max(2, Math.min(spec.pins || 2, 40));
  const L = spec.pinLabels || [];
  const nm = (i: number, def: string) => L[i] || def;

  switch ((spec.type || 'generic').toLowerCase()) {
    case 'diode': {
      const body = withEdges(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.0, 20), bodyMaterial(color, 0.75)));
      body.rotation.z = Math.PI / 2;
      g.add(body);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.12, 20), bodyMaterial(0xe5e7eb, 0.95));
      band.rotation.z = Math.PI / 2;
      band.position.x = 0.32;
      g.add(band);
      g.add(hLead(-0.85)); g.add(hLead(0.85));
      leads.push({ pos: new THREE.Vector3(-1.25, 0, 0), name: nm(0, 'Анод') });
      leads.push({ pos: new THREE.Vector3(1.25, 0, 0), name: nm(1, 'Катод') });
      break;
    }
    case 'led': {
      const dome = withEdges(new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2), bodyMaterial(color, 0.5)));
      dome.position.y = 0.2; g.add(dome);
      g.add(withEdges(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 20), bodyMaterial(color, 0.55))));
      g.add(vLead(-0.15, 0, 1.0)); g.add(vLead(0.15, 0, 1.3));
      leads.push({ pos: new THREE.Vector3(-0.15, -1.45, 0), name: nm(0, 'Катод') });
      leads.push({ pos: new THREE.Vector3(0.15, -1.75, 0), name: nm(1, 'Анод') });
      break;
    }
    case 'resistor': {
      const body = withEdges(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.0, 20), bodyMaterial(spec.bodyColor || '#c9a36a', 0.8)));
      body.rotation.z = Math.PI / 2; g.add(body);
      const bands = spec.bands && spec.bands.length ? spec.bands : ['#5b3a1a', '#000000', '#a8431f', '#d4af37'];
      bands.slice(0, 5).forEach((c, i) => {
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.08, 20), bodyMaterial(c, 0.95));
        ring.rotation.z = Math.PI / 2; ring.position.x = -0.3 + i * 0.16; g.add(ring);
      });
      g.add(hLead(-0.85)); g.add(hLead(0.85));
      leads.push({ pos: new THREE.Vector3(-1.25, 0, 0), name: nm(0, 'Вивід 1') });
      leads.push({ pos: new THREE.Vector3(1.25, 0, 0), name: nm(1, 'Вивід 2') });
      break;
    }
    case 'electrolytic':
    case 'capacitor': {
      const isElectro = (spec.type || '').toLowerCase() === 'electrolytic';
      const body = withEdges(new THREE.Mesh(
        isElectro ? new THREE.CylinderGeometry(0.35, 0.35, 1.1, 22) : new THREE.SphereGeometry(0.42, 18, 14),
        bodyMaterial(color, 0.7)
      ));
      if (!isElectro) body.scale.set(1, 0.7, 0.5);
      g.add(body);
      if (isElectro) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 0.36), bodyMaterial(0xe5e7eb, 0.9));
        stripe.position.set(0.33, 0, 0); g.add(stripe);
      }
      g.add(vLead(-0.12, 0, 1.0)); g.add(vLead(0.12, 0, 1.0));
      leads.push({ pos: new THREE.Vector3(-0.12, -1.15, 0), name: nm(0, isElectro ? '+' : 'Вивід 1') });
      leads.push({ pos: new THREE.Vector3(0.12, -1.15, 0), name: nm(1, isElectro ? '−' : 'Вивід 2') });
      break;
    }
    case 'transistor': {
      g.add(withEdges(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.6, 22, 1, false, 0, Math.PI), bodyMaterial(color, 0.75))));
      g.add(withEdges(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.05), bodyMaterial(color, 0.75))));
      const xs = [-0.22, 0, 0.22];
      const defs = ['Е', 'Б', 'К'];
      xs.forEach((x, i) => {
        g.add(vLead(x, 0, 0.9));
        leads.push({ pos: new THREE.Vector3(x, -1.35, 0), name: nm(i, defs[i]) });
      });
      break;
    }
    case 'ic': {
      g.add(withEdges(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 0.7), bodyMaterial(spec.bodyColor || '#0f172a', 0.85))));
      const notch = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.36, 12), bodyMaterial(0x334155, 0.9));
      notch.rotation.x = Math.PI / 2; notch.position.set(-0.6, 0.18, 0); g.add(notch);
      const perSide = Math.max(2, Math.ceil(pins / 2));
      const pinMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.85, roughness: 0.25 });
      let idx = 0;
      for (let side = 0; side < 2; side++) {
        const z = side === 0 ? 0.42 : -0.42;
        for (let i = 0; i < perSide; i++) {
          const px = -0.6 + (i * 1.2) / Math.max(1, perSide - 1);
          const pin = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.3, 0.07), pinMat);
          pin.position.set(px, -0.28, z); g.add(pin);
          if (L[idx]) leads.push({ pos: new THREE.Vector3(px, -0.55, z * 1.25), name: L[idx] });
          idx++;
        }
      }
      break;
    }
    case 'board': {
      g.add(withEdges(new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 1.3), bodyMaterial(spec.bodyColor || '#0f5132', 0.8))));
      const pinMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.9, roughness: 0.2 });
      const n = Math.min(pins, 20);
      for (let i = 0; i < n; i++) {
        const px = -0.9 + (i * 1.8) / Math.max(1, n - 1);
        const pin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.06), pinMat);
        pin.position.set(px, 0.15, -0.55); g.add(pin);
        if (L[i] && n <= 12) leads.push({ pos: new THREE.Vector3(px, 0.45, -0.55), name: L[i] });
      }
      const chip = withEdges(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), bodyMaterial(0x111827, 0.9)));
      chip.position.y = 0.1; g.add(chip);
      break;
    }
    case 'button': {
      g.add(withEdges(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.8), bodyMaterial(spec.bodyColor || '#1f2937', 0.8))));
      const cap = withEdges(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.25, 18), bodyMaterial(0x9ca3af, 0.85)));
      cap.position.y = 0.25; g.add(cap);
      [-0.3, 0.3].forEach((x) => [-0.3, 0.3].forEach((z) => {
        const leg = vLead(x, z, 0.5); g.add(leg);
      }));
      break;
    }
    case 'potentiometer': {
      g.add(withEdges(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8), bodyMaterial(spec.bodyColor || '#1e3a8a', 0.8))));
      const shaft = withEdges(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 16), bodyMaterial(0x9ca3af, 0.9)));
      shaft.position.y = 0.55; g.add(shaft);
      [-0.25, 0, 0.25].forEach((x, i) => {
        g.add(vLead(x, 0, 0.7));
        leads.push({ pos: new THREE.Vector3(x, -1.15, 0), name: nm(i, `${i + 1}`) });
      });
      break;
    }
    default: {
      g.add(withEdges(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.6), bodyMaterial(color, 0.6))));
      for (let i = 0; i < pins; i++) {
        const px = -0.3 + (i * 0.6) / Math.max(1, pins - 1);
        g.add(vLead(px, 0, 0.8));
        if (pins <= 8) leads.push({ pos: new THREE.Vector3(px, -1.25, 0), name: nm(i, `${i + 1}`) });
      }
    }
  }
  return { group: g, leads };
}

function makeLabel(text: string): CSS2DObject {
  const div = document.createElement('div');
  div.textContent = text;
  div.style.cssText =
    'color:#a5f3fc;font:bold 9px ui-monospace,monospace;background:rgba(2,6,23,0.78);' +
    'padding:1px 5px;border:1px solid rgba(34,211,238,0.45);border-radius:4px;white-space:nowrap;' +
    'box-shadow:0 0 6px rgba(34,211,238,0.3);transform:translateY(-2px);';
  return new CSS2DObject(div);
}

export default function HologramViewer({ spec, onClose }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglFailed, setWebglFailed] = React.useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 480;
    const height = mount.clientHeight || 360;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.04);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(3, 2.2, 4);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      setWebglFailed(true);
      return;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mount.appendChild(renderer.domElement);

    // CSS2D overlay for crisp floating pin labels.
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(width, height);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.left = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    mount.appendChild(labelRenderer.domElement);

    scene.add(new THREE.AmbientLight(0x88ccff, 0.7));
    const dir = new THREE.DirectionalLight(0x22d3ee, 1.3);
    dir.position.set(5, 8, 5);
    scene.add(dir);
    const fill = new THREE.PointLight(0x0891b2, 1.0, 60);
    fill.position.set(-5, 3, -5);
    scene.add(fill);

    const grid = new THREE.PolarGridHelper(3, 16, 6, 64, 0x0e7490, 0x155e75);
    grid.position.y = -1.3;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    scene.add(grid);

    const { group: model, leads } = buildModel(spec);
    scene.add(model);

    // Attach pin labels (cap to avoid clutter).
    if (leads.length <= 12) {
      for (const l of leads) {
        const label = makeLabel(l.name);
        label.position.copy(l.pos);
        scene.add(label);
      }
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.6;
    controls.enablePan = false;
    controls.minDistance = 2;
    controls.maxDistance = 9;

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth || 480;
      const h = mount.clientHeight || 360;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      labelRenderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      scene.traverse((o) => {
        const any = o as any;
        if (any.geometry) any.geometry.dispose();
        if (any.material) {
          const mats = Array.isArray(any.material) ? any.material : [any.material];
          mats.forEach((m: THREE.Material) => m.dispose());
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      if (labelRenderer.domElement.parentNode === mount) mount.removeChild(labelRenderer.domElement);
    };
  }, [spec]);

  return (
    <div className="relative w-full rounded-lg border border-cyan-700/50 bg-slate-950/90 overflow-hidden shadow-[0_0_30px_rgba(34,211,238,0.15)]">
      <div
        className="absolute inset-0 pointer-events-none z-10 opacity-[0.07]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, #22d3ee 0px, #22d3ee 1px, transparent 1px, transparent 3px)' }}
      />
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-cyan-900/50 bg-slate-900/80 relative z-20">
        <span className="text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-widest flex items-center gap-1.5">
          ◈ ГОЛОГРАМА: {spec.label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-cyan-600 font-mono hidden sm:block">тягни — обертати • колесо — масштаб</span>
          <button
            onClick={onClose}
            className="text-[10px] text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-800 rounded px-1.5 py-0.5 font-mono transition"
          >
            ✕
          </button>
        </div>
      </div>
      <div ref={mountRef} className="w-full h-[340px] relative z-0 flex items-center justify-center">
        {webglFailed && (
          <p className="text-[11px] text-amber-400 font-mono px-4 text-center">
            3D-рендер недоступний у цьому середовищі (немає WebGL). Опис деталі — нижче.
          </p>
        )}
      </div>
      {spec.description && (
        <div className="px-3 py-1.5 border-t border-cyan-900/50 bg-slate-900/80 text-[10px] text-slate-300 font-sans relative z-20 leading-snug">
          {spec.description}
        </div>
      )}
    </div>
  );
}
