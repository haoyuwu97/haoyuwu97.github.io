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

function centerPoints(points) {
  const centroid = points.reduce((acc, point) => add(acc, point), vec3(0, 0, 0));
  const center = scale(centroid, 1 / points.length);
  return points.map((point) => sub(point, center));
}

function buildWormlike(count, step, stiffness = 0.86, planarBias = 0.15) {
  const points = [vec3(0, 0, 0)];
  let tangent = normalize(vec3(rand(-1, 1), rand(-1, 1), rand(-0.35, 0.35)), vec3(1, 0, 0));
  for (let index = 1; index < count; index += 1) {
    const noise = normalize(vec3(rand(-1, 1), rand(-1, 1), rand(-1 + planarBias, 1 - planarBias)), vec3(0, 1, 0));
    tangent = normalize(add(scale(tangent, stiffness), scale(noise, 1 - stiffness)), tangent);
    points.push(add(points[index - 1], scale(tangent, step)));
  }
  return centerPoints(points);
}

function buildCollapsedCoil(count, step) {
  const raw = buildWormlike(count, step, 0.78, 0.1).map((point, index, arr) => {
    const s = index / Math.max(1, arr.length - 1);
    const pull = Math.sin(Math.PI * s);
    return vec3(point.x * 0.88, point.y * 0.78 - pull * step * 1.1, point.z * 0.82);
  });
  return centerPoints(raw);
}

function buildSemiflexible(count, step) {
  const raw = buildWormlike(count, step, 0.93, 0.24).map((point, index, arr) => {
    const s = index / Math.max(1, arr.length - 1);
    return vec3(point.x + (s - 0.5) * step * count * 0.24, point.y, point.z * 0.82);
  });
  return centerPoints(raw);
}

function buildHairpin(count, step) {
  const half = Math.max(5, Math.floor(count * 0.52));
  const first = buildWormlike(half, step, 0.92, 0.22);
  const last = first[first.length - 1];
  const second = [];
  for (let i = 1; i < count - half + 1; i += 1) {
    const back = i / Math.max(1, count - half);
    const bend = Math.sin(back * Math.PI) * step * 2.2;
    second.push(vec3(last.x - back * step * (half - 1), last.y + bend, last.z + bend * 0.36));
  }
  return centerPoints([...first, ...second]);
}

function buildFolded(count, step) {
  const raw = [];
  const total = count - 1;
  for (let i = 0; i < count; i += 1) {
    const s = i / Math.max(1, total);
    raw.push(vec3(
      (s - 0.5) * step * total * 0.78,
      Math.sin(s * Math.PI * 2.2) * step * 2.4 + Math.sin(s * Math.PI * 4.8) * step * 0.7,
      Math.cos(s * Math.PI * 1.9) * step * 1.35
    ));
  }
  return centerPoints(raw);
}

function buildRing(count, radius) {
  const raw = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * TAU;
    const r = radius * rand(0.94, 1.07);
    raw.push(vec3(
      Math.cos(angle) * r,
      Math.sin(angle) * r * rand(0.9, 1.08),
      Math.sin(angle * 2 + rand(-0.18, 0.18)) * radius * 0.28
    ));
  }
  return raw;
}

function createSideGroups(points, spacing, branchLength, probability = 1) {
  const groups = [];
  for (let index = spacing; index < points.length - spacing; index += spacing) {
    if (Math.random() > probability) continue;
    groups.push({
      baseIndex: index,
      length: Math.max(1, Math.round(branchLength + rand(-0.35, 0.85))),
      dir: Math.random() > 0.5 ? 1 : -1,
      phase: rand(0, TAU)
    });
  }
  return groups;
}

function createBaseShape(kind, count, step) {
  if (kind === 'ring') return { points: buildRing(count, step * count * 0.14), sideGroups: [] };
  if (kind === 'hairpin') return { points: buildHairpin(count, step), sideGroups: [] };
  if (kind === 'folded') return { points: buildFolded(count, step), sideGroups: [] };
  if (kind === 'semiflexible') return { points: buildSemiflexible(count, step), sideGroups: [] };
  if (kind === 'brush') {
    const points = buildSemiflexible(count, step * 0.96);
    return { points, sideGroups: createSideGroups(points, 2, 2, 0.95) };
  }
  return { points: buildCollapsedCoil(count, step), sideGroups: [] };
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

function createModeSet(kind, step) {
  if (kind === 'ring') {
    return [
      { m: 1, an: step * 0.38, ab: step * 0.3, at: step * 0.08, omega: rand(0.18, 0.28), phase: rand(0, TAU) },
      { m: 2, an: step * 0.24, ab: step * 0.22, at: step * 0.05, omega: rand(0.24, 0.34), phase: rand(0, TAU) },
      { m: 3, an: step * 0.14, ab: step * 0.12, at: step * 0.03, omega: rand(0.31, 0.42), phase: rand(0, TAU) }
    ];
  }
  const stiff = kind === 'semiflexible' ? 0.75 : kind === 'brush' ? 0.62 : 1;
  return [
    { m: 1, an: step * 0.55 * stiff, ab: step * 0.42 * stiff, at: step * 0.09 * stiff, omega: rand(0.12, 0.22), phase: rand(0, TAU) },
    { m: 2, an: step * 0.32 * stiff, ab: step * 0.28 * stiff, at: step * 0.05 * stiff, omega: rand(0.18, 0.3), phase: rand(0, TAU) },
    { m: 3, an: step * 0.18 * stiff, ab: step * 0.16 * stiff, at: step * 0.03 * stiff, omega: rand(0.26, 0.4), phase: rand(0, TAU) }
  ];
}

function createChain(state, index, variant) {
  const kind = choice(['coil', 'coil', 'semiflexible', 'hairpin', 'folded', 'ring', 'brush']);
  const count = kind === 'ring' ? Math.round(rand(18, 28)) : Math.round(rand(16, 30));
  const step = variant === 'hero' ? rand(12, 17) : rand(10, 14);
  const { points, sideGroups } = createBaseShape(kind, count, step);
  const frames = computeFrames(points);
  const color = state.chainColors[index % state.chainColors.length];
  const margin = variant === 'hero' ? 86 : 62;
  return {
    kind,
    color,
    shadow: tone(color, -24, -10, 0.22),
    bond: tone(color, -6, 6, 0.22),
    bondGlow: tone(color, 18, 8, 0.12),
    beadLight: tone(color, 26, -8, 1),
    beadDark: tone(color, -10, 6, 1),
    anchor0: vec3(
      rand(margin, state.width - margin),
      rand(margin, state.height - margin),
      rand(0.12, 1.04)
    ),
    wander: {
      rx: rand(8, variant === 'hero' ? 24 : 16),
      ry: rand(8, variant === 'hero' ? 20 : 14),
      rz: rand(0.03, 0.12),
      wx: rand(0.02, 0.06),
      wy: rand(0.02, 0.06),
      wz: rand(0.03, 0.07),
      px: rand(0, TAU),
      py: rand(0, TAU),
      pz: rand(0, TAU)
    },
    orient: {
      yaw: rand(-0.48, 0.48),
      pitch: rand(-0.32, 0.32),
      roll: rand(-0.22, 0.22),
      wy: rand(0.01, 0.04),
      wp: rand(0.01, 0.035),
      wr: rand(0.01, 0.03),
      py: rand(0, TAU),
      pp: rand(0, TAU),
      pr: rand(0, TAU)
    },
    pulse: {
      amp: rand(0.16, 0.42),
      omega: rand(0.45, 0.9),
      phase: rand(0, TAU)
    },
    beadRadius: kind === 'brush' ? rand(4.6, 6.8) : rand(4.8, 7.6),
    bondWidth: rand(1.4, 2.5),
    step,
    base: points,
    frames,
    modes: createModeSet(kind, step),
    sideGroups,
    world: [],
    branchWorld: []
  };
}

function createParticle(state) {
  return {
    x: rand(-54, state.width + 54),
    y: rand(-54, state.height + 54),
    z: rand(0.04, 1.2),
    vx: rand(-12, 12),
    vy: rand(-10, 10),
    vz: rand(-0.015, 0.015),
    radius: rand(1.6, 5.4),
    drift: rand(0.2, 0.8),
    phase: rand(0, TAU),
    color: choice(state.chainColors)
  };
}

function projectPoint(state, point) {
  const depth = clamp(point.z, 0.02, 1.24);
  const cx = state.width * 0.5;
  const cy = state.height * 0.5;
  const perspective = 0.68 + depth * 0.66;
  return {
    x: cx + (point.x - cx) * perspective,
    y: cy + (point.y - cy) * perspective,
    scale: 0.44 + depth * 0.82,
    alpha: clamp(0.16 + depth * 0.66, 0.1, 0.98),
    blur: clamp((1.14 - depth) * 2.8, 0, 2.8)
  };
}

function drawSphere(ctx, x, y, radius, baseColor, darkColor, alpha = 1) {
  const gradient = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.38, radius * 0.15, x, y, radius);
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

  const drift = Math.sin(time * 0.0001) * 14;
  ctx.save();
  ctx.globalAlpha = 0.065;
  ctx.strokeStyle = backdrop.particleSoft;
  ctx.lineWidth = 1;
  const spacing = state.variant === 'hero' ? 114 : 128;
  for (let x = -spacing; x < width + spacing; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x + drift, 0);
    ctx.lineTo(x - drift, height);
    ctx.stroke();
  }
  ctx.restore();
}

