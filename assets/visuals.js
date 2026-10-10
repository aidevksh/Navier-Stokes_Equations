/* Offline canvas illustrations. These are explanatory models, not solutions
   of the Navier–Stokes Millennium problem or numerical reproductions of a paper. */
(() => {
  'use strict';

  const C = {
    bg: '#0b1720', grid: 'rgba(169,193,203,.10)', muted: '#9aaeb8',
    white: '#eff2e9', cyan: '#4ee3c1', amber: '#ffa862', blue: '#81a9ff',
  };
  const TAU = Math.PI * 2;
  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = reducedQuery.matches;
  let printing = false;
  let frame = 0;
  let lastTime = 0;
  const scenes = [];
  const $ = id => document.getElementById(id);
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const fixed = (n, places = 2) => n.toFixed(places);

  function requestDraw() {
    if (!frame && !document.hidden && !printing) frame = requestAnimationFrame(tick);
  }

  function tick(now) {
    frame = 0;
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.04) : 0;
    lastTime = now;
    let continuing = false;
    for (const scene of scenes) {
      if (!scene.surface.visible) continue;
      const moving = scene.isMoving();
      if (moving) scene.update(dt);
      if (scene.dirty || moving) {
        scene.draw();
        scene.dirty = false;
      }
      continuing ||= moving;
    }
    if (continuing && !document.hidden) frame = requestAnimationFrame(tick);
    else lastTime = 0;
  }

  class Surface {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.visible = true;
      this.width = 1;
      this.height = 1;
      this.onResize = null;
      this.resize = () => {
        const rect = canvas.getBoundingClientRect();
        this.width = Math.max(rect.width, 1);
        this.height = Math.max(rect.height, 1);
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        const bw = Math.round(this.width * dpr);
        const bh = Math.round(this.height * dpr);
        if (canvas.width !== bw || canvas.height !== bh) {
          canvas.width = bw;
          canvas.height = bh;
        }
        this.ctx.setTransform(bw / this.width, 0, 0, bh / this.height, 0, 0);
        this.onResize?.();
        requestDraw();
      };
      if ('ResizeObserver' in window) {
        this.resizeObserver = new ResizeObserver(this.resize);
        this.resizeObserver.observe(canvas);
      } else window.addEventListener('resize', this.resize);
      if ('IntersectionObserver' in window) {
        this.visibilityObserver = new IntersectionObserver(entries => {
          this.visible = entries[0].isIntersecting;
          if (this.visible) {
            this.onResize?.();
            requestDraw();
          }
        }, { rootMargin: '80px' });
        this.visibilityObserver.observe(canvas);
      }
      this.resize();
    }

    clear() {
      const { ctx, width: w, height: h } = this;
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, w, h);
      const glow = ctx.createRadialGradient(w * .5, h * .48, 0, w * .5, h * .48, w * .7);
      glow.addColorStop(0, 'rgba(39,79,86,.25)');
      glow.addColorStop(1, 'rgba(11,23,32,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
    }
  }

  function register(scene) {
    scene.dirty = true;
    scene.surface.onResize = () => {
      scene.dirty = true;
      if (printing) {
        scene.draw();
        scene.dirty = false;
      }
    };
    scenes.push(scene);
    requestDraw();
    return scene;
  }

  function text(ctx, words, x, y, color = C.muted, size = 12, align = 'left') {
    ctx.font = `${size}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(words, x, y);
  }

  function modelNote(surface, words = '기하학적 개념 모형 · 실제 논문의 해 아님') {
    const { ctx, width: w, height: h } = surface;
    text(ctx, words, w - 14, h - 14, C.muted, w < 420 ? 10 : 11, 'right');
  }

  function path(ctx, points, color, width = 1, closed = false) {
    if (!points.length) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    if (closed) ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function dot(ctx, x, y, radius, color) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function arrow(ctx, x1, y1, x2, y2, color, width = 1) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const head = 4;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.moveTo(x2 - head * Math.cos(angle - .55), y2 - head * Math.sin(angle - .55));
    ctx.lineTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(angle + .55), y2 - head * Math.sin(angle + .55));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function rng(seed) {
    return () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function stats(container, items) {
    if (!container) return;
    container.replaceChildren(...items.map(([label, value]) => {
      const card = document.createElement('span');
      card.className = 'viz-stat';
      const name = document.createElement('span');
      name.textContent = label;
      const number = document.createElement('strong');
      number.textContent = value;
      card.append(name, number);
      return card;
    }));
  }

  // Decorative vortex: layered three-dimensional helices, not a fluid solver.
  class Hero {
    constructor(canvas) {
      this.surface = new Surface(canvas);
      this.phase = 0;
      register(this);
    }
    isMoving() { return !reducedMotion; }
    update(dt) { this.phase += dt * .19; }
    draw() {
      const s = this.surface;
      const { ctx, width: w, height: h } = s;
      s.clear();
      const centerX = w * .61, centerY = h * .48;
      const scale = Math.min(w * .31, h * .43);
      const project = (x, y, z) => {
        const yaw = -.46;
        const a = x * Math.cos(yaw) - y * Math.sin(yaw);
        const b = x * Math.sin(yaw) + y * Math.cos(yaw);
        const vertical = z * .79 - b * .61;
        const depth = b * .79 + z * .61;
        const f = 5.3 / (5.3 + depth);
        const px = a * f * scale, py = -vertical * f * scale;
        const roll = -.25;
        return { x: centerX + px * Math.cos(roll) - py * Math.sin(roll),
          y: centerY + px * Math.sin(roll) + py * Math.cos(roll), depth };
      };
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const filaments = [];
      for (let j = 0; j < 34; j++) {
        const points = [];
        let depth = 0;
        const theta = TAU * j / 34;
        for (let k = 0; k <= 110; k++) {
          const t = k / 110;
          const z = (t - .5) * 3.65;
          const radius = .14 + .91 * Math.pow(Math.abs(t - .5) * 2, .80);
          const angle = theta + t * 7.2 + this.phase;
          const p = project(radius * Math.cos(angle), radius * Math.sin(angle), z);
          points.push(p);
          depth += p.depth;
        }
        filaments.push({ points, depth: depth / points.length, j });
      }
      filaments.sort((a, b) => b.depth - a.depth);
      for (const filament of filaments) {
        const alpha = clamp(.34 - filament.depth * .14, .10, .70);
        const rgb = filament.j % 7 === 0 ? '255,168,98' : '78,227,193';
        path(ctx, filament.points, `rgba(${rgb},${alpha})`, filament.j % 7 === 0 ? 1.7 : 1);
        const p = filament.points[Math.floor((this.phase * 16 + filament.j * 3) % 111)];
        dot(ctx, p.x, p.y, filament.j % 7 === 0 ? 2.4 : 1.4, `rgba(${rgb},.82)`);
      }
      ctx.restore();
      modelNote(s, '회전과 집중을 표현한 시각적 개념도');
    }
  }

  // The xy section of u=(-ax-Ωy, Ωx-ay, 2az). Only the full 3D field
  // is divergence-free. Exact trajectory updates keep the illustration stable.
  class Flow {
    constructor(canvas) {
      this.surface = new Surface(canvas);
      this.omega = Number($('swirl')?.value || 1.4);
      this.inflow = Number($('inflow')?.value || .35);
      this.playing = !reducedMotion;
      this.particles = [];
      this.random = rng(73191);
      this.resetParticles();
      this.toggle = $('flow-toggle');
      this.toggle?.addEventListener('click', () => {
        this.playing = !this.playing;
        this.updateLabels();
        requestDraw();
      });
      $('flow-reset')?.addEventListener('click', () => {
        this.omega = 1.4;
        this.inflow = .35;
        if ($('swirl')) $('swirl').value = '1.4';
        if ($('inflow')) $('inflow').value = '.35';
        this.resetParticles();
        this.dirty = true;
        this.updateLabels();
        requestDraw();
      });
      for (const [id, prop] of [['swirl', 'omega'], ['inflow', 'inflow']]) {
        $(id)?.addEventListener('input', event => {
          this[prop] = Number(event.target.value);
          this.dirty = true;
          this.updateLabels();
          requestDraw();
        });
      }
      this.updateLabels();
      register(this);
    }

    resetParticles() {
      this.random = rng(73191);
      this.particles = Array.from({ length: 100 }, (_, i) => {
        const angle = this.random() * TAU;
        const radius = .12 + Math.sqrt(this.random()) * 1.08;
        const p = { x: radius * Math.cos(angle), y: radius * Math.sin(angle),
          age: this.random() * 10, tone: i % 9 === 0, trail: [] };
        p.trail.push({ x: p.x, y: p.y });
        return p;
      });
    }

    updateLabels() {
      if ($('swirl-value')) $('swirl-value').textContent = fixed(this.omega, 1);
      if ($('inflow-value')) $('inflow-value').textContent = fixed(this.inflow, 2);
      if (this.toggle) {
        this.toggle.textContent = this.playing ? '일시 정지' : '재생';
        this.toggle.setAttribute('aria-pressed', String(this.playing));
      }
      if ($('flow-status')) {
        const field = this.inflow === 0 && this.omega === 0 ? '회전과 유입이 모두 0이므로 입자가 움직이지 않습니다.'
          : this.inflow === 0 ? '안쪽 유입이 없어 원을 따라 회전합니다.'
          : this.omega === 0 ? '회전이 없어 중심을 향해 곧게 모입니다.'
          : '입자가 회전하며 중심으로 모입니다. 3D 흐름의 가로 단면입니다.';
        $('flow-status').textContent = `${this.playing ? '재생 중' : '정지됨'} · ${field}`;
      }
    }

    isMoving() { return this.playing && (this.omega !== 0 || this.inflow !== 0); }
    update(dt) {
      if (!dt) return;
      const decay = Math.exp(-this.inflow * dt);
      const angle = this.omega * dt;
      const co = Math.cos(angle), si = Math.sin(angle);
      for (const p of this.particles) {
        const x = (p.x * co - p.y * si) * decay;
        const y = (p.x * si + p.y * co) * decay;
        p.x = x; p.y = y; p.age += dt;
        p.trail.push({ x, y });
        if (p.trail.length > 38) p.trail.shift();
        if (Math.hypot(x, y) < .055 || (this.inflow > 0 && p.age > 22)) {
          const a = this.random() * TAU;
          const r = 1.08 + this.random() * .13;
          p.x = Math.cos(a) * r;
          p.y = Math.sin(a) * r;
          p.age = 0;
          p.trail = [{ x: p.x, y: p.y }];
        }
      }
    }

    draw() {
      const s = this.surface;
      const { ctx, width: w, height: h } = s;
      s.clear();
      const radius = Math.min(w * .40, h * .37);
      const cx = w * .5, cy = h * .50;
      const screen = p => ({ x: cx + p.x * radius, y: cy - p.y * radius });
      ctx.lineWidth = 1;
      ctx.strokeStyle = C.grid;
      for (let i = -4; i <= 4; i++) {
        const p = i / 4 * radius;
        ctx.beginPath();
        ctx.moveTo(cx + p, cy - radius * 1.25);
        ctx.lineTo(cx + p, cy + radius * 1.25);
        ctx.moveTo(cx - radius * 1.25, cy + p);
        ctx.lineTo(cx + radius * 1.25, cy + p);
        ctx.stroke();
      }
      for (const r of [.25, .5, .75, 1]) {
        ctx.beginPath();
        ctx.arc(cx, cy, r * radius, 0, TAU);
        ctx.stroke();
      }
      for (let iy = -4; iy <= 4; iy++) {
        for (let ix = -5; ix <= 5; ix++) {
          const x = ix * .22, y = iy * .22;
          if (Math.hypot(x, y) < .11 || Math.hypot(x, y) > 1.18) continue;
          const vx = -this.inflow * x - this.omega * y;
          const vy = this.omega * x - this.inflow * y;
          const magnitude = Math.hypot(vx, vy);
          if (magnitude < .001) continue;
          const length = Math.min(magnitude * .095, .145);
          const start = screen({ x: x - vx / magnitude * length * .5,
            y: y - vy / magnitude * length * .5 });
          const end = screen({ x: x + vx / magnitude * length * .5,
            y: y + vy / magnitude * length * .5 });
          arrow(ctx, start.x, start.y, end.x, end.y, 'rgba(154,174,184,.48)');
        }
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 35, w, h - 65);
      ctx.clip();
      for (const p of this.particles) {
        const points = p.trail.map(screen);
        path(ctx, points, p.tone ? 'rgba(255,168,98,.50)' : 'rgba(78,227,193,.36)', 1.2);
        const head = screen(p);
        dot(ctx, head.x, head.y, p.tone ? 2.5 : 1.8, p.tone ? C.amber : C.cyan);
      }
      ctx.restore();
      dot(ctx, cx, cy, 3, C.white);
      text(ctx, 'xy 단면', 16, 24, C.white, 12);
      text(ctx, 'u = (−ax − Ωy, Ωx − ay)', w - 16, 24, C.muted, w < 420 ? 10 : 12, 'right');
      text(ctx, 'x', cx + radius * 1.28, cy + 4, C.muted, 12);
      text(ctx, 'y', cx - 3, cy - radius * 1.28, C.muted, 12);
      modelNote(s, w < 440 ? '3D 흐름의 단면 · 개념 모형' : '3D 비압축 흐름의 단면 · 실제 논문의 해 아님');
    }
  }

  class Vortex {
    constructor(canvas) {
      this.surface = new Surface(canvas);
      this.s = Number($('stretch')?.value || .35);
      this.auto = false;
      this.cycle = Math.acos(clamp(1 - 2 * this.s, -1, 1));
      this.yaw = -.62;
      this.pitch = .40;
      this.roll = -.15;
      this.drag = null;
      this.toggle = $('vortex-toggle');
      this.toggle?.addEventListener('click', () => {
        this.auto = !this.auto;
        this.cycle = Math.acos(clamp(1 - 2 * this.s, -1, 1));
        this.updateLabels();
        requestDraw();
      });
      $('stretch')?.addEventListener('input', event => {
        this.s = Number(event.target.value);
        this.auto = false;
        this.updateLabels();
        this.dirty = true;
        requestDraw();
      });
      $('vortex-reset')?.addEventListener('click', () => {
        this.s = .35;
        this.auto = false;
        this.resetCamera();
        if ($('stretch')) $('stretch').value = '.35';
        this.updateLabels();
        this.dirty = true;
        requestDraw();
      });
      canvas.style.touchAction = 'none';
      if (!canvas.hasAttribute('tabindex')) canvas.tabIndex = 0;
      canvas.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown Home');
      canvas.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        this.drag = { x: event.clientX, y: event.clientY };
        canvas.setPointerCapture(event.pointerId);
        canvas.style.cursor = 'grabbing';
      });
      canvas.addEventListener('pointermove', event => {
        if (!this.drag) return;
        this.yaw += (event.clientX - this.drag.x) * .009;
        this.pitch = clamp(this.pitch + (event.clientY - this.drag.y) * .006, -.90, .90);
        this.drag = { x: event.clientX, y: event.clientY };
        this.dirty = true;
        requestDraw();
      });
      const endDrag = () => {
        this.drag = null;
        canvas.style.cursor = 'grab';
      };
      canvas.addEventListener('pointerup', endDrag);
      canvas.addEventListener('pointercancel', endDrag);
      canvas.addEventListener('lostpointercapture', endDrag);
      canvas.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
        event.preventDefault();
        if (event.key === 'ArrowLeft') this.yaw -= .15;
        if (event.key === 'ArrowRight') this.yaw += .15;
        if (event.key === 'ArrowUp') this.pitch = clamp(this.pitch - .10, -.90, .90);
        if (event.key === 'ArrowDown') this.pitch = clamp(this.pitch + .10, -.90, .90);
        if (event.key === 'Home') this.resetCamera();
        this.dirty = true;
        requestDraw();
      });
      canvas.style.cursor = 'grab';
      this.updateLabels();
      register(this);
    }

    resetCamera() {
      this.yaw = -.62;
      this.pitch = .40;
      this.roll = -.15;
    }

    updateLabels() {
      if ($('stretch-value')) $('stretch-value').textContent = fixed(this.s, 2);
      const r = Math.exp(-this.s), l = Math.exp(2 * this.s);
      stats($('vortex-stats'), [
        ['R/R₀ = e⁻ˢ', fixed(r, 3)],
        ['L/L₀ = e²ˢ', fixed(l, 3)],
        ['V/V₀', fixed(r * r * l, 3)],
      ]);
      if (this.toggle) {
        this.toggle.textContent = this.auto ? '자동 변화 멈춤' : '자동 변화 보기';
        this.toggle.setAttribute('aria-pressed', String(this.auto));
      }
    }

    isMoving() { return this.auto; }
    update(dt) {
      this.cycle += dt * .55;
      this.s = (1 - Math.cos(this.cycle)) / 2;
      if ($('stretch')) $('stretch').value = String(this.s);
      this.updateLabels();
    }

    draw() {
      const surface = this.surface;
      const { ctx, width: w, height: h } = surface;
      surface.clear();
      const radius = .9 * Math.exp(-this.s);
      const length = 1.1 * Math.exp(2 * this.s);
      const cx = w * .50, cy = h * .49;
      const co = Math.cos(this.yaw), si = Math.sin(this.yaw);
      const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
      const cr = Math.cos(this.roll), sr = Math.sin(this.roll);
      const unitProject = (x, y, z) => {
        const a = x * co - y * si;
        const b = x * si + y * co;
        const vertical = z * cp - b * sp;
        const depth = b * cp + z * sp;
        const f = 12 / (12 + depth);
        const px = a * f, py = -vertical * f;
        return { x: px * cr - py * sr, y: px * sr + py * cr, depth };
      };
      // Fit the current tube and the initial outline together. This is camera
      // magnification, not an extra material deformation; ratios remain exact.
      let extentX = .1, extentY = .1;
      for (const [r, l] of [[radius, length], [.9, 1.1]]) {
        for (let k = 0; k < 64; k++) {
          const a = k / 64 * TAU;
          for (const z of [-l / 2, l / 2]) {
            const p = unitProject(r * Math.cos(a), r * Math.sin(a), z);
            extentX = Math.max(extentX, Math.abs(p.x));
            extentY = Math.max(extentY, Math.abs(p.y));
          }
        }
      }
      const scale = Math.min(w * .31 / extentX, h * .34 / extentY);
      const project = (x, y, z) => {
        const p = unitProject(x, y, z);
        return { x: cx + p.x * scale, y: cy + p.y * scale, depth: p.depth };
      };
      const ring = (r, z, theta = 0, count = 72) => Array.from({ length: count + 1 }, (_, k) => {
        const angle = k / count * TAU + theta;
        return project(r * Math.cos(angle), r * Math.sin(angle), z);
      });

      // A static initial tube supplies a simultaneous material-size comparison.
      ctx.setLineDash([4, 6]);
      path(ctx, ring(.9, -.55), 'rgba(154,174,184,.28)');
      path(ctx, ring(.9, .55), 'rgba(154,174,184,.28)');
      for (let j = 0; j < 8; j++) {
        const a = j / 8 * TAU;
        path(ctx, [project(.9 * Math.cos(a), .9 * Math.sin(a), -.55),
          project(.9 * Math.cos(a), .9 * Math.sin(a), .55)], 'rgba(154,174,184,.20)');
      }
      ctx.setLineDash([]);

      // The surface is built in xyz first, then depth-sorted for perspective rendering.
      const strips = [];
      const spin = this.s * TAU * 1.1;
      for (let j = 0; j < 48; j++) {
        const a = j / 48 * TAU + spin;
        const b = (j + 1) / 48 * TAU + spin;
        const verts = [project(radius * Math.cos(a), radius * Math.sin(a), -length / 2),
          project(radius * Math.cos(b), radius * Math.sin(b), -length / 2),
          project(radius * Math.cos(b), radius * Math.sin(b), length / 2),
          project(radius * Math.cos(a), radius * Math.sin(a), length / 2)];
        strips.push({ verts, depth: verts.reduce((sum, p) => sum + p.depth, 0) / 4 });
      }
      strips.sort((a, b) => b.depth - a.depth);
      for (const strip of strips) {
        ctx.beginPath();
        ctx.moveTo(strip.verts[0].x, strip.verts[0].y);
        for (const p of strip.verts.slice(1)) ctx.lineTo(p.x, p.y);
        ctx.closePath();
        ctx.fillStyle = `rgba(78,227,193,${clamp(.025 - strip.depth * .01, .008, .07)})`;
        ctx.fill();
      }

      const lines = [];
      for (let j = 0; j <= 12; j++) {
        const z = (j / 12 - .5) * length;
        const points = ring(radius, z, spin);
        lines.push({ points, color: j === 0 || j === 12 ? C.cyan : 'rgba(78,227,193,.40)',
          width: j === 0 || j === 12 ? 1.6 : .8,
          depth: points.reduce((sum, p) => sum + p.depth, 0) / points.length });
      }
      for (let j = 0; j < 14; j++) {
        const points = [];
        for (let k = 0; k <= 100; k++) {
          const t = k / 100;
          const a = j / 14 * TAU + t * TAU * 1.35 + spin;
          points.push(project(radius * Math.cos(a), radius * Math.sin(a), (t - .5) * length));
        }
        lines.push({ points, color: j % 5 === 0 ? 'rgba(255,168,98,.9)' : 'rgba(78,227,193,.70)',
          width: j % 5 === 0 ? 1.9 : 1.1,
          depth: points.reduce((sum, p) => sum + p.depth, 0) / points.length });
      }
      lines.sort((a, b) => b.depth - a.depth);
      for (const line of lines) path(ctx, line.points, line.color, line.width);
      for (let j = 0; j < 20; j++) {
        const t = j / 19;
        const a = t * TAU * 1.35 + spin;
        const p = project(radius * Math.cos(a), radius * Math.sin(a), (t - .5) * length);
        dot(ctx, p.x, p.y, 2.5, C.amber);
      }

      // World-axis indicator changes with the same camera as the actual tube.
      const origin = project(0, 0, 0);
      const baseX = 38, baseY = h - 55;
      for (const [p, label, color] of [
        [project(1, 0, 0), 'x', C.amber],
        [project(0, 1, 0), 'y', C.blue],
        [project(0, 0, 1), 'z', C.cyan],
      ]) {
        const dx = (p.x - origin.x) / scale * 25;
        const dy = (p.y - origin.y) / scale * 25;
        arrow(ctx, baseX, baseY, baseX + dx, baseY + dy, color, 1.2);
        text(ctx, label, baseX + dx * 1.25, baseY + dy * 1.25 + 4, color, 11, 'center');
      }
      text(ctx, `s = ${fixed(this.s, 2)}`, 16, 25, C.white, 13);
      text(ctx, '점선: s=0 · 화면 배율 자동 조절', 16, 46, C.muted, w < 440 ? 10 : 11);
      text(ctx, w < 440 ? '드래그 / 화살표 키' : '드래그·화살표 키로 회전 · Home으로 복원', w - 16, 25, C.muted, w < 440 ? 10 : 11, 'right');
      const top = project(0, 0, length / 2);
      const bottom = project(0, 0, -length / 2);
      const braceX = clamp(Math.max(top.x, bottom.x) + radius * scale + 28, w * .62, w - 48);
      ctx.strokeStyle = 'rgba(255,168,98,.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(braceX - 5, top.y);
      ctx.lineTo(braceX + 5, top.y);
      ctx.moveTo(braceX, top.y);
      ctx.lineTo(braceX, bottom.y);
      ctx.moveTo(braceX - 5, bottom.y);
      ctx.lineTo(braceX + 5, bottom.y);
      ctx.stroke();
      text(ctx, 'L', braceX + 11, (top.y + bottom.y) / 2 + 4, C.amber, 13);
      modelNote(surface, w < 440 ? '부피 일정 · 유한한 변형 · 개념 모형' : '부피 일정 · 유한한 변형 · 실제 논문의 해 아님');
    }
  }

  class Blowup {
    constructor(canvas) {
      this.surface = new Surface(canvas);
      this.t = Number($('time-slider')?.value || .6);
      $('time-slider')?.addEventListener('input', event => {
        this.t = clamp(Number(event.target.value), 0, .99);
        this.updateLabels();
        this.dirty = true;
        requestDraw();
      });
      this.updateLabels();
      register(this);
    }
    isMoving() { return false; }
    update() {}
    updateLabels() {
      if ($('time-value')) $('time-value').textContent = fixed(this.t, 2);
      stats($('blowup-values'), [
        ['1/(1−t)', fixed(1 / (1 - this.t), 2)],
        ['1+t', fixed(1 + this.t, 2)],
        ['eᵗ', fixed(Math.exp(this.t), 2)],
      ]);
    }
    draw() {
      const s = this.surface;
      const { ctx, width: w, height: h } = s;
      s.clear();
      const left = w < 430 ? 38 : 48;
      const right = 28, top = w < 430 ? 82 : 65, bottom = 49;
      const pw = Math.max(w - left - right, 1), ph = Math.max(h - top - bottom, 1);
      const x = t => left + t * pw;
      const y = v => h - bottom - v / 10 * ph;
      for (let v = 0; v <= 10; v += 2) {
        path(ctx, [{ x: left, y: y(v) }, { x: w - right, y: y(v) }], C.grid);
        text(ctx, String(v), left - 10, y(v) + 4, C.muted, 11, 'right');
      }
      for (let t = 0; t <= 1.001; t += .2) {
        path(ctx, [{ x: x(t), y: top }, { x: x(t), y: h - bottom }], C.grid);
        text(ctx, fixed(t, 1), x(t), h - bottom + 20, C.muted, 11, 'center');
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(left, top - 1, pw, ph + 2);
      ctx.clip();
      const curves = [
        { fn: t => 1 + t, color: C.blue },
        { fn: t => Math.exp(t), color: C.cyan },
        { fn: t => 1 / (1 - t), color: C.amber },
      ];
      for (const curve of curves) {
        const points = [];
        for (let j = 0; j <= 500; j++) {
          const t = j / 501;
          points.push({ x: x(t), y: y(curve.fn(t)) });
        }
        path(ctx, points, curve.color, 2.1);
      }
      ctx.setLineDash([4, 5]);
      path(ctx, [{ x: x(this.t), y: top }, { x: x(this.t), y: h - bottom }], 'rgba(239,242,233,.45)');
      ctx.setLineDash([]);
      for (const curve of curves) {
        const value = curve.fn(this.t);
        if (value <= 10) {
          dot(ctx, x(this.t), y(value), 5, C.bg);
          dot(ctx, x(this.t), y(value), 3.5, curve.color);
        }
      }
      ctx.restore();
      path(ctx, [{ x: left, y: top }, { x: left, y: h - bottom }, { x: w - right, y: h - bottom }], 'rgba(154,174,184,.55)');
      ctx.setLineDash([5, 5]);
      path(ctx, [{ x: x(1), y: top }, { x: x(1), y: h - bottom }], C.amber, 1);
      ctx.setLineDash([]);
      text(ctx, '값', left - 24, top - 10, C.muted, 12);
      text(ctx, '시간 t', left + pw * .5, h - 9, C.muted, 11, 'center');
      text(ctx, 'T = 1', x(1), top - 10, C.amber, 11, 'right');
      const legend = [['1/(1−t)', C.amber], ['eᵗ', C.cyan], ['1+t', C.blue]];
      let lx = left;
      for (const [label, color] of legend) {
        path(ctx, [{ x: lx, y: 22 }, { x: lx + 17, y: 22 }], color, 2.2);
        text(ctx, label, lx + 23, 26, color, 12);
        lx += label === '1/(1−t)' ? 119 : 83;
      }
      if (this.t > .9) {
        text(ctx, `1/(1−t) = ${fixed(1 / (1 - this.t), 1)} · 위쪽 표시 범위 밖`, left, w < 430 ? 53 : 45, C.amber, w < 430 ? 10 : 11);
        const ax = x(this.t);
        arrow(ctx, ax, top + 17, ax, top + 2, C.amber, 1.6);
      }
      text(ctx, w < 440 ? '함수 예시 · NS 해 아님' : '함수 예시 · 유체 방정식의 해 아님', w - 14, h - 9, C.muted, w < 440 ? 9 : 10, 'right');
    }
  }

  const instances = {};
  const constructors = [['hero-vortex', Hero, 'hero'], ['flow2d', Flow, 'flow'],
    ['vortex3d', Vortex, 'vortex'], ['blowup-chart', Blowup, 'blowup']];
  for (const [id, Scene, key] of constructors) {
    const canvas = $(id);
    if (canvas?.getContext) instances[key] = new Scene(canvas);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
    } else {
      for (const scene of scenes) scene.dirty = true;
      requestDraw();
    }
  });
  function preparePrint() {
    printing = true;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    // Printed figures include canvases that have never entered the viewport.
    for (const scene of scenes) {
      scene.surface.resize();
      scene.draw();
      scene.dirty = false;
    }
  }
  function finishPrint() {
    printing = false;
    for (const scene of scenes) {
      scene.surface.resize();
      scene.draw();
      scene.dirty = false;
    }
    requestDraw();
  }
  window.addEventListener('beforeprint', preparePrint);
  window.addEventListener('afterprint', finishPrint);
  // Covers print-preview layout transitions and print-media emulation as well.
  window.matchMedia('print').addEventListener?.('change', event => {
    if (event.matches) preparePrint();
    else finishPrint();
  });
  reducedQuery.addEventListener?.('change', event => {
    reducedMotion = event.matches;
    if (reducedMotion) {
      if (instances.flow) {
        instances.flow.playing = false;
        instances.flow.updateLabels();
      }
      if (instances.vortex) {
        instances.vortex.auto = false;
        instances.vortex.updateLabels();
      }
    }
    for (const scene of scenes) scene.dirty = true;
    requestDraw();
  });

  // Small inspection API for offline smoke tests; no network or hidden solvers.
  window.NSViz = Object.freeze({
    instances,
    redraw: () => { for (const scene of scenes) scene.dirty = true; requestDraw(); },
    materialRatios: s => {
      const radius = Math.exp(-s), length = Math.exp(2 * s);
      return { radius, length, volume: radius * radius * length };
    },
    sectionField: (x, y, a, omega) => ({ x: -a * x - omega * y, y: omega * x - a * y }),
  });
})();
