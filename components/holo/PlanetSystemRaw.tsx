"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { usePlayerStore } from "@/store/usePlayerStore";
import { computePlanetLayout } from "@/lib/planetLayout";

type Sat = {
  id: string;
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  r: number;
  speed: number;
  a: number;
  baseRadius: number;
};

export default function PlanetSystemRaw() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const satsRef = useRef<Sat[]>([]);
  const mainRef = useRef<{ id: string | null; mesh: THREE.Mesh | null; ring: THREE.Mesh | null }>({ id: null, mesh: null, ring: null });
  const ringsRef = useRef<THREE.Group[]>([]);
  const sweepUniforms = useRef<{ uTime: { value: number } } | null>(null);

  // Build a hologram shader material (rim glow + scanlines + additive)
  function makeHoloMat(color: number) {
    const c = new THREE.Color(color);
    const uniforms = {
      uTime: { value: 0 },
      uBase: { value: new THREE.Color(c.r, c.g, c.b) },
      uIntensity: { value: 1.0 },
      uOpacity: { value: 0.9 },
    } as any;
    const vs = `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec2 vUv;
      void main(){
        vUv = uv;
        vec4 wPos = modelMatrix * vec4(position, 1.0);
        vNormal = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - wPos.xyz);
        gl_Position = projectionMatrix * viewMatrix * wPos;
      }
    `;
    const fs = `
      uniform float uTime; uniform vec3 uBase; uniform float uIntensity; uniform float uOpacity;
      varying vec3 vNormal; varying vec3 vViewDir; varying vec2 vUv;
      float gauss(float x, float m, float s){ float d=(x-m)/s; return exp(-0.5*d*d); }
      void main(){
        float ndv = clamp(dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0);
        float rim = pow(1.0 - ndv, 2.2);
        vec3 base = uBase * 0.22;
        vec3 rimCol = mix(uBase, vec3(0.65,1.0,1.0), 0.6);
        float scan = 0.08 * sin((vUv.y + uTime * 2.5) * 140.0);
        float band = gauss(vUv.x, fract(uTime * 0.08), 0.06) * 0.9 + gauss(vUv.x, fract(uTime * 0.056), 0.02) * 0.5;
        float a = clamp(0.25 + 0.55 * rim + 0.25 * band + scan, 0.0, 1.0) * uOpacity;
        vec3 col = base + rimCol * (1.2 * rim * uIntensity) + vec3(0.65,1.0,1.0) * (0.5 * band);
        gl_FragColor = vec4(col, a);
      }
    `;
    const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: vs, fragmentShader: fs, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    return mat;
  }

  // Helper to add a satellite mesh to the current system group
  function addSatLocal(id: string, radius = 0.42, r = 6.0, color: number | string = 0x38b6ff, speed = 0.25, a = Math.random() * Math.PI * 2) {
    const sys = groupRef.current; if (!sys) return;
    const seg = Math.min(80, Math.max(40, Math.floor(48 + radius * 64)));
    const g = new THREE.SphereGeometry(radius, seg, seg);
    const col = (typeof color === 'number') ? color : new THREE.Color(color as any).getHex();
    const mat = makeHoloMat(col);
    const mesh = new THREE.Mesh(g, mat);
    sys.add(mesh);
    satsRef.current.push({ id, mesh, mat, r, speed, a, baseRadius: radius });
  }

  useEffect(() => {
    const mount = mountRef.current; if (!mount) return;
    const width = mount.clientWidth || 600;
    const height = mount.clientHeight || 340;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 120);
    camera.position.set(0.2, 0.6, 20.0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const hemi = new THREE.HemisphereLight(0xbfefff, 0x0a1e24, 0.26);
    scene.add(hemi);
    const amb = new THREE.AmbientLight(0xffffff, 0.18);
    scene.add(amb);
    const dir = new THREE.DirectionalLight(0x99ffff, 0.5); dir.position.set(3, 6, 5); scene.add(dir);
    const pt1 = new THREE.PointLight(0x44ffff, 0.35); pt1.position.set(-4, 2, 4); scene.add(pt1);
    const pt2 = new THREE.PointLight(0x19e3ff, 1.1, 9); pt2.position.set(0, -1.4, 0.6); scene.add(pt2);
    const pt3 = new THREE.PointLight(0xfc54af, 0.26, 7.5); pt3.position.set(0.8, -1.0, -0.4); scene.add(pt3);

    // System group
    const sys = new THREE.Group();
    sys.position.set(0, 0.35, 0);
    sys.rotation.set(0.08, -0.04, 0);
    scene.add(sys);
    groupRef.current = sys;

    // Main planet placeholder (real one created when songs available)
    const mainGeo = new THREE.SphereGeometry(1.6, 48, 48);
    const mainMat = new THREE.MeshPhongMaterial({ color: 0x1bd3ff, emissive: 0x0a3240, shininess: 18, specular: 0x66ffff });
    const main = new THREE.Mesh(mainGeo, mainMat);
    main.visible = false;
    sys.add(main);
    mainRef.current = { id: null, mesh: main, ring: null as any };

    // (Rings will be created once layout is known)

    // Add a subtle projection sweep/scan shader in front of the system for holo polish
    try {
      const uniforms = { uTime: { value: 0 } };
      sweepUniforms.current = uniforms;
      const vs = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
      const fs = `
        uniform float uTime; varying vec2 vUv;
        float gauss(float x, float m, float s){ float d=(x-m)/s; return exp(-0.5*d*d); }
        void main(){
          float pos = fract(uTime * 0.08);
          float band = gauss(vUv.x, pos, 0.06) * 0.9 + gauss(vUv.x, pos*0.7, 0.02) * 0.5;
          float scan = 0.08 * sin((vUv.y + uTime * 2.5) * 120.0);
          float a = clamp(band * 0.16 + scan * 0.08, 0.0, 1.0);
          vec3 col = vec3(0.65, 1.0, 1.0) * a;
          gl_FragColor = vec4(col, a);
        }
      `;
      const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: vs, fragmentShader: fs, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), mat);
      plane.position.set(0, 0.35, 0.2);
      scene.add(plane);
    } catch {}

    // Initial simple satellites until songs load
    addSatLocal('s1', 0.42, 6.0, 0x38b6ff, 0.25);
    addSatLocal('s2', 0.5, 4.2, 0xf2ef1d, 0.2);
    addSatLocal('s3', 0.34, 2.8, 0xfc54af, 0.32);

    // Animate
    const reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let t = 0;
    const tick = () => {
      t += 0.016;
      const hov = hoverRef.current;
      satsRef.current.forEach(s => {
        s.a += (reduced ? 0.0 : s.speed * 0.008);
        const x = Math.cos(s.a) * s.r;
        const z = Math.sin(s.a) * s.r;
        s.mesh.position.set(x, 0, z);
        const hovered = !!hov && s.id === hov;
        const osc = hovered ? (1 + 0.06 * Math.sin(t * 3.2)) : 1;
        const targetScale = (hovered ? 1.16 : 1.0) * osc;
        const ms = s.mesh.scale;
        ms.x += (targetScale - ms.x) * 0.18;
        ms.y = ms.x; ms.z = ms.x;
        // Drive hologram shader uniforms (brightness/time)
        try {
          const u: any = (s.mesh.material as any).uniforms || s.mat.uniforms;
          if (u && u.uTime) u.uTime.value = t;
          if (u && u.uIntensity) u.uIntensity.value += (((hovered ? 1.8 : 1.0)) - u.uIntensity.value) * 0.18;
          if (u && u.uOpacity) u.uOpacity.value += (((hovered ? 1.0 : 0.85)) - u.uOpacity.value) * 0.18;
        } catch {}
      });
      // Update holo sweep shader time
      try { if (sweepUniforms.current) sweepUniforms.current.uTime.value = t; } catch {}
      if (!reduced && sys) sys.rotation.y += 0.0025;
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    // Resize
    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth || 600;
      const h = mount.clientHeight || 340;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize); ro.observe(mount);

    return () => {
      try { if (rafRef.current) cancelAnimationFrame(rafRef.current); } catch {}
      try { ro.disconnect(); } catch {}
      try { if (rendererRef.current) { rendererRef.current.dispose(); rendererRef.current.forceContextLoss?.(); } } catch {}
      try { if (mount && renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement); } catch {}
    };
  }, []);

  // Sync planets to songs from the global store for closer match to previous visuals
  const { songs, mainId, prevMainId, hoverId } = usePlayerStore((s) => ({ songs: s.songs, mainId: s.mainId, prevMainId: s.prevMainId, hoverId: s.hoverId }));
  const hoverRef = useRef<string | null>(null);
  useEffect(() => { hoverRef.current = hoverId || null; }, [hoverId]);
  // Compute layout with much larger spacing
  const layout = useMemo(() => (
    songs && songs.length ? computePlanetLayout(songs as any, { ringGap: 3.2, baseRadius: 3.6, tiltPerRing: 8, minScale: 0.7, maxScale: 1.25 }) : undefined
  ), [songs]);

  useEffect(() => {
    // Build system from songs when available
    const sys = groupRef.current; if (!sys) return;
    if (!songs || !songs.length) return;
    const focusId = mainId || songs[0]?.id;
    // Clear existing satellites
    for (const s of satsRef.current) {
      try { sys.remove(s.mesh); (s.mesh.geometry as any)?.dispose?.(); (s.mesh.material as any)?.dispose?.(); } catch {}
    }
    satsRef.current = [];
    // Clear existing rings
    for (const g of ringsRef.current) {
      try { sys.remove(g); g.clear(); } catch {}
    }
    ringsRef.current = [];

    // Build orbit ring guides per ring index using layout radii
    if (layout) {
      const ringMaxByIndex = new Map<number, { r: number; tiltDeg: number }>();
      songs.forEach((song) => {
        const id = song.id;
        const lay = (layout as any)[id];
        if (!lay) return;
        const spacingMul = 2.2;
        const r = (lay.orbitRadius ?? 4) * spacingMul;
        const prev = ringMaxByIndex.get(lay.ringIndex);
        if (!prev || r > prev.r) ringMaxByIndex.set(lay.ringIndex, { r, tiltDeg: lay.tiltDeg ?? 8 });
      });
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x19e3ff, transparent: true, opacity: 0.12, depthWrite: false });
      const indices = Array.from(ringMaxByIndex.keys()).sort((a, b) => a - b);
      for (const idx of indices) {
        const { r, tiltDeg } = ringMaxByIndex.get(idx)!;
        const g = new THREE.Group();
        g.rotation.x = -Math.PI / 2 + (tiltDeg * Math.PI / 180);
        const geom = new THREE.RingGeometry(Math.max(0, r - 0.02), r + 0.02, 128);
        const mesh = new THREE.Mesh(geom, ringMat.clone());
        g.add(mesh);
        sys.add(g);
        ringsRef.current.push(g);
      }
    }
    // Create a planet for every song (including main)
    songs.forEach((song, idx) => {
      const id = song.id;
      const lay = layout ? (layout as any)[id] : undefined;
      const spacingMul = 2.2; // space them out much more
      const rBase = lay?.orbitRadius ?? (idx % 2 ? 4.2 : 6.0);
      const r = rBase * spacingMul;
      const speed = 0.08 + (lay ? (0.016 * (lay.ringIndex ?? 0)) : 0) + (0.02 * ((idx % 5))); // slower, ring-based
      // Larger planets overall; emphasize current song slightly
      const basePlanet = (song.planet?.radius ?? 0.8);
      const radius = Math.max(0.48, basePlanet * (id === focusId ? 1.25 : 0.95));
      const color = new THREE.Color(song.planet?.color || '#38B6FF').getHex();
      const a0 = lay?.angle0 ?? (Math.random() * Math.PI * 2);
      addSatLocal(id, radius, r, color, speed, a0);
    });
    // Update main planet
    const mainEntry = songs.find(s => s.id === focusId) || songs[0];
    const main = mainRef.current.mesh;
    if (main) main.visible = false; // no separate central planet; every song has its own
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songs, mainId, layout && Object.keys(layout).join(',')]);

  // Hover behavior handled in main tick via hoverRef

  return <div ref={mountRef} className="absolute inset-0" style={{ background: "transparent" }} />;
}
