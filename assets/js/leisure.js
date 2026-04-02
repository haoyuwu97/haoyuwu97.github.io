import { leisureModes, pageMeta } from './site-data.js';
import { activateNav, byId, choice, initFooterYear, setMeta, smoothScrollForHashes, prefersReducedMotion, clamp } from './utils.js';

const TAU = Math.PI * 2;

function rgba(a, b, c, alpha) {
  return `rgba(${a}, ${b}, ${c}, ${alpha})`;
}

function buildEngine(canvas) {
  const ctx = canvas.getContext('2d');
  const engine = {
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    width: 0,
    height: 0,
    pointer: { x: 0, y: 0, px: 0, py: 0, down: false, active: false, movedAt: 0 },
    lastTime: performance.now(),
    raf: 0,
    mode: null,
    modeApi: null,
    modeId: null
  };

  function size() {
    const rect = canvas.getBoundingClientRect();
    engine.width = Math.max(1, Math.floor(rect.width));
    engine.height = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(engine.width * engine.dpr);
    canvas.height = Math.floor(engine.height * engine.dpr);
    ctx.setTransform(engine.dpr, 0, 0, engine.dpr, 0, 0);
    if (engine.modeApi?.resize) engine.modeApi.resize(engine);
  }

  function pointFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches?.[0] || event.changedTouches?.[0];
    const source = touch || event;
    return {
      x: source.clientX - rect.left,
      y: source.clientY - rect.top
    };
  }

  function movePointer(event) {
    const { x, y } = pointFromEvent(event);
    engine.pointer.px = engine.pointer.x;
    engine.pointer.py = engine.pointer.y;
    engine.pointer.x = x;
    engine.pointer.y = y;
    engine.pointer.active = true;
    engine.pointer.movedAt = performance.now();
    if (engine.modeApi?.move) engine.modeApi.move(engine, x, y, engine.pointer.down);
  }

  function downPointer(event) {
    movePointer(event);
    engine.pointer.down = true;
    if (engine.modeApi?.down) engine.modeApi.down(engine, engine.pointer.x, engine.pointer.y);
  }

  function upPointer(event) {
    if (event) movePointer(event);
    engine.pointer.down = false;
    if (engine.modeApi?.up) engine.modeApi.up(engine, engine.pointer.x, engine.pointer.y);
  }

  function leavePointer() {
    engine.pointer.down = false;
    engine.pointer.active = false;
  }

  function frame(now) {
    const dt = Math.min(40, now - engine.lastTime);
    engine.lastTime = now;
    if (engine.modeApi?.update) engine.modeApi.update(engine, ctx, dt, now);
    engine.raf = requestAnimationFrame(frame);
  }

  canvas.addEventListener('mousemove', movePointer);
  canvas.addEventListener('mousedown', downPointer);
  window.addEventListener('mouseup', upPointer);
  canvas.addEventListener('mouseleave', leavePointer);
  canvas.addEventListener('touchstart', downPointer, { passive: true });
  canvas.addEventListener('touchmove', movePointer, { passive: true });
  canvas.addEventListener('touchend', upPointer, { passive: true });
  canvas.addEventListener('touchcancel', leavePointer, { passive: true });
  window.addEventListener('resize', size);

  size();
  engine.raf = requestAnimationFrame(frame);

  return {
    engine,
    setMode(id, factory) {
      engine.modeApi?.destroy?.(engine, ctx);
      engine.mode = leisureModes.find((entry) => entry.id === id) || leisureModes[0];
      engine.modeId = id;
      engine.modeApi = factory();
      engine.modeApi.init?.(engine, ctx);
    },
    destroy() {
      cancelAnimationFrame(engine.raf);
      engine.modeApi?.destroy?.(engine, ctx);
      window.removeEventListener('resize', size);
      window.removeEventListener('mouseup', upPointer);
      canvas.removeEventListener('mousemove', movePointer);
      canvas.removeEventListener('mousedown', downPointer);
      canvas.removeEventListener('mouseleave', leavePointer);
      canvas.removeEventListener('touchstart', downPointer);
      canvas.removeEventListener('touchmove', movePointer);
      canvas.removeEventListener('touchend', upPointer);
      canvas.removeEventListener('touchcancel', leavePointer);
    }
  };
}

