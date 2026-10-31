/* =========================================================
   كتالوج الموديلات — عمران
   كل عنصر: id, n (الاسم), cat (الفئة), kind (شكل البناء ثلاثي الأبعاد),
   w/d/h (العرض/العمق/الارتفاع بالمتر), c (اللون الأساسي), c2 (لون ثانوي),
   price (سعر تقديري بالدولار), mount (floor | wall | ceiling), elev (الارتفاع عن الأرض)
   ========================================================= */
(function (global) {
  'use strict';

  const CATEGORIES = [
    { id: 'living',     n: 'غرفة المعيشة',        icon: '🛋️' },
    { id: 'majlis',     n: 'المجلس العربي',       icon: '🪔' },
    { id: 'bedroom',    n: 'غرفة النوم',          icon: '🛏️' },
    { id: 'kids',       n: 'غرفة الأطفال',        icon: '🧸' },
    { id: 'kitchen',    n: 'المطبخ',              icon: '🍳' },
    { id: 'dining',     n: 'غرفة الطعام',         icon: '🍽️' },
    { id: 'bathroom',   n: 'الحمام',              icon: '🚿' },
    { id: 'office',     n: 'المكتب والدراسة',     icon: '💻' },
    { id: 'storage',    n: 'التخزين والخزائن',    icon: '🗄️' },
    { id: 'lighting',   n: 'الإضاءة',             icon: '💡' },
    { id: 'decor',      n: 'الديكور والنباتات',   icon: '🪴' },
    { id: 'electronics',n: 'الأجهزة والإلكترونيات', icon: '📺' },
    { id: 'structure',  n: 'عناصر إنشائية',       icon: '🏛️' },
    { id: 'outdoor',    n: 'الحديقة والخارج',     icon: '🌳' },
    { id: 'sports',     n: 'الرياضة والترفيه',    icon: '🏋️' },
    { id: 'custom',     n: 'قطعي المخصصة',        icon: '➕' },
  ];

  // الألوان المساعدة
  const COL = {
    wood: '#a8784f', darkwood: '#5b3a29', lightwood: '#d9b68c', white: '#f3f3f1',
    offwhite: '#e9e6df', black: '#232323', metal: '#9aa0a6', steel: '#c9ccd1',
    glass: '#9ad0ec', fabric: '#6f8fa8', leather: '#7a4a2a', grey: '#8c8c8c',
    beige: '#d9cbb3', green: '#4f8a3a', darkgreen: '#2f5e2a', terracotta: '#b5623a',
    blue: '#3b6fb6', red: '#b23a3a', gold: '#c9a227', marble: '#e7e4dd', navy: '#2d3b55'
  };

  // ---------- أدوات بناء الأجزاء ----------
  // كل جزء: {g: نوع الهندسة, p:[x,y,z] مركز, s:[w,h,d] أبعاد, c: لون, r:[rx,ry,rz], op: شفافية}
  const box = (x, y, z, w, h, d, c, extra) => Object.assign({ g: 'box', p: [x, y, z], s: [w, h, d], c }, extra || {});
  const cyl = (x, y, z, rad, h, c, extra) => Object.assign({ g: 'cyl', p: [x, y, z], s: [rad, h, rad], c }, extra || {});
  const sph = (x, y, z, rad, c, extra) => Object.assign({ g: 'sph', p: [x, y, z], s: [rad, rad, rad], c }, extra || {});
  const cone = (x, y, z, rad, h, c, extra) => Object.assign({ g: 'cone', p: [x, y, z], s: [rad, h, rad], c }, extra || {});

  function legs4(w, d, h, c, inset, r) {
    inset = inset || 0.05; r = r || 0.025;
    const xs = [-w / 2 + inset, w / 2 - inset], zs = [-d / 2 + inset, d / 2 - inset];
    const out = [];
    xs.forEach(x => zs.forEach(z => out.push(cyl(x, h / 2, z, r, h, c))));
    return out;
  }

  function shade(hex, amt) { // تفتيح/تغميق لون
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, r + amt)); g = Math.max(0, Math.min(255, g + amt)); b = Math.max(0, Math.min(255, b + amt));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  // ---------- بُناة الأشكال ----------
  const BUILD = {
    sofa(w, d, h, c, c2) {
      const legH = 0.08, baseH = 0.25, armW = Math.min(0.18, w * 0.12), backD = 0.18;
      const parts = [];
      parts.push(...legs4(w, d, legH, COL.darkwood, 0.08));
      parts.push(box(0, legH + baseH / 2, 0, w, baseH, d, c));
      const inner = w - armW * 2, n = Math.max(1, Math.round(inner / 0.75));
      const cw = inner / n;
      for (let i = 0; i < n; i++) {
        const x = -inner / 2 + cw * (i + 0.5);
        parts.push(box(x, legH + baseH + 0.07, backD / 2, cw - 0.03, 0.14, d - backD - 0.04, shade(c, 18)));
        parts.push(box(x, legH + baseH + 0.25, -d / 2 + backD / 2 + 0.02, cw - 0.03, (h - legH - baseH) * 0.9, 0.12, shade(c, 10)));
      }
      parts.push(box(0, (h - 0.12) / 2 + legH, -d / 2 + backD / 2, w, h - 0.12 - legH, backD, shade(c, -10)));
      parts.push(box(-w / 2 + armW / 2, legH + (h * 0.72) / 2, 0, armW, h * 0.72, d, shade(c, -6)));
      parts.push(box(w / 2 - armW / 2, legH + (h * 0.72) / 2, 0, armW, h * 0.72, d, shade(c, -6)));
      return parts;
    },
    armchair(w, d, h, c, c2) { return BUILD.sofa(w, d, h, c, c2); },
    floorsofa(w, d, h, c, c2) { // جلسة أرضية عربية
      const parts = [box(0, h / 2 - 0.02, 0.06, w, h - 0.04, d - 0.12, c)];
      parts.push(box(0, h + 0.18, -d / 2 + 0.12, w, 0.36, 0.2, c2 || shade(c, -20)));
      const n = Math.max(1, Math.round(w / 0.6));
      for (let i = 0; i < n; i++) parts.push(box(-w / 2 + (i + 0.5) * (w / n), h + 0.2, -d / 2 + 0.3, w / n - 0.06, 0.4, 0.12, shade(c2 || c, 25), { r: [0.25, 0, 0] }));
      return parts;
    },
    cushion(w, d, h, c) { return [box(0, h / 2, 0, w, h, d, c)]; },
    bed(w, d, h, c, c2) {
      const frameH = 0.25, matH = 0.22, headH = h;
      const parts = [];
      parts.push(box(0, frameH / 2, 0, w, frameH, d, COL.wood));
      parts.push(box(0, frameH + matH / 2, 0.03, w - 0.08, matH, d - 0.1, COL.white));
      parts.push(box(0, frameH + matH + 0.03, 0.18, w - 0.1, 0.06, d - 0.75, c)); // غطاء
      parts.push(box(0, headH / 2, -d / 2 + 0.04, w, headH, 0.08, c2 || COL.darkwood));
      const np = w > 1.2 ? 2 : 1;
      for (let i = 0; i < np; i++) {
        const x = np === 1 ? 0 : (i === 0 ? -w / 4 : w / 4);
        parts.push(box(x, frameH + matH + 0.07, -d / 2 + 0.32, Math.min(0.6, w / np - 0.15), 0.12, 0.4, COL.offwhite));
      }
      return parts;
    },
    crib(w, d, h, c) {
      const parts = [box(0, 0.35, 0, w - 0.06, 0.12, d - 0.06, COL.white)];
      const n = Math.round(w / 0.08);
      for (let i = 0; i <= n; i++) { const x = -w / 2 + i * (w / n); parts.push(cyl(x, h / 2, -d / 2, 0.012, h, c)); parts.push(cyl(x, h / 2, d / 2, 0.012, h, c)); }
      const m = Math.round(d / 0.08);
      for (let i = 0; i <= m; i++) { const z = -d / 2 + i * (d / m); parts.push(cyl(-w / 2, h / 2, z, 0.012, h, c)); parts.push(cyl(w / 2, h / 2, z, 0.012, h, c)); }
      parts.push(box(0, h, 0, w, 0.03, 0.04, c)); parts.push(box(0, h, -d / 2, w, 0.04, 0.04, c)); parts.push(box(0, h, d / 2, w, 0.04, 0.04, c));
      return parts;
    },
    bunkbed(w, d, h, c) {
      const parts = [];
      [0.3, h - 0.5].forEach(y => { parts.push(box(0, y, 0, w, 0.12, d, c)); parts.push(box(0, y + 0.14, 0, w - 0.08, 0.16, d - 0.08, COL.white)); });
      [[-w / 2 + 0.03, -d / 2 + 0.03], [w / 2 - 0.03, -d / 2 + 0.03], [-w / 2 + 0.03, d / 2 - 0.03], [w / 2 - 0.03, d / 2 - 0.03]].forEach(([x, z]) => parts.push(box(x, h / 2, z, 0.06, h, 0.06, c)));
      parts.push(box(0, h - 0.2, -d / 2 + 0.02, w, 0.25, 0.03, c));
      for (let i = 0; i < 6; i++) parts.push(box(w / 2 + 0.1, 0.25 + i * 0.28, d / 2 - 0.3, 0.3, 0.03, 0.03, c));
      return parts;
    },
    table(w, d, h, c) { return [box(0, h - 0.025, 0, w, 0.05, d, c), ...legs4(w, d, h - 0.05, shade(c, -30), 0.06, 0.03)]; },
    coffeetable(w, d, h, c) { return [box(0, h - 0.02, 0, w, 0.04, d, c), box(0, h / 2 - 0.1, 0, w - 0.1, 0.03, d - 0.1, shade(c, 15)), ...legs4(w, d, h - 0.04, COL.metal, 0.05, 0.015)]; },
    roundtable(w, d, h, c) { return [cyl(0, h - 0.02, 0, w / 2, 0.04, c), cyl(0, h / 2, 0, 0.05, h, shade(c, -30)), cyl(0, 0.02, 0, w / 4, 0.04, shade(c, -30))]; },
    chair(w, d, h, c) {
      return [box(0, 0.45, 0, w, 0.05, d, c), box(0, 0.45 + (h - 0.45) / 2, -d / 2 + 0.03, w, h - 0.45, 0.05, shade(c, -12)), ...legs4(w, d, 0.43, shade(c, -40), 0.03, 0.02)];
    },
    officechair(w, d, h, c) {
      const parts = [cyl(0, 0.03, 0, w / 2, 0.04, COL.black), cyl(0, 0.25, 0, 0.03, 0.4, COL.metal), box(0, 0.5, 0, w, 0.08, d, c), box(0, 0.5 + (h - 0.5) / 2, -d / 2 + 0.05, w - 0.05, h - 0.5, 0.08, shade(c, -10))];
      parts.push(box(-w / 2 + 0.02, 0.68, 0, 0.05, 0.03, d * 0.6, COL.black)); parts.push(box(w / 2 - 0.02, 0.68, 0, 0.05, 0.03, d * 0.6, COL.black));
      return parts;
    },
    stool(w, d, h, c) { return [cyl(0, h - 0.03, 0, w / 2, 0.06, c), cyl(0, (h - 0.06) / 2, 0, 0.025, h - 0.06, COL.metal), cyl(0, 0.015, 0, w / 2.2, 0.03, COL.metal)]; },
    bench(w, d, h, c) { return [box(0, h - 0.03, 0, w, 0.06, d, c), box(-w / 2 + 0.06, (h - 0.06) / 2, 0, 0.05, h - 0.06, d - 0.05, shade(c, -25)), box(w / 2 - 0.06, (h - 0.06) / 2, 0, 0.05, h - 0.06, d - 0.05, shade(c, -25))]; },
    desk(w, d, h, c) {
      return [box(0, h - 0.02, 0, w, 0.04, d, c), box(-w / 2 + 0.2, (h - 0.04) / 2, 0, 0.4, h - 0.04, d - 0.05, shade(c, -15)), box(w / 2 - 0.03, (h - 0.04) / 2, 0, 0.04, h - 0.04, d - 0.05, shade(c, -15)),
        box(-w / 2 + 0.2, h * 0.75, d / 2 - 0.02, 0.36, 0.1, 0.01, shade(c, -40)), box(-w / 2 + 0.2, h * 0.45, d / 2 - 0.02, 0.36, 0.1, 0.01, shade(c, -40))];
    },
    cabinet(w, d, h, c, c2, doors) {
      doors = doors || Math.max(1, Math.round(w / 0.5));
      const parts = [box(0, h / 2, 0, w, h, d, c)];
      const dw = w / doors;
      for (let i = 0; i < doors; i++) {
        const x = -w / 2 + dw * (i + 0.5);
        parts.push(box(x, h / 2, d / 2 + 0.005, dw - 0.03, h - 0.06, 0.012, shade(c, 12)));
        parts.push(box(x + (i % 2 ? -1 : 1) * (dw / 2 - 0.06), h / 2, d / 2 + 0.02, 0.02, 0.12, 0.02, COL.metal));
      }
      return parts;
    },
    drawers(w, d, h, c) {
      const n = Math.max(2, Math.round(h / 0.25));
      const parts = [box(0, h / 2, 0, w, h, d, c)];
      const dh = (h - 0.04) / n;
      for (let i = 0; i < n; i++) { const y = 0.02 + dh * (i + 0.5); parts.push(box(0, y, d / 2 + 0.005, w - 0.04, dh - 0.03, 0.012, shade(c, 12))); parts.push(box(0, y, d / 2 + 0.02, Math.min(0.25, w * 0.4), 0.02, 0.02, COL.metal)); }
      return parts;
    },
    bookcase(w, d, h, c) {
      const parts = [box(0, h / 2, -d / 2 + 0.01, w, h, 0.02, c), box(-w / 2 + 0.015, h / 2, 0, 0.03, h, d, c), box(w / 2 - 0.015, h / 2, 0, 0.03, h, d, c)];
      const n = Math.max(2, Math.round(h / 0.35));
      for (let i = 0; i <= n; i++) {
        const y = (h / n) * i; parts.push(box(0, Math.min(h - 0.015, Math.max(0.015, y)), 0, w, 0.03, d, c));
        if (i < n) { // كتب
          let x = -w / 2 + 0.05; const cols = ['#b23a3a', '#2d6a9f', '#2f7d4a', '#c9a227', '#6a3d9a', '#e07b39'];
          let k = 0; while (x < w / 2 - 0.08) { const bw = 0.03 + (k % 3) * 0.012, bh = (h / n) * (0.55 + 0.1 * (k % 4)); parts.push(box(x + bw / 2, y + 0.03 + bh / 2, 0.02, bw, bh, d - 0.08, cols[(k + i) % cols.length])); x += bw + 0.008; k++; if (k % 7 === 6) x += 0.08; }
        }
      }
      return parts;
    },
    shelf(w, d, h, c) { return [box(0, h / 2, 0, w, h, d, c)]; },
    tv(w, d, h, c) { return [box(0, h / 2, 0, w, h, 0.03, COL.black), box(0, h / 2, 0.012, w - 0.03, h - 0.03, 0.01, '#1b2a3a')]; },
    tvstand(w, d, h, c) { return [...BUILD.cabinet(w, d, h, c, null, 2), box(0, h + 0.3, 0.02, Math.min(w - 0.2, 1.4), 0.55, 0.04, COL.black), box(0, h + 0.3, 0.045, Math.min(w - 0.23, 1.37), 0.52, 0.005, '#1b2a3a')]; },
    fridge(w, d, h, c) { return [box(0, h / 2, 0, w, h, d, c), box(0, h * 0.72, d / 2 + 0.005, w - 0.02, h * 0.55, 0.01, shade(c, -8)), box(0, h * 0.22, d / 2 + 0.005, w - 0.02, h * 0.4, 0.01, shade(c, -8)), box(w / 2 - 0.08, h * 0.6, d / 2 + 0.02, 0.02, 0.4, 0.02, COL.metal), box(w / 2 - 0.08, h * 0.22, d / 2 + 0.02, 0.02, 0.25, 0.02, COL.metal)]; },
    stove(w, d, h, c) {
      const parts = [box(0, h / 2, 0, w, h, d, c), box(0, h - 0.01, 0, w, 0.02, d, COL.black), box(0, h * 0.4, d / 2 + 0.005, w - 0.06, h * 0.5, 0.01, '#3a3a3a'), box(0, h * 0.4, d / 2 + 0.02, w - 0.1, 0.03, 0.03, COL.metal)];
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => parts.push(cyl(a * w / 4, h + 0.005, b * d / 4.5, Math.min(0.09, w / 5), 0.01, COL.metal)));
      parts.push(box(0, h + 0.03, -d / 2 + 0.04, w, 0.08, 0.06, c));
      return parts;
    },
    counter(w, d, h, c, c2) { return [...BUILD.cabinet(w, d, h - 0.04, c), box(0, h - 0.02, 0, w + 0.02, 0.04, d + 0.03, c2 || COL.marble)]; },
    sinkcounter(w, d, h, c, c2) { return [...BUILD.counter(w, d, h, c, c2), box(0, h + 0.005, 0, Math.min(0.7, w - 0.15), 0.015, d - 0.2, COL.steel), cyl(0, h + 0.15, -d / 2 + 0.1, 0.015, 0.3, COL.steel), box(0, h + 0.3, -d / 2 + 0.17, 0.03, 0.03, 0.15, COL.steel)]; },
    uppercab(w, d, h, c) { return BUILD.cabinet(w, d, h, c); },
    island(w, d, h, c, c2) { return [...BUILD.cabinet(w, d, h - 0.04, c), box(0, h - 0.02, 0, w + 0.3, 0.04, d + 0.3, c2 || COL.marble)]; },
    hood(w, d, h, c) { return [box(0, 0.08, 0, w, 0.16, d, c), box(0, h / 2 + 0.1, -d / 2 + 0.15, 0.4, h - 0.2, 0.3, c)]; },
    washer(w, d, h, c) { return [box(0, h / 2, 0, w, h, d, c), cyl(0, h * 0.45, d / 2 + 0.01, w * 0.32, 0.02, COL.black, { r: [Math.PI / 2, 0, 0] }), cyl(0, h * 0.45, d / 2 + 0.02, w * 0.25, 0.02, COL.glass, { r: [Math.PI / 2, 0, 0], op: 0.6 }), box(0, h - 0.08, d / 2 + 0.005, w - 0.1, 0.08, 0.01, '#333')]; },
    dishwasher(w, d, h, c) { return [box(0, h / 2, 0, w, h, d, c), box(0, h / 2 - 0.03, d / 2 + 0.005, w - 0.04, h - 0.12, 0.01, shade(c, -10)), box(0, h - 0.05, d / 2 + 0.02, w - 0.1, 0.03, 0.03, COL.metal)]; },
    microwave(w, d, h, c) { return [box(0, h / 2, 0, w, h, d, c), box(-0.05, h / 2, d / 2 + 0.005, w * 0.65, h - 0.06, 0.01, '#222'), box(w / 2 - 0.06, h / 2, d / 2 + 0.005, 0.08, h - 0.06, 0.01, '#555')]; },
    washbasin(w, d, h, c, c2) { return [...BUILD.cabinet(w, d, h - 0.12, c, null, 2), box(0, h - 0.1, 0, w, 0.04, d, c2 || COL.marble), box(0, h - 0.04, 0, w - 0.15, 0.1, d - 0.15, COL.white), box(0, h - 0.0, 0, w - 0.25, 0.02, d - 0.25, '#dfe6ea'), cyl(0, h + 0.12, -d / 2 + 0.08, 0.015, 0.25, COL.steel)]; },
    pedestalsink(w, d, h, c) { return [cyl(0, (h - 0.15) / 2, 0, 0.09, h - 0.15, COL.white), box(0, h - 0.07, 0, w, 0.14, d, COL.white), box(0, h, 0, w - 0.12, 0.01, d - 0.12, '#dfe6ea'), cyl(0, h + 0.1, -d / 2 + 0.07, 0.013, 0.2, COL.steel)]; },
    toilet(w, d, h, c) { return [box(0, h / 2, -d / 2 + 0.1, w, h, 0.2, COL.white), box(0, 0.2, 0.05, w * 0.6, 0.4, d * 0.55, COL.white), cyl(0, 0.4, 0.12, w / 2, 0.05, COL.white, { s: [w / 2, 0.05, d * 0.36] }), box(0, h - 0.02, -d / 2 + 0.1, 0.1, 0.02, 0.05, COL.metal)]; },
    bathtub(w, d, h, c) { return [box(0, h / 2, 0, w, h, d, c || COL.white), box(0, h - 0.02, 0, w - 0.16, 0.04, d - 0.16, '#cfe3ea'), cyl(-w / 2 + 0.15, h + 0.1, 0, 0.015, 0.2, COL.steel), box(-w / 2 + 0.15, h + 0.2, 0.08, 0.03, 0.03, 0.16, COL.steel)]; },
    shower(w, d, h, c) { return [box(0, 0.04, 0, w, 0.08, d, COL.white), box(0, h / 2, d / 2 - 0.005, w, h, 0.01, COL.glass, { op: 0.35 }), box(w / 2 - 0.005, h / 2, 0, 0.01, h, d, COL.glass, { op: 0.35 }), cyl(-w / 2 + 0.08, h / 2, -d / 2 + 0.08, 0.015, h - 0.1, COL.steel), cyl(-w / 2 + 0.2, h - 0.12, -d / 2 + 0.2, 0.1, 0.015, COL.steel), box(-w / 2 + 0.14, h - 0.12, -d / 2 + 0.14, 0.2, 0.012, 0.012, COL.steel, { r: [0, Math.PI / 4, 0] })]; },
    bidet(w, d, h, c) { return [box(0, h / 2, 0, w * 0.7, h, d * 0.6, COL.white), cyl(0, h - 0.03, 0.05, w / 2, 0.06, COL.white, { s: [w / 2, 0.06, d / 2.2] })]; },
    floorlamp(w, d, h, c) { return [cyl(0, 0.015, 0, w / 2, 0.03, COL.black), cyl(0, h / 2, 0, 0.012, h - 0.25, COL.metal), cone(0, h - 0.12, 0, w / 2, 0.3, c, { em: true })]; },
    tablelamp(w, d, h, c) { return [cyl(0, 0.02, 0, w / 3, 0.04, COL.black), cyl(0, h / 2, 0, 0.015, h - 0.2, COL.metal), cone(0, h - 0.1, 0, w / 2, 0.22, c, { em: true })]; },
    pendant(w, d, h, c) { return [cyl(0, h - 0.02, 0, 0.05, 0.04, COL.black), cyl(0, h / 2 + 0.12, 0, 0.004, h - 0.3, COL.black), cone(0, 0.13, 0, w / 2, 0.26, c, { em: true }), sph(0, 0.1, 0, 0.04, '#fff6d5', { em: true })]; },
    chandelier(w, d, h, c) { const parts = [cyl(0, h - 0.02, 0, 0.06, 0.04, c), cyl(0, h / 2 + 0.1, 0, 0.006, h - 0.25, c), cyl(0, 0.2, 0, w / 2, 0.03, c)]; const n = 8; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; parts.push(cyl(Math.cos(a) * w / 2, 0.28, Math.sin(a) * w / 2, 0.012, 0.14, c)); parts.push(sph(Math.cos(a) * w / 2, 0.38, Math.sin(a) * w / 2, 0.035, '#fff6d5', { em: true })); } return parts; },
    spot(w, d, h, c) { return [cyl(0, h - 0.015, 0, w / 2, 0.03, COL.white), sph(0, h - 0.035, 0, w / 3, '#fff6d5', { em: true })]; },
    walllamp(w, d, h, c) { return [box(0, h / 2, -d / 2 + 0.02, 0.08, 0.08, 0.04, COL.metal), cone(0, h / 2 + 0.02, 0.03, w / 2, h, c, { em: true })]; },
    plant(w, d, h, c, c2) { const ph = Math.min(0.4, h * 0.3); const parts = [cyl(0, ph / 2, 0, w / 3, ph, c2 || COL.terracotta)]; const n = 5; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, r = w / 4; parts.push(sph(Math.cos(a) * r * 0.6, ph + (h - ph) * (0.45 + 0.15 * (i % 2)), Math.sin(a) * r * 0.6, w / 3.2, c || COL.green)); } parts.push(sph(0, ph + (h - ph) * 0.75, 0, w / 3, shade(c || COL.green, 12))); return parts; },
    palm(w, d, h, c) { const parts = [cyl(0, h * 0.35, 0, 0.06, h * 0.7, COL.wood)]; for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; parts.push(box(Math.cos(a) * w / 4, h * 0.78, Math.sin(a) * w / 4, w / 2, 0.04, 0.16, COL.green, { r: [0, -a, 0.5] })); } return parts; },
    tree(w, d, h, c) { return [cyl(0, h * 0.25, 0, w / 12, h * 0.5, COL.wood), sph(0, h * 0.62, 0, w / 2, c || COL.darkgreen), sph(w / 5, h * 0.55, w / 6, w / 2.8, shade(c || COL.darkgreen, 15)), sph(-w / 5, h * 0.72, -w / 6, w / 2.6, shade(c || COL.darkgreen, 8))]; },
    bush(w, d, h, c) { return [sph(0, h / 2, 0, w / 2, c || COL.green), sph(w / 4, h / 2.2, w / 5, w / 3, shade(c || COL.green, 12)), sph(-w / 4, h / 2.4, -w / 6, w / 3, shade(c || COL.green, -8))]; },
    flowerbed(w, d, h, c) { const parts = [box(0, h / 2, 0, w, h, d, '#6b4a2b')]; const cols = ['#e2474b', '#f2b134', '#ffffff', '#c94fd1']; for (let i = 0; i < 8; i++) parts.push(sph(-w / 2 + (i + 0.5) * (w / 8), h + 0.1, ((i % 2) - 0.5) * d / 2.5, 0.08, cols[i % 4])); return parts; },
    rug(w, d, h, c, c2) { return [box(0, 0.006, 0, w, 0.012, d, c), box(0, 0.013, 0, w - 0.3, 0.002, d - 0.3, c2 || shade(c, 25))]; },
    painting(w, d, h, c, c2) { return [box(0, h / 2, 0, w, h, 0.03, COL.darkwood), box(0, h / 2, 0.016, w - 0.06, h - 0.06, 0.005, c), sph(w * 0.1, h * 0.55, 0.02, h * 0.18, c2 || COL.gold), box(-w * 0.2, h * 0.3, 0.02, w * 0.4, h * 0.2, 0.004, shade(c, -40))]; },
    mirror(w, d, h, c) { return [box(0, h / 2, 0, w, h, 0.03, c || COL.gold), box(0, h / 2, 0.016, w - 0.05, h - 0.05, 0.005, '#cfe3ea', { metal: true })]; },
    clock(w, d, h, c) { return [cyl(0, h / 2, 0, w / 2, 0.03, c, { r: [Math.PI / 2, 0, 0] }), cyl(0, h / 2, 0.016, w / 2 - 0.02, 0.005, COL.white, { r: [Math.PI / 2, 0, 0] }), box(0, h / 2 + w / 8, 0.02, 0.008, w / 4, 0.004, COL.black), box(w / 10, h / 2, 0.02, w / 5, 0.008, 0.004, COL.black)]; },
    curtain(w, d, h, c) { const parts = [cyl(0, h - 0.02, 0, 0.012, w, COL.metal, { r: [0, 0, Math.PI / 2] })]; const n = Math.max(2, Math.round(w / 0.12)); for (let i = 0; i < n; i++) parts.push(box(-w / 2 + (i + 0.5) * (w / n), (h - 0.05) / 2, 0, w / n - 0.015, h - 0.05, 0.04 + (i % 2) * 0.03, i % 2 ? c : shade(c, 12))); return parts; },
    vase(w, d, h, c) { return [cyl(0, h * 0.3, 0, w / 2, h * 0.6, c), cyl(0, h * 0.75, 0, w / 4, h * 0.3, shade(c, -10)), sph(0, h * 0.95, 0, w / 2.2, COL.green)]; },
    stairs(w, d, h, c) { const n = Math.max(6, Math.round(h / 0.18)); const parts = []; const sd = d / n, sh = h / n; for (let i = 0; i < n; i++) parts.push(box(0, sh * (i + 0.5), -d / 2 + sd * (i + 0.5), w, sh, sd * (n - i), c)); parts.push(box(-w / 2 + 0.02, h / 2 + 0.45, 0, 0.04, 0.05, d, COL.darkwood, { r: [Math.atan2(h, d), 0, 0] })); parts.push(box(w / 2 - 0.02, h / 2 + 0.45, 0, 0.04, 0.05, d, COL.darkwood, { r: [Math.atan2(h, d), 0, 0] })); return parts; },
    spiralstairs(w, d, h, c) { const parts = [cyl(0, h / 2, 0, 0.08, h, COL.metal)]; const n = Math.round(h / 0.2); for (let i = 0; i < n; i++) { const a = i * 0.55; parts.push(box(Math.cos(a) * w / 4, 0.1 + i * (h / n), Math.sin(a) * w / 4, w / 2, 0.04, 0.25, c, { r: [0, -a, 0] })); } return parts; },
    column(w, d, h, c) { return [cyl(0, h / 2, 0, w / 2, h, c), cyl(0, 0.05, 0, w / 2 + 0.05, 0.1, c), cyl(0, h - 0.05, 0, w / 2 + 0.05, 0.1, c)]; },
    fireplace(w, d, h, c, c2) { return [box(0, h / 2, 0, w, h, d, c), box(0, 0.4, d / 2 - 0.1, w * 0.5, 0.7, 0.3, '#1c1c1c'), box(0, 0.12, d / 2 - 0.12, w * 0.4, 0.15, 0.2, '#ff7a1a', { em: true }), box(0, h + 0.03, 0, w + 0.1, 0.06, d + 0.1, c2 || COL.marble)]; },
    partition(w, d, h, c) { const parts = []; const n = 3; for (let i = 0; i < n; i++) parts.push(box(-w / 2 + (i + 0.5) * (w / n), h / 2, (i % 2 ? 0.06 : -0.06), w / n - 0.02, h, 0.03, c)); return parts; },
    aquarium(w, d, h, c) { return [...BUILD.cabinet(w, d, h * 0.5, COL.black), box(0, h * 0.75, 0, w, h * 0.5, d, '#2a8bbf', { op: 0.5 }), box(0, h * 0.52, 0, w - 0.04, 0.04, d - 0.04, '#c9b37a')]; },
    piano(w, d, h, c) { return [box(0, h * 0.55 + 0.15, -0.1, w, h * 0.9 - 0.15, d - 0.2, c), box(0, 0.75, d / 2 - 0.1, w, 0.1, 0.25, c), box(0, 0.81, d / 2 - 0.08, w - 0.1, 0.03, 0.18, COL.white), box(-w / 2 + 0.04, 0.35, d / 2 - 0.15, 0.06, 0.7, 0.3, c), box(w / 2 - 0.04, 0.35, d / 2 - 0.15, 0.06, 0.7, 0.3, c)]; },
    grandpiano(w, d, h, c) { return [box(0, h - 0.15, 0, w, 0.3, d, c), box(0, h - 0.12, d / 2 - 0.12, w - 0.2, 0.03, 0.2, COL.white), ...legs4(w, d, h - 0.3, c, 0.15, 0.05), box(0, h + 0.25, -0.2, w - 0.1, 0.03, d - 0.6, c, { r: [-0.45, 0, 0] })]; },
    treadmill(w, d, h, c) { return [box(0, 0.08, 0.1, w, 0.16, d - 0.2, COL.black), box(0, 0.165, 0.1, w - 0.1, 0.01, d - 0.3, '#444'), box(-w / 2 + 0.03, h / 2, -d / 2 + 0.15, 0.04, h, 0.04, COL.metal, { r: [-0.25, 0, 0] }), box(w / 2 - 0.03, h / 2, -d / 2 + 0.15, 0.04, h, 0.04, COL.metal, { r: [-0.25, 0, 0] }), box(0, h, -d / 2 + 0.03, w, 0.25, 0.08, c)]; },
    bike(w, d, h, c) { return [box(0, 0.04, 0, w, 0.08, d, COL.black), cyl(0, 0.5, 0.1, 0.03, 0.9, COL.metal, { r: [0.2, 0, 0] }), cyl(0, 0.3, 0.25, 0.25, 0.08, COL.black, { r: [0, 0, Math.PI / 2] }), box(0, h - 0.1, -d / 2 + 0.1, w * 0.8, 0.04, 0.04, COL.black), box(0, h * 0.75, 0.3, 0.3, 0.06, 0.25, c)]; },
    pingpong(w, d, h, c) { return [box(0, h - 0.02, 0, w, 0.04, d, c), box(0, h + 0.07, 0, w + 0.1, 0.16, 0.02, COL.white), ...legs4(w, d, h - 0.04, COL.metal, 0.2, 0.025), box(0, h - 0.01, 0, w, 0.005, 0.03, COL.white)]; },
    billiard(w, d, h, c) { return [box(0, h - 0.08, 0, w, 0.16, d, COL.darkwood), box(0, h - 0.01, 0, w - 0.2, 0.02, d - 0.2, c), ...legs4(w, d, h - 0.16, COL.darkwood, 0.12, 0.06)]; },
    car(w, d, h, c) { return [box(0, 0.5, 0, w, 0.5, d, c), box(0, 0.95, -0.15, w - 0.2, 0.45, d * 0.5, '#2a3a4a'), cyl(-w / 2 + 0.02, 0.33, d / 3, 0.33, 0.2, COL.black, { r: [0, 0, Math.PI / 2] }), cyl(w / 2 - 0.02, 0.33, d / 3, 0.33, 0.2, COL.black, { r: [0, 0, Math.PI / 2] }), cyl(-w / 2 + 0.02, 0.33, -d / 3, 0.33, 0.2, COL.black, { r: [0, 0, Math.PI / 2] }), cyl(w / 2 - 0.02, 0.33, -d / 3, 0.33, 0.2, COL.black, { r: [0, 0, Math.PI / 2] })]; },
    grill(w, d, h, c) { return [box(0, h - 0.2, 0, w, 0.4, d, COL.black), box(0, h - 0.01, 0, w - 0.06, 0.02, d - 0.06, COL.metal), ...legs4(w, d, h - 0.4, COL.metal, 0.08, 0.02), box(0, h + 0.15, -d / 2 + 0.03, w, 0.3, 0.04, COL.black)]; },
    umbrella(w, d, h, c) { return [cyl(0, 0.03, 0, 0.3, 0.06, COL.black), cyl(0, h / 2, 0, 0.02, h, COL.metal), cone(0, h - 0.25, 0, w / 2, 0.5, c)]; },
    fence(w, d, h, c) { const parts = [box(0, h - 0.05, 0, w, 0.06, 0.04, c), box(0, h / 2, 0, w, 0.06, 0.04, c)]; const n = Math.round(w / 0.15); for (let i = 0; i <= n; i++) parts.push(box(-w / 2 + i * (w / n), h / 2, 0, 0.05, h, 0.03, c)); return parts; },
    pool(w, d, h, c) { return [box(0, 0.04, 0, w + 0.6, 0.08, d + 0.6, '#d8d2c6'), box(0, 0.03, 0, w, 0.08, d, '#4fb3e8', { op: 0.85 })]; },
    swing(w, d, h, c) { return [box(-w / 2, h / 2, 0, 0.06, h, 0.06, c, { r: [0.3, 0, 0] }), box(w / 2, h / 2, 0, 0.06, h, 0.06, c, { r: [0.3, 0, 0] }), box(-w / 2, h / 2, 0, 0.06, h, 0.06, c, { r: [-0.3, 0, 0] }), box(w / 2, h / 2, 0, 0.06, h, 0.06, c, { r: [-0.3, 0, 0] }), box(0, h, 0, w, 0.06, 0.06, c), box(0, 0.45, 0, 0.45, 0.04, 0.2, COL.wood), cyl(-0.18, h / 2 + 0.2, 0, 0.008, h - 0.5, COL.metal), cyl(0.18, h / 2 + 0.2, 0, 0.008, h - 0.5, COL.metal)]; },
    ac(w, d, h, c) { return [box(0, h / 2, 0, w, h, d, c), box(0, 0.05, d / 2 + 0.005, w - 0.08, 0.06, 0.01, '#bdbdbd')]; },
    pc(w, d, h, c) { return [box(0, h - 0.18, 0, w, 0.36, 0.03, COL.black), box(0, h - 0.18, 0.016, w - 0.03, 0.33, 0.005, '#1f3b5a'), cyl(0, 0.1, 0, 0.02, 0.2, COL.black), box(0, 0.01, 0, 0.25, 0.02, 0.15, COL.black)]; },
    laptop(w, d, h, c) { return [box(0, 0.01, 0, w, 0.02, d, c), box(0, h / 2, -d / 2 + 0.01, w, h, 0.01, c, { r: [-0.2, 0, 0] })]; },
    speaker(w, d, h, c) { return [box(0, h / 2, 0, w, h, d, c), cyl(0, h * 0.3, d / 2 + 0.005, w * 0.35, 0.01, '#444', { r: [Math.PI / 2, 0, 0] }), cyl(0, h * 0.75, d / 2 + 0.005, w * 0.2, 0.01, '#444', { r: [Math.PI / 2, 0, 0] })]; },
    waterheater(w, d, h, c) { return [cyl(0, h / 2, 0, w / 2, h, c, { r: [0, 0, Math.PI / 2], s: [w / 2, d, w / 2] })]; },
    radiator(w, d, h, c) { const parts = []; const n = Math.round(w / 0.07); for (let i = 0; i < n; i++) parts.push(box(-w / 2 + (i + 0.5) * (w / n), h / 2, 0, 0.05, h, d, c)); return parts; },
    safe(w, d, h, c) { return [box(0, h / 2, 0, w, h, d, c), cyl(0, h / 2, d / 2 + 0.01, 0.05, 0.02, COL.metal, { r: [Math.PI / 2, 0, 0] })]; },
    coatrack(w, d, h, c) { return [cyl(0, 0.015, 0, w / 2, 0.03, c), cyl(0, h / 2, 0, 0.02, h, c), ...[0, 1, 2, 3].map(i => box(Math.cos(i * 1.57) * 0.12, h - 0.1, Math.sin(i * 1.57) * 0.12, 0.25, 0.02, 0.02, c, { r: [0, -i * 1.57, 0.4] }))]; },
    shoerack(w, d, h, c) { return [box(0, h / 2, 0, w, h, d, c), box(0, h * 0.33, d / 2 + 0.005, w - 0.03, 0.01, 0.01, shade(c, -30)), box(0, h * 0.66, d / 2 + 0.005, w - 0.03, 0.01, 0.01, shade(c, -30))]; },
    toybox(w, d, h, c, c2) { return [box(0, h / 2, 0, w, h, d, c), box(0, h, 0, w + 0.02, 0.04, d + 0.02, c2 || shade(c, -30)), sph(w / 4, h + 0.08, 0, 0.08, '#e2474b'), sph(-w / 4, h + 0.08, 0, 0.07, '#3b6fb6')]; },
    playhouse(w, d, h, c, c2) { return [box(0, h * 0.3, 0, w, h * 0.6, d, c), box(0, h * 0.78, 0, w + 0.1, 0.02, d + 0.1, c2 || COL.red), cone(0, h * 0.8, 0, w * 0.75, h * 0.4, c2 || COL.red, { seg: 4 }), box(0, h * 0.25, d / 2 + 0.005, 0.4, h * 0.5, 0.01, COL.darkwood)]; },
    slide(w, d, h, c) { return [box(0, h / 2, -d / 2 + 0.2, 0.5, h, 0.4, COL.metal), box(0, h / 2, 0.2, 0.5, 0.05, d - 0.3, c, { r: [-Math.atan2(h, d - 0.3), 0, 0] })]; },
    dallah(w, d, h, c) { return [cyl(0, h * 0.4, 0, w / 2, h * 0.8, c || COL.gold), cone(0, h * 0.9, 0, w / 2.4, h * 0.2, c || COL.gold), box(w / 2, h * 0.5, 0, 0.03, h * 0.4, 0.03, c || COL.gold)]; },
    tent(w, d, h, c) { return [cone(0, h / 2, 0, w / 2, h, c, { seg: 4 }), box(0, 0.02, 0, w, 0.04, d, COL.beige)]; },
    generic(w, d, h, c) { return [box(0, h / 2, 0, w, h, d, c)]; }
  };

  // ---------- العناصر ----------
  const I = (id, n, cat, kind, w, d, h, c, price, extra) => Object.assign({ id, n, cat, kind, w, d, h, c, price, mount: 'floor', elev: 0 }, extra || {});

  const ITEMS = [
    // ------ غرفة المعيشة ------
    I('sofa2', 'كنبة مقعدين', 'living', 'sofa', 1.6, 0.9, 0.85, '#6f8fa8', 450),
    I('sofa3', 'كنبة ثلاثة مقاعد', 'living', 'sofa', 2.2, 0.95, 0.85, '#5c6b7a', 650),
    I('sofaL', 'كنبة زاوية (L)', 'living', 'sofaL', 2.6, 2.0, 0.85, '#8a8f9a', 1100),
    I('sofa_leather', 'كنبة جلد كلاسيك', 'living', 'sofa', 2.1, 0.95, 0.9, '#7a4a2a', 900),
    I('sofa_velvet', 'كنبة مخمل', 'living', 'sofa', 2.0, 0.9, 0.8, '#2d6a4f', 780),
    I('armchair', 'كرسي بذراعين', 'living', 'armchair', 0.9, 0.9, 0.85, '#b56b4a', 280),
    I('armchair_modern', 'كرسي استرخاء عصري', 'living', 'armchair', 0.8, 0.85, 0.8, '#c9a227', 320),
    I('recliner', 'كرسي ريكلاينر', 'living', 'armchair', 0.95, 1.0, 1.0, '#3d3d3d', 520),
    I('pouf', 'بوف (مقعد منخفض)', 'living', 'cushion', 0.5, 0.5, 0.4, '#d98c5f', 60),
    I('coffee_table', 'طاولة قهوة مستطيلة', 'living', 'coffeetable', 1.1, 0.6, 0.42, '#a8784f', 150),
    I('coffee_round', 'طاولة قهوة دائرية', 'living', 'roundtable', 0.8, 0.8, 0.42, '#5b3a29', 140),
    I('side_table', 'طاولة جانبية', 'living', 'roundtable', 0.45, 0.45, 0.55, '#a8784f', 60),
    I('tv_stand', 'طاولة تلفزيون مع شاشة', 'living', 'tvstand', 1.6, 0.45, 0.5, '#5b3a29', 350),
    I('tv_unit', 'وحدة تلفزيون كبيرة', 'living', 'cabinet', 2.4, 0.45, 0.6, '#3d3d3d', 600),
    I('bookshelf_low', 'رف كتب منخفض', 'living', 'bookcase', 1.2, 0.35, 0.9, '#a8784f', 180),
    I('rug_large', 'سجادة كبيرة', 'living', 'rug', 2.4, 1.7, 0.02, '#b8926a', 120, { c2: '#e4d3b9' }),
    I('rug_round', 'سجادة دائرية', 'living', 'rugRound', 1.6, 1.6, 0.02, '#6f8fa8', 90),
    I('fireplace', 'مدفأة', 'living', 'fireplace', 1.4, 0.5, 1.1, '#9c8c7c', 1500),
    I('console', 'طاولة كونسول', 'living', 'table', 1.2, 0.35, 0.8, '#5b3a29', 170),

    // ------ المجلس العربي ------
    I('floorsofa_single', 'جلسة أرضية (قطعة)', 'majlis', 'floorsofa', 0.9, 0.9, 0.18, '#8b2e2e', 110, { c2: '#c9a227' }),
    I('floorsofa_long', 'جلسة أرضية طويلة', 'majlis', 'floorsofa', 2.4, 0.9, 0.18, '#8b2e2e', 260, { c2: '#c9a227' }),
    I('floorsofa_long3', 'جلسة أرضية 3 متر', 'majlis', 'floorsofa', 3.0, 0.9, 0.18, '#2d3b55', 320, { c2: '#d9cbb3' }),
    I('majlis_sofa', 'كنبة مجلس كلاسيكية', 'majlis', 'sofa', 2.4, 0.9, 0.95, '#6b2f2f', 820, { c2: '#c9a227' }),
    I('majlis_table', 'طاولة وسط مجلس', 'majlis', 'table', 1.2, 0.6, 0.4, '#5b3a29', 200),
    I('tea_table', 'طاولة شاي صغيرة', 'majlis', 'roundtable', 0.5, 0.5, 0.45, '#c9a227', 70),
    I('cushion_big', 'مخدة ظهر كبيرة', 'majlis', 'cushion', 0.6, 0.2, 0.5, '#c9a227', 25),
    I('dallah_set', 'طقم دلّة قهوة', 'majlis', 'dallah', 0.18, 0.18, 0.35, '#c9a227', 80, { elev: 0.4 }),
    I('majlis_carpet', 'سجاد عربي مزخرف', 'majlis', 'rug', 3.5, 2.5, 0.02, '#8b2e2e', 400, { c2: '#d9b36a' }),
    I('mabkhara', 'مبخرة', 'majlis', 'vase', 0.2, 0.2, 0.35, '#c9a227', 45),
    I('tent_majlis', 'خيمة مجلس (خارجية)', 'majlis', 'tent', 4, 4, 2.6, '#3d3d3d', 1200),

    // ------ غرفة النوم ------
    I('bed_single', 'سرير مفرد', 'bedroom', 'bed', 1.0, 2.0, 0.9, '#6f8fa8', 300),
    I('bed_double', 'سرير مزدوج', 'bedroom', 'bed', 1.6, 2.0, 1.0, '#5c6b7a', 550),
    I('bed_king', 'سرير كينج', 'bedroom', 'bed', 2.0, 2.1, 1.1, '#3d3d3d', 800, { c2: '#d9cbb3' }),
    I('bed_queen', 'سرير كوين', 'bedroom', 'bed', 1.8, 2.0, 1.0, '#7a4a2a', 700),
    I('bed_kids', 'سرير أطفال', 'bedroom', 'bed', 0.9, 1.9, 0.8, '#e2a3b8', 260),
    I('nightstand', 'كومودينو', 'bedroom', 'drawers', 0.5, 0.4, 0.55, '#a8784f', 80),
    I('wardrobe2', 'دولاب بابين', 'bedroom', 'cabinet', 1.2, 0.6, 2.2, '#d9b68c', 450),
    I('wardrobe3', 'دولاب 3 أبواب', 'bedroom', 'cabinet', 1.8, 0.6, 2.2, '#a8784f', 650),
    I('wardrobe4', 'دولاب 4 أبواب', 'bedroom', 'cabinet', 2.4, 0.6, 2.3, '#f3f3f1', 900),
    I('sliding_wardrobe', 'دولاب منزلق مع مرايا', 'bedroom', 'cabinet', 2.0, 0.65, 2.4, '#c9ccd1', 1000),
    I('dresser', 'تسريحة مع مرآة', 'bedroom', 'dresserMirror', 1.2, 0.5, 1.5, '#f3f3f1', 320),
    I('chest', 'خزانة أدراج', 'bedroom', 'drawers', 0.9, 0.45, 1.1, '#a8784f', 240),
    I('bench_bed', 'مقعد نهاية السرير', 'bedroom', 'bench', 1.2, 0.4, 0.45, '#d9cbb3', 130),
    I('rug_bedroom', 'سجادة غرفة نوم', 'bedroom', 'rug', 2.0, 1.4, 0.02, '#d9cbb3', 90, { c2: '#efe6d5' }),
    I('vanity_stool', 'كرسي تسريحة', 'bedroom', 'stool', 0.4, 0.4, 0.45, '#e2a3b8', 50),

    // ------ غرفة الأطفال ------
    I('crib', 'سرير رضيع', 'kids', 'crib', 0.7, 1.3, 0.9, '#f3f3f1', 220),
    I('bunk', 'سرير بطابقين', 'kids', 'bunkbed', 1.0, 2.0, 1.7, '#3b6fb6', 520),
    I('kids_desk', 'مكتب أطفال', 'kids', 'desk', 1.0, 0.55, 0.7, '#f2b134', 140),
    I('kids_chair', 'كرسي أطفال', 'kids', 'chair', 0.4, 0.4, 0.7, '#e2474b', 40),
    I('toybox', 'صندوق ألعاب', 'kids', 'toybox', 0.8, 0.45, 0.5, '#3b6fb6', 60, { c2: '#f2b134' }),
    I('kids_wardrobe', 'دولاب أطفال', 'kids', 'cabinet', 1.0, 0.55, 1.8, '#9ad0ec', 300),
    I('kids_shelf', 'رف ألعاب', 'kids', 'bookcase', 0.9, 0.3, 1.2, '#f3f3f1', 120),
    I('kids_rug', 'سجادة ملونة', 'kids', 'rugRound', 1.5, 1.5, 0.02, '#f2b134', 70),
    I('playhouse', 'بيت لعب', 'kids', 'playhouse', 1.2, 1.2, 1.4, '#9ad0ec', 250, { c2: '#e2474b' }),
    I('changing_table', 'طاولة تغيير', 'kids', 'drawers', 0.9, 0.5, 0.9, '#f3f3f1', 180),
    I('rocking_chair', 'كرسي هزاز', 'kids', 'armchair', 0.7, 0.8, 0.9, '#d9cbb3', 160),

    // ------ المطبخ ------
    I('counter60', 'خزانة مطبخ سفلية 60 سم', 'kitchen', 'counter', 0.6, 0.6, 0.9, '#f3f3f1', 180, { c2: '#e7e4dd' }),
    I('counter90', 'خزانة مطبخ سفلية 90 سم', 'kitchen', 'counter', 0.9, 0.6, 0.9, '#f3f3f1', 240, { c2: '#e7e4dd' }),
    I('counter120', 'خزانة مطبخ سفلية 120 سم', 'kitchen', 'counter', 1.2, 0.6, 0.9, '#f3f3f1', 300, { c2: '#e7e4dd' }),
    I('counter_dark', 'خزانة مطبخ داكنة 120', 'kitchen', 'counter', 1.2, 0.6, 0.9, '#3d3d3d', 340, { c2: '#e7e4dd' }),
    I('corner_counter', 'خزانة زاوية', 'kitchen', 'counter', 0.9, 0.9, 0.9, '#f3f3f1', 320, { c2: '#e7e4dd' }),
    I('sink_counter', 'خزانة مع مغسلة', 'kitchen', 'sinkcounter', 0.9, 0.6, 0.9, '#f3f3f1', 380, { c2: '#e7e4dd' }),
    I('upper60', 'خزانة علوية 60 سم', 'kitchen', 'uppercab', 0.6, 0.35, 0.7, '#f3f3f1', 120, { mount: 'wall', elev: 1.5 }),
    I('upper90', 'خزانة علوية 90 سم', 'kitchen', 'uppercab', 0.9, 0.35, 0.7, '#f3f3f1', 160, { mount: 'wall', elev: 1.5 }),
    I('upper120', 'خزانة علوية 120 سم', 'kitchen', 'uppercab', 1.2, 0.35, 0.7, '#f3f3f1', 200, { mount: 'wall', elev: 1.5 }),
    I('tall_cabinet', 'خزانة طويلة (بانتري)', 'kitchen', 'cabinet', 0.6, 0.6, 2.2, '#f3f3f1', 400),
    I('fridge', 'ثلاجة', 'kitchen', 'fridge', 0.7, 0.7, 1.8, '#c9ccd1', 900),
    I('fridge_big', 'ثلاجة بابين كبيرة', 'kitchen', 'fridge', 0.9, 0.75, 1.8, '#3d3d3d', 1600),
    I('stove', 'فرن وموقد غاز', 'kitchen', 'stove', 0.6, 0.6, 0.9, '#c9ccd1', 600),
    I('stove90', 'موقد 90 سم 5 عيون', 'kitchen', 'stove', 0.9, 0.6, 0.9, '#3d3d3d', 1100),
    I('hood', 'شفاط مطبخ', 'kitchen', 'hood', 0.9, 0.5, 0.6, '#c9ccd1', 250, { mount: 'wall', elev: 1.55 }),
    I('dishwasher', 'غسالة صحون', 'kitchen', 'dishwasher', 0.6, 0.6, 0.85, '#c9ccd1', 500),
    I('microwave', 'ميكروويف', 'kitchen', 'microwave', 0.5, 0.4, 0.3, '#3d3d3d', 120, { elev: 0.9 }),
    I('island', 'جزيرة مطبخ', 'kitchen', 'island', 1.6, 0.9, 0.9, '#2d3b55', 900, { c2: '#e7e4dd' }),
    I('island_big', 'جزيرة مطبخ كبيرة', 'kitchen', 'island', 2.4, 1.0, 0.9, '#f3f3f1', 1300, { c2: '#3d3d3d' }),
    I('bar_stool', 'كرسي بار', 'kitchen', 'stool', 0.4, 0.4, 0.75, '#3d3d3d', 70),
    I('kitchen_table', 'طاولة مطبخ صغيرة', 'kitchen', 'table', 1.0, 0.7, 0.75, '#d9b68c', 150),
    I('washer', 'غسالة ملابس', 'kitchen', 'washer', 0.6, 0.6, 0.85, '#f3f3f1', 450),
    I('dryer', 'نشافة', 'kitchen', 'washer', 0.6, 0.6, 0.85, '#e9e6df', 420),
    I('water_cooler', 'برّادة ماء', 'kitchen', 'cabinet', 0.35, 0.35, 1.1, '#9ad0ec', 150),

    // ------ غرفة الطعام ------
    I('dining4', 'طاولة طعام 4 أشخاص', 'dining', 'table', 1.2, 0.8, 0.75, '#a8784f', 300),
    I('dining6', 'طاولة طعام 6 أشخاص', 'dining', 'table', 1.8, 0.9, 0.75, '#5b3a29', 450),
    I('dining8', 'طاولة طعام 8 أشخاص', 'dining', 'table', 2.4, 1.0, 0.75, '#3d3d3d', 700),
    I('dining_round', 'طاولة طعام دائرية', 'dining', 'roundtable', 1.3, 1.3, 0.75, '#a8784f', 400),
    I('dining_glass', 'طاولة طعام زجاج', 'dining', 'table', 1.6, 0.9, 0.75, '#9ad0ec', 500),
    I('dining_chair', 'كرسي طعام', 'dining', 'chair', 0.45, 0.5, 0.95, '#a8784f', 60),
    I('dining_chair_fab', 'كرسي طعام مبطّن', 'dining', 'chair', 0.5, 0.55, 0.9, '#6f8fa8', 85),
    I('sideboard', 'بوفيه (سايدبورد)', 'dining', 'cabinet', 1.6, 0.45, 0.85, '#5b3a29', 380),
    I('china_cabinet', 'خزانة عرض زجاجية', 'dining', 'cabinet', 1.2, 0.45, 2.0, '#d9b68c', 520),
    I('bar_cart', 'عربة تقديم', 'dining', 'shelf', 0.7, 0.4, 0.8, '#c9a227', 120),

    // ------ الحمام ------
    I('toilet', 'مرحاض إفرنجي', 'bathroom', 'toilet', 0.4, 0.7, 0.8, '#f3f3f1', 200),
    I('bidet', 'بيديه', 'bathroom', 'bidet', 0.4, 0.6, 0.4, '#f3f3f1', 150),
    I('washbasin', 'مغسلة مع خزانة', 'bathroom', 'washbasin', 0.8, 0.5, 0.85, '#f3f3f1', 300, { c2: '#e7e4dd' }),
    I('washbasin_double', 'مغسلة مزدوجة', 'bathroom', 'washbasin', 1.5, 0.5, 0.85, '#3d3d3d', 650, { c2: '#e7e4dd' }),
    I('pedestal', 'مغسلة قائمة', 'bathroom', 'pedestalsink', 0.55, 0.45, 0.85, '#f3f3f1', 140),
    I('bathtub', 'بانيو', 'bathroom', 'bathtub', 1.7, 0.75, 0.55, '#f3f3f1', 500),
    I('bathtub_free', 'بانيو حر مستقل', 'bathroom', 'bathtub', 1.6, 0.8, 0.6, '#f3f3f1', 1200),
    I('shower', 'كابينة دش', 'bathroom', 'shower', 0.9, 0.9, 2.0, '#9ad0ec', 450),
    I('shower_big', 'دش واسع (ووك-إن)', 'bathroom', 'shower', 1.2, 0.9, 2.0, '#9ad0ec', 700),
    I('bath_cabinet', 'خزانة حمام', 'bathroom', 'cabinet', 0.6, 0.35, 1.8, '#f3f3f1', 180),
    I('bath_mirror', 'مرآة حمام', 'bathroom', 'mirror', 0.8, 0.03, 0.7, '#c9ccd1', 60, { mount: 'wall', elev: 1.1 }),
    I('towel_rack', 'حامل مناشف', 'bathroom', 'radiator', 0.6, 0.1, 0.9, '#c9ccd1', 90, { mount: 'wall', elev: 0.7 }),
    I('water_heater', 'سخّان ماء', 'bathroom', 'waterheater', 0.45, 0.5, 0.45, '#f3f3f1', 220, { mount: 'wall', elev: 1.9 }),
    I('laundry_basket', 'سلة غسيل', 'bathroom', 'cabinet', 0.4, 0.4, 0.6, '#d9cbb3', 30),
    I('bath_mat', 'سجادة حمام', 'bathroom', 'rug', 0.8, 0.5, 0.01, '#6f8fa8', 15),

    // ------ المكتب ------
    I('desk', 'مكتب', 'office', 'desk', 1.4, 0.7, 0.75, '#a8784f', 250),
    I('desk_L', 'مكتب زاوية L', 'office', 'deskL', 1.8, 1.6, 0.75, '#3d3d3d', 450),
    I('desk_exec', 'مكتب مدير', 'office', 'desk', 2.0, 0.9, 0.76, '#5b3a29', 800),
    I('office_chair', 'كرسي مكتب', 'office', 'officechair', 0.6, 0.6, 1.1, '#3d3d3d', 180),
    I('office_chair_exec', 'كرسي مدير جلد', 'office', 'officechair', 0.7, 0.7, 1.25, '#7a4a2a', 350),
    I('visitor_chair', 'كرسي زائر', 'office', 'chair', 0.55, 0.55, 0.9, '#6f8fa8', 90),
    I('bookcase', 'مكتبة كتب', 'office', 'bookcase', 1.0, 0.35, 2.0, '#a8784f', 300),
    I('bookcase_big', 'مكتبة كبيرة', 'office', 'bookcase', 1.8, 0.4, 2.2, '#5b3a29', 550),
    I('filing', 'خزانة ملفات', 'office', 'drawers', 0.45, 0.6, 1.3, '#9aa0a6', 200),
    I('pc', 'كمبيوتر مكتبي', 'office', 'pc', 0.6, 0.25, 0.5, '#3d3d3d', 700, { elev: 0.75 }),
    I('laptop', 'لابتوب', 'office', 'laptop', 0.35, 0.25, 0.22, '#c9ccd1', 900, { elev: 0.75 }),
    I('printer', 'طابعة', 'office', 'microwave', 0.45, 0.4, 0.25, '#f3f3f1', 150, { elev: 0.75 }),
    I('whiteboard', 'سبورة بيضاء', 'office', 'painting', 1.2, 0.03, 0.9, '#ffffff', 80, { mount: 'wall', elev: 1.0, c2: '#ffffff' }),
    I('meeting_table', 'طاولة اجتماعات', 'office', 'table', 2.4, 1.2, 0.75, '#3d3d3d', 650),
    I('safe', 'خزنة', 'office', 'safe', 0.5, 0.5, 0.6, '#3d3d3d', 300),

    // ------ التخزين ------
    I('shelf_wall', 'رف حائط', 'storage', 'shelf', 0.9, 0.25, 0.04, '#a8784f', 30, { mount: 'wall', elev: 1.5 }),
    I('shelf_unit', 'وحدة رفوف مفتوحة', 'storage', 'bookcase', 0.8, 0.4, 1.8, '#f3f3f1', 180),
    I('cube_storage', 'وحدة مكعبات', 'storage', 'bookcase', 1.2, 0.4, 1.2, '#f3f3f1', 150),
    I('shoe_rack', 'رف أحذية', 'storage', 'shoerack', 0.8, 0.35, 0.9, '#a8784f', 70),
    I('coat_rack', 'شمّاعة ملابس', 'storage', 'coatrack', 0.4, 0.4, 1.8, '#3d3d3d', 50),
    I('hall_cabinet', 'خزانة مدخل', 'storage', 'cabinet', 1.0, 0.4, 1.0, '#5b3a29', 220),
    I('walkin_rack', 'وحدة غرفة ملابس', 'storage', 'bookcase', 1.5, 0.5, 2.3, '#d9b68c', 400),
    I('chest_storage', 'صندوق تخزين', 'storage', 'toybox', 0.9, 0.5, 0.5, '#a8784f', 90, { c2: '#5b3a29' }),
    I('wine_rack', 'رف زجاجات', 'storage', 'bookcase', 0.5, 0.3, 1.2, '#5b3a29', 110),
    I('ladder_shelf', 'رف سلّم', 'storage', 'bookcase', 0.6, 0.4, 1.7, '#3d3d3d', 130),

    // ------ الإضاءة ------
    I('floor_lamp', 'أباجورة أرضية', 'lighting', 'floorlamp', 0.4, 0.4, 1.6, '#f3e3c3', 90),
    I('floor_lamp_arc', 'أباجورة أرضية قوس', 'lighting', 'floorlamp', 0.45, 0.45, 1.9, '#3d3d3d', 160),
    I('table_lamp', 'أباجورة طاولة', 'lighting', 'tablelamp', 0.3, 0.3, 0.5, '#f3e3c3', 40, { elev: 0.55 }),
    I('pendant', 'إضاءة معلّقة', 'lighting', 'pendant', 0.4, 0.4, 0.9, '#3d3d3d', 80, { mount: 'ceiling' }),
    I('pendant_glass', 'إضاءة معلّقة زجاج', 'lighting', 'pendant', 0.3, 0.3, 1.0, '#9ad0ec', 110, { mount: 'ceiling' }),
    I('chandelier', 'ثريا كلاسيك', 'lighting', 'chandelier', 0.8, 0.8, 0.7, '#c9a227', 450, { mount: 'ceiling' }),
    I('chandelier_big', 'ثريا كبيرة', 'lighting', 'chandelier', 1.2, 1.2, 0.9, '#c9ccd1', 900, { mount: 'ceiling' }),
    I('spot', 'سبوت لايت سقف', 'lighting', 'spot', 0.12, 0.12, 0.05, '#ffffff', 15, { mount: 'ceiling' }),
    I('ceiling_light', 'بلافونيرة سقف', 'lighting', 'spot', 0.4, 0.4, 0.1, '#ffffff', 45, { mount: 'ceiling' }),
    I('wall_lamp', 'أبليك حائط', 'lighting', 'walllamp', 0.2, 0.15, 0.25, '#f3e3c3', 35, { mount: 'wall', elev: 1.7 }),
    I('led_strip', 'شريط إضاءة LED', 'lighting', 'shelf', 1.0, 0.02, 0.02, '#fff6d5', 20, { mount: 'wall', elev: 2.3, em: true }),
    I('lantern', 'فانوس أرضي', 'lighting', 'tablelamp', 0.25, 0.25, 0.5, '#c9a227', 55),

    // ------ الديكور والنباتات ------
    I('plant_small', 'نبتة صغيرة', 'decor', 'plant', 0.3, 0.3, 0.5, '#4f8a3a', 20, { c2: '#b5623a' }),
    I('plant_med', 'نبتة متوسطة', 'decor', 'plant', 0.5, 0.5, 1.1, '#4f8a3a', 45, { c2: '#e9e6df' }),
    I('plant_big', 'نبتة كبيرة (مونستيرا)', 'decor', 'plant', 0.8, 0.8, 1.7, '#2f5e2a', 90, { c2: '#3d3d3d' }),
    I('palm_indoor', 'نخلة داخلية', 'decor', 'palm', 1.0, 1.0, 1.9, '#4f8a3a', 120),
    I('painting_s', 'لوحة صغيرة', 'decor', 'painting', 0.5, 0.03, 0.4, '#6f8fa8', 40, { mount: 'wall', elev: 1.4, c2: '#c9a227' }),
    I('painting_m', 'لوحة متوسطة', 'decor', 'painting', 0.9, 0.03, 0.7, '#2d6a4f', 80, { mount: 'wall', elev: 1.3, c2: '#f2b134' }),
    I('painting_l', 'لوحة كبيرة', 'decor', 'painting', 1.4, 0.03, 1.0, '#2d3b55', 180, { mount: 'wall', elev: 1.1, c2: '#e9e6df' }),
    I('calligraphy', 'لوحة خط عربي', 'decor', 'painting', 1.0, 0.03, 0.6, '#1c1c1c', 150, { mount: 'wall', elev: 1.4, c2: '#c9a227' }),
    I('mirror_wall', 'مرآة حائط', 'decor', 'mirror', 0.6, 0.03, 0.9, '#c9a227', 70, { mount: 'wall', elev: 1.1 }),
    I('mirror_floor', 'مرآة أرضية طويلة', 'decor', 'mirror', 0.6, 0.05, 1.7, '#3d3d3d', 120, { mount: 'wall', elev: 0.05 }),
    I('clock', 'ساعة حائط', 'decor', 'clock', 0.4, 0.03, 0.4, '#3d3d3d', 30, { mount: 'wall', elev: 1.8 }),
    I('curtain', 'ستارة', 'decor', 'curtain', 1.6, 0.1, 2.5, '#d9cbb3', 90, { mount: 'wall', elev: 0.1 }),
    I('curtain_wide', 'ستارة عريضة', 'decor', 'curtain', 2.6, 0.1, 2.6, '#6f8fa8', 150, { mount: 'wall', elev: 0.1 }),
    I('vase', 'مزهرية أرضية', 'decor', 'vase', 0.3, 0.3, 0.7, '#2d3b55', 50),
    I('vase_small', 'مزهرية صغيرة', 'decor', 'vase', 0.15, 0.15, 0.3, '#c9a227', 20, { elev: 0.75 }),
    I('aquarium', 'حوض سمك', 'decor', 'aquarium', 1.0, 0.45, 1.3, '#3d3d3d', 400),
    I('partition', 'بارافان (فاصل)', 'decor', 'partition', 1.5, 0.15, 1.8, '#a8784f', 130),
    I('sculpture', 'تمثال ديكور', 'decor', 'column', 0.3, 0.3, 1.2, '#e7e4dd', 150),

    // ------ الأجهزة والإلكترونيات ------
    I('tv55', 'تلفزيون 55 بوصة', 'electronics', 'tv', 1.23, 0.05, 0.71, '#232323', 500, { mount: 'wall', elev: 1.0 }),
    I('tv65', 'تلفزيون 65 بوصة', 'electronics', 'tv', 1.45, 0.05, 0.83, '#232323', 800, { mount: 'wall', elev: 1.0 }),
    I('tv75', 'تلفزيون 75 بوصة', 'electronics', 'tv', 1.67, 0.05, 0.96, '#232323', 1300, { mount: 'wall', elev: 0.95 }),
    I('tv_floor', 'تلفزيون 50 بوصة على طاولة', 'electronics', 'tv', 1.12, 0.05, 0.65, '#232323', 400, { elev: 0.55 }),
    I('speaker', 'سماعة أرضية', 'electronics', 'speaker', 0.25, 0.3, 0.9, '#232323', 250),
    I('soundbar', 'ساوند بار', 'electronics', 'shelf', 0.9, 0.1, 0.07, '#232323', 180, { elev: 0.52 }),
    I('ac_split', 'مكيف سبليت', 'electronics', 'ac', 0.9, 0.22, 0.3, '#f3f3f1', 450, { mount: 'wall', elev: 2.3 }),
    I('ac_window', 'مكيف شباك', 'electronics', 'ac', 0.6, 0.6, 0.4, '#e9e6df', 300, { mount: 'wall', elev: 1.8 }),
    I('ac_floor', 'مكيف أرضي (فري ستاند)', 'electronics', 'cabinet', 0.5, 0.4, 1.8, '#f3f3f1', 700),
    I('radiator', 'مدفأة حائط', 'electronics', 'radiator', 0.8, 0.1, 0.6, '#f3f3f1', 150, { mount: 'wall', elev: 0.15 }),
    I('heater', 'دفاية كهربائية', 'electronics', 'cabinet', 0.5, 0.25, 0.6, '#3d3d3d', 60),
    I('console_game', 'جهاز ألعاب', 'electronics', 'microwave', 0.3, 0.25, 0.08, '#232323', 450, { elev: 0.5 }),
    I('projector', 'بروجكتور سقف', 'electronics', 'microwave', 0.35, 0.3, 0.12, '#f3f3f1', 600, { mount: 'ceiling' }),
    I('fan', 'مروحة سقف', 'electronics', 'chandelier', 1.2, 1.2, 0.4, '#5b3a29', 120, { mount: 'ceiling' }),

    // ------ عناصر إنشائية ------
    I('stairs', 'درج مستقيم', 'structure', 'stairs', 1.0, 3.2, 2.8, '#d9b68c', 2500),
    I('stairs_wide', 'درج عريض', 'structure', 'stairs', 1.4, 3.6, 2.8, '#e7e4dd', 3200),
    I('spiral', 'درج حلزوني', 'structure', 'spiralstairs', 1.6, 1.6, 2.8, '#5b3a29', 3000),
    I('column', 'عمود', 'structure', 'column', 0.4, 0.4, 2.8, '#e7e4dd', 300),
    I('column_sq', 'عمود مربع', 'structure', 'generic', 0.4, 0.4, 2.8, '#d9d6cf', 250),
    I('arch_deco', 'قوس ديكور', 'structure', 'partition', 2.0, 0.2, 2.6, '#e7e4dd', 500),
    I('beam', 'جسر خشبي سقف', 'structure', 'shelf', 4.0, 0.2, 0.25, '#5b3a29', 200, { mount: 'ceiling' }),
    I('wall_panel', 'كسوة حائط خشب', 'structure', 'shelf', 2.0, 0.03, 2.6, '#a8784f', 300, { mount: 'wall', elev: 0.05 }),
    I('platform', 'منصة مرتفعة', 'structure', 'generic', 3.0, 2.0, 0.25, '#d9b68c', 400),
    I('skylight', 'فتحة سقف (سكاي لايت)', 'structure', 'shelf', 1.2, 1.2, 0.05, '#9ad0ec', 900, { mount: 'ceiling' }),

    // ------ الحديقة والخارج ------
    I('tree', 'شجرة', 'outdoor', 'tree', 2.5, 2.5, 4.0, '#2f5e2a', 150),
    I('tree_small', 'شجرة صغيرة', 'outdoor', 'tree', 1.5, 1.5, 2.5, '#4f8a3a', 80),
    I('palm_tree', 'نخلة', 'outdoor', 'palm', 3.0, 3.0, 5.0, '#4f8a3a', 400),
    I('bush', 'شجيرة', 'outdoor', 'bush', 0.8, 0.8, 0.7, '#4f8a3a', 25),
    I('flowerbed', 'حوض زهور', 'outdoor', 'flowerbed', 1.5, 0.5, 0.3, '#6b4a2b', 60),
    I('lawn', 'قطعة عشب', 'outdoor', 'rug', 3.0, 3.0, 0.02, '#5f9e3f', 60, { c2: '#6db04a' }),
    I('patio_table', 'طاولة حديقة', 'outdoor', 'roundtable', 1.0, 1.0, 0.75, '#e9e6df', 150),
    I('patio_chair', 'كرسي حديقة', 'outdoor', 'chair', 0.5, 0.5, 0.85, '#e9e6df', 45),
    I('lounger', 'كرسي استلقاء (شيزلونج)', 'outdoor', 'bench', 0.7, 1.9, 0.35, '#d9cbb3', 120),
    I('umbrella', 'مظلة حديقة', 'outdoor', 'umbrella', 2.5, 2.5, 2.4, '#e2474b', 110),
    I('grill', 'شواية', 'outdoor', 'grill', 1.2, 0.6, 0.95, '#232323', 300),
    I('pool', 'مسبح', 'outdoor', 'pool', 6.0, 3.0, 0.1, '#4fb3e8', 15000),
    I('pool_small', 'مسبح صغير', 'outdoor', 'pool', 3.0, 2.0, 0.1, '#4fb3e8', 6000),
    I('fence', 'سور خشبي', 'outdoor', 'fence', 2.0, 0.05, 1.2, '#a8784f', 80),
    I('car', 'سيارة (للجراج)', 'outdoor', 'car', 1.8, 4.5, 1.5, '#b23a3a', 0),
    I('swing', 'أرجوحة', 'outdoor', 'swing', 1.8, 1.2, 2.2, '#3b6fb6', 220),
    I('slide', 'زحليقة', 'outdoor', 'slide', 0.6, 2.4, 1.5, '#f2b134', 180),
    I('outdoor_sofa', 'كنبة حديقة', 'outdoor', 'sofa', 1.8, 0.8, 0.7, '#8c8c8c', 400),
    I('fountain', 'نافورة', 'outdoor', 'column', 1.2, 1.2, 1.0, '#e7e4dd', 800),
    I('gazebo', 'برجولة', 'outdoor', 'tent', 3.0, 3.0, 2.6, '#a8784f', 1500),

    // ------ الرياضة والترفيه ------
    I('treadmill', 'جهاز مشي', 'sports', 'treadmill', 0.8, 1.8, 1.4, '#3d3d3d', 800),
    I('bike', 'دراجة ثابتة', 'sports', 'bike', 0.6, 1.2, 1.3, '#b23a3a', 400),
    I('weights', 'رف أوزان', 'sports', 'bookcase', 1.2, 0.5, 0.9, '#3d3d3d', 350),
    I('yoga_mat', 'سجادة يوغا', 'sports', 'rug', 0.6, 1.8, 0.01, '#6a3d9a', 25),
    I('pingpong', 'طاولة تنس', 'sports', 'pingpong', 1.5, 2.7, 0.76, '#2d6a4f', 350),
    I('billiard', 'طاولة بلياردو', 'sports', 'billiard', 1.4, 2.5, 0.8, '#2d6a4f', 1500),
    I('piano', 'بيانو', 'sports', 'piano', 1.5, 0.6, 1.2, '#232323', 2000),
    I('grand_piano', 'بيانو كبير', 'sports', 'grandpiano', 1.5, 2.0, 1.0, '#232323', 9000),
    I('gaming_chair', 'كرسي قيمنق', 'sports', 'officechair', 0.7, 0.7, 1.3, '#b23a3a', 250),
    I('foosball', 'طاولة بيبي فوت', 'sports', 'billiard', 0.8, 1.4, 0.9, '#3b6fb6', 300),
    I('punching_bag', 'كيس ملاكمة', 'sports', 'column', 0.35, 0.35, 1.2, '#b23a3a', 120, { elev: 0.8, mount: 'ceiling' }),
  ];

  // أشكال مركبة تعتمد على غيرها
  BUILD.sofaL = function (w, d, h, c, c2) {
    const a = BUILD.sofa(w, 0.95, h, c, c2).map(p => ({ ...p, p: [p.p[0], p.p[1], p.p[2] - d / 2 + 0.475] }));
    const b = BUILD.sofa(d - 0.95, 0.95, h, c, c2).map(p => ({ ...p, p: [p.p[2] * -1 + w / 2 - 0.475, p.p[1], p.p[0] + 0.475], s: p.g === 'box' ? [p.s[2], p.s[1], p.s[0]] : p.s }));
    return a.concat(b);
  };
  BUILD.rugRound = (w, d, h, c) => [cyl(0, 0.006, 0, w / 2, 0.012, c), cyl(0, 0.013, 0, w / 2 - 0.15, 0.002, shade(c, 25))];
  BUILD.dresserMirror = (w, d, h, c) => [...BUILD.drawers(w, d, 0.75, c), box(0, 0.75 + (h - 0.75) / 2, -d / 2 + 0.03, w * 0.6, h - 0.8, 0.03, COL.gold), box(0, 0.75 + (h - 0.75) / 2, -d / 2 + 0.05, w * 0.6 - 0.05, h - 0.85, 0.005, '#cfe3ea', { metal: true })];
  BUILD.deskL = (w, d, h, c) => [...BUILD.desk(w, 0.7, h, c).map(p => ({ ...p, p: [p.p[0], p.p[1], p.p[2] - d / 2 + 0.35] })), box(w / 2 - 0.35, h - 0.02, 0.35, 0.7, 0.04, d - 0.7, c), box(w / 2 - 0.35, (h - 0.04) / 2, d / 2 - 0.03, 0.66, h - 0.04, 0.04, shade(c, -15))];

  const BY_ID = {}; ITEMS.forEach(it => { BY_ID[it.id] = it; });

  function register(def) { // قطعة مخصصة من المستخدم (تُحفظ مع المشروع)
    if (!def || !def.id) return null; def = Object.assign({ cat: 'custom', kind: 'generic', mount: 'floor', elev: 0, price: 0, custom: true }, def);
    if (!BUILD[def.kind]) def.kind = 'generic'; if (!BY_ID[def.id]) ITEMS.push(def); BY_ID[def.id] = def; return def;
  }
  global.CATALOG = { CATEGORIES, ITEMS, BY_ID, BUILD, COL, shade, register };
})(window);
