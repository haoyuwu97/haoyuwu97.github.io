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

function length(v) {
  return Math.hypot(v.x, v.y, v.z);
}

function normalize(v, fallback = vec3(1, 0, 0)) {
  const mag = length(v);
  if (mag < 1e-6) return { ...fallback };
  return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
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

function centerPoints(points) {
  const center = points.reduce((acc, point) => add(acc, point), vec3(0, 0, 0));
  const mean = scale(center, 1 / Math.max(1, points.length));
  return points.map((point) => sub(point, mean));
}

function buildWormlike(count, step, persistence = 0.86, zBias = 0.36) {
  const points = [vec3(0, 0, 0)];
  let tangent = normalize(vec3(rand(-1, 1), rand(-1, 1), rand(-zBias, zBias)), vec3(1, 0, 0));
  for (let i = 1; i < count; i += 1) {
    const noise = normalize(vec3(rand(-1, 1), rand(-1, 1), rand(-zBias, zBias)), vec3(0, 1, 0));
    tangent = normalize(add(scale(tangent, persistence), scale(noise, 1 - persistence)), tangent);
    points.push(add(points[i - 1], scale(tangent, step)));
  }
  return centerPoints(points);
}

function buildCoil(count, step) {
  const raw = buildWormlike(count, step, 0.82, 0.34).map((point, index, arr) => {
    const s = index / Math.max(1, arr.length - 1);
    const fold = Math.sin(Math.PI * s);
    return vec3(
      point.x * 0.9,
      point.y * 0.9 - fold * step * 0.25,
      point.z * 0.65
    );
  });
  return centerPoints(raw);
}

function buildGlobule(count, step) {
  const raw = buildWormlike(count, step, 0.74, 0.28).map((point, index, arr) => {
    const s = index / Math.max(1, arr.length - 1);
    const pull = 0.72 + 0.18 * Math.sin(Math.PI * s);
    return vec3(point.x * pull, point.y * pull, point.z * 0.45);
  });
  return centerPoints(raw);
}

function buildSemiflexible(count, step) {
  const raw = buildWormlike(count, step, 0.93, 0.24).map((point, index, arr) => {
    const s = index / Math.max(1, arr.length - 1);
    return vec3(
      point.x + (s - 0.5) * step * count * 0.18,
      point.y * 0.8,
      point.z * 0.52
    );
  });
  return centerPoints(raw);
}

function buildHairpin(count, step) {
  const half = Math.max(5, Math.floor(count * 0.52));
  const first = buildWormlike(half, step, 0.9, 0.26);
  const last = first[first.length - 1];
  const second = [];
  for (let i = 1; i < count - half + 1; i += 1) {
    const back = i / Math.max(1, count - half);
    const bend = Math.sin(back * Math.PI) * step * 1.5;
    second.push(vec3(
      last.x - back * step * (half - 1) * 0.82,
      last.y + bend,
      last.z + bend * 0.18
    ));
  }
  return centerPoints([...first, ...second]);
}

function buildRing(count, radius) {
  const raw = [];
  for (let i = 0; i < count; i += 1) {
    const s = i / count;
    const angle = s * TAU;
    const r = radius * (0.96 + 0.08 * Math.sin(s * TAU * 3 + rand(-0.2, 0.2)));
    raw.push(vec3(
      Math.cos(angle) * r,
      Math.sin(angle) * r * rand(0.92, 1.06),
      Math.sin(angle * 2 + rand(-0.12, 0.12)) * radius * 0.18
    ));
  }
  return raw;
}

function createBaseShape(kind, count, step) {
  if (kind === 'ring') return buildRing(count, step * count * 0.12);
  if (kind === 'hairpin') return buildHairpin(count, step);
  if (kind === 'semiflexible') return buildSemiflexible(count, step);
  if (kind === 'globule') return buildGlobule(count, step);
  return buildCoil(count, step);
}

function computeFrames(points, ring = false) {
  return points.map((point, index) => {
    const prev = points[index === 0 ? (ring ? points.length - 1 : 0) : index - 1];
    const next = points[index === points.length - 1 ? (ring ? 0 : points.length - 1) : index + 1];
    const tangent = normalize(sub(next, prev), vec3(1, 0, 0));
    const up = Math.abs(dot(tangent, vec3(0, 0, 1))) > 0.9 ? vec3(0, 1, 0) : vec3(0, 0, 1);
    const normal = normalize(cross(tangent, up), vec3(0, 1, 0));
    const binormal = normalize(cross(tangent, normal), vec3(0, 0, 1));
    return { point, tangent, normal, binormal };
  });
}

function createModeSet(kind, step, ring) {
  const scaleFactor = kind === 'semiflexible' ? 0.42 : kind === 'globule' ? 0.24 : kind === 'hairpin' ? 0.3 : 0.34;
  if (ring) {
    return [
      { m: 1, an: step * 0.22, ab: step * 0.18, at: step * 0.03, omega: rand(0.05, 0.11), phase: rand(0, TAU) },
      { m: 2, an: step * 0.12, ab: step * 0.1, at: step * 0.02, omega: rand(0.08, 0.14), phase: rand(0, TAU) }
    ];
  }
  return [
    { m: 1, an: step * 0.3 * scaleFactor, ab: step * 0.24 * scaleFactor, at: step * 0.05 * scaleFactor, omega: rand(0.04, 0.09), phase: rand(0, TAU) },
    { m: 2, an: step * 0.18 * scaleFactor, ab: step * 0.15 * scaleFactor, at: step * 0.03 * scaleFactor, omega: rand(0.06, 0.12), phase: rand(0, TAU) },
    { m: 3, an: step * 0.08 * scaleFactor, ab: step * 0.07 * scaleFactor, at: step * 0.015 * scaleFactor, omega: rand(0.08, 0.14), phase: rand(0, TAU) }
  ];
}

function enforceBonds(points, target, ring = false, iterations = 2) {
  const pts = points.map((point) => ({ ...point }));
  const segmentCount = ring ? pts.length : pts.length - 1;
  for (let iter = 0; iter < iterations; iter += 1) {
    for (let i = 0; i < segmentCount; i += 1) {
      const aIndex = i;
      const bIndex = (i + 1) % pts.length;
      const delta = sub(pts[bIndex], pts[aIndex]);
      const dist = Math.max(1e-6, length(delta));
      const diff = (dist - target) / dist;
      const corr = scale(delta, 0.5 * diff);
      pts[aIndex] = add(pts[aIndex], corr);
      pts[bIndex] = sub(pts[bIndex], corr);
    }
    if (!ring) {
      const centered = centerPoints(pts);
      for (let i = 0; i < pts.length; i += 1) pts[i] = centered[i];
    }
  }
  return centerPoints(pts);
}

function estimateRadius(points) {
  return Math.max(...points.map((point) => Math.hypot(point.x, point.y))) + 8;
}

function createChain(state, index, variant) {
  const kind = choice(['coil', 'coil', 'coil', 'globule', 'semiflexible', 'semiflexible', 'hairpin', 'ring']);
  const ring = kind === 'ring';
  const count = ring ? Math.round(rand(14, 22)) : Math.round(rand(16, 26));
  const step = variant === 'hero' ? rand(8.6, 10.2) : rand(7.4, 9.2);
  const base = createBaseShape(kind, count, step);
  const relaxed = enforceBonds(base, step, ring, 4);
  const frames = computeFrames(relaxed, ring);
  const radiusEstimate = estimateRadius(relaxed);
  const margin = Math.max(variant === 'hero' ? 72 : 56, radiusEstimate + 18);
  const color = state.chainColors[index % state.chainColors.length];
  return {
    kind,
    ring,
    step,
    count,
    color,
    shadow: tone(color, -24, -10, 0.18),
    bond: tone(color, -8, 5, 0.26),
    bondGlow: tone(color, 18, 10, 0.09),
    beadLight: tone(color, 24, -4, 1),
    beadDark: tone(color, -12, 6, 1),
    beadRadius: kind === 'globule' ? rand(4.8, 6.6) : rand(5.1, 7.2),
    bondWidth: rand(1.3, 2.2),
    anchor0: vec3(
      rand(margin, Math.max(margin + 1, state.width - margin)),
      rand(margin, Math.max(margin + 1, state.height - margin)),
      rand(0.16, 0.98)
    ),
    anchor: vec3(0, 0, 0),
    wander: {
      rx: rand(0.4, 1.8),
      ry: rand(0.4, 1.8),
      rz: rand(0.01, 0.03),
      wx: rand(0.03, 0.08),
      wy: rand(0.03, 0.08),
      wz: rand(0.05, 0.12),
      px: rand(0, TAU),
      py: rand(0, TAU),
      pz: rand(0, TAU)
    },
    orient: {
      yaw: rand(-0.22, 0.22),
      pitch: rand(-0.14, 0.14),
      roll: rand(-0.08, 0.08),
      ay: rand(0.01, 0.035),
      ap: rand(0.008, 0.028),
      ar: rand(0.006, 0.02),
      wy: rand(0.01, 0.04),
      wp: rand(0.01, 0.04),
      wr: rand(0.01, 0.04),
      py: rand(0, TAU),
      pp: rand(0, TAU),
      pr: rand(0, TAU)
    },
    pulse: {
      amp: rand(0.04, 0.11),
      omega: rand(0.12, 0.22),
      phase: rand(0, TAU)
    },
    rept: {
      amp: rand(step * 0.04, step * 0.1),
      k: ring ? rand(0.8, 1.8) : rand(0.6, 1.4),
      omega: rand(0.04, 0.1),
      phase: rand(0, TAU)
    },
    microPhase: Array.from({ length: count }, () => rand(0, TAU)),
    microAmp: rand(step * 0.02, step * 0.05),
    base: relaxed,
    frames,
    modes: createModeSet(kind, step, ring),
    world: []
  };
}

function createParticle(state) {
  return {
    x: rand(-40, state.width + 40),
    y: rand(-40, state.height + 40),
    z: rand(0.06, 1.12),
    vx: rand(-4, 4),
    vy: rand(-3.5, 3.5),
    vz: rand(-0.01, 0.01),
    radius: rand(1.3, 4.6),
    drift: rand(0.08, 0.26),
    phase: rand(0, TAU),
    color: choice(state.chainColors)
  };
}

function projectPoint(state, point, origin = null) {
  const depth = clamp(point.z, 0.05, 1.18);
  const ox = origin ? origin.x : point.x;
  const oy = origin ? origin.y : point.y;
  const perspective = 0.84 + depth * 0.26;
  const parallaxX = (depth - 0.55) * 3.5;
  const parallaxY = (0.55 - depth) * 2.1;
  return {
    x: ox + (point.x - ox) * perspective + parallaxX,
    y: oy + (point.y - oy) * perspective + parallaxY,
    scale: 0.54 + depth * 0.62,
    alpha: clamp(0.14 + depth * 0.68, 0.1, 0.98)
  };
}

function drawSphere(ctx, x, y, radius, baseColor, darkColor, alpha = 1) {
  const gradient = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.38, radius * 0.14, x, y, radius);
  gradient.addColorStop(0, 'rgba(255,255,255,0.94)');
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

  const glowA = ctx.createRadialGradient(width * 0.18, height * 0.18, 0, width * 0.18, height * 0.18, Math.max(width, height) * 0.32);
  glowA.addColorStop(0, backdrop.glowA);
  glowA.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glowA;
  ctx.fillRect(0, 0, width, height);

  const glowB = ctx.createRadialGradient(width * 0.8, height * 0.72, 0, width * 0.8, height * 0.72, Math.max(width, height) * 0.28);
  glowB.addColorStop(0, backdrop.glowB);
  glowB.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glowB;
  ctx.fillRect(0, 0, width, height);

  const t = time * 0.00008;
  ctx.save();
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 3; i += 1) {
    const x = width * (0.18 + i * 0.28) + Math.sin(t * (0.9 + i * 0.2) + i) * 24;
    const y = height * (0.22 + i * 0.2) + Math.cos(t * (0.8 + i * 0.16) + i * 1.7) * 18;
    const radius = Math.max(width, height) * (0.18 + i * 0.05);
    const haze = ctx.createRadialGradient(x, y, 0, x, y, radius);
    haze.addColorStop(0, backdrop.halo);
    haze.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}

