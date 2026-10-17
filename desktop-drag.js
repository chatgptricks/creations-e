const movedPositions = new Map();
const controllers = new WeakMap();
const activeLayouts = new Set();
const ICON_WIDTH = 94;
const ICON_HEIGHT = 90;
const COLUMN_STEP = 98;
const ROW_STEP = 100;
const DRAG_THRESHOLD = 6;

/** Restore the original column order, including any currently rendered desktop. */
export function resetDesktopPositions() {
  movedPositions.clear();
  for (const layout of activeLayouts) layout();
}

/** Add XP-style free icon positioning without changing click/keyboard behavior. */
export function enableDesktopDragging(container) {
  if (!(container instanceof HTMLElement)) return () => {};
  controllers.get(container)?.();
  const desktop = container.parentElement;
  if (!desktop) return () => {};
  const abort = new AbortController();
  const originalContainerStyle = container.getAttribute('style');
  const icons = [...container.children]
    .filter((element) => element instanceof HTMLButtonElement && element.classList.contains('desktop-icon'))
    .map((button, index) => ({
      button, index,
      key: button.dataset.project || button.dataset.shortcut || null,
      originalStyle: button.getAttribute('style'),
      cursor: button.style.cursor,
      zIndex: button.style.zIndex,
      position: { x: 0, y: 0 },
    }));
  const byButton = new Map(icons.map((entry) => [entry.button, entry]));
  const suppressed = new WeakMap();
  let active = null;
  let disposed = false;
  let desktopMode = false;

  const listen = (node, name, handler, options = {}) => {
    node.addEventListener(name, handler, { ...options, signal: abort.signal });
  };
  const restoreStyle = (element, value) => {
    if (value === null) element.removeAttribute('style');
    else element.setAttribute('style', value);
  };
  const area = () => ({
    width: Math.max(0, desktop.clientWidth),
    height: Math.max(0, desktop.clientHeight),
  });
  const bound = (position, size = area()) => ({
    x: Math.round(Math.max(0, Math.min(position.x, Math.max(0, size.width - ICON_WIDTH)))),
    y: Math.round(Math.max(0, Math.min(position.y, Math.max(0, size.height - ICON_HEIGHT)))),
  });
  const positionIcon = (entry, position) => {
    entry.position = position;
    entry.button.style.left = `${position.x}px`;
    entry.button.style.top = `${position.y}px`;
  };
  const releaseDrag = (suppressClick = false) => {
    if (!active) return;
    const { entry, pointerId, moved } = active;
    active = null;
    if (moved && suppressClick) {
      suppressed.set(entry.button, { until: performance.now() + 650, clickPending: true });
    }
    entry.button.style.cursor = entry.cursor;
    entry.button.style.zIndex = entry.zIndex;
    try {
      if (entry.button.hasPointerCapture(pointerId)) entry.button.releasePointerCapture(pointerId);
    } catch (_) { /* The button may have been replaced during a desktop render. */ }
  };
  const layout = () => {
    if (disposed) return;
    releaseDrag(true);
    desktopMode = window.innerWidth >= 700;
    if (!desktopMode) {
      restoreStyle(container, originalContainerStyle);
      for (const entry of icons) restoreStyle(entry.button, entry.originalStyle);
      return;
    }
    Object.assign(container.style, {
      position: 'absolute', inset: '0', display: 'block',
      width: '100%', height: '100%', maxWidth: 'none',
      padding: '0', overflow: 'hidden',
    });
    const size = area();
    const rows = Math.max(1, Math.floor((size.height - 20) / ROW_STEP));
    for (const entry of icons) {
      Object.assign(entry.button.style, {
        position: 'absolute', width: `${ICON_WIDTH}px`, height: `${ICON_HEIGHT}px`,
        margin: '0', transition: 'none',
      });
      const saved = entry.key && movedPositions.get(entry.key);
      const initial = {
        x: 10 + Math.floor(entry.index / rows) * COLUMN_STEP,
        y: 14 + entry.index % rows * ROW_STEP,
      };
      const position = bound(saved || initial, size);
      positionIcon(entry, position);
      if (saved) movedPositions.set(entry.key, position);
    }
  };

  listen(container, 'pointerdown', (event) => {
    if (!desktopMode || event.button !== 0 || event.pointerType === 'touch' || event.isPrimary === false) return;
    const button = event.target instanceof Element ? event.target.closest('button.desktop-icon') : null;
    const entry = byButton.get(button);
    if (!entry) return;
    releaseDrag(true);
    active = {
      entry, pointerId: event.pointerId, x: event.clientX, y: event.clientY,
      origin: { ...entry.position }, moved: false,
    };
    // Capturing does not cancel focus or the browser's normal click sequence.
    try { button.setPointerCapture(event.pointerId); } catch (_) {}
  });
  listen(window, 'pointermove', (event) => {
    if (!active || event.pointerId !== active.pointerId) return;
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    if (!active.moved && Math.hypot(dx, dy) <= DRAG_THRESHOLD) return;
    if (event.cancelable) event.preventDefault();
    if (!active.moved) {
      active.moved = true;
      active.entry.button.style.cursor = 'grabbing';
      active.entry.button.style.zIndex = '3';
    }
    const position = bound({ x: active.origin.x + dx, y: active.origin.y + dy });
    positionIcon(active.entry, position);
    if (active.entry.key) movedPositions.set(active.entry.key, { ...position });
  }, { passive: false });
  const endPointer = (event) => {
    if (active?.pointerId === event.pointerId) releaseDrag(true);
  };
  listen(window, 'pointerup', endPointer);
  listen(window, 'pointercancel', endPointer);
  listen(container, 'lostpointercapture', endPointer);
  listen(container, 'dragstart', (event) => {
    if (desktopMode && event.target instanceof Element && event.target.closest('.desktop-icon')) event.preventDefault();
  });
  const suppressDraggedClick = (event) => {
    // Keyboard activation has detail=0 and must always reach the application.
    if (event.detail === 0) return;
    const button = event.target instanceof Element ? event.target.closest('button.desktop-icon') : null;
    const state = button && suppressed.get(button);
    if (!state) return;
    if (performance.now() > state.until) { suppressed.delete(button); return; }
    if (event.type === 'click' && !state.clickPending) return;
    if (event.type === 'click') state.clickPending = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  listen(container, 'click', suppressDraggedClick, { capture: true });
  listen(container, 'dblclick', suppressDraggedClick, { capture: true });
  listen(window, 'resize', layout);
  // ResizeObserver also handles changes to the desktop's reserved taskbar area.
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(layout) : null;
  observer?.observe(desktop);
  activeLayouts.add(layout);
  layout();

  const cleanup = () => {
    if (disposed) return;
    releaseDrag(false);
    disposed = true;
    abort.abort();
    observer?.disconnect();
    activeLayouts.delete(layout);
    restoreStyle(container, originalContainerStyle);
    for (const entry of icons) restoreStyle(entry.button, entry.originalStyle);
    if (controllers.get(container) === cleanup) controllers.delete(container);
  };
  controllers.set(container, cleanup);
  return cleanup;
}