function bubbleMode() {
  let bubbles = [];
  let ripples = [];

  const spawn = (engine, count = 24) => {
    bubbles = Array.from({ length: count }, () => ({
      x: Math.random() * engine.width,
      y: Math.random() * engine.height,
      r: 14 + Math.random() * 32,
      vx: -0.25 + Math.random() * 0.5,
      vy: -0.45 - Math.random() * 0.45,
      wobble: Math.random() * TAU,
      alpha: 0.08 + Math.random() * 0.22
    }));
  };

  function popBubble(engine, bubble, index) {
    ripples.push({ x: bubble.x, y: bubble.y, r: bubble.r * 0.2, alpha: 0.85 });
    bubbles.splice(index, 1);
    if (!prefersReducedMotion()) {
      for (let i = 0; i < 2; i += 1) {
        bubbles.push({
          x: bubble.x + (Math.random() - 0.5) * bubble.r,
          y: bubble.y + (Math.random() - 0.5) * bubble.r,
          r: Math.max(10, bubble.r * (0.35 + Math.random() * 0.18)),
          vx: (Math.random() - 0.5) * 1.1,
          vy: -0.35 - Math.random() * 0.5,
          wobble: Math.random() * TAU,
          alpha: 0.08 + Math.random() * 0.18
        });
      }
    }
  }

  return {
    init(engine) {
      spawn(engine, prefersReducedMotion() ? 16 : 26);
    },
    down(engine, x, y) {
      for (let i = bubbles.length - 1; i >= 0; i -= 1) {
        const bubble = bubbles[i];
        const dist = Math.hypot(x - bubble.x, y - bubble.y);
        if (dist < bubble.r) {
          popBubble(engine, bubble, i);
          break;
        }
      }
    },
    move(engine, x, y, down) {
      if (!down) return;
      bubbles.forEach((bubble) => {
        const dx = bubble.x - x;
        const dy = bubble.y - y;
        const dist = Math.hypot(dx, dy);
        if (dist < bubble.r * 3.8) {
          bubble.vx += (dx / (dist + 0.1)) * 0.12;
          bubble.vy += (dy / (dist + 0.1)) * 0.12;
        }
      });
    },
    update(engine, ctx, dt, now) {
      ctx.fillStyle = 'rgba(7, 12, 22, 0.25)';
      ctx.fillRect(0, 0, engine.width, engine.height);

      const driftX = Math.sin(now * 0.0002) * 0.06;
      bubbles.forEach((bubble) => {
        bubble.wobble += dt * 0.0014;
        bubble.x += bubble.vx + Math.cos(bubble.wobble) * 0.12 + driftX;
        bubble.y += bubble.vy + Math.sin(bubble.wobble * 1.1) * 0.09;
        bubble.vx *= 0.994;
        bubble.vy *= 0.996;
        if (bubble.y + bubble.r < -20) {
          bubble.y = engine.height + bubble.r + Math.random() * 30;
          bubble.x = Math.random() * engine.width;
        }
        if (bubble.x < -bubble.r) bubble.x = engine.width + bubble.r;
        if (bubble.x > engine.width + bubble.r) bubble.x = -bubble.r;

        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.r, 0, TAU);
        ctx.fillStyle = rgba(120, 225, 255, bubble.alpha);
        ctx.fill();
        ctx.strokeStyle = rgba(235, 248, 255, bubble.alpha + 0.14);
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(bubble.x - bubble.r * 0.26, bubble.y - bubble.r * 0.26, bubble.r * 0.24, 0, TAU);
        ctx.fillStyle = rgba(255, 255, 255, bubble.alpha * 1.45);
        ctx.fill();
      });

      ripples = ripples
        .map((ripple) => ({ ...ripple, r: ripple.r + dt * 0.07, alpha: ripple.alpha * 0.97 }))
        .filter((ripple) => ripple.alpha > 0.03);
      ripples.forEach((ripple) => {
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.r, 0, TAU);
        ctx.strokeStyle = rgba(155, 232, 255, ripple.alpha);
        ctx.lineWidth = 1.4;
        ctx.stroke();
      });

      if (bubbles.length < 18) spawn(engine, 12 + Math.round(Math.random() * 6));
    }
  };
}