function deformFrame(chain, frame, s, time) {
  const ringLike = chain.ring;
  const envelope = ringLike ? 1 : 0.14 + 0.86 * Math.pow(Math.sin(Math.PI * s), 0.85);
  let local = frame.point;
  chain.modes.forEach((mode) => {
    const angle = ringLike
      ? mode.m * TAU * s + time * mode.omega + mode.phase
      : mode.m * Math.PI * s + time * mode.omega + mode.phase;
    local = add(local, scale(frame.normal, mode.an * envelope * Math.sin(angle)));
    local = add(local, scale(frame.binormal, mode.ab * envelope * Math.cos(angle + 0.45)));
    local = add(local, scale(frame.tangent, mode.at * envelope * Math.sin(angle * 0.72 + 0.3)));
  });
  const pulse = chain.pulse.amp * Math.sin(time * chain.pulse.omega + chain.pulse.phase + s * Math.PI * 1.2);
  local = add(local, scale(frame.normal, pulse * chain.step * 0.18));
  local = add(local, scale(frame.binormal, pulse * chain.step * 0.11));
  const rept = chain.rept.amp * Math.sin(TAU * (s * chain.rept.k - time * chain.rept.omega) + chain.rept.phase);
  local = add(local, scale(frame.tangent, rept));
  return local;
}

