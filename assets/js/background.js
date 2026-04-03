const TAU = Math.PI * 2;
const COLOR_DARK = ['#7dd3fc', '#93c5fd', '#86efac', '#fcd34d', '#c4b5fd', '#f9a8d4', '#fca5a5'];
const COLOR_LIGHT = ['#2563eb', '#0284c7', '#16a34a', '#b45309', '#7c3aed', '#db2777', '#dc2626'];

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function choice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function vec3(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scale(v, s) {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

function length(v) {
  return Math.hypot(v.x, v.y, v.z);
}

function normalize(v, fallback = vec3(1, 0, 0)) {
  const mag = length(v);
  if (mag < 1e-6) return { ...fallback };
  return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
}

function rotatePoint(point, yaw, pitch, roll) {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);

  const x1 = point.x * cy - point.z * sy;
  const z1 = point.x * sy + point.z * cy;

  const y2 = point.y * cp - z1 * sp;
  const z2 = point.y * sp + z1 * cp;

  return {
    x: x1 * cr - y2 * sr,
    y: x1 * sr + y2 * cr,
    z: z2
  };
}

function readThemeColors() {
  const theme = document.documentElement.dataset.theme || 'dark';
  return theme === 'light' ? COLOR_LIGHT : COLOR_DARK;
}

function readBackdrop() {
  const styles = getComputedStyle(document.documentElement);
  return {
    bgA: styles.getPropertyValue('--field-backdrop-1').trim() || 'rgba(8,12,24,0.95)',
    bgB: styles.getPropertyValue('--field-backdrop-2').trim() || 'rgba(3,8,18,0.95)',
    glowA: styles.getPropertyValue('--field-glow-a').trim() || 'rgba(143,243,255,0.08)',
    glowB: styles.getPropertyValue('--field-glow-b').trim() || 'rgba(136,164,255,0.06)',
    particleSoft: styles.getPropertyValue('--field-particle-soft').trim() || 'rgba(143,243,255,0.18)',
    halo: styles.getPropertyValue('--field-halo').trim() || 'rgba(143,243,255,0.14)'
  };
}

function hslFromHex(hex) {
  const value = hex.replace('#', '');
  const size = value.length === 3 ? 1 : 2;
  const parts = size === 1
    ? value.split('').map((item) => parseInt(item + item, 16) / 255)
    : [0, 1, 2].map((index) => parseInt(value.slice(index * 2, index * 2 + 2), 16) / 255);
  const [r, g, b] = parts;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) * 0.5;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function tone(hex, lShift = 0, sShift = 0, alpha = 1) {
  const { h, s, l } = hslFromHex(hex);
  return `hsla(${h.toFixed(1)}, ${clamp(s + sShift, 15, 98).toFixed(1)}%, ${clamp(l + lShift, 10, 95).toFixed(1)}%, ${alpha})`;
}

function buildRandomWalk(count, step, stiffness = 0.78) {
  const points = [vec3(0, 0, 0)];
  let tangent = normalize(vec3(rand(-1, 1), rand(-1, 1), rand(-0.7, 0.7)), vec3(1, 0, 0));
  for (let index = 1; index < count; index += 1) {
    const noise = normalize(vec3(rand(-1, 1), rand(-1, 1), rand(-1, 1)), vec3(0, 1, 0));
    tangent = normalize(add(scale(tangent, stiffness), scale(noise, 1 - stiffness)), tangent);
    points.push(add(points[index - 1], scale(tangent, step)));
  }
  const centroid = points.reduce((acc, point) => add(acc, point), vec3(0, 0, 0));
  const center = scale(centroid, 1 / points.length);
  return points.map((point) => sub(point, center));
}

function buildHairpin(count, step) {
  const half = Math.max(4, Math.floor(count * 0.55));
  const first = buildRandomWalk(half, step, 0.88);
  const last = first[first.length - 1];
  const second = [];
  for (let i = 1; i < count - half + 1; i += 1) {
    const back = i / Math.max(1, count - half);
    const bend = Math.sin(back * Math.PI) * step * 2.4;
    second.push(vec3(last.x - back * step * (half - 1), last.y + bend * (rand(0.9, 1.1)), last.z + bend * 0.38));
  }
  const raw = [...first, ...second];
  const centroid = raw.reduce((acc, point) => add(acc, point), vec3(0, 0, 0));
  const center = scale(centroid, 1 / raw.length);
  return raw.map((point) => sub(point, center));
}

function buildFolded(count, step) {
  const raw = [];
  const total = count - 1;
  for (let i = 0; i < count; i += 1) {
    const u = i / Math.max(1, total);
    const x = (u - 0.5) * step * total * 0.72;
    const y = Math.sin(u * Math.PI * 2.4) * step * 2.8 + Math.sin(u * Math.PI * 5.1) * step * 0.8;
    const z = Math.cos(u * Math.PI * 2.1) * step * 1.4;
    raw.push(vec3(x, y, z));
  }
  const centroid = raw.reduce((acc, point) => add(acc, point), vec3(0, 0, 0));
  const center = scale(centroid, 1 / raw.length);
  return raw.map((point) => sub(point, center));
}

function buildRing(count, radius) {
  const raw = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * TAU;
    const r = radius * rand(0.92, 1.08);
    raw.push(vec3(
      Math.cos(angle) * r,
      Math.sin(angle) * r * rand(0.88, 1.08),
      Math.sin(angle * 2.1 + rand(-0.25, 0.25)) * radius * 0.32
    ));
  }
  return raw;
}

