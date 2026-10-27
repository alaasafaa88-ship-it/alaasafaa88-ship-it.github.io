/* المصمّم الذكي — تأثيث تلقائي، توليد مخططات، اقتراح ألوان، تقدير تكلفة، مساعد محادثة (يعمل محلياً بدون إنترنت) */
(function (global) {
  'use strict';

  const STYLES = [
    { id: 'modern', n: 'مودرن', wall: '#f5f1e8', floor: 'parquet', accent: '#2d3b55', wood: '#3d3d3d', fabric: '#5c6b7a', desc: 'خطوط نظيفة، ألوان محايدة مع لمسة كحلية.' },
    { id: 'classic', n: 'كلاسيك', wall: '#f3e3c3', floor: 'marble_beige', accent: '#c9a227', wood: '#5b3a29', fabric: '#6b2f2f', desc: 'فخامة الخشب الداكن والذهبي والرخام.' },
    { id: 'scandi', n: 'إسكندنافي', wall: '#ffffff', floor: 'parquet_light', accent: '#9bb7cf', wood: '#d9b68c', fabric: '#cfd8dc', desc: 'خشب فاتح، أبيض، بساطة ودفء.' },
    { id: 'arabic', n: 'عربي تراثي', wall: '#f3e3c3', floor: 'marble_beige', accent: '#8b2e2e', wood: '#5b3a29', fabric: '#8b2e2e', desc: 'جلسات أرضية، نقوش، ذهبي وعنابي.' },
    { id: 'minimal', n: 'مينيمال', wall: '#ffffff', floor: 'concrete', accent: '#3d3d3d', wood: '#e9e6df', fabric: '#9aa5ad', desc: 'أقل هو أكثر: رمادي، أبيض، فراغ.' },
    { id: 'industrial', n: 'صناعي', wall: '#9aa5ad', floor: 'concrete', accent: '#b5623a', wood: '#5b3a29', fabric: '#3d3d3d', desc: 'خرسانة، معدن، جلد بني.' },
    { id: 'boho', n: 'بوهيمي', wall: '#e8e2d6', floor: 'parquet', accent: '#c98a6a', wood: '#a8784f', fabric: '#d98c5f', desc: 'ألوان ترابية، نباتات، أنسجة.' },
    { id: 'luxury', n: 'فاخر', wall: '#2d3b55', floor: 'marble', accent: '#c9a227', wood: '#1c1c1c', fabric: '#2d6a4f', desc: 'كحلي عميق، ذهبي، مخمل، رخام.' },
    { id: 'coastal', n: 'ساحلي', wall: '#dbe7f0', floor: 'parquet_light', accent: '#3b6fb6', wood: '#d9b68c', fabric: '#9bb7cf', desc: 'أزرق وأبيض ورمال.' },
    { id: 'kids_fun', n: 'مرح للأطفال', wall: '#d8e6d0', floor: 'carpet_beige', accent: '#f2b134', wood: '#f3f3f1', fabric: '#3b6fb6', desc: 'ألوان زاهية وآمنة.' },
  ];
  const style = id => STYLES.find(s => s.id === id) || STYLES[0];

  // ---------- أدوات الوضع داخل الغرفة ----------
  // الجوانب: top (الجدار العلوي y=room.y)، bottom، left، right. العنصر يُسند بظهره للجدار ووجهه للداخل.
  function sideInfo(room, side, T) {
    const inset = T / 2 + 0.02;
    switch (side) {
      case 'top': return { rot: 0, len: room.w, place: (along, d) => [room.x + along, room.y + inset + d / 2], axis: 'x' };
      case 'bottom': return { rot: 180, len: room.w, place: (along, d) => [room.x + along, room.y + room.h - inset - d / 2], axis: 'x' };
      case 'left': return { rot: 270, len: room.h, place: (along, d) => [room.x + inset + d / 2, room.y + along], axis: 'y' };
      case 'right': return { rot: 90, len: room.h, place: (along, d) => [room.x + room.w - inset - d / 2, room.y + along], axis: 'y' };
    }
  }
  // مواضع الأبواب على جوانب الغرفة → نطاقات محجوبة
  function blocked(P, room) {
    const out = { top: [], bottom: [], left: [], right: [] }; const eps = 0.3;
    P.d.openings.forEach(o => {
      const p = P.openingPos(o); if (!p) return; const margin = P.isDoor(o) ? o.w / 2 + 0.6 : o.w / 2 + 0.05; const isDoor = P.isDoor(o);
      if (p.x < room.x - eps || p.x > room.x + room.w + eps || p.y < room.y - eps || p.y > room.y + room.h + eps) return;
      const push = (side, along) => out[side].push({ a: along - margin, b: along + margin, door: isDoor, win: !isDoor, c: along, w: o.w });
      if (Math.abs(p.y - room.y) < eps) push('top', p.x - room.x); else if (Math.abs(p.y - room.y - room.h) < eps) push('bottom', p.x - room.x);
      else if (Math.abs(p.x - room.x) < eps) push('left', p.y - room.y); else if (Math.abs(p.x - room.x - room.w) < eps) push('right', p.y - room.y);
    });
    return out;
  }
  function free(spans, a, b, onlyDoors) { return !spans.some(s => (!onlyDoors || s.door) && !(b < s.a || a > s.b)); }
  function windowsOn(spans) { return spans.filter(s => s.win); }

  class Furnisher {
    constructor(P, room, st) { this.P = P; this.room = room; this.st = st; this.T = P.d.settings.wallThickness; this.blk = blocked(P, room); this.used = { top: [], bottom: [], left: [], right: [] }; this.placed = []; }
    // ترتيب الجوانب: الأقل أبواباً أولاً ثم الأطول
    sides(preferLong) { const r = this.room; const arr = ['top', 'bottom', 'left', 'right']; return arr.sort((a, b) => { const da = this.blk[a].filter(s => s.door).length - this.blk[b].filter(s => s.door).length; if (da) return da; const la = sideInfo(r, a, this.T).len, lb = sideInfo(r, b, this.T).len; return preferLong ? lb - la : la - lb; }); }
    canPlace(side, a, b, allowWindow) { const spans = this.blk[side].concat(this.used[side]); return a >= 0.05 && b <= sideInfo(this.room, side, this.T).len - 0.05 && !spans.some(s => (s.door || s.win && !allowWindow || s.used) && !(b < s.a || a > s.b)); }
    // وضع عنصر بمحاذاة جدار؛ along = مركز العنصر على طول الجدار (null = وسط)
    wall(defId, side, along, opts) {
      opts = opts || {}; const def = CATALOG.BY_ID[defId]; if (!def) return null; const info = sideInfo(this.room, side, this.T); const w = opts.w || def.w, d = opts.d || def.d;
      if (along === null || along === undefined) along = info.len / 2;
      if (!opts.force && !this.canPlace(side, along - w / 2, along + w / 2, opts.allowWindow || def.mount === 'wall' && def.h < 1.2 || def.h < 1.0)) return null;
      const [x, y] = info.place(along, d + (opts.gap || 0) * 2); const it = this.P.addItem(defId, x, y, info.rot, Object.assign({ w, d }, opts.props || {}));
      if (opts.color) it.c = opts.color; if (opts.color2) it.c2 = opts.color2; if (opts.elev !== undefined) it.elev = opts.elev;
      if (!opts.noReserve) this.used[side].push({ a: along - w / 2 - 0.05, b: along + w / 2 + 0.05, used: true }); this.placed.push(it); return it;
    }
    // ملء جدار بسلسلة عناصر متتالية بدءاً من البداية
    row(side, list, start, opts) { opts = opts || {}; let along = start === undefined ? 0.05 : start; const info = sideInfo(this.room, side, this.T); const out = []; for (const e of list) { const def = CATALOG.BY_ID[e.id]; const w = e.w || def.w; if (along + w > info.len - 0.05) break; const it = this.wall(e.id, side, along + w / 2, Object.assign({}, opts, e)); if (it) { out.push(it); along += w; } else along += 0.1; } return out; }
    // وضع في موقع حر (نسبي للغرفة)
    at(defId, rx, ry, rot, opts) { opts = opts || {}; const it = this.P.addItem(defId, this.room.x + rx, this.room.y + ry, rot || 0, opts.props || {}); if (!it) return null; if (opts.color) it.c = opts.color; if (opts.color2) it.c2 = opts.color2; if (opts.elev !== undefined) it.elev = opts.elev; this.placed.push(it); return it; }
    center(defId, rot, opts) { return this.at(defId, this.room.w / 2, this.room.h / 2, rot, opts); }
    // أمام عنصر مسند للجدار (بمسافة gap من وجهه)
    front(ref, defId, gap, opts) { const r = ref.rot * Math.PI / 180; const dist = ref.d / 2 + gap + (CATALOG.BY_ID[defId].d / 2); const x = ref.x - Math.sin(r) * dist, y = ref.y + Math.cos(r) * dist; opts = opts || {}; const it = this.P.addItem(defId, x, y, opts.rot !== undefined ? opts.rot : ref.rot, opts.props || {}); if (opts.color) it.c = opts.color; if (opts.color2) it.c2 = opts.color2; if (opts.elev !== undefined) it.elev = opts.elev; this.placed.push(it); return it; }
    beside(ref, defId, dir, gap, opts) { const r = ref.rot * Math.PI / 180; const def = CATALOG.BY_ID[defId]; const dist = dir * (ref.w / 2 + gap + def.w / 2); const x = ref.x + Math.cos(r) * dist, y = ref.y + Math.sin(r) * dist; const back = (ref.d - def.d) / 2; opts = opts || {}; const it = this.P.addItem(defId, x + Math.sin(r) * back, y - Math.cos(r) * back, ref.rot, opts.props || {}); if (opts.color) it.c = opts.color; this.placed.push(it); return it; }
    ceiling(defId, rx, ry) { return this.at(defId, rx === undefined ? this.room.w / 2 : rx, ry === undefined ? this.room.h / 2 : ry, 0); }
    corner(defId, which, opts) { const def = CATALOG.BY_ID[defId]; const m = this.T / 2 + def.w / 2 + 0.08; const r = this.room; const pts = { tl: [m, m], tr: [r.w - m, m], bl: [m, r.h - m], br: [r.w - m, r.h - m] }; const [x, y] = pts[which]; return this.at(defId, x, y, 0, opts); }
    freeCorner() { const r = this.room; const near = (side, v) => this.blk[side].concat(this.used[side]).some(s => v >= s.a - 0.3 && v <= s.b + 0.3); const cs = [['tl', ['top', 0.3], ['left', 0.3]], ['tr', ['top', r.w - 0.3], ['right', 0.3]], ['bl', ['bottom', 0.3], ['left', r.h - 0.3]], ['br', ['bottom', r.w - 0.3], ['right', r.h - 0.3]]]; for (const c of cs) if (!near(c[1][0], c[1][1]) && !near(c[2][0], c[2][1])) return c[0]; return 'br'; }
    windows() { const out = []; ['top', 'bottom', 'left', 'right'].forEach(s => windowsOn(this.blk[s]).forEach(w => out.push({ side: s, c: w.c, w: w.w }))); return out; }
    curtains() { const st = this.st; this.windows().forEach(w => this.wall(w.w > 1.6 ? 'curtain_wide' : 'curtain', w.side, w.c, { force: true, noReserve: true, color: st.fabric, props: { w: w.w + 0.6 } })); }
    lights() { const r = this.room; const A = r.w * r.h; if (A > 20) { this.ceiling('chandelier'); this.ceiling('spot', r.w * 0.25, r.h * 0.25); this.ceiling('spot', r.w * 0.75, r.h * 0.25); this.ceiling('spot', r.w * 0.25, r.h * 0.75); this.ceiling('spot', r.w * 0.75, r.h * 0.75); } else if (A > 9) this.ceiling('pendant'); else this.ceiling('ceiling_light'); }
  }

  // ---------- قوالب الغرف ----------
  const ROOM_PLANS = {
    living(F) {
      const r = F.room, st = F.st; const sides = F.sides(true); const big = r.w * r.h > 18;
      const sofaId = big && r.w > 3.5 && r.h > 3.5 ? 'sofaL' : r.w * r.h > 12 ? 'sofa3' : 'sofa2';
      const sofa = F.wall(sofaId, sides[0], null, { color: st.fabric, allowWindow: true }) || F.wall('sofa2', sides[1], null, { color: st.fabric, allowWindow: true });
      if (sofa) {
        const sSide = sideOf(sofa, r);
        if (sofa.defId === 'sofaL') { // حجز الجدار الذي يمتد عليه جناح الكنبة
          const wing = { top: 'right', bottom: 'left', left: 'top', right: 'bottom' }[sSide]; const wl = sideInfo(r, wing, F.T).len; const nearStart = (wing === 'right' && sSide === 'top') || (wing === 'top' && sSide === 'left'); F.used[wing].push(nearStart ? { a: 0, b: sofa.d + 0.3, used: true } : { a: wl - sofa.d - 0.3, b: wl, used: true });
        }
        const rug = F.front(sofa, 'rug_large', 0.1, { color: CATALOG.shade(st.wall, -25), color2: st.wall }); rug.w = Math.min(r.w - 1, 3); rug.d = Math.min(r.h - 1.5, 2.2);
        F.front(sofa, 'coffee_table', 0.45, { color: st.wood });
        if (big && sofa.defId !== 'sofaL') { F.beside(sofa, 'armchair', 1, 0.5, { color: st.accent }); }
        const opp = opposite(sSide); const oppLen = sideInfo(r, opp, F.T).len;
        let tv = null; for (const along of [oppLen / 2, oppLen / 2 - 1.3, oppLen / 2 + 1.3, oppLen / 2 - 2, oppLen / 2 + 2]) { tv = F.wall('tv_stand', opp, along, { color: st.wood }); if (tv) break; }
        if (!tv) for (const sd of sides.slice(1)) { if (sd === sSide) continue; tv = F.wall('tv_unit', sd, null, { color: st.wood }); if (tv) break; }
      }
      F.corner('plant_big', F.freeCorner()); F.corner('floor_lamp', F.freeCorner(), { color: st.accent });
      F.wall('painting_l', sides[2], null, { force: true, noReserve: true, color: st.accent, color2: st.wood });
      F.curtains(); F.lights();
    },
    majlis(F) {
      const r = F.room, st = F.st; const T = F.T; const inset = T / 2 + 0.05;
      ['top', 'bottom', 'left', 'right'].forEach(side => { const info = sideInfo(r, side, T); const spans = F.blk[side]; let a = inset + (side === 'left' || side === 'right' ? 0.9 : 0); const end = info.len - (side === 'left' || side === 'right' ? 0.9 : 0); while (a + 0.9 <= end) { const seg = Math.min(3.0, end - a); const id = seg >= 2.9 ? 'floorsofa_long3' : seg >= 2.3 ? 'floorsofa_long' : 'floorsofa_single'; const def = CATALOG.BY_ID[id]; if (free(spans, a, a + def.w)) { F.wall(id, side, a + def.w / 2, { color: st.fabric, color2: st.accent, force: true, allowWindow: true }); a += def.w; } else a += 0.3; } });
      const rug = F.center('majlis_carpet', 0, { color: st.fabric, color2: st.accent }); rug.w = Math.max(2, r.w - 2.2); rug.d = Math.max(2, r.h - 2.2);
      const n = Math.max(1, Math.round(Math.max(r.w, r.h) / 3)); for (let i = 0; i < n; i++) { const t = r.w >= r.h ? F.at('majlis_table', r.w / 2 + (i - (n - 1) / 2) * 1.8, r.h / 2, 0, { color: st.wood }) : F.at('majlis_table', r.w / 2, r.h / 2 + (i - (n - 1) / 2) * 1.8, 90, { color: st.wood }); if (i === 0) { const d = F.at('dallah_set', t.x - r.x, t.y - r.y, 0); d.elev = 0.4; } }
      F.wall('calligraphy', F.sides(true)[0], null, { force: true, noReserve: true, color: '#1c1c1c', color2: st.accent, elev: 1.5 });
      F.corner('mabkhara', F.freeCorner()); F.corner('plant_med', F.freeCorner());
      F.curtains(); F.ceiling('chandelier_big'); if (r.w * r.h > 25) { F.ceiling('chandelier', r.w * 0.25, r.h / 2); F.ceiling('chandelier', r.w * 0.75, r.h / 2); }
    },
    bedroom(F, master) {
      const r = F.room, st = F.st; const sides = F.sides(true);
      const bedId = master ? 'bed_king' : r.w * r.h >= 12 ? 'bed_double' : 'bed_single';
      const bed = F.wall(bedId, sides[0], null, { color: st.fabric, color2: st.wood }) || F.wall('bed_single', sides[1], null, { color: st.fabric });
      if (bed) {
        F.beside(bed, 'nightstand', 1, 0.08, { color: st.wood }); if (bedId !== 'bed_single') F.beside(bed, 'nightstand', -1, 0.08, { color: st.wood });
        const lamp = F.beside(bed, 'table_lamp', 1, 0.08); lamp.x = bed.x + Math.cos(bed.rot * Math.PI / 180) * (bed.w / 2 + 0.33); lamp.y = bed.y + Math.sin(bed.rot * Math.PI / 180) * (bed.w / 2 + 0.33); const back = (bed.d - 0.4) / 2; lamp.x += Math.sin(bed.rot * Math.PI / 180) * back; lamp.y -= Math.cos(bed.rot * Math.PI / 180) * back; lamp.elev = 0.55;
        const rug = F.front(bed, 'rug_bedroom', -0.6, { color: CATALOG.shade(st.wall, -20), color2: st.wall }); rug.w = Math.min(bed.w + 1.2, r.w - 0.6);
        F.wall('painting_m', sideOf(bed, r), (bed.rot === 0 || bed.rot === 180 ? bed.x - r.x : bed.y - r.y), { force: true, noReserve: true, color: st.accent, color2: st.wood, elev: 1.3 });
        if (master && r.h > 3.6) F.front(bed, 'bench_bed', 0.1, { color: st.accent });
      }
      const opp = opposite(bed ? sideOf(bed, r) : sides[0]);
      F.wall(master ? 'wardrobe4' : r.w * r.h > 12 ? 'wardrobe3' : 'wardrobe2', opp, null, { color: st.wood }) || F.wall('wardrobe2', sides[2], null, { color: st.wood }) || F.wall('wardrobe2', sides[3], null, { color: st.wood });
      F.wall('dresser', sides[2], null, { color: st.wood }) || F.wall('chest', sides[3], null, { color: st.wood });
      if (master) F.wall('tv55', opp, null, { force: true, noReserve: true, elev: 1.3 });
      F.corner('plant_med', F.freeCorner()); F.curtains(); F.lights(); F.wall('ac_split', sides[3], null, { force: true, noReserve: true, elev: 2.3 });
    },
    master(F) { ROOM_PLANS.bedroom(F, true); },
    kids(F) {
      const r = F.room, st = F.st; const sides = F.sides(true);
      const bed = F.wall(r.w * r.h > 12 ? 'bunk' : 'bed_kids', sides[0], null, { color: st.accent }); if (bed) F.beside(bed, 'nightstand', 1, 0.08, { color: '#f3f3f1' });
      const desk = F.wall('kids_desk', sides[1], null, { color: st.accent }); if (desk) F.front(desk, 'kids_chair', 0.05, { rot: desk.rot + 180, color: st.fabric });
      F.wall('kids_wardrobe', sides[2], null, { color: st.fabric }) || F.wall('kids_wardrobe', sides[3], null); F.wall('kids_shelf', sides[3], null, { color: '#f3f3f1' });
      F.corner('toybox', F.freeCorner(), { color: st.fabric, color2: st.accent }); const rug = F.center('kids_rug', 0, { color: st.accent });
      F.wall('painting_m', sides[0], null, { force: true, noReserve: true, color: st.accent, color2: '#ffffff', elev: 1.4 }); F.curtains(); F.ceiling('pendant');
    },
    kitchen(F) {
      const r = F.room, st = F.st; const sides = F.sides(true); const cab = st.id === 'luxury' || st.id === 'modern' ? '#3d3d3d' : st.id === 'classic' || st.id === 'arabic' ? '#a8784f' : '#f3f3f1'; const top = st.id === 'luxury' ? '#1c1c1c' : '#e7e4dd';
      const main = sides[0]; const info = sideInfo(r, main, F.T); const seq = [];
      const L = info.len - 0.1; let rem = L;
      const push = (id, w) => { if (rem >= w) { seq.push({ id, w }); rem -= w; } };
      push('fridge', 0.7); push('counter60', 0.6); push('sink_counter', 0.9); push('counter60', 0.6); push('stove', 0.6); push('counter60', 0.6); push('dishwasher', 0.6); while (rem >= 0.6) push(rem >= 0.9 ? 'counter90' : 'counter60', rem >= 0.9 ? 0.9 : 0.6);
      const placed = F.row(main, seq.map(s => Object.assign({ color: cab, color2: top }, s, { color: s.id === 'fridge' || s.id === 'stove' || s.id === 'dishwasher' ? CATALOG.BY_ID[s.id].c : cab })), 0.05, {});
      placed.forEach(it => { const def = CATALOG.BY_ID[it.defId]; const along = info.axis === 'x' ? it.x - r.x : it.y - r.y; const underWindow = !free(F.blk[main].filter(s => s.win), along - it.w / 2, along + it.w / 2); if (!underWindow && (def.kind === 'counter' || def.kind === 'sinkcounter' || def.kind === 'dishwasher')) { F.wall(it.w >= 0.9 ? 'upper90' : 'upper60', main, along, { force: true, noReserve: true, color: cab, elev: 1.5 }); } if (it.defId === 'stove') { F.wall('hood', main, info.axis === 'x' ? it.x - r.x : it.y - r.y, { force: true, noReserve: true, elev: 1.55 }); } });
      if (r.w >= 3.4 && r.h >= 3.4) { const isl = F.center('island', info.rot, { color: cab, color2: top }); for (let i = 0; i < 3; i++) F.front(isl, 'bar_stool', 0.1, { rot: isl.rot + 180 }).x += (i - 1) * 0.6 * (isl.rot % 180 === 0 ? 1 : 0); }
      else if (r.w * r.h > 10) { const second = sides[1]; F.row(second, [{ id: 'counter90', color: cab, color2: top }, { id: 'counter60', color: cab, color2: top }, { id: 'tall_cabinet', color: cab }], 0.05, {}); }
      F.wall('microwave', sides[2], null, { force: true, noReserve: true, elev: 0.9 });
      for (let i = 0; i < Math.max(2, Math.round(r.w * r.h / 4)); i++) F.ceiling('spot', r.w * (0.25 + 0.5 * (i % 2)), r.h * (0.3 + 0.4 * Math.floor(i / 2) % 2));
      F.ceiling('pendant_glass', r.w / 2, r.h / 2);
    },
    bathroom(F) {
      const r = F.room, st = F.st; const sides = F.sides(true); const long = Math.max(r.w, r.h), short = Math.min(r.w, r.h);
      const lSide = r.w >= r.h ? 'top' : 'left'; // الجدار الطويل
      if (long >= 2.3 && short >= 1.7) { const info = sideInfo(r, lSide, F.T); F.wall('bathtub', lSide, 1.0, { props: { rot: 0 } }); }
      else F.wall(short >= 1.6 ? 'shower' : 'shower', F.sides(false)[0], 0.5 + 0.05, {});
      const basinSide = sides.find(s => s !== lSide) || sides[1]; const basin = F.wall(r.w * r.h > 6 ? 'washbasin_double' : 'washbasin', basinSide, null, { color: st.wood, color2: '#e7e4dd' }) || F.wall('pedestal', basinSide, null, {});
      if (basin) { F.wall('bath_mirror', sideOf(basin, r), (basin.rot % 180 === 0 ? basin.x - r.x : basin.y - r.y), { force: true, noReserve: true, elev: 1.1 }); }
      F.wall('toilet', basinSide, null, {}) || F.wall('toilet', sides[2], null, {}) || F.wall('toilet', sides[3], null, {});
      if (r.w * r.h > 6) F.wall('washer', sides[3], null, {}); F.wall('towel_rack', sides[2], null, { force: true, noReserve: true, elev: 0.8 });
      F.wall('water_heater', sides[2], 0.4, { force: true, noReserve: true, elev: 1.9 }); F.ceiling('ceiling_light');
    },
    dining(F) {
      const r = F.room, st = F.st; const A = r.w * r.h; const id = A > 18 ? 'dining8' : A > 11 ? 'dining6' : 'dining4'; const rot = r.w >= r.h ? 0 : 90;
      const t = F.center(id, rot, { color: st.wood }); const n = id === 'dining8' ? 4 : id === 'dining6' ? 3 : 2; const chair = 'dining_chair_fab';
      for (let i = 0; i < n; i++) { const off = (i - (n - 1) / 2) * (t.w / n); const dx = rot === 0 ? off : 0, dy = rot === 0 ? 0 : off; const dd = t.d / 2 + 0.3; const pos = [[dx + (rot ? -dd : 0), dy + (rot ? 0 : -dd), rot ? 270 : 0], [dx + (rot ? dd : 0), dy + (rot ? 0 : dd), rot ? 90 : 180]]; pos.forEach(([ox, oy, cr]) => F.at(chair, r.w / 2 + ox, r.h / 2 + oy, cr, { color: st.fabric })); }
      if (A > 14) { const dd = t.w / 2 + 0.35; const pos = rot === 0 ? [[-dd, 0, 270], [dd, 0, 90]] : [[0, -dd, 0], [0, dd, 180]]; pos.forEach(([ox, oy, cr]) => F.at(chair, r.w / 2 + ox, r.h / 2 + oy, cr, { color: st.fabric })); }
      F.wall('sideboard', F.sides(true)[0], null, { color: st.wood }); if (A > 14) F.wall('china_cabinet', F.sides(true)[1], null, { color: st.wood });
      F.wall('painting_m', F.sides(true)[0], null, { force: true, noReserve: true, color: st.accent, color2: st.wood, elev: 1.4 }); F.corner('plant_med', F.freeCorner()); F.curtains(); F.ceiling(A > 16 ? 'chandelier' : 'pendant');
    },
    office(F) {
      const r = F.room, st = F.st; const sides = F.sides(true); const A = r.w * r.h;
      const desk = F.wall(A > 14 ? 'desk_exec' : 'desk', sides[0], null, { color: st.wood, allowWindow: true }); if (desk) { const ch = F.front(desk, 'office_chair', 0.1, { rot: desk.rot + 180, color: st.accent }); F.at('pc', desk.x - r.x, desk.y - r.y, desk.rot, { elev: 0.75 }); F.at('vase_small', desk.x - r.x + 0.5, desk.y - r.y, 0, { elev: 0.75 }); if (A > 12) { F.front(desk, 'visitor_chair', 1.0, { color: st.fabric }).x -= 0.35; F.front(desk, 'visitor_chair', 1.0, { color: st.fabric }).x += 0.35; } }
      F.wall(A > 12 ? 'bookcase_big' : 'bookcase', sides[1], null, { color: st.wood }) || F.wall('bookcase', sides[2], null, { color: st.wood }); F.wall('filing', sides[2], null, {}); F.wall('whiteboard', sides[3], null, { force: true, noReserve: true, elev: 1.0 });
      F.corner('plant_big', F.freeCorner()); F.corner('floor_lamp', F.freeCorner()); F.curtains(); F.lights();
    },
    hall(F) { const r = F.room, st = F.st; const s = F.sides(true); F.wall('console', s[0], null, { color: st.wood }); F.wall('mirror_wall', s[0], null, { force: true, noReserve: true, color: st.accent, elev: 1.1 }); F.wall('shoe_rack', s[1], null, { color: st.wood }); F.corner('coat_rack', F.freeCorner()); F.corner('plant_med', F.freeCorner()); const rug = F.center('rug_large', r.w >= r.h ? 0 : 90, { color: st.fabric }); rug.w = Math.max(0.8, Math.max(r.w, r.h) * 0.6); rug.d = Math.max(0.6, Math.min(r.w, r.h) * 0.5); for (let i = 0; i < Math.max(1, Math.round(Math.max(r.w, r.h) / 2.5)); i++) F.ceiling('spot', r.w >= r.h ? r.w * (i + 0.5) / Math.round(Math.max(1, r.w / 2.5)) : r.w / 2, r.w >= r.h ? r.h / 2 : r.h * (i + 0.5) / Math.round(Math.max(1, r.h / 2.5))); },
    laundry(F) { const s = F.sides(true); F.row(s[0], [{ id: 'washer' }, { id: 'dryer' }, { id: 'counter60', color: '#f3f3f1' }], 0.05, {}); F.wall('upper90', s[0], 0.95, { force: true, noReserve: true, elev: 1.5 }); F.wall('bath_cabinet', s[1], null, {}); F.wall('laundry_basket', s[2], null, {}); F.ceiling('ceiling_light'); },
    storage(F) { const s = F.sides(true); F.wall('shelf_unit', s[0], null, {}); F.wall('shelf_unit', s[1], null, {}); F.wall('chest_storage', s[2], null, {}); F.ceiling('ceiling_light'); },
    gym(F) { const r = F.room; const s = F.sides(true); F.wall('treadmill', s[0], null, {}); F.wall('bike', s[0], null, {}); F.wall('weights', s[1], null, {}); F.wall('mirror_floor', s[2], null, { force: true, noReserve: true, props: { w: Math.min(3, sideInfo(r, s[2], F.T).len - 0.4) }, elev: 0.05 }); F.center('yoga_mat', 0); F.wall('speaker', s[3], null, {}); F.wall('ac_split', s[3], null, { force: true, noReserve: true, elev: 2.3 }); F.lights(); },
    garage(F) { const r = F.room; const rot = r.w >= r.h ? 90 : 0; F.center('car', rot); F.wall('shelf_unit', F.sides(true)[0], null, {}); F.wall('shelf_unit', F.sides(true)[0], null, {}); F.ceiling('ceiling_light'); },
    balcony(F) { const r = F.room, st = F.st; F.center('patio_table', 0); F.at('patio_chair', r.w / 2 - 0.75, r.h / 2, 90); F.at('patio_chair', r.w / 2 + 0.75, r.h / 2, 270); F.corner('plant_big', F.freeCorner()); F.corner('plant_med', F.freeCorner()); if (r.w * r.h > 8) F.wall('lounger', F.sides(true)[0], null, { color: st.fabric }); },
    garden(F) { const r = F.room; const A = r.w * r.h; F.at('lawn', r.w / 2, r.h / 2, 0).w = r.w - 0.6; F.P.d.items[F.P.d.items.length - 1].d = r.h - 0.6; F.corner('tree', 'tl'); F.corner('tree_small', 'br'); F.corner('palm_tree', 'tr'); F.wall('flowerbed', 'bottom', null, { force: true }); F.wall('flowerbed', 'left', null, { force: true }); if (A > 40) { F.at('pool_small', r.w * 0.65, r.h * 0.6, r.w >= r.h ? 0 : 90); F.at('lounger', r.w * 0.65 - 2.2, r.h * 0.6, 0); F.at('lounger', r.w * 0.65 - 1.4, r.h * 0.6, 0); } F.at('patio_table', r.w * 0.3, r.h * 0.4, 0); F.at('patio_chair', r.w * 0.3 - 0.75, r.h * 0.4, 90); F.at('patio_chair', r.w * 0.3 + 0.75, r.h * 0.4, 270); F.at('umbrella', r.w * 0.3, r.h * 0.4, 0); F.at('grill', r.w * 0.3, r.h * 0.75, 0); F.at('bush', r.w * 0.5, r.h - 0.6, 0); F.at('bush', r.w * 0.7, r.h - 0.6, 0); },
    other(F) { F.wall('cube_storage', F.sides(true)[0], null, {}); F.ceiling('ceiling_light'); },
  };
  function sideOf(it, r) { const t = [[it.y - r.y, 'top'], [r.y + r.h - it.y, 'bottom'], [it.x - r.x, 'left'], [r.x + r.w - it.x, 'right']].sort((a, b) => a[0] - b[0]); return t[0][1]; }
  function opposite(s) { return { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[s]; }

  function furnish(P, room, styleId, keepExisting) {
    const st = style(styleId);
    if (!keepExisting) P.d.items = P.d.items.filter(i => !(i.x > room.x && i.x < room.x + room.w && i.y > room.y && i.y < room.y + room.h));
    const F = new Furnisher(P, room, st); const fn = ROOM_PLANS[room.type] || ROOM_PLANS.other; fn(F);
    // قصّ العناصر الخارجة عن الغرفة قليلاً
    F.placed.forEach(it => { const def = CATALOG.BY_ID[it.defId]; if (def.mount !== 'floor') return; const hw = (it.rot % 180 === 0 ? it.w : it.d) / 2, hd = (it.rot % 180 === 0 ? it.d : it.w) / 2; it.x = Math.max(room.x + hw + 0.05, Math.min(room.x + room.w - hw - 0.05, it.x)); it.y = Math.max(room.y + hd + 0.05, Math.min(room.y + room.h - hd - 0.05, it.y)); });
    return F.placed.length;
  }
  function applyStyle(P, styleId, roomsOnly) {
    const st = style(styleId);
    P.d.rooms.forEach(r => { const wet = r.type === 'bathroom' || r.type === 'kitchen' || r.type === 'laundry'; const outside = r.type === 'garden' || r.type === 'balcony' || r.type === 'garage'; if (outside) return; r.wall = wet ? '#ffffff' : st.wall; r.floor = r.type === 'bathroom' ? 'tile_grey' : r.type === 'kitchen' || r.type === 'laundry' ? 'tile_white' : r.type === 'kids' ? 'carpet_beige' : st.floor; });
    if (!roomsOnly) P.d.items.forEach(it => { const def = CATALOG.BY_ID[it.defId]; if (!def) return; if (['sofa', 'armchair', 'sofaL', 'floorsofa', 'chair', 'officechair', 'bed'].includes(def.kind)) it.c = st.fabric; else if (['table', 'roundtable', 'coffeetable', 'cabinet', 'drawers', 'bookcase', 'desk', 'deskL', 'tvstand', 'dresserMirror', 'bench'].includes(def.kind) && def.cat !== 'kitchen' && def.cat !== 'bathroom') it.c = st.wood; else if (def.kind === 'curtain' || def.kind === 'rug') it.c = def.kind === 'rug' ? CATALOG.shade(st.wall, -25) : st.fabric; });
  }

  // ---------- توليد مخطط كامل ----------
  function generatePlan(P, o) {
    o = Object.assign({ width: 15, depth: 12, bedrooms: 2, bathrooms: 2, majlis: true, dining: true, office: false, kids: 0, garden: false, style: 'modern', name: 'منزل مولّد' }, o || {});
    const d = STATE.blank(o.name); P.load(d); const S = P.d.settings; const T = S.wallThickness;
    const W = o.width, D = o.depth; const corridorH = 1.6;
    const front = [{ type: 'living', wt: 1.4 }]; if (o.majlis) front.unshift({ type: 'majlis', wt: 1.5 }); front.push({ type: 'kitchen', wt: 1.0 }); if (o.dining) front.push({ type: 'dining', wt: 0.9 });
    const back = []; for (let i = 0; i < o.bedrooms; i++) back.push({ type: i === 0 ? 'master' : 'bedroom', wt: i === 0 ? 1.3 : 1.0 }); for (let i = 0; i < o.kids; i++) back.push({ type: 'kids', wt: 0.9 }); if (o.office) back.push({ type: 'office', wt: 0.8 }); for (let i = 0; i < o.bathrooms; i++) back.splice(Math.min(back.length, 1 + i * 2), 0, { type: 'bathroom', wt: 0.5 });
    const hasBack = back.length > 0; const D1 = hasBack ? Math.round((D - corridorH) * 0.48 * 10) / 10 : D; const D2 = hasBack ? D - corridorH - D1 : 0;
    const layRow = (list, y, h) => { const tot = list.reduce((s, e) => s + e.wt, 0); let x = 0; list.forEach((e, i) => { let w = Math.round(W * e.wt / tot * 10) / 10; if (i === list.length - 1) w = Math.round((W - x) * 10) / 10; const r = P.addRoom(x, y, w, h, e.type); e.room = r; x += w; }); };
    layRow(front, 0, D1); if (hasBack) { layRow(back, D1 + corridorH, D2); const hall = P.addRoom(0, D1, W, corridorH, 'hall', { noWalls: true }); hall.name = 'الممر'; P.addWall(0, D1, 0, D1 + corridorH); P.addWall(W, D1, W, D1 + corridorH); }
    // الأبواب: كل غرفة لها باب على الممر (أو على الغرفة المجاورة إذا لا يوجد ممر)
    const doorOn = (x1, y1, x2, y2, t, type) => { const w = P.d.walls.find(w => (near(w.x1, x1) && near(w.y1, y1) && near(w.x2, x2) && near(w.y2, y2)) || (near(w.x1, x2) && near(w.y1, y2) && near(w.x2, x1) && near(w.y2, y1))); if (!w) return null; const o = P.addOpening(type || 'door', w.id, t); return o; };
    const near = (a, b) => Math.abs(a - b) < 0.01;
    front.forEach((e, i) => { const r = e.room; if (hasBack) { const o = doorOn(r.x, r.y + r.h, r.x + r.w, r.y + r.h, 0.5, e.type === 'living' || e.type === 'majlis' ? 'double_door' : e.type === 'kitchen' ? 'arch' : 'door'); if (o) o.flip = true; } });
    back.forEach((e, i) => { const r = e.room; doorOn(r.x, r.y, r.x + r.w, r.y, 0.5, 'door'); });
    if (!hasBack) front.forEach((e, i) => { if (i > 0) { const r = e.room; doorOn(r.x, r.y, r.x, r.y + r.h, 0.5, 'door'); } });
    // الباب الرئيسي
    if (hasBack) { const o = doorOn(0, D1, 0, D1 + corridorH, 0.5, 'main_door'); if (o) o.flip = false; } else { const r = front[0].room; doorOn(r.x, r.y, r.x, r.y + r.h, 0.3, 'main_door'); }
    // النوافذ على الجدران الخارجية
    front.forEach(e => { const r = e.room; doorOn(r.x, 0, r.x + r.w, 0, 0.5, r.w >= 3.5 ? 'window_wide' : 'window'); });
    back.forEach(e => { const r = e.room; doorOn(r.x, D, r.x + r.w, D, 0.5, e.type === 'bathroom' ? 'window_small' : r.w >= 3.5 ? 'window_wide' : 'window'); });
    [front[0], front[front.length - 1]].forEach(e => { const r = e.room; if (r.w >= 3) { doorOn(r.x === 0 ? 0 : W, r.y, r.x === 0 ? 0 : W, r.y + r.h, 0.5, 'window'); } });
    if (hasBack && back.length) { [back[0], back[back.length - 1]].forEach(e => { const r = e.room; if (e.type !== 'bathroom') doorOn(r.x === 0 ? 0 : W, r.y, r.x === 0 ? 0 : W, r.y + r.h, 0.5, 'window'); }); }
    // الحديقة
    if (o.garden) { const g = P.addRoom(0, -5.5, W, 5.0, 'garden', { noWalls: true }); g.name = 'الحديقة'; P.addWall(0, -5.5, W, -5.5); P.addWall(0, -5.5, 0, -0.3); P.addWall(W, -5.5, W, -0.3); }
    applyStyle(P, o.style, true);
    P.d.rooms.forEach(r => furnish(P, r, o.style, true));
    P.d.name = o.name; P.emit('load'); return P;
  }

  // ---------- تقدير التكلفة ----------
  function estimate(P) {
    const s = P.stats(); const cur = P.d.settings.currency || '$';
    const rows = [['الأثاث والأجهزة (' + s.items + ' عنصر)', s.furniture], ['الأرضيات (' + s.area.toFixed(1) + ' م²)', s.flooring], ['بناء الجدران (' + s.wallLen.toFixed(1) + ' م طولي)', s.walls], ['الدهان (' + (s.wallArea * 2).toFixed(0) + ' م² وجهان)', s.paint], ['الأبواب والنوافذ (' + s.doors + ' باب، ' + s.windows + ' نافذة)', s.openings]];
    return { rows, total: s.total, cur, stats: s };
  }

  // ---------- نصائح ----------
  function tips(P) {
    const out = []; const d = P.d;
    d.rooms.forEach(r => {
      const A = r.w * r.h; const items = d.items.filter(i => i.x > r.x && i.x < r.x + r.w && i.y > r.y && i.y < r.y + r.h);
      const doors = d.openings.filter(o => P.isDoor(o) && P.roomWalls(r).some(w => w.id === o.wallId)); const wins = d.openings.filter(o => !P.isDoor(o) && P.roomWalls(r).some(w => w.id === o.wallId));
      if (!doors.length && r.type !== 'garden' && r.type !== 'hall' && r.type !== 'balcony') out.push(`🚪 «${r.name}» بدون باب — أضف باباً من أداة الأبواب.`);
      if (!wins.length && !['bathroom', 'hall', 'storage', 'garage', 'garden', 'balcony', 'laundry'].includes(r.type)) out.push(`🪟 «${r.name}» بدون نافذة — الإضاءة الطبيعية تحسّن الراحة وتقلل استهلاك الكهرباء.`);
      if ((r.type === 'bedroom' || r.type === 'master') && A < 9) out.push(`📏 «${r.name}» صغيرة (${A.toFixed(1)} م²) — يُنصح بـ 12 م² على الأقل لغرفة نوم مزدوجة.`);
      if (r.type === 'bathroom' && A < 3) out.push(`📏 «${r.name}» ضيّقة — الحد المريح 3.5 م².`);
      if (r.type === 'kitchen' && A < 6) out.push(`📏 المطبخ «${r.name}» صغير — المثلث الذهبي (ثلاجة/مغسلة/موقد) يحتاج 6 م² على الأقل.`);
      const furnArea = items.reduce((s, i) => { const def = CATALOG.BY_ID[i.defId]; return s + (def && def.mount === 'floor' && !['rug', 'rugRound', 'pool', 'cushion'].includes(def.kind) ? i.w * i.d : 0); }, 0);
      if (A > 0 && furnArea / A > 0.55) out.push(`📦 «${r.name}» مزدحمة (${Math.round(furnArea / A * 100)}% من الأرضية مشغولة) — اترك ممرات 80 سم على الأقل.`);
      if (A > 0 && items.length === 0) out.push(`🛋️ «${r.name}» فارغة — جرّب "تأثيث تلقائي" من المصمم الذكي.`);
      if (!items.some(i => (CATALOG.BY_ID[i.defId] || {}).cat === 'lighting') && r.type !== 'garden') out.push(`💡 «${r.name}» بدون إضاءة — أضف إضاءة سقف أو أباجورة.`);
    });
    if (!d.rooms.length) out.push('ابدأ برسم غرفة من أداة "غرفة" أو ولّد مخططاً كاملاً من المصمم الذكي.');
    if (d.rooms.length && !d.openings.some(o => o.type === 'main_door')) out.push('🏠 لا يوجد باب رئيسي — اختر نوع "باب رئيسي" وضعه على جدار خارجي.');
    return out.length ? out : ['✅ التصميم متوازن! جرّب تغيير النمط أو التجول في العرض ثلاثي الأبعاد.'];
  }

  // ---------- مساعد المحادثة ----------
  const ROOM_WORDS = { 'نوم': 'bedroom', 'رئيسية': 'master', 'ماستر': 'master', 'معيشة': 'living', 'صالة': 'living', 'جلوس': 'living', 'مجلس': 'majlis', 'ديوانية': 'majlis', 'مطبخ': 'kitchen', 'حمام': 'bathroom', 'دورة مياه': 'bathroom', 'طعام': 'dining', 'سفرة': 'dining', 'مكتب': 'office', 'أطفال': 'kids', 'اطفال': 'kids', 'ممر': 'hall', 'مدخل': 'hall', 'غسيل': 'laundry', 'مخزن': 'storage', 'رياضة': 'gym', 'جيم': 'gym', 'جراج': 'garage', 'كراج': 'garage', 'بلكونة': 'balcony', 'تراس': 'balcony', 'حديقة': 'garden' };
  const STYLE_WORDS = { 'مودرن': 'modern', 'عصري': 'modern', 'حديث': 'modern', 'كلاسيك': 'classic', 'كلاسيكي': 'classic', 'إسكندنافي': 'scandi', 'اسكندنافي': 'scandi', 'عربي': 'arabic', 'تراثي': 'arabic', 'مينيمال': 'minimal', 'بسيط': 'minimal', 'صناعي': 'industrial', 'بوهيمي': 'boho', 'بوهو': 'boho', 'فاخر': 'luxury', 'فخم': 'luxury', 'ساحلي': 'coastal', 'بحري': 'coastal', 'مرح': 'kids_fun' };
  function parseNum(text, words) { const m = text.match(new RegExp('(\\d+)\\s*(' + words.join('|') + ')')); return m ? parseInt(m[1]) : null; }

  function chat(P, text, ctx) {
    const t = text.trim(); const low = t.toLowerCase(); const resp = { text: '', actions: [] };
    let styleId = null; for (const k in STYLE_WORDS) if (t.includes(k)) { styleId = STYLE_WORDS[k]; break; }
    let roomType = null; for (const k in ROOM_WORDS) if (t.includes(k)) { roomType = ROOM_WORDS[k]; break; }
    const want = (...ws) => ws.some(w => t.includes(w));
    if (want('مساعدة', 'help', 'ماذا تستطيع', 'وش تقدر', 'ايش تقدر')) { resp.text = 'أستطيع:\n• «أثّث غرفة النوم بنمط مودرن» — تأثيث الغرفة المحددة أو المسماة\n• «صمّم لي منزل 3 غرف نوم وحمامين مع مجلس» — توليد مخطط كامل\n• «اقترح ألوان كلاسيك» — تطبيق لوحة ألوان\n• «كم التكلفة؟» — تقدير التكلفة\n• «نصائح» — تحليل التصميم\n• «أضف كنبة» — إضافة عنصر للغرفة المحددة'; return resp; }
    if (want('صمم', 'صمّم', 'ولّد', 'ولد', 'مخطط', 'منزل', 'بيت', 'شقة', 'فيلا') && !want('أثث', 'أثّث')) {
      const bed = parseNum(t, ['غرف نوم', 'غرفة نوم', 'غرف', 'نوم']) ?? (want('استوديو') ? 0 : 2); const bath = parseNum(t, ['حمام', 'حمامات', 'دورة', 'دورات']) ?? Math.max(1, Math.min(3, Math.ceil(bed / 2)));
      const kids = parseNum(t, ['أطفال', 'اطفال']) ?? 0; const area = parseNum(t, ['متر', 'م2', 'م²']); let W = 15, D = 12; if (area) { W = Math.round(Math.sqrt(area * 1.3) * 10) / 10; D = Math.round(area / W * 10) / 10; }
      const opts = { bedrooms: bed, bathrooms: bath, kids, majlis: want('مجلس', 'ديوانية') || want('فيلا'), dining: want('طعام', 'سفرة') || want('فيلا') || bed >= 3, office: want('مكتب'), garden: want('حديقة'), style: styleId || 'modern', width: W, depth: D, name: want('فيلا') ? 'فيلا' : want('شقة') ? 'شقة' : 'منزل' + ' ' + bed + ' غرف' };
      if (want('فيلا') && !area) { opts.width = 18; opts.depth = 14; }
      resp.actions.push({ type: 'generate', opts }); resp.text = `جاري توليد ${opts.name} بنمط ${style(opts.style).n}: ${bed} غرف نوم، ${bath} حمام${opts.majlis ? '، مجلس' : ''}${opts.dining ? '، غرفة طعام' : ''}${opts.office ? '، مكتب' : ''}${opts.garden ? '، حديقة' : ''}. يمكنك تعديل أي شيء بعد ذلك.`; return resp;
    }
    if (want('أثث', 'أثّث', 'اثث', 'فرش', 'فرّش', 'جهز', 'جهّز')) {
      let room = roomType ? P.d.rooms.find(r => r.type === roomType) : (ctx.selectedRoom || null);
      if (/(^|\s)(كل|جميع|كامل)(\s|$)/.test(t)) { resp.actions.push({ type: 'furnishAll', style: styleId || ctx.style }); resp.text = `جاري تأثيث جميع الغرف بنمط ${style(styleId || ctx.style).n}.`; return resp; }
      if (!room) { resp.text = roomType ? 'لم أجد غرفة من هذا النوع في المخطط. ارسمها أولاً أو حدّد غرفة.' : 'حدّد غرفة في المخطط (اضغط عليها) أو اذكر اسمها، مثال: «أثّث المطبخ».'; return resp; }
      resp.actions.push({ type: 'furnish', roomId: room.id, style: styleId || ctx.style }); resp.text = `تم تأثيث «${room.name}» بنمط ${style(styleId || ctx.style).n}. غيّر النمط أو حرّك القطع كما تحب.`; return resp;
    }
    if (want('لون', 'ألوان', 'الوان', 'نمط', 'ستايل', 'طلاء', 'دهان')) { const sid = styleId || ctx.style; resp.actions.push({ type: 'style', style: sid }); const st = style(sid); resp.text = `طبّقت لوحة «${st.n}»: جدران ${st.wall}، أرضية ${MATERIALS.byId(st.floor).n}، لون مميز ${st.accent}. ${st.desc}`; return resp; }
    if (want('تكلفة', 'كلفة', 'سعر', 'ميزانية', 'كم ي', 'بكم')) { const e = estimate(P); resp.text = 'تقدير التكلفة:\n' + e.rows.map(r => `• ${r[0]}: ${Math.round(r[1]).toLocaleString()} ${e.cur}`).join('\n') + `\n**الإجمالي: ${Math.round(e.total).toLocaleString()} ${e.cur}**\n(أسعار تقريبية، عدّل الأسعار من إعدادات العملة)`; return resp; }
    if (want('نصيحة', 'نصائح', 'حلل', 'حلّل', 'تقييم', 'رأيك', 'مشاكل')) { resp.text = tips(P).join('\n'); return resp; }
    if (want('أضف', 'اضف', 'ضع', 'حط', 'أريد', 'ابغى', 'ابي')) {
      const found = CATALOG.ITEMS.filter(i => t.includes(i.n) || i.n.split(' ').some(w => w.length > 3 && t.includes(w))).sort((a, b) => (t.includes(b.n) - t.includes(a.n)) || (a.n.length - b.n.length));
      if (found.length) { resp.actions.push({ type: 'add', defId: found[0].id }); resp.text = `أضفت «${found[0].n}» إلى المخطط. اسحبه إلى مكانه المناسب.`; } else resp.text = 'لم أتعرف على العنصر. جرّب اسم عنصر من الكتالوج مثل «كنبة»، «سرير مزدوج»، «ثلاجة».';
      return resp;
    }
    if (want('احذف', 'امسح', 'ازل', 'أزل')) { if (/(^|\s)(كل|جميع)(\s|$)/.test(t)) { resp.actions.push({ type: 'clearItems' }); resp.text = 'حذفت جميع الأثاث (الغرف والجدران باقية). تراجع بـ Ctrl+Z إذا غيرت رأيك.'; } else if (ctx.selectedId) { resp.actions.push({ type: 'remove', id: ctx.selectedId }); resp.text = 'حذفت العنصر المحدد.'; } else resp.text = 'حدّد عنصراً أولاً أو قل «احذف كل الأثاث».'; return resp; }
    if (want('مساحة', 'كم متر', 'الأبعاد')) { const s = P.stats(); resp.text = `المساحة الإجمالية: ${s.area.toFixed(1)} م² في ${s.rooms} غرفة.\n` + P.d.rooms.map(r => `• ${r.name}: ${r.w.toFixed(1)}×${r.h.toFixed(1)} = ${(r.w * r.h).toFixed(1)} م²`).join('\n'); return resp; }
    if (want('ثلاثي', '3d', 'عرض')) { resp.actions.push({ type: 'view3d' }); resp.text = 'فتحت العرض ثلاثي الأبعاد. اسحب للدوران، عجلة الماوس للتقريب، وزر «تجوّل» للمشي داخل المنزل.'; return resp; }
    if (want('مرحبا', 'هلا', 'السلام', 'اهلا', 'أهلا')) { resp.text = 'أهلاً بك! أنا المصمم الذكي. اكتب مثلاً: «صمّم لي شقة غرفتين نوم بنمط إسكندنافي» أو «أثّث المجلس بنمط عربي».'; return resp; }
    resp.text = 'لم أفهم الطلب تماماً. جرّب: «صمّم منزل 3 غرف»، «أثّث غرفة المعيشة مودرن»، «اقترح ألوان فاخرة»، «كم التكلفة؟»، «نصائح».'; return resp;
  }

  global.AI = { STYLES, style, furnish, applyStyle, generatePlan, estimate, tips, chat, ROOM_PLANS };
})(window);
