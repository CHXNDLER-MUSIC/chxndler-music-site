import * as THREE from 'three';

export function addDefaultLights(scene: THREE.Scene) {
  // Add lights for better texture visibility
  const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 15, 10);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  const pointLight = new THREE.PointLight(0xffffff, 0.3);
  pointLight.position.set(0, 10, 0);
  scene.add(pointLight);

  // Add additional side lighting for better texture detail
  const sideLight1 = new THREE.DirectionalLight(0x8888ff, 0.3);
  sideLight1.position.set(-10, 5, 0);
  scene.add(sideLight1);

  const sideLight2 = new THREE.DirectionalLight(0xff8888, 0.3);
  sideLight2.position.set(10, -5, 0);
  scene.add(sideLight2);
}