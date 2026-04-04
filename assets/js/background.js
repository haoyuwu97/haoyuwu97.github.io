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

function mix(a, b, t) {
  return a + (b - a) * t;
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

function centerOfNodes(nodes, indices = null) {
  const ids = indices || nodes.map((_, index) => index);
  let sx = 0;
  let sy = 0;
  let sz = 0;
  ids.forEach((id) => {
    sx += nodes[id].x;
    sy += nodes[id].y;
    sz += nodes[id].z;
  });
  const inv = 1 / Math.max(1, ids.length);
  return vec3(sx * inv, sy * inv, sz * inv);
}

function makeNode(position, radius, type = 'bead') {
  return {
    x: position.x,
    y: position.y,
    z: position.z,
    px: position.x,
    py: position.y,
    pz: position.z,
    radius,
    type,
    pinned: false
  };
}

function buildRandomWalk(count, step, persistence = 0.84, zScale = 0.18) {
  const points = [vec3(0, 0, 0)];
  let tangent = normalize(vec3(rand(-1, 1), rand(-1, 1), rand(-zScale, zScale)), vec3(1, 0, 0));
  for (let i = 1; i < count; i += 1) {
    const noise = normalize(vec3(rand(-1, 1), rand(-1, 1), rand(-zScale, zScale)), vec3(0, 1, 0));
    tangent = normalize(add(scale(tangent, persistence), scale(noise, 1 - persistence)), tangent);
    points.push(add(points[i - 1], scale(tangent, step)));
  }
  return points;
}

function recenterPoints(points) {
  const center = points.reduce((acc, point) => add(acc, point), vec3(0, 0, 0));
  const mean = scale(center, 1 / Math.max(1, points.length));
  return points.map((point) => sub(point, mean));
}

function buildLinearCoil(count, step, stiffness = 0.84) {
  const pts = buildRandomWalk(count, step, stiffness, 0.16).map((p, i) => {
    const s = i / Math.max(1, count - 1);
    return vec3(p.x, p.y - Math.sin(Math.PI * s) * step * 0.18, p.z * 0.8);
  });
  return recenterPoints(pts);
}

function buildSwollen(count, step) {
  const pts = buildRandomWalk(count, step, 0.87, 0.14).map((p, i) => {
    const s = i / Math.max(1, count - 1);
    const swell = 1.06 + 0.14 * Math.sin(Math.PI * s);
    return vec3(p.x * swell, p.y * swell, p.z * 0.78);
  });
  return recenterPoints(pts);
}

function buildSemiflexible(count, step) {
  const pts = buildRandomWalk(count, step, 0.94, 0.1).map((p, i) => {
    const s = i / Math.max(1, count - 1);
    return vec3(p.x + (s - 0.5) * step * count * 0.1, p.y * 0.78, p.z * 0.52);
  });
  return recenterPoints(pts);
}

function buildHairpin(count, step) {
  const half = Math.max(5, Math.floor(count * 0.55));
  const first = buildRandomWalk(half, step, 0.92, 0.1);
  const last = first[first.length - 1];
  const second = [];
  for (let i = 1; i < count - half + 1; i += 1) {
    const s = i / Math.max(1, count - half);
    const bend = Math.sin(Math.PI * s) * step * 1.2;
    second.push(vec3(
      last.x - s * step * (half - 1) * 0.8,
      last.y + bend,
      last.z + bend * 0.1
    ));
  }
  return recenterPoints([...first, ...second]);
}

function buildRing(count, step) {
  const radius = step * count * rand(0.13, 0.16);
  const pts = [];
  for (let i = 0; i < count; i += 1) {
    const s = i / count;
    const a = s * TAU;
    pts.push(vec3(
      Math.cos(a) * radius,
      Math.sin(a) * radius * rand(0.92, 1.08),
      Math.sin(a * 2.1 + rand(-0.2, 0.2)) * radius * 0.18
    ));
  }
  return pts;
}

function buildGlobule(count, step) {
  const pts = buildRandomWalk(count, step, 0.72, 0.22).map((p, i) => {
    const s = i / Math.max(1, count - 1);
    const pull = 0.68 + 0.22 * Math.sin(Math.PI * s);
    return vec3(p.x * pull, p.y * pull, p.z * 0.6);
  });
  return recenterPoints(pts);
}

function buildBottlebrush(backboneCount, sideLength, step) {
  const backbone = buildRandomWalk(backboneCount, step, 0.93, 0.08).map((p) => vec3(p.x, p.y * 0.72, p.z * 0.4));
  const nodes = [...backbone];
  const bonds = [];
  const backboneIndices = [];
  for (let i = 0; i < backboneCount; i += 1) backboneIndices.push(i);
  for (let i = 0; i < backboneCount - 1; i += 1) bonds.push([i, i + 1]);
  for (let i = 1; i < backboneCount - 1; i += 2) {
    const prev = backbone[Math.max(0, i - 1)];
    const next = backbone[Math.min(backboneCount - 1, i + 1)];
    const tangent = normalize(sub(next, prev), vec3(1, 0, 0));
    const normal = normalize(vec3(-tangent.y, tangent.x, rand(-0.15, 0.15)), vec3(0, 1, 0));
    let parent = i;
    for (let j = 1; j <= sideLength; j += 1) {
      const sign = j % 2 === 0 ? -1 : 1;
      const base = add(backbone[i], scale(normal, sign * j * step * 0.9));
      const id = nodes.length;
      nodes.push(vec3(base.x, base.y, base.z + sign * j * step * 0.06));
      bonds.push([parent, id]);
      parent = id;
    }
  }
  return { points: recenterPoints(nodes), bonds, backbone: backboneIndices };
}

function makeSpreadCenters(count, width, height, margin, radiusHint) {
  const centers = [];
  for (let i = 0; i < count; i += 1) {
    let placed = false;
    for (let attempt = 0; attempt < 120 && !placed; attempt += 1) {
      const point = vec3(
        rand(margin, Math.max(margin + 1, width - margin)),
        rand(margin, Math.max(margin + 1, height - margin)),
        rand(-24, 24)
      );
      let ok = true;
      for (const other of centers) {
        const dist = Math.hypot(point.x - other.x, point.y - other.y);
        if (dist < radiusHint) {
          ok = false;
          break;
        }
      }
      if (ok) {
        centers.push(point);
        placed = true;
      }
    }
    if (!placed) {
      centers.push(vec3(
        rand(margin, Math.max(margin + 1, width - margin)),
        rand(margin, Math.max(margin + 1, height - margin)),
        rand(-24, 24)
      ));
    }
  }
  return centers;
}

function buildExclusionSet(nodeCount, bonds) {
  const adj = Array.from({ length: nodeCount }, () => []);
  bonds.forEach(([a, b]) => {
    adj[a].push(b);
    adj[b].push(a);
  });
  const set = new Set();
  for (let start = 0; start < nodeCount; start += 1) {
    const visited = new Set([start]);
    let frontier = [start];
    for (let depth = 0; depth < 2; depth += 1) {
      const next = [];
      frontier.forEach((id) => {
        adj[id].forEach((nbr) => {
          if (visited.has(nbr)) return;
          visited.add(nbr);
          next.push(nbr);
          const a = Math.min(start, nbr);
          const b = Math.max(start, nbr);
          set.add(`${a}:${b}`);
        });
      });
      frontier = next;
    }
  }
  return { set, adj };
}

function createChain(state, index) {
  const kind = choice([
    'coil', 'coil', 'coil',
    'swollen', 'swollen',
    'semiflexible', 'semiflexible',
    'globule', 'globule',
    'hairpin',
    'ring', 'ring',
    'bottlebrush'
  ]);
  const baseColor = state.chainColors[index % state.chainColors.length];
  const beadRadius = kind === 'globule'
    ? rand(4.8, 5.8)
    : kind === 'ring'
      ? rand(4.8, 5.8)
      : kind === 'bottlebrush'
        ? rand(4.4, 5.2)
        : rand(4.6, 5.6);
  const step = rand(10.2, 12.4);
  let points;
  let bonds = [];
  let backbone = [];
  let ring = false;

  if (kind === 'ring') {
    const count = Math.round(rand(15, 21));
    points = buildRing(count, step * 0.92);
    for (let i = 0; i < count; i += 1) bonds.push([i, (i + 1) % count]);
    backbone = Array.from({ length: count }, (_, i) => i);
    ring = true;
  } else if (kind === 'hairpin') {
    const count = Math.round(rand(16, 24));
    points = buildHairpin(count, step);
    for (let i = 0; i < count - 1; i += 1) bonds.push([i, i + 1]);
    backbone = Array.from({ length: count }, (_, i) => i);
  } else if (kind === 'semiflexible') {
    const count = Math.round(rand(15, 23));
    points = buildSemiflexible(count, step);
    for (let i = 0; i < count - 1; i += 1) bonds.push([i, i + 1]);
    backbone = Array.from({ length: count }, (_, i) => i);
  } else if (kind === 'globule') {
    const count = Math.round(rand(18, 26));
    points = buildGlobule(count, step * 0.9);
    for (let i = 0; i < count - 1; i += 1) bonds.push([i, i + 1]);
    backbone = Array.from({ length: count }, (_, i) => i);
  } else if (kind === 'swollen') {
    const count = Math.round(rand(16, 24));
    points = buildSwollen(count, step);
    for (let i = 0; i < count - 1; i += 1) bonds.push([i, i + 1]);
    backbone = Array.from({ length: count }, (_, i) => i);
  } else if (kind === 'bottlebrush') {
    const brush = buildBottlebrush(Math.round(rand(9, 13)), Math.round(rand(2, 3)), step * 0.86);
    points = brush.points;
    bonds = brush.bonds;
    backbone = brush.backbone;
  } else {
    const count = Math.round(rand(16, 25));
    points = buildLinearCoil(count, step);
    for (let i = 0; i < count - 1; i += 1) bonds.push([i, i + 1]);
    backbone = Array.from({ length: count }, (_, i) => i);
  }

  const center = state.centers[index];
  const nodes = points.map((point) => makeNode(add(point, center), beadRadius));
  const restBonds = bonds.map(([a, b]) => ({
    a,
    b,
    len: Math.max(8.6, length(sub(points[b], points[a])))
  }));
  const exclusion = buildExclusionSet(nodes.length, bonds);
  const chain = {
    kind,
    ring,
    color: baseColor,
    shadow: tone(baseColor, -24, -10, 0.22),
    bond: tone(baseColor, -6, 3, 0.34),
    bondGlow: tone(baseColor, 16, 8, 0.11),
    beadLight: tone(baseColor, 16, -4, 1),
    beadDark: tone(baseColor, -18, 10, 1),
    beadRadius,
    nodes,
    bonds: restBonds,
    backbone,
    adjacency: exclusion.adj,
    exclude: exclusion.set,
    drift: vec3(rand(-0.02, 0.02), rand(-0.02, 0.02), rand(-0.004, 0.004)),
    driftPhase: rand(0, TAU),
    bendStiffness: kind === 'semiflexible' ? 0.34 : kind === 'ring' ? 0.24 : kind === 'globule' ? 0.12 : 0.18,
    modeAmp: kind === 'globule' ? 0.14 : kind === 'semiflexible' ? 0.16 : 0.22,
    modeOmega1: rand(0.22, 0.42),
    modeOmega2: rand(0.34, 0.58),
    phase1: rand(0, TAU),
    phase2: rand(0, TAU),
    zBias: rand(0.08, 0.22),
    backboneModeFlip: Math.random() > 0.5 ? 1 : -1
  };
  return chain;
}

function createParticle(state) {
  const radius = rand(2.1, 4.8);
  const node = makeNode(vec3(
    rand(0, state.width),
    rand(0, state.height),
    rand(-28, 28)
  ), radius, 'particle');
  node.px = node.x - rand(-0.6, 0.6);
  node.py = node.y - rand(-0.6, 0.6);
  node.pz = node.z - rand(-0.12, 0.12);
  return {
    node,
    radius,
    color: choice(state.chainColors),
    shadow: 'rgba(0,0,0,0.14)',
    beadLight: tone(choice(state.chainColors), 16, -4, 1),
    beadDark: tone(choice(state.chainColors), -18, 10, 1),
    wander: rand(0.25, 0.48),
    phase: rand(0, TAU)
  };
}

function recolorState(state) {
  state.chainColors = readThemeColors();
  state.backdrop = readBackdrop();
  state.chains.forEach((chain, index) => {
    const color = state.chainColors[index % state.chainColors.length];
    chain.color = color;
    chain.shadow = tone(color, -24, -10, 0.22);
    chain.bond = tone(color, -6, 3, 0.34);
    chain.bondGlow = tone(color, 16, 8, 0.11);
    chain.beadLight = tone(color, 16, -4, 1);
    chain.beadDark = tone(color, -18, 10, 1);
  });
  state.particles.forEach((particle, index) => {
    const color = state.chainColors[index % state.chainColors.length];
    particle.color = color;
    particle.beadLight = tone(color, 16, -4, 1);
    particle.beadDark = tone(color, -18, 10, 1);
  });
}

function drawBackdrop(ctx, state, time) {
  const { width, height, backdrop } = state;
  ctx.clearRect(0, 0, width, height);

  const base = ctx.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, backdrop.bgA);
  base.addColorStop(1, backdrop.bgB);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  const glowA = ctx.createRadialGradient(width * 0.18, height * 0.16, 0, width * 0.18, height * 0.16, Math.max(width, height) * 0.34);
  glowA.addColorStop(0, backdrop.glowA);
  glowA.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glowA;
  ctx.fillRect(0, 0, width, height);

  const glowB = ctx.createRadialGradient(width * 0.78, height * 0.74, 0, width * 0.78, height * 0.74, Math.max(width, height) * 0.3);
  glowB.addColorStop(0, backdrop.glowB);
  glowB.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glowB;
  ctx.fillRect(0, 0, width, height);

  const t = time * 0.00008;
  ctx.save();
  ctx.globalAlpha = 0.045;
  for (let i = 0; i < 4; i += 1) {
    const x = width * (0.14 + i * 0.22) + Math.sin(t * (0.9 + i * 0.15) + i * 1.2) * 28;
    const y = height * (0.18 + i * 0.18) + Math.cos(t * (0.76 + i * 0.14) + i * 1.8) * 22;
    const radius = Math.max(width, height) * (0.16 + i * 0.04);
    const haze = ctx.createRadialGradient(x, y, 0, x, y, radius);
    haze.addColorStop(0, backdrop.halo);
    haze.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}

function projectPoint(point) {
  const depth = clamp(0.58 + point.z / 90, 0.08, 1.12);
  return {
    x: point.x + (depth - 0.58) * 5.2,
    y: point.y - (depth - 0.58) * 3.2,
    scale: 0.5 + depth * 0.72,
    alpha: clamp(0.12 + depth * 0.82, 0.12, 1),
    depth
  };
}

function drawSphere(ctx, x, y, radius, lightColor, darkColor, alpha = 1) {
  const gradient = ctx.createRadialGradient(x - radius * 0.28, y - radius * 0.3, radius * 0.14, x, y, radius);
  gradient.addColorStop(0, 'rgba(255,255,255,0.96)');
  gradient.addColorStop(0.22, lightColor);
  gradient.addColorStop(0.72, mixColor(lightColor, darkColor, 0.35));
  gradient.addColorStop(1, darkColor);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function mixColor(a, b, t) {
  // Parse hsla/rgba only indirectly by using canvas fallback is not practical here.
  // Returning first color for small t keeps function cheap and deterministic.
  return t < 0.5 ? a : b;
}

function drawBond(ctx, ax, ay, bx, by, width, glowColor, lineColor, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha * 0.22;
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = width * 2.15;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = alpha * 0.92;
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.restore();
}

function drawParticles(ctx, state) {
  state.particles
    .slice()
    .sort((a, b) => a.node.z - b.node.z)
    .forEach((particle) => {
      const screen = projectPoint(particle.node);
      const radius = particle.radius * screen.scale;
      ctx.save();
      ctx.globalAlpha = screen.alpha * 0.14;
      ctx.fillStyle = particle.shadow;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, radius * 1.5, 0, TAU);
      ctx.fill();
      ctx.restore();
      drawSphere(ctx, screen.x, screen.y, radius, particle.beadLight, particle.beadDark, screen.alpha * 0.98);
    });
}

function drawChain(ctx, chain) {
  const projected = chain.nodes.map((node) => ({ node, screen: projectPoint(node) }));
  chain.bonds.forEach((bond) => {
    const a = projected[bond.a];
    const b = projected[bond.b];
    const width = chain.beadRadius * 0.42 * (a.screen.scale + b.screen.scale) * 0.5;
    const alpha = Math.min(a.screen.alpha, b.screen.alpha);
    drawBond(ctx, a.screen.x, a.screen.y, b.screen.x, b.screen.y, width, chain.bondGlow, chain.bond, alpha);
  });

  projected
    .slice()
    .sort((a, b) => a.node.z - b.node.z)
    .forEach((item) => {
      const radius = chain.beadRadius * item.screen.scale;
      ctx.save();
      ctx.globalAlpha = item.screen.alpha * 0.14;
      ctx.fillStyle = chain.shadow;
      ctx.beginPath();
      ctx.arc(item.screen.x, item.screen.y, radius * 1.55, 0, TAU);
      ctx.fill();
      ctx.restore();
      drawSphere(ctx, item.screen.x, item.screen.y, radius, chain.beadLight, chain.beadDark, item.screen.alpha);
    });
}

function buildSpatialHash(items, cellSize) {
  const map = new Map();
  items.forEach((item, index) => {
    const gx = Math.floor(item.x / cellSize);
    const gy = Math.floor(item.y / cellSize);
    const key = `${gx},${gy}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(index);
  });
  return map;
}

function forEachNeighborPair(items, cellSize, fn) {
  const grid = buildSpatialHash(items, cellSize);
  const offsets = [
    [0, 0], [1, 0], [0, 1], [1, 1], [-1, 1]
  ];
  grid.forEach((bucket, key) => {
    const [gx, gy] = key.split(',').map(Number);
    offsets.forEach(([ox, oy]) => {
      const other = grid.get(`${gx + ox},${gy + oy}`);
      if (!other) return;
      for (let ai = 0; ai < bucket.length; ai += 1) {
        const startBj = ox === 0 && oy === 0 ? ai + 1 : 0;
        for (let bi = startBj; bi < other.length; bi += 1) {
          const i = bucket[ai];
          const j = other[bi];
          if (i === j) continue;
          fn(i, j);
        }
      }
    });
  });
}

function applyVerlet(chain, dt, time, bounds) {
  const dt2 = dt * dt;
  chain.driftPhase += dt * rand(0.2, 0.4);
  chain.drift.x += Math.sin(time * 0.18 + chain.driftPhase) * 0.0008;
  chain.drift.y += Math.cos(time * 0.15 + chain.driftPhase * 1.2) * 0.0008;
  chain.drift.z += Math.sin(time * 0.12 + chain.driftPhase * 0.7) * 0.00008;
  chain.drift.x = clamp(chain.drift.x, -0.08, 0.08);
  chain.drift.y = clamp(chain.drift.y, -0.08, 0.08);
  chain.drift.z = clamp(chain.drift.z, -0.012, 0.012);

  const center = centerOfNodes(chain.nodes);
  chain.nodes.forEach((node, index) => {
    const vx = (node.x - node.px) * 0.982 + chain.drift.x;
    const vy = (node.y - node.py) * 0.982 + chain.drift.y;
    const vz = (node.z - node.pz) * 0.984 + chain.drift.z;

    node.px = node.x;
    node.py = node.y;
    node.pz = node.z;

    let ax = 0;
    let ay = 0;
    let az = 0;

    const backbonePos = chain.backbone.indexOf(index);
    if (backbonePos >= 0) {
      const s = chain.ring ? backbonePos / Math.max(1, chain.backbone.length) : backbonePos / Math.max(1, chain.backbone.length - 1);
      const prevId = chain.backbone[(backbonePos - 1 + chain.backbone.length) % chain.backbone.length];
      const nextId = chain.backbone[(backbonePos + 1) % chain.backbone.length];
      if (chain.ring || (backbonePos > 0 && backbonePos < chain.backbone.length - 1)) {
        const prev = chain.nodes[prevId];
        const next = chain.nodes[nextId];
        const tangent = normalize(sub(next, prev), vec3(1, 0, 0));
        const normal = normalize(vec3(-tangent.y, tangent.x, chain.backboneModeFlip * 0.18), vec3(0, 1, 0));
        const und1 = Math.sin(chain.phase1 + time * chain.modeOmega1 + s * TAU * 1.1);
        const und2 = Math.sin(chain.phase2 - time * chain.modeOmega2 + s * TAU * 2.3);
        const mode = (und1 * 0.68 + und2 * 0.32) * chain.modeAmp;
        ax += normal.x * mode * 42;
        ay += normal.y * mode * 42;
        az += normal.z * mode * 14;
      }
      if (chain.kind === 'globule') {
        const toCenter = sub(center, node);
        ax += toCenter.x * 0.3;
        ay += toCenter.y * 0.3;
        az += toCenter.z * 0.18;
      }
    } else if (chain.kind === 'bottlebrush') {
      const toCenter = sub(node, center);
      ax += toCenter.x * 0.08;
      ay += toCenter.y * 0.08;
      az += toCenter.z * 0.04;
    }

    ax += rand(-1, 1) * 10;
    ay += rand(-1, 1) * 10;
    az += rand(-1, 1) * 3 + Math.sin(time * 0.3 + index * 0.9) * chain.zBias;

    if (node.x < bounds.margin) ax += (bounds.margin - node.x) * 3.6;
    if (node.x > bounds.width - bounds.margin) ax -= (node.x - (bounds.width - bounds.margin)) * 3.6;
    if (node.y < bounds.margin) ay += (bounds.margin - node.y) * 3.6;
    if (node.y > bounds.height - bounds.margin) ay -= (node.y - (bounds.height - bounds.margin)) * 3.6;
    if (node.z < -bounds.z) az += (-bounds.z - node.z) * -0.5;
    if (node.z > bounds.z) az -= (node.z - bounds.z) * 0.5;

    node.x += vx + ax * dt2;
    node.y += vy + ay * dt2;
    node.z += vz + az * dt2;
  });
}

function applyParticleVerlet(particle, dt, time, bounds) {
  const node = particle.node;
  const dt2 = dt * dt;
  const vx = (node.x - node.px) * 0.986;
  const vy = (node.y - node.py) * 0.986;
  const vz = (node.z - node.pz) * 0.988;
  node.px = node.x;
  node.py = node.y;
  node.pz = node.z;

  const ax = Math.sin(time * particle.wander + particle.phase) * 12;
  const ay = Math.cos(time * particle.wander * 0.87 + particle.phase * 1.2) * 12;
  const az = Math.sin(time * particle.wander * 0.5 + particle.phase * 0.7) * 2.2;

  node.x += vx + ax * dt2;
  node.y += vy + ay * dt2;
  node.z += vz + az * dt2;

  if (node.x < bounds.margin) node.x += (bounds.margin - node.x) * 0.2;
  if (node.x > bounds.width - bounds.margin) node.x -= (node.x - (bounds.width - bounds.margin)) * 0.2;
  if (node.y < bounds.margin) node.y += (bounds.margin - node.y) * 0.2;
  if (node.y > bounds.height - bounds.margin) node.y -= (node.y - (bounds.height - bounds.margin)) * 0.2;
  node.z = clamp(node.z, -bounds.z, bounds.z);
}

function solveBondConstraints(chain, stiffness = 0.72) {
  chain.bonds.forEach((bond) => {
    const a = chain.nodes[bond.a];
    const b = chain.nodes[bond.b];
    const delta = sub(b, a);
    const dist = Math.max(1e-6, length(delta));
    const diff = (dist - bond.len) / dist;
    const corr = scale(delta, 0.5 * stiffness * diff);
    a.x += corr.x;
    a.y += corr.y;
    a.z += corr.z;
    b.x -= corr.x;
    b.y -= corr.y;
    b.z -= corr.z;
  });
}

function solveBendConstraints(chain, stiffness = null) {
  const bend = stiffness ?? chain.bendStiffness;
  if (bend <= 0) return;
  const ids = chain.backbone;
  if (ids.length < 3) return;
  for (let i = 1; i < ids.length - 1; i += 1) {
    const a = chain.nodes[ids[i - 1]];
    const b = chain.nodes[ids[i]];
    const c = chain.nodes[ids[i + 1]];
    const target = vec3((a.x + c.x) * 0.5, (a.y + c.y) * 0.5, (a.z + c.z) * 0.5);
    b.x += (target.x - b.x) * bend;
    b.y += (target.y - b.y) * bend;
    b.z += (target.z - b.z) * bend;
  }
  if (chain.ring && ids.length >= 4) {
    const a = chain.nodes[ids[ids.length - 1]];
    const b = chain.nodes[ids[0]];
    const c = chain.nodes[ids[1]];
    const target = vec3((a.x + c.x) * 0.5, (a.y + c.y) * 0.5, (a.z + c.z) * 0.5);
    b.x += (target.x - b.x) * bend;
    b.y += (target.y - b.y) * bend;
    b.z += (target.z - b.z) * bend;
  }
}

function buildInteractionItems(state) {
  const items = [];
  state.chains.forEach((chain, chainIndex) => {
    chain.nodes.forEach((node, beadIndex) => {
      items.push({
        x: node.x,
        y: node.y,
        z: node.z,
        radius: node.radius * 1.08,
        type: 'bead',
        chainIndex,
        beadIndex,
        node,
        chain
      });
    });
  });
  state.particles.forEach((particle, particleIndex) => {
    items.push({
      x: particle.node.x,
      y: particle.node.y,
      z: particle.node.z,
      radius: particle.radius * 1.1,
      type: 'particle',
      particleIndex,
      node: particle.node,
      particle
    });
  });
  return items;
}

function shouldSkipPair(a, b) {
  if (a.type === 'bead' && b.type === 'bead' && a.chainIndex === b.chainIndex) {
    const i = Math.min(a.beadIndex, b.beadIndex);
    const j = Math.max(a.beadIndex, b.beadIndex);
    return a.chain.exclude.has(`${i}:${j}`);
  }
  return false;
}

function solveExcludedVolume(state, iterations = 1) {
  for (let pass = 0; pass < iterations; pass += 1) {
    const items = buildInteractionItems(state);
    const cellSize = 20;
    forEachNeighborPair(items, cellSize, (i, j) => {
      const a = items[i];
      const b = items[j];
      if (shouldSkipPair(a, b)) return;
      const dx = b.node.x - a.node.x;
      const dy = b.node.y - a.node.y;
      const dz = (b.node.z - a.node.z) * 1.25;
      const dist = Math.hypot(dx, dy, dz);
      const minDist = a.radius + b.radius + 2.4;
      if (dist >= minDist || dist < 1e-6) return;
      const overlap = minDist - dist;
      const depthFactor = Math.pow(clamp(1 - Math.abs(b.node.z - a.node.z) / 58, 0, 1), 1.4);
      const nx = dx / dist;
      const ny = dy / dist;
      const nz = dz / dist;
      const weight = overlap * 0.44 * depthFactor;
      const aw = a.type === 'particle' ? 1.08 : 1;
      const bw = b.type === 'particle' ? 1.08 : 1;
      const total = aw + bw;
      a.node.x -= nx * weight * (bw / total);
      a.node.y -= ny * weight * (bw / total);
      a.node.z -= nz * weight * (bw / total) * 0.8;
      b.node.x += nx * weight * (aw / total);
      b.node.y += ny * weight * (aw / total);
      b.node.z += nz * weight * (aw / total) * 0.8;
    });
  }
}

function solveWalls(state) {
  const margin = 16;
  const zMax = 34;
  const apply = (node) => {
    node.x = clamp(node.x, margin, state.width - margin);
    node.y = clamp(node.y, margin, state.height - margin);
    node.z = clamp(node.z, -zMax, zMax);
  };
  state.chains.forEach((chain) => chain.nodes.forEach(apply));
  state.particles.forEach((particle) => apply(particle.node));
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
    particles: [],
    centers: []
  };

  const areaFactor = clamp((width * height) / (1440 * 900), 0.86, 1.42);
  const chainCount = Math.max(variant === 'hero' ? 22 : 14, Math.round((variant === 'hero' ? 24 : 15) * density * areaFactor));
  const particleCount = Math.max(variant === 'hero' ? 150 : 88, Math.round((variant === 'hero' ? 176 : 100) * density * areaFactor));
  state.centers = makeSpreadCenters(chainCount, width, height, 66, Math.max(62, Math.sqrt((width * height) / chainCount) * 0.58));
  state.chains = Array.from({ length: chainCount }, (_, index) => createChain(state, index));
  state.particles = Array.from({ length: particleCount }, () => createParticle(state));
  recolorState(state);
  return state;
}

function simulate(state, dt, timeMs) {
  const time = timeMs * 0.001;
  const bounds = { width: state.width, height: state.height, margin: 26, z: 34 };

  state.chains.forEach((chain) => applyVerlet(chain, dt, time, bounds));
  state.particles.forEach((particle) => applyParticleVerlet(particle, dt, time, bounds));

  for (let iter = 0; iter < 3; iter += 1) {
    state.chains.forEach((chain) => {
      solveBondConstraints(chain, 0.72);
      solveBendConstraints(chain, iter === 0 ? chain.bendStiffness : chain.bendStiffness * 0.62);
    });
    solveExcludedVolume(state, 1);
    solveWalls(state);
  }
}

function render(state, time) {
  drawBackdrop(state.ctx, state, time);
  drawParticles(state.ctx, state);
  state.chains
    .slice()
    .sort((a, b) => {
      const az = a.nodes.reduce((sum, node) => sum + node.z, 0) / Math.max(1, a.nodes.length);
      const bz = b.nodes.reduce((sum, node) => sum + node.z, 0) / Math.max(1, b.nodes.length);
      return az - bz;
    })
    .forEach((chain) => drawChain(state.ctx, chain));
}

export function initMolecularField(canvas, options = {}) {
  if (!canvas) return null;
  const variant = options.variant || 'hero';
  const density = clamp(options.density ?? 1, 0.5, 1.55);
  let state = buildState(canvas, variant, density);
  let rafId = 0;
  let last = 0;

  const observer = new MutationObserver(() => {
    recolorState(state);
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-theme-mode'] });

  const onResize = () => {
    state = buildState(canvas, variant, density);
  };
  window.addEventListener('resize', onResize);

  const frame = (time) => {
    const dt = clamp((time - last) / 1000 || 0.016, 0.010, 0.026);
    last = time;
    simulate(state, dt, time);
    render(state, time);
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