function deformFrame(chain, frame, s, time) {
  const ringLike = chain.kind === 'ring';
  const envelope = ringLike ? 1 : Math.pow(Math.sin(Math.PI * s), 0.92) * 0.92 + 0.08;
  let local = frame.point;
  chain.modes.forEach((mode) => {
    const angle = ringLike
      ? mode.m * s * TAU + time * mode.omega + mode.phase
      : mode.m * Math.PI * s + time * mode.omega + mode.phase;
    local = add(local, scale(frame.normal, mode.an * envelope * Math.sin(angle)));
    local = add(local, scale(frame.binormal, mode.ab * envelope * Math.cos(angle + 0.55)));
    local = add(local, scale(frame.tangent, mode.at * envelope * Math.sin(angle * 0.7 + 0.4)));
  });
  const pulse = chain.pulse.amp * Math.sin(time * chain.pulse.omega + chain.pulse.phase + s * Math.PI * 1.5);
  local = add(local, scale(frame.normal, pulse * 0.22 * chain.step));
  local = add(local, scale(frame.binormal, pulse * 0.12 * chain.step));
  return local;
}

function updateChain(chain, state, timeMs) {
  const time = timeMs * 0.001;
  const anchor = vec3(
    chain.anchor0.x + Math.sin(time * chain.wander.wx + chain.wander.px) * chain.wander.rx,
    chain.anchor0.y + Math.cos(time * chain.wander.wy + chain.wander.py) * chain.wander.ry,
    clamp(chain.anchor0.z + Math.sin(time * chain.wander.wz + chain.wander.pz) * chain.wander.rz, 0.04, 1.22)
  );
  const yaw = chain.orient.yaw + Math.sin(time * chain.orient.wy + chain.orient.py) * 0.16;
  const pitch = chain.orient.pitch + Math.cos(time * chain.orient.wp + chain.orient.pp) * 0.11;
  const roll = chain.orient.roll + Math.sin(time * chain.orient.wr + chain.orient.pr) * 0.08;

  const localPoints = chain.frames.map((frame, index) => {
    const s = chain.kind === 'ring'
      ? index / chain.frames.length
      : index / Math.max(1, chain.frames.length - 1);
    return deformFrame(chain, frame, s, time);
  });

  chain.world = localPoints.map((point) => add(anchor, rotatePoint(point, yaw, pitch, roll)));
  chain.branchWorld = chain.sideGroups.map((group) => {
    const points = [];
    const baseIndex = clamp(group.baseIndex, 1, chain.frames.length - 2);
    const frame = chain.frames[baseIndex];
    const localParent = localPoints[baseIndex];
    for (let stepIndex = 1; stepIndex <= group.length; stepIndex += 1) {
      const offset = group.dir * chain.step * (0.78 * stepIndex + 0.08 * Math.sin(time * 0.8 + group.phase));
      let branchLocal = add(localParent, scale(frame.normal, offset));
      branchLocal = add(branchLocal, scale(frame.binormal, Math.sin(time * 0.9 + group.phase + stepIndex * 0.7) * chain.step * 0.22));
      points.push(add(anchor, rotatePoint(branchLocal, yaw, pitch, roll)));
    }
    return { baseIndex, points };
  });
}

