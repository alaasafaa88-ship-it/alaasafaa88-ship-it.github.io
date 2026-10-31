/* نموذج المشروع: الطوابق، الغرف، الجدران، الفتحات (أبواب/نوافذ)، العناصر، الإعدادات + تراجع/إعادة + حفظ ونسخ سابقة */
(function (global) {
  'use strict';

  const ROOM_TYPES = [
    { id: 'living', n: 'غرفة معيشة', floor: 'parquet', wall: '#f5f1e8' },
    { id: 'majlis', n: 'مجلس', floor: 'marble_beige', wall: '#f3e3c3' },
    { id: 'bedroom', n: 'غرفة نوم', floor: 'parquet_light', wall: '#e8e2d6' },
    { id: 'master', n: 'غرفة نوم رئيسية', floor: 'parquet', wall: '#dbe7f0' },
    { id: 'kids', n: 'غرفة أطفال', floor: 'carpet_beige', wall: '#d8e6d0' },
    { id: 'kitchen', n: 'مطبخ', floor: 'tile_white', wall: '#ffffff' },
    { id: 'dining', n: 'غرفة طعام', floor: 'marble', wall: '#e8e2d6' },
    { id: 'bathroom', n: 'حمام', floor: 'tile_grey', wall: '#dbe7f0' },
    { id: 'office', n: 'مكتب', floor: 'parquet_dark', wall: '#cfd8dc' },
    { id: 'hall', n: 'ممر / مدخل', floor: 'marble', wall: '#f5f1e8' },
    { id: 'laundry', n: 'غرفة غسيل', floor: 'tile_white', wall: '#ffffff' },
    { id: 'storage', n: 'مخزن', floor: 'concrete', wall: '#d9d2c5' },
    { id: 'gym', n: 'صالة رياضة', floor: 'vinyl', wall: '#cfd8dc' },
    { id: 'garage', n: 'جراج', floor: 'concrete', wall: '#9aa5ad' },
    { id: 'balcony', n: 'بلكونة / تراس', floor: 'paving', wall: '#e8e2d6' },
    { id: 'garden', n: 'حديقة', floor: 'grass', wall: '#e8e2d6' },
    { id: 'other', n: 'أخرى', floor: 'tile_beige', wall: '#f5f1e8' },
  ];

  const OPENING_TYPES = [
    { id: 'door', n: 'باب عادي', w: 0.9, h: 2.1, sill: 0, price: 250 },
    { id: 'double_door', n: 'باب مزدوج', w: 1.6, h: 2.1, sill: 0, price: 600 },
    { id: 'sliding_door', n: 'باب منزلق زجاجي', w: 1.8, h: 2.1, sill: 0, price: 900 },
    { id: 'arch', n: 'قوس (فتحة بدون باب)', w: 1.2, h: 2.2, sill: 0, price: 150 },
    { id: 'main_door', n: 'باب رئيسي', w: 1.2, h: 2.3, sill: 0, price: 1200 },
    { id: 'window', n: 'نافذة', w: 1.2, h: 1.2, sill: 0.9, price: 300 },
    { id: 'window_small', n: 'نافذة صغيرة', w: 0.6, h: 0.6, sill: 1.5, price: 150 },
    { id: 'window_wide', n: 'نافذة عريضة', w: 2.4, h: 1.4, sill: 0.8, price: 700 },
    { id: 'window_floor', n: 'نافذة أرضية (زجاج كامل)', w: 2.0, h: 2.3, sill: 0.05, price: 1100 },
  ];

  const FINISHES = [
    { id: '', n: 'لون فقط' }, { id: 'wood', n: 'خشب فاتح' }, { id: 'darkwood', n: 'خشب داكن' }, { id: 'marble', n: 'رخام' },
    { id: 'stone', n: 'حجر' }, { id: 'fabric', n: 'قماش' }, { id: 'metal', n: 'معدن' }, { id: 'glass', n: 'زجاج' }, { id: 'concrete', n: 'خرسانة' },
  ];

  let seq = 1;
  const uid = p => (p || 'o') + (Date.now().toString(36)) + (seth++).toString(36);
  let seth = 1; // عدّاد مستقل حتى لا يتكرر المعرّف داخل نفس الملّي ثانية
  const fl = o => o && o.lvl ? o.lvl : 0; // lvl = رقم الطابق (floor على الغرفة = مادة الأرضية)
  const floorName = i => i === 0 ? 'الدور الأرضي' : i === 1 ? 'الدور الأول' : i === 2 ? 'الدور الثاني' : i === 3 ? 'الدور الثالث' : 'الدور ' + i;

  function blank(name) {
    return {
      version: 2, name: name || 'مشروع جديد', created: Date.now(), updated: Date.now(),
      settings: { wallHeight: 2.8, wallThickness: 0.2, currency: '$', showCeiling: false, exteriorColor: '#e6dfd2', slab: 0.3 },
      floors: [{ id: 'f0', n: floorName(0) }], currentFloor: 0,
      rooms: [], walls: [], openings: [], items: [], customDefs: []
    };
  }

  class Project {
    constructor(data) { this.data = data || blank(); this.undo = []; this.redo = []; this.listeners = []; }
    get d() { return this.data; }
    on(fn) { this.listeners.push(fn); }
    emit(kind) { this.data.updated = Date.now(); this.listeners.forEach(fn => fn(kind)); }
    snapshot() { this.undo.push(JSON.stringify(this.data)); if (this.undo.length > 60) this.undo.shift(); this.redo = []; }
    doUndo() { if (!this.undo.length) return false; this.redo.push(JSON.stringify(this.data)); this.data = JSON.parse(this.undo.pop()); this.emit('undo'); return true; }
    doRedo() { if (!this.redo.length) return false; this.undo.push(JSON.stringify(this.data)); this.data = JSON.parse(this.redo.pop()); this.emit('redo'); return true; }
    load(data) {
      this.data = Object.assign(blank(), data); this.data.settings = Object.assign(blank().settings, data.settings || {});
      if (!Array.isArray(this.data.customDefs)) this.data.customDefs = []; this.data.customDefs.forEach(d => CATALOG.register(d));
      if (!Array.isArray(this.data.floors) || !this.data.floors.length) this.data.floors = [{ id: 'f0', n: floorName(0) }];
      ['rooms', 'walls', 'openings', 'items'].forEach(k => this.data[k].forEach(o => { if (!o.lvl) o.lvl = 0; }));
      this.data.currentFloor = Math.max(0, Math.min(this.data.floors.length - 1, this.data.currentFloor || 0));
      this.undo = []; this.redo = []; this.emit('load');
    }
    addCustomDef(def) { def.id = def.id || uid('custom_'); CATALOG.register(def); this.data.customDefs.push(def); return def; }

    // ---- الطوابق ----
    get cur() { return this.data.currentFloor || 0; }
    get vis() { const f = this.cur, d = this.data; return { rooms: d.rooms.filter(o => fl(o) === f), walls: d.walls.filter(o => fl(o) === f), openings: d.openings.filter(o => fl(o) === f), items: d.items.filter(o => fl(o) === f) }; }
    onFloor(f) { const d = this.data; return { rooms: d.rooms.filter(o => fl(o) === f), walls: d.walls.filter(o => fl(o) === f), openings: d.openings.filter(o => fl(o) === f), items: d.items.filter(o => fl(o) === f) }; }
    setFloor(i) { this.data.currentFloor = Math.max(0, Math.min(this.data.floors.length - 1, i)); }
    addFloor(name) { const i = this.data.floors.length; this.data.floors.push({ id: uid('f'), n: name || floorName(i) }); return i; }
    removeFloor(i) {
      if (this.data.floors.length <= 1) return false; const d = this.data;
      ['rooms', 'walls', 'openings', 'items'].forEach(k => { d[k] = d[k].filter(o => fl(o) !== i); d[k].forEach(o => { if (fl(o) > i) o.lvl = fl(o) - 1; }); });
      d.floors.splice(i, 1); d.floors.forEach((f, k) => { if (/^الدور/.test(f.n)) f.n = floorName(k); }); this.setFloor(Math.min(i, d.floors.length - 1)); return true;
    }
    duplicateFloor(src, name) {
      const i = this.addFloor(name); const S = this.onFloor(src); const wallMap = {};
      S.rooms.forEach(r => this.data.rooms.push(Object.assign({}, r, { id: uid('r'), lvl: i })));
      S.walls.forEach(w => { const nw = Object.assign({}, w, { id: uid('w'), lvl: i }); wallMap[w.id] = nw.id; this.data.walls.push(nw); });
      S.openings.forEach(o => { if (wallMap[o.wallId]) this.data.openings.push(Object.assign({}, o, { id: uid('o'), wallId: wallMap[o.wallId], lvl: i })); });
      S.items.forEach(it => this.data.items.push(Object.assign({}, it, { id: uid('i'), lvl: i })));
      return i;
    }

    // ---- الجدران ----
    addWall(x1, y1, x2, y2, opts) {
      opts = opts || {}; const floor = opts.lvl !== undefined ? opts.lvl : this.cur;
      const len = Math.hypot(x2 - x1, y2 - y1); if (len < 0.05) return null;
      const dup = this.data.walls.find(w => fl(w) === floor && ((near(w.x1, x1) && near(w.y1, y1) && near(w.x2, x2) && near(w.y2, y2)) || (near(w.x1, x2) && near(w.y1, y2) && near(w.x2, x1) && near(w.y2, y1))));
      if (dup) return dup;
      const w = Object.assign({ id: uid('w'), x1, y1, x2, y2, t: this.data.settings.wallThickness, h: this.data.settings.wallHeight, color: null }, opts, { lvl: floor });
      this.data.walls.push(w); return w;
    }
    wallLength(w) { return Math.hypot(w.x2 - w.x1, w.y2 - w.y1); }
    removeWall(id) { this.data.walls = this.data.walls.filter(w => w.id !== id); this.data.openings = this.data.openings.filter(o => o.wallId !== id); }

    // ---- الغرف ----
    addRoom(x, y, w, h, type, opts) {
      opts = opts || {}; const floor = opts.lvl !== undefined ? opts.lvl : this.cur;
      const rt = ROOM_TYPES.find(r => r.id === type) || ROOM_TYPES[0];
      const n = this.data.rooms.filter(r => r.type === rt.id && fl(r) === floor).length;
      const room = Object.assign({ id: uid('r'), name: rt.n + (n ? ' ' + (n + 1) : ''), type: rt.id, x, y, w, h, floor: rt.floor, wall: rt.wall, ceiling: '#ffffff' }, opts, { lvl: floor });
      delete room.noWalls; this.data.rooms.push(room);
      if (!opts.noWalls) { const o = { lvl: floor }; this.addWall(x, y, x + w, y, o); this.addWall(x + w, y, x + w, y + h, o); this.addWall(x + w, y + h, x, y + h, o); this.addWall(x, y + h, x, y, o); }
      return room;
    }
    removeRoom(id) { this.data.rooms = this.data.rooms.filter(r => r.id !== id); }
    roomAt(x, y, floor) { const f = floor === undefined ? this.cur : floor; return this.data.rooms.filter(r => fl(r) === f && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h).sort((a, b) => a.w * a.h - b.w * b.h)[0] || null; }
    roomWalls(room) { // الجدران الملاصقة لحدود الغرفة في طابقها
      const eps = 0.15;
      return this.data.walls.filter(w => {
        if (fl(w) !== fl(room)) return false;
        const onEdge = (x, y) => (Math.abs(x - room.x) < eps || Math.abs(x - room.x - room.w) < eps) && y >= room.y - eps && y <= room.y + room.h + eps || (Math.abs(y - room.y) < eps || Math.abs(y - room.y - room.h) < eps) && x >= room.x - eps && x <= room.x + room.w + eps;
        return onEdge(w.x1, w.y1) && onEdge(w.x2, w.y2) && onEdge((w.x1 + w.x2) / 2, (w.y1 + w.y2) / 2);
      });
    }
    roomItems(room) { return this.data.items.filter(i => fl(i) === fl(room) && i.x > room.x && i.x < room.x + room.w && i.y > room.y && i.y < room.y + room.h); }

    // ---- الفتحات ----
    addOpening(type, wallId, t, opts) {
      const ot = OPENING_TYPES.find(o => o.id === type) || OPENING_TYPES[0];
      const wall = this.data.walls.find(w => w.id === wallId); if (!wall) return null;
      const L = this.wallLength(wall); const half = ot.w / 2 / L;
      t = Math.max(half + 0.02, Math.min(1 - half - 0.02, t));
      const o = Object.assign({ id: uid('o'), type: ot.id, wallId, t, w: ot.w, h: ot.h, sill: ot.sill, flip: false, swing: 1 }, opts || {}, { lvl: fl(wall) });
      this.data.openings.push(o); return o;
    }
    openingPos(o) { const w = this.data.walls.find(x => x.id === o.wallId); if (!w) return null; return { x: w.x1 + (w.x2 - w.x1) * o.t, y: w.y1 + (w.y2 - w.y1) * o.t, wall: w, angle: Math.atan2(w.y2 - w.y1, w.x2 - w.x1) }; }
    isDoor(o) { return !o.type.startsWith('window'); }

    // ---- العناصر ----
    addItem(defId, x, y, rot, opts) {
      opts = opts || {}; const def = CATALOG.BY_ID[defId]; if (!def) return null; const floor = opts.lvl !== undefined ? opts.lvl : this.cur;
      const it = Object.assign({ id: uid('i'), defId, x, y, rot: rot || 0, w: def.w, d: def.d, h: def.h, c: def.c, c2: def.c2 || null, elev: def.elev || 0, finish: def.finish || '' }, opts, { lvl: floor });
      this.data.items.push(it); return it;
    }
    removeItem(id) { this.data.items = this.data.items.filter(i => i.id !== id); }
    find(id) { const d = this.data; return d.items.find(i => i.id === id) || d.walls.find(w => w.id === id) || d.rooms.find(r => r.id === id) || d.openings.find(o => o.id === id) || null; }
    kindOf(obj) { if (!obj) return null; if (obj.defId) return 'item'; if (obj.wallId) return 'opening'; if (obj.x1 !== undefined) return 'wall'; return 'room'; }
    remove(id) { const o = this.find(id); if (!o) return; const k = this.kindOf(o); if (k === 'item') this.removeItem(id); else if (k === 'wall') this.removeWall(id); else if (k === 'room') this.removeRoom(id); else this.data.openings = this.data.openings.filter(x => x.id !== id); }

    // ---- حسابات ----
    bounds(floor) {
      const xs = [], ys = []; const pick = arr => floor === undefined ? arr : arr.filter(o => fl(o) === floor);
      pick(this.data.walls).forEach(w => { xs.push(w.x1, w.x2); ys.push(w.y1, w.y2); });
      pick(this.data.rooms).forEach(r => { xs.push(r.x, r.x + r.w); ys.push(r.y, r.y + r.h); });
      pick(this.data.items).forEach(i => { xs.push(i.x - i.w, i.x + i.w); ys.push(i.y - i.d, i.y + i.d); });
      if (!xs.length) return floor !== undefined && floor > 0 && this.data.rooms.length ? this.bounds() : { x: 0, y: 0, w: 10, h: 8 };
      const x = Math.min(...xs), y = Math.min(...ys); return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
    }
    totalArea() { return this.data.rooms.reduce((s, r) => s + r.w * r.h, 0); }
    stats() {
      const d = this.data; const s = d.settings;
      const area = this.totalArea();
      const wallLen = d.walls.reduce((a, w) => a + this.wallLength(w), 0);
      const wallArea = d.walls.reduce((a, w) => a + this.wallLength(w) * (w.h || s.wallHeight), 0);
      const furniture = d.items.reduce((a, i) => a + ((CATALOG.BY_ID[i.defId] || {}).price || 0), 0);
      const flooring = d.rooms.reduce((a, r) => a + r.w * r.h * (MATERIALS.byId(r.floor).price || 20), 0);
      const paint = wallArea * 2 * 4; // 4$ للمتر المربع، وجهان
      const walls = wallLen * 120; // 120$ لكل متر طولي بناء
      const slabs = d.rooms.filter(r => fl(r) > 0).reduce((a, r) => a + r.w * r.h * 90, 0); // بلاطة خرسانية للأدوار العليا
      const openings = d.openings.reduce((a, o) => a + ((OPENING_TYPES.find(t => t.id === o.type) || {}).price || 0), 0);
      return { area, wallLen, wallArea, furniture, flooring, paint, walls, slabs, openings, total: furniture + flooring + paint + walls + slabs + openings, rooms: d.rooms.length, floors: d.floors.length, items: d.items.length, doors: d.openings.filter(o => this.isDoor(o)).length, windows: d.openings.filter(o => !this.isDoor(o)).length };
    }
  }

  function near(a, b) { return Math.abs(a - b) < 0.02; }

  // ---- التخزين المحلي ----
  const KEY = 'omran_projects'; const HKEY = 'omran_history'; const HMAX = 6;
  const Store = {
    list() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } },
    save(project, thumb) {
      const list = Store.list(); const data = project.data;
      if (!data.pid) data.pid = uid('p');
      const entry = { pid: data.pid, name: data.name, updated: Date.now(), thumb: thumb || null, data };
      const i = list.findIndex(p => p.pid === data.pid); if (i >= 0) list[i] = entry; else list.unshift(entry);
      try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { console.warn(e); return false; }
    },
    get(pid) { return Store.list().find(p => p.pid === pid) || null; },
    remove(pid) { localStorage.setItem(KEY, JSON.stringify(Store.list().filter(p => p.pid !== pid))); },
    // النسخ السابقة: تعالج شكوى "ضاع عملي / تراجعت تعديلاتي" — آخر HMAX نسخ بغض النظر عن المشروع
    history() { try { return JSON.parse(localStorage.getItem(HKEY) || '[]'); } catch (e) { return []; } },
    pushHistory(data, reason) { const h = Store.history(); const last = h[0]; const json = JSON.stringify(data); if (last && last.json === json) return false; h.unshift({ t: Date.now(), name: data.name, reason: reason || 'auto', items: (data.items || []).length, rooms: (data.rooms || []).length, json }); while (h.length > HMAX) h.pop(); try { localStorage.setItem(HKEY, JSON.stringify(h)); return true; } catch (e) { return false; } },
  };

  global.STATE = { Project, Store, blank, uid, fl, floorName, ROOM_TYPES, OPENING_TYPES, FINISHES, roomType: id => ROOM_TYPES.find(r => r.id === id) || ROOM_TYPES[ROOM_TYPES.length - 1], openingType: id => OPENING_TYPES.find(o => o.id === id) || OPENING_TYPES[0] };
})(window);
