import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TEXTURE_METRES = 5;

function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

// Board-formed concrete: pale horizontal planks with speckle.
function createConcreteTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const random = seededRandom(11);
  const planks = 16;
  for (let i = 0; i < planks; i++) {
    const shade = 176 + random() * 26;
    ctx.fillStyle = `rgb(${shade},${shade - 3},${shade - 9})`;
    ctx.fillRect(0, (i * size) / planks, size, size / planks);
    ctx.fillStyle = 'rgba(30,30,34,0.35)';
    ctx.fillRect(0, (i * size) / planks, size, 1.5);
  }
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = `rgba(${random() > 0.5 ? '255,255,255' : '20,20,24'},${random() * 0.09})`;
    ctx.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

// Window bays with mullions, some rooms brighter than others.
function createWindowTexture(seed) {
  const size = 256;
  const bays = 8;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const random = seededRandom(seed);
  const bayWidth = size / bays;
  for (let i = 0; i < bays; i++) {
    const lit = random() > 0.3 ? 110 + random() * 145 : 25 + random() * 30;
    ctx.fillStyle = `rgb(${lit},${lit},${lit})`;
    ctx.fillRect(i * bayWidth, 0, bayWidth, size);
    ctx.fillStyle = '#000';
    ctx.fillRect(i * bayWidth, 0, 3, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createMaterials() {
  const concreteMap = createConcreteTexture();
  const concrete = (color) =>
    new THREE.MeshStandardMaterial({
      color,
      map: concreteMap,
      roughness: 0.92,
    });
  const glass = (seed) =>
    new THREE.MeshStandardMaterial({
      color: '#10161f',
      roughness: 0.5,
      metalness: 0.15,
      emissive: '#ffb066',
      emissiveMap: createWindowTexture(seed),
      emissiveIntensity: 0,
    });

  return {
    concrete: concrete('#f0ebe2'),
    darkConcrete: concrete('#8d8a88'),
    bronze: new THREE.MeshStandardMaterial({ color: '#5b4633', roughness: 0.5, metalness: 0.7 }),
    glass: glass(29),
    glassLate: glass(53),
    slit: new THREE.MeshStandardMaterial({
      color: '#10161f',
      emissive: '#ffc27a',
      emissiveIntensity: 0,
    }),
    water: new THREE.MeshStandardMaterial({ color: '#1a2436', roughness: 0.08, metalness: 0.9 }),
    tree: new THREE.MeshStandardMaterial({ color: '#34493b', roughness: 1 }),
  };
}

// Gives a box's texture the same real-world scale whatever its proportions.
function boxGeometry(w, h, d) {
  const geometry = new THREE.BoxGeometry(w, h, d);
  const uv = geometry.attributes.uv;
  const faces = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  faces.forEach(([u, v], face) => {
    for (let i = 0; i < 4; i++) {
      const index = face * 4 + i;
      uv.setXY(index, (uv.getX(index) * u) / TEXTURE_METRES, (uv.getY(index) * v) / TEXTURE_METRES);
    }
  });
  return geometry;
}

function createBuilder(parent, materials, edges) {
  parent.updateMatrixWorld(true);

  const add = (geometry, material, x, y, z) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = material !== materials.water;
    mesh.receiveShadow = true;
    parent.add(mesh);
    if (edges) {
      mesh.updateMatrixWorld(true);
      const outline = new THREE.EdgesGeometry(geometry, 25).applyMatrix4(mesh.matrixWorld);
      edges.push(...outline.attributes.position.array);
      outline.dispose();
    }
    return mesh;
  };

  // y is the underside of the box, which keeps storeys easy to stack.
  const box = (w, h, d, x, y, z, material = materials.concrete) =>
    add(boxGeometry(w, h, d), material, x, y + h / 2, z);

  return { add, box };
}

function addLight(group, x, y, z, lights) {
  const light = new THREE.PointLight('#ffb36b', 0, 42, 1.8);
  light.position.set(x, y, z);
  group.add(light);
  lights.push(light);
}

function buildHouse(group, materials, lights, edges) {
  const { box } = createBuilder(group, materials, edges);
  const { concrete, darkConcrete, glass, glassLate, bronze, water } = materials;

  box(36, 0.4, 24, 0, 0, 1, darkConcrete);

  // Ground floor
  box(24, 3.2, 0.4, 0, 0.4, -8);
  box(0.4, 3.2, 14, -12, 0.4, -1);
  box(18, 3, 0.2, 1, 0.5, 5.6, glass);
  box(0.2, 3, 7, 11, 0.5, 2, glass);
  box(0.35, 3.2, 0.35, -8, 0.4, 5.6, bronze);
  box(0.35, 3.2, 0.35, 11, 0.4, 5.6, bronze);

  // First-floor slab and the bar that leans out over the garden
  box(27, 0.4, 16, -0.5, 3.6, -1);
  box(19, 3.3, 9, 7, 4, -1);
  box(16, 1.5, 0.25, 7, 5, 3.55, glassLate);
  box(0.25, 1.5, 6, 16.55, 5, -1, glass);
  box(21, 0.35, 11, 7, 7.3, -1);

  // Shade fins across the ribbon window
  for (let i = 0; i < 9; i++) box(0.14, 2.6, 0.7, -0.5 + i * 1.9, 4.35, 4.1, bronze);

  // Garden walls, steps and pool
  box(14, 2.4, 0.4, -8, 0.4, 12.5);
  box(0.4, 1.4, 10, -16, 0.4, 7);
  for (let i = 0; i < 4; i++) box(4, 0.1 + i * 0.1, 0.6, 14, 0, 13.4 - i * 0.6, darkConcrete);
  box(12, 0.06, 4.5, 3, 0.4, 9.2, water);

  addLight(group, 3, 3, 9, lights);
}

function buildLibrary(group, materials, lights) {
  const { add, box } = createBuilder(group, materials);
  const { concrete, darkConcrete, glass, glassLate, bronze } = materials;
  const bays = 7;
  const bayWidth = 7;
  const depth = 20;
  const width = bays * bayWidth;
  const height = 6.5;

  box(width + 12, 0.5, depth + 16, 0, 0, 2, darkConcrete);
  box(width, 4.8, depth, 0, 0.5, 0, glass);
  box(width + 1.5, 0.5, depth + 1.5, 0, 5.4, 0);
  box(width, 6, 0.4, 0, 0.5, -depth / 2);

  // Sawtooth roof lights
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(bayWidth, 0);
  shape.lineTo(0, 3.6);
  shape.closePath();
  for (let i = 0; i < bays; i++) {
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    const uv = geometry.attributes.uv;
    for (let j = 0; j < uv.count; j++) {
      uv.setXY(j, uv.getX(j) / TEXTURE_METRES, uv.getY(j) / TEXTURE_METRES);
    }
    add(geometry, concrete, -width / 2 + i * bayWidth, 5.9, -depth / 2);
    box(0.25, 3.3, depth - 0.5, -width / 2 + i * bayWidth + 0.14, 5.9, 0, glassLate);
  }

  // Deep fins along the terrace
  for (let i = 0; i <= 28; i++) {
    box(0.35, height - 1.2, 2.6, -width / 2 + i * (width / 28), 0.5, depth / 2 + 1.6);
  }
  box(width + 1, 0.4, 3.4, 0, height - 0.7, depth / 2 + 1.6);
  for (let i = 0; i < 5; i++) box(5, 0.45, 0.6, -14 + i * 7, 0.5, depth / 2 + 6, bronze);

  addLight(group, 0, 3, depth / 2 + 5, lights);
}

function buildOffices(group, materials, lights) {
  const { box } = createBuilder(group, materials);
  const { concrete, darkConcrete, glass, glassLate, bronze } = materials;
  const floors = 9;
  const storey = 3.6;

  box(34, 0.5, 30, 0, 0, 0, darkConcrete);
  box(9, floors * storey + 3, 9, 0, 0.5, -1);

  for (let i = 0; i < floors; i++) {
    const y = 0.5 + i * storey;
    const x = Math.sin(i * 1.15) * 3.2;
    const z = Math.cos(i * 0.8) * 2.2;
    box(20, 0.45, 15, x, y + storey - 0.45, z);
    box(17, storey - 0.45, 12, x, y, z, i % 3 === 1 ? glassLate : glass);
    box(20, 0.75, 0.16, x, y + storey, z + 7.45, bronze);
  }

  addLight(group, 0, 4, 14, lights);
}

function buildPavilion(group, materials, lights) {
  const { add, box } = createBuilder(group, materials);
  const { concrete, darkConcrete, slit, water } = materials;

  box(32, 0.4, 26, 0, 0, 2, darkConcrete);

  // Tall wedge, extruded from its side profile
  const shape = new THREE.Shape();
  shape.moveTo(-7, 0);
  shape.lineTo(7, 0);
  shape.lineTo(7, 9);
  shape.lineTo(-7, 22);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 10, bevelEnabled: false });
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) / TEXTURE_METRES, uv.getY(i) / TEXTURE_METRES);
  }
  add(geometry, concrete, 0, 0.4, -5);

  box(0.45, 15, 0.2, -3.2, 0.4, 5.05, slit);
  box(2.8, 2.6, 0.2, 3.5, 0.4, 5.05, slit);
  box(16, 2, 0.4, -11, 0.4, 10);
  box(11, 0.06, 8, 7, 0.4, 9.5, water);

  addLight(group, -3.2, 4, 8, lights);
}