function updateChain(chain, state, timeMs) {
  const time = timeMs * 0.001;
  const anchor = vec3(
    chain.anchor0.x + Math.sin(time * chain.wander.wx + chain.wander.px) * chain.wander.rx,
    chain.anchor0.y + Math.cos(time * chain.wander.wy + chain.wander.py) * chain.wander.ry,
    clamp(chain.anchor0.z + Math.sin(time * chain.wander.wz + chain.wander.pz) * chain.wander.rz, 0.06, 1.12)
  );
  chain.anchor = anchor;

  const yaw = chain.orient.yaw + Math.sin(time * chain.orient.wy + chain.orient.py) * chain.orient.ay;
  const pitch = chain.orient.pitch + Math.cos(time * chain.orient.wp + chain.orient.pp) * chain.orient.ap;
  const roll = chain.orient.roll + Math.sin(time * chain.orient.wr + chain.orient.pr) * chain.orient.ar;

  let localPoints = chain.frames.map((frame, index) => {
    const s = chain.ring ? index / chain.frames.length : index / Math.max(1, chain.frames.length - 1);
    let local = deformFrame(chain, frame, s, time);
    const micro = chain.microAmp * Math.sin(time * 0.3 + chain.microPhase[index]);
    local = add(local, scale(frame.normal, micro * 0.7));
    local = add(local, scale(frame.binormal, micro * 0.42));
    return local;
  });

  localPoints = enforceBonds(localPoints, chain.step, chain.ring, 2);

  chain.world = localPoints.map((point) => {
    const rotated = rotatePoint(point, yaw, pitch, roll);
    return {
      x: anchor.x + rotated.x,
      y: anchor.y + rotated.y,
      z: clamp(anchor.z + rotated.z * 0.0042, 0.05, 1.16)
    };
  });
}

