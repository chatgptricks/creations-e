/** Optional, synthesized tactile sounds. Call setEnabled(true) from a user gesture. */
export function createPlaygroundAudio() {
  let context;
  let output;
  let limiter;
  let noiseBuffer;
  let enabled = false;
  let disposed = false;
  const sources = new Set();
  const lastPlayed = new Map();
  const cooldown = { hover: 180, grab: 65, release: 80, mode: 180, open: 200, close: 200, shuffle: 240 };

  function initialize() {
    if (context) return true;
    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContext) return false;
    try {
      context = new AudioContext();
      output = context.createGain();
      output.gain.value = 0;
      limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -20;
      limiter.knee.value = 12;
      limiter.ratio.value = 6;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.08;
      output.connect(limiter);
      limiter.connect(context.destination);
      // Generated noise, not a recording. A shared buffer keeps gestures cheap.
      noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.32), context.sampleRate);
      const samples = noiseBuffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      return true;
    } catch {
      try { context?.close().catch(() => {}); } catch {}
      context = undefined;
      return false;
    }
  }

  /** Resolves false if audio is unavailable or the browser rejects activation. */
  async function setEnabled(nextEnabled) {
    if (disposed) return false;
    enabled = Boolean(nextEnabled);
    if (!enabled) {
      lastPlayed.clear();
      if (context && output) {
        const now = context.currentTime;
        output.gain.cancelScheduledValues(now);
        output.gain.setTargetAtTime(0, now, 0.008);
        for (const source of sources) {
          try { source.stop(now + 0.035); } catch {}
        }
      }
      return false;
    }
    if (!initialize()) { enabled = false; return false; }
    try {
      // Never resume in play(), on visibility changes, or at construction time.
      if (context.state !== 'running') await context.resume();
      if (disposed || !enabled || context.state !== 'running') return false;
      const now = context.currentTime;
      output.gain.cancelScheduledValues(now);
      output.gain.setTargetAtTime(0.32, now, 0.012);
      return true;
    } catch {
      enabled = false;
      return false;
    }
  }

  function voice({ noise = false, frequency = 700, endFrequency = frequency, duration = 0.06, amplitude = 0.1, delay = 0, attack = 0.002, shape = 'triangle', q = 0.8 }) {
    if (sources.size >= 20) return;
    const start = context.currentTime + delay;
    const source = noise ? context.createBufferSource() : context.createOscillator();
    const gain = context.createGain();
    let filter;
    if (noise) {
      source.buffer = noiseBuffer;
      filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = q;
      filter.frequency.setValueAtTime(frequency, start);
      filter.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), start + duration);
      source.connect(filter);
      filter.connect(gain);
    } else {
      source.type = shape;
      source.frequency.setValueAtTime(frequency, start);
      source.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), start + duration);
      source.connect(gain);
    }
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(amplitude, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    gain.connect(output);
    sources.add(source);
    source.onended = () => {
      sources.delete(source);
      source.disconnect();
      filter?.disconnect();
      gain.disconnect();
    };
    source.start(start);
    source.stop(start + duration + 0.008);
  }

  function play(type, pitch = 1) {
    if (disposed || !enabled || !context || context.state !== 'running' || !(type in cooldown)) return;
    const now = context.currentTime * 1000;
    if (now - (lastPlayed.get(type) ?? -Infinity) < cooldown[type]) return;
    // Hover never competes with a just-triggered, more deliberate gesture.
    if (type === 'hover' && (sources.size > 3 || now - (lastPlayed.get('gesture') ?? -Infinity) < 220)) return;
    lastPlayed.set(type, now);
    if (type !== 'hover') lastPlayed.set('gesture', now);
    const tone = Math.min(1.8, Math.max(0.55, Number.isFinite(pitch) ? pitch : 1));
    const synth = options => voice({ ...options, frequency: options.frequency * tone, endFrequency: (options.endFrequency ?? options.frequency) * tone });
    switch (type) {
      case 'hover':
        synth({ frequency: 980, endFrequency: 660, duration: 0.025, amplitude: 0.035, shape: 'sine' });
        break;
      case 'grab':
        synth({ frequency: 380, endFrequency: 210, duration: 0.055, amplitude: 0.13 });
        synth({ noise: true, frequency: 1800, endFrequency: 800, duration: 0.035, amplitude: 0.075 });
        break;
      case 'release':
        synth({ frequency: 280, endFrequency: 120, duration: 0.09, amplitude: 0.16, shape: 'sine' });
        synth({ noise: true, frequency: 1450, endFrequency: 650, duration: 0.045, amplitude: 0.12 });
        break;
      case 'mode':
        [420, 560, 700].forEach((frequency, index) => synth({ frequency, endFrequency: frequency * 0.8, duration: 0.07, amplitude: 0.065, delay: index * 0.038 }));
        synth({ noise: true, frequency: 900, endFrequency: 320, duration: 0.14, amplitude: 0.08 });
        break;
      case 'open':
        synth({ noise: true, frequency: 330, endFrequency: 2200, duration: 0.22, amplitude: 0.14, attack: 0.08, q: 1.1 });
        synth({ frequency: 170, endFrequency: 440, duration: 0.16, amplitude: 0.065, attack: 0.04, shape: 'sine' });
        break;
      case 'close':
        synth({ noise: true, frequency: 2000, endFrequency: 240, duration: 0.18, amplitude: 0.12, attack: 0.025, q: 1.1 });
        synth({ frequency: 360, endFrequency: 100, duration: 0.16, amplitude: 0.08, shape: 'sine' });
        break;
      case 'shuffle':
        [680, 390, 850, 480].forEach((frequency, index) => synth({ frequency, endFrequency: frequency * 0.55, duration: 0.045, amplitude: 0.06, delay: index * 0.035 }));
        break;
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    enabled = false;
    for (const source of sources) {
      try { source.stop(); } catch {}
    }
    sources.clear();
    lastPlayed.clear();
    output?.disconnect();
    limiter?.disconnect();
    if (context) { try { context.close().catch(() => {}); } catch {} }
    noiseBuffer = undefined;
  }

  return { setEnabled, play, dispose };
}
