import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { seededRandom, SITES } from './buildings.js';

const AREA = { minX: -170, maxX: 170, minZ: -210, maxZ: 100 };
const PATH_WIDTH = 2.6;
const TALL_CLEARANCE_FROM_CAMERA = 24;
const LOW_CLEARANCE_FROM_CAMERA = 8;

// Gravel routes linking the four buildings, as [x, z] control points.
const ROUTES = [
  [[12, 14], [34, 20], [56, 6], [72, -16]],
  [[44, -38], [46, -70], [38, -94]],
  [[14, -104], [-8, -112], [-30, -96]],
  [[-46, -74], [-36, -40], [-20, -14], [-14, -10]],
];

const color = (hex) => new THREE.Color(hex);

function createDetailTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const random = seededRandom(19);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  ctx.lineCap = 'round';
  for (let i = 0; i < 16000; i++) {
    const x = random() * size;
    const y = random() * size;
    const angle = random() * Math.PI * 2;
    const length = 1 + random() * 7;
    ctx.strokeStyle = `rgba(${random() > 0.5 ? '255,255,255' : '0,0,0'},${0.08 + random() * 0.22})`;
    ctx.lineWidth = 0.6 + random();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

// Pale site plan: meadow and dry-grass patches under faint survey contours,
// with close-up grain from a tiling detail texture.
function createGround(scene) {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(size, size);
  const random = seededRandom(41);
  const base = [238, 234, 222];
  const meadow = [198, 208, 170];
  const straw = [230, 216, 178];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const height =
        Math.sin(u * 7.1 + Math.sin(v * 4.3) * 1.4) +
        Math.sin(v * 6.2 + Math.cos(u * 5.2) * 1.2) * 0.8 +
        Math.sin((u + v) * 13) * 0.18;
      const band = Math.abs((((height * 5) % 1) + 1) % 1 - 0.5);
      const line = band < 0.022 ? 1 : 0;

      const meadowAmount = THREE.MathUtils.smoothstep(
        Math.sin(u * 31 + Math.sin(v * 23) * 2) + Math.sin(v * 37 + u * 11) * 0.7 + Math.sin(u * 83 - v * 71) * 0.25,
        -0.2,
        1.1,
      );
      const strawAmount = THREE.MathUtils.smoothstep(
        Math.sin(u * 47 - v * 19 + 2) + Math.cos(v * 53 + Math.sin(u * 29) * 2) * 0.6,
        0.5,
        1.5,
      );
      const speck = (random() - 0.5) * 7;
      const i = (y * size + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        let value = THREE.MathUtils.lerp(base[channel], meadow[channel], meadowAmount);
        value = THREE.MathUtils.lerp(value, straw[channel], strawAmount * 0.8);
        image.data[i + channel] = value + speck - line * 26;
      }
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping;

  const detailMap = createDetailTexture();
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.97 });
  material.userData.detailMap = detailMap;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.detailMap = { value: detailMap };
    shader.fragmentShader = `uniform sampler2D detailMap;\n${shader.fragmentShader}`.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
      float grain = texture2D(detailMap, vMapUv * 90.0).r * 0.6 + texture2D(detailMap, vMapUv * 17.0).r * 0.4;
      diffuseColor.rgb *= 0.7 + grain * 0.6;`,
    );
  };

  const ground = new THREE.Mesh(new THREE.CircleGeometry(900, 64), material);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // The texture spans roughly 600 m, then mirrors.
  const uv = ground.geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (uv.getX(i) - 0.5) * 3 + 0.5, (uv.getY(i) - 0.5) * 3 + 0.5);
  }
}

function createRibbon(points, width, y) {
  const positions = [];
  const normals = [];
  const indices = [];
  points.forEach((point, index) => {
    const next = points[Math.min(index + 1, points.length - 1)];
    const previous = points[Math.max(index - 1, 0)];
    const side = new THREE.Vector3(next.z - previous.z, 0, previous.x - next.x).normalize();
    positions.push(
      point.x + (side.x * width) / 2, y, point.z + (side.z * width) / 2,
      point.x - (side.x * width) / 2, y, point.z - (side.z * width) / 2,
    );
    normals.push(0, 1, 0, 0, 1, 0);
    if (index < points.length - 1) {
      const a = index * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  return new THREE.BufferGeometry()
    .setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    .setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    .setIndex(indices);
}

function createPaths(scene) {
  const gravel = new THREE.MeshStandardMaterial({ color: '#efe8d8', roughness: 1 });
  const edging = new THREE.MeshStandardMaterial({ color: '#b5ad9c', roughness: 1 });
  const samples = [];
  const gravelParts = [];
  const edgingParts = [];

  ROUTES.forEach((route) => {
    const curve = new THREE.CatmullRomCurve3(route.map(([x, z]) => new THREE.Vector3(x, 0, z)));
    const points = curve.getSpacedPoints(Math.ceil(curve.getLength() / 3));
    samples.push(...points);
    gravelParts.push(createRibbon(points, PATH_WIDTH, 0.07));
    edgingParts.push(createRibbon(points, PATH_WIDTH + 0.5, 0.04));
  });

  [
    [gravelParts, gravel],
    [edgingParts, edging],
  ].forEach(([parts, material]) => {
    const mesh = new THREE.Mesh(mergeGeometries(parts), material);
    mesh.receiveShadow = true;
    scene.add(mesh);
    parts.forEach((part) => part.dispose());
  });
  return samples;
}

// One leafy clump. Normals bend away from the crown's centre so that many
// clumps shade together as a single soft volume.
function createClump(random, centre, radius, crownCentre, shadeAt) {
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const position = geometry.attributes.position;
  const colors = [];
  const normals = [];
  const seed = random() * 10;
  const vertex = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const outward = new THREE.Vector3();

  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i).normalize();
    normal.copy(vertex);
    const wobble =
      1 + 0.16 * Math.sin(vertex.x * 6 + seed) * Math.sin(vertex.y * 7 + seed) * Math.sin(vertex.z * 5 - seed);
    vertex.multiplyScalar(wobble);
    vertex.set(vertex.x * radius.x + centre.x, vertex.y * radius.y + centre.y, vertex.z * radius.z + centre.z);
    position.setXYZ(i, vertex.x, vertex.y, vertex.z);

    outward.copy(vertex).sub(crownCentre).normalize();
    normal.lerp(outward, 0.6).normalize();
    normals.push(normal.x, normal.y, normal.z);

    const shade = shadeAt(vertex.y, normal.y);
    colors.push(shade.r, shade.g, shade.b);
  }
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.deleteAttribute('uv');
  return geometry;
}

function createLimb(start, end, startRadius, endRadius, hex) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(endRadius, startRadius, length, 6, 1, true).toNonIndexed();
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
  geometry.translate((start.x + end.x) / 2, (start.y + end.y) / 2, (start.z + end.z) / 2);
  const tone = color(hex);
  const colors = [];
  for (let i = 0; i < geometry.attributes.position.count; i++) colors.push(tone.r, tone.g, tone.b);
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.deleteAttribute('uv');
  return geometry;
}

function foliageShade(lowHex, highHex, bottom, top) {
  const low = color(lowHex);
  const high = color(highHex);
  const shade = new THREE.Color();
  return (y, facingUp) => {
    const t = THREE.MathUtils.clamp((y - bottom) / (top - bottom), 0, 1);
    return shade.lerpColors(low, high, t * 0.75 + (facingUp * 0.5 + 0.5) * 0.25);
  };
}

function finish(parts) {
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  return merged;
}

function createCypress(random) {
  const height = 12;
  const crownCentre = new THREE.Vector3(0, height * 0.45, 0);
  const shade = foliageShade('#34523d', '#708f63', 1, height);
  const parts = [createLimb(new THREE.Vector3(), new THREE.Vector3(0, 2, 0), 0.26, 0.2, '#5c4c3b')];
  const clumps = 11;
  for (let i = 0; i < clumps; i++) {
    const t = i / (clumps - 1);
    const width = THREE.MathUtils.lerp(1.45, 0.28, t ** 1.25);
    const angle = random() * Math.PI * 2;
    const offset = width * 0.22;
    parts.push(
      createClump(
        random,
        new THREE.Vector3(Math.cos(angle) * offset, 1.6 + t * (height - 2.2), Math.sin(angle) * offset),
        new THREE.Vector3(width, width * 1.5, width),
        crownCentre,
        shade,
      ),
    );
  }
  return finish(parts);
}

function createBroadleaf(random) {
  const crownCentre = new THREE.Vector3(0, 6.8, 0);
  const shade = foliageShade('#47683f', '#9dba72', 4, 10);
  const fork = new THREE.Vector3(0, 3.2, 0);
  const parts = [createLimb(new THREE.Vector3(), fork, 0.34, 0.24, '#594a3a')];
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 + random();
    const tip = new THREE.Vector3(Math.cos(angle) * 2, 5.6, Math.sin(angle) * 2);
    parts.push(createLimb(fork, tip, 0.2, 0.08, '#594a3a'));
  }
  for (let i = 0; i < 12; i++) {
    const angle = random() * Math.PI * 2;
    const reach = 0.8 + random() * 2.5;
    const size = 1.5 + random() * 0.9;
    parts.push(
      createClump(
        random,
        new THREE.Vector3(Math.cos(angle) * reach, 5.3 + random() * 3.2, Math.sin(angle) * reach),
        new THREE.Vector3(size, size * 0.82, size),
        crownCentre,
        shade,
      ),
    );
  }
  return finish(parts);
}

function createOlive(random) {
  const crownCentre = new THREE.Vector3(0, 3.6, 0);
  const shade = foliageShade('#6c8270', '#b8c6ab', 2, 5.4);
  const fork = new THREE.Vector3(0.25, 1.5, 0);
  const parts = [createLimb(new THREE.Vector3(), fork, 0.34, 0.22, '#6d6355')];
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? 1 : -1;
    parts.push(createLimb(fork, new THREE.Vector3(side * 1.3, 2.9, side * 0.5), 0.17, 0.07, '#6d6355'));
  }
  for (let i = 0; i < 8; i++) {
    const angle = random() * Math.PI * 2;
    const reach = 0.5 + random() * 2.2;
    const size = 0.95 + random() * 0.65;
    parts.push(
      createClump(
        random,
        new THREE.Vector3(Math.cos(angle) * reach, 2.8 + random() * 1.5, Math.sin(angle) * reach),
        new THREE.Vector3(size, size * 0.7, size),
        crownCentre,
        shade,
      ),
    );
  }
  return finish(parts);
}

function createShrub(random) {
  const crownCentre = new THREE.Vector3(0, 0.5, 0);
  const shade = foliageShade('#4d6b47', '#8fa86b', 0, 1.5);
  const parts = [];
  for (let i = 0; i < 4; i++) {
    const angle = random() * Math.PI * 2;
    const reach = random() * 0.7;
    const size = 0.5 + random() * 0.35;
    parts.push(
      createClump(
        random,
        new THREE.Vector3(Math.cos(angle) * reach, 0.45 + random() * 0.35, Math.sin(angle) * reach),
        new THREE.Vector3(size, size * 0.85, size),
        crownCentre,
        shade,
      ),
    );
  }
  return finish(parts);
}

// A fan of narrow blades, lit from above so the tuft sits into the ground.
function createGrassTuft(random) {
  const root = color('#7f8f5c');
  const tip = color('#d8d4a4');
  const positions = [];
  const colors = [];
  const blades = 12;
  for (let i = 0; i < blades; i++) {
    const angle = (i / blades) * Math.PI * 2 + random() * 0.5;
    const lean = 0.25 + random() * 0.4;
    const height = 0.7 + random() * 0.5;
    const across = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle)).multiplyScalar(0.05);
    const x = Math.cos(angle) * 0.1;
    const z = Math.sin(angle) * 0.1;
    positions.push(
      x + across.x, 0, z + across.z,
      x - across.x, 0, z - across.z,
      x + Math.cos(angle) * lean, height, z + Math.sin(angle) * lean,
    );
    colors.push(root.r, root.g, root.b, root.r, root.g, root.b, tip.r, tip.g, tip.b);
  }
  const normals = positions.map((_, index) => (index % 3 === 1 ? 1 : 0));
  return new THREE.BufferGeometry()
    .setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    .setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    .setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
}

function scatter(scene, geometry, material, placements, castShadow) {
  if (!placements.length) return;
  const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  placements.forEach((item, index) => {
    dummy.position.set(item.x, 0, item.z);
    dummy.rotation.set(0, item.rotation, 0);
    dummy.scale.set(item.scale, item.scale * item.stretch, item.scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    mesh.setColorAt(index, tint.setRGB(item.tint, item.tint, item.tint * item.warmth));
  });
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  scene.add(mesh);
}

export function createLandscape(scene, cameraPoints) {
  createGround(scene);
  const pathPoints = createPaths(scene);

  const random = seededRandom(73);
  const within = (x, z, points, distance) =>
    points.some((point) => Math.hypot(x - point.x, z - point.z) < distance);
  const onBuilding = (x, z, factor) =>
    SITES.some(({ position, radius }) => Math.hypot(x - position[0], z - position[2]) < radius * factor);
  const randomPoint = () => [
    AREA.minX + random() * (AREA.maxX - AREA.minX),
    AREA.minZ + random() * (AREA.maxZ - AREA.minZ),
  ];
  const place = (x, z, scale, stretch = 1) => ({
    x,
    z,
    scale,
    stretch,
    rotation: random() * Math.PI * 2,
    tint: 0.88 + random() * 0.24,
    warmth: 0.92 + random() * 0.1,
  });

  const foliage = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const blades = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide });
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: '#b9b4a8', roughness: 0.95, flatShading: true });

  // Trees: species grow in loose zones instead of an even mix.
  const groups = { cypress: [], broadleaf: [], olive: [] };
  const clearForTree = (x, z) =>
    !onBuilding(x, z, 1) &&
    !within(x, z, cameraPoints, TALL_CLEARANCE_FROM_CAMERA) &&
    !within(x, z, pathPoints, 4);
  for (let attempt = 0; attempt < 1100 && groups.cypress.length + groups.broadleaf.length + groups.olive.length < 180; attempt++) {
    const [x, z] = randomPoint();
    if (!clearForTree(x, z)) continue;
    const zone = Math.sin(x * 0.024 + 1.2) * Math.cos(z * 0.019 - 0.6);
    if (zone > 0.18) groups.broadleaf.push(place(x, z, 0.85 + random() * 0.5));
    else if (zone < -0.18) groups.olive.push(place(x, z, 0.85 + random() * 0.5));
    else groups.cypress.push(place(x, z, 0.75 + random() * 0.5));
  }

  // A formal avenue of cypress lining the paths.
  pathPoints.forEach((point, index) => {
    if (index % 4 !== 0) return;
    const side = index % 8 === 0 ? 1 : -1;
    const x = point.x + side * 4.6;
    const z = point.z + side * 3.2;
    if (clearForTree(x, z)) groups.cypress.push(place(x, z, 0.72 + random() * 0.18));
  });

  scatter(scene, createCypress(random), foliage, groups.cypress, true);
  scatter(scene, createBroadleaf(random), foliage, groups.broadleaf, true);
  scatter(scene, createOlive(random), foliage, groups.olive, true);

  const clearForCover = (x, z) =>
    !onBuilding(x, z, 0.8) &&
    !within(x, z, cameraPoints, LOW_CLEARANCE_FROM_CAMERA) &&
    !within(x, z, pathPoints, PATH_WIDTH);

  const shrubs = [];
  for (let attempt = 0; attempt < 1200 && shrubs.length < 240; attempt++) {
    const [x, z] = randomPoint();
    if (clearForCover(x, z)) shrubs.push(place(x, z, 0.8 + random() * 1.2));
  }
  scatter(scene, createShrub(random), foliage, shrubs, true);

  // Grass grows in drifts, densest near the buildings and paths.
  const grass = [];
  for (let attempt = 0; attempt < 16000 && grass.length < 3200; attempt++) {
    const [x, z] = randomPoint();
    const drift = Math.sin(x * 0.11 + Math.sin(z * 0.07) * 2) + Math.sin(z * 0.13 + x * 0.04);
    if (drift > 0.25 && clearForCover(x, z)) grass.push(place(x, z, 0.45 + random() * 0.5, 0.7 + random() * 0.5));
  }
  scatter(scene, createGrassTuft(random), blades, grass, false);

  const stones = [];
  for (let attempt = 0; attempt < 800 && stones.length < 150; attempt++) {
    const [x, z] = randomPoint();
    if (clearForCover(x, z)) stones.push(place(x, z, 0.3 + random() ** 2 * 1.1, 0.55 + random() * 0.3));
  }
  scatter(scene, new THREE.DodecahedronGeometry(1, 0), stoneMaterial, stones, true);
}