function createBaseShape(kind, count, step) {
  if (kind === 'ring') return buildRing(count, step * count * 0.15);
  if (kind === 'hairpin') return buildHairpin(count, step);
  if (kind === 'folded') return buildFolded(count, step);
  return buildRandomWalk(count, step, 0.82);
}

function computeFrames(points) {
  return points.map((point, index) => {
    const prev = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const tangent = normalize(sub(next, prev), vec3(1, 0, 0));
    const up = Math.abs(dot(tangent, vec3(0, 0, 1))) > 0.86 ? vec3(0, 1, 0) : vec3(0, 0, 1);
    const normal = normalize(cross(tangent, up), vec3(0, 1, 0));
    const binormal = normalize(cross(tangent, normal), vec3(0, 0, 1));
    return { point, tangent, normal, binormal };
  });
}

function createChain(state, index, variant) {
  const kind = choice(['linear', 'linear', 'hairpin', 'folded', 'ring']);
  const count = kind === 'ring' ? Math.round(rand(18, 26)) : Math.round(rand(14, 24));
  const step = variant === 'hero' ? rand(13, 18) : rand(12, 16);
  const base = createBaseShape(kind, count, step);
  const frames = computeFrames(base);
  const color = state.chainColors[index % state.chainColors.length];
  const margin = variant === 'hero' ? 90 : 64;
  const anchor0 = vec3(
    rand(margin, state.width - margin),
    rand(margin, state.height - margin),
    rand(0.08, 1)
  );
  return {
    kind,
    color,
    shadow: tone(color, -24, -10, 0.22),
    bond: tone(color, -6, 6, 0.22),
    bondGlow: tone(color, 18, 8, 0.12),
    beadLight: tone(color, 26, -8, 1),
    beadDark: tone(color, -10, 6, 1),
    anchor0,
    wander: {
      rx: rand(18, variant === 'hero' ? 42 : 24),
      ry: rand(14, variant === 'hero' ? 32 : 20),
      rz: rand(0.06, 0.2),
      wx: rand(0.08, 0.18),
      wy: rand(0.06, 0.16),
      wz: rand(0.05, 0.12),
      px: rand(0, TAU),
      py: rand(0, TAU),
      pz: rand(0, TAU)
    },
    orient: {
      yaw: rand(-0.4, 0.4),
      pitch: rand(-0.35, 0.35),
      roll: rand(-0.25, 0.25),
      wy: rand(0.04, 0.1),
      wp: rand(0.03, 0.08),
      wr: rand(0.03, 0.07),
      py: rand(0, TAU),
      pp: rand(0, TAU),
      pr: rand(0, TAU)
    },
    osc: {
      a1: rand(3.2, 8.6),
      a2: rand(2.6, 7.2),
      a3: rand(0.9, 2.8),
      az: rand(2.2, 6.4),
      w1: rand(0.7, 1.15),
      w2: rand(0.4, 0.85),
      w3: rand(0.18, 0.42),
      s1: rand(0.36, 0.74),
      s2: rand(0.21, 0.56),
      s3: rand(0.14, 0.28),
      p1: rand(0, TAU),
      p2: rand(0, TAU),
      p3: rand(0, TAU)
    },
    beadRadius: rand(4.4, 7.8),
    bondWidth: rand(1.3, 2.6),
    base,
    frames,
    world: []
  };
}

function createParticle(state) {
  return {
    x: rand(-40, state.width + 40),
    y: rand(-40, state.height + 40),
    z: rand(0.02, 1.15),
    vx: rand(-18, 18),
    vy: rand(-16, 16),
    vz: rand(-0.03, 0.03),
    radius: rand(1.4, 4.8),
    drift: rand(0.2, 0.9),
    phase: rand(0, TAU),
    color: choice(state.chainColors)
  };
}

function projectPoint(state, point) {
  const depth = clamp(point.z, 0.02, 1.2);
  const scaleFactor = 0.48 + depth * 0.76;
  return {
    x: point.x,
    y: point.y,
    scale: scaleFactor,
    alpha: clamp(0.12 + depth * 0.68, 0.1, 0.96),
    blur: clamp((1.18 - depth) * 3.4, 0, 3.2)
  };
}