// Metres. Each model faces +z so the camera stops read from the south.
export const SITES = [
  { position: [0, 0, 0], radius: 26, build: buildHouse },
  { position: [76, 0, -36], radius: 34, build: buildLibrary },
  { position: [30, 0, -108], radius: 26, build: buildOffices },
  { position: [-52, 0, -90], radius: 24, build: buildPavilion },
];

// One draw call per material instead of one per box.
function mergeByMaterial(group, materials) {
  const byMaterial = new Map();
  group.children
    .filter((child) => child.isMesh)
    .forEach((mesh) => {
      mesh.updateMatrix();
      const source = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
      const placed = source.clone().applyMatrix4(mesh.matrix);
      if (!byMaterial.has(mesh.material)) byMaterial.set(mesh.material, []);
      byMaterial.get(mesh.material).push(placed);
      group.remove(mesh);
      mesh.geometry.dispose();
    });

  byMaterial.forEach((geometries, material) => {
    const merged = new THREE.Mesh(mergeGeometries(geometries), material);
    merged.castShadow = material !== materials.water;
    merged.receiveShadow = true;
    group.add(merged);
    geometries.forEach((geometry) => geometry.dispose());
  });
}

export function createBuildings(scene, materials) {
  const lights = [];
  const heroEdges = [];
  SITES.forEach((site, index) => {
    const group = new THREE.Group();
    group.position.set(...site.position);
    scene.add(group);
    site.build(group, materials, lights, index === 0 ? heroEdges : undefined);
    mergeByMaterial(group, materials);
  });
  return { lights, heroEdges };
}

