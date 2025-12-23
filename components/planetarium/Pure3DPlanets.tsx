'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { debug } from '@/lib/logger';
import {
  createHologramMaterial,
  updateHologramTime,
} from '@/utils/hologramPlanetMaterial';
import {
  createSongHaloSprite,
  updateHaloAnimation,
  disposeHaloResources,
} from '@/utils/hologramHalo';
import Image from 'next/image';
import { sfx } from '@/lib/sfx';
import { triggerWarpToSong } from '@/lib/warp';
import { useAudio } from '@/app/providers/AudioProvider';
import { useUIState } from '@/lib/use-ui-state';

// ============================================
// HUD HOLOGRAM GRID CONFIGURATION (Tweakable)
// ============================================
const HUD_GRID_OPACITY = 0.12;                    // Base opacity (0.08–0.18 range)
const HUD_GRID_REPEAT = { x: 6, y: 4 };           // Texture repeat count
const HUD_PLANE_SIZE = { width: 28, height: 18 }; // World units
const HUD_PLANE_POS = { x: 0, y: 8, z: -18 };     // Position behind planets
const HUD_PLANE_ROTATION_X = -0.12;               // Slight tilt for perspective
const HUD_GRID_SCROLL_SPEED = { x: 0.005, y: 0.002 }; // Subtle drift animation

export type ElementType = 'heart' | 'water' | 'lightning' | 'darkness';

// Popup state for clicked planets
interface PlanetPopup {
  x: number;
  y: number;
  name: string;
  element: ElementType | 'center';
  slug: string;
  isSong: boolean;
  // Reference to the 3D object for position tracking
  targetObject?: THREE.Object3D;
  // Flag for element of the day - warp will trigger reward claim
  isDailyElement?: boolean;
}

export interface Pure3DPlanetsProps {
  songs: any[];
  songsByElement: Record<string, any[]>;
  zoomLevel: number;
  onPlanetSelect?: (planetId: string) => void;
  // Called when WARP button is clicked on a song planet - triggers full warp sequence
  onSongChange?: (songId: string) => void;
  quality: 'low' | 'high';
  focusElement?: ElementType | null;
  // New: focus camera on a specific song's planet (by slug/id)
  focusSongId?: string | null;
  // Element of the Day props
  glowingElement?: ElementType | null;
  glowActive?: boolean;
  hasClaimedElementOfDay?: boolean;
  isClaimingReward?: boolean;
  onDailyPlanetClick?: (element: ElementType) => Promise<any>;
}

export default function Pure3DPlanets({
  songs,
  songsByElement: propSongsByElement,
  quality,
  onPlanetSelect,
  onSongChange,
  focusElement,
  focusSongId,
  glowingElement = null,
  glowActive = false,
  hasClaimedElementOfDay = false,
  isClaimingReward = false,
  onDailyPlanetClick
}: Pure3DPlanetsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const { stopAllAudio } = useAudio();
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  // UI state (shared)
  const {
    setSelectedPlanetId,
    setFocusedPlanetId,
    setCameraMode,
    setIsUserInteracting,
  } = useUIState();
  // Track when the user is interacting so we don't snap back
  const isUserInteractingRef = useRef(false);
  // Keep references to song meshes by slug/id for camera focusing
  const songMeshMapRef = useRef<Map<string, THREE.Object3D>>(new Map());
  // Keep references to glow sprites for element planets so we can toggle visibility
  const glowSpriteMapRef = useRef<Map<string, THREE.Sprite>>(new Map());
  // Keep references to element planet sprites for hover detection
  const elementSpriteMapRef = useRef<Map<string, THREE.Sprite>>(new Map());

  // Element of Day state
  const [hoveredElement, setHoveredElement] = useState<ElementType | null>(null);
  const [isCinematic, setIsCinematic] = useState(false);

  // Planet popup state
  const [planetPopup, setPlanetPopup] = useState<PlanetPopup | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const isCinematicRef = useRef(false); // Ref version for animation loop access
  const restCameraPositionRef = useRef<THREE.Vector3 | null>(null);
  const restCameraTargetRef = useRef<THREE.Vector3 | null>(null);
  const desiredCameraPosRef = useRef<THREE.Vector3 | null>(null);
  const desiredLookAtRef = useRef<THREE.Vector3 | null>(null);
  const initialBiasDoneRef = useRef(false);

  // Track when the scene is fully built and ready for camera operations
  const [sceneReady, setSceneReady] = useState(false);
  // Track currently focused song for highlight effects
  const focusedSongSlugRef = useRef<string | null>(null);
  // Keep reference to glow sprite for focused song
  const songGlowSpriteRef = useRef<THREE.Sprite | null>(null);

  // === CAMERA FOLLOW STATE ===
  // Camera mode: 'free' = user control, 'animating' = flying to planet, 'locked' = following planet
  const cameraModeRef = useRef<'free' | 'animating' | 'locked'>('free');
  // Temporary vectors for camera follow calculations (reused to avoid allocations)
  const tmpTargetPosRef = useRef(new THREE.Vector3());
  const tmpCamOffsetRef = useRef(new THREE.Vector3());

  // Track selected planet for visual effects (glow, scale, oscillate)
  const selectedPlanetRef = useRef<THREE.Object3D | null>(null);
  const selectedPlanetBaseScaleRef = useRef<THREE.Vector3 | null>(null);
  const selectedPlanetBaseYRef = useRef<number | null>(null);
  const selectedGlowSpriteRef = useRef<THREE.Sprite | null>(null);
  // Track which element is selected (to skip y-oscillation for element of the day)
  const selectedElementIdRef = useRef<ElementType | null>(null);
  // Store popup state in a ref for animation loop access
  const planetPopupRef = useRef<PlanetPopup | null>(null);
  // Prevent double-firing warp from both onClick and onTouchEnd
  const warpTriggeredRef = useRef(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Sync popup ref with state for animation loop access
  useEffect(() => {
    planetPopupRef.current = planetPopup;
  }, [planetPopup]);

  // Sync isCinematic ref with state for animation loop access
  useEffect(() => {
    isCinematicRef.current = isCinematic;
  }, [isCinematic]);

  // Compute songsByElement from songs if not provided
  const songsByElement = React.useMemo(() => {
    if (propSongsByElement && Object.keys(propSongsByElement).length > 0) {
      return propSongsByElement;
    }
    // Build from songs array - check for 'element' or 'icon' field
    return songs.reduce((acc: Record<string, any[]>, song: any) => {
      const element = song.element || song.icon || 'heart';
      if (!acc[element]) {
        acc[element] = [];
      }
      acc[element].push(song);
      return acc;
    }, {});
  }, [songs, propSongsByElement]);

  useEffect(() => {
    if (!isClient || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 500;
    const height = container.clientHeight || 400;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 20, 40);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: quality === 'high',
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(quality === 'high' ? Math.min(window.devicePixelRatio, 2) : 1);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    // Enable pointer events on canvas for OrbitControls and click detection
    renderer.domElement.style.pointerEvents = 'auto';
    // Ensure canvas stays below popup (z-index 999999)
    renderer.domElement.style.position = 'relative';
    renderer.domElement.style.zIndex = '1';

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 6; // allow closer focus on planets
    controls.maxDistance = 100;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.1;
    controlsRef.current = controls;

    // Keep camera targets in sync with user interaction to avoid snap-back
    const onControlStart = () => {
      isUserInteractingRef.current = true;
      try { setIsUserInteracting(true); } catch {}
      // Release camera lock when user starts interacting (drag/wheel/touch)
      // They must press Warp again to re-lock the camera to a planet
      if (cameraModeRef.current === 'locked' || cameraModeRef.current === 'animating') {
        console.log('[CAMERA] User interaction detected - releasing camera lock');
        cameraModeRef.current = 'free';
        try { setCameraMode('free'); } catch {}
      }
      // While the user is moving the camera, make desired == current
      desiredCameraPosRef.current = camera.position.clone();
      desiredLookAtRef.current = controls.target.clone();
    };
    const onControlChange = () => {
      if (isUserInteractingRef.current) {
        desiredCameraPosRef.current = camera.position.clone();
        desiredLookAtRef.current = controls.target.clone();
      }
    };
    const onControlEnd = () => {
      isUserInteractingRef.current = false;
      try { setIsUserInteracting(false); } catch {}
      // Persist the position the user left the camera at
      restCameraPositionRef.current = camera.position.clone();
      restCameraTargetRef.current = controls.target.clone();
      desiredCameraPosRef.current = camera.position.clone();
      desiredLookAtRef.current = controls.target.clone();
    };
    controls.addEventListener('start', onControlStart);
    controls.addEventListener('change', onControlChange);
    controls.addEventListener('end', onControlEnd);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1.2);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(-10, -10, -10);
    scene.add(directionalLight);

    // Texture loader
    const textureLoader = new THREE.TextureLoader();

    // Create element as a sprite (opaque, not see-through)
    const createElementSprite = (texturePath: string, scale: number, position: [number, number, number], glowColor: number) => {
      const texture = textureLoader.load(texturePath);
      texture.colorSpace = THREE.SRGBColorSpace;

      // Opaque sprite - normal blending so you can't see through it
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true, // needed for alpha cutout on edges
        depthWrite: true,
        blending: THREE.NormalBlending
      });

      const sprite = new THREE.Sprite(material);
      sprite.position.set(...position);
      const baseScale = scale * 5;
      sprite.scale.set(baseScale, baseScale, 1);
      // Stash base scale for pulsing
      (sprite as any).userData = {
        ...(sprite as any).userData,
        baseScale,
      };

      return sprite;
    };

    // Create a light emission glow sprite with radial gradient
    const createLightEmissionSprite = (glowColor: number, scale: number, position: [number, number, number]) => {
      // Create radial gradient texture programmatically for soft light emission
      const canvas = document.createElement('canvas');
      canvas.width = 512; // Higher res for better quality glow
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // Convert hex color to RGB
        const r = (glowColor >> 16) & 255;
        const g = (glowColor >> 8) & 255;
        const b = glowColor & 255;

        // Create intense radial gradient for prominent light emission effect
        const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
        gradient.addColorStop(0, `rgba(255, 255, 255, 1)`);         // White-hot center
        gradient.addColorStop(0.05, `rgba(${r}, ${g}, ${b}, 1)`);   // Full color
        gradient.addColorStop(0.15, `rgba(${r}, ${g}, ${b}, 0.9)`); // Still bright
        gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.6)`);  // Mid intensity
        gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.35)`); // Falloff
        gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.15)`); // Soft outer
        gradient.addColorStop(0.85, `rgba(${r}, ${g}, ${b}, 0.05)`);// Very soft
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);      // Transparent edge

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
      }

      const glowTexture = new THREE.CanvasTexture(canvas);
      glowTexture.needsUpdate = true;

      const material = new THREE.SpriteMaterial({
        map: glowTexture,
        transparent: true,
        depthWrite: false,
        opacity: 1.0, // Full opacity for bright glow
        blending: THREE.AdditiveBlending,
      });

      const sprite = new THREE.Sprite(material);
      sprite.position.set(...position);
      // Base scale for the glow (much larger than planet for dramatic emission effect)
      const baseGlowScale = scale * 18;
      sprite.scale.set(baseGlowScale, baseGlowScale, 1);
      sprite.renderOrder = -1;
      // Store base scale for animation
      (sprite as any).userData = { baseGlowScale };
      return sprite as THREE.Sprite;
    };

    // Central Sun - positioned higher up as sprite with pink glow
    const sunY = 12;
    const sun = createElementSprite('/textures/center-planet.webp', 2.5, [0, sunY, 0], 0xff69b4);
    scene.add(sun);

    // === HOLOGRAM GRID FLOOR ===
    // Create a holographic grid floor beneath the planets
    const createHologramGridFloor = () => {
      const gridSize = 120; // World units
      const cellSize = 3; // Size of each grid cell
      const textureSize = 64;
      const lineColor = '#33e9ff';
      const lineAlpha = 0.7;

      // Create grid texture
      const canvas = document.createElement('canvas');
      canvas.width = textureSize;
      canvas.height = textureSize;
      const ctx = canvas.getContext('2d')!;

      // Transparent background
      ctx.clearRect(0, 0, textureSize, textureSize);

      // Draw grid lines (top and left edges only to avoid double lines at seams)
      ctx.strokeStyle = lineColor;

      // Soft glow outer line
      ctx.globalAlpha = lineAlpha * 0.25;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0.5, 0.5);
      ctx.lineTo(textureSize - 0.5, 0.5);
      ctx.moveTo(0.5, 0.5);
      ctx.lineTo(0.5, textureSize - 0.5);
      ctx.stroke();

      // Crisp main line
      ctx.globalAlpha = lineAlpha;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0.5, 0.5);
      ctx.lineTo(textureSize - 0.5, 0.5);
      ctx.moveTo(0.5, 0.5);
      ctx.lineTo(0.5, textureSize - 0.5);
      ctx.stroke();

      const gridTexture = new THREE.CanvasTexture(canvas);
      gridTexture.wrapS = THREE.RepeatWrapping;
      gridTexture.wrapT = THREE.RepeatWrapping;
      gridTexture.minFilter = THREE.LinearMipMapLinearFilter;
      gridTexture.magFilter = THREE.NearestFilter;
      gridTexture.generateMipmaps = true;
      gridTexture.colorSpace = THREE.SRGBColorSpace;

      // Set repeat based on grid size and cell size
      const repeatCount = Math.floor(gridSize / cellSize);
      gridTexture.repeat.set(repeatCount, repeatCount);
      gridTexture.needsUpdate = true;

      // Primary grid plane (horizontal, lying flat on XZ plane)
      const gridGeometry = new THREE.PlaneGeometry(gridSize, gridSize, 1, 1);
      const gridMaterial = new THREE.MeshBasicMaterial({
        map: gridTexture,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        color: new THREE.Color(0x33e9ff),
      });

      const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
      // Rotate to lie flat (horizontal) and position below the orbital plane
      gridMesh.rotation.x = -Math.PI / 2;
      gridMesh.position.y = -5; // Below the orbital plane
      gridMesh.renderOrder = -100;

      // Secondary fainter grid layer for depth effect
      const gridMaterial2 = new THREE.MeshBasicMaterial({
        map: gridTexture,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        color: new THREE.Color(0x29d9ff),
      });

      const gridMesh2 = new THREE.Mesh(gridGeometry.clone(), gridMaterial2);
      gridMesh2.rotation.x = -Math.PI / 2;
      gridMesh2.position.y = -5.5; // Slightly below primary grid
      gridMesh2.renderOrder = -101;

      // Create a circular fade-out gradient overlay to make grid fade at edges
      const fadeCanvas = document.createElement('canvas');
      fadeCanvas.width = 256;
      fadeCanvas.height = 256;
      const fadeCtx = fadeCanvas.getContext('2d')!;
      const fadeGradient = fadeCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
      fadeGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      fadeGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
      fadeGradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.3)');
      fadeGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      fadeCtx.fillStyle = fadeGradient;
      fadeCtx.fillRect(0, 0, 256, 256);

      const fadeTexture = new THREE.CanvasTexture(fadeCanvas);
      fadeTexture.needsUpdate = true;

      // Fade plane to mask grid edges
      const fadeMaterial = new THREE.MeshBasicMaterial({
        map: fadeTexture,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        blending: THREE.MultiplyBlending,
        side: THREE.DoubleSide,
      });

      const fadeMesh = new THREE.Mesh(new THREE.PlaneGeometry(gridSize * 1.2, gridSize * 1.2), fadeMaterial);
      fadeMesh.rotation.x = -Math.PI / 2;
      fadeMesh.position.y = -4.9;
      fadeMesh.renderOrder = -99;

      const gridGroup = new THREE.Group();
      gridGroup.add(gridMesh2);
      gridGroup.add(gridMesh);
      // Note: Multiply blending for fade doesn't work well with additive, skip fade mask

      return { group: gridGroup, texture: gridTexture };
    };

    const hologramGrid = createHologramGridFloor();
    scene.add(hologramGrid.group);

    // === HUD HOLOGRAM GRID PLANE (Vertical backdrop behind planets) ===
    // Creates a subtle holographic grid that anchors the planets visually
    const createHoloHUDPlane = () => {
      const textureSize = 256;
      const canvas = document.createElement('canvas');
      canvas.width = textureSize;
      canvas.height = textureSize;
      const ctx = canvas.getContext('2d')!;

      // Clear with transparent background
      ctx.clearRect(0, 0, textureSize, textureSize);

      // Grid line color (cyan hologram tint)
      const lineColor = 'rgba(51, 233, 255, ';

      // Draw minor grid lines (every 16px)
      ctx.strokeStyle = lineColor + '0.15)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= textureSize; i += 16) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, textureSize);
        ctx.moveTo(0, i);
        ctx.lineTo(textureSize, i);
        ctx.stroke();
      }

      // Draw major grid lines (every 64px)
      ctx.strokeStyle = lineColor + '0.35)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= textureSize; i += 64) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, textureSize);
        ctx.moveTo(0, i);
        ctx.lineTo(textureSize, i);
        ctx.stroke();
      }

      // Optional: faint diagonal scanlines
      ctx.strokeStyle = lineColor + '0.06)';
      ctx.lineWidth = 0.5;
      for (let i = -textureSize; i <= textureSize * 2; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + textureSize, textureSize);
        ctx.stroke();
      }

      // Add radial vignette fade (edges fade out)
      const gradient = ctx.createRadialGradient(
        textureSize / 2, textureSize / 2, 0,
        textureSize / 2, textureSize / 2, textureSize / 2
      );
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');      // Center: transparent
      gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0)');    // Mid: still transparent
      gradient.addColorStop(0.85, 'rgba(0, 0, 0, 0.5)'); // Start fade
      gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');      // Edge: fully dark

      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, textureSize, textureSize);
      ctx.globalCompositeOperation = 'source-over';

      // Create Three.js texture
      const hudTexture = new THREE.CanvasTexture(canvas);
      hudTexture.wrapS = THREE.RepeatWrapping;
      hudTexture.wrapT = THREE.RepeatWrapping;
      hudTexture.repeat.set(HUD_GRID_REPEAT.x, HUD_GRID_REPEAT.y);
      hudTexture.magFilter = THREE.LinearFilter;
      hudTexture.minFilter = THREE.LinearMipmapLinearFilter;
      hudTexture.generateMipmaps = true;
      hudTexture.needsUpdate = true;

      // Create plane mesh
      const hudGeometry = new THREE.PlaneGeometry(
        HUD_PLANE_SIZE.width,
        HUD_PLANE_SIZE.height,
        1, 1
      );
      const hudMaterial = new THREE.MeshBasicMaterial({
        map: hudTexture,
        transparent: true,
        opacity: HUD_GRID_OPACITY,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        color: new THREE.Color(0x33e9ff),
      });

      const hudMesh = new THREE.Mesh(hudGeometry, hudMaterial);
      hudMesh.position.set(HUD_PLANE_POS.x, HUD_PLANE_POS.y, HUD_PLANE_POS.z);
      hudMesh.rotation.x = HUD_PLANE_ROTATION_X;
      hudMesh.renderOrder = -50; // Behind planets but in front of floor grid

      return { mesh: hudMesh, texture: hudTexture, material: hudMaterial };
    };

    const holoHUD = createHoloHUDPlane();
    scene.add(holoHUD.mesh);

    // Orbiting planets evenly spaced (90 degrees apart) around the sun
    const orbitRadius = 18;
    const planets = [
      { id: 'heart', texture: '/textures/planet_heart.webp', pos: [orbitRadius, 0, 0] as [number, number, number], speed: 0.08, glow: 0xff6b9d },           // 0° - pink
      { id: 'water', texture: '/textures/planet_water.webp', pos: [0, 0, orbitRadius] as [number, number, number], speed: 0.08, glow: 0x4fc3f7 },           // 90° - blue
      { id: 'lightning', texture: '/textures/planet_lightning.webp', pos: [-orbitRadius, 0, 0] as [number, number, number], speed: 0.08, glow: 0xffeb3b },  // 180° - yellow
      { id: 'darkness', texture: '/textures/planet_darkness.webp', pos: [0, 0, -orbitRadius] as [number, number, number], speed: 0.08, glow: 0x9c27b0 }     // 270° - purple
    ];

    const orbitGroups: { group: THREE.Group; speed: number }[] = [];

    // Track all song halos for animation
    const songHaloSprites: THREE.Sprite[] = [];

    // Create song as a hologram sphere with halo
    const createSongSphere = (
      elementId: string,
      scale: number,
      position: [number, number, number],
      isReleased: boolean
    ) => {
      const geometry = new THREE.SphereGeometry(scale, 24, 24);

      // Use hologram material with element-specific preset
      // Unreleased songs get a dimmed/grey version
      const presetName = isReleased ? elementId : 'center';
      const material = createHologramMaterial(presetName, {
        alpha: isReleased ? 0.92 : 0.6,
        shimmerStrength: isReleased ? 0.15 : 0.05,
        rimStrength: isReleased ? 1.2 : 0.6,
      });

      // Dim unreleased songs
      if (!isReleased) {
        material.uniforms.uColor.value = new THREE.Color(0x666666);
        material.uniforms.uAccent.value = new THREE.Color(0x888888);
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);

      // Create halo sprite behind the planet
      const haloScale = scale * 2.5; // Halo ~2.5x the planet radius
      const halo = createSongHaloSprite(elementId, haloScale, isReleased ? 0.25 : 0.1);
      halo.position.set(...position);
      songHaloSprites.push(halo);

      // Return both mesh and halo to be added to the group
      return { mesh, halo };
    };

    // Song orbit groups for animation
    const songOrbitGroups: { group: THREE.Group; speed: number }[] = [];

    debug('Building planets with songsByElement:', songsByElement, 'songs count:', songs.length);

    planets.forEach(p => {
      const group = new THREE.Group();
      // Position group at sun's location so planets orbit around the sun
      group.position.set(0, sunY, 0);
      // Planet sprite
      const planet = createElementSprite(p.texture, 1.8, p.pos, p.glow);
      // Tag the planet sprite with its element id for raycasting
      (planet as any).userData = { elementId: p.id };
      try { elementSpriteMapRef.current.set(p.id, planet); } catch {}

      // Light emission glow sprite for element of the day (controlled by props)
      const glowSprite = createLightEmissionSprite(p.glow, 1.8, p.pos);
      // Daily element glow is visible if glowActive and it's the daily element (stays visible all day)
      const isDailyElement = glowingElement === p.id;
      console.log(`[GLOW] Planet ${p.id}: isDailyElement=${isDailyElement}, glowActive=${glowActive}, glowingElement=${glowingElement}`);
      glowSprite.visible = !!(glowActive && isDailyElement);
      try { glowSpriteMapRef.current.set(p.id, glowSprite); } catch {}

      // Add outer ring glow for extra dramatic effect (element of day only)
      if (isDailyElement) {
        const outerGlow = createLightEmissionSprite(p.glow, 2.8, p.pos); // Larger outer glow
        outerGlow.visible = !!glowActive;
        (outerGlow.material as THREE.SpriteMaterial).opacity = 0.4;
        outerGlow.renderOrder = -2;
        // Store reference for animation
        (glowSprite as any).userData.outerGlow = outerGlow;
        group.add(outerGlow);
      }

      group.add(glowSprite);
      group.add(planet);

      // Add song planets orbiting around this element
      const elementSongs = songsByElement[p.id] || [];
      debug(`Element ${p.id} has ${elementSongs.length} songs`);
      const songOrbitRadius = 10; // Distance from element planet

      if (elementSongs.length > 0) {
        // Create song orbit group centered at the element position
        const songGroup = new THREE.Group();
        // Position the song group at the element's location
        songGroup.position.set(p.pos[0], p.pos[1], p.pos[2]);

        elementSongs.forEach((song: any, idx: number) => {
          const angle = (idx / elementSongs.length) * Math.PI * 2;
          // Position relative to songGroup center (0,0,0)
          const songX = Math.cos(angle) * songOrbitRadius;
          const songZ = Math.sin(angle) * songOrbitRadius;

          const songSlug = song.slug || song.id;
          const isReleased = song.is_released !== false; // Default to released if not specified

          debug(`Adding song sphere: ${song.title} (${songSlug}) orbiting ${p.id} - ${isReleased ? 'released' : 'unreleased'}`);
          const { mesh: songSphere, halo: songHalo } = createSongSphere(p.id, 1.2, [songX, 0, songZ], isReleased);
          // Tag mesh for identification and store a reference for focusing
          try {
            (songSphere as any).userData = { slug: songSlug, element: p.id };
            songMeshMapRef.current.set(String(songSlug).toLowerCase(), songSphere);
          } catch {}
          // Add halo first (renders behind), then sphere
          songGroup.add(songHalo);
          songGroup.add(songSphere);
        });

        group.add(songGroup);
        songOrbitGroups.push({ group: songGroup, speed: 0.15 });
      }

      scene.add(group);
      orbitGroups.push({ group, speed: p.speed });
    });

    // Starfield
    const starGeometry = new THREE.BufferGeometry();
    const starPositions: number[] = [];
    for (let i = 0; i < 200; i++) {
      const seed = i * 137.508;
      starPositions.push(
        Math.sin(seed) * 150,
        Math.cos(seed * 2.3) * 150,
        Math.sin(seed * 1.7) * 150
      );
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Raycaster for click and hover detection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Element planet world positions (computed dynamically due to orbit)
    const getElementWorldPosition = (elementId: string): THREE.Vector3 | null => {
      const sprite = elementSpriteMapRef.current.get(elementId);
      if (!sprite) return null;
      const worldPos = new THREE.Vector3();
      sprite.getWorldPosition(worldPos);
      return worldPos;
    };

    // Camera target positions for cinematic focus (offset from planet position)
    const getCinematicCameraTarget = (elementPos: THREE.Vector3): { camPos: THREE.Vector3; lookAt: THREE.Vector3 } => {
      // Position camera looking at the planet from a closer distance
      const dirFromCenter = elementPos.clone().sub(new THREE.Vector3(0, sunY, 0)).normalize();
      const cameraDistance = 15; // Close enough to see the planet clearly
      const camPos = elementPos.clone().add(dirFromCenter.multiplyScalar(cameraDistance)).add(new THREE.Vector3(0, 5, 0));
      return { camPos, lookAt: elementPos.clone() };
    };

    // Hover bias: very subtle camera nudge toward hovered element
    const getHoverBias = (elementPos: THREE.Vector3, restPos: THREE.Vector3): THREE.Vector3 => {
      const dir = elementPos.clone().sub(restPos).normalize();
      const biasStrength = 2; // Very subtle - just 2 units toward the planet
      return restPos.clone().add(dir.multiplyScalar(biasStrength));
    };

    // Helper to project 3D position to screen coordinates (viewport coordinates for fixed positioning)
    const projectToScreen = (worldPos: THREE.Vector3): { x: number; y: number } => {
      const vector = worldPos.clone();
      vector.project(camera);
      const rect = container.getBoundingClientRect();
      return {
        x: rect.left + ((vector.x + 1) / 2) * rect.width,
        y: rect.top + ((-vector.y + 1) / 2) * rect.height
      };
    };

    // Element display names
    const elementNames: Record<string, string> = {
      center: 'Heartverse',
      heart: 'Heart',
      water: 'Water',
      lightning: 'Lightning',
      darkness: 'Darkness'
    };

    // Get element color for glow (used in click handler)
    const getElementColor = (element: ElementType | 'center'): string => {
      const colors: Record<string, string> = {
        center: '#FC54AF',
        heart: '#FC54AF',
        water: '#38B6FF',
        lightning: '#F2EF1D',
        darkness: '#6A4C93'
      };
      return colors[element] || '#FC54AF';
    };

    // Helper to clear previous selection effects
    const clearSelectionEffects = () => {
      // Restore previous selected planet scale and position
      if (selectedPlanetRef.current && selectedPlanetBaseScaleRef.current) {
        selectedPlanetRef.current.scale.copy(selectedPlanetBaseScaleRef.current);
      }
      if (selectedPlanetRef.current && selectedPlanetBaseYRef.current !== null) {
        selectedPlanetRef.current.position.y = selectedPlanetBaseYRef.current;
      }
      // Remove previous selection glow
      if (selectedGlowSpriteRef.current) {
        selectedGlowSpriteRef.current.parent?.remove(selectedGlowSpriteRef.current);
        try {
          const mat = selectedGlowSpriteRef.current.material as THREE.SpriteMaterial;
          if (mat?.map) mat.map.dispose();
          mat?.dispose();
        } catch {}
        selectedGlowSpriteRef.current = null;
      }
      selectedPlanetRef.current = null;
      selectedPlanetBaseScaleRef.current = null;
      selectedPlanetBaseYRef.current = null;
      selectedElementIdRef.current = null;
    };

    // Helper to set up selection effects on a planet
    const setupSelectionEffects = (obj: THREE.Object3D, glowColor: string, elementId?: ElementType) => {
      clearSelectionEffects();

      selectedPlanetRef.current = obj;
      selectedPlanetBaseScaleRef.current = obj.scale.clone();
      selectedPlanetBaseYRef.current = obj.position.y;
      selectedElementIdRef.current = elementId ?? null;

      // Create glow sprite for the selected planet
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        // Parse hex color to rgb
        const hex = glowColor.replace('#', '');
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
        gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.6)`);
        gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.3)`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
      }
      const glowTexture = new THREE.CanvasTexture(canvas);
      glowTexture.needsUpdate = true;

      const glowMaterial = new THREE.SpriteMaterial({
        map: glowTexture,
        transparent: true,
        depthWrite: false,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
      });
      const glowSprite = new THREE.Sprite(glowMaterial);
      // Scale based on object size - tighter glow around the planet
      const baseScale = Math.max(obj.scale.x, obj.scale.y, obj.scale.z);
      glowSprite.scale.set(baseScale * 1.4, baseScale * 1.4, 1);
      glowSprite.renderOrder = -1;
      glowSprite.position.copy(obj.position);
      obj.parent?.add(glowSprite);
      selectedGlowSpriteRef.current = glowSprite;
    };

    // Click handler
    const handleClick = async (event: MouseEvent) => {
      // Check if the click was on the WARP button or popup UI - if so, don't process as 3D click
      const target = event.target as HTMLElement;
      if (target.closest('.warp-button') || target.closest('[data-popup-card]')) {
        console.log('[3D Click] Ignoring click - target is popup UI element');
        return;
      }

      // Stop event from bubbling up to parent elements (prevents HUD toggle)
      event.stopPropagation();
      event.preventDefault();

      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const obj = intersects[0].object as any;
        const intersectionPoint = intersects[0].point;

        // Play click sound
        try { sfx.play('click', 0.5); } catch {}

        if (obj === sun) {
          const screenPos = projectToScreen(intersectionPoint);
          setupSelectionEffects(obj, '#FC54AF');
          setPlanetPopup({
            x: screenPos.x,
            y: screenPos.y,
            name: 'Heartverse',
            element: 'center',
            slug: 'center',
            isSong: false,
            targetObject: obj
          });
          try { setSelectedPlanetId('center'); } catch {}
          return;
        }

        // Check if this is an element planet
    const elementId = obj.userData?.elementId as ElementType | undefined;
    if (elementId) {
      // Show popup for element planet (including daily element - warp button will trigger reward claim)
      const screenPos = projectToScreen(intersectionPoint);
      setupSelectionEffects(obj, getElementColor(elementId), elementId);

          // Flag if this is the daily element planet for special warp handling
          const isDailyElement = elementId === glowingElement && !hasClaimedElementOfDay;

      setPlanetPopup({
        x: screenPos.x,
        y: screenPos.y,
        name: elementNames[elementId] || elementId,
        element: elementId,
        slug: elementId,
        isSong: false,
        targetObject: obj,
        isDailyElement // Pass this flag so warp knows to claim reward
      });
      try { setSelectedPlanetId(elementId); } catch {}
      return;
    }

        // Check for song planets
        const songSlug = obj.userData?.slug;
        const songElement = obj.userData?.element as ElementType | undefined;
    if (songSlug) {
      // Find the song title from the songs array
      const song = songs.find((s: any) => (s.slug || s.id) === songSlug);
      const songTitle = song?.title || songSlug;

          const screenPos = projectToScreen(intersectionPoint);
          setupSelectionEffects(obj, getElementColor(songElement || 'heart'));
      setPlanetPopup({
        x: screenPos.x,
        y: screenPos.y,
        name: songTitle,
        element: songElement || 'heart',
        slug: songSlug,
        isSong: true,
        targetObject: obj
      });
      try { setSelectedPlanetId(String(songSlug).toLowerCase()); } catch {}
      return;
    }

        // Fallback: check orbit groups for element click
        orbitGroups.forEach((og, idx) => {
          if (og.group.children.includes(obj)) {
            const elementId = planets[idx].id as ElementType;
            const screenPos = projectToScreen(intersectionPoint);
            setupSelectionEffects(obj, getElementColor(elementId));
            setPlanetPopup({
              x: screenPos.x,
              y: screenPos.y,
              name: elementNames[elementId] || elementId,
              element: elementId,
              slug: elementId,
              isSong: false,
              targetObject: obj
            });
          }
        });
      } else {
        // Clicked on empty space - dismiss popup and clear selection effects
        clearSelectionEffects();
        setPlanetPopup(null);
      }
    };

    // Hover handler for element planets
    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      let foundHover: ElementType | null = null;

      for (const hit of intersects) {
        const obj = hit.object as any;
        const elementId = obj.userData?.elementId as ElementType | undefined;
        if (elementId && elementId === glowingElement && !hasClaimedElementOfDay) {
          foundHover = elementId;
          break;
        }
      }

      setHoveredElement(foundHover);

      // Update cursor style
      container.style.cursor = foundHover ? 'pointer' : 'default';

      // Update desired camera position for hover bias
      if (!isCinematicRef.current && restCameraPositionRef.current && restCameraTargetRef.current) {
        if (foundHover) {
          const planetPos = getElementWorldPosition(foundHover);
          if (planetPos) {
            desiredCameraPosRef.current = getHoverBias(planetPos, restCameraPositionRef.current);
            desiredLookAtRef.current = restCameraTargetRef.current.clone();
          }
        } else {
          // Return to rest position
          desiredCameraPosRef.current = restCameraPositionRef.current.clone();
          desiredLookAtRef.current = restCameraTargetRef.current.clone();
        }
      }
    };

    const handleMouseLeave = () => {
      setHoveredElement(null);
      container.style.cursor = 'default';

      // Return camera to rest position
      if (!isCinematicRef.current && restCameraPositionRef.current && restCameraTargetRef.current) {
        desiredCameraPosRef.current = restCameraPositionRef.current.clone();
        desiredLookAtRef.current = restCameraTargetRef.current.clone();
      }
    };

    // Prevent clicks from bubbling to parent - but allow popup interactions
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // If clicking on popup UI, let the popup handle it
      if (target.closest('.warp-button') || target.closest('[data-popup-card]')) {
        console.log('[3D MouseDown] Ignoring - target is popup UI element');
        return;
      }
      event.stopPropagation();
    };

    container.addEventListener('click', handleClick);
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    // Animation loop
    let animationId: number;
    const clock = new THREE.Clock();

    // Save rest camera position after initial setup
    if (!restCameraPositionRef.current) {
      restCameraPositionRef.current = camera.position.clone();
      restCameraTargetRef.current = controls.target.clone();
      desiredCameraPosRef.current = camera.position.clone();
      desiredLookAtRef.current = controls.target.clone();
    }

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      // Drive the shared hologram planet time uniform
      updateHologramTime(elapsed);

      // Rotate sun
      sun.rotation.y = elapsed * 0.5;

      // Orbit planets around sun
      orbitGroups.forEach(og => {
        og.group.rotation.y = elapsed * og.speed;
      });

      // Orbit songs around their element planets
      songOrbitGroups.forEach(sg => {
        sg.group.rotation.y = elapsed * sg.speed;
      });

      // Animate song halo sprites (subtle pulse)
      songHaloSprites.forEach(halo => {
        updateHaloAnimation(halo, elapsed, 1.2, 0.12);
      });

      // Animate hologram grid floor
      if (hologramGrid.texture) {
        // Subtle opacity pulse on grid
        const gridPulse = 0.18 + Math.sin(elapsed * 0.8) * 0.04;
        hologramGrid.group.children.forEach((child, idx) => {
          if ((child as THREE.Mesh).material) {
            const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
            mat.opacity = idx === 0 ? gridPulse * 0.5 : gridPulse;
          }
        });

        // Slowly scroll the grid texture for scanning effect
        hologramGrid.texture.offset.y = (elapsed * 0.02) % 1;
      }

      // Animate HUD hologram grid plane (subtle drift)
      if (holoHUD.texture) {
        holoHUD.texture.offset.x += HUD_GRID_SCROLL_SPEED.x * 0.016; // ~60fps delta
        holoHUD.texture.offset.y += HUD_GRID_SCROLL_SPEED.y * 0.016;
        // Keep offsets within 0-1 range to avoid precision issues
        holoHUD.texture.offset.x %= 1;
        holoHUD.texture.offset.y %= 1;
      }

      // Prominent light emission pulse for the daily element (stays glowing all day)
      if (glowingElement) {
        const glowSprite = glowSpriteMapRef.current.get(glowingElement);
        if (glowSprite && glowSprite.material) {
          // Opacity pulse: 0.7 to 1.0 range for visible light breathing
          const opacityPulse = 0.85 + Math.sin(elapsed * 2.0) * 0.15;
          (glowSprite.material as THREE.SpriteMaterial).opacity = opacityPulse;

          // Scale pulse for dramatic "breathing" glow effect
          const baseScale = (glowSprite as any).userData?.baseGlowScale || 32;
          const scalePulse = baseScale * (1.0 + Math.sin(elapsed * 1.5) * 0.12);
          glowSprite.scale.set(scalePulse, scalePulse, 1);

          // Animate outer glow ring with inverse phase for layered effect
          const outerGlow = (glowSprite as any).userData?.outerGlow as THREE.Sprite | undefined;
          if (outerGlow && outerGlow.material) {
            const outerOpacity = 0.3 + Math.sin(elapsed * 1.2 + Math.PI) * 0.15;
            (outerGlow.material as THREE.SpriteMaterial).opacity = outerOpacity;
            const outerBaseScale = (outerGlow as any).userData?.baseGlowScale || 50;
            const outerScalePulse = outerBaseScale * (1.0 + Math.sin(elapsed * 1.0) * 0.08);
            outerGlow.scale.set(outerScalePulse, outerScalePulse, 1);
          }
        }

        // Also pulse the element planet sprite itself for extra emphasis
        const elementSprite = elementSpriteMapRef.current.get(glowingElement);
        if (elementSprite) {
          const planetBaseScale = (elementSprite as any).userData?.baseScale || 9;
          const planetPulse = planetBaseScale * (1.0 + Math.sin(elapsed * 2.5) * 0.05);
          elementSprite.scale.set(planetPulse, planetPulse, 1);
        }
      }

      // Pulse animation for the focused song glow (cyan highlight)
      if (songGlowSpriteRef.current && songGlowSpriteRef.current.material) {
        // Pulse opacity using sine wave: 0.4 to 0.7 range
        const songPulseOpacity = 0.55 + Math.sin(elapsed * 2.5) * 0.15;
        (songGlowSpriteRef.current.material as THREE.SpriteMaterial).opacity = songPulseOpacity;

        // Pulse scale slightly: 4.5 to 5.5 range
        const songPulseScale = 5.0 + Math.sin(elapsed * 1.8) * 0.5;
        songGlowSpriteRef.current.scale.set(songPulseScale, songPulseScale, 1);
      }

      // Animate selected planet: scale pulse, oscillate up/down, glow pulse
      if (selectedPlanetRef.current && selectedPlanetBaseScaleRef.current && selectedPlanetBaseYRef.current !== null) {
        const baseSc = selectedPlanetBaseScaleRef.current;
        const baseY = selectedPlanetBaseYRef.current;

        // Scale pulse: 1.0 to 1.15 range
        const scaleFactor = 1.0 + Math.sin(elapsed * 2.5) * 0.075 + 0.075; // 1.0 to 1.15
        selectedPlanetRef.current.scale.set(
          baseSc.x * scaleFactor,
          baseSc.y * scaleFactor,
          baseSc.z * scaleFactor
        );

        // Oscillate up/down: subtle bob of 0.3 units
        // Skip y-oscillation for element of the day (only glow, no movement)
        const isElementOfDay = selectedElementIdRef.current && selectedElementIdRef.current === glowingElement;
        const yOffset = isElementOfDay ? 0 : Math.sin(elapsed * 2) * 0.3;
        selectedPlanetRef.current.position.y = baseY + yOffset;

        // Also update the glow sprite position to match
        if (selectedGlowSpriteRef.current) {
          selectedGlowSpriteRef.current.position.y = baseY + yOffset;

          // Pulse glow opacity and scale
          const glowOpacity = 0.5 + Math.sin(elapsed * 3) * 0.2;
          (selectedGlowSpriteRef.current.material as THREE.SpriteMaterial).opacity = glowOpacity;

          const glowScale = baseSc.x * scaleFactor * 1.4 + Math.sin(elapsed * 2) * 0.15;
          selectedGlowSpriteRef.current.scale.set(glowScale, glowScale, 1);
        }
      }

      // Update popup position to track planet as it rotates
      // Only update if position has changed by more than 2 pixels to avoid excessive re-renders
      // which can interfere with click event handling on the WARP button
      if (planetPopupRef.current && planetPopupRef.current.targetObject) {
        const worldPos = new THREE.Vector3();
        planetPopupRef.current.targetObject.getWorldPosition(worldPos);
        const screenPos = projectToScreen(worldPos);
        const dx = Math.abs(screenPos.x - planetPopupRef.current.x);
        const dy = Math.abs(screenPos.y - planetPopupRef.current.y);
        // Only update state if position changed by more than 2 pixels
        if (dx > 2 || dy > 2) {
          setPlanetPopup(prev => prev ? { ...prev, x: screenPos.x, y: screenPos.y } : null);
        }
      }

      // === CAMERA FOLLOW LOGIC ===
      // When locked or animating to a planet, continuously update camera to track the planet as it orbits
      const isFollowingPlanet = (cameraModeRef.current === 'locked' || cameraModeRef.current === 'animating') && focusedSongSlugRef.current && !isUserInteractingRef.current;

      // Disable autoRotate when following a planet, re-enable when free
      if (isFollowingPlanet) {
        controls.autoRotate = false;
      } else if (cameraModeRef.current === 'free') {
        controls.autoRotate = true;
      }

      if (isFollowingPlanet) {
        const focusedId = focusedSongSlugRef.current!.toLowerCase();
        // Try song mesh first, then element sprite
        let targetObject: THREE.Object3D | undefined = songMeshMapRef.current.get(focusedId);
        if (!targetObject) {
          targetObject = elementSpriteMapRef.current.get(focusedId);
        }

        if (targetObject) {
          // Update world matrix to ensure we get the correct position after orbit rotations
          targetObject.updateWorldMatrix(true, false);
          // Get current world position of the focused planet
          targetObject.getWorldPosition(tmpTargetPosRef.current);

          // Compute camera offset: position behind and above the planet
          const center = new THREE.Vector3(0, 12, 0); // Sun position
          tmpCamOffsetRef.current.copy(tmpTargetPosRef.current).sub(center).normalize();
          const followDistance = 8;

          // Update desired camera position to follow the planet
          desiredCameraPosRef.current = tmpTargetPosRef.current.clone()
            .add(tmpCamOffsetRef.current.clone().multiplyScalar(followDistance))
            .add(new THREE.Vector3(0, 3, 0)); // Slightly above
          desiredLookAtRef.current = tmpTargetPosRef.current.clone();
        }
      }

      // Camera lerp for smooth easing (hover bias, cinematic focus, and planet follow)
      // Do NOT override user interaction; only lerp when the user is not actively moving the camera
      if (!isUserInteractingRef.current) {
        // Use faster lerp when locked for tight follow, slower when animating for smooth approach
        const lerpSpeed = cameraModeRef.current === 'locked' ? 0.15 :
                          cameraModeRef.current === 'animating' ? 0.05 :
                          isCinematicRef.current ? 0.04 : 0.08;
        if (desiredCameraPosRef.current && desiredLookAtRef.current) {
          camera.position.lerp(desiredCameraPosRef.current, lerpSpeed);
          controls.target.lerp(desiredLookAtRef.current, lerpSpeed);
        }
      }

      // When animating toward a planet, auto-lock once near the target
      if (cameraModeRef.current === 'animating' && desiredCameraPosRef.current) {
        const dist = camera.position.distanceTo(desiredCameraPosRef.current);
        if (dist < 0.3) {
          cameraModeRef.current = 'locked';
          try { setCameraMode('locked'); } catch {}
        }
      }

      // Initial camera bias toward daily element on scene load (first 2 seconds)
      if (!initialBiasDoneRef.current && glowingElement && elapsed > 0.5 && elapsed < 2.5) {
        // Already handled by focusElement prop, but mark as done
        initialBiasDoneRef.current = true;
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Mark scene as ready for camera operations (focusSongId effect depends on this)
    setSceneReady(true);
    debug('Scene setup complete, sceneReady = true');

    // Handle resize
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      // Reset scene ready state on cleanup
      setSceneReady(false);
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('click', handleClick);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      // Remove control listeners and dispose
      try {
        controls.removeEventListener('start', onControlStart);
        controls.removeEventListener('change', onControlChange);
        controls.removeEventListener('end', onControlEnd);
      } catch {}
      controls.dispose();
      renderer.dispose();
      rendererRef.current = null;
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      // Clear focused song glow
      try {
        if (songGlowSpriteRef.current) {
          songGlowSpriteRef.current.parent?.remove(songGlowSpriteRef.current);
          // Dispose texture and material properly
          const mat = songGlowSpriteRef.current.material as THREE.SpriteMaterial;
          if (mat?.map) mat.map.dispose();
          mat?.dispose();
          songGlowSpriteRef.current = null;
        }
        focusedSongSlugRef.current = null;
      } catch {}
      // Clear selected planet glow and refs
      try {
        if (selectedGlowSpriteRef.current) {
          selectedGlowSpriteRef.current.parent?.remove(selectedGlowSpriteRef.current);
          const mat = selectedGlowSpriteRef.current.material as THREE.SpriteMaterial;
          if (mat?.map) mat.map.dispose();
          mat?.dispose();
          selectedGlowSpriteRef.current = null;
        }
        selectedPlanetRef.current = null;
        selectedPlanetBaseScaleRef.current = null;
        selectedPlanetBaseYRef.current = null;
        selectedElementIdRef.current = null;
      } catch {}
      // Dispose hologram grid textures and materials
      try {
        if (hologramGrid.texture) hologramGrid.texture.dispose();
        hologramGrid.group.children.forEach(child => {
          const mesh = child as THREE.Mesh;
          if (mesh.material) (mesh.material as THREE.Material).dispose();
          if (mesh.geometry) mesh.geometry.dispose();
        });
      } catch {}
      // Dispose HUD hologram grid plane
      try {
        if (holoHUD.texture) holoHUD.texture.dispose();
        if (holoHUD.material) holoHUD.material.dispose();
        if (holoHUD.mesh.geometry) holoHUD.mesh.geometry.dispose();
      } catch {}
      // Clear maps on teardown
      try { songMeshMapRef.current.clear(); } catch {}
      try { glowSpriteMapRef.current.clear(); } catch {}
      try { elementSpriteMapRef.current.clear(); } catch {}
      // Dispose shared halo resources
      disposeHaloResources();
    };
  // Only rebuild when songs are first loaded (length changes from 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, quality, songs.length]);

    // Toggle glow visibility when props change without rebuilding the scene
    useEffect(() => {
      try {
        glowSpriteMapRef.current.forEach((sprite, id) => {
          // Show glow for the daily element (stays visible all day)
          const shouldGlow = !!(glowActive && glowingElement === id);
          sprite.visible = shouldGlow;
          // Also update outer glow if present
          const outerGlow = (sprite as any).userData?.outerGlow as THREE.Sprite | undefined;
          if (outerGlow) {
            outerGlow.visible = shouldGlow;
          }
        });
        console.log(`[GLOW] Props changed: glowingElement=${glowingElement}, glowActive=${glowActive}`);
      } catch {}
    }, [glowingElement, glowActive]);


  // Camera focus effect - animate camera to focus on the element of the day
  useEffect(() => {
    if (!focusElement || !cameraRef.current || !controlsRef.current) return;

    const camera = cameraRef.current;
    const controls = controlsRef.current;

    // Element planet positions (world coordinates - planets orbit at y=12, radius=18)
    const sunY = 12;
    const orbitRadius = 18;

    // Define target positions (where the element planets are)
    const elementTargets: Record<ElementType, THREE.Vector3> = {
      heart: new THREE.Vector3(orbitRadius, sunY, 0),       // +X axis
      water: new THREE.Vector3(0, sunY, orbitRadius),       // +Z axis
      lightning: new THREE.Vector3(-orbitRadius, sunY, 0),  // -X axis
      darkness: new THREE.Vector3(0, sunY, -orbitRadius),   // -Z axis
    };

    // Define optimal camera positions for viewing each element (CLOSER for focus planet effect)
    // Camera is positioned behind and above the element, looking toward the planet
    // Distance from planet is ~13 units for a close-up view of the focus planet
    const elementCameraPositions: Record<ElementType, THREE.Vector3> = {
      heart: new THREE.Vector3(28, 18, 6),        // Close behind heart planet
      water: new THREE.Vector3(6, 18, 28),        // Close behind water planet
      lightning: new THREE.Vector3(-28, 18, 6),   // Close behind lightning planet
      darkness: new THREE.Vector3(6, 18, -28),    // Close behind darkness planet
    };

    const targetPosition = elementTargets[focusElement];
    const newCameraPosition = elementCameraPositions[focusElement];

    if (!targetPosition || !newCameraPosition) return;

    debug(`Starting camera focus on ${focusElement} planet at`, targetPosition.toArray());
    debug(`Camera will move to`, newCameraPosition.toArray());

    // Animate camera to new position
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    const endTarget = targetPosition.clone();

    const duration = 2000; // 2 seconds
    const startTime = performance.now();

    const animateCamera = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);

      // Interpolate camera position
      camera.position.lerpVectors(startPosition, newCameraPosition, eased);

      // Interpolate controls target
      controls.target.lerpVectors(startTarget, endTarget, eased);
      controls.update();

      if (progress < 1) {
        requestAnimationFrame(animateCamera);
      } else {
        debug(`Camera focused on ${focusElement} planet at`, targetPosition.toArray());
      }
    };

    // Start animation after a short delay to let the scene initialize
    const timeoutId = setTimeout(() => {
      animateCamera();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [focusElement]);

  // Focus camera on a specific song's planet when requested
  // Depends on sceneReady to ensure camera/controls/meshes are available
  useEffect(() => {
    // Early exit if scene not ready or no focus target
    if (!sceneReady || !focusSongId || !cameraRef.current || !controlsRef.current) {
      debug(`focusSongId effect: early exit - sceneReady=${sceneReady}, focusSongId=${focusSongId}`);
      return;
    }

    const key = String(focusSongId).toLowerCase();
    let mesh = songMeshMapRef.current.get(key);

    if (!mesh) {
      // Try fallback: some items may use ids without dashes or with slight variations
      const alt = key.replace(/'/g, '');
      mesh = songMeshMapRef.current.get(alt);
      if (!mesh) {
        debug(`focusSongId: mesh not found for key '${key}' or alt '${alt}'. Available keys:`, Array.from(songMeshMapRef.current.keys()));
        return;
      }
    }

    const targetPos = new THREE.Vector3();
    mesh.getWorldPosition(targetPos);

    debug(`focusSongId: focusing on '${key}' at position`, targetPos.toArray());

    // Remove previous glow sprite if exists and focus changed
    if (songGlowSpriteRef.current && focusedSongSlugRef.current !== key) {
      try {
        songGlowSpriteRef.current.parent?.remove(songGlowSpriteRef.current);
        // Dispose texture and material properly
        const mat = songGlowSpriteRef.current.material as THREE.SpriteMaterial;
        if (mat.map) mat.map.dispose();
        mat.dispose();
        songGlowSpriteRef.current = null;
      } catch {}
    }

    // Add highlight glow sprite to the focused song planet
    if (sceneRef.current && mesh && focusedSongSlugRef.current !== key) {
      // Create a programmatic radial gradient glow texture
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(0, 255, 255, 1)'); // Cyan center
        gradient.addColorStop(0.3, 'rgba(0, 255, 255, 0.6)');
        gradient.addColorStop(0.6, 'rgba(0, 200, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 150, 255, 0)'); // Fade to transparent
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
      }
      const glowTexture = new THREE.CanvasTexture(canvas);
      glowTexture.needsUpdate = true;

      const glowMaterial = new THREE.SpriteMaterial({
        map: glowTexture,
        transparent: true,
        depthWrite: false,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
      });
      const glowSprite = new THREE.Sprite(glowMaterial);
      glowSprite.scale.set(5, 5, 1); // Slightly larger than song sphere (radius 1.2)
      glowSprite.renderOrder = -1;
      // Position glow at same local position as mesh (will follow orbit)
      glowSprite.position.copy(mesh.position);
      // Add to same parent group so it orbits together
      mesh.parent?.add(glowSprite);
      songGlowSpriteRef.current = glowSprite;
      focusedSongSlugRef.current = key;
      debug(`focusSongId: added glow sprite for '${key}'`);
    }

    // Compute camera end position offset from the target
    // Position camera behind and above the planet, looking at it
    const center = new THREE.Vector3(0, 12, 0); // Sun position
    const dir = targetPos.clone().sub(center).normalize();
    const distance = 8; // Closer distance for better view of the selected song planet
    const endCamPos = targetPos.clone()
      .add(dir.clone().multiplyScalar(distance))
      .add(new THREE.Vector3(0, 3, 0)); // Slightly above

    // Set the desired camera position and look-at target
    // The main animation loop will smoothly lerp to these positions
    // Set camera mode to animating while we fly toward the target
    cameraModeRef.current = 'animating';
    try { setCameraMode('animating'); } catch {}
    try { setFocusedPlanetId(key); } catch {}
    desiredCameraPosRef.current = endCamPos;
    desiredLookAtRef.current = targetPos.clone();

    // Also update the rest position so the camera stays there after animation
    restCameraPositionRef.current = endCamPos.clone();
    restCameraTargetRef.current = targetPos.clone();

    // === SET CAMERA MODE FOR FOCUS PLANET ON WARP ===
    // Start in animating mode, then transition to locked after animation completes
    cameraModeRef.current = 'animating';
    console.log('[CAMERA] Starting warp animation to planet:', key);

    // After animation time (~1.2s), switch to locked mode to follow the planet
    const lockTimeoutId = setTimeout(() => {
      // Only lock if still focused on the same planet
      if (focusedSongSlugRef.current === key && cameraModeRef.current === 'animating') {
        cameraModeRef.current = 'locked';
        console.log('[CAMERA] Animation complete - now locked to planet:', key);
      }
    }, 1200);

    debug(`focusSongId: camera will animate to`, endCamPos.toArray(), 'looking at', targetPos.toArray());

    // Cleanup glow and timeout on effect unmount or when focusSongId changes
    return () => {
      clearTimeout(lockTimeoutId);
      // Only cleanup if this specific effect is being torn down
      // (not when component is just updating)
    };
  }, [focusSongId, sceneReady]);

  // Imperative warp-to-planet used by warp button and dropdown via window event
  // This is the SINGLE entry point for all warp-to-planet operations
  const warpToPlanet = React.useCallback((planetId: string) => {
    if (!sceneReady || !cameraRef.current || !controlsRef.current) return;
    const key = String(planetId).toLowerCase();

    // Try song mesh first, then element sprite
    let targetObject: THREE.Object3D | undefined = songMeshMapRef.current.get(key);
    const isElementPlanet = !targetObject;
    if (!targetObject) {
      targetObject = elementSpriteMapRef.current.get(key);
    }
    if (!targetObject) {
      console.warn('[WARP] warpToPlanet: No object found for key:', key);
      return;
    }

    const targetPos = new THREE.Vector3();
    targetObject.getWorldPosition(targetPos);

    // Add glow if not present or focus changed (only for song planets - elements have their own glow)
    if (sceneRef.current && focusedSongSlugRef.current !== key && !isElementPlanet) {
      if (songGlowSpriteRef.current) {
        try {
          songGlowSpriteRef.current.parent?.remove(songGlowSpriteRef.current);
          const mat = songGlowSpriteRef.current.material as THREE.SpriteMaterial;
          if (mat.map) mat.map.dispose();
          mat.dispose();
        } catch {}
        songGlowSpriteRef.current = null;
      }
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, 'rgba(0, 255, 255, 1)');
        g.addColorStop(0.3, 'rgba(0, 255, 255, 0.6)');
        g.addColorStop(0.6, 'rgba(0, 200, 255, 0.3)');
        g.addColorStop(1, 'rgba(0, 150, 255, 0)');
        ctx.fillStyle = g; ctx.fillRect(0,0,128,128);
      }
      const glowTexture = new THREE.CanvasTexture(canvas); glowTexture.needsUpdate = true;
      const glowMaterial = new THREE.SpriteMaterial({ map: glowTexture, transparent: true, depthWrite: false, opacity: 0.6, blending: THREE.AdditiveBlending });
      const glowSprite = new THREE.Sprite(glowMaterial);
      glowSprite.scale.set(5, 5, 1);
      const localPos = new THREE.Vector3(); targetObject.getWorldPosition(localPos);
      if (targetObject.parent) {
        const parent = targetObject.parent; const inv = new THREE.Matrix4().copy(parent.matrixWorld).invert();
        localPos.applyMatrix4(inv);
      }
      glowSprite.position.copy(localPos);
      targetObject.parent?.add(glowSprite);
      songGlowSpriteRef.current = glowSprite;
    }

    // Update focused planet ref
    focusedSongSlugRef.current = key;

    // Compute camera end pos similar to focusSongId effect
    const center = new THREE.Vector3(0, 12, 0);
    const dir = targetPos.clone().sub(center).normalize();
    const dist = 8; const height = 3;
    const endCamPos = targetPos.clone().add(dir.multiplyScalar(dist)).add(new THREE.Vector3(0, height, 0));

    // Set camera mode to animating and update state
    cameraModeRef.current = 'animating';
    try { setCameraMode('animating'); } catch {}
    try { setFocusedPlanetId(key); } catch {}

    // Set camera targets
    desiredCameraPosRef.current = endCamPos;
    desiredLookAtRef.current = targetPos.clone();
    restCameraPositionRef.current = endCamPos.clone();
    restCameraTargetRef.current = targetPos.clone();

    console.log('[WARP] warpToPlanet:', key, isElementPlanet ? '(element)' : '(song)');
  }, [sceneReady, setCameraMode, setFocusedPlanetId]);

  // Listen for warp events fired from dropdown, warp helper, and element warps
  useEffect(() => {
    // Handler for song warps (planet:warp-to-song)
    const songHandler = (e: any) => {
      const id = e?.detail?.id;
      if (id) warpToPlanet(id);
    };
    // Handler for element warps (planet:warp)
    const elementHandler = (e: any) => {
      const element = e?.detail?.element;
      if (element) warpToPlanet(element);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('planet:warp-to-song', songHandler);
      window.addEventListener('planet:warp', elementHandler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('planet:warp-to-song', songHandler);
        window.removeEventListener('planet:warp', elementHandler);
      }
    };
  }, [warpToPlanet]);

  if (!isClient) {
    // Return empty container to prevent flash of loading text
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          minHeight: '400px',
        }}
      />
    );
  }

  // Handle warp button click - uses shared triggerWarpToSong for consistency
  const handleWarpClick = async () => {
    // Prevent double-firing from both onClick and onTouchEnd
    if (warpTriggeredRef.current) {
      console.log('[WARP] skipping - already triggered');
      return;
    }
    warpTriggeredRef.current = true;
    setTimeout(() => { warpTriggeredRef.current = false; }, 500);

    // Play channel change sound immediately before warp effect
    try { sfx.play('change-channel', 0.7); } catch {}

    // Stop ALL audio immediately - be aggressive about stopping everything
    try { stopAllAudio(); } catch {}
    // Also explicitly stop the main audio player element
    try {
      const mainAudio = document.querySelector<HTMLAudioElement>('audio[data-audio-player="1"]');
      if (mainAudio) {
        mainAudio.pause();
        mainAudio.currentTime = 0;
      }
    } catch {}
    // Stop any ambient audio
    try {
      const ambientAudio = document.querySelector<HTMLAudioElement>('audio[data-ambient="1"]');
      if (ambientAudio) {
        ambientAudio.pause();
        ambientAudio.currentTime = 0;
      }
    } catch {}
    // Stop any element audio that might be playing
    try {
      if ((window as any).__CHX_ELEMENT_AUDIO) {
        (window as any).__CHX_ELEMENT_AUDIO.pause();
        (window as any).__CHX_ELEMENT_AUDIO.currentTime = 0;
        (window as any).__CHX_ELEMENT_AUDIO = null;
      }
    } catch {}

    console.log('[WARP] trigger from planet button', { planetPopup: planetPopup ? { name: planetPopup.name, slug: planetPopup.slug, isSong: planetPopup.isSong } : null, hasOnSongChange: !!onSongChange, songsCount: songs.length });
    if (!planetPopup) {
      console.error('[WARP] ERROR: planetPopup is null - cannot trigger warp');
      warpTriggeredRef.current = false;
      return;
    }

    const { slug, name, isSong, isDailyElement: popupIsDailyElement, element } = planetPopup;
    // Re-calculate isDailyElement based on current glowingElement prop (in case API loaded after popup was created)
    const isDailyElement = !isSong && element !== 'center' && element === glowingElement && !hasClaimedElementOfDay;
    console.log('[WARP] trigger from planet button - resolved', { selectedPlanet: name, resolvedSlug: slug, isSong, element, isDailyElement, popupIsDailyElement, glowingElement });

    // Close the popup IMMEDIATELY - before anything else
    setPlanetPopup(null);

    // Clear selection effects synchronously
    if (selectedGlowSpriteRef.current) {
      selectedGlowSpriteRef.current.parent?.remove(selectedGlowSpriteRef.current);
      try {
        const mat = selectedGlowSpriteRef.current.material as THREE.SpriteMaterial;
        if (mat?.map) mat.map.dispose();
        mat?.dispose();
      } catch {}
      selectedGlowSpriteRef.current = null;
    }
    // Restore original scale/position
    if (selectedPlanetRef.current && selectedPlanetBaseScaleRef.current) {
      selectedPlanetRef.current.scale.copy(selectedPlanetBaseScaleRef.current);
    }
    if (selectedPlanetRef.current && selectedPlanetBaseYRef.current !== null) {
      selectedPlanetRef.current.position.y = selectedPlanetBaseYRef.current;
    }
    selectedPlanetRef.current = null;
    selectedPlanetBaseScaleRef.current = null;
    selectedPlanetBaseYRef.current = null;
    selectedElementIdRef.current = null;

    // Use the isSong flag set when the popup was created - this is more reliable
    // than checking against element names since it was determined at click time
    if (isSong) {
      // === START CAMERA FOCUS IMMEDIATELY FOR PLANET BUTTON WARP ===
      // This happens before onSongChange so camera starts moving right away
      const key = String(slug).toLowerCase();
      const mesh = songMeshMapRef.current.get(key);
      if (mesh && cameraRef.current && controlsRef.current) {
        // Set focused planet for camera follow
        focusedSongSlugRef.current = key;
        cameraModeRef.current = 'animating';
        console.log('[CAMERA] Planet button warp - starting animation to:', key);

        // Get current world position and compute camera target
        const targetPos = new THREE.Vector3();
        mesh.getWorldPosition(targetPos);
        const center = new THREE.Vector3(0, 12, 0); // Sun position
        const dir = targetPos.clone().sub(center).normalize();
        const distance = 8;
        const endCamPos = targetPos.clone()
          .add(dir.clone().multiplyScalar(distance))
          .add(new THREE.Vector3(0, 3, 0));

        // Set camera targets
        desiredCameraPosRef.current = endCamPos;
        desiredLookAtRef.current = targetPos.clone();
        restCameraPositionRef.current = endCamPos.clone();
        restCameraTargetRef.current = targetPos.clone();

        // Transition to locked mode after animation completes
        setTimeout(() => {
          if (focusedSongSlugRef.current === key && cameraModeRef.current === 'animating') {
            cameraModeRef.current = 'locked';
            console.log('[CAMERA] Planet button warp - now locked to:', key);
          }
        }, 1200);
      }

      // For song planets, use the unified triggerWarpToSong helper
      // This ensures consistent behavior between dropdown and planet button
      const result = triggerWarpToSong({
        songSlug: slug,
        planetName: name,
        source: 'planet-button',
        songs,
        onSongChange
      });

      if (!result.success) {
        console.error('[WARP] planet button warp failed:', result.error);
        // Fallback: try calling onSongChange directly with slug if we have it
        if (onSongChange && slug) {
          console.log('[WARP] attempting fallback with direct slug:', slug);
          onSongChange(slug);
        }
      }
    } else {
      // For element planets (including daily element and center), trigger warp visual effect AND play element audio
      // Element audio files are separate from song tracks with specific filenames:
      // darkness.MP3, heart.MP3, LIGHTNING.MP3, WATER.MP3, center.MP3
      const elementAudioPaths: Record<string, string> = {
        darkness: '/tracks/darkness.MP3',
        heart: '/tracks/heart.MP3',
        lightning: '/tracks/LIGHTNING.MP3',
        water: '/tracks/WATER.MP3',
        center: '/tracks/center.MP3'
      };
      const elementAudioPath = elementAudioPaths[slug.toLowerCase()] || `/tracks/${slug.toLowerCase()}.MP3`;
      console.log('[WARP] element planet warp', { element: slug, isDailyElement, audioPath: elementAudioPath });

      // Dispatch event for listeners - include the audio path for DashboardApp to play
      try {
        window.dispatchEvent(new CustomEvent('planet:warp', {
          detail: {
            element: slug,
            isDailyElement,
            isCenterPlanet: element === 'center',
            audioPath: elementAudioPath // Element audio file path for direct playback
          }
        }));
      } catch (e) {
        console.warn('[WARP] Could not dispatch planet:warp event:', e);
      }

      // NOTE: Do NOT call onSongChange for element planets!
      // Element planets have their own audio files (darkness.MP3, etc.) that are NOT in the tracks array.
      // The DashboardApp handles element audio playback via the planet:warp event.

      // For the daily element planet, wait for warp effect to finish before showing reward
      // Must match DashboardApp's WARP_DURATION_MS (3000ms) + buffer for visual effect to fully complete
      const WARP_DURATION_MS = 3500; // Duration to wait before showing reward (3000ms warp + 500ms buffer)
      if (isDailyElement && onDailyPlanetClick && element !== 'center') {
        console.log('[WARP] waiting for warp effect before claiming daily element reward for:', element);
        // Wait for warp effect to complete, then claim reward and show celebration
        await new Promise(resolve => setTimeout(resolve, WARP_DURATION_MS));
        console.log('[WARP] warp effect complete, now claiming reward');
        try {
          await onDailyPlanetClick(element as ElementType);
        } catch (err) {
          console.error('[WARP] Failed to claim element of day reward:', err);
        }
      } else {
        // For other element planets, also call onPlanetSelect for any additional handling
        onPlanetSelect?.(slug);
      }
    }
  };

  // Get element icon path
  const getElementIconPath = (element: ElementType | 'center'): string => {
    if (element === 'center') return '/elements/heart.webp';
    return `/elements/${element}.webp`;
  };

  // Get element color for glow
  const getElementColor = (element: ElementType | 'center'): string => {
    const colors: Record<string, string> = {
      center: '#FC54AF',
      heart: '#FC54AF',
      water: '#38B6FF',
      lightning: '#F2EF1D',
      darkness: '#6A4C93'
    };
    return colors[element] || '#FC54AF';
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
        pointerEvents: 'none', // Let clicks pass through to elements below; canvas will handle its own events
        position: 'relative'
      }}
    >
      {/* Planet Popup - rendered via portal to avoid event conflicts with canvas */}
      {planetPopup && (
        <div
          style={{
            position: 'fixed',
            left: planetPopup.x,
            top: planetPopup.y,
            transform: 'translate(-50%, -100%) translateY(-20px)',
            pointerEvents: 'none', // Container doesn't block, but children do
            zIndex: 999999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            isolation: 'isolate' // Create new stacking context
          }}
        >
          {/* Warp Button - iOS safe with onClick + onTouchEnd fallback */}
          <button
            onClick={(e) => {
              console.log('[WARP] button onClick triggered');
              e.stopPropagation();
              e.preventDefault();
              handleWarpClick();
            }}
            onPointerDown={(e) => {
              console.log('[WARP] button onPointerDown');
              e.stopPropagation();
              e.preventDefault();
            }}
            onPointerUp={(e) => {
              console.log('[WARP] button onPointerUp');
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              console.log('[WARP] button onMouseDown');
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchStart={(e) => {
              console.log('[WARP] button onTouchStart');
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              // iOS fallback: some iOS versions don't fire onClick reliably
              console.log('[WARP] button onTouchEnd - triggering warp');
              e.stopPropagation();
              e.preventDefault();
              handleWarpClick();
            }}
            className="warp-button"
            data-element={planetPopup.element}
            style={{
              background: `linear-gradient(135deg, ${getElementColor(planetPopup.element)}cc, ${getElementColor(planetPopup.element)}88)`,
              border: `2px solid ${getElementColor(planetPopup.element)}`,
              borderRadius: '24px',
              padding: '8px 24px',
              color: '#fff',
              fontWeight: 700,
              fontSize: '14px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              cursor: 'pointer',
              pointerEvents: 'auto',
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              WebkitUserSelect: 'none',
              position: 'relative',
              zIndex: 10,
              boxShadow: `
                0 0 10px ${getElementColor(planetPopup.element)}80,
                0 0 20px ${getElementColor(planetPopup.element)}60,
                0 0 30px ${getElementColor(planetPopup.element)}40,
                0 0 40px ${getElementColor(planetPopup.element)}20,
                inset 0 0 10px ${getElementColor(planetPopup.element)}40
              `,
              animation: 'warpGlow 1.5s ease-in-out infinite alternate',
              textShadow: `0 0 10px ${getElementColor(planetPopup.element)}`
            }}
          >
            WARP
          </button>

          {/* Planet Info Card */}
          <div
            data-popup-card="true"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
            style={{
              background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${getElementColor(planetPopup.element)}60`,
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              pointerEvents: 'auto',
              boxShadow: `0 4px 20px rgba(0, 0, 0, 0.5), 0 0 15px ${getElementColor(planetPopup.element)}30`
            }}
          >
            {/* Element Icon */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                overflow: 'hidden',
                boxShadow: `0 0 8px ${getElementColor(planetPopup.element)}80`,
                flexShrink: 0
              }}
            >
              <Image
                src={getElementIconPath(planetPopup.element)}
                alt={planetPopup.element}
                width={32}
                height={32}
                style={{ objectFit: 'cover' }}
              />
            </div>

            {/* Planet Name */}
            <span
              style={{
                color: '#fff',
                fontWeight: 600,
                fontSize: '14px',
                textShadow: `0 0 8px ${getElementColor(planetPopup.element)}60`,
                whiteSpace: 'nowrap'
              }}
            >
              {planetPopup.name}
            </span>
          </div>
        </div>
      )}

      {/* Global keyframes for warp button glow animation - using global style to avoid re-render issues */}
      <style jsx global>{`
        @keyframes warpGlow {
          0% {
            filter: brightness(1);
          }
          100% {
            filter: brightness(1.2);
          }
        }
        .warp-button {
          transition: transform 0.1s ease;
        }
        .warp-button:hover {
          transform: scale(1.05);
        }
        .warp-button:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  );
}