function updateParticles(state, dt, timeMs) {
  const time = timeMs * 0.001;
  const pad = 40;
  state.particles.forEach((particle) => {
    particle.x += (particle.vx + Math.sin(time * particle.drift + particle.phase) * 1.2) * dt;
    particle.y += (particle.vy + Math.cos(time * particle.drift * 0.9 + particle.phase) * 1.1) * dt;
    particle.z = clamp(particle.z + particle.vz * dt + Math.sin(time * 0.18 + particle.phase) * 0.00025, 0.06, 1.14);
    if (particle.x < -pad) particle.x = state.width + pad;
    if (particle.x > state.width + pad) particle.x = -pad;
    if (particle.y < -pad) particle.y = state.height + pad;
    if (particle.y > state.height + pad) particle.y = -pad;
    if (particle.z <= 0.06 || particle.z >= 1.14) particle.vz *= -1;
  });
}

function drawParticles(ctx, state) {
  state.particles
    .slice()
    .sort((a, b) => a.z - b.z)
    .forEach((particle) => {
      const screen = projectPoint(state, particle, particle);
      const radius = particle.radius * screen.scale;
      ctx.save();
      ctx.globalAlpha = screen.alpha * 0.22;
      ctx.fillStyle = tone(particle.color, 22, -8, 1);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, radius * 1.65, 0, TAU);
      ctx.fill();
      ctx.restore();
      drawSphere(
        ctx,
        screen.x,
        screen.y,
        radius,
        tone(particle.color, 14, -4, 1),
        tone(particle.color, -14, 6, 1),
        screen.alpha * 0.82
      );
    });
}

