import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// The firm's own SketchUp model of the Courtyard House, cleaned and simplified
// in Blender. Its materials are named after the classes below.
const HOUSE_MODEL = new URL('../assets/courtyard-house.glb', import.meta.url).href;

const TEXTURE_METRES = 5;

export function seededRandom(seed) {
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
    const shade = 214 + random() * 24;
    ctx.fillStyle = `rgb(${shade},${shade - 3},${shade - 9})`;
    ctx.fillRect(0, (i * size) / planks, size, size / planks);
    ctx.fillStyle = 'rgba(30,30,34,0.16)';
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
      color: '#54707f',
      roughness: 0.25,
      metalness: 0.1,
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
      color: '#2d3b48',
      emissive: '#ffc27a',
      emissiveIntensity: 0,
    }),
    water: new THREE.MeshStandardMaterial({ color: '#7fa6ba', roughness: 0.15, metalness: 0.1 }),
    // Untextured: the house model has no UVs, and flat colour suits it.
    // Double-sided because SketchUp exports faces with mixed winding.
    plaster: new THREE.MeshStandardMaterial({ color: '#efebe4', roughness: 0.9, side: THREE.DoubleSide }),
    grey: new THREE.MeshStandardMaterial({ color: '#9a9792', roughness: 0.85, side: THREE.DoubleSide }),
    dark: new THREE.MeshStandardMaterial({ color: '#3a3836', roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide }),
    timber: new THREE.MeshStandardMaterial({ color: '#7a5638', roughness: 0.75, side: THREE.DoubleSide }),
    paving: new THREE.MeshStandardMaterial({ color: '#cbc5ba', roughness: 0.95, side: THREE.DoubleSide }),
    houseGlass: new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      color: '#5d7480',
      roughness: 0.2,
      metalness: 0.2,
      emissive: '#ffb066',
      emissiveIntensity: 0,
    }),
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

function createBuilder(parent, materials) {
  const add = (geometry, material, x, y, z) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = material !== materials.water;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // y is the underside of the box, which keeps storeys easy to stack.
  const box = (w, h, d, x, y, z, material = materials.concrete) =>
    add(boxGeometry(w, h, d), material, x, y + h / 2, z);

  return { add, box };
}

// Resolves with the model's outline, for the opening sketch.
async function loadHouse(group, materials) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(HOUSE_MODEL);
  const byName = { ...materials, glass: materials.houseGlass };
  const outlines = [];
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((object) => {
    if (!object.isMesh) return;
    const name = object.material.name;
    object.material.dispose();
    object.material = byName[name] ?? materials.plaster;
    object.castShadow = object.material !== materials.water && object.material !== materials.houseGlass;
    object.receiveShadow = true;
    const outline = new THREE.EdgesGeometry(object.geometry, 25).applyMatrix4(object.matrixWorld);
    outlines.push(outline.attributes.position.array);
    outline.dispose();
  });
  group.add(gltf.scene);
  const edges = new Float32Array(outlines.reduce((total, array) => total + array.length, 0));
  outlines.reduce((offset, array) => {
    edges.set(array, offset);
    return offset + array.length;
  }, 0);
  return edges;
}

function buildLibrary(group, materials) {
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
}

function buildOffices(group, materials) {
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
}

function buildPavilion(group, materials) {
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
}

// Metres. Each model faces +z so the camera stops read from the south.
// The house has no `build`: it is loaded from a file by createBuildings.
export const SITES = [
  { position: [0, 0, 0], radius: 30 },
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

// `house` resolves with the house's outline once its model has loaded.
export function createBuildings(scene, materials) {
  let house;
  SITES.forEach((site) => {
    const group = new THREE.Group();
    group.position.set(...site.position);
    scene.add(group);
    if (!site.build) {
      house = loadHouse(group, materials);
      return;
    }
    site.build(group, materials);
    mergeByMaterial(group, materials);
  });
  return { house };
}
