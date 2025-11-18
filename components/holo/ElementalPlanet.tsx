"use client";

import React, { useRef, useMemo } from "react";
import { Mesh, ShaderMaterial, Color, AdditiveBlending, Vector3 } from "three";
import { useFrame } from "@react-three/fiber";
import { type Element, ELEMENT_COLORS } from "@/lib/planets";

interface ElementalPlanetProps {
  element: Element;
  position: Vector3;
  size?: number;
  glowIntensity?: number;
}

export default function ElementalPlanet({ 
  element, 
  position, 
  size = 8, 
  glowIntensity = 1.5 
}: ElementalPlanetProps) {
  const planetRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);
  
  // Element-specific colors and properties
  const elementConfig = useMemo(() => {
    switch (element) {
      case 'heart':
        return {
          color: '#FC54AF',
          glowColor: '#FFB8E6',
          emissive: '#FF77AA',
          shader: 'heart',
        };
      case 'water':
        return {
          color: '#38B6FF',
          glowColor: '#8BDDFF',
          emissive: '#2299DD',
          shader: 'water',
        };
      case 'lightning':
        return {
          color: '#F2EF1D',
          glowColor: '#FFF966',
          emissive: '#DDCC00',
          shader: 'lightning',
        };
      case 'darkness':
        return {
          color: '#1a0033',
          glowColor: '#6B2C91',
          emissive: '#330055',
          shader: 'darkness',
        };
      default:
        return {
          color: '#666666',
          glowColor: '#AAAAAA',
          emissive: '#444444',
          shader: 'default',
        };
    }
  }, [element]);

  // Elemental planet shader material
  const planetMaterial = useMemo(() => {
    const material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorCore: { value: new Color(elementConfig.color) },
        uColorGlow: { value: new Color(elementConfig.glowColor) },
        uColorEmissive: { value: new Color(elementConfig.emissive) },
        uElement: { value: element === 'heart' ? 0 : element === 'water' ? 1 : element === 'lightning' ? 2 : element === 'darkness' ? 3 : 4 },
        uScale: { value: 2.0 },
        uIntensity: { value: glowIntensity },
      },
      vertexShader: `
        uniform float uTime;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec2 vUv;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          vViewDir = normalize(cameraPosition - vWorldPosition);
          vUv = uv;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColorCore;
        uniform vec3 uColorGlow;
        uniform vec3 uColorEmissive;
        uniform float uElement;
        uniform float uScale;
        uniform float uIntensity;
        
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec2 vUv;

        // Noise functions
        float hash(vec3 p) {
          return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
        }

        float noise(vec3 x) {
          vec3 i = floor(x);
          vec3 f = fract(x);
          float n000 = hash(i + vec3(0.0, 0.0, 0.0));
          float n100 = hash(i + vec3(1.0, 0.0, 0.0));
          float n010 = hash(i + vec3(0.0, 1.0, 0.0));
          float n110 = hash(i + vec3(1.0, 1.0, 0.0));
          float n001 = hash(i + vec3(0.0, 0.0, 1.0));
          float n101 = hash(i + vec3(1.0, 0.0, 1.0));
          float n011 = hash(i + vec3(0.0, 1.0, 1.0));
          float n111 = hash(i + vec3(1.0, 1.0, 1.0));
          
          vec3 u = f * f * (3.0 - 2.0 * f);
          float nx00 = mix(n000, n100, u.x);
          float nx10 = mix(n010, n110, u.x);
          float nx01 = mix(n001, n101, u.x);
          float nx11 = mix(n011, n111, u.x);
          float nxy0 = mix(nx00, nx10, u.y);
          float nxy1 = mix(nx01, nx11, u.y);
          return mix(nxy0, nxy1, u.z);
        }

        float fbm(vec3 p) {
          float v = 0.0;
          float a = 0.5;
          for(int i = 0; i < 4; i++) {
            v += a * noise(p);
            p *= 2.0;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec3 N = normalize(vNormal);
          vec3 V = normalize(vViewDir);
          
          // Animated domain
          vec3 P = vWorldPosition * uScale + vec3(0.0, 0.0, uTime * 0.1);
          
          // Element-specific patterns
          float pattern = 1.0;
          if (uElement < 0.5) { // heart
            pattern = fbm(P + vec3(sin(uTime * 0.8), cos(uTime * 0.6), 0.0));
          } else if (uElement < 1.5) { // water
            pattern = fbm(P + vec3(sin(uTime * 1.2) * 0.5, 0.0, cos(uTime * 0.9) * 0.5));
          } else if (uElement < 2.5) { // lightning
            float bolt = sin(P.x * 10.0 + uTime * 3.0) * sin(P.y * 8.0 + uTime * 2.5);
            pattern = fbm(P) + bolt * 0.3;
          } else { // darkness
            pattern = 1.0 - fbm(P * 0.8);
          }
          
          // Rim lighting
          float fresnel = pow(1.0 - abs(dot(N, V)), 2.0);
          
          // Color mixing
          vec3 baseColor = mix(uColorCore, uColorGlow, pattern);
          vec3 finalColor = baseColor + uColorEmissive * fresnel * uIntensity;
          
          // Emissive boost
          finalColor *= (1.0 + uIntensity * 0.5);
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      transparent: false,
      depthWrite: true,
    });
    
    return material;
  }, [elementConfig, element, glowIntensity]);

  // Animation loop
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // Update shader time
    if (planetMaterial.uniforms) {
      planetMaterial.uniforms.uTime.value = time;
    }
    
    // Gentle rotation
    if (planetRef.current) {
      planetRef.current.rotation.y += 0.01;
      planetRef.current.rotation.x += 0.005;
    }
    
    // Gentle glow pulsing
    if (glowRef.current) {
      const pulse = 0.8 + 0.2 * Math.sin(time * 1.5);
      glowRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={position}>
      {/* Core planet */}
      <mesh ref={planetRef}>
        <sphereGeometry args={[size, 64, 64]} />
        <primitive attach="material" object={planetMaterial} />
      </mesh>
      
      {/* Atmospheric glow */}
      <mesh ref={glowRef} renderOrder={-1}>
        <sphereGeometry args={[size * 1.2, 32, 32]} />
        <meshBasicMaterial
          color={elementConfig.glowColor}
          transparent
          opacity={0.3}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      
      {/* Outer glow */}
      <mesh renderOrder={-2}>
        <sphereGeometry args={[size * 1.5, 24, 24]} />
        <meshBasicMaterial
          color={elementConfig.glowColor}
          transparent
          opacity={0.1}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}