import * as THREE from './vendor/three.module.min.js';
import { createProjectObject } from './project-objects.js';

const FEATURED = ['21', '22', '23', '24', 'meme-deck', '03', '09', '07'];
const ARTWORK = { '21': 'engine', '22': 'sentient', '23': 'uss', '24': 'story' };

/** A small, physical world of projects: grab, throw, reorganize, and explore. */
export function createPlayground(canvas, {
  projects = [], onHover = () => {}, onSelect = () => {}, onReady = () => {}, reducedMotion = false,
} = {}) {
  const noop = { setMode() {}, shuffle() {}, focusProject() {}, setMotion() {}, setProjects() {}, dispose() {} };
  if (!canvas) { onReady(); return noop; }
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch {
    canvas.classList.add('no-webgl');
    canvas.parentElement?.classList.add('scene-fallback');
    onReady();
    return noop;
  }

  let mobile = window.innerWidth < 700;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.35 : 1.7));
  renderer.setClearColor(0x11110f, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  canvas.style.touchAction = 'none';

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-8, 8, 5.5, -5.5, 0.1, 80);
  camera.position.set(0, 0, 20);
  camera.lookAt(0, 0, 0);
  const world = new THREE.Group();
  scene.add(world);
  const background = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 70),
    new THREE.ShadowMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }),
  );
  background.position.z = -2.5;
  background.receiveShadow = true;
  scene.add(background);

  // Long reflected windows make even the tiny chrome and glass details tactile.
  const envCanvas = document.createElement('canvas');
  envCanvas.width = 1024;
  envCanvas.height = 512;
  const ctx = envCanvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#9b9b91');
    gradient.addColorStop(0.35, '#41453f');
    gradient.addColorStop(0.57, '#161914');
    gradient.addColorStop(1, '#585344');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 512);
    const softbox = (x, y, width, height, color) => {
      ctx.save(); ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 18;
      ctx.fillRect(x, y, width, height); ctx.restore();
    };
    softbox(60, 60, 175, 340, '#fffbdf');
    softbox(400, 20, 370, 70, '#edf3ee');
    softbox(785, 110, 90, 250, '#f4f0df');
    softbox(610, 300, 65, 210, '#ff7b32');
    ctx.fillStyle = '#161b16';
    ctx.fillRect(135, 55, 9, 355); ctx.fillRect(590, 10, 12, 100);
  }
  const panorama = new THREE.CanvasTexture(envCanvas);
  panorama.mapping = THREE.EquirectangularReflectionMapping;
  panorama.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromEquirectangular(panorama);
  scene.environment = environment.texture;
  panorama.dispose(); pmrem.dispose();

  const key = new THREE.DirectionalLight(0xfff0d5, 3.2);
  key.position.set(-5, 8, 11);
  key.castShadow = true;
  key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  key.shadow.camera.left = key.shadow.camera.bottom = -16;
  key.shadow.camera.right = key.shadow.camera.top = 16;
  key.shadow.camera.near = 1; key.shadow.camera.far = 40;
  key.shadow.bias = -0.00035; key.shadow.normalBias = 0.035;
  key.shadow.radius = 4.5;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xc5d8d0, 1.2);
  fill.position.set(6, -1, 7);
  const warm = new THREE.PointLight(0xff6b28, 28, 18, 2);
  warm.position.set(6, -3, 4);
  scene.add(fill, warm, new THREE.HemisphereLight(0xf5f2df, 0x3b3022, 1.1));

  const textures = new Map();
  const loader = new THREE.TextureLoader();
  let disposed = false;
  for (const [id, imageName] of Object.entries(ARTWORK)) {
    // A real image source exists before any clone or material sees the texture.
    // TextureLoader's initially empty texture must never enter a rendered mesh.
    const placeholder = document.createElement('canvas');
    placeholder.width = 1024;
    placeholder.height = 704;
    const placeholderContext = placeholder.getContext('2d');
    if (placeholderContext) { placeholderContext.fillStyle = '#f4e7cb'; placeholderContext.fillRect(0, 0, placeholder.width, placeholder.height); }
    const texture = new THREE.CanvasTexture(placeholder);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    textures.set(id, texture);
    loader.load(`./assets/work/${imageName}.webp`, loaded => {
      if (disposed) { loaded.dispose(); return; }
      // Paint into the existing fixed-size source. Replacing a 2px image with a
      // large image can leave WebGL's immutable storage at the original size.
      placeholderContext?.drawImage(loaded.image, 0, 0, placeholder.width, placeholder.height);
      texture.needsUpdate = true;
      // Page spreads use repeat/offset clones sharing this same source image.
      world.traverse(child => {
        const materials = child.material ? (Array.isArray(child.material) ? child.material : [child.material]) : [];
        materials.forEach(material => {
          if (material.map?.source === texture.source) material.map.needsUpdate = true;
          if (material.emissiveMap?.source === texture.source) material.emissiveMap.needsUpdate = true;
        });
      });
      loaded.dispose();
      draw();
    }, undefined, () => {});
  }

  const dustCount = mobile ? 55 : 110;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    const phase = i * 2.399963;
    const radius = 2 + Math.sqrt(i / dustCount) * 12;
    dustPositions[i * 3] = Math.cos(phase) * radius;
    dustPositions[i * 3 + 1] = Math.sin(phase) * radius * 0.7;
    dustPositions[i * 3 + 2] = -1.8 + (i % 11) * 0.17;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMaterial = new THREE.PointsMaterial({ color: 0xcfc3a4, size: 0.014, sizeAttenuation: true, transparent: true, opacity: 0.24, depthWrite: false });
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  scene.add(dust);

  let catalogue = normalizeProjects(projects);
  let items = [];
  let mode = 'drift';
  let motion = !reducedMotion;
  let intersecting = true;
  let frame = 0;
  let lastTime = 0;
  let time = 0;
  let width = 1, height = 1, worldWidth = 16, worldHeight = 11;
  let hovered = null;
  let focused = null;
  let focusUntil = 0;
  let drag = null;
  let pointerX = 0, pointerY = 0;
  const pan = new THREE.Vector2();
  const targetPan = new THREE.Vector2();
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const intersection = new THREE.Vector3();
  const spare = new THREE.Vector3();
  const boundsPadding = () => mobile ? 0.32 : 0.65;

  function normalizeProjects(input) {
    return Array.isArray(input) ? input : Array.isArray(input?.projects) ? input.projects : [];
  }
  function baseScale() { return mobile ? 0.86 : Math.min(1.25, Math.max(0.88, worldWidth / 14.2)); }
  function itemScale(item) { return baseScale() * (mode === 'grid' ? 1 : mobile ? 1 + (item.scaleVariation - 1) * 0.5 : item.scaleVariation); }
  function verticalInsets() { return { top: Math.min(100, height * 0.16) / height * worldHeight, bottom: Math.min(mobile ? 145 : 115, height * 0.23) / height * worldHeight }; }
  function disposeObject(object, force = false) {
    const liveGeometry = new Set(), liveMaterials = new Set(), liveTextures = new Set(textures.values());
    if (!force) world.traverse(child => {
      if (child.geometry) liveGeometry.add(child.geometry);
      const materials = child.material ? (Array.isArray(child.material) ? child.material : [child.material]) : [];
      materials.forEach(material => {
        liveMaterials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) liveTextures.add(value);
      });
    });
    const geometrySet = new Set(), materialSet = new Set(), mapSet = new Set();
    object.traverse(child => {
      if (child.geometry) geometrySet.add(child.geometry);
      if (child.material) (Array.isArray(child.material) ? child.material : [child.material]).forEach(material => {
        materialSet.add(material);
        for (const value of Object.values(material)) if (value?.isTexture && ![...textures.values()].includes(value)) mapSet.add(value);
      });
    });
    geometrySet.forEach(value => { if (!liveGeometry.has(value)) value.dispose(); });
    materialSet.forEach(value => { if (!liveMaterials.has(value)) value.dispose(); });
    mapSet.forEach(value => { if (!liveTextures.has(value)) value.dispose(); });
  }
  function makeItem(project, index) {
    const group = new THREE.Group();
    const model = createProjectObject(project, textures.get(String(project.id)) || null);
    model.userData.ready?.then(() => { if (!disposed) draw(); });
    group.add(model);
    group.userData.projectId = String(project.id);
    model.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
    world.add(group);
    const phase = index * 2.39996;
    return {
      project, group, model, phase, radius: model.userData.radius || 1.25,
      velocity: new THREE.Vector2(Math.cos(phase) * 0.12, Math.sin(phase) * 0.1),
      rotation: [-0.12, 0.08, -0.25, 0.15, 0.16, -0.18, 0.09, -0.10][index % 8],
      scaleVariation: [0.97, 1.14, 1.16, 1.04, 1.11, 0.89, 1.03, 0.88][index % 8],
      depth: [-0.3, 0.35, 1.7, 0.1, 0.9, -0.1, 0.35, 1.1][index % 8],
      angularVelocity: 0, hover: 0, target: new THREE.Vector2(), focus: 0,
    };
  }
  function preferredProjects() {
    const ranked = [...catalogue].sort((a, b) => {
      const aRank = FEATURED.indexOf(String(a.id)), bRank = FEATURED.indexOf(String(b.id));
      return (aRank < 0 ? 99 : aRank) - (bRank < 0 ? 99 : bRank);
    });
    return ranked.slice(0, 8);
  }
  function initialPosition(index, count = items.length) {
    const columns = mobile ? 2 : 4;
    const rows = Math.ceil(count / columns);
    const column = index % columns, row = Math.floor(index / columns);
    const spacingX = mobile ? worldWidth * 0.48 : Math.min(4.4, worldWidth * 0.235);
    const insets = verticalInsets();
    const availableHeight = worldHeight - insets.top - insets.bottom;
    const spacingY = availableHeight / rows;
    const x = (column - (columns - 1) / 2) * spacingX;
    const y = worldHeight / 2 - insets.top - spacingY * (row + 0.5);
    return new THREE.Vector2(x, y);
  }
  function orbitPosition(index, phase = time * 0.09) {
    const insets = verticalInsets();
    const availableHeight = worldHeight - insets.top - insets.bottom;
    const margin = Math.max(...items.map(item => item.radius * itemScale(item)), 1) * 0.96;
    const angle = index / Math.max(1, items.length) * Math.PI * 2 + phase - Math.PI / 2;
    return new THREE.Vector2(
      Math.cos(angle) * worldWidth * (mobile ? 0.28 : 0.35),
      Math.sin(angle) * Math.max(1, availableHeight / 2 - margin) + (insets.bottom - insets.top) / 2,
    );
  }
  function layout(immediate = false) {
    items.forEach((item, index) => {
      const target = initialPosition(index);
      item.target.copy(target);
      const scale = itemScale(item);
      item.group.scale.setScalar(scale);
      if (immediate) {
        item.group.position.set(target.x, target.y, item.depth);
        if (mode === 'drift' && !mobile) {
          const offsets = [[-.36,.04],[-.19,.20],[.12,.20],[.36,.06],[-.29,-.22],[-.03,-.04],[.12,-.22],[.36,-.23]];
          const [x, y] = offsets[index % offsets.length];
          item.group.position.x = x * worldWidth;
          item.group.position.y = y * worldHeight;
        } else if (mode === 'drift' && mobile) {
          item.group.position.x += Math.sin(item.phase) * 0.08;
          item.group.position.y += Math.cos(item.phase) * 0.15;
        }
      }
    });
  }
  function populate() {
    setHovered(null);
    items.forEach(item => { world.remove(item.group); disposeObject(item.group); });
    items = preferredProjects().map(makeItem);
    layout(true);
  }
  function setHovered(item) {
    if (hovered === item) return;
    hovered = item;
    canvas.style.cursor = drag ? 'grabbing' : item ? 'grab' : 'default';
    onHover(item?.project || null);
  }
  function setRay(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    pointerX = pointer.x; pointerY = pointer.y;
    raycaster.setFromCamera(pointer, camera);
  }
  function pick(event) {
    setRay(event);
    const hit = raycaster.intersectObjects(items.map(item => item.group), true)[0];
    if (!hit) return null;
    let object = hit.object;
    while (object && !object.userData.projectId) object = object.parent;
    return items.find(item => String(item.project.id) === object?.userData.projectId) || null;
  }
  function pointOnPlane(event, z = 0) {
    setRay(event);
    dragPlane.constant = -z;
    return raycaster.ray.intersectPlane(dragPlane, intersection);
  }
  function onPointerDown(event) {
    if (event.button !== 0 || drag) return;
    const item = pick(event);
    const point = pointOnPlane(event, item?.group.position.z || 0);
    if (!point) return;
    drag = {
      pointerId: event.pointerId, item, startX: event.clientX, startY: event.clientY,
      lastX: event.clientX, lastY: event.clientY, moved: false, lastTime: performance.now(),
      offset: item ? item.group.position.clone().sub(point) : new THREE.Vector3(),
      velocity: new THREE.Vector2(),
    };
    if (item) { item.velocity.set(0, 0); item.angularVelocity = 0; focused = null; }
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = 'grabbing';
    setHovered(item);
    event.preventDefault();
    draw();
  }
  function onPointerMove(event) {
    if (!drag) { setHovered(pick(event)); if (!motion) { updateVisuals(1); draw(); } return; }
    if (event.pointerId !== drag.pointerId) return;
    const now = performance.now();
    const delta = Math.max((now - drag.lastTime) / 1000, 0.008);
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 7) drag.moved = true;
    if (drag.item) {
      const point = pointOnPlane(event, drag.item.group.position.z);
      if (point) {
        spare.copy(point).add(drag.offset);
        drag.velocity.set((spare.x - drag.item.group.position.x) / delta, (spare.y - drag.item.group.position.y) / delta).clampLength(0, 14);
        drag.item.group.position.x = spare.x;
        drag.item.group.position.y = spare.y;
        constrain(drag.item, false);
      }
    } else {
      targetPan.x -= (event.clientX - drag.lastX) / width * worldWidth;
      targetPan.y += (event.clientY - drag.lastY) / height * worldHeight;
      targetPan.x = THREE.MathUtils.clamp(targetPan.x, -worldWidth * 0.3, worldWidth * 0.3);
      targetPan.y = THREE.MathUtils.clamp(targetPan.y, -worldHeight * 0.25, worldHeight * 0.25);
      pan.copy(targetPan); updateCamera();
    }
    drag.lastX = event.clientX; drag.lastY = event.clientY; drag.lastTime = now;
    if (!motion) { collide(); updateVisuals(1); }
    draw(); event.preventDefault();
  }
  function finishPointer(event, cancelled = false) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const previous = drag;
    drag = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (previous.item) {
      if (cancelled) {
        previous.item.velocity.set(0, 0);
        previous.item.angularVelocity = 0;
      } else if (previous.moved && motion) {
        previous.item.velocity.copy(previous.velocity);
        previous.item.angularVelocity = THREE.MathUtils.clamp(previous.velocity.x * -0.07, -0.8, 0.8);
      } else if (!previous.moved && !cancelled) onSelect(previous.item.project);
    }
    canvas.style.cursor = hovered ? 'grab' : 'default';
    if (event.pointerType === 'touch' || cancelled) setHovered(null);
    start();
  }
  function onPointerUp(event) { finishPointer(event); }
  function onPointerCancel(event) { finishPointer(event, true); }
  function onLostPointerCapture(event) { finishPointer(event, true); }
  function onWindowBlur() {
    if (drag) finishPointer({ pointerId: drag.pointerId, pointerType: 'blur' }, true);
  }
  function onPointerLeave() { if (!drag) setHovered(null); }

  function constrain(item, bounce = true) {
    const radius = item.radius * itemScale(item) * 0.72;
    const minX = -worldWidth / 2 + radius + boundsPadding();
    const maxX = worldWidth / 2 - radius - boundsPadding();
    const insets = verticalInsets();
    const verticalRadius = item.radius * itemScale(item) * 0.96;
    const minY = -worldHeight / 2 + verticalRadius + insets.bottom;
    const maxY = worldHeight / 2 - verticalRadius - insets.top;
    if (item.group.position.x < minX) { item.group.position.x = minX; if (bounce) item.velocity.x = Math.abs(item.velocity.x) * 0.72; }
    if (item.group.position.x > maxX) { item.group.position.x = maxX; if (bounce) item.velocity.x = -Math.abs(item.velocity.x) * 0.72; }
    if (item.group.position.y < minY) {
      item.group.position.y = minY;
      if (bounce) { item.velocity.y = Math.abs(item.velocity.y) * (mode === 'gravity' ? 0.42 : 0.72); item.velocity.x *= mode === 'gravity' ? 0.92 : 1; }
    }
    if (item.group.position.y > maxY) { item.group.position.y = maxY; if (bounce) item.velocity.y = -Math.abs(item.velocity.y) * 0.72; }
  }
  function collide() {
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      let dx = b.group.position.x - a.group.position.x;
      let dy = b.group.position.y - a.group.position.y;
      const distance = Math.hypot(dx, dy);
      const minimum = (a.radius * itemScale(a) + b.radius * itemScale(b)) * (mobile ? 0.66 : 0.70);
      if (distance >= minimum) continue;
      if (distance < 0.0001) { dx = 0.001; dy = 0; }
      const divisor = Math.max(distance, 0.001), nx = dx / divisor, ny = dy / divisor;
      const invA = drag?.item === a ? 0 : 1, invB = drag?.item === b ? 0 : 1;
      const total = invA + invB || 1;
      const correction = (minimum - divisor) * 0.75 / total;
      a.group.position.x -= nx * correction * invA; a.group.position.y -= ny * correction * invA;
      b.group.position.x += nx * correction * invB; b.group.position.y += ny * correction * invB;
      const closing = (b.velocity.x - a.velocity.x) * nx + (b.velocity.y - a.velocity.y) * ny;
      if (closing < 0) {
        const impulse = -(mode === 'gravity' ? 1.35 : 1.7) * closing / total;
        a.velocity.x -= impulse * nx * invA; a.velocity.y -= impulse * ny * invA;
        b.velocity.x += impulse * nx * invB; b.velocity.y += impulse * ny * invB;
      }
    }
  }
  function updatePhysics(delta) {
    const steps = mode === 'gravity' ? 3 : 2;
    const dt = delta / steps;
    for (let step = 0; step < steps; step++) {
      items.forEach((item, index) => {
        if (drag?.item === item) return;
        let target = item.target;
        if (mode === 'orbit') {
          item.target.copy(orbitPosition(index));
        } else if (mode === 'grid') item.target.copy(initialPosition(index));
        if (focused === item && time < focusUntil) target = new THREE.Vector2(0, 0);
        if (mode === 'gravity' && focused !== item) item.velocity.y -= 5.8 * dt;
        else if (mode === 'orbit' || mode === 'grid' || focused === item) {
          item.velocity.x += (target.x - item.group.position.x) * 6.2 * dt;
          item.velocity.y += (target.y - item.group.position.y) * 6.2 * dt;
          item.velocity.multiplyScalar(Math.exp(-dt * 3.8));
        } else {
          item.velocity.x += Math.sin(time * 0.4 + item.phase) * 0.016 * dt;
          item.velocity.y += Math.cos(time * 0.37 + item.phase) * 0.014 * dt;
          item.velocity.multiplyScalar(Math.exp(-dt * 0.08));
        }
        item.group.position.x += item.velocity.x * dt;
        item.group.position.y += item.velocity.y * dt;
        constrain(item);
      });
      if (mode !== 'orbit') {
        collide();
        // Pair separation can push the lowest item through the floor; reassert
        // the safe viewport boundary after solving contacts, not just before.
        items.forEach(item => constrain(item));
      }
    }
    if (focused && time > focusUntil) focused = null;
  }
  function updateCamera() {
    camera.position.x = pan.x; camera.position.y = pan.y;
    camera.lookAt(pan.x, pan.y, 0);
  }
  function updateVisuals(delta) {
    const blend = motion ? 1 - Math.exp(-delta * 8) : 1;
    items.forEach((item, index) => {
      const active = item === hovered || item === focused || drag?.item === item;
      item.hover += ((active ? 1 : 0) - item.hover) * blend;
      item.rotation += item.angularVelocity * (motion ? delta : 0);
      item.angularVelocity *= Math.exp(-delta * 1.4);
      const tilt = mode === 'grid' ? 0 : 1;
      item.group.rotation.set(
        -0.08 + Math.sin(time * 0.36 + item.phase) * 0.08 * tilt + (active ? pointerY * -0.06 : 0),
        Math.cos(time * 0.29 + item.phase) * 0.23 * tilt + (active ? pointerX * 0.08 : 0),
        item.rotation * tilt + Math.sin(time * 0.27 + item.phase) * 0.035 * tilt,
      );
      item.group.scale.setScalar(itemScale(item) * (1 + item.hover * 0.075));
      item.group.position.z += ((item.depth + item.hover * 0.6) - item.group.position.z) * blend;
      if (typeof item.model.userData.animate === 'function') item.model.userData.animate(time, item.hover);
    });
    dust.rotation.z = time * 0.003;
    if (!drag) {
      pan.lerp(targetPan, blend * 0.3);
      updateCamera();
    }
  }
  function draw() { if (!disposed) renderer.render(scene, camera); }
  function tick(timestamp) {
    frame = 0;
    if (disposed || !motion || !intersecting || document.hidden) return;
    const delta = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.035) : 1 / 60;
    lastTime = timestamp; time += delta;
    updatePhysics(delta); updateVisuals(delta); draw();
    frame = requestAnimationFrame(tick);
  }
  function start() {
    if (disposed || frame || !motion || !intersecting || document.hidden) return;
    lastTime = 0; frame = requestAnimationFrame(tick);
  }
  function stop() { if (frame) cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
  function resize() {
    if (disposed) return;
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    mobile = width < 700;
    worldHeight = mobile ? 12.3 : 11;
    worldWidth = worldHeight * width / height;
    // Very wide displays should enlarge the objects instead of creating a desert.
    if (worldWidth > 22) { worldWidth = 22; worldHeight = worldWidth * height / width; }
    camera.left = -worldWidth / 2; camera.right = worldWidth / 2;
    camera.top = worldHeight / 2; camera.bottom = -worldHeight / 2;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.35 : 1.7));
    renderer.setSize(width, height, false);
    pan.set(0, 0); targetPan.set(0, 0); updateCamera();
    layout(true); updateVisuals(0); draw();
  }
  function visibilityChange() { if (document.hidden) { onWindowBlur(); stop(); } else start(); }
  const resizeObserver = new ResizeObserver(resize);
  const intersectionObserver = new IntersectionObserver(entries => {
    intersecting = entries[0]?.isIntersecting ?? true;
    if (intersecting) start(); else stop();
  }, { rootMargin: '50px' });
  const eventOptions = { passive: false };
  canvas.addEventListener('pointerdown', onPointerDown, eventOptions);
  canvas.addEventListener('pointermove', onPointerMove, eventOptions);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('lostpointercapture', onLostPointerCapture);
  window.addEventListener('blur', onWindowBlur);
  canvas.addEventListener('pointerleave', onPointerLeave);
  document.addEventListener('visibilitychange', visibilityChange);
  populate(); resize();
  resizeObserver.observe(canvas); intersectionObserver.observe(canvas);
  onReady(); start();

  return {
    setMode(nextMode) {
      if (!['drift', 'gravity', 'orbit', 'grid'].includes(nextMode)) return;
      mode = nextMode; focused = null;
      items.forEach(item => { item.velocity.multiplyScalar(0.4); });
      if (!motion) {
        layout(true);
        if (mode === 'gravity') items.forEach(item => { item.group.position.y = -worldHeight / 2 + item.radius * itemScale(item) + verticalInsets().bottom; });
        if (mode === 'orbit') items.forEach((item, index) => {
          const target = orbitPosition(index, 0);
          item.group.position.x = target.x;
          item.group.position.y = target.y;
        });
        for (let i = 0; i < 6; i++) { collide(); items.forEach(item => constrain(item, false)); }
        updateVisuals(0); draw();
      }
      start();
    },
    shuffle() {
      focused = null;
      pan.set(0, 0); targetPan.set(0, 0); updateCamera();
      items.forEach((item, index) => {
        const angle = Math.random() * Math.PI * 2;
        item.velocity.set(Math.cos(angle) * (4 + Math.random() * 4), Math.sin(angle) * (3 + Math.random() * 4));
        item.angularVelocity = (Math.random() - 0.5) * 2.3;
        if (!motion) {
          const target = initialPosition((index + 3) % items.length);
          item.group.position.set(target.x, target.y, 0);
          item.rotation = (Math.random() - 0.5) * 0.4;
        }
      });
      updateVisuals(0); draw(); start();
    },
    focusProject(id) {
      const project = catalogue.find(candidate => String(candidate.id) === String(id));
      if (!project) return;
      let item = items.find(candidate => String(candidate.project.id) === String(id));
      if (!item) {
        const removed = items.pop();
        if (removed) { if (drag?.item === removed) drag = null; world.remove(removed.group); disposeObject(removed.group); }
        item = makeItem(project, items.length);
        item.group.position.set(worldWidth * 0.38, 0, 0);
        items.push(item);
      }
      focused = item; focusUntil = time + 4.2;
      item.velocity.set(0, 0);
      targetPan.set(0, 0); pan.set(0, 0); updateCamera();
      setHovered(item);
      if (!motion) { item.group.position.set(0, 0, 0.5); collide(); updateVisuals(0); draw(); }
      start();
    },
    setMotion(enabled) {
      motion = Boolean(enabled);
      if (motion) start(); else { stop(); updateVisuals(0); draw(); }
    },
    setProjects(nextProjects) {
      catalogue = normalizeProjects(nextProjects);
      focused = null;
      if (drag) { if (canvas.hasPointerCapture(drag.pointerId)) canvas.releasePointerCapture(drag.pointerId); drag = null; }
      populate(); updateVisuals(0); draw(); start();
    },
    dispose() {
      if (disposed) return;
      disposed = true; stop();
      resizeObserver.disconnect(); intersectionObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('lostpointercapture', onLostPointerCapture);
      window.removeEventListener('blur', onWindowBlur);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', visibilityChange);
      if (drag && canvas.hasPointerCapture(drag.pointerId)) canvas.releasePointerCapture(drag.pointerId);
      setHovered(null);
      disposeObject(world, true);
      background.geometry.dispose(); background.material.dispose();
      dustGeometry.dispose(); dustMaterial.dispose();
      textures.forEach(texture => texture.dispose()); environment.dispose();
      key.shadow.map?.dispose(); renderer.dispose();
    },
  };
}
