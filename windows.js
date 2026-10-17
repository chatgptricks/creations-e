/** A small desktop window manager with independent window and application state. */
export function createWindowManager({ layer, taskList, onChange = () => {} }) {
  if (!layer) throw new Error('createWindowManager requires a window layer.');
  const windows = new Map();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let highestZ = 30;
  let activeId = null;
  let cascade = 0;
  let generatedId = 0;

  const workspace = () => {
    const rect = layer.getBoundingClientRect();
    return {
      width: Math.max(1, layer.clientWidth || window.innerWidth),
      height: Math.max(1, layer.clientHeight || window.innerHeight - Math.max(0, rect.top)),
    };
  };
  const isMobile = () => window.innerWidth < 700;
  const motionAllowed = () => !reducedMotion.matches && !document.body.classList.contains('motion-paused');
  const fit = (bounds) => {
    const area = workspace();
    const width = Math.min(Math.max(300, bounds.width), area.width);
    const height = Math.min(Math.max(200, bounds.height), area.height);
    return {
      width, height,
      x: Math.min(Math.max(0, bounds.x), Math.max(0, area.width - width)),
      y: Math.min(Math.max(0, bounds.y), Math.max(0, area.height - height)),
    };
  };
  const emit = () => {
    const states = [...windows.values()].map(({ id, title, minimized, maximized, active }) => ({ id, title, minimized, maximized, active }));
    try { onChange(states); } catch (error) { console.error('Window state callback failed:', error); }
  };
  const layout = (record) => {
    const area = workspace();
    let bounds;
    if (isMobile()) {
      bounds = { x: 6, y: 6, width: Math.max(1, area.width - 12), height: Math.max(1, area.height - 12) };
    } else if (record.maximized) {
      bounds = { x: 0, y: 0, width: area.width, height: area.height };
    } else {
      bounds = fit(record.bounds);
      record.bounds = { ...bounds };
    }
    Object.assign(record.element.style, {
      left: `${bounds.x}px`, top: `${bounds.y}px`, width: `${bounds.width}px`, height: `${bounds.height}px`,
    });
    record.element.classList.toggle('is-maximized', record.maximized);
    record.maximizeButton.classList.toggle('is-restore', record.maximized);
    record.maximizeButton.setAttribute('aria-label', `${record.maximized ? 'Restore' : 'Maximize'} ${record.title}`);
    record.maximizeButton.title = record.maximized ? 'Restore Down' : 'Maximize';
  };
  const syncActive = () => {
    for (const record of windows.values()) {
      record.active = record.id === activeId && !record.minimized;
      record.element.classList.toggle('is-active', record.active);
      record.taskButton?.classList.toggle('is-active', record.active);
      record.taskButton?.setAttribute('aria-pressed', String(record.active));
      record.taskButton?.classList.toggle('is-minimized', record.minimized);
    }
  };
  const raise = (record, focus = false) => {
    if (!record || record.minimized) return;
    activeId = record.id;
    record.z = ++highestZ;
    record.element.style.zIndex = String(record.z);
    syncActive();
    if (focus && !record.element.contains(document.activeElement)) record.element.focus({ preventScroll: true });
    emit();
  };
  const chooseActive = () => {
    const candidates = [...windows.values()].filter((record) => !record.minimized).sort((a, b) => b.z - a.z);
    activeId = candidates[0]?.id || null;
    syncActive();
  };
  const stopAnimation = (record) => {
    record.animation?.cancel();
    record.animation = null;
  };
  const animate = (record, frames, finish) => {
    stopAnimation(record);
    if (!motionAllowed() || typeof record.element.animate !== 'function') {
      finish?.();
      return;
    }
    const animation = record.element.animate(frames, { duration: 150, easing: 'cubic-bezier(.2,.8,.2,1)' });
    record.animation = animation;
    animation.finished.then(() => {
      if (record.animation !== animation) return;
      record.animation = null;
      finish?.();
    }).catch(() => {});
  };
  const applicationTarget = (record) => {
    const taskBounds = record.taskButton?.getBoundingClientRect();
    if (taskBounds?.width && taskBounds?.height) return record.taskButton;
    return document.querySelector('[data-app-switcher-trigger], #app-switcher-button');
  };
  const taskTransform = (record) => {
    const from = record.element.getBoundingClientRect();
    const to = applicationTarget(record)?.getBoundingClientRect();
    const targetX = to?.width ? to.left + to.width / 2 : window.innerWidth - 40;
    const targetY = to?.height ? to.top + to.height / 2 : 16;
    return `translate(${targetX - from.left - from.width / 2}px, ${targetY - from.top - from.height / 2}px) scale(.12, .06)`;
  };

  function minimize(id) {
    const record = windows.get(id);
    if (!record || record.minimized) return;
    record.minimized = true;
    if (record.element.contains(document.activeElement)) applicationTarget(record)?.focus({ preventScroll: true });
    record.element.inert = true;
    record.element.setAttribute('aria-hidden', 'true');
    if (activeId === id) chooseActive();
    else syncActive();
    animate(record, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: taskTransform(record) }], () => {
      if (record.minimized) record.element.hidden = true;
    });
    emit();
  }
  function restore(id) {
    const record = windows.get(id);
    if (!record) return null;
    const wasMinimized = record.minimized;
    stopAnimation(record);
    record.minimized = false;
    record.element.hidden = false;
    record.element.inert = false;
    record.element.removeAttribute('aria-hidden');
    layout(record);
    raise(record, true);
    if (wasMinimized) animate(record, [{ opacity: 0, transform: taskTransform(record) }, { opacity: 1, transform: 'none' }]);
    return record;
  }
  function close(id) {
    const record = windows.get(id);
    if (!record) return;
    const hadFocus = record.element.contains(document.activeElement);
    stopAnimation(record);
    record.abort.abort();
    record.element.remove();
    record.taskButton?.remove();
    windows.delete(id);
    if (activeId === id) chooseActive();
    if (hadFocus && activeId) windows.get(activeId)?.element.focus({ preventScroll: true });
    emit();
    try { record.onClose?.(record); } catch (error) { console.error('Window close callback failed:', error); }
  }
  function toggle(id) {
    const record = windows.get(id);
    if (!record) return null;
    if (record.minimized || activeId !== id) return restore(id);
    minimize(id);
    return record;
  }
  function maximize(record) {
    if (record.maximized) {
      record.maximized = false;
      record.bounds = record.restoreBounds || record.bounds;
    } else {
      record.restoreBounds = { ...record.bounds };
      record.maximized = true;
    }
    layout(record);
    raise(record, true);
  }
  function addIcon(parent, url, className) {
    if (url) {
      const icon = document.createElement('img');
      icon.src = url;
      icon.alt = '';
      icon.draggable = false;
      icon.className = className;
      parent.append(icon);
    } else {
      const icon = document.createElement('span');
      icon.className = `${className} xp-window-icon-fallback`;
      icon.setAttribute('aria-hidden', 'true');
      parent.append(icon);
    }
  }
  function open(config) {
    const id = config.id || `window-${++generatedId}`;
    if (windows.has(id)) return restore(id);
    if (!(config.content instanceof HTMLElement)) throw new TypeError('Window content must be an HTMLElement.');
    const title = String(config.title || 'Untitled');
    const area = workspace();
    const width = Number.isFinite(config.width) ? config.width : 760;
    const height = Number.isFinite(config.height) ? config.height : 520;
    const offset = cascade++ % 5 * 22;
    const abort = new AbortController();
    const listen = (node, event, handler, options = {}) => node.addEventListener(event, handler, { ...options, signal: abort.signal });
    const element = document.createElement('section');
    element.className = 'xp-window';
    element.dataset.windowId = id;
    element.setAttribute('role', 'dialog');
    element.setAttribute('aria-label', title);
    element.tabIndex = -1;
    const titlebar = document.createElement('header');
    titlebar.className = 'xp-window-titlebar';
    const titleElement = document.createElement('span');
    titleElement.className = 'xp-window-title';
    addIcon(titleElement, config.icon, 'xp-window-title-icon');
    const titleText = document.createElement('span');
    titleText.className = 'xp-window-title-text';
    titleText.textContent = title;
    titleElement.append(titleText);
    const controls = document.createElement('div');
    controls.className = 'xp-window-controls';
    const makeControl = (action, label) => {
      const control = document.createElement('button');
      control.type = 'button';
      control.className = `xp-window-control xp-window-${action}`;
      control.title = label;
      control.setAttribute('aria-label', `${label} ${title}`);
      const symbol = document.createElement('span');
      symbol.setAttribute('aria-hidden', 'true');
      control.append(symbol);
      return control;
    };
    const closeButton = makeControl('close', 'Close');
    const maximizeButton = makeControl('maximize', 'Maximize');
    const minimizeButton = makeControl('minimize', 'Collapse');
    controls.append(maximizeButton, minimizeButton);
    titlebar.append(closeButton, titleElement, controls);
    const body = document.createElement('div');
    body.className = 'xp-window-body';
    body.append(config.content);
    const resizeHandle = document.createElement('button');
    resizeHandle.type = 'button';
    resizeHandle.className = 'xp-window-resize';
    resizeHandle.setAttribute('aria-label', `Resize ${title}. Use arrow keys to resize.`);
    resizeHandle.title = 'Resize';
    element.append(titlebar, body, resizeHandle);
    let taskButton = null;
    if (taskList) {
      taskButton = document.createElement('button');
      taskButton.className = 'xp-task-button';
      taskButton.type = 'button';
      taskButton.title = title;
      taskButton.setAttribute('aria-label', `Switch to ${title}`);
      taskButton.setAttribute('aria-pressed', 'false');
      addIcon(taskButton, config.icon, 'xp-task-icon');
      const taskTitle = document.createElement('span');
      taskTitle.textContent = title;
      taskButton.append(taskTitle);
      taskList.append(taskButton);
    }
    const record = {
      id, title, element, content: config.content, body, titlebar, taskButton, maximizeButton,
      minimized: false, maximized: false, active: false, z: highestZ,
      onClose: config.onClose, abort, animation: null,
      bounds: {
        x: Number.isFinite(config.x) ? config.x : Math.max(8, (area.width - width) / 2 + offset),
        y: Number.isFinite(config.y) ? config.y : Math.max(12, (area.height - height) / 2 - 20 + offset),
        width, height,
      },
    };
    windows.set(id, record);
    layer.append(element);
    layout(record);
    listen(element, 'pointerdown', () => raise(record), { capture: true });
    listen(element, 'focusin', () => { if (activeId !== id) raise(record); });
    listen(minimizeButton, 'click', () => minimize(id));
    listen(maximizeButton, 'click', () => maximize(record));
    listen(closeButton, 'click', () => close(id));
    if (taskButton) listen(taskButton, 'click', () => restore(id));
    listen(titlebar, 'dblclick', (event) => {
      if (!event.target.closest('button')) maximize(record);
    });
    let drag = null;
    listen(titlebar, 'pointerdown', (event) => {
      if (event.button !== 0 || event.target.closest('button') || record.maximized || isMobile()) return;
      event.preventDefault();
      drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, bounds: { ...record.bounds } };
      titlebar.setPointerCapture(event.pointerId);
    });
    listen(titlebar, 'pointermove', (event) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      record.bounds = fit({ ...drag.bounds, x: drag.bounds.x + event.clientX - drag.x, y: drag.bounds.y + event.clientY - drag.y });
      layout(record);
    });
    const endDrag = () => { drag = null; };
    listen(titlebar, 'pointerup', endDrag);
    listen(titlebar, 'pointercancel', endDrag);
    listen(titlebar, 'lostpointercapture', endDrag);
    let resize = null;
    listen(resizeHandle, 'pointerdown', (event) => {
      if (event.button !== 0 || record.maximized || isMobile()) return;
      event.preventDefault();
      resize = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, bounds: { ...record.bounds } };
      resizeHandle.setPointerCapture(event.pointerId);
    });
    listen(resizeHandle, 'pointermove', (event) => {
      if (!resize || resize.pointerId !== event.pointerId) return;
      const area = workspace();
      record.bounds = {
        ...resize.bounds,
        width: Math.min(Math.max(300, resize.bounds.width + event.clientX - resize.x), area.width - resize.bounds.x),
        height: Math.min(Math.max(200, resize.bounds.height + event.clientY - resize.y), area.height - resize.bounds.y),
      };
      layout(record);
    });
    const endResize = () => { resize = null; };
    listen(resizeHandle, 'pointerup', endResize);
    listen(resizeHandle, 'pointercancel', endResize);
    listen(resizeHandle, 'lostpointercapture', endResize);
    listen(resizeHandle, 'keydown', (event) => {
      if (!event.key.startsWith('Arrow') || record.maximized || isMobile()) return;
      event.preventDefault();
      const step = event.shiftKey ? 40 : 16;
      const area = workspace();
      record.bounds.width = Math.min(Math.max(300, record.bounds.width + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0)), area.width - record.bounds.x);
      record.bounds.height = Math.min(Math.max(200, record.bounds.height + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0)), area.height - record.bounds.y);
      layout(record);
    });
    raise(record, true);
    animate(record, [{ opacity: 0, transform: 'translateY(8px) scale(.975)' }, { opacity: 1, transform: 'none' }]);
    return record;
  }

  window.addEventListener('resize', () => { for (const record of windows.values()) layout(record); });
  const finishMotion = () => {
    if (!motionAllowed()) for (const record of windows.values()) record.animation?.finish();
  };
  reducedMotion.addEventListener('change', finishMotion);
  new MutationObserver(finishMotion).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  return {
    open, close, minimize, restore, toggle,
    getWindow: (id) => windows.get(id) || null,
    closeAll() { for (const id of [...windows.keys()]) close(id); },
  };
}