export function createTrees(scene, material, avoidPoints) {
  const random = seededRandom(73);
  const dummy = new THREE.Object3D();
  const placements = [];
  for (let attempt = 0; attempt < 900 && placements.length < 170; attempt++) {
    const x = -170 + random() * 340;
    const z = -210 + random() * 310;
    const clearOfBuildings = SITES.every(
      ({ position, radius }) => Math.hypot(x - position[0], z - position[2]) > radius,
    );
    const clearOfCamera = avoidPoints.every((point) => Math.hypot(x - point.x, z - point.z) > 24);
    if (clearOfBuildings && clearOfCamera) placements.push([x, z, 1 + random() * 1.3]);
  }

  // Slim cypress forms, like the trees on an architect's site model.
  const crown = new THREE.IcosahedronGeometry(1, 3);
  const crownPositions = crown.attributes.position;
  for (let i = 0; i < crownPositions.count; i++) {
    const taper = 1 - 0.5 * ((crownPositions.getY(i) + 1) / 2);
    crownPositions.setX(i, crownPositions.getX(i) * taper);
    crownPositions.setZ(i, crownPositions.getZ(i) * taper);
  }
  crown.computeVertexNormals();
  const mesh = new THREE.InstancedMesh(crown, material, placements.length);
  placements.forEach(([x, z, size], index) => {
    dummy.position.set(x, size * 3.4, z);
    dummy.scale.set(size, size * 3.4, size);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

// Dark site plan with faint survey contours.
export function createGround(scene) {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const height =
        Math.sin(u * 7.1 + Math.sin(v * 4.3) * 1.4) +
        Math.sin(v * 6.2 + Math.cos(u * 5.2) * 1.2) * 0.8 +
        Math.sin((u + v) * 13) * 0.18;
      const band = Math.abs((((height * 5) % 1) + 1) % 1 - 0.5);
      const line = band < 0.035 ? 1 : 0;
      const i = (y * size + x) * 4;
      image.data[i] = 96 + line * 30;
      image.data[i + 1] = 98 + line * 30;
      image.data[i + 2] = 100 + line * 32;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(900, 64),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.97 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // The contour texture only spans the site itself.
  const uv = ground.geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (uv.getX(i) - 0.5) * 3 + 0.5, (uv.getY(i) - 0.5) * 3 + 0.5);
  }
  texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping;
}
