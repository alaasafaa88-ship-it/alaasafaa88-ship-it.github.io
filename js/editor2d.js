/* محرر المخطط ثنائي الأبعاد (Canvas) */
(function (global) {
  'use strict';
  const GRID = 0.1, SNAP = 0.05;
  const deg = r => r * 180 / Math.PI, rad = d => d * Math.PI / 180;

  class Editor2D {
    constructor(canvas, project, app) {
      this.cv = canvas; this.ctx = canvas.getContext('2d'); this.project = project; this.app = app;
      this.view = { s: 60, ox: 80, oy: 80 };
      this.tool = 'select'; this.pending = null; // defId للوضع
      this.sel = null; this.hover = null; this.mouse = null;
      this.drag = null; this.pointers = new Map(); this.pinch = null;
      this.wallPts = []; this.measure = []; this.rectStart = null; this.showLabels = true; this.showGrid = true;
      this.bind(); this.resize();
    }

    // ----- تحويلات -----
    toScreen(x, y) { return [x * this.view.s + this.view.ox, y * this.view.s + this.view.oy]; }
    toWorld(px, py) { return [(px - this.view.ox) / this.view.s, (py - this.view.oy) / this.view.s]; }
    snap(v, g) { g = g || SNAP; return Math.round(v / g) * g; }
    resize() {
      const r = this.cv.parentElement.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
      this.cv.width = Math.max(1, r.width * dpr); this.cv.height = Math.max(1, r.height * dpr);
      this.cv.style.width = r.width + 'px'; this.cv.style.height = r.height + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); this.W = r.width; this.H = r.height; this.draw();
    }
    fit() {
      const b = this.project.bounds(); const pad = 1.2;
      const s = Math.min(this.W / (b.w + pad * 2), this.H / (b.h + pad * 2));
      this.view.s = Math.max(8, Math.min(200, s)); this.view.ox = (this.W - b.w * this.view.s) / 2 - b.x * this.view.s; this.view.oy = (this.H - b.h * this.view.s) / 2 - b.y * this.view.s; this.draw();
    }
    zoom(f, cx, cy) {
      cx = cx === undefined ? this.W / 2 : cx; cy = cy === undefined ? this.H / 2 : cy;
      const [wx, wy] = this.toWorld(cx, cy); this.view.s = Math.max(8, Math.min(300, this.view.s * f));
      this.view.ox = cx - wx * this.view.s; this.view.oy = cy - wy * this.view.s; this.draw();
    }

    setTool(t, pending) { this.tool = t; this.pending = pending || null; this.wallPts = []; this.measure = []; this.rectStart = null; this.app.onTool && this.app.onTool(t); this.draw(); }
    select(id, silent) { this.sel = id; if (!silent) this.app.onSelect && this.app.onSelect(id); this.draw(); }

    // ----- اختبار الإصابة -----
    hit(x, y) {
      const P = this.project, d = P.d, tol = 8 / this.view.s;
      for (const o of d.openings) { const p = P.openingPos(o); if (p && Math.hypot(p.x - x, p.y - y) < o.w / 2 + tol) return o.id; }
      const items = d.items.slice().reverse(); // الأعلى أولاً
      const order = it => { const def = CATALOG.BY_ID[it.defId] || {}; return def.mount === 'ceiling' ? 0 : def.mount === 'wall' ? 1 : (it.defId.startsWith('rug') || def.kind === 'rug' || def.kind === 'rugRound' ? 3 : 2); };
      items.sort((a, b) => order(a) - order(b));
      for (const it of items) { const r = rad(it.rot); const dx = x - it.x, dy = y - it.y; const lx = dx * Math.cos(-r) - dy * Math.sin(-r), ly = dx * Math.sin(-r) + dy * Math.cos(-r); if (Math.abs(lx) <= it.w / 2 + tol / 2 && Math.abs(ly) <= it.d / 2 + tol / 2) return it.id; }
      for (const w of d.walls) { if (distSeg(x, y, w.x1, w.y1, w.x2, w.y2) < w.t / 2 + tol / 2) return w.id; }
      const r = P.roomAt(x, y); return r ? r.id : null;
    }
    nearestWallPoint(x, y, maxDist) {
      let best = null;
      for (const w of this.project.d.walls) {
        const L2 = (w.x2 - w.x1) ** 2 + (w.y2 - w.y1) ** 2; if (!L2) continue;
        let t = ((x - w.x1) * (w.x2 - w.x1) + (y - w.y1) * (w.y2 - w.y1)) / L2; t = Math.max(0, Math.min(1, t));
        const px = w.x1 + (w.x2 - w.x1) * t, py = w.y1 + (w.y2 - w.y1) * t; const dd = Math.hypot(px - x, py - y);
        if (dd < (maxDist || 0.6) && (!best || dd < best.dist)) best = { wall: w, t, x: px, y: py, dist: dd, side: Math.sign((w.x2 - w.x1) * (y - w.y1) - (w.y2 - w.y1) * (x - w.x1)) || 1 };
      }
      return best;
    }
    snapWallPoint(x, y) {
      let sx = this.snap(x, GRID), sy = this.snap(y, GRID); const tol = 12 / this.view.s;
      for (const w of this.project.d.walls) for (const [px, py] of [[w.x1, w.y1], [w.x2, w.y2]]) if (Math.hypot(px - x, py - y) < tol) return [px, py];
      if (this.wallPts.length) { // محاذاة الزوايا
        const [lx, ly] = this.wallPts[this.wallPts.length - 1]; const a = Math.atan2(sy - ly, sx - lx), L = Math.hypot(sx - lx, sy - ly);
        const snapA = Math.round(a / (Math.PI / 4)) * (Math.PI / 4); if (Math.abs(a - snapA) < rad(8)) { sx = this.snap(lx + Math.cos(snapA) * L, GRID); sy = this.snap(ly + Math.sin(snapA) * L, GRID); if (Math.abs(Math.cos(snapA)) < 0.01) sx = lx; if (Math.abs(Math.sin(snapA)) < 0.01) sy = ly; }
      }
      return [sx, sy];
    }

    // ----- أحداث المؤشر -----
    bind() {
      const cv = this.cv;
      cv.addEventListener('pointerdown', e => this.onDown(e)); cv.addEventListener('pointermove', e => this.onMove(e));
      cv.addEventListener('pointerup', e => this.onUp(e)); cv.addEventListener('pointercancel', e => this.onUp(e));
      cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); this.zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
      cv.addEventListener('dblclick', e => { if (this.tool === 'wall') this.finishWall(); else if (this.tool === 'select') { const [x, y] = this.pos(e); const id = this.hit(x, y); if (id) this.app.onEdit && this.app.onEdit(id); } });
      cv.addEventListener('contextmenu', e => { e.preventDefault(); if (this.tool === 'wall') this.finishWall(); else this.setTool('select'); });
      cv.addEventListener('pointerleave', () => { this.hover = null; this.mouse = null; this.draw(); });
    }
    pos(e) { const r = this.cv.getBoundingClientRect(); return this.toWorld(e.clientX - r.left, e.clientY - r.top); }
    onDown(e) {
      this.cv.setPointerCapture(e.pointerId); this.pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (this.pointers.size === 2) { const pts = [...this.pointers.values()]; this.pinch = { d: Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]), s: this.view.s, cx: (pts[0][0] + pts[1][0]) / 2, cy: (pts[0][1] + pts[1][1]) / 2, ox: this.view.ox, oy: this.view.oy }; this.drag = null; return; }
      const [x, y] = this.pos(e); const P = this.project;
      if (e.button === 1 || this.tool === 'pan' || e.button === 2) { this.drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, ox: this.view.ox, oy: this.view.oy }; return; }
      switch (this.tool) {
        case 'select': {
          if (this.sel) { // مقبض التدوير
            const o = P.find(this.sel); if (o && P.kindOf(o) === 'item') { const h = this.rotHandle(o); if (Math.hypot(h[0] - x, h[1] - y) < 12 / this.view.s) { P.snapshot(); this.drag = { kind: 'rotate', id: o.id }; return; } }
          }
          const id = this.hit(x, y); this.select(id);
          if (id) { const o = P.find(id), k = P.kindOf(o);
            if (k === 'item') { P.snapshot(); this.drag = { kind: 'item', id, dx: o.x - x, dy: o.y - y, moved: false }; }
            else if (k === 'opening') { P.snapshot(); this.drag = { kind: 'opening', id }; }
            else if (k === 'room') { P.snapshot(); this.drag = { kind: 'room', id, dx: o.x - x, dy: o.y - y, walls: P.roomWalls(o).map(w => ({ id: w.id, x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 })), items: P.d.items.filter(i => i.x >= o.x && i.x <= o.x + o.w && i.y >= o.y && i.y <= o.y + o.h).map(i => ({ id: i.id, x: i.x, y: i.y })), ox: o.x, oy: o.y }; }
            else if (k === 'wall') { P.snapshot(); this.drag = { kind: 'wall', id, sx: x, sy: y, x1: o.x1, y1: o.y1, x2: o.x2, y2: o.y2 }; }
          } else this.drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, ox: this.view.ox, oy: this.view.oy };
          break;
        }
        case 'wall': { const p = this.snapWallPoint(x, y); if (this.wallPts.length) { const [lx, ly] = this.wallPts[this.wallPts.length - 1]; if (Math.hypot(lx - p[0], ly - p[1]) < 0.05) { this.finishWall(); return; } P.snapshot(); P.addWall(lx, ly, p[0], p[1]); P.emit('walls'); } this.wallPts.push(p); this.draw(); break; }
        case 'room': { this.rectStart = [this.snap(x, GRID), this.snap(y, GRID)]; this.drag = { kind: 'rect' }; break; }
        case 'door': case 'window': { const n = this.nearestWallPoint(x, y, 0.8); if (n) { P.snapshot(); const o = P.addOpening(this.app.openingType(this.tool), n.wall.id, n.t); if (o) { o.flip = n.side < 0; P.emit('openings'); this.select(o.id); } } break; }
        case 'place': { if (this.pending) { P.snapshot(); const it = this.placeAt(this.pending, x, y); P.emit('items'); this.select(it.id); if (!e.shiftKey && !this.app.keepPlacing) this.setTool('select'); } break; }
        case 'measure': { this.measure = this.measure.length >= 2 ? [[x, y]] : [...this.measure, [x, y]]; this.draw(); break; }
        case 'delete': { const id = this.hit(x, y); if (id) { P.snapshot(); P.remove(id); P.emit('remove'); this.select(null); } break; }
      }
    }
    placeAt(defId, x, y, rot) {
      const P = this.project; const def = CATALOG.BY_ID[defId]; let r = rot || 0; x = this.snap(x); y = this.snap(y);
      if (def.mount === 'wall') { const n = this.nearestWallPoint(x, y, 1.0); if (n) { const a = deg(Math.atan2(n.wall.y2 - n.wall.y1, n.wall.x2 - n.wall.x1)); const nx = -Math.sin(rad(a)) * n.side, ny = Math.cos(rad(a)) * n.side; const off = n.wall.t / 2 + def.d / 2; x = n.x + nx * off; y = n.y + ny * off; r = n.side > 0 ? a : a + 180; } }
      return P.addItem(defId, x, y, r);
    }
    onMove(e) {
      this.pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (this.pinch && this.pointers.size === 2) { const pts = [...this.pointers.values()]; const d = Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]); const cx = (pts[0][0] + pts[1][0]) / 2, cy = (pts[0][1] + pts[1][1]) / 2; const f = d / this.pinch.d; const r = this.cv.getBoundingClientRect(); const px = this.pinch.cx - r.left, py = this.pinch.cy - r.top; const [wx, wy] = [(px - this.pinch.ox) / this.pinch.s, (py - this.pinch.oy) / this.pinch.s]; this.view.s = Math.max(8, Math.min(300, this.pinch.s * f)); this.view.ox = (cx - r.left) - wx * this.view.s; this.view.oy = (cy - r.top) - wy * this.view.s; this.draw(); return; }
      const [x, y] = this.pos(e); this.mouse = [x, y]; const P = this.project;
      this.app.onCoords && this.app.onCoords(x, y);
      if (this.drag) {
        const D = this.drag;
        if (D.kind === 'pan') { this.view.ox = D.ox + (e.clientX - D.sx); this.view.oy = D.oy + (e.clientY - D.sy); }
        else if (D.kind === 'item') { const it = P.find(D.id); if (it) { const def = CATALOG.BY_ID[it.defId]; let nx = this.snap(x + D.dx), ny = this.snap(y + D.dy); if (def.mount === 'wall') { const n = this.nearestWallPoint(x + D.dx, y + D.dy, 0.9); if (n) { const a = deg(Math.atan2(n.wall.y2 - n.wall.y1, n.wall.x2 - n.wall.x1)); const sx = -Math.sin(rad(a)) * n.side, sy = Math.cos(rad(a)) * n.side; const off = n.wall.t / 2 + it.d / 2; nx = n.x + sx * off; ny = n.y + sy * off; it.rot = n.side > 0 ? a : a + 180; } } it.x = nx; it.y = ny; D.moved = true; } }
        else if (D.kind === 'rotate') { const it = P.find(D.id); if (it) { let a = deg(Math.atan2(y - it.y, x - it.x)) + 90; if (!e.shiftKey) a = Math.round(a / 15) * 15; it.rot = ((a % 360) + 360) % 360; } }
        else if (D.kind === 'opening') { const o = P.find(D.id); const n = this.nearestWallPoint(x, y, 1.5); if (o && n) { o.wallId = n.wall.id; const L = P.wallLength(n.wall); const half = o.w / 2 / L; o.t = Math.max(half, Math.min(1 - half, n.t)); } }
        else if (D.kind === 'room') { const r = P.find(D.id); if (r) { const nx = this.snap(x + D.dx, GRID), ny = this.snap(y + D.dy, GRID); const mx = nx - D.ox, my = ny - D.oy; r.x = nx; r.y = ny; D.walls.forEach(s => { const w = P.find(s.id); if (w) { w.x1 = s.x1 + mx; w.y1 = s.y1 + my; w.x2 = s.x2 + mx; w.y2 = s.y2 + my; } }); D.items.forEach(s => { const it = P.find(s.id); if (it) { it.x = s.x + mx; it.y = s.y + my; } }); } }
        else if (D.kind === 'wall') { const w = P.find(D.id); if (w) { const mx = this.snap(x - D.sx, GRID), my = this.snap(y - D.sy, GRID); w.x1 = D.x1 + mx; w.y1 = D.y1 + my; w.x2 = D.x2 + mx; w.y2 = D.y2 + my; } }
        this.draw(); if (D.kind !== 'pan' && D.kind !== 'rect') this.app.onLiveChange && this.app.onLiveChange();
        return;
      }
      if (this.tool === 'select') this.hover = this.hit(x, y);
      this.draw();
    }
    onUp(e) {
      this.pointers.delete(e.pointerId); if (this.pointers.size < 2) this.pinch = null;
      const D = this.drag; this.drag = null; if (!D) return;
      const [x, y] = this.pos(e); const P = this.project;
      if (D.kind === 'rect' && this.rectStart) { const [sx, sy] = this.rectStart; const ex = this.snap(x, GRID), ey = this.snap(y, GRID); const rx = Math.min(sx, ex), ry = Math.min(sy, ey), rw = Math.abs(ex - sx), rh = Math.abs(ey - sy); this.rectStart = null; if (rw >= 0.8 && rh >= 0.8) { P.snapshot(); const r = P.addRoom(rx, ry, rw, rh, this.app.roomType()); P.emit('rooms'); this.select(r.id); } this.draw(); return; }
      if (D.kind === 'pan') { this.draw(); return; }
      P.emit('change');
    }
    finishWall() { this.wallPts = []; this.draw(); }
    rotHandle(it) { const r = rad(it.rot); const dist = it.d / 2 + 0.45; return [it.x + Math.sin(r) * dist, it.y - Math.cos(r) * dist]; }

    key(e) {
      const P = this.project; const o = this.sel ? P.find(this.sel) : null;
      if (e.key === 'Escape') { if (this.tool === 'wall' && this.wallPts.length) this.finishWall(); else { this.setTool('select'); this.select(null); } return true; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && o) { P.snapshot(); P.remove(o.id); this.select(null); P.emit('remove'); return true; }
      if (o && P.kindOf(o) === 'item') {
        if (e.key === 'r' || e.key === 'R') { P.snapshot(); o.rot = (o.rot + (e.shiftKey ? 45 : 90)) % 360; P.emit('change'); return true; }
        const step = e.shiftKey ? 0.5 : 0.05; let moved = true;
        if (e.key === 'ArrowLeft') o.x -= step; else if (e.key === 'ArrowRight') o.x += step; else if (e.key === 'ArrowUp') o.y -= step; else if (e.key === 'ArrowDown') o.y += step; else moved = false;
        if (moved) { P.emit('change'); return true; }
      }
      return false;
    }

    // ----- الرسم -----
    draw() {
      const ctx = this.ctx, v = this.view, P = this.project, d = P.d; if (!this.W) return;
      ctx.clearRect(0, 0, this.W, this.H); ctx.fillStyle = '#f7f6f2'; ctx.fillRect(0, 0, this.W, this.H);
      if (this.showGrid) this.drawGrid();
      d.rooms.forEach(r => this.drawRoom(r));
      d.walls.forEach(w => this.drawWall(w));
      d.openings.forEach(o => this.drawOpening(o));
      const items = d.items.slice().sort((a, b) => zorder(a) - zorder(b)); items.forEach(it => this.drawItem(it));
      d.rooms.forEach(r => this.drawRoomLabel(r));
      if (this.sel) this.drawSelection();
      this.drawToolPreview();
    }
    drawGrid() {
      const ctx = this.ctx, v = this.view; const [x0, y0] = this.toWorld(0, 0), [x1, y1] = this.toWorld(this.W, this.H);
      const step = v.s < 20 ? 5 : v.s < 45 ? 1 : 0.5;
      ctx.lineWidth = 1;
      for (let x = Math.floor(x0 / step) * step; x <= x1; x += step) { const px = Math.round(x * v.s + v.ox) + 0.5; ctx.strokeStyle = Math.abs(x % 1) < 1e-6 ? '#e2e0d9' : '#eeede8'; ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, this.H); ctx.stroke(); }
      for (let y = Math.floor(y0 / step) * step; y <= y1; y += step) { const py = Math.round(y * v.s + v.oy) + 0.5; ctx.strokeStyle = Math.abs(y % 1) < 1e-6 ? '#e2e0d9' : '#eeede8'; ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(this.W, py); ctx.stroke(); }
      // مقياس
      ctx.fillStyle = '#333'; ctx.fillRect(16, this.H - 24, v.s, 3); ctx.font = '11px sans-serif'; ctx.textAlign = 'left'; ctx.fillText('1 م', 16, this.H - 28);
    }
    drawRoom(r) {
      const ctx = this.ctx, [x, y] = this.toScreen(r.x, r.y), w = r.w * this.view.s, h = r.h * this.view.s;
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h);
      const pat = MATERIALS.pattern2d(ctx, r.floor); ctx.save(); const sc = this.view.s / 128; ctx.translate(x, y); ctx.scale(sc, sc); ctx.fillStyle = pat; ctx.globalAlpha = 0.55; ctx.fillRect(0, 0, w / sc, h / sc); ctx.restore();
      ctx.restore();
      if (this.sel === r.id || this.hover === r.id) { ctx.fillStyle = this.sel === r.id ? 'rgba(37,99,235,0.12)' : 'rgba(37,99,235,0.05)'; ctx.fillRect(x, y, w, h); }
    }
    drawRoomLabel(r) {
      if (!this.showLabels) return; const ctx = this.ctx, [x, y] = this.toScreen(r.x + r.w / 2, r.y + r.h / 2); const s = this.view.s; if (r.w * s < 50) return;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(30,30,30,0.85)'; ctx.font = `bold ${Math.min(16, Math.max(10, s / 5))}px Tajawal, sans-serif`; ctx.fillText(r.name, x, y - 7);
      ctx.font = `${Math.min(12, Math.max(9, s / 7))}px sans-serif`; ctx.fillStyle = 'rgba(60,60,60,0.8)'; ctx.fillText(`${(r.w * r.h).toFixed(1)} م² · ${r.w.toFixed(1)}×${r.h.toFixed(1)}`, x, y + 9);
    }
    drawWall(w) {
      const ctx = this.ctx, [x1, y1] = this.toScreen(w.x1, w.y1), [x2, y2] = this.toScreen(w.x2, w.y2);
      ctx.lineCap = 'square'; ctx.lineWidth = Math.max(2, w.t * this.view.s);
      ctx.strokeStyle = this.sel === w.id ? '#2563eb' : this.hover === w.id ? '#4b5563' : '#2a2a2a';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      if (this.showLabels && this.view.s > 25) { const L = this.project.wallLength(w); if (L > 0.6) { const mx = (x1 + x2) / 2, my = (y1 + y2) / 2; const a = Math.atan2(y2 - y1, x2 - x1); const nx = -Math.sin(a), ny = Math.cos(a); ctx.save(); ctx.translate(mx + nx * (w.t * this.view.s / 2 + 10), my + ny * (w.t * this.view.s / 2 + 10)); let ra = a; if (ra > Math.PI / 2 || ra < -Math.PI / 2) ra += Math.PI; ctx.rotate(ra); ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#666'; ctx.fillText(L.toFixed(2) + ' م', 0, 0); ctx.restore(); } }
    }
    drawOpening(o) {
      const P = this.project, p = P.openingPos(o); if (!p) return; const ctx = this.ctx, s = this.view.s; const [x, y] = this.toScreen(p.x, p.y); const t = p.wall.t * s;
      ctx.save(); ctx.translate(x, y); ctx.rotate(p.angle); const W = o.w * s; const sel = this.sel === o.id;
      ctx.fillStyle = '#f7f6f2'; ctx.fillRect(-W / 2, -t / 2 - 1, W, t + 2); // فجوة في الجدار
      ctx.strokeStyle = sel ? '#2563eb' : '#444'; ctx.lineWidth = 1.5;
      if (P.isDoor(o)) {
        const dir = o.flip ? -1 : 1;
        if (o.type === 'double_door') { ctx.beginPath(); ctx.moveTo(-W / 2, 0); ctx.lineTo(-W / 2, dir * W / 2); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, dir * W / 2); ctx.stroke(); ctx.beginPath(); ctx.arc(-W / 2, 0, W / 2, dir > 0 ? 0 : -Math.PI / 2, dir > 0 ? Math.PI / 2 : 0); ctx.stroke(); ctx.beginPath(); ctx.arc(W / 2, 0, W / 2, dir > 0 ? Math.PI / 2 : Math.PI, dir > 0 ? Math.PI : 3 * Math.PI / 2); ctx.stroke(); }
        else if (o.type === 'sliding_door') { ctx.strokeStyle = sel ? '#2563eb' : '#2a7fb8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-W / 2, -t / 4); ctx.lineTo(0, -t / 4); ctx.moveTo(0, t / 4); ctx.lineTo(W / 2, t / 4); ctx.stroke(); }
        else if (o.type === 'arch') { ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(-W / 2, 0); ctx.lineTo(W / 2, 0); ctx.stroke(); ctx.setLineDash([]); }
        else { const sw = o.swing || 1; const hx = -W / 2 * sw; ctx.beginPath(); ctx.moveTo(hx, 0); ctx.lineTo(hx, dir * W); ctx.stroke(); ctx.beginPath(); const a0 = dir > 0 ? (sw > 0 ? 0 : Math.PI / 2) : (sw > 0 ? -Math.PI / 2 : Math.PI); ctx.arc(hx, 0, W, a0, a0 + Math.PI / 2); ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = sel ? '#2563eb' : '#8b5a2b'; ctx.beginPath(); ctx.moveTo(hx, 0); ctx.lineTo(hx, dir * W); ctx.stroke(); }
      } else {
        ctx.strokeStyle = sel ? '#2563eb' : '#2a7fb8'; ctx.lineWidth = 2; ctx.strokeRect(-W / 2, -t / 2, W, t); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-W / 2, 0); ctx.lineTo(W / 2, 0); ctx.stroke();
      }
      ctx.restore();
    }
    drawItem(it) {
      const def = CATALOG.BY_ID[it.defId]; if (!def) return; const ctx = this.ctx, s = this.view.s; const [x, y] = this.toScreen(it.x, it.y);
      ctx.save(); ctx.translate(x, y); ctx.rotate(rad(it.rot)); ctx.scale(s, s); ctx.lineWidth = 1.2 / s; ctx.lineJoin = 'round';
      const sel = this.sel === it.id, hov = this.hover === it.id;
      ctx.strokeStyle = sel ? '#2563eb' : '#333'; ctx.fillStyle = it.c || def.c;
      if (def.mount === 'ceiling') ctx.globalAlpha = 0.6;
      draw2D(ctx, def.kind, it, def, s);
      ctx.globalAlpha = 1;
      if (sel || hov) { ctx.strokeStyle = sel ? '#2563eb' : '#60a5fa'; ctx.lineWidth = 2 / s; ctx.setLineDash([4 / s, 3 / s]); ctx.strokeRect(-it.w / 2 - 0.04, -it.d / 2 - 0.04, it.w + 0.08, it.d + 0.08); ctx.setLineDash([]); }
      ctx.restore();
      if (this.showLabels && it.w * s > 46 && it.d * s > 26 && def.kind !== 'rug' && def.kind !== 'rugRound') { ctx.font = `${Math.max(9, Math.min(11, s / 7))}px Tajawal, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(def.n, x, y); }
    }
    drawSelection() {
      const P = this.project, o = P.find(this.sel); if (!o || P.kindOf(o) !== 'item') return; const ctx = this.ctx; const h = this.rotHandle(o); const [hx, hy] = this.toScreen(h[0], h[1]); const [cx, cy] = this.toScreen(o.x, o.y);
      ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(hx, hy); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx, hy, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#2563eb'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('↻', hx, hy + 1);
    }
    drawToolPreview() {
      const ctx = this.ctx, m = this.mouse, s = this.view.s; if (!m) return;
      if (this.tool === 'wall') { const p = this.snapWallPoint(m[0], m[1]); const [px, py] = this.toScreen(p[0], p[1]); if (this.wallPts.length) { const [lx, ly] = this.wallPts[this.wallPts.length - 1]; const [sx, sy] = this.toScreen(lx, ly); ctx.strokeStyle = 'rgba(37,99,235,0.7)'; ctx.lineWidth = Math.max(2, 0.2 * s); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(px, py); ctx.stroke(); const L = Math.hypot(p[0] - lx, p[1] - ly); ctx.fillStyle = '#2563eb'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(L.toFixed(2) + ' م', (sx + px) / 2, (sy + py) / 2 - 12); } ctx.fillStyle = '#2563eb'; ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill(); }
      else if (this.tool === 'room' && this.rectStart) { const [sx, sy] = this.toScreen(...this.rectStart); const ex = this.snap(m[0], GRID), ey = this.snap(m[1], GRID); const [px, py] = this.toScreen(ex, ey); ctx.fillStyle = 'rgba(37,99,235,0.1)'; ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2; ctx.fillRect(sx, sy, px - sx, py - sy); ctx.strokeRect(sx, sy, px - sx, py - sy); const w = Math.abs(ex - this.rectStart[0]), h = Math.abs(ey - this.rectStart[1]); ctx.fillStyle = '#2563eb'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`${w.toFixed(1)} × ${h.toFixed(1)} م = ${(w * h).toFixed(1)} م²`, (sx + px) / 2, (sy + py) / 2); }
      else if (this.tool === 'door' || this.tool === 'window') { const n = this.nearestWallPoint(m[0], m[1], 0.8); if (n) { const [px, py] = this.toScreen(n.x, n.y); ctx.fillStyle = 'rgba(37,99,235,0.6)'; ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill(); } }
      else if (this.tool === 'place' && this.pending) { const def = CATALOG.BY_ID[this.pending]; const [px, py] = this.toScreen(this.snap(m[0]), this.snap(m[1])); ctx.save(); ctx.translate(px, py); ctx.scale(s, s); ctx.globalAlpha = 0.5; ctx.fillStyle = def.c; ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 1.2 / s; draw2D(ctx, def.kind, { w: def.w, d: def.d, c: def.c, c2: def.c2 }, def, s); ctx.restore(); }
      else if (this.tool === 'measure' && this.measure.length) { const [a] = this.measure; const b = this.measure[1] || m; const [ax, ay] = this.toScreen(a[0], a[1]), [bx, by] = this.toScreen(b[0], b[1]); ctx.strokeStyle = '#d97706'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.fillStyle = '#d97706'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(Math.hypot(b[0] - a[0], b[1] - a[1]).toFixed(2) + ' م', (ax + bx) / 2, (ay + by) / 2 - 10); }
    }

    toDataURL(scale) { // صورة المخطط
      const b = this.project.bounds(); const s = scale || 80; const pad = 1; const cv = document.createElement('canvas'); cv.width = (b.w + pad * 2) * s; cv.height = (b.h + pad * 2) * s;
      const saved = { ctx: this.ctx, view: { ...this.view }, W: this.W, H: this.H, sel: this.sel, hover: this.hover, mouse: this.mouse };
      this.ctx = cv.getContext('2d'); this.view = { s, ox: (pad - b.x) * s, oy: (pad - b.y) * s }; this.W = cv.width; this.H = cv.height; this.sel = null; this.hover = null; this.mouse = null;
      this.draw(); const url = cv.toDataURL('image/png');
      Object.assign(this, saved); this.draw(); return url;
    }
  }

  function zorder(it) { const def = CATALOG.BY_ID[it.defId] || {}; if (def.kind === 'rug' || def.kind === 'rugRound' || def.kind === 'pool') return 0; if (def.mount === 'ceiling') return 3; if (def.mount === 'wall') return 2; return 1 + (it.elev || 0) * 0.01; }
  function distSeg(px, py, x1, y1, x2, y2) { const L2 = (x2 - x1) ** 2 + (y2 - y1) ** 2; if (!L2) return Math.hypot(px - x1, py - y1); let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / L2; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1))); }

  // ----- رسم رموز العناصر من الأعلى -----
  function rr(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function draw2D(ctx, kind, it, def, s) {
    const w = it.w, d = it.d, c = it.c || def.c, c2 = it.c2 || def.c2; const sh = CATALOG.shade; const lw = 1.2 / s;
    const fillStroke = () => { ctx.fill(); ctx.stroke(); };
    switch (kind) {
      case 'sofa': case 'armchair': {
        rr(ctx, -w / 2, -d / 2, w, d, 0.08); fillStroke();
        ctx.fillStyle = sh(c, -20); ctx.fillRect(-w / 2, -d / 2, w, 0.18); // ظهر
        const arm = Math.min(0.18, w * 0.12); ctx.fillRect(-w / 2, -d / 2, arm, d); ctx.fillRect(w / 2 - arm, -d / 2, arm, d);
        const inner = w - arm * 2, n = Math.max(1, Math.round(inner / 0.75)); ctx.strokeStyle = sh(c, -40); for (let i = 1; i < n; i++) { const x = -inner / 2 + i * inner / n; ctx.beginPath(); ctx.moveTo(x, -d / 2 + 0.18); ctx.lineTo(x, d / 2); ctx.stroke(); }
        break;
      }
      case 'sofaL': {
        ctx.beginPath(); ctx.moveTo(-w / 2, -d / 2); ctx.lineTo(w / 2, -d / 2); ctx.lineTo(w / 2, d / 2); ctx.lineTo(w / 2 - 0.95, d / 2); ctx.lineTo(w / 2 - 0.95, -d / 2 + 0.95); ctx.lineTo(-w / 2, -d / 2 + 0.95); ctx.closePath(); fillStroke();
        ctx.fillStyle = sh(c, -20); ctx.fillRect(-w / 2, -d / 2, w, 0.18); ctx.fillRect(w / 2 - 0.18, -d / 2, 0.18, d);
        break;
      }
      case 'floorsofa': { rr(ctx, -w / 2, -d / 2, w, d, 0.05); fillStroke(); ctx.fillStyle = c2 || sh(c, -25); ctx.fillRect(-w / 2, -d / 2, w, 0.22); const n = Math.max(1, Math.round(w / 0.6)); ctx.strokeStyle = sh(c, -40); for (let i = 1; i < n; i++) { const x = -w / 2 + i * w / n; ctx.beginPath(); ctx.moveTo(x, -d / 2); ctx.lineTo(x, -d / 2 + 0.22); ctx.stroke(); } break; }
      case 'bed': {
        ctx.fillStyle = '#fff'; rr(ctx, -w / 2, -d / 2, w, d, 0.04); fillStroke();
        ctx.fillStyle = c; rr(ctx, -w / 2 + 0.05, -d / 2 + 0.55, w - 0.1, d - 0.6, 0.04); ctx.fill();
        ctx.fillStyle = c2 || sh(c, -40); ctx.fillRect(-w / 2, -d / 2, w, 0.08);
        ctx.fillStyle = '#f4f4f4'; const np = w > 1.2 ? 2 : 1; for (let i = 0; i < np; i++) { const x = np === 1 ? 0 : (i === 0 ? -w / 4 : w / 4); rr(ctx, x - Math.min(0.3, w / np / 2 - 0.08), -d / 2 + 0.12, Math.min(0.6, w / np - 0.15), 0.4, 0.05); ctx.fill(); ctx.stroke(); }
        break;
      }
      case 'crib': case 'bunkbed': { rr(ctx, -w / 2, -d / 2, w, d, 0.03); fillStroke(); ctx.fillStyle = '#fff'; ctx.fillRect(-w / 2 + 0.06, -d / 2 + 0.06, w - 0.12, d - 0.12); ctx.fillStyle = '#eee'; rr(ctx, -w / 4, -d / 2 + 0.12, w / 2, 0.3, 0.04); ctx.fill(); if (kind === 'bunkbed') { ctx.strokeStyle = sh(c, -40); ctx.beginPath(); ctx.moveTo(-w / 2, d / 2); ctx.lineTo(w / 2, -d / 2); ctx.stroke(); } break; }
      case 'roundtable': case 'rugRound': case 'stool': case 'umbrella': case 'tent': { ctx.beginPath(); ctx.arc(0, 0, w / 2, 0, Math.PI * 2); fillStroke(); if (kind === 'rugRound') { ctx.strokeStyle = sh(c, 40); ctx.beginPath(); ctx.arc(0, 0, w / 2 - 0.15, 0, Math.PI * 2); ctx.stroke(); } if (kind === 'umbrella') { for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(i * Math.PI / 4) * w / 2, Math.sin(i * Math.PI / 4) * w / 2); ctx.stroke(); } } if (kind === 'tent') { ctx.beginPath(); ctx.moveTo(-w / 2, -d / 2); ctx.lineTo(w / 2, d / 2); ctx.moveTo(w / 2, -d / 2); ctx.lineTo(-w / 2, d / 2); ctx.stroke(); } break; }
      case 'chair': { rr(ctx, -w / 2, -d / 2, w, d, 0.04); fillStroke(); ctx.fillStyle = sh(c, -25); ctx.fillRect(-w / 2, -d / 2, w, 0.07); break; }
      case 'officechair': { ctx.beginPath(); ctx.arc(0, 0.02, w / 2, 0, Math.PI * 2); fillStroke(); ctx.fillStyle = sh(c, -25); rr(ctx, -w / 2 + 0.05, -d / 2, w - 0.1, 0.1, 0.03); ctx.fill(); break; }
      case 'cabinet': case 'drawers': case 'uppercab': case 'dresserMirror': case 'shoerack': case 'safe': case 'toybox': case 'tvstand': { ctx.fillRect(-w / 2, -d / 2, w, d); ctx.strokeRect(-w / 2, -d / 2, w, d); ctx.strokeStyle = sh(c, -50); ctx.beginPath(); ctx.moveTo(-w / 2, -d / 2); ctx.lineTo(w / 2, d / 2); ctx.moveTo(w / 2, -d / 2); ctx.lineTo(-w / 2, d / 2); ctx.stroke(); ctx.lineWidth = 2.5 / s; ctx.strokeStyle = sh(c, -70); ctx.beginPath(); ctx.moveTo(-w / 2, d / 2 - 0.02); ctx.lineTo(w / 2, d / 2 - 0.02); ctx.stroke(); if (kind === 'tvstand') { ctx.fillStyle = '#222'; ctx.fillRect(-Math.min(w - 0.2, 1.4) / 2, -0.02, Math.min(w - 0.2, 1.4), 0.05); } break; }
      case 'bookcase': case 'shelf': { ctx.fillRect(-w / 2, -d / 2, w, d); ctx.strokeRect(-w / 2, -d / 2, w, d); ctx.strokeStyle = sh(c, -50); const n = Math.max(1, Math.round(w / 0.3)); for (let i = 1; i < n; i++) { ctx.beginPath(); ctx.moveTo(-w / 2 + i * w / n, -d / 2); ctx.lineTo(-w / 2 + i * w / n, d / 2); ctx.stroke(); } break; }
      case 'fridge': case 'washer': case 'dishwasher': case 'microwave': case 'pc': case 'laptop': case 'ac': case 'heater': { rr(ctx, -w / 2, -d / 2, w, d, 0.03); fillStroke(); ctx.strokeStyle = sh(c, -50); if (kind === 'fridge') { ctx.beginPath(); ctx.moveTo(0, -d / 2); ctx.lineTo(0, d / 2); ctx.stroke(); } if (kind === 'washer') { ctx.beginPath(); ctx.arc(0, 0, w / 3, 0, Math.PI * 2); ctx.stroke(); } ctx.lineWidth = 2.5 / s; ctx.beginPath(); ctx.moveTo(-w / 2, d / 2 - 0.02); ctx.lineTo(w / 2, d / 2 - 0.02); ctx.stroke(); break; }
      case 'stove': { ctx.fillRect(-w / 2, -d / 2, w, d); ctx.strokeRect(-w / 2, -d / 2, w, d); ctx.fillStyle = '#333'; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(a * w / 4, b * d / 4.5, Math.min(0.09, w / 5), 0, Math.PI * 2); ctx.fill(); }); break; }
      case 'counter': case 'island': case 'table': case 'desk': case 'coffeetable': case 'bench': case 'meeting': case 'pingpong': case 'billiard': case 'piano': case 'generic': case 'partition': case 'fence': case 'radiator': case 'speaker': case 'waterheater': case 'treadmill': case 'bike': case 'slide': case 'playhouse': case 'swing': case 'hood': {
        rr(ctx, -w / 2, -d / 2, w, d, 0.02); fillStroke();
        if (kind === 'pingpong') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 / s; ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); ctx.stroke(); }
        if (kind === 'billiard') { ctx.fillStyle = '#5b3a29'; ctx.lineWidth = lw; ctx.strokeRect(-w / 2 + 0.1, -d / 2 + 0.1, w - 0.2, d - 0.2); }
        if (kind === 'piano') { ctx.fillStyle = '#fff'; ctx.fillRect(-w / 2 + 0.05, d / 2 - 0.2, w - 0.1, 0.15); }
        if (kind === 'treadmill') { ctx.fillStyle = '#555'; ctx.fillRect(-w / 2 + 0.05, -d / 2 + 0.3, w - 0.1, d - 0.4); }
        if (kind === 'counter' || kind === 'island') { ctx.lineWidth = 2.5 / s; ctx.strokeStyle = sh(c, -60); ctx.beginPath(); ctx.moveTo(-w / 2, d / 2 - 0.02); ctx.lineTo(w / 2, d / 2 - 0.02); ctx.stroke(); }
        break;
      }
      case 'deskL': { ctx.beginPath(); ctx.moveTo(-w / 2, -d / 2); ctx.lineTo(w / 2, -d / 2); ctx.lineTo(w / 2, d / 2); ctx.lineTo(w / 2 - 0.7, d / 2); ctx.lineTo(w / 2 - 0.7, -d / 2 + 0.7); ctx.lineTo(-w / 2, -d / 2 + 0.7); ctx.closePath(); fillStroke(); break; }
      case 'sinkcounter': { ctx.fillRect(-w / 2, -d / 2, w, d); ctx.strokeRect(-w / 2, -d / 2, w, d); ctx.fillStyle = '#c9ccd1'; rr(ctx, -Math.min(0.7, w - 0.15) / 2, -(d - 0.2) / 2, Math.min(0.7, w - 0.15), d - 0.2, 0.04); fillStroke(); ctx.fillStyle = '#666'; ctx.beginPath(); ctx.arc(0, -d / 2 + 0.08, 0.03, 0, Math.PI * 2); ctx.fill(); break; }
      case 'washbasin': case 'pedestalsink': { ctx.fillRect(-w / 2, -d / 2, w, d); ctx.strokeRect(-w / 2, -d / 2, w, d); ctx.fillStyle = '#dfe6ea'; const n = w > 1.2 ? 2 : 1; for (let i = 0; i < n; i++) { const x = n === 1 ? 0 : (i ? w / 4 : -w / 4); ctx.beginPath(); ctx.ellipse(x, 0.02, Math.min(0.22, w / n / 2 - 0.08), Math.min(0.16, d / 2 - 0.08), 0, 0, Math.PI * 2); fillStroke(); } break; }
      case 'toilet': { ctx.fillStyle = '#fff'; ctx.fillRect(-w / 2, -d / 2, w, 0.2); ctx.strokeRect(-w / 2, -d / 2, w, 0.2); ctx.beginPath(); ctx.ellipse(0, 0.12, w / 2 - 0.02, d / 2 - 0.2, 0, 0, Math.PI * 2); fillStroke(); ctx.beginPath(); ctx.ellipse(0, 0.14, w / 2 - 0.1, d / 2 - 0.28, 0, 0, Math.PI * 2); ctx.stroke(); break; }
      case 'bidet': { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 0, w / 2, d / 2, 0, 0, Math.PI * 2); fillStroke(); break; }
      case 'bathtub': { ctx.fillStyle = '#fff'; rr(ctx, -w / 2, -d / 2, w, d, 0.1); fillStroke(); ctx.fillStyle = '#cfe3ea'; rr(ctx, -w / 2 + 0.08, -d / 2 + 0.08, w - 0.16, d - 0.16, 0.2); fillStroke(); ctx.fillStyle = '#666'; ctx.beginPath(); ctx.arc(-w / 2 + 0.18, 0, 0.03, 0, Math.PI * 2); ctx.fill(); break; }
      case 'shower': { ctx.fillStyle = '#e8f3f8'; ctx.fillRect(-w / 2, -d / 2, w, d); ctx.strokeRect(-w / 2, -d / 2, w, d); ctx.strokeStyle = '#2a7fb8'; ctx.beginPath(); ctx.moveTo(-w / 2, -d / 2); ctx.lineTo(w / 2, d / 2); ctx.stroke(); ctx.beginPath(); ctx.arc(-w / 2 + 0.2, -d / 2 + 0.2, 0.08, 0, Math.PI * 2); ctx.stroke(); break; }
      case 'plant': case 'bush': case 'tree': case 'palm': { ctx.beginPath(); ctx.arc(0, 0, w / 2, 0, Math.PI * 2); fillStroke(); ctx.strokeStyle = sh(c, -40); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * w / 2.2, Math.sin(a) * w / 2.2); ctx.stroke(); } if (kind === 'tree' || kind === 'palm') { ctx.fillStyle = '#5b3a29'; ctx.beginPath(); ctx.arc(0, 0, w / 14, 0, Math.PI * 2); ctx.fill(); } break; }
      case 'flowerbed': { rr(ctx, -w / 2, -d / 2, w, d, 0.05); fillStroke(); const cols = ['#e2474b', '#f2b134', '#fff', '#c94fd1']; for (let i = 0; i < 8; i++) { ctx.fillStyle = cols[i % 4]; ctx.beginPath(); ctx.arc(-w / 2 + (i + 0.5) * w / 8, ((i % 2) - 0.5) * d / 2.5, 0.07, 0, Math.PI * 2); ctx.fill(); } break; }
      case 'rug': { ctx.fillRect(-w / 2, -d / 2, w, d); ctx.strokeRect(-w / 2, -d / 2, w, d); ctx.strokeStyle = c2 || sh(c, 40); ctx.setLineDash([0.08, 0.05]); ctx.strokeRect(-w / 2 + 0.15, -d / 2 + 0.15, w - 0.3, d - 0.3); ctx.setLineDash([]); break; }
      case 'floorlamp': case 'tablelamp': case 'vase': case 'dallah': case 'column': case 'coatrack': { ctx.beginPath(); ctx.arc(0, 0, w / 2, 0, Math.PI * 2); fillStroke(); if (kind.includes('lamp')) { ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); ctx.moveTo(0, -w / 2); ctx.lineTo(0, w / 2); ctx.stroke(); } break; }
      case 'pendant': case 'chandelier': case 'spot': { ctx.setLineDash([0.05, 0.04]); ctx.beginPath(); ctx.arc(0, 0, w / 2, 0, Math.PI * 2); ctx.fillStyle = '#fff6d5'; fillStroke(); ctx.setLineDash([]); ctx.fillStyle = '#f2b134'; ctx.beginPath(); ctx.arc(0, 0, Math.min(0.06, w / 4), 0, Math.PI * 2); ctx.fill(); break; }
      case 'walllamp': { ctx.beginPath(); ctx.arc(0, 0, w / 2, 0, Math.PI, true); ctx.fillStyle = '#fff6d5'; fillStroke(); break; }
      case 'tv': case 'painting': case 'mirror': case 'clock': case 'curtain': { ctx.fillRect(-w / 2, -d / 2, w, d); ctx.strokeRect(-w / 2, -d / 2, w, d); if (kind === 'curtain') { ctx.strokeStyle = sh(c, -40); ctx.beginPath(); for (let x = -w / 2; x <= w / 2; x += 0.1) ctx.lineTo(x, ((Math.round(x * 10) % 2) ? d / 2 : -d / 2)); ctx.stroke(); } break; }
      case 'stairs': case 'spiralstairs': { ctx.fillRect(-w / 2, -d / 2, w, d); ctx.strokeRect(-w / 2, -d / 2, w, d); const n = 12; ctx.strokeStyle = sh(c, -60); if (kind === 'stairs') { for (let i = 1; i < n; i++) { ctx.beginPath(); ctx.moveTo(-w / 2, -d / 2 + i * d / n); ctx.lineTo(w / 2, -d / 2 + i * d / n); ctx.stroke(); } ctx.strokeStyle = '#000'; ctx.beginPath(); ctx.moveTo(0, d / 2 - 0.1); ctx.lineTo(0, -d / 2 + 0.15); ctx.lineTo(-0.1, -d / 2 + 0.3); ctx.moveTo(0, -d / 2 + 0.15); ctx.lineTo(0.1, -d / 2 + 0.3); ctx.stroke(); } else { for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(i * 0.52) * w / 2, Math.sin(i * 0.52) * d / 2); ctx.stroke(); } } break; }
      case 'fireplace': { ctx.fillRect(-w / 2, -d / 2, w, d); ctx.strokeRect(-w / 2, -d / 2, w, d); ctx.fillStyle = '#1c1c1c'; ctx.fillRect(-w / 4, 0, w / 2, d / 2 - 0.05); ctx.fillStyle = '#ff7a1a'; ctx.fillRect(-w / 6, 0.05, w / 3, d / 2 - 0.15); break; }
      case 'car': { rr(ctx, -w / 2, -d / 2, w, d, 0.3); fillStroke(); ctx.fillStyle = '#2a3a4a'; rr(ctx, -w / 2 + 0.15, -d / 4 - 0.2, w - 0.3, d * 0.45, 0.15); ctx.fill(); break; }
      case 'pool': { rr(ctx, -w / 2 - 0.3, -d / 2 - 0.3, w + 0.6, d + 0.6, 0.1); ctx.fillStyle = '#d8d2c6'; fillStroke(); ctx.fillStyle = '#4fb3e8'; rr(ctx, -w / 2, -d / 2, w, d, 0.1); fillStroke(); ctx.strokeStyle = '#8fd0f0'; for (let y = -d / 2 + 0.4; y < d / 2; y += 0.6) { ctx.beginPath(); for (let x = -w / 2 + 0.2; x < w / 2 - 0.2; x += 0.2) ctx.lineTo(x, y + Math.sin(x * 6) * 0.05); ctx.stroke(); } break; }
      case 'aquarium': { ctx.fillStyle = '#2a8bbf'; ctx.fillRect(-w / 2, -d / 2, w, d); ctx.strokeRect(-w / 2, -d / 2, w, d); break; }
      case 'grandpiano': { ctx.beginPath(); ctx.moveTo(-w / 2, d / 2); ctx.lineTo(w / 2, d / 2); ctx.lineTo(w / 2, -d / 6); ctx.quadraticCurveTo(w / 2, -d / 2, 0, -d / 2); ctx.quadraticCurveTo(-w / 2, -d / 2, -w / 2, 0); ctx.closePath(); fillStroke(); ctx.fillStyle = '#fff'; ctx.fillRect(-w / 2 + 0.1, d / 2 - 0.2, w - 0.2, 0.15); break; }
      case 'grill': { rr(ctx, -w / 2, -d / 2, w, d, 0.05); fillStroke(); ctx.strokeStyle = '#888'; for (let x = -w / 2 + 0.1; x < w / 2; x += 0.1) { ctx.beginPath(); ctx.moveTo(x, -d / 2 + 0.05); ctx.lineTo(x, d / 2 - 0.05); ctx.stroke(); } break; }
      case 'cushion': { rr(ctx, -w / 2, -d / 2, w, d, 0.06); fillStroke(); break; }
      default: { ctx.fillRect(-w / 2, -d / 2, w, d); ctx.strokeRect(-w / 2, -d / 2, w, d); }
    }
  }

  Editor2D.draw2D = draw2D;
  global.Editor2D = Editor2D;
})(window);