function drawBond(ctx, ax, ay, bx, by, width, glowColor, lineColor, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha * 0.28;
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = width * 2.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = alpha * 0.78;
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.restore();
}

function drawChain(ctx, state, chain) {
  const projected = chain.world.map((point) => ({ point, screen: projectPoint(state, point, chain.anchor) }));

  for (let i = 0; i < projected.length - 1; i += 1) {
    const a = projected[i];
    const b = projected[i + 1];
    const width = chain.bondWidth * (a.screen.scale + b.screen.scale) * 0.5;
    const alpha = Math.min(a.screen.alpha, b.screen.alpha);
    drawBond(ctx, a.screen.x, a.screen.y, b.screen.x, b.screen.y, width, chain.bondGlow, chain.bond, alpha);
  }

  if (chain.ring && projected.length > 2) {
    const a = projected[projected.length - 1];
    const b = projected[0];
    const width = chain.bondWidth * (a.screen.scale + b.screen.scale) * 0.5;
    const alpha = Math.min(a.screen.alpha, b.screen.alpha);
    drawBond(ctx, a.screen.x, a.screen.y, b.screen.x, b.screen.y, width, chain.bondGlow, chain.bond, alpha);
  }

  projected
    .slice()
    .sort((a, b) => a.point.z - b.point.z)
    .forEach((item, orderIndex) => {
      const pulse = 0.98 + 0.04 * Math.sin(orderIndex * 0.4 + item.point.z * 2.3);
      const radius = chain.beadRadius * item.screen.scale * pulse;
      ctx.save();
      ctx.globalAlpha = item.screen.alpha * 0.18;
      ctx.fillStyle = chain.shadow;
      ctx.beginPath();
      ctx.arc(item.screen.x, item.screen.y, radius * 1.75, 0, TAU);
      ctx.fill();
      ctx.restore();
      drawSphere(ctx, item.screen.x, item.screen.y, radius, chain.beadLight, chain.beadDark, item.screen.alpha);
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

  const chainCount = Math.max(variant === 'hero' ? 10 : 7, Math.round((variant === 'hero' ? 11 : 8) * density));
  const particleCount = Math.max(variant === 'hero' ? 88 : 54, Math.round((variant === 'hero' ? 104 : 64) * density));
  state.chains = Array.from({ length: chainCount }, (_, index) => createChain(state, index, variant));
  state.particles = Array.from({ length: particleCount }, () => createParticle(state));
  return state;
}

export function initMolecularField(canvas, options = {}) {
  if (!canvas) return null;
  const variant = options.variant || 'hero';
  const density = clamp(options.density ?? 1, 0.45, 1.45);
  let state = buildState(canvas, variant, density);
  let rafId = 0;
  let last = 0;

  const observer = new MutationObserver(() => {
    state.chainColors = readThemeColors();
    state.backdrop = readBackdrop();
    state.chains.forEach((chain, index) => {
      const color = state.chainColors[index % state.chainColors.length];
      chain.color = color;
      chain.shadow = tone(color, -24, -10, 0.18);
      chain.bond = tone(color, -8, 5, 0.26);
      chain.bondGlow = tone(color, 18, 10, 0.09);
      chain.beadLight = tone(color, 24, -4, 1);
      chain.beadDark = tone(color, -12, 6, 1);
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
        const az = a.world.reduce((sum, point) => sum + point.z, 0) / Math.max(1, a.world.length);
        const bz = b.world.reduce((sum, point) => sum + point.z, 0) / Math.max(1, b.world.length);
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
