'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { debug } from '@/lib/logger';

export type ElementType = 'heart' | 'water' | 'lightning' | 'darkness';

export interface Pure3DPlanetsProps {
  songs: any[];
  songsByElement: Record<string, any[]>;
  zoomLevel: number;
  onPlanetSelect?: (planetId: string) => void;
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
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
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
  const isCinematicRef = useRef(false); // Ref version for animation loop access
  const restCameraPositionRef = useRef<THREE.Vector3 | null>(null);
  const restCameraTargetRef = useRef<THREE.Vector3 | null>(null);
  const desiredCameraPosRef = useRef<THREE.Vector3 | null>(null);
  const desiredLookAtRef = useRef<THREE.Vector3 | null>(null);
  const initialBiasDoneRef = useRef(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
    // Enable pointer events on canvas for OrbitControls and click detection
    renderer.domElement.style.pointerEvents = 'auto';

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
      sprite.scale.set(scale * 5, scale * 5, 1);

      return sprite;
    };

    const createGlowSprite = (texturePath: string, scale: number, position: [number, number, number]) => {
      const texture = textureLoader.load(texturePath);
      texture.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        color: 0xffffff,
      });
      const sprite = new THREE.Sprite(material);
      sprite.position.set(...position);
      sprite.scale.set(scale * 6.2, scale * 6.2, 1);
      sprite.renderOrder = -1;
      return sprite as THREE.Sprite;
    };

    // Central Sun - positioned higher up as sprite with pink glow
    const sunY = 12;
    const sun = createElementSprite('/textures/center-planet.webp', 2.5, [0, sunY, 0], 0xff69b4);
    scene.add(sun);

    // Orbiting planets evenly spaced (90 degrees apart) around the sun
    const orbitRadius = 18;
    const planets = [
      { id: 'heart', texture: '/textures/planet_heart.webp', pos: [orbitRadius, 0, 0] as [number, number, number], speed: 0.08, glow: 0xff6b9d },           // 0° - pink
      { id: 'water', texture: '/textures/planet_water.webp', pos: [0, 0, orbitRadius] as [number, number, number], speed: 0.08, glow: 0x4fc3f7 },           // 90° - blue
      { id: 'lightning', texture: '/textures/planet_lightning.webp', pos: [-orbitRadius, 0, 0] as [number, number, number], speed: 0.08, glow: 0xffeb3b },  // 180° - yellow
      { id: 'darkness', texture: '/textures/planet_darkness.webp', pos: [0, 0, -orbitRadius] as [number, number, number], speed: 0.08, glow: 0x9c27b0 }     // 270° - purple
    ];

    const orbitGroups: { group: THREE.Group; speed: number }[] = [];

    // Create song as a colored sphere
    const createSongSphere = (color: number, scale: number, position: [number, number, number]) => {
      const geometry = new THREE.SphereGeometry(scale, 16, 16);
      const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.3,
        metalness: 0.2,
        roughness: 0.6
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);

      return mesh;
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
      // Optional glow sprite (controlled by props)
      const glowSprite = createGlowSprite(p.texture, 1.8, p.pos);
      // Daily element glow is visible only if glowActive and it's the daily element and not claimed
      const isDailyElement = glowingElement === p.id;
      glowSprite.visible = !!(glowActive && isDailyElement && !hasClaimedElementOfDay);
      try { glowSpriteMapRef.current.set(p.id, glowSprite); } catch {}
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
          const sphereColor = isReleased ? p.glow : 0x666666; // Grey for unreleased

          debug(`Adding song sphere: ${song.title} (${songSlug}) orbiting ${p.id} - ${isReleased ? 'released' : 'unreleased'}`);
          const songSphere = createSongSphere(sphereColor, 1.2, [songX, 0, songZ]);
          // Tag mesh for identification and store a reference for focusing
          try {
            (songSphere as any).userData = { slug: songSlug, element: p.id };
            songMeshMapRef.current.set(String(songSlug).toLowerCase(), songSphere);
          } catch {}
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

    // Click handler
    const handleClick = async (event: MouseEvent) => {
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

        if (obj === sun) {
          onPlanetSelect?.('center');
          return;
        }

        // Check if this is an element planet
        const elementId = obj.userData?.elementId as ElementType | undefined;
        if (elementId) {
          // Only allow clicking the element of the day for rewards
          if (elementId === glowingElement && !hasClaimedElementOfDay && !isClaimingReward && !isCinematicRef.current && onDailyPlanetClick) {
            // Start cinematic sequence
            isCinematicRef.current = true;
            setIsCinematic(true);

            // Get planet world position
            const planetPos = getElementWorldPosition(elementId);
            if (planetPos) {
              const { camPos, lookAt } = getCinematicCameraTarget(planetPos);
              desiredCameraPosRef.current = camPos;
              desiredLookAtRef.current = lookAt;
            }

            try {
              // Call the reward claim function
              await onDailyPlanetClick(elementId);
            } catch (err) {
              console.error('Failed to claim element of day reward:', err);
            }

            // After a short beat, return camera to rest position
            setTimeout(() => {
              if (restCameraPositionRef.current && restCameraTargetRef.current) {
                desiredCameraPosRef.current = restCameraPositionRef.current.clone();
                desiredLookAtRef.current = restCameraTargetRef.current.clone();
              }
              setTimeout(() => {
                isCinematicRef.current = false;
                setIsCinematic(false);
              }, 800);
            }, 700);

            return;
          }

          // Non-daily elements: call onPlanetSelect but no reward
          onPlanetSelect?.(elementId);
          return;
        }

        // Check for song planets
        const songSlug = obj.userData?.slug;
        if (songSlug) {
          onPlanetSelect?.(songSlug);
          return;
        }

        // Fallback: check orbit groups for element click
        orbitGroups.forEach((og, idx) => {
          if (og.group.children.includes(obj)) {
            onPlanetSelect?.(planets[idx].id);
          }
        });
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

    // Prevent clicks from bubbling to parent
    const handleMouseDown = (event: MouseEvent) => {
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

      // Pulse animation for the daily element glow (only when not claimed)
      if (glowingElement && !hasClaimedElementOfDay) {
        const glowSprite = glowSpriteMapRef.current.get(glowingElement);
        if (glowSprite && glowSprite.material) {
          // Pulse opacity using sine wave: 0.3 to 0.6 range for subtle effect
          const pulseValue = 0.35 + Math.sin(elapsed * 3) * 0.15;
          (glowSprite.material as THREE.SpriteMaterial).opacity = pulseValue;

          // Pulse scale slightly: 6.0 to 6.5 range
          const scaleValue = 6.0 + Math.sin(elapsed * 2) * 0.3;
          glowSprite.scale.set(scaleValue, scaleValue, 1);
        }
      }

      // Camera lerp for smooth easing (hover bias and cinematic focus)
      // Do NOT override user interaction; only lerp when the user is not actively moving the camera
      if (!isUserInteractingRef.current) {
        const lerpSpeed = isCinematicRef.current ? 0.04 : 0.08; // Slower during cinematic for dramatic effect
        if (desiredCameraPosRef.current && desiredLookAtRef.current) {
          camera.position.lerp(desiredCameraPosRef.current, lerpSpeed);
          controls.target.lerp(desiredLookAtRef.current, lerpSpeed);
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
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      // Clear maps on teardown
      try { songMeshMapRef.current.clear(); } catch {}
      try { glowSpriteMapRef.current.clear(); } catch {}
      try { elementSpriteMapRef.current.clear(); } catch {}
    };
  // Only rebuild when songs are first loaded (length changes from 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, quality, songs.length]);

  // Toggle glow visibility when props change without rebuilding the scene
  useEffect(() => {
    try {
      glowSpriteMapRef.current.forEach((sprite, id) => {
        // Only show glow for the daily element when not claimed
        sprite.visible = !!(glowActive && glowingElement === id && !hasClaimedElementOfDay);
      });
    } catch {}
  }, [glowingElement, glowActive, hasClaimedElementOfDay]);

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
  useEffect(() => {
    if (!focusSongId || !cameraRef.current || !controlsRef.current) return;

    const key = String(focusSongId).toLowerCase();
    let mesh = songMeshMapRef.current.get(key);

    if (!mesh) {
      // Try fallback: some items may use ids without dashes or with slight variations
      const alt = key.replace(/'/g, '');
      mesh = songMeshMapRef.current.get(alt);
      if (!mesh) {
        debug(`focusSongId: mesh not found for key '${key}' or alt '${alt}'`);
        return;
      }
    }

    const targetPos = new THREE.Vector3();
    mesh.getWorldPosition(targetPos);

    debug(`focusSongId: focusing on '${key}' at position`, targetPos.toArray());

    // Compute camera end position offset from the target
    // Position camera behind and above the planet, looking at it
    const center = new THREE.Vector3(0, 12, 0); // Sun position
    const dir = targetPos.clone().sub(center).normalize();
    const distance = 10; // Distance from the song planet
    const endCamPos = targetPos.clone()
      .add(dir.clone().multiplyScalar(distance))
      .add(new THREE.Vector3(0, 4, 0)); // Slightly above

    // Set the desired camera position and look-at target
    // The main animation loop will smoothly lerp to these positions
    desiredCameraPosRef.current = endCamPos;
    desiredLookAtRef.current = targetPos.clone();

    // Also update the rest position so the camera stays there after animation
    restCameraPositionRef.current = endCamPos.clone();
    restCameraTargetRef.current = targetPos.clone();
  }, [focusSongId]);

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

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
        pointerEvents: 'none' // Let clicks pass through to elements below; canvas will handle its own events
      }}
    />
  );
}