function drawSphere(ctx, x, y, radius, baseColor, darkColor, alpha = 1) {
  const gradient = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.38, radius * 0.15, x, y, radius);
  gradient.addColorStop(0, 'rgba(255,255,255,0.92)');
  gradient.addColorStop(0.28, baseColor);
  gradient.addColorStop(1, darkColor);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawBackdrop(ctx, state, time) {
  const { width, height, backdrop } = state;
  ctx.clearRect(0, 0, width, height);

  const base = ctx.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, backdrop.bgA);
  base.addColorStop(1, backdrop.bgB);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  const glowA = ctx.createRadialGradient(width * 0.22, height * 0.2, 0, width * 0.22, height * 0.2, Math.max(width, height) * 0.34);
  glowA.addColorStop(0, backdrop.glowA);
  glowA.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glowA;
  ctx.fillRect(0, 0, width, height);

  const glowB = ctx.createRadialGradient(width * 0.78, height * 0.74, 0, width * 0.78, height * 0.74, Math.max(width, height) * 0.28);
  glowB.addColorStop(0, backdrop.glowB);
  glowB.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glowB;
  ctx.fillRect(0, 0, width, height);

  const drift = Math.sin(time * 0.00014) * 18;
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = backdrop.particleSoft;
  ctx.lineWidth = 1;
  const spacing = state.variant === 'hero' ? 108 : 126;
  for (let x = -spacing; x < width + spacing; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x + drift, 0);
    ctx.lineTo(x - drift, height);
    ctx.stroke();
  }
  ctx.restore();
}

function updateChain(chain, state, time) {
  const t = time * 0.001;
  const anchor = vec3(
    chain.anchor0.x + Math.sin(t * chain.wander.wx + chain.wander.px) * chain.wander.rx,
    chain.anchor0.y + Math.cos(t * chain.wander.wy + chain.wander.py) * chain.wander.ry,
    clamp(chain.anchor0.z + Math.sin(t * chain.wander.wz + chain.wander.pz) * chain.wander.rz, 0.02, 1.2)
  );
  const yaw = chain.orient.yaw + Math.sin(t * chain.orient.wy + chain.orient.py) * 0.18;
  const pitch = chain.orient.pitch + Math.cos(t * chain.orient.wp + chain.orient.pp) * 0.14;
  const roll = chain.orient.roll + Math.sin(t * chain.orient.wr + chain.orient.pr) * 0.1;

  chain.world = chain.frames.map((frame, index) => {
    const u = chain.kind === 'ring'
      ? 1
      : 0.18 + 0.82 * Math.sin((index / Math.max(1, chain.frames.length - 1)) * Math.PI);
    const wave1 = Math.sin(t * chain.osc.w1 + index * chain.osc.s1 + chain.osc.p1);
    const wave2 = Math.cos(t * chain.osc.w2 + index * chain.osc.s2 + chain.osc.p2);
    const wave3 = Math.sin(t * chain.osc.w3 + index * chain.osc.s3 + chain.osc.p3);

    const local = add(
      frame.point,
      add(
        scale(frame.normal, chain.osc.a1 * u * wave1),
        add(
          scale(frame.binormal, chain.osc.a2 * u * wave2),
          add(
            scale(frame.tangent, chain.osc.a3 * (wave3 - 0.5 * wave1) * (u * 0.75 + 0.25)),
            vec3(0, 0, chain.osc.az * u * (0.45 * wave1 + 0.55 * wave2))
          )
        )
      )
    );

    const rotated = rotatePoint(local, yaw, pitch, roll);
    return add(anchor, rotated);
  });
}

function updateParticles(state, dt, time) {
  const pad = 54;
  state.particles.forEach((particle) => {
    const wobble = Math.sin(time * 0.0011 * particle.drift + particle.phase);
    particle.x += (particle.vx + wobble * 6) * dt;
    particle.y += (particle.vy + Math.cos(time * 0.0009 * particle.drift + particle.phase) * 5) * dt;
    particle.z = clamp(particle.z + particle.vz * dt + Math.sin(time * 0.00055 + particle.phase) * 0.0006, 0.02, 1.16);

    if (particle.x < -pad) particle.x = state.width + pad;
    if (particle.x > state.width + pad) particle.x = -pad;
    if (particle.y < -pad) particle.y = state.height + pad;
    if (particle.y > state.height + pad) particle.y = -pad;
    if (particle.z <= 0.02 || particle.z >= 1.16) particle.vz *= -1;
  });
}

