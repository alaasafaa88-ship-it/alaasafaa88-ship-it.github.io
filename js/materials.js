/* مواد الأرضيات ودهانات الجدران — أنسجة مولّدة برمجياً (بدون ملفات خارجية) */
(function (global) {
  'use strict';

  const FLOORS = [
    { id: 'parquet', n: 'باركيه خشبي', kind: 'planks', base: '#b98c5f', alt: '#a57a4e', price: 25 },
    { id: 'parquet_dark', n: 'باركيه داكن', kind: 'planks', base: '#6d4a30', alt: '#5a3b26', price: 30 },
    { id: 'parquet_light', n: 'باركيه فاتح', kind: 'planks', base: '#dcc3a0', alt: '#cbb08c', price: 28 },
    { id: 'herringbone', n: 'باركيه هيرنغبون', kind: 'herringbone', base: '#c19a6b', alt: '#a9825a', price: 40 },
    { id: 'tile_white', n: 'سيراميك أبيض', kind: 'tiles', base: '#eceae6', alt: '#dcdad5', price: 18 },
    { id: 'tile_grey', n: 'بورسلان رمادي', kind: 'tiles', base: '#b8b8b6', alt: '#a9a9a7', price: 22 },
    { id: 'tile_beige', n: 'سيراميك بيج', kind: 'tiles', base: '#d9cbb3', alt: '#cbbc9f', price: 18 },
    { id: 'tile_black', n: 'بورسلان أسود', kind: 'tiles', base: '#3a3a3a', alt: '#2c2c2c', price: 26 },
    { id: 'marble', n: 'رخام أبيض', kind: 'marble', base: '#efede8', alt: '#c9c6bf', price: 60 },
    { id: 'marble_black', n: 'رخام أسود', kind: 'marble', base: '#2b2b2e', alt: '#4a4a50', price: 70 },
    { id: 'marble_beige', n: 'رخام بيج (كريما)', kind: 'marble', base: '#e6d9c3', alt: '#c8b89b', price: 55 },
    { id: 'mosaic', n: 'موزاييك صغير', kind: 'mosaic', base: '#8fb8c9', alt: '#5e93a8', price: 35 },
    { id: 'carpet_beige', n: 'موكيت بيج', kind: 'carpet', base: '#d2c4ad', alt: '#c7b89f', price: 15 },
    { id: 'carpet_grey', n: 'موكيت رمادي', kind: 'carpet', base: '#8e8e8e', alt: '#828282', price: 15 },
    { id: 'carpet_blue', n: 'موكيت أزرق', kind: 'carpet', base: '#4d6b8c', alt: '#43607f', price: 16 },
    { id: 'concrete', n: 'خرسانة مصقولة', kind: 'concrete', base: '#a8a8a4', alt: '#9a9a96', price: 20 },
    { id: 'vinyl', n: 'فينيل خشبي', kind: 'planks', base: '#9b7656', alt: '#8c6a4c', price: 12 },
    { id: 'stone', n: 'حجر طبيعي', kind: 'stone', base: '#b7ad9d', alt: '#9d9385', price: 45 },
    { id: 'grass', n: 'عشب (خارجي)', kind: 'grass', base: '#5f9e3f', alt: '#4f8a33', price: 8 },
    { id: 'paving', n: 'بلاط خارجي (إنترلوك)', kind: 'tiles', base: '#b5a48f', alt: '#a0907b', price: 14 },
  ];

  const PAINTS = [
    { id: '#f5f1e8', n: 'أبيض كريمي' }, { id: '#ffffff', n: 'أبيض ناصع' }, { id: '#e8e2d6', n: 'بيج فاتح' },
    { id: '#d9d2c5', n: 'رملي' }, { id: '#cfd8dc', n: 'رمادي فاتح' }, { id: '#9aa5ad', n: 'رمادي متوسط' },
    { id: '#5c6670', n: 'رمادي داكن' }, { id: '#dbe7f0', n: 'أزرق سماوي' }, { id: '#9bb7cf', n: 'أزرق باستيل' },
    { id: '#2d3b55', n: 'كحلي' }, { id: '#d8e6d0', n: 'أخضر نعناعي' }, { id: '#7a9a7a', n: 'أخضر زيتوني' },
    { id: '#2d6a4f', n: 'أخضر غامق' }, { id: '#f6dfd3', n: 'وردي فاتح' }, { id: '#e5b8a5', n: 'بيج وردي' },
    { id: '#c98a6a', n: 'تيراكوتا' }, { id: '#f3e3c3', n: 'أصفر كريمي' }, { id: '#e3c27a', n: 'خردلي' },
    { id: '#8b2e2e', n: 'أحمر عنابي' }, { id: '#6a3d9a', n: 'بنفسجي' }, { id: '#a8784f', n: 'خشبي' },
    { id: '#3d3d3d', n: 'فحمي' }, { id: '#1c1c1c', n: 'أسود' },
  ];

  const cache = {};

  function shadeHex(hex, amt) { const n = parseInt(hex.slice(1), 16); const f = v => Math.max(0, Math.min(255, v + amt)); return '#' + ((f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).padStart(6, '0'); }
  function makeCanvas(size) { const c = document.createElement('canvas'); c.width = c.height = size; return c; }
  function rnd(seed) { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

  function drawTexture(mat, size) {
    const c = makeCanvas(size), ctx = c.getContext('2d'); const r = rnd(7);
    ctx.fillStyle = mat.base; ctx.fillRect(0, 0, size, size);
    const alt = mat.alt;
    switch (mat.kind) {
      case 'planks': { // ألواح أفقية — النسيج يمثل 1م × 1م
        const rows = 6, cols = 2; const ph = size / rows;
        for (let i = 0; i < rows; i++) {
          const off = (i % 2) * size / 2;
          for (let j = -1; j <= cols; j++) {
            const x = j * size / cols + off; ctx.fillStyle = r() > 0.5 ? mat.base : alt; ctx.fillRect(x, i * ph, size / cols, ph);
            ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2; ctx.strokeRect(x, i * ph, size / cols, ph);
            ctx.strokeStyle = 'rgba(255,255,255,0.08)'; for (let k = 0; k < 6; k++) { ctx.beginPath(); const y = i * ph + r() * ph; ctx.moveTo(x, y); ctx.lineTo(x + size / cols, y + (r() - 0.5) * 6); ctx.stroke(); }
          }
        }
        break;
      }
      case 'herringbone': { // نمط دوري بلا فواصل: شبكة (1,-1),(2,2) مدوّرة 45°
        const u = size / (4 * Math.SQRT2); const th = Math.PI / 4; ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        const col = (i, j) => { const h = ((i * 73856093) ^ (j * 19349663)) >>> 0; return (h % 3) === 0 ? alt : (h % 3) === 1 ? mat.base : shadeHex(mat.base, 10); };
        for (let i = -6; i <= 12; i++) for (let j = -3; j <= 6; j++) {
          ctx.save(); ctx.translate(i * Math.SQRT2 * u, j * 2 * Math.SQRT2 * u); ctx.rotate(th);
          ctx.fillStyle = col(i, j); ctx.fillRect(0, 0, 2 * u, u); ctx.strokeRect(0, 0, 2 * u, u);
          ctx.fillStyle = col(i + 50, j); ctx.fillRect(2 * u, 0, u, 2 * u); ctx.strokeRect(2 * u, 0, u, 2 * u);
          ctx.restore();
        }
        break;
      }
      case 'tiles': {
        const n = 2, t = size / n; // بلاطة 50 سم
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { ctx.fillStyle = (i + j) % 2 ? alt : mat.base; ctx.fillRect(i * t, j * t, t, t); }
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 3; for (let i = 0; i <= n; i++) { ctx.beginPath(); ctx.moveTo(i * t, 0); ctx.lineTo(i * t, size); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * t); ctx.lineTo(size, i * t); ctx.stroke(); }
        break;
      }
      case 'mosaic': {
        const n = 10, t = size / n;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { ctx.fillStyle = r() > 0.6 ? alt : mat.base; ctx.fillRect(i * t + 1, j * t + 1, t - 2, t - 2); }
        break;
      }
      case 'marble': {
        ctx.strokeStyle = alt; ctx.globalAlpha = 0.35;
        for (let k = 0; k < 14; k++) { ctx.lineWidth = 1 + r() * 2; ctx.beginPath(); let x = r() * size, y = r() * size; ctx.moveTo(x, y); for (let s = 0; s < 8; s++) { x += (r() - 0.5) * size / 3; y += (r() - 0.5) * size / 3; ctx.lineTo(x, y); } ctx.stroke(); }
        ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, size, size);
        break;
      }
      case 'carpet': {
        for (let k = 0; k < 4000; k++) { ctx.fillStyle = r() > 0.5 ? alt : mat.base; ctx.globalAlpha = 0.5; ctx.fillRect(r() * size, r() * size, 2, 2); }
        ctx.globalAlpha = 1; break;
      }
      case 'concrete': {
        for (let k = 0; k < 2500; k++) { ctx.fillStyle = r() > 0.5 ? alt : '#b4b4b0'; ctx.globalAlpha = 0.35; ctx.fillRect(r() * size, r() * size, 3, 3); }
        ctx.globalAlpha = 1; break;
      }
      case 'stone': {
        for (let k = 0; k < 18; k++) { ctx.fillStyle = r() > 0.5 ? alt : mat.base; ctx.beginPath(); const cx = r() * size, cy = r() * size, rad = 30 + r() * 60; ctx.moveTo(cx + rad, cy); for (let a = 0; a < 7; a++) { const ang = a / 7 * Math.PI * 2; ctx.lineTo(cx + Math.cos(ang) * rad * (0.7 + r() * 0.5), cy + Math.sin(ang) * rad * (0.7 + r() * 0.5)); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2; ctx.stroke(); }
        break;
      }
      case 'grass': {
        for (let k = 0; k < 6000; k++) { ctx.strokeStyle = r() > 0.5 ? alt : '#72b352'; ctx.beginPath(); const x = r() * size, y = r() * size; ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 4, y - 4 - r() * 6); ctx.stroke(); }
        break;
      }
    }
    return c;
  }

  function texture(id, size) {
    size = size || 256; const key = id + ':' + size;
    if (!cache[key]) { const mat = FLOORS.find(f => f.id === id) || FLOORS[0]; cache[key] = drawTexture(mat, size); }
    return cache[key];
  }

  function pattern2d(ctx, id) { const key = 'p2:' + id; if (!cache[key]) cache[key] = ctx.createPattern(texture(id, 128), 'repeat'); return cache[key]; }

  global.MATERIALS = { FLOORS, PAINTS, texture, pattern2d, byId: id => FLOORS.find(f => f.id === id) || FLOORS[0] };
})(window);