function orbitMode() {
  let centers = [];
  let particles = [];

  const spawn = (engine) => {
    centers = [
      { x: engine.width * 0.34, y: engine.height * 0.48, strength: 1.0, life: Infinity },
      { x: engine.width * 0.66, y: engine.height * 0.42, strength: 0.9, life: Infinity }
    ];
    particles = Array.from({ length: prefersReducedMotion() ? 70 : 140 }, () => ({
      center: Math.random() > 0.5 ? 0 : 1,
      angle: Math.random() * TAU,
      radius: 18 + Math.random() * Math.min(engine.width, engine.height) * 0.24,
      speed: 0.0004 + Math.random() * 0.001,
      phase: Math.random() * TAU,
      alpha: 0.22 + Math.random() * 0.45,
      drift: (Math.random() - 0.5) * 6
    }));
  };

  return {
    init(engine) {
      spawn(engine);
    },
    resize(engine) {
      spawn(engine);
    },
    down(engine, x, y) {
      centers.push({ x, y, strength: 0.7 + Math.random() * 0.45, life: 10000 });
      if (centers.length > 6) centers.splice(2, 1);
    },
    update(engine, ctx, dt, now) {
      ctx.fillStyle = 'rgba(5, 10, 18, 0.18)';
      ctx.fillRect(0, 0, engine.width, engine.height);

      centers = centers.map((center, index) => {
        if (index < 2) return center;
        return { ...center, life: center.life - dt };
      }).filter((center, index) => index < 2 || center.life > 0);

      centers.forEach((center, index) => {
        const pulse = 6 + Math.sin(now * 0.002 + index) * 2.5;
        ctx.beginPath();
        ctx.arc(center.x, center.y, pulse, 0, TAU);
        ctx.fillStyle = rgba(118, 228, 255, index < 2 ? 0.28 : 0.18);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(center.x, center.y, 22 + pulse * 0.4, 0, TAU);
        ctx.strokeStyle = rgba(118, 228, 255, index < 2 ? 0.12 : 0.08);
        ctx.stroke();
      });

      particles.forEach((particle, index) => {
        const center = centers[index % centers.length] || centers[0];
        particle.angle += particle.speed * dt * 1.2 * center.strength;
        const pointerBend = engine.pointer.active ? Math.sin((engine.pointer.x + engine.pointer.y) * 0.01 + particle.phase) * 6 : 0;
        const x = center.x + Math.cos(particle.angle + particle.phase) * (particle.radius + pointerBend * 0.1);
        const y = center.y + Math.sin(particle.angle * 1.02 + particle.phase) * (particle.radius * 0.78 + pointerBend * 0.08);
        ctx.beginPath();
        ctx.arc(x, y, 1.2 + (index % 5 === 0 ? 0.9 : 0), 0, TAU);
        ctx.fillStyle = rgba(235, 248, 255, particle.alpha);
        ctx.fill();
        if (!prefersReducedMotion() && index % 4 === 0) {
          ctx.beginPath();
          ctx.moveTo(center.x, center.y);
          ctx.lineTo(x, y);
          ctx.strokeStyle = rgba(118, 228, 255, 0.035);
          ctx.stroke();
        }
      });
    }
  };
}

