import * as THREE from 'three';
import { createBuildings, createMaterials } from './buildings.js';
import { createLandscape } from './landscape.js';
import { TIMELINE } from './timeline.js';

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 top;
  uniform vec3 horizon;
  uniform vec3 sunColor;
  uniform vec3 sunDirection;
  varying vec3 vDirection;
  void main() {
    vec3 direction = normalize(vDirection);
    float height = clamp(direction.y, 0.0, 1.0);
    vec3 color = mix(horizon, top, 1.0 - exp(-height * 9.0));
    float toSun = max(dot(direction, sunDirection), 0.0);
    color += sunColor * (pow(toSun, 900.0) * 3.0 + pow(toSun, 60.0) * 0.25);
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const INTRO = { drawEnd: 1.9, solidStart: 1.3, solidEnd: 2.7, linesEnd: 3.6 };

// Steps down one level at a time whenever frames run slow on this device.
const QUALITY = [
  { ratio: 1.5, shadowMap: 2048, shadows: true },
  { ratio: 1, shadowMap: 1536, shadows: true },
  { ratio: 0.75, shadowMap: 1024, shadows: true },
  { ratio: 0.75, shadowMap: 1024, shadows: false },
];
const SLOW_FRAME_MS = 34;
const THROTTLED_FRAME_MS = 400;
const FRAME_SAMPLES = 14;
const WARMUP_FRAMES = 4;
const SHADOW_INTERVAL = 3;

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const smooth = (value) => value * value * (3 - 2 * value);
const lerp = THREE.MathUtils.lerp;

function resolveStops() {
  const color = (hex) => new THREE.Color(hex);
  return TIMELINE.map((stop) => ({
    ...stop,
    skyTop: color(stop.skyTop),
    skyHorizon: color(stop.skyHorizon),
    sunColor: color(stop.sunColor),
    ambientSky: color(stop.ambientSky),
    ambientGround: color(stop.ambientGround),
  }));
}

function directionFrom(azimuthDeg, elevationDeg, out) {
  const azimuth = THREE.MathUtils.degToRad(azimuthDeg);
  const elevation = THREE.MathUtils.degToRad(elevationDeg);
  return out
    .set(Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.cos(azimuth) * Math.cos(elevation))
    .normalize();
}

export function createSiteScene(canvas, { reducedMotion, onSun }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#ffffff', 0.002);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 2400);
  const stops = resolveStops();
  const lastIndex = stops.length - 1;

  const cameraCurve = new THREE.CatmullRomCurve3(
    stops.map((stop) => new THREE.Vector3(...stop.camera)),
    false,
    'centripetal',
  );
  const targetCurve = new THREE.CatmullRomCurve3(
    stops.map((stop) => new THREE.Vector3(...stop.target)),
    false,
    'centripetal',
  );

  // Sky
  const skyUniforms = {
    top: { value: new THREE.Color() },
    horizon: { value: new THREE.Color() },
    sunColor: { value: new THREE.Color() },
    sunDirection: { value: new THREE.Vector3() },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1800, 32, 20),
    new THREE.ShaderMaterial({
      uniforms: skyUniforms,
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    }),
  );
  scene.add(sky);

  // Light
  const ambient = new THREE.HemisphereLight('#ffffff', '#000000', 1);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight('#ffffff', 1);
  sun.castShadow = true;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -95;
  sun.shadow.camera.right = sun.shadow.camera.top = 95;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 620;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.06;
  scene.add(sun, sun.target);

  // Site
  const materials = createMaterials();
  const { heroEdges } = createBuildings(scene, materials);
  createLandscape(scene, cameraCurve.getPoints(120));

  // Intro: the house is sketched as lines, then fills in.
  const fadingMaterials = [materials.concrete, materials.darkConcrete, materials.bronze, materials.glass, materials.glassLate, materials.water];
  const sketchMaterial = new THREE.LineBasicMaterial({ color: '#1f4fa3', transparent: true, opacity: 0.95, fog: false });
  const sketchGeometry = new THREE.BufferGeometry().setAttribute(
    'position',
    new THREE.Float32BufferAttribute(heroEdges, 3),
  );
  const sketch = new THREE.LineSegments(sketchGeometry, sketchMaterial);
  scene.add(sketch);
  const sketchVertexCount = heroEdges.length / 3;
  let introRunning = !reducedMotion;
  if (introRunning) {
    fadingMaterials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0;
    });
  } else {
    sketch.visible = false;
  }

  let width = 1;
  let height = 1;
  let isWide = true;
  // Small screens start a level down to keep phones cool.
  let qualityLevel = window.innerWidth >= 800 ? 0 : 1;

  function resize() {
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    isWide = width >= 800;
    const quality = QUALITY[qualityLevel];
    const ratio = Math.min(window.devicePixelRatio || 1, quality.ratio);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = camera.aspect < 0.8 ? 58 : camera.aspect < 1.2 ? 46 : 36;
    if (sun.castShadow !== quality.shadows) {
      sun.castShadow = quality.shadows;
      scene.traverse((object) => {
        if (object.material) object.material.needsUpdate = true;
      });
    }
    sun.shadow.mapSize.setScalar(quality.shadowMap);
    if (sun.shadow.map) {
      sun.shadow.map.dispose();
      sun.shadow.map = null;
    }
    renderer.shadowMap.needsUpdate = true;
    dirty = true;
  }

  // Scroll: each stop owns a scroll position, measured from the page.
  let stopScroll = stops.map((_, index) => index);
  let scrollU = 0;
  let currentU = 0;
  let dirty = true;

  function scrollToU(y) {
    if (y <= stopScroll[0]) return 0;
    for (let i = 0; i < lastIndex; i++) {
      if (y < stopScroll[i + 1]) {
        const span = stopScroll[i + 1] - stopScroll[i];
        // Eased so the camera rests while each section's text is being read.
        return i + smooth(clamp01((y - stopScroll[i]) / (span || 1)));
      }
    }
    return lastIndex;
  }

  const pointer = new THREE.Vector2();
  const pointerSmooth = new THREE.Vector2();

  function onPointerMove(event) {
    pointer.set((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1);
  }
  if (!reducedMotion) window.addEventListener('pointermove', onPointerMove, { passive: true });

  // Scratch values reused every frame
  const cameraPosition = new THREE.Vector3();
  const cameraTarget = new THREE.Vector3();
  const sunDirection = new THREE.Vector3();
  const right = new THREE.Vector3();

  function apply(u) {
    const index = Math.min(Math.floor(u), lastIndex - 1);
    const t = u - index;
    const a = stops[index];
    const b = stops[index + 1];
    const mix = (key) => lerp(a[key], b[key], t);

    const curveT = u / lastIndex;
    cameraCurve.getPoint(curveT, cameraPosition);
    targetCurve.getPoint(curveT, cameraTarget);
    camera.position.copy(cameraPosition);
    camera.lookAt(cameraTarget);
    right.setFromMatrixColumn(camera.matrix, 0);
    camera.position.addScaledVector(right, pointerSmooth.x * 1.3);
    camera.position.y += -pointerSmooth.y * 0.55;
    camera.lookAt(cameraTarget);

    // Keep the subject clear of the text: sideways when wide, upward on phones.
    const shiftX = isWide ? mix('shift') : 0;
    const shiftY = isWide ? (u < 1 ? (1 - u) * 0.14 : 0) : 0.16;
    camera.setViewOffset(width, height, -shiftX * width, shiftY * height, width, height);

    const sunElevation = mix('sunElevation');
    const sunAzimuth = mix('sunAzimuth');
    directionFrom(sunAzimuth, sunElevation, sunDirection);

    skyUniforms.top.value.lerpColors(a.skyTop, b.skyTop, t);
    skyUniforms.horizon.value.lerpColors(a.skyHorizon, b.skyHorizon, t);
    skyUniforms.sunColor.value.lerpColors(a.sunColor, b.sunColor, t);
    skyUniforms.sunDirection.value.copy(sunDirection);
    scene.fog.color.copy(skyUniforms.horizon.value);

    sun.color.lerpColors(a.sunColor, b.sunColor, t);
    sun.intensity = mix('sunIntensity');
    sun.target.position.set(cameraTarget.x, 0, cameraTarget.z);
    sun.position.copy(sun.target.position).addScaledVector(sunDirection, 300);

    ambient.color.lerpColors(a.ambientSky, b.ambientSky, t);
    ambient.groundColor.lerpColors(a.ambientGround, b.ambientGround, t);
    ambient.intensity = mix('ambient');

    const glow = mix('glow');
    materials.glass.emissiveIntensity = glow;
    materials.glassLate.emissiveIntensity = glow * 0.7;
    materials.slit.emissiveIntensity = glow;

    sky.position.copy(camera.position);

    onSun?.({
      minutes: mix('minutes'),
      elevation: sunElevation,
      progress: u / lastIndex,
    });
  }

  function updateIntro(elapsed) {
    const draw = clamp01(elapsed / INTRO.drawEnd);
    sketchGeometry.setDrawRange(0, Math.floor(smooth(draw) * sketchVertexCount / 2) * 2);
    const solid = smooth(clamp01((elapsed - INTRO.solidStart) / (INTRO.solidEnd - INTRO.solidStart)));
    fadingMaterials.forEach((material) => {
      material.opacity = solid;
    });
    sketchMaterial.opacity = 0.95 * (1 - clamp01((elapsed - INTRO.solidEnd) / (INTRO.linesEnd - INTRO.solidEnd)));

    if (elapsed >= INTRO.linesEnd) {
      fadingMaterials.forEach((material) => {
        material.transparent = false;
        material.opacity = 1;
        material.needsUpdate = true;
      });
      sketch.visible = false;
      introRunning = false;
    }
  }

  let previousTime = performance.now();
  let introElapsed = 0;
  let frame = 0;
  let renderCount = 0;
  let renderedLastFrame = false;
  const frameTimes = [];

  function tick(now = performance.now()) {
    frame = requestAnimationFrame(tick);
    const elapsed = (now - previousTime) / 1000;
    const delta = Math.min(elapsed, 0.1);
    previousTime = now;
    scrollU = scrollToU(window.scrollY);

    const follow = reducedMotion ? 1 : 1 - Math.exp(-elapsed * 4.5);
    const nextU = currentU + (scrollU - currentU) * follow;
    const pointerFollow = 1 - Math.exp(-delta * 2.5);
    const previousX = pointerSmooth.x;
    const previousY = pointerSmooth.y;
    pointerSmooth.lerp(pointer, pointerFollow);

    const moving =
      Math.abs(nextU - currentU) > 1e-5 ||
      Math.abs(pointerSmooth.x - previousX) + Math.abs(pointerSmooth.y - previousY) > 1e-5;
    currentU = nextU;

    if (introRunning) {
      // Real time, so a slow device still finishes the intro on schedule.
      introElapsed += Math.min(elapsed, 0.5);
      updateIntro(introElapsed);
    }
    // Nothing on screen changes while the page is still, so skip the GPU work.
    if (!moving && !introRunning && !dirty) {
      renderedLastFrame = false;
      return;
    }
    dirty = false;

    apply(currentU);
    renderCount += 1;
    if (renderCount % SHADOW_INTERVAL === 1 || !moving) renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);

    if (renderedLastFrame) watchFrameTime(elapsed * 1000);
    renderedLastFrame = true;
  }

  function watchFrameTime(frameMs) {
    // The first frames include shader compilation, which says nothing about speed.
    if (renderCount <= WARMUP_FRAMES) return;
    // Very long gaps mean the browser is throttling an unfocused window or the
    // page just stalled. Neither says the GPU is slow, so they don't count.
    if (frameMs > THROTTLED_FRAME_MS) return;
    frameTimes.push(frameMs);
    if (frameTimes.length < FRAME_SAMPLES) return;
    const median = [...frameTimes].sort((a, b) => a - b)[FRAME_SAMPLES >> 1];
    frameTimes.length = 0;
    if (median > SLOW_FRAME_MS && qualityLevel < QUALITY.length - 1) {
      qualityLevel += 1;
      resize();
    }
  }

  window.addEventListener('resize', resize);
  resize();
  currentU = scrollToU(window.scrollY);
  tick();

  return {
    setStopPositions(positions) {
      stopScroll = positions;
      dirty = true;
    },
    dispose() {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      scene.traverse((object) => {
        object.geometry?.dispose();
        if (object.material) {
          object.material.map?.dispose();
          object.material.emissiveMap?.dispose();
          object.material.userData.detailMap?.dispose();
        }
        object.material?.dispose();
      });
      renderer.dispose();
    },
  };
}
