"use client";

import React, { useRef, useMemo } from "react";
import { Mesh, ShaderMaterial, Color } from "three";
import { createHeartGeometry } from "../../lib/heartGeometry";
import { useFrame } from "@react-three/fiber";

export default function HeartPlanet() {
  const meshRef = useRef<Mesh>(null);
  // Planet size baseline (used to scale geometry & glows)
  const planetRadius = 2.0;

  // Create heart geometry
  const heartGeometry = useMemo(() => {
    return createHeartGeometry(planetRadius * 2, 64, {
      // Exaggerate heart silhouette more strongly
      heartness: 4.2,
      // Slimmer along Z to accent the heart profile
      thicknessMultiplier: 0.75,
    });
  }, [planetRadius]);

  // Sun-like emissive shader with animated plasma granulation
  const planetMaterial = useMemo(() => {
    const material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        // Sun-like color ramp (deep orange -> hot yellow -> near-white core)
        uColorCool: { value: new Color('#7a2a00') },   // deep red-orange
        uColorMid:  { value: new Color('#ff6a00') },   // orange
        uColorHot:  { value: new Color('#ffd166') },   // warm yellow
        uColorCore: { value: new Color('#fff6e0') },   // near-white core
        // Detail controls
        uScale: { value: 1.45 },
        uDetail: { value: 3.3 },
        uGranularity: { value: 7.0 },
        uEmissiveBoost: { value: 2.2 },
        uRimBoost: { value: 0.6 },
        // Bump detail strength
        uNormalStrength: { value: 0.55 },
      },
      vertexShader: `
        uniform float uTime;
        varying vec3 vWorldPosition;
        varying vec3 vNormalW;
        varying vec3 vViewDir;
        void main(){
          vNormalW = normalize(normalMatrix * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPosition = wp.xyz;
          vViewDir = normalize(cameraPosition - vWorldPosition);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uTime;
        uniform vec3 uColorCool, uColorMid, uColorHot, uColorCore;
        uniform float uScale, uDetail, uGranularity, uEmissiveBoost, uRimBoost;
        uniform float uNormalStrength;
        varying vec3 vWorldPosition;
        varying vec3 vNormalW;
        varying vec3 vViewDir;

        // 3D value noise + fbm
        float hash3(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7, 74.7))) * 43758.5453123); }
        float noise3(vec3 x){
          vec3 i = floor(x);
          vec3 f = fract(x);
          float n000 = hash3(i + vec3(0.0,0.0,0.0));
          float n100 = hash3(i + vec3(1.0,0.0,0.0));
          float n010 = hash3(i + vec3(0.0,1.0,0.0));
          float n110 = hash3(i + vec3(1.0,1.0,0.0));
          float n001 = hash3(i + vec3(0.0,0.0,1.0));
          float n101 = hash3(i + vec3(1.0,0.0,1.0));
          float n011 = hash3(i + vec3(0.0,1.0,1.0));
          float n111 = hash3(i + vec3(1.0,1.0,1.0));
          vec3 u = f*f*(3.0-2.0*f);
          float nx00 = mix(n000, n100, u.x);
          float nx10 = mix(n010, n110, u.x);
          float nx01 = mix(n001, n101, u.x);
          float nx11 = mix(n011, n111, u.x);
          float nxy0 = mix(nx00, nx10, u.y);
          float nxy1 = mix(nx01, nx11, u.y);
          return mix(nxy0, nxy1, u.z);
        }
        float fbm3(vec3 p){
          float v = 0.0;
          float a = 0.55;
          for(int i=0;i<6;i++){
            v += a * noise3(p);
            p *= 2.0; a *= 0.5;
          }
          return v;
        }
        float ridge3(vec3 p){
          float n = fbm3(p);
          return 1.0 - abs(2.0*n - 1.0);
        }

        // cheap domain swirl: rotate around Y over time
        vec3 swirl(vec3 p, float t){
          float a = 0.6 * sin(t * 0.25) + 0.4 * sin(t * 0.73);
          float s = sin(a), c = cos(a);
          mat3 R = mat3(
            c, 0.0, s,
            0.0, 1.0, 0.0,
            -s, 0.0, c
          );
          return R * p;
        }

        vec3 ramp(float x){
          // Four-point gradient: cool -> mid -> hot -> core
          float t1 = smoothstep(0.10, 0.45, x);
          float t2 = smoothstep(0.40, 0.75, x);
          float t3 = smoothstep(0.70, 0.98, x);
          vec3 c1 = mix(uColorCool, uColorMid, t1);
          vec3 c2 = mix(uColorMid,  uColorHot, t2);
          vec3 c3 = mix(uColorHot,  uColorCore, t3);
          // Blend c1->c2->c3 by weighting
          return mix(mix(c1, c2, t2), c3, t3);
        }

        void main(){
          vec3 N = normalize(vNormalW);
          vec3 V = normalize(vViewDir);
          // Fixed key light to create a day/night terminator
          vec3 L = normalize(vec3(0.5, 0.8, 0.35));

          // domain with scale and gentle swirl
          vec3 P = swirl(vWorldPosition * uScale, uTime * 0.9);
          // layered animated fields
          float base = fbm3(P + vec3(0.0, 0.0, uTime * 0.08));
          float cells = ridge3(P * (1.5 + uDetail) - vec3(0.0, 0.0, uTime * 0.06));
          float micro = fbm3(P * (uGranularity) + vec3(uTime * 0.2, 0.0, -uTime * 0.23));
          float field = mix(base, cells, 0.55);
          field = mix(field, micro, 0.35);
          field = clamp(field, 0.0, 1.0);

          // bright spots (pseudo flares) from higher thresholded ridge
          float flares = smoothstep(0.92, 0.98, ridge3(P * 3.3 + 7.0));

          // Approximate bump mapping by perturbing the normal with noise gradient
          float e = 0.02;
          float n0 = fbm3(P);
          float nx = fbm3(P + vec3(e, 0.0, 0.0)) - n0;
          float ny = fbm3(P + vec3(0.0, e, 0.0)) - n0;
          float nz = fbm3(P + vec3(0.0, 0.0, e)) - n0;
          vec3 grad = normalize(vec3(nx, ny, nz));
          vec3 Np = normalize(N + grad * (uNormalStrength * 1.25));

          // color ramp + flare boost
          vec3 col = ramp(field);
          col += vec3(1.0) * flares * 0.45;

          // No specular for a star; apply limb darkening for a sun-like read
          float mu = clamp(dot(Np, V), 0.0, 1.0);
          float limb = 0.65 + 0.35 * pow(mu, 0.45); // brighter center, darker rim
          // Subtle day/night to keep form readable
          float dif = max(dot(Np, L), 0.0);
          float night = smoothstep(0.0, 0.55, dif);
          vec3 lit = col * (0.25 + 0.9 * night) * limb;

          // Emissive punch with very soft rim enhancement
          float fres = pow(1.0 - abs(dot(N, V)), 1.25);
          lit *= (1.0 + uEmissiveBoost * (0.55 + 0.45 * sin(uTime * 1.4)));
          lit += lit * fres * uRimBoost;

          gl_FragColor = vec4(lit, 1.0);
        }
      `,
      side: 0,
      transparent: false,
      depthWrite: true,
      depthTest: true
    });
    // Let tone mapping hit the base surface slightly for range
    return material;
  }, []);

  // Atmosphere material
  // Inner frontside glow to brighten the core towards camera
  // Removed inner glow layer to eliminate external glow perception

  // High-altitude cloud shell material (separate rotating layer for parallax)

  // Animation loop
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    
    // Update shader uniforms
    if (planetMaterial.uniforms) {
      planetMaterial.uniforms.uTime.value = time;
    }
    // no inner glow
    // no billboard uniforms
    
    if (meshRef.current) {
      // Slow rotation
      meshRef.current.rotation.y += delta * 0.12;
    }
    
    
    // removed billboard sizing
    // Ensure continuous animation in demand frameloop
    state.invalidate();
  });

  return (
    <group position={[0, 0, 0]} scale={[1.4, 1.7, 1.0]}>
      {/* Core heart with realistic shading */}
      <mesh ref={meshRef} position={[0, 0, 0]} renderOrder={1}>
        <primitive object={heartGeometry} />
        <primitive object={planetMaterial} />
      </mesh>
      {/* No external glow layers */}
      
      {/* Planetary lighting - gentle illumination */}
      <ambientLight intensity={0.15} />
      {/* Keep external lights very subtle to let emissive drive the look */}
      <pointLight position={[8, 6, 10]} color="#ffffff" intensity={0.35} distance={50} decay={0.5} />
      {/* Mild warm core lights for a hint of volumetric punch */}
      <pointLight position={[0, 0, 0]} color="#fff0d0" intensity={6.0} distance={28} decay={1.6} />
      <pointLight position={[0, 0, 2]} color="#ffd166" intensity={3.5} distance={24} decay={1.8} />
      <pointLight position={[0, 0, -2]} color="#ff9f1c" intensity={3.5} distance={24} decay={1.8} />
    </group>
  );
}