function sandMode() {
  let trails = [];
  let ripples = [];
  let grains = [];
  let autopilot = 0;

  function seed(engine) {
    grains = Array.from({ length: prefersReducedMotion() ? 100 : 220 }, () => ({
      x: Math.random() * engine.width,
      y: Math.random() * engine.height,
      vx: (Math.random() - 0.5) * 0.08,
      vy: (Math.random() - 0.5) * 0.08,
      size: 0.8 + Math.random() * 1.6,
      alpha: 0.05 + Math.random() * 0.08
    }));
  }

  return {
    init(engine) {
      seed(engine);
    },
    resize(engine) {
      seed(engine);
    },
    down(engine, x, y) {
      ripples.push({ x, y, r: 6, alpha: 0.9 });
    },
    move(engine, x, y) {
      trails.push({ x, y, life: 900, size: engine.pointer.down ? 44 : 28 });
      if (trails.length > 120) trails.shift();
    },
    update(engine, ctx, dt, now) {
      ctx.fillStyle = 'rgba(9, 13, 24, 0.22)';
      ctx.fillRect(0, 0, engine.width, engine.height);

      if (!engine.pointer.active || now - engine.pointer.movedAt > 2800) {
        autopilot += dt * 0.0012;
        const x = engine.width * 0.5 + Math.sin(autopilot * 0.8) * engine.width * 0.18;
        const y = engine.height * 0.52 + Math.cos(autopilot * 1.14) * engine.height * 0.12;
        trails.push({ x, y, life: 760, size: 26 });
        if (trails.length > 120) trails.shift();
      }

      trails = trails.map((trail) => ({ ...trail, life: trail.life - dt })).filter((trail) => trail.life > 0);
      trails.forEach((trail) => {
        const alpha = clamp(trail.life / 900, 0, 1) * 0.15;
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, trail.size, 0, TAU);
        ctx.fillStyle = rgba(121, 235, 255, alpha);
        ctx.fill();
      });

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      trails.forEach((trail, index) => {
        if (index === 0) return;
        const prev = trails[index - 1];
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(trail.x, trail.y);
        ctx.strokeStyle = rgba(235, 246, 255, 0.07 * (trail.life / 900));
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });
      ctx.restore();

      ripples = ripples
        .map((ripple) => ({ ...ripple, r: ripple.r + dt * 0.06, alpha: ripple.alpha * 0.973 }))
        .filter((ripple) => ripple.alpha > 0.04);
      ripples.forEach((ripple) => {
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.r, 0, TAU);
        ctx.strokeStyle = rgba(255, 255, 255, ripple.alpha * 0.35);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });

      grains.forEach((grain) => {
        grain.x = (grain.x + grain.vx + engine.width) % engine.width;
        grain.y = (grain.y + grain.vy + engine.height) % engine.height;
        ctx.beginPath();
        ctx.arc(grain.x, grain.y, grain.size, 0, TAU);
        ctx.fillStyle = rgba(245, 248, 255, grain.alpha);
        ctx.fill();
      });
    }
  };
}

function ribbonMode() {
  let ribbons = [];
  let auto = 0;

  function seed(engine) {
    ribbons = Array.from({ length: prefersReducedMotion() ? 1 : 3 }, (_, ribbonIndex) => ({
      points: Array.from({ length: 42 }, () => ({ x: engine.width * 0.5, y: engine.height * 0.5 })),
      phase: ribbonIndex * 1.8,
      width: 1.2 + ribbonIndex * 0.7,
      alpha: 0.12 + ribbonIndex * 0.06
    }));
  }

  return {
    init(engine) {
      seed(engine);
    },
    resize(engine) {
      seed(engine);
    },
    update(engine, ctx, dt, now) {
      ctx.fillStyle = 'rgba(6, 10, 19, 0.17)';
      ctx.fillRect(0, 0, engine.width, engine.height);
      auto += dt * 0.001;
      const idle = !engine.pointer.active || now - engine.pointer.movedAt > 2000;
      const targetX = idle
        ? engine.width * 0.5 + Math.sin(auto * 1.14) * engine.width * 0.22
        : engine.pointer.x;
      const targetY = idle
        ? engine.height * 0.52 + Math.cos(auto * 1.6) * engine.height * 0.14
        : engine.pointer.y;

      ribbons.forEach((ribbon, ribbonIndex) => {
        const lead = ribbon.points[0];
        lead.x += (targetX + Math.sin(auto * 2 + ribbon.phase) * 24 - lead.x) * 0.16;
        lead.y += (targetY + Math.cos(auto * 2.2 + ribbon.phase) * 20 - lead.y) * 0.16;

        for (let i = 1; i < ribbon.points.length; i += 1) {
          const prev = ribbon.points[i - 1];
          const point = ribbon.points[i];
          point.x += (prev.x - point.x) * 0.18;
          point.y += (prev.y - point.y) * 0.18;
        }

        ctx.beginPath();
        ribbon.points.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.strokeStyle = ribbonIndex === 0 ? rgba(118, 228, 255, ribbon.alpha) : rgba(170, 200, 255, ribbon.alpha * 0.95);
        ctx.lineWidth = ribbon.width;
        ctx.stroke();
      });
    }
  };
}

