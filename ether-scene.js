import * as THREE from './vendor/three.module.min.js';

/** A self-contained liquid-metal sculpture. No network textures or external models. */
export function createEtherScene(canvas, { reducedMotion = false, onReady = () => {} } = {}) {
  const noop = { setPointer() {}, setScroll() {}, setMotion() {}, pulse() {}, dispose() {} };
  if (!canvas) { onReady(); return noop; }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    canvas.classList.add('no-webgl');
    canvas.parentElement?.classList.add('scene-fallback');
    onReady();
    return noop;
  }

  const smallScreen = window.matchMedia('(max-width: 700px)').matches;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 70);
  camera.position.set(0, 0, 9.1);
  renderer.setClearColor(0x101110, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, smallScreen ? 1.3 : 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  // A deliberately photographic environment: long softboxes and dark dividers
  // draw fluid white ribbons across the chrome as the sculpture turns.
  const environmentCanvas = document.createElement('canvas');
  environmentCanvas.width = 2048;
  environmentCanvas.height = 1024;
  const context = environmentCanvas.getContext('2d');
  if (context) {
    const backdrop = context.createLinearGradient(0, 0, 0, 1024);
    backdrop.addColorStop(0, '#7d827e');
    backdrop.addColorStop(0.30, '#292e2b');
    backdrop.addColorStop(0.53, '#080b0a');
    backdrop.addColorStop(0.74, '#151a16');
    backdrop.addColorStop(1, '#515447');
    context.fillStyle = backdrop;
    context.fillRect(0, 0, 2048, 1024);
    const softbox = (x, y, width, height, color, blur = 20) => {
      context.save();
      context.shadowColor = color;
      context.shadowBlur = blur;
      context.fillStyle = color;
      context.fillRect(x, y, width, height);
      context.restore();
    };
    softbox(80, 120, 260, 690, '#fffcf0', 38);
    softbox(650, 45, 650, 145, '#eff5f2', 40);
    softbox(1470, 180, 250, 640, '#f3f6f3', 30);
    softbox(1190, 500, 100, 500, '#ff5a15', 80);
    softbox(1730, 740, 360, 65, '#b0b6a4', 24);
    softbox(400, 670, 330, 75, '#ffbf6c', 25);
    context.fillStyle = '#090e0b';
    context.fillRect(182, 115, 18, 715);
    context.fillRect(70, 420, 285, 22);
    context.fillRect(1010, 15, 25, 215);
    context.fillRect(1588, 150, 25, 690);
  }
  const panorama = new THREE.CanvasTexture(environmentCanvas);
  panorama.mapping = THREE.EquirectangularReflectionMapping;
  panorama.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromEquirectangular(panorama);
  scene.environment = environment.texture;
  panorama.dispose();
  pmrem.dispose();

  const sculpture = new THREE.Group();
  const body = new THREE.Group();
  const orbital = new THREE.Group();
  scene.add(sculpture);
  sculpture.add(body, orbital);

  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xf2f2e9,
    metalness: 1,
    roughness: 0.13,
    clearcoat: 0.75,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.65,
  });
  const darkChrome = new THREE.MeshPhysicalMaterial({
    color: 0x31372e,
    metalness: 1,
    roughness: 0.19,
    clearcoat: 0.9,
    envMapIntensity: 1.5,
  });

  // Sweep an oval ribbon around a closed harmonic path. Its rotating profile
  // alternates generous flat highlights and narrow liquid edges.
  const turns = smallScreen ? 192 : 320;
  const sides = smallScreen ? 20 : 32;
  const pathPoints = [];
  for (let i = 0; i < turns; i++) {
    const t = i / turns * Math.PI * 2;
    const radial = 1.05 + 0.40 * Math.cos(3 * t);
    pathPoints.push(new THREE.Vector3(
      radial * Math.cos(2 * t),
      radial * Math.sin(2 * t),
      0.58 * Math.sin(3 * t),
    ));
  }
  const path = new THREE.CatmullRomCurve3(pathPoints, true, 'centripetal');
  const frames = path.computeFrenetFrames(turns, true);
  const positions = [];
  const indices = [];
  const normal = new THREE.Vector3();
  const binormal = new THREE.Vector3();
  const vertex = new THREE.Vector3();
  for (let i = 0; i <= turns; i++) {
    const progress = i / turns;
    const center = path.getPointAt(progress);
    const twist = progress * Math.PI * 4 + Math.sin(progress * Math.PI * 6) * 0.24;
    normal.copy(frames.normals[i]).multiplyScalar(Math.cos(twist)).addScaledVector(frames.binormals[i], Math.sin(twist));
    binormal.copy(frames.binormals[i]).multiplyScalar(Math.cos(twist)).addScaledVector(frames.normals[i], -Math.sin(twist));
    const width = 0.335 + Math.sin(progress * Math.PI * 6 + 0.7) * 0.065;
    const thickness = 0.13 + Math.cos(progress * Math.PI * 6) * 0.018;
    for (let j = 0; j <= sides; j++) {
      const angle = j / sides * Math.PI * 2;
      vertex.copy(center)
        .addScaledVector(normal, Math.cos(angle) * width)
        .addScaledVector(binormal, Math.sin(angle) * thickness);
      positions.push(vertex.x, vertex.y, vertex.z);
      if (i < turns && j < sides) {
        const a = i * (sides + 1) + j;
        const b = a + sides + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // The surface is closed in both directions; average duplicate seam vertices
  // so the metal has no artificial crease in its reflected softboxes.
  const normals = geometry.getAttribute('normal');
  const seamNormal = new THREE.Vector3();
  const seamOther = new THREE.Vector3();
  const smoothPair = (a, b) => {
    seamNormal.fromBufferAttribute(normals, a).add(seamOther.fromBufferAttribute(normals, b)).normalize();
    normals.setXYZ(a, seamNormal.x, seamNormal.y, seamNormal.z);
    normals.setXYZ(b, seamNormal.x, seamNormal.y, seamNormal.z);
  };
  for (let i = 0; i <= turns; i++) smoothPair(i * (sides + 1), i * (sides + 1) + sides);
  for (let j = 0; j <= sides; j++) smoothPair(j, turns * (sides + 1) + j);
  const ribbon = new THREE.Mesh(geometry, chrome);
  body.add(ribbon);
  body.rotation.set(0.25, -0.3, -0.3);

  const makeArc = (radius, start, length, depth, material, thickness = 0.008) => {
    const points = [];
    const segments = smallScreen ? 96 : 160;
    for (let i = 0; i <= segments; i++) {
      const angle = start + i / segments * length;
      points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, Math.sin(angle * 2) * depth));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.Mesh(new THREE.TubeGeometry(curve, segments, thickness, 5, false), material);
  };
  const orange = new THREE.MeshBasicMaterial({ color: 0xff6b2b, toneMapped: false });
  const amber = new THREE.MeshBasicMaterial({ color: 0xffb06b, toneMapped: false });
  const orbitGlowMaterial = new THREE.MeshBasicMaterial({ color: 0xff4d12, transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const arcA = makeArc(2.12, -0.35, Math.PI * 1.62, 0.14, orange);
  const arcAGlow = makeArc(2.12, -0.35, Math.PI * 1.62, 0.14, orbitGlowMaterial, 0.045);
  const arcB = makeArc(2.31, 0.85, Math.PI * 0.74, 0.18, amber, 0.004);
  const orbitA = new THREE.Group();
  orbitA.add(arcA, arcAGlow, arcB);
  orbitA.rotation.set(1.12, -0.29, 0.41);
  orbital.add(orbitA);

  const orbitB = new THREE.Group();
  const fineMaterial = new THREE.MeshBasicMaterial({ color: 0x8b7c61, transparent: true, opacity: 0.35 });
  orbitB.add(makeArc(2.03, 0, Math.PI * 1.15, 0.06, fineMaterial, 0.003));
  orbitB.rotation.set(0.21, 0.95, -0.35);
  orbital.add(orbitB);

  // Satellites provide scale and catch the same studio reflections as the core.
  const satelliteGeometry = new THREE.SphereGeometry(1, smallScreen ? 20 : 32, smallScreen ? 14 : 24);
  const satelliteA = new THREE.Mesh(satelliteGeometry, chrome);
  satelliteA.scale.set(0.12, 0.12, 0.12);
  const satelliteB = new THREE.Mesh(satelliteGeometry, darkChrome);
  satelliteB.scale.set(0.08, 0.08, 0.08);
  sculpture.add(satelliteA, satelliteB);

  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 128;
  const glowContext = glowCanvas.getContext('2d');
  if (glowContext) {
    const gradient = glowContext.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255,209,135,1)');
    gradient.addColorStop(0.08, 'rgba(255,130,49,.85)');
    gradient.addColorStop(0.3, 'rgba(255,90,22,.22)');
    gradient.addColorStop(1, 'rgba(255,76,5,0)');
    glowContext.fillStyle = gradient;
    glowContext.fillRect(0, 0, 128, 128);
  }
  const glowTexture = new THREE.CanvasTexture(glowCanvas);
  const beaconMaterial = new THREE.SpriteMaterial({ map: glowTexture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.8 });
  const beacon = new THREE.Sprite(beaconMaterial);
  beacon.scale.set(0.4, 0.4, 0.4);
  orbitA.add(beacon);
  const hazeMaterial = new THREE.SpriteMaterial({ map: glowTexture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.055 });
  const haze = new THREE.Sprite(hazeMaterial);
  haze.position.set(0.3, 0.15, -2.5);
  haze.scale.set(7, 7, 1);
  scene.add(haze);

  const particleCount = smallScreen ? 75 : 170;
  const dustPositions = new Float32Array(particleCount * 3);
  const dustColors = new Float32Array(particleCount * 3);
  let seed = 7281;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < particleCount; i++) {
    const angle = random() * Math.PI * 2;
    const radius = 2.25 + random() * 2.4;
    dustPositions[i * 3] = Math.cos(angle) * radius;
    dustPositions[i * 3 + 1] = Math.sin(angle) * radius * 0.68;
    dustPositions[i * 3 + 2] = (random() - 0.5) * 5;
    const shade = random() > 0.82 ? new THREE.Color(0xff7b36) : new THREE.Color(0x8e9186);
    dustColors[i * 3] = shade.r;
    dustColors[i * 3 + 1] = shade.g;
    dustColors[i * 3 + 2] = shade.b;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  dustGeometry.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
  const dustMaterial = new THREE.PointsMaterial({ size: 0.018, vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true });
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  scene.add(dust);

  const keyLight = new THREE.DirectionalLight(0xfff8e5, 4.2);
  keyLight.position.set(-3, 4, 5);
  const fillLight = new THREE.DirectionalLight(0xddebe6, 2.6);
  fillLight.position.set(4, 1, 2);
  const orangeLight = new THREE.PointLight(0xff5e16, 22, 10, 2);
  orangeLight.position.set(-2.2, -1.8, 2.6);
  scene.add(keyLight, fillLight, orangeLight, new THREE.AmbientLight(0xded9c5, 0.2));

  let enabled = !reducedMotion;
  let disposed = false;
  let intersecting = true;
  let frame = 0;
  let lastTime = 0;
  let time = 0;
  let impulse = 0;
  let manualTurn = 0;
  let targetPointerX = 0;
  let targetPointerY = 0;
  let pointerX = 0;
  let pointerY = 0;
  let targetScroll = 0;
  let scroll = 0;

  function updateComposition(delta) {
    const easing = enabled ? 1 - Math.exp(-delta * 4.5) : 1;
    pointerX += (targetPointerX - pointerX) * easing;
    pointerY += (targetPointerY - pointerY) * easing;
    scroll += (targetScroll - scroll) * easing;
    impulse *= Math.exp(-delta * 3.2);
    sculpture.rotation.set(
      -0.1 + pointerY * 0.13 + Math.sin(time * 0.22) * 0.04 + scroll * 0.36,
      pointerX * 0.21 + Math.sin(time * 0.18) * 0.15 + scroll * 0.55,
      -0.12 + Math.sin(time * 0.12) * 0.04,
    );
    sculpture.position.set(pointerX * 0.075, Math.sin(time * 0.57) * 0.045 + scroll * 0.24, 0);
    body.rotation.y = -0.3 + time * 0.067 + manualTurn + impulse * 0.42;
    body.rotation.z = -0.3 + Math.sin(time * 0.17) * 0.07 + scroll * 0.35;
    body.scale.setScalar(1 + impulse * 0.055 + scroll * 0.06);
    orbital.scale.setScalar(1 + scroll * 0.26 + impulse * 0.06);
    orbitA.rotation.z = 0.41 + time * 0.027 + scroll * 0.22;
    orbitB.rotation.z = -0.35 - time * 0.036;
    const satelliteAngle = time * 0.12 + 2.7;
    satelliteA.position.set(Math.cos(satelliteAngle) * (2.05 + scroll * 0.5), Math.sin(satelliteAngle) * 1.12, 0.7 + Math.sin(satelliteAngle) * 0.4);
    satelliteB.position.set(Math.cos(satelliteAngle + Math.PI) * 1.85, Math.sin(satelliteAngle + Math.PI) * 1.6, -0.8);
    const beaconAngle = time * 0.2 + 0.2;
    beacon.position.set(Math.cos(beaconAngle) * 2.12, Math.sin(beaconAngle) * 2.12, Math.sin(beaconAngle * 2) * 0.14);
    beaconMaterial.opacity = 0.7 + Math.sin(time * 1.4) * 0.12;
    dust.rotation.z = time * 0.008;
    dust.rotation.y = pointerX * 0.06;
    dust.position.y = scroll * 0.8;
    dustMaterial.opacity = 0.55 * (1 - scroll * 0.5);
    hazeMaterial.opacity = 0.055 + impulse * 0.035;
  }

  function draw() {
    if (!disposed) renderer.render(scene, camera);
  }
  function tick(timestamp) {
    frame = 0;
    if (disposed || !enabled || document.hidden || !intersecting) return;
    const delta = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.05) : 1 / 60;
    lastTime = timestamp;
    time += delta;
    updateComposition(delta);
    draw();
    frame = requestAnimationFrame(tick);
  }
  function start() {
    if (disposed || frame || !enabled || document.hidden || !intersecting) return;
    lastTime = 0;
    frame = requestAnimationFrame(tick);
  }
  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  }
  function resize() {
    if (disposed) return;
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(1, bounds.width);
    const height = Math.max(1, bounds.height);
    camera.aspect = width / height;
    camera.position.z = 9.1 / Math.min(1, camera.aspect / 0.86);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    draw();
  }
  function visibilityChange() {
    if (document.hidden) stop();
    else start();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const intersectionObserver = new IntersectionObserver(entries => {
    intersecting = entries[0]?.isIntersecting ?? true;
    if (intersecting) start(); else stop();
  }, { rootMargin: '100px' });
  intersectionObserver.observe(canvas);
  document.addEventListener('visibilitychange', visibilityChange);
  updateComposition(1 / 60);
  resize();
  onReady();
  start();

  return {
    setPointer(x, y) {
      targetPointerX = THREE.MathUtils.clamp(Number.isFinite(x) ? x : 0, -1, 1);
      targetPointerY = THREE.MathUtils.clamp(Number.isFinite(y) ? y : 0, -1, 1);
      if (!enabled) { updateComposition(0); draw(); }
    },
    setScroll(progress) {
      targetScroll = THREE.MathUtils.clamp(Number.isFinite(progress) ? progress : 0, 0, 1);
      if (!enabled) { updateComposition(0); draw(); }
    },
    setMotion(nextEnabled) {
      enabled = Boolean(nextEnabled);
      if (enabled) start();
      else { stop(); updateComposition(0); draw(); }
    },
    pulse() {
      if (enabled) { impulse = 1; start(); }
      else { manualTurn += 0.32; updateComposition(0); draw(); }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', visibilityChange);
      const geometries = new Set();
      const materials = new Set();
      scene.traverse(object => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
      });
      geometries.forEach(item => item.dispose());
      materials.forEach(item => item.dispose());
      glowTexture.dispose();
      environment.dispose();
      renderer.dispose();
    },
  };
}
