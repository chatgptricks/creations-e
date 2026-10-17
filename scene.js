import * as THREE from './vendor/three.module.min.js';

/** Studio-lit, self-contained chrome sculpture. All reflections are drawn locally. */
export function initScene(canvas, { reducedMotion = false } = {}) {
  const noop = { setMotion() {}, pulse() {}, dispose() {} };
  if (!canvas) return noop;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (_) {
    canvas.classList.add('no-webgl');
    return noop;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x111211, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 50);
  camera.position.set(0, 0.1, 8.5);
  camera.lookAt(0, 0, 0);

  // A panoramic photographic lighting rig: large windows, warm reflectors,
  // and deliberate black strips become the curved highlights in the metal.
  const envCanvas = document.createElement('canvas');
  envCanvas.width = 2048;
  envCanvas.height = 1024;
  const ctx = envCanvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 1024);
    gradient.addColorStop(0, '#595b57');
    gradient.addColorStop(0.38, '#181b19');
    gradient.addColorStop(0.61, '#070907');
    gradient.addColorStop(1, '#34332e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2048, 1024);
    const softbox = (x, y, w, h, color, blur = 16) => {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = blur;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    };
    softbox(150, 110, 280, 570, '#fffdf3', 35);
    softbox(730, 30, 630, 130, '#f1f4ed', 28);
    softbox(1580, 190, 160, 540, '#e4eced', 24);
    softbox(1400, 550, 100, 330, '#ef6b32', 55);
    softbox(440, 730, 520, 100, '#b6b5a9', 30);
    // Window mullions produce a much more convincing metal than uniform light.
    ctx.fillStyle = '#171a17';
    ctx.fillRect(278, 95, 23, 610);
    ctx.fillRect(135, 380, 310, 20);
    ctx.fillRect(1015, 15, 19, 170);
  }
  const panorama = new THREE.CanvasTexture(envCanvas);
  panorama.mapping = THREE.EquirectangularReflectionMapping;
  panorama.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromEquirectangular(panorama);
  scene.environment = environment.texture;
  panorama.dispose();
  pmrem.dispose();

  const sculpture = new THREE.Group();
  scene.add(sculpture);
  const knot = new THREE.TorusKnotGeometry(1.27, 0.405, 320, 48, 2, 3);
  // Give the circular extrusion an organic, gently flattened ribbon profile.
  const positions = knot.attributes.position;
  const sides = 49;
  const center = new THREE.Vector3();
  const vertex = new THREE.Vector3();
  const nextCenter = new THREE.Vector3();
  const previousCenter = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const radial = new THREE.Vector3();
  const binormal = new THREE.Vector3();
  const ringCenters = [];
  for (let i = 0; i <= 320; i++) {
    center.set(0, 0, 0);
    for (let j = 0; j < 48; j++) center.add(vertex.fromBufferAttribute(positions, i * sides + j));
    ringCenters.push(center.clone().multiplyScalar(1 / 48));
  }
  for (let i = 0; i <= 320; i++) {
    center.copy(ringCenters[i]);
    previousCenter.copy(ringCenters[i === 0 ? 319 : i - 1]);
    nextCenter.copy(ringCenters[i === 320 ? 1 : i + 1]);
    tangent.subVectors(nextCenter, previousCenter).normalize();
    radial.fromBufferAttribute(positions, i * sides).sub(center).normalize();
    binormal.crossVectors(tangent, radial).normalize();
    const wave = 1 + Math.sin(i / 320 * Math.PI * 10 + 0.7) * 0.05;
    for (let j = 0; j <= 48; j++) {
      const index = i * sides + j;
      vertex.fromBufferAttribute(positions, index).sub(center);
      const across = vertex.dot(radial);
      const depth = vertex.dot(binormal);
      vertex.copy(center)
        .addScaledVector(radial, across * 1.05 * wave)
        .addScaledVector(binormal, depth * 0.77);
      positions.setXYZ(index, vertex.x, vertex.y, vertex.z);
    }
  }
  knot.computeVertexNormals();

  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xe3e5de,
    metalness: 1,
    roughness: 0.145,
    clearcoat: 0.55,
    clearcoatRoughness: 0.17,
    envMapIntensity: 1.55,
  });
  const mesh = new THREE.Mesh(knot, chrome);
  mesh.rotation.set(0.27, -0.35, -0.55);
  sculpture.add(mesh);

  // A narrow, warm lacquer loop lends scale to the reflective object.
  const orbitMaterial = new THREE.MeshStandardMaterial({
    color: 0xfc6535, metalness: 0.65, roughness: 0.23,
    emissive: 0xa82805, emissiveIntensity: 0.17,
    envMapIntensity: 1,
  });
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(2.09, 0.012, 8, 160), orbitMaterial);
  orbit.rotation.set(1.13, 0.2, -0.38);
  sculpture.add(orbit);

  const satellite = new THREE.Mesh(new THREE.SphereGeometry(0.073, 24, 16), chrome);
  satellite.position.set(1.95, -0.35, 0.64);
  sculpture.add(satellite);

  const lights = [
    [0xfff7e4, 5.2, [-3, 4, 5]],
    [0xe5f4ff, 3.2, [4, 1, -1]],
    [0xff692b, 4.2, [-1, -3, 2]],
  ];
  for (const [color, intensity, position] of lights) {
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(...position);
    scene.add(light);
  }
  scene.add(new THREE.AmbientLight(0xeae7d9, 0.35));

  let enabled = !reducedMotion;
  let visible = true;
  let inViewport = true;
  let disposed = false;
  let frame = 0;
  let lastTime = 0;
  let time = 0;
  let energy = 0;
  let spinAngle = 0;
  let spinSpeed = 0;
  let pointerX = 0;
  let pointerY = 0;
  let smoothX = 0;
  let smoothY = 0;

  const render = (now = 0) => {
    if (disposed) return;
    if (!visible) { frame = 0; lastTime = 0; return; }
    const delta = Math.min(lastTime ? (now - lastTime) / 1000 : 0.016, 0.04);
    lastTime = now;
    if (enabled && visible) time += delta;
    if (enabled) { spinAngle += spinSpeed * delta; spinSpeed *= Math.exp(-delta * 1.8); }
    const follow = 1 - Math.exp(-delta * 3.8);
    smoothX += (pointerX - smoothX) * follow;
    smoothY += (pointerY - smoothY) * follow;
    energy *= Math.exp(-delta * 2.3);
    const motion = enabled ? 1 : 0;
    sculpture.rotation.y = Math.sin(time * 0.24) * 0.28 + smoothX * 0.22 * motion;
    sculpture.rotation.x = Math.sin(time * 0.19 + 0.6) * 0.08 + smoothY * 0.14 * motion;
    sculpture.rotation.z = Math.sin(time * 0.17) * 0.05 + energy * 0.13;
    sculpture.position.y = Math.sin(time * 0.65) * 0.065 * motion;
    mesh.rotation.y = -0.35 + time * 0.055 + spinAngle;
    orbit.rotation.z = -0.38 - time * 0.035;
    const scale = 1 + energy * 0.065;
    sculpture.scale.setScalar(scale);
    renderer.render(scene, camera);
    if (enabled && visible || energy > 0.002 || Math.abs(pointerX - smoothX) > 0.001 || Math.abs(pointerY - smoothY) > 0.001) {
      frame = requestAnimationFrame(render);
    } else {
      frame = 0;
      lastTime = 0;
    }
  };
  const wake = () => {
    if (!frame && !disposed) frame = requestAnimationFrame(render);
  };
  const onPointer = (event) => {
    if (!enabled || !visible) return;
    const bounds = canvas.getBoundingClientRect();
    pointerX = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
    pointerY = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
    wake();
  };
  const onLeave = () => { pointerX = 0; pointerY = 0; wake(); };
  const onVisibility = () => {
    visible = !document.hidden && inViewport;
    if (visible) wake();
  };
  const resize = () => {
    if (disposed) return;
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Keep the loop readable even in a narrow phone viewport.
    camera.position.z = camera.aspect < 0.85 ? 9.5 : 8.5;
    camera.updateProjectionMatrix();
    wake();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  const intersection = new IntersectionObserver(entries => {
    inViewport = entries[0].isIntersecting;
    visible = inViewport && !document.hidden;
    if (visible) wake();
  });
  intersection.observe(canvas);
  window.addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('pointerleave', onLeave);
  document.addEventListener('visibilitychange', onVisibility);
  resize();

  return {
    setMotion(value) {
      enabled = Boolean(value);
      pointerX = 0;
      pointerY = 0;
      wake();
    },
    pulse() {
      if (!enabled) return;
      energy = 1;
      spinSpeed = 8;
      wake();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      knot.dispose();
      orbit.geometry.dispose();
      satellite.geometry.dispose();
      chrome.dispose();
      orbitMaterial.dispose();
      environment.dispose();
      renderer.dispose();
    },
  };
}