function drawParticles(ctx, state) {
  state.particles
    .slice()
    .sort((a, b) => a.z - b.z)
    .forEach((particle) => {
      const projected = projectPoint(state, particle);
      const radius = particle.radius * projected.scale;
      ctx.save();
      ctx.globalAlpha = projected.alpha * 0.52;
      ctx.fillStyle = tone(particle.color, 24, -6, 1);
      ctx.beginPath();
      ctx.arc(projected.x, projected.y, radius * 1.9, 0, TAU);
      ctx.fill();
      ctx.restore();
      drawSphere(
        ctx,
        projected.x,
        projected.y,
        radius,
        tone(particle.color, 16, -5, 1),
        tone(particle.color, -12, 6, 1),
        projected.alpha * 0.9
      );
    });
}

function drawChain(ctx, state, chain) {
  const projected = chain.world.map((point) => ({ point, screen: projectPoint(state, point) }));

  for (let i = 0; i < projected.length - 1; i += 1) {
    const a = projected[i];
    const b = projected[i + 1];
    const width = chain.bondWidth * (a.screen.scale + b.screen.scale) * 0.5;
    ctx.save();
    ctx.globalAlpha = Math.min(a.screen.alpha, b.screen.alpha) * 0.42;
    ctx.strokeStyle = chain.bondGlow;
    ctx.lineWidth = width * 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.screen.x, a.screen.y);
    ctx.lineTo(b.screen.x, b.screen.y);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = Math.min(a.screen.alpha, b.screen.alpha) * 0.72;
    ctx.strokeStyle = chain.bond;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.screen.x, a.screen.y);
    ctx.lineTo(b.screen.x, b.screen.y);
    ctx.stroke();
    ctx.restore();
  }

  projected
    .slice()
    .sort((a, b) => a.point.z - b.point.z)
    .forEach(({ point, screen }, index) => {
      const pulse = 0.92 + 0.12 * Math.sin(index * 0.8 + point.z * 2.2);
      const radius = chain.beadRadius * screen.scale * pulse;
      ctx.save();
      ctx.globalAlpha = screen.alpha * 0.28;
      ctx.fillStyle = chain.shadow;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, radius * 1.9, 0, TAU);
      ctx.fill();
      ctx.restore();
      drawSphere(ctx, screen.x, screen.y, radius, chain.beadLight, chain.beadDark, screen.alpha);
    });
}

function buildState(canvas, variant, density) {
  const dpr = clamp(window.devicePixelRatio || 1, 1, 1.9);
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const state = {
    canvas,
    ctx,
    width,
    height,
    dpr,
    variant,
    density,
    chainColors: readThemeColors(),
    backdrop: readBackdrop(),
    chains: [],
    particles: []
  };

  const chainCount = Math.max(variant === 'hero' ? 11 : 7, Math.round((variant === 'hero' ? 14 : 9) * density));
  const particleCount = Math.max(variant === 'hero' ? 90 : 42, Math.round((variant === 'hero' ? 120 : 60) * density));
  state.chains = Array.from({ length: chainCount }, (_, index) => createChain(state, index, variant));
  state.particles = Array.from({ length: particleCount }, () => createParticle(state));
  return state;
}

export function initMolecularField(canvas, options = {}) {
  if (!canvas) return null;
  const variant = options.variant || 'hero';
  const density = clamp(options.density ?? 1, 0.45, 1.4);
  let state = buildState(canvas, variant, density);
  let rafId = 0;
  let last = 0;

  const observer = new MutationObserver(() => {
    state.chainColors = readThemeColors();
    state.backdrop = readBackdrop();
    state.chains.forEach((chain, index) => {
      const color = state.chainColors[index % state.chainColors.length];
      chain.color = color;
      chain.shadow = tone(color, -24, -10, 0.22);
      chain.bond = tone(color, -6, 6, 0.22);
      chain.bondGlow = tone(color, 18, 8, 0.12);
      chain.beadLight = tone(color, 26, -8, 1);
      chain.beadDark = tone(color, -10, 6, 1);
    });
    state.particles.forEach((particle) => {
      particle.color = choice(state.chainColors);
    });
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-theme-mode'] });

  const onResize = () => {
    state = buildState(canvas, variant, density);
  };
  window.addEventListener('resize', onResize);

  const frame = (time) => {
    const dt = clamp((time - last) / 1000 || 0.016, 0.008, 0.034);
    last = time;

    drawBackdrop(state.ctx, state, time);
    updateParticles(state, dt, time);
    drawParticles(state.ctx, state);

    state.chains.forEach((chain) => updateChain(chain, state, time));
    state.chains
      .slice()
      .sort((a, b) => {
        const az = a.world.reduce((sum, point) => sum + point.z, 0) / a.world.length;
        const bz = b.world.reduce((sum, point) => sum + point.z, 0) / b.world.length;
        return az - bz;
      })
      .forEach((chain) => drawChain(state.ctx, state, chain));

    rafId = requestAnimationFrame(frame);
  };

  rafId = requestAnimationFrame(frame);

  return {
    destroy() {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', onResize);
    }
  };
}
