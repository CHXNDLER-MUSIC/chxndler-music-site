'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';

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
}

export default function Pure3DPlanets({ songs, songsByElement: propSongsByElement, quality, onPlanetSelect, focusElement, focusSongId }: Pure3DPlanetsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  // Keep references to song meshes by slug/id for camera focusing
  const songMeshMapRef = useRef<Map<string, THREE.Object3D>>(new Map());

  useEffect(() => {
    setIsClient(true);
  }, []);

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

    // Create element as a glowing sprite (opaque, not see-through)
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

    console.log('Building planets with songsByElement:', songsByElement, 'songs count:', songs.length);

    planets.forEach(p => {
      const group = new THREE.Group();
      // Position group at sun's location so planets orbit around the sun
      group.position.set(0, sunY, 0);
      // Create sprite showing full texture image with glow
      const planet = createElementSprite(p.texture, 1.8, p.pos, p.glow);
      group.add(planet);

      // Add song planets orbiting around this element
      const elementSongs = songsByElement[p.id] || [];
      console.log(`Element ${p.id} has ${elementSongs.length} songs`);
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

          console.log(`Adding song sphere: ${song.title} (${songSlug}) orbiting ${p.id} - ${isReleased ? 'released' : 'unreleased'}`);
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
    const starPositions = [];
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

    // Raycaster for click detection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      // Stop event from bubbling up to parent elements (prevents HUD toggle)
      event.stopPropagation();
      event.preventDefault();

      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const obj = intersects[0].object;
        if (obj === sun) {
          onPlanetSelect?.('center');
        } else {
          // Check which planet was clicked
          orbitGroups.forEach((og, idx) => {
            if (og.group.children.includes(obj)) {
              onPlanetSelect?.(planets[idx].id);
            }
          });
        }
      }
    };

    // Prevent clicks from bubbling to parent
    const handleMouseDown = (event: MouseEvent) => {
      event.stopPropagation();
    };

    container.addEventListener('click', handleClick);
    container.addEventListener('mousedown', handleMouseDown);

    // Animation loop
    let animationId: number;
    const clock = new THREE.Clock();

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
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      // Clear song mesh map on teardown
      try { songMeshMapRef.current.clear(); } catch {}
    };
  // Only rebuild when songs are first loaded (length changes from 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, quality, songs.length]);

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

    // Define optimal camera positions for viewing each element
    // Camera is positioned behind and above the element, looking toward center
    const elementCameraPositions: Record<ElementType, THREE.Vector3> = {
      heart: new THREE.Vector3(35, 25, 15),       // Behind +X, slightly offset in Z
      water: new THREE.Vector3(15, 25, 35),       // Behind +Z, slightly offset in X
      lightning: new THREE.Vector3(-35, 25, 15),  // Behind -X, slightly offset in Z
      darkness: new THREE.Vector3(15, 25, -35),   // Behind -Z, slightly offset in X
    };

    const targetPosition = elementTargets[focusElement];
    const newCameraPosition = elementCameraPositions[focusElement];

    if (!targetPosition || !newCameraPosition) return;

    console.log(`Starting camera focus on ${focusElement} planet at`, targetPosition.toArray());
    console.log(`Camera will move to`, newCameraPosition.toArray());

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
        console.log(`Camera focused on ${focusElement} planet at`, targetPosition.toArray());
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
    const mesh = songMeshMapRef.current.get(key);
    if (!mesh) {
      // Try fallback: some items may use ids without dashes or with slight variations
      const alt = key.replace(/'/g, '');
      const altMesh = songMeshMapRef.current.get(alt);
      if (!altMesh) return;
      // Use alt match
      const target = new THREE.Vector3();
      altMesh.getWorldPosition(target);
      focusCameraOn(target);
      return;
    }

    const target = new THREE.Vector3();
    mesh.getWorldPosition(target);
    focusCameraOn(target);

    function focusCameraOn(targetPos: THREE.Vector3) {
      const camera = cameraRef.current!;
      const controls = controlsRef.current!;

      // Compute a camera end position offset from the target, keeping a sensible viewing distance
      const currentPos = camera.position.clone();
      const startTarget = controls.target.clone();

      // Offset: back away from the target along the vector from center to target, and a bit up
      const center = new THREE.Vector3(0, 12, 0);
      const dir = targetPos.clone().sub(center).normalize();
      const distance = 10; // closer distance from the song planet
      const endCamPos = targetPos.clone().add(dir.clone().multiplyScalar( distance )).add(new THREE.Vector3(0, 4, 0));

      const endTarget = targetPos.clone();

      const duration = 1300; // ~1.3s
      const startTime = performance.now();

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);

        camera.position.lerpVectors(currentPos, endCamPos, eased);
        controls.target.lerpVectors(startTarget, endTarget, eased);
        controls.update();

        if (t < 1) requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);
    }
  }, [focusSongId]);

  if (!isClient) {
    return (
      <div className="w-full h-full min-h-[400px] flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
          Loading 3D Planets...
        </div>
      </div>
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