function gravityMode() {
  let pebbles = [];
  let particles = [];

  function seed(engine) {
    particles = Array.from({ length: prefersReducedMotion() ? 120 : 280 }, () => ({
      x: Math.random() * engine.width,
      y: Math.random() * engine.height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      alpha: 0.12 + Math.random() * 0.24,
      size: 1 + Math.random() * 2.2
    }));
    pebbles = [
      { x: engine.width * 0.38, y: engine.height * 0.48, mass: 1.0, life: Infinity },
      { x: engine.width * 0.64, y: engine.height * 0.56, mass: 1.1, life: Infinity }
    ];
  }

  return {
    init(engine) {
      seed(engine);
    },
    resize(engine) {
      seed(engine);
    },
    down(engine, x, y) {
      pebbles.push({ x, y, mass: 0.75 + Math.random() * 0.8, life: 9000 });
      if (pebbles.length > 8) pebbles.splice(2, 1);
    },
    update(engine, ctx, dt) {
      ctx.fillStyle = 'rgba(5, 9, 18, 0.18)';
      ctx.fillRect(0, 0, engine.width, engine.height);

      pebbles = pebbles.map((pebble, index) => ({ ...pebble, life: index < 2 ? Infinity : pebble.life - dt })).filter((pebble, index) => index < 2 || pebble.life > 0);

      particles.forEach((particle) => {
        pebbles.forEach((pebble) => {
          const dx = pebble.x - particle.x;
          const dy = pebble.y - particle.y;
          const dist2 = dx * dx + dy * dy + 80;
          const force = pebble.mass * 22 / dist2;
          particle.vx += dx * force;
          particle.vy += dy * force;
        });
        if (engine.pointer.active) {
          const dx = engine.pointer.x - particle.x;
          const dy = engine.pointer.y - particle.y;
          const dist2 = dx * dx + dy * dy + 120;
          const sign = engine.pointer.down ? 1 : -0.25;
          const force = sign * 11 / dist2;
          particle.vx += dx * force;
          particle.vy += dy * force;
        }
        particle.vx *= 0.987;
        particle.vy *= 0.987;
        particle.x = (particle.x + particle.vx + engine.width) % engine.width;
        particle.y = (particle.y + particle.vy + engine.height) % engine.height;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, TAU);
        ctx.fillStyle = rgba(235, 246, 255, particle.alpha);
        ctx.fill();
      });

      pebbles.forEach((pebble, index) => {
        ctx.beginPath();
        ctx.arc(pebble.x, pebble.y, 8 + pebble.mass * 4, 0, TAU);
        ctx.fillStyle = rgba(121, 235, 255, index < 2 ? 0.18 : 0.12);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pebble.x, pebble.y, 40 + pebble.mass * 14, 0, TAU);
        ctx.strokeStyle = rgba(121, 235, 255, index < 2 ? 0.07 : 0.04);
        ctx.stroke();
      });
    }
  };
}

const factories = {
  'bubble-drift': bubbleMode,
  'orbit-garden': orbitMode,
  'sand-wave': sandMode,
  'ribbon-flow': ribbonMode,
  'gravity-pebbles': gravityMode
};

window.addEventListener('DOMContentLoaded', () => {
  setMeta(pageMeta.leisure);
  activateNav('leisure');
  initFooterYear();
  smoothScrollForHashes();

  const canvas = byId('playground');
  const uiTitle = byId('mode-title');
  const uiSubtitle = byId('mode-subtitle');
  const uiDescription = byId('mode-description');
  const uiInstruction = byId('mode-instruction');
  const selector = byId('mode-selector');
  const reroll = byId('mode-reroll');
  const engine = buildEngine(canvas);

  leisureModes.forEach((mode) => {
    const option = document.createElement('option');
    option.value = mode.id;
    option.textContent = mode.title;
    selector.appendChild(option);
  });

  function applyMode(id) {
    const mode = leisureModes.find((entry) => entry.id === id) || leisureModes[0];
    selector.value = mode.id;
    uiTitle.textContent = mode.title;
    uiSubtitle.textContent = mode.subtitle;
    uiDescription.textContent = mode.description;
    uiInstruction.textContent = mode.instruction;
    engine.setMode(mode.id, factories[mode.id]);
  }

  reroll.addEventListener('click', () => {
    const remaining = leisureModes.filter((mode) => mode.id !== selector.value);
    applyMode(choice(remaining).id);
  });

  selector.addEventListener('change', () => {
    applyMode(selector.value);
  });

  applyMode(choice(leisureModes).id);
});
