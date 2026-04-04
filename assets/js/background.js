
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

function mod(value, size) {
  const out = value % size;
  return out < 0 ? out + size : out;
}

function wrapCoord(value, size) {
  return mod(value, size);
}

function minimalDelta(delta, size) {
  if (delta > size * 0.5) return delta - size;
  if (delta < -size * 0.5) return delta + size;
  return delta;
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

function gaussian() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
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

function centerOfPoints(points) {
  let sx = 0;
  let sy = 0;
  let sz = 0;
  points.forEach((point) => {
    sx += point.x;
    sy += point.y;
    sz += point.z;
  });
  const inv = 1 / Math.max(1, points.length);
  return vec3(sx * inv, sy * inv, sz * inv);
}

function makeNode(position, radius, type = 'bead') {
  return {
    x: position.x,
    y: position.y,
    z: position.z,
    radius,
    type,
    fx: 0,
    fy: 0,
    fz: 0
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
  const center = centerOfPoints(points);
  return points.map((point) => sub(point, center));
}

function buildLinearCoil(count, step, stiffness = 0.86) {
  const pts = buildRandomWalk(count, step, stiffness, 0.14).map((p, i) => {
    const s = i / Math.max(1, count - 1);
    return vec3(p.x, p.y - Math.sin(Math.PI * s) * step * 0.15, p.z * 0.7);
  });
  return recenterPoints(pts);
}

function buildSwollen(count, step) {
  const pts = buildRandomWalk(count, step, 0.88, 0.14).map((p, i) => {
    const s = i / Math.max(1, count - 1);
    const swell = 1.06 + 0.16 * Math.sin(Math.PI * s);
    return vec3(p.x * swell, p.y * swell, p.z * 0.75);
  });
  return recenterPoints(pts);
}

function buildSemiflexible(count, step) {
  const pts = buildRandomWalk(count, step, 0.95, 0.08).map((p, i) => {
    const s = i / Math.max(1, count - 1);
    return vec3(p.x + (s - 0.5) * step * count * 0.06, p.y * 0.7, p.z * 0.45);
  });
  return recenterPoints(pts);
}

function buildHairpin(count, step) {
  const half = Math.max(4, Math.floor(count * 0.55));
  const first = buildRandomWalk(half, step, 0.93, 0.1);
  const last = first[first.length - 1];
  const second = [];
  for (let i = 1; i < count - half + 1; i += 1) {
    const s = i / Math.max(1, count - half);
    const bend = Math.sin(Math.PI * s) * step * 1.1;
    second.push(vec3(
      last.x - s * step * (half - 1) * 0.78,
      last.y + bend,
      last.z + bend * 0.08
    ));
  }
  return recenterPoints([...first, ...second]);
}

function buildRing(count, step) {
  const radius = step * count * rand(0.12, 0.15);
  const pts = [];
  for (let i = 0; i < count; i += 1) {
    const s = i / count;
    const a = s * TAU;
    pts.push(vec3(
      Math.cos(a) * radius,
      Math.sin(a) * radius * rand(0.94, 1.06),
      Math.sin(a * 2.0 + rand(-0.18, 0.18)) * radius * 0.16
    ));
  }
  return pts;
}

function buildGlobule(count, step) {
  const pts = buildRandomWalk(count, step, 0.74, 0.2).map((p, i) => {
    const s = i / Math.max(1, count - 1);
    const pull = 0.66 + 0.22 * Math.sin(Math.PI * s);
    return vec3(p.x * pull, p.y * pull, p.z * 0.56);
  });
  return recenterPoints(pts);
}

function buildBottlebrush(backboneCount, sideLength, step) {
  const backbone = buildRandomWalk(backboneCount, step, 0.94, 0.06).map((p) => vec3(p.x, p.y * 0.66, p.z * 0.32));
  const nodes = [...backbone];
  const bonds = [];
  const backboneIndices = [];
  for (let i = 0; i < backboneCount; i += 1) backboneIndices.push(i);
  for (let i = 0; i < backboneCount - 1; i += 1) bonds.push([i, i + 1]);

  for (let i = 1; i < backboneCount - 1; i += 2) {
    const prev = backbone[Math.max(0, i - 1)];
    const next = backbone[Math.min(backboneCount - 1, i + 1)];
    const tangent = normalize(sub(next, prev), vec3(1, 0, 0));
    const normal = normalize(vec3(-tangent.y, tangent.x, rand(-0.12, 0.12)), vec3(0, 1, 0));
    let parent = i;
    for (let j = 1; j <= sideLength; j += 1) {
      const sign = j % 2 === 0 ? -1 : 1;
      const base = add(backbone[i], scale(normal, sign * j * step * 0.86));
      const id = nodes.length;
      nodes.push(vec3(base.x, base.y, base.z + sign * j * step * 0.04));
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
    for (let attempt = 0; attempt < 140 && !placed; attempt += 1) {
      const point = vec3(
        rand(margin, Math.max(margin + 1, width - margin)),
        rand(margin, Math.max(margin + 1, height - margin)),
        rand(-22, 22)
      );
      let ok = true;
      for (const other of centers) {
        const dx = point.x - other.x;
        const dy = point.y - other.y;
        if (Math.hypot(dx, dy) < radiusHint) {
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
        rand(-22, 22)
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

function buildRenderTree(nodeCount, bonds, ring = false) {
  const adj = Array.from({ length: nodeCount }, () => []);
  bonds.forEach(([a, b], bondIndex) => {
    adj[a].push({ id: b, bondIndex });
    adj[b].push({ id: a, bondIndex });
  });
  const keep = new Set();
  const visited = new Set([0]);
  const queue = [0];
  while (queue.length) {
    const id = queue.shift();
    adj[id].forEach(({ id: nbr, bondIndex }) => {
      if (visited.has(nbr)) return;
      visited.add(nbr);
      keep.add(bondIndex);
      queue.push(nbr);
    });
  }
  const extra = [];
  if (ring) {
    bonds.forEach(([a, b], bondIndex) => {
      if (!keep.has(bondIndex)) extra.push([a, b]);
    });
  }
  return { treeBondIndices: keep, extra };
}

function periodicDeltaBetween(a, b, state) {
  return {
    x: minimalDelta(b.x - a.x, state.worldWidth),
    y: minimalDelta(b.y - a.y, state.worldHeight),
    z: b.z - a.z
  };
}

function unwrapChain(chain, state) {
  const root = chain.backbone[0] ?? 0;
  const positions = Array(chain.nodes.length);
  const screenRoot = {
    x: minimalDelta(chain.nodes[root].x - state.camera.x, state.worldWidth),
    y: minimalDelta(chain.nodes[root].y - state.camera.y, state.worldHeight),
    z: chain.nodes[root].z
  };
  positions[root] = screenRoot;
  const visited = new Set([root]);
  const queue = [root];

  while (queue.length) {
    const current = queue.shift();
    const base = positions[current];
    chain.adjacency[current].forEach((nbr) => {
      if (visited.has(nbr)) return;
      const delta = periodicDeltaBetween(chain.nodes[current], chain.nodes[nbr], state);
      positions[nbr] = {
        x: base.x + delta.x,
        y: base.y + delta.y,
        z: chain.nodes[nbr].z
      };
      visited.add(nbr);
      queue.push(nbr);
    });
  }

  return positions.map((position, index) => {
    const node = chain.nodes[index];
    const depth = clamp(0.58 + position.z / 88, 0.08, 1.14);
    return {
      x: state.width * 0.5 + position.x + (depth - 0.58) * 4.6,
      y: state.height * 0.5 + position.y - (depth - 0.58) * 2.8,
      z: position.z,
      depth,
      scale: 0.5 + depth * 0.72,
      alpha: clamp(0.14 + depth * 0.82, 0.14, 1),
      node
    };
  });
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
  const beadRadius = kind === 'bottlebrush'
    ? rand(4.2, 5.0)
    : kind === 'globule'
      ? rand(4.7, 5.6)
      : rand(4.4, 5.3);
  const step = rand(9.5, 11.0);

  let points = [];
  let bonds = [];
  let backbone = [];
  let ring = false;

  if (kind === 'ring') {
    const count = Math.round(rand(13, 18));
    points = buildRing(count, step * 0.92);
    for (let i = 0; i < count; i += 1) bonds.push([i, (i + 1) % count]);
    backbone = Array.from({ length: count }, (_, i) => i);
    ring = true;
  } else if (kind === 'hairpin') {
    const count = Math.round(rand(14, 20));
    points = buildHairpin(count, step);
    for (let i = 0; i < count - 1; i += 1) bonds.push([i, i + 1]);
    backbone = Array.from({ length: count }, (_, i) => i);
  } else if (kind === 'semiflexible') {
    const count = Math.round(rand(14, 20));
    points = buildSemiflexible(count, step);
    for (let i = 0; i < count - 1; i += 1) bonds.push([i, i + 1]);
    backbone = Array.from({ length: count }, (_, i) => i);
  } else if (kind === 'globule') {
    const count = Math.round(rand(16, 21));
    points = buildGlobule(count, step * 0.9);
    for (let i = 0; i < count - 1; i += 1) bonds.push([i, i + 1]);
    backbone = Array.from({ length: count }, (_, i) => i);
  } else if (kind === 'swollen') {
    const count = Math.round(rand(14, 20));
    points = buildSwollen(count, step);
    for (let i = 0; i < count - 1; i += 1) bonds.push([i, i + 1]);
    backbone = Array.from({ length: count }, (_, i) => i);
  } else if (kind === 'bottlebrush') {
    const brush = buildBottlebrush(Math.round(rand(8, 11)), Math.round(rand(2, 3)), step * 0.84);
    points = brush.points;
    bonds = brush.bonds;
    backbone = brush.backbone;
  } else {
    const count = Math.round(rand(14, 21));
    points = buildLinearCoil(count, step);
    for (let i = 0; i < count - 1; i += 1) bonds.push([i, i + 1]);
    backbone = Array.from({ length: count }, (_, i) => i);
  }

  const center = state.centers[index];
  const nodes = points.map((point) => makeNode(add(point, center), beadRadius));
  const restBonds = bonds.map(([a, b]) => ({
    a,
    b,
    len: Math.max(8.2, length(sub(points[b], points[a])))
  }));
  const exclusion = buildExclusionSet(nodes.length, bonds);
  const renderTree = buildRenderTree(nodes.length, bonds, ring);

  return {
    kind,
    ring,
    color: baseColor,
    shadow: tone(baseColor, -22, -10, 0.24),
    bond: tone(baseColor, -6, 3, 0.36),
    bondGlow: tone(baseColor, 16, 8, 0.12),
    beadLight: tone(baseColor, 16, -4, 1),
    beadDark: tone(baseColor, -18, 10, 1),
    beadRadius,
    nodes,
    bonds: restBonds,
    rawBonds: bonds,
    backbone,
    adjacency: exclusion.adj,
    exclude: exclusion.set,
    renderTree,
    bendK: kind === 'semiflexible' ? 0.22 : kind === 'ring' ? 0.18 : kind === 'bottlebrush' ? 0.12 : 0.14,
    mobility: kind === 'bottlebrush' ? 0.11 : kind === 'semiflexible' ? 0.13 : 0.15,
    diffusivity: kind === 'globule' ? 3.0 : kind === 'semiflexible' ? 3.4 : 3.8,
    zDiffusivity: kind === 'globule' ? 0.22 : 0.28,
    zCenter: center.z
  };
}

function createParticle(state) {
  const color = choice(state.chainColors);
  const radius = rand(2.2, 4.8);
  const centerBandX = state.camera ? state.camera.homeX : state.worldWidth * 0.5;
  const centerBandY = state.camera ? state.camera.homeY : state.worldHeight * 0.5;
  return {
    node: makeNode(vec3(
      wrapCoord(centerBandX + rand(-state.worldWidth * 0.48, state.worldWidth * 0.48), state.worldWidth),
      wrapCoord(centerBandY + rand(-state.worldHeight * 0.48, state.worldHeight * 0.48), state.worldHeight),
      rand(-26, 26)
    ), radius, 'particle'),
    radius,
    color,
    shadow: 'rgba(0,0,0,0.16)',
    beadLight: tone(color, 16, -4, 1),
    beadDark: tone(color, -18, 10, 1),
    mobility: 0.54,
    diffusivity: rand(11.0, 15.0),
    zDiffusivity: rand(0.40, 0.65),
    zCenter: rand(-22, 22)
  };
}

function recolorState(state) {
  state.chainColors = readThemeColors();
  state.backdrop = readBackdrop();
  state.chains.forEach((chain, index) => {
    const color = state.chainColors[index % state.chainColors.length];
    chain.color = color;
    chain.shadow = tone(color, -22, -10, 0.24);
    chain.bond = tone(color, -6, 3, 0.36);
    chain.bondGlow = tone(color, 16, 8, 0.12);
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

  const glowB = ctx.createRadialGradient(width * 0.78, height * 0.74, 0, width * 0.78, height * 0.74, Math.max(width, height) * 0.30);
  glowB.addColorStop(0, backdrop.glowB);
  glowB.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glowB;
  ctx.fillRect(0, 0, width, height);

  const t = time * 0.00007;
  ctx.save();
  ctx.globalAlpha = 0.042;
  for (let i = 0; i < 4; i += 1) {
    const x = width * (0.14 + i * 0.22) + Math.sin(t * (0.9 + i * 0.15) + i * 1.2) * 24;
    const y = height * (0.18 + i * 0.18) + Math.cos(t * (0.76 + i * 0.14) + i * 1.8) * 18;
    const radius = Math.max(width, height) * (0.16 + i * 0.04);
    const haze = ctx.createRadialGradient(x, y, 0, x, y, radius);
    haze.addColorStop(0, backdrop.halo);
    haze.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}

function drawSphere(ctx, x, y, radius, lightColor, darkColor, alpha = 1) {
  const gradient = ctx.createRadialGradient(x - radius * 0.30, y - radius * 0.32, radius * 0.12, x, y, radius);
  gradient.addColorStop(0, 'rgba(255,255,255,0.98)');
  gradient.addColorStop(0.20, lightColor);
  gradient.addColorStop(0.72, lightColor);
  gradient.addColorStop(1, darkColor);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawBond(ctx, ax, ay, bx, by, width, glowColor, lineColor, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha * 0.18;
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = width * 2.0;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = alpha * 0.96;
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.restore();
}

function cameraProject(point, state) {
  const dx = minimalDelta(point.x - state.camera.x, state.worldWidth);
  const dy = minimalDelta(point.y - state.camera.y, state.worldHeight);
  const depth = clamp(0.58 + point.z / 88, 0.08, 1.14);
  return {
    x: state.width * 0.5 + dx + (depth - 0.58) * 4.6,
    y: state.height * 0.5 + dy - (depth - 0.58) * 2.8,
    z: point.z,
    depth,
    scale: 0.5 + depth * 0.72,
    alpha: clamp(0.14 + depth * 0.82, 0.14, 1)
  };
}

function isOnScreen(x, y, margin, state) {
  return x > -margin && x < state.width + margin && y > -margin && y < state.height + margin;
}

function buildParticleGeometry(state) {
  return state.particles.map((particle) => {
    const screen = cameraProject(particle.node, state);
    return { particle, screen };
  }).filter(({ particle, screen }) => isOnScreen(screen.x, screen.y, particle.radius * screen.scale * 3, state));
}

function buildChainGeometry(chain, state) {
  const projected = unwrapChain(chain, state);
  return projected.map((screen) => ({
    node: screen.node,
    screen
  }));
}

function render(state, time) {
  drawBackdrop(state.ctx, state, time);

  const chainGeometries = state.chains.map((chain) => ({
    chain,
    nodes: buildChainGeometry(chain, state)
  })).sort((a, b) => {
    const az = a.nodes.reduce((sum, item) => sum + item.node.z, 0) / Math.max(1, a.nodes.length);
    const bz = b.nodes.reduce((sum, item) => sum + item.node.z, 0) / Math.max(1, b.nodes.length);
    return az - bz;
  });

  chainGeometries.forEach(({ chain, nodes }) => {
    chain.bonds.forEach((bond) => {
      const a = nodes[bond.a];
      const b = nodes[bond.b];
      if (!a || !b) return;
      const width = chain.beadRadius * 0.40 * (a.screen.scale + b.screen.scale) * 0.5;
      const alpha = Math.min(a.screen.alpha, b.screen.alpha);
      const mx = (a.screen.x + b.screen.x) * 0.5;
      const my = (a.screen.y + b.screen.y) * 0.5;
      if (!isOnScreen(mx, my, width * 4, state)) return;
      drawBond(state.ctx, a.screen.x, a.screen.y, b.screen.x, b.screen.y, width, chain.bondGlow, chain.bond, alpha);
    });
  });

  const beads = [];
  chainGeometries.forEach(({ chain, nodes }) => {
    nodes.forEach((item) => {
      const radius = chain.beadRadius * item.screen.scale;
      if (!isOnScreen(item.screen.x, item.screen.y, radius * 3, state)) return;
      beads.push({
        x: item.screen.x,
        y: item.screen.y,
        z: item.node.z,
        radius,
        alpha: item.screen.alpha,
        shadow: chain.shadow,
        beadLight: chain.beadLight,
        beadDark: chain.beadDark
      });
    });
  });

  buildParticleGeometry(state).forEach(({ particle, screen }) => {
    beads.push({
      x: screen.x,
      y: screen.y,
      z: particle.node.z,
      radius: particle.radius * screen.scale,
      alpha: screen.alpha * 0.98,
      shadow: particle.shadow,
      beadLight: particle.beadLight,
      beadDark: particle.beadDark
    });
  });

  beads.sort((a, b) => a.z - b.z).forEach((item) => {
    state.ctx.save();
    state.ctx.globalAlpha = item.alpha * 0.13;
    state.ctx.fillStyle = item.shadow;
    state.ctx.beginPath();
    state.ctx.arc(item.x, item.y, item.radius * 1.50, 0, TAU);
    state.ctx.fill();
    state.ctx.restore();

    drawSphere(state.ctx, item.x, item.y, item.radius, item.beadLight, item.beadDark, item.alpha);
  });
}

function buildInteractionItems(state) {
  const items = [];
  state.chains.forEach((chain, chainIndex) => {
    chain.nodes.forEach((node, beadIndex) => {
      items.push({
        x: node.x,
        y: node.y,
        z: node.z,
        radius: node.radius * 1.05,
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
      radius: particle.radius * 1.08,
      type: 'particle',
      particleIndex,
      node: particle.node,
      particle
    });
  });
  return items;
}

function buildPeriodicHash(items, cellSize, state) {
  const nx = Math.max(1, Math.ceil(state.worldWidth / cellSize));
  const ny = Math.max(1, Math.ceil(state.worldHeight / cellSize));
  const buckets = Array.from({ length: nx * ny }, () => []);
  items.forEach((item, index) => {
    const gx = mod(Math.floor(item.x / cellSize), nx);
    const gy = mod(Math.floor(item.y / cellSize), ny);
    buckets[gy * nx + gx].push(index);
  });
  return { nx, ny, buckets };
}

function forEachNeighborPair(items, cellSize, state, fn) {
  const { nx, ny, buckets } = buildPeriodicHash(items, cellSize, state);
  const offsets = [
    [0, 0], [1, 0], [0, 1], [1, 1], [-1, 1]
  ];
  for (let gy = 0; gy < ny; gy += 1) {
    for (let gx = 0; gx < nx; gx += 1) {
      const bucket = buckets[gy * nx + gx];
      if (!bucket.length) continue;
      offsets.forEach(([ox, oy]) => {
        const ngx = mod(gx + ox, nx);
        const ngy = mod(gy + oy, ny);
        const other = buckets[ngy * nx + ngx];
        if (!other.length) return;
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
    }
  }
}

function shouldSkipPair(a, b) {
  if (a.type === 'bead' && b.type === 'bead' && a.chainIndex === b.chainIndex) {
    const i = Math.min(a.beadIndex, b.beadIndex);
    const j = Math.max(a.beadIndex, b.beadIndex);
    return a.chain.exclude.has(`${i}:${j}`);
  }
  return false;
}

function resetForces(state) {
  state.chains.forEach((chain) => {
    chain.nodes.forEach((node) => {
      node.fx = 0;
      node.fy = 0;
      node.fz = 0;
    });
  });
  state.particles.forEach((particle) => {
    particle.node.fx = 0;
    particle.node.fy = 0;
    particle.node.fz = 0;
  });
}

function addBondForces(state) {
  state.chains.forEach((chain) => {
    chain.bonds.forEach((bond) => {
      const a = chain.nodes[bond.a];
      const b = chain.nodes[bond.b];
      const dx = minimalDelta(b.x - a.x, state.worldWidth);
      const dy = minimalDelta(b.y - a.y, state.worldHeight);
      const dz = b.z - a.z;
      const dist = Math.max(1e-6, Math.hypot(dx, dy, dz));
      const stretch = dist - bond.len;
      const force = stretch * 1.05;
      const nx = dx / dist;
      const ny = dy / dist;
      const nz = dz / dist;
      a.fx += force * nx;
      a.fy += force * ny;
      a.fz += force * nz;
      b.fx -= force * nx;
      b.fy -= force * ny;
      b.fz -= force * nz;
    });
  });
}

function addBendForces(state) {
  state.chains.forEach((chain) => {
    const ids = chain.backbone;
    if (ids.length < 3) return;
    const size = ids.length;
    const limit = chain.ring ? size : size - 2;
    for (let i = 1; i <= limit; i += 1) {
      const iPrev = chain.ring ? mod(i - 1, size) : i - 1;
      const iCurr = chain.ring ? mod(i, size) : i;
      const iNext = chain.ring ? mod(i + 1, size) : i + 1;
      if (!chain.ring && (iNext >= size)) break;
      const a = chain.nodes[ids[iPrev]];
      const b = chain.nodes[ids[iCurr]];
      const c = chain.nodes[ids[iNext]];
      const dba = {
        x: minimalDelta(a.x - b.x, state.worldWidth),
        y: minimalDelta(a.y - b.y, state.worldHeight),
        z: a.z - b.z
      };
      const dbc = {
        x: minimalDelta(c.x - b.x, state.worldWidth),
        y: minimalDelta(c.y - b.y, state.worldHeight),
        z: c.z - b.z
      };
      const midpoint = {
        x: (dba.x + dbc.x) * 0.5,
        y: (dba.y + dbc.y) * 0.5,
        z: (dba.z + dbc.z) * 0.5
      };
      const k = chain.bendK;
      b.fx += midpoint.x * k;
      b.fy += midpoint.y * k;
      b.fz += midpoint.z * k * 0.8;
      a.fx -= midpoint.x * k * 0.5;
      a.fy -= midpoint.y * k * 0.5;
      a.fz -= midpoint.z * k * 0.4;
      c.fx -= midpoint.x * k * 0.5;
      c.fy -= midpoint.y * k * 0.5;
      c.fz -= midpoint.z * k * 0.4;
    }
  });
}

function addExcludedVolumeForces(state) {
  const items = buildInteractionItems(state);
  forEachNeighborPair(items, 26, state, (i, j) => {
    const a = items[i];
    const b = items[j];
    if (shouldSkipPair(a, b)) return;
    const dx = minimalDelta(b.x - a.x, state.worldWidth);
    const dy = minimalDelta(b.y - a.y, state.worldHeight);
    const dz = (b.z - a.z) * 1.18;
    const dist = Math.max(1e-6, Math.hypot(dx, dy, dz));
    const hardCore = a.radius + b.radius + 1.0;
    const cutoff = hardCore + 5.4;
    if (dist >= cutoff) return;
    const q = 1 - dist / cutoff;
    let rep = 18 * q * q;
    if (dist < hardCore) rep += (hardCore - dist) * 26;
    const nx = dx / dist;
    const ny = dy / dist;
    const nz = dz / dist;
    a.node.fx -= nx * rep;
    a.node.fy -= ny * rep;
    a.node.fz -= nz * rep * 0.8;
    b.node.fx += nx * rep;
    b.node.fy += ny * rep;
    b.node.fz += nz * rep * 0.8;
  });
}

function integrate(state, dt) {
  state.chains.forEach((chain) => {
    chain.nodes.forEach((node) => {
      const sigmaXY = Math.sqrt(2 * chain.diffusivity * dt);
      const sigmaZ = Math.sqrt(2 * chain.zDiffusivity * dt);
      node.x += chain.mobility * node.fx * dt + gaussian() * sigmaXY;
      node.y += chain.mobility * node.fy * dt + gaussian() * sigmaXY;
      node.z += chain.mobility * node.fz * dt + gaussian() * sigmaZ + (chain.zCenter - node.z) * 0.016;
      node.x = wrapCoord(node.x, state.worldWidth);
      node.y = wrapCoord(node.y, state.worldHeight);
      node.z = clamp(node.z, -34, 34);
    });
  });

  state.particles.forEach((particle) => {
    const node = particle.node;
    const sigmaXY = Math.sqrt(2 * particle.diffusivity * dt);
    const sigmaZ = Math.sqrt(2 * particle.zDiffusivity * dt);
    node.x += particle.mobility * node.fx * dt + gaussian() * sigmaXY;
    node.y += particle.mobility * node.fy * dt + gaussian() * sigmaXY;
    node.z += particle.mobility * node.fz * dt + gaussian() * sigmaZ + (particle.zCenter - node.z) * 0.020;
    node.x = wrapCoord(node.x, state.worldWidth);
    node.y = wrapCoord(node.y, state.worldHeight);
    node.z = clamp(node.z, -34, 34);
  });
}

function solveBondConstraints(state, stiffness = 0.62) {
  state.chains.forEach((chain) => {
    chain.bonds.forEach((bond) => {
      const a = chain.nodes[bond.a];
      const b = chain.nodes[bond.b];
      const dx = minimalDelta(b.x - a.x, state.worldWidth);
      const dy = minimalDelta(b.y - a.y, state.worldHeight);
      const dz = b.z - a.z;
      const dist = Math.max(1e-6, Math.hypot(dx, dy, dz));
      const diff = (dist - bond.len) / dist;
      const corr = 0.5 * stiffness * diff;
      a.x = wrapCoord(a.x + dx * corr, state.worldWidth);
      a.y = wrapCoord(a.y + dy * corr, state.worldHeight);
      a.z = clamp(a.z + dz * corr, -34, 34);
      b.x = wrapCoord(b.x - dx * corr, state.worldWidth);
      b.y = wrapCoord(b.y - dy * corr, state.worldHeight);
      b.z = clamp(b.z - dz * corr, -34, 34);
    });
  });
}

function solveExcludedVolume(state, iterations = 1) {
  for (let pass = 0; pass < iterations; pass += 1) {
    const items = buildInteractionItems(state);
    forEachNeighborPair(items, 24, state, (i, j) => {
      const a = items[i];
      const b = items[j];
      if (shouldSkipPair(a, b)) return;
      const dx = minimalDelta(b.node.x - a.node.x, state.worldWidth);
      const dy = minimalDelta(b.node.y - a.node.y, state.worldHeight);
      const dz = (b.node.z - a.node.z) * 1.18;
      const dist = Math.max(1e-6, Math.hypot(dx, dy, dz));
      const minDist = a.radius + b.radius + 0.8;
      if (dist >= minDist) return;
      const overlap = minDist - dist;
      const nx = dx / dist;
      const ny = dy / dist;
      const nz = dz / dist;
      const aw = a.type === 'particle' ? 1.18 : 1;
      const bw = b.type === 'particle' ? 1.18 : 1;
      const total = aw + bw;
      a.node.x = wrapCoord(a.node.x - nx * overlap * 0.42 * (bw / total), state.worldWidth);
      a.node.y = wrapCoord(a.node.y - ny * overlap * 0.42 * (bw / total), state.worldHeight);
      a.node.z = clamp(a.node.z - nz * overlap * 0.34 * (bw / total), -34, 34);
      b.node.x = wrapCoord(b.node.x + nx * overlap * 0.42 * (aw / total), state.worldWidth);
      b.node.y = wrapCoord(b.node.y + ny * overlap * 0.42 * (aw / total), state.worldHeight);
      b.node.z = clamp(b.node.z + nz * overlap * 0.34 * (aw / total), -34, 34);
    });
  }
}

function updateCamera(state, timeMs) {
  const t = timeMs * 0.000035;
  state.camera.x = wrapCoord(
    state.camera.homeX
      + Math.sin(t + state.camera.phaseX) * state.camera.ampX
      + Math.sin(t * 0.63 + state.camera.phaseMix) * state.camera.ampX * 0.44,
    state.worldWidth
  );
  state.camera.y = wrapCoord(
    state.camera.homeY
      + Math.cos(t * 0.88 + state.camera.phaseY) * state.camera.ampY
      + Math.sin(t * 0.51 + state.camera.phaseMix * 0.8) * state.camera.ampY * 0.38,
    state.worldHeight
  );
}

function simulate(state, dt, timeMs) {
  resetForces(state);
  addBondForces(state);
  addBendForces(state);
  addExcludedVolumeForces(state);
  integrate(state, dt);

  for (let iter = 0; iter < 2; iter += 1) {
    solveBondConstraints(state, iter === 0 ? 0.68 : 0.50);
    solveExcludedVolume(state, 1);
  }

  updateCamera(state, timeMs);
}

function buildState(canvas, variant, density) {
  const dpr = clamp(window.devicePixelRatio || 1, 1, 1.9);
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const worldScale = variant === 'hero' ? 1.34 : 1.26;
  const worldWidth = width * worldScale;
  const worldHeight = height * worldScale;
  const areaFactor = clamp((width * height) / (1500 * 900), 0.90, 1.14);

  const state = {
    canvas,
    ctx,
    width,
    height,
    dpr,
    variant,
    density,
    worldWidth,
    worldHeight,
    chainColors: readThemeColors(),
    backdrop: readBackdrop(),
    chains: [],
    particles: [],
    centers: [],
    camera: {
      homeX: worldWidth * 0.5,
      homeY: worldHeight * 0.5,
      x: worldWidth * 0.5,
      y: worldHeight * 0.5,
      ampX: width * 0.11,
      ampY: height * 0.09,
      phaseX: rand(0, TAU),
      phaseY: rand(0, TAU),
      phaseMix: rand(0, TAU)
    }
  };

  const chainCount = Math.max(variant === 'hero' ? 36 : 18, Math.round((variant === 'hero' ? 44 : 22) * density * areaFactor));
  const particleCount = Math.max(variant === 'hero' ? 250 : 110, Math.round((variant === 'hero' ? 330 : 135) * density * areaFactor));

  state.centers = makeSpreadCenters(
    chainCount,
    worldWidth,
    worldHeight,
    84,
    Math.max(72, Math.sqrt((worldWidth * worldHeight) / chainCount) * 0.48)
  );
  state.chains = Array.from({ length: chainCount }, (_, index) => createChain(state, index));
  state.particles = Array.from({ length: particleCount }, () => createParticle(state));
  recolorState(state);
  return state;
}

export function initMolecularField(canvas, options = {}) {
  if (!canvas) return null;
  const variant = options.variant || 'hero';
  const density = clamp(options.density ?? 1, 0.55, 1.60);
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