function updateParticles(state, dt, timeMs) {
  const pad = 58;
  const time = timeMs * 0.001;
  state.particles.forEach((particle) => {
    particle.x += (particle.vx + Math.sin(time * particle.drift + particle.phase) * 3.8) * dt;
    particle.y += (particle.vy + Math.cos(time * particle.drift * 0.8 + particle.phase) * 3.2) * dt;
    particle.z = clamp(particle.z + particle.vz * dt + Math.sin(time * 0.45 + particle.phase) * 0.0004, 0.04, 1.2);
    if (particle.x < -pad) particle.x = state.width + pad;
    if (particle.x > state.width + pad) particle.x = -pad;
    if (particle.y < -pad) particle.y = state.height + pad;
    if (particle.y > state.height + pad) particle.y = -pad;
    if (particle.z <= 0.04 || particle.z >= 1.2) particle.vz *= -1;
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
      ctx.globalAlpha = projected.alpha * 0.35;
      ctx.fillStyle = tone(particle.color, 22, -8, 1);
      ctx.beginPath();
      ctx.arc(projected.x, projected.y, radius * 1.8, 0, TAU);
      ctx.fill();
      ctx.restore();
      drawSphere(
        ctx,
        projected.x,
        projected.y,
        radius,
        tone(particle.color, 16, -5, 1),
        tone(particle.color, -12, 6, 1),
        projected.alpha * 0.92
      );
    });
}

function drawBond(ctx, ax, ay, bx, by, width, glowColor, lineColor, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha * 0.45;
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = width * 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = alpha * 0.8;
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
  const projected = chain.world.map((point) => ({ point, screen: projectPoint(state, point) }));

  for (let i = 0; i < projected.length - 1; i += 1) {
    const a = projected[i];
    const b = projected[i + 1];
    const width = chain.bondWidth * (a.screen.scale + b.screen.scale) * 0.5;
    const alpha = Math.min(a.screen.alpha, b.screen.alpha);
    drawBond(ctx, a.screen.x, a.screen.y, b.screen.x, b.screen.y, width, chain.bondGlow, chain.bond, alpha);
  }

  chain.branchWorld.forEach((branch) => {
    const parent = projected[branch.baseIndex];
    let last = parent;
    branch.points.forEach((point) => {
      const screen = projectPoint(state, point);
      const width = chain.bondWidth * (last.screen.scale + screen.scale) * 0.36;
      const alpha = Math.min(last.screen.alpha, screen.alpha) * 0.92;
      drawBond(ctx, last.screen.x, last.screen.y, screen.x, screen.y, width, chain.bondGlow, chain.bond, alpha);
      last = { point, screen };
    });
  });

  const beads = projected.map((item, index) => ({
    point: item.point,
    screen: item.screen,
    radiusScale: 1,
    branch: false,
    key: `b-${index}`
  }));

  chain.branchWorld.forEach((branch, branchIndex) => {
    branch.points.forEach((point, beadIndex) => {
      beads.push({
        point,
        screen: projectPoint(state, point),
        radiusScale: 0.62 - beadIndex * 0.09,
        branch: true,
        key: `s-${branchIndex}-${beadIndex}`
      });
    });
  });

  beads
    .sort((a, b) => a.point.z - b.point.z)
    .forEach((item, orderIndex) => {
      const pulse = 0.94 + 0.08 * Math.sin(orderIndex * 0.7 + item.point.z * 2.1);
      const radius = chain.beadRadius * item.screen.scale * pulse * item.radiusScale;
      ctx.save();
      ctx.globalAlpha = item.screen.alpha * 0.26;
      ctx.fillStyle = chain.shadow;
      ctx.beginPath();
      ctx.arc(item.screen.x, item.screen.y, radius * 1.85, 0, TAU);
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

  const chainCount = Math.max(variant === 'hero' ? 13 : 9, Math.round((variant === 'hero' ? 16 : 10) * density));
  const particleCount = Math.max(variant === 'hero' ? 120 : 70, Math.round((variant === 'hero' ? 150 : 84) * density));
  state.chains = Array.from({ length: chainCount }, (_, index) => createChain(state, index, variant));
  state.particles = Array.from({ length: particleCount }, () => createParticle(state));
  return state;
}

export function initMolecularField(canvas, options = {}) {
  if (!canvas) return null;
  const variant = options.variant || 'hero';
  const density = clamp(options.density ?? 1, 0.45, 1.5);
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
