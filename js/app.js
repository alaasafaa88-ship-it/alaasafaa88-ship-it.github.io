/* المتحكم الرئيسي — ربط الواجهة بالمحرر والعرض ثلاثي الأبعاد والمصمم الذكي */
(function () {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
  const AUTOSAVE = 'omran_autosave'; const CLIP = 'omran_clipboard';
  const P = new STATE.Project();
  const app = { keepPlacing: false, style: 'modern', selected: null, mode: '2d', view3d: null, dirty3d: true };
  let editor;

  // ---------- أدوات مساعدة ----------
  function toast(msg, ms) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(t._t); t._t = setTimeout(() => { t.hidden = true; }, ms || 2200); }
  function openModal(id) { $(id).hidden = false; }
  function closeModals() { $$('.modal').forEach(m => { m.hidden = true; }); }
  // اسم ملف ASCII آمن: بعض المتصفحات تُسقط الأسماء العربية وتسمي الملف "download"
  function fileName(ext) { const d = new Date(); const pad = n => String(n).padStart(2, '0'); return `omran-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.${ext}`; }
  function download(name, dataUrl) {
    const a = document.createElement('a'); a.download = name;
    if (dataUrl.startsWith('data:') && !dataUrl.startsWith('data:image')) { const [head, body] = dataUrl.split(','); const mime = head.slice(5).split(';')[0]; const blob = new Blob([decodeURIComponent(body)], { type: mime }); a.href = URL.createObjectURL(blob); } else a.href = dataUrl;
    document.body.appendChild(a); a.click(); a.remove(); if (a.href.startsWith('blob:')) setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  const fmt = n => Math.round(n).toLocaleString('en-US');

  // ---------- واجهة التطبيق للمحرر ----------
  app.roomType = () => $('#roomTypeSel').value;
  app.openingType = tool => tool === 'door' ? $('#doorTypeSel').value : $('#windowTypeSel').value;
  app.onTool = t => { $$('[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === t)); $('#c2d').className = 'tool-' + t; $('#placeBanner').hidden = t !== 'place'; if (t === 'place' && editor.pending) $('#placeName').textContent = 'اضغط في المخطط لوضع: ' + CATALOG.BY_ID[editor.pending].n; $$('.item-card').forEach(c => c.classList.toggle('active', t === 'place' && c.dataset.id === editor.pending)); hint(t); };
  app.onSelect = id => { app.selected = id; renderProps(); if (app.view3d) app.view3d.updateSelection(); };
  app.onSelect3D = id => { app.selected = id; editor.select(id, true); renderProps(); app.view3d.updateSelection(); };
  app.selectedId = () => app.selected;
  app.onCoords = (x, y) => { $('#stCoords').textContent = `x: ${x.toFixed(2)} · y: ${y.toFixed(2)}`; };
  app.onLiveChange = () => { if (app.selected) renderProps(true); };
  app.onEdit = id => { const o = P.find(id); if (o && P.kindOf(o) === 'room') { $('#sideTabs [data-tab=materials]').click(); } };
  function hint(t) { const h = { select: 'اضغط لتحديد عنصر، اسحب لتحريكه، المقبض ↻ للتدوير · نقر مزدوج على غرفة لتغيير موادها', pan: 'اسحب لتحريك العرض', wall: 'اضغط لبدء الجدار ثم اضغط لكل نقطة · نقر مزدوج أو Esc للإنهاء', room: 'اسحب مستطيلاً لرسم غرفة (الجدران تلقائية)', door: 'اضغط على جدار لوضع الباب', window: 'اضغط على جدار لوضع النافذة', measure: 'اضغط نقطتين لقياس المسافة', delete: 'اضغط على أي عنصر لحذفه', place: 'اضغط في المخطط لوضع القطعة · Shift للوضع المتكرر · Esc للإلغاء' }; $('#stHint').textContent = h[t] || ''; }

  // ---------- الكتالوج ----------
  let catFilter = 'all', catQuery = '';
  function renderCatalog() {
    const chips = $('#catChips'); chips.innerHTML = `<button class="chip ${catFilter === 'all' ? 'active' : ''}" data-cat="all">الكل</button>` + CATALOG.CATEGORIES.map(c => `<button class="chip ${catFilter === c.id ? 'active' : ''}" data-cat="${c.id}">${c.icon} ${c.n}</button>`).join('');
    chips.querySelectorAll('.chip').forEach(b => b.onclick = () => { catFilter = b.dataset.cat; renderCatalog(); });
    const mine = new Set((P.d.customDefs || []).map(d => d.id));
    const list = CATALOG.ITEMS.filter(i => (!i.custom || mine.has(i.id)) && (catFilter === 'all' || i.cat === catFilter) && (!catQuery || i.n.includes(catQuery) || (CATALOG.CATEGORIES.find(c => c.id === i.cat) || {}).n.includes(catQuery)));
    $('#catCount').textContent = list.length + ' قطعة';
    const grid = $('#catItems'); grid.innerHTML = '';
    list.forEach(def => {
      const card = document.createElement('div'); card.className = 'item-card'; card.dataset.id = def.id; card.title = `${def.n} — ${def.w}×${def.d}×${def.h} م`;
      const cv = document.createElement('canvas'); cv.width = 120; cv.height = 76; drawThumb(cv, def); card.appendChild(cv);
      card.insertAdjacentHTML('beforeend', `<div class="nm">${def.n}</div><div class="dim">${def.w}×${def.d}×${def.h} م · ${def.price ? def.price + '$' : '—'}</div><button class="add" title="إضافة في وسط الشاشة">+</button>`);
      card.onclick = e => { if (e.target.classList.contains('add')) { addAtCenter(def.id); return; } editor.setTool('place', def.id); if (window.innerWidth <= 900) closeSheets(); };
      grid.appendChild(card);
    });
  }
  function drawThumb(cv, def) { const ctx = cv.getContext('2d'); const s = Math.min(cv.width / (def.w + 0.3), cv.height / (def.d + 0.3), 60); ctx.save(); ctx.translate(cv.width / 2, cv.height / 2); ctx.scale(s, s); ctx.lineWidth = 1.2 / s; ctx.strokeStyle = '#333'; ctx.fillStyle = def.c; Editor2D.draw2D(ctx, def.kind, { w: def.w, d: def.d, c: def.c, c2: def.c2 }, def, s); ctx.restore(); }
  function addAtCenter(defId) { const [x, y] = editor.toWorld(editor.W / 2, editor.H / 2); P.snapshot(); const it = editor.placeAt(defId, x, y); P.emit('items'); editor.select(it.id); toast('أُضيف: ' + CATALOG.BY_ID[defId].n); }

  // ---------- المواد ----------
  function renderMaterials() {
    const fg = $('#floorGrid'); fg.innerHTML = ''; MATERIALS.FLOORS.forEach(f => { const d = document.createElement('div'); d.className = 'mat'; d.dataset.id = f.id; d.title = f.n + ' — ' + f.price + '$/م²'; const cv = document.createElement('canvas'); cv.width = 64; cv.height = 44; cv.getContext('2d').drawImage(MATERIALS.texture(f.id, 128), 0, 0, 64, 44); d.appendChild(cv); d.insertAdjacentHTML('beforeend', `<span>${f.n}</span>`); d.onclick = () => applyMaterial('floor', f.id); fg.appendChild(d); });
    const pg = $('#paintGrid'); pg.innerHTML = ''; MATERIALS.PAINTS.forEach(p => { const d = document.createElement('div'); d.className = 'paint'; d.style.background = p.id; d.title = p.n; d.dataset.id = p.id; d.onclick = () => applyMaterial('wall', p.id); pg.appendChild(d); });
    $('#paintCustom').oninput = e => applyMaterial('wall', e.target.value);
  }
  function applyMaterial(kind, val) {
    const all = $('#chkAllRooms').checked; const o = app.selected ? P.find(app.selected) : null;
    let rooms = all ? P.d.rooms : (o && P.kindOf(o) === 'room') ? [o] : [];
    if (!rooms.length && o && P.kindOf(o) === 'wall' && kind === 'wall') { P.snapshot(); o.color = val; P.emit('change'); toast('تم تلوين الجدار'); return; }
    if (!rooms.length) { toast('حدّد غرفة أولاً (أو فعّل "تطبيق على جميع الغرف")'); return; }
    P.snapshot(); rooms.forEach(r => { r[kind] = val; }); P.emit('change'); refreshMaterialSel(); toast(kind === 'floor' ? 'تم تغيير الأرضية' : 'تم تغيير الدهان');
  }
  function refreshMaterialSel() { const o = app.selected ? P.find(app.selected) : null; const r = o && P.kindOf(o) === 'room' ? o : null; $('#matTarget').textContent = r ? '— ' + r.name : '— حدّد غرفة'; $$('#floorGrid .mat').forEach(m => m.classList.toggle('active', !!r && m.dataset.id === r.floor)); $$('#paintGrid .paint').forEach(m => m.classList.toggle('active', !!r && m.dataset.id === r.wall)); }

  // ---------- الخصائص ----------
  function renderProps(live) {
    const body = $('#propsBody'); const o = app.selected ? P.find(app.selected) : null; const k = P.kindOf(o);
    if (live && body.dataset.id === (o && o.id)) { // تحديث القيم فقط أثناء السحب
      if (k === 'item') { const set = (n, v) => { const el = body.querySelector(`[name=${n}]`); if (el && document.activeElement !== el) el.value = v; }; set('x', o.x.toFixed(2)); set('y', o.y.toFixed(2)); set('rot', Math.round(o.rot)); set('rotn', Math.round(o.rot)); }
      return;
    }
    body.dataset.id = o ? o.id : '';
    const num = (n, label, v, step, min, max) => `<label class="field">${label}<input type="number" name="${n}" value="${v}" step="${step || 0.05}" ${min !== undefined ? `min="${min}"` : ''} ${max !== undefined ? `max="${max}"` : ''}></label>`;
    if (!o) {
      const s = P.stats(); const cur = P.d.settings.currency;
      body.innerHTML = `<p class="prop-title">${esc(P.d.name)}</p><p class="prop-sub">لا يوجد تحديد — اضغط على عنصر في المخطط</p>
        <div class="stat-box"><dl><dt>المساحة المبنية</dt><dd>${s.area.toFixed(1)} م²</dd><dt>الطوابق / الغرف</dt><dd>${s.floors} / ${s.rooms}</dd><dt>الجدران</dt><dd>${P.d.walls.length} (${s.wallLen.toFixed(0)} م)</dd><dt>الأبواب / النوافذ</dt><dd>${s.doors} / ${s.windows}</dd><dt>قطع الأثاث</dt><dd>${s.items}</dd><dt>التكلفة التقديرية</dt><dd>${fmt(s.total)} ${cur}</dd></dl></div>
        <h4>الغرف</h4><div class="room-list">${P.d.floors.map((f, i) => { const rs = P.d.rooms.filter(r => STATE.fl(r) === i); return (P.d.floors.length > 1 ? `<div class="floor-head">${esc(f.n)} · ${rs.reduce((a, r) => a + r.w * r.h, 0).toFixed(1)} م²</div>` : '') + rs.map(r => `<button class="tb" style="width:100%;margin-bottom:4px;text-align:right" data-room="${r.id}">${esc(r.name)} <small style="color:#6b7280">${(r.w * r.h).toFixed(1)} م²</small></button>`).join(''); }).join('') || '<p class="hint">لا توجد غرف بعد. استخدم أداة ▭ غرفة.</p>'}</div>
        <h4>تحليل سريع</h4><ul class="tips">${AI.tips(P).slice(0, 5).map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
      body.querySelectorAll('[data-room]').forEach(b => b.onclick = () => { const r = P.find(b.dataset.room); if (STATE.fl(r) !== P.cur) { P.setFloor(STATE.fl(r)); renderFloors(); } editor.select(b.dataset.room); editor.view.ox = editor.W / 2 - (r.x + r.w / 2) * editor.view.s; editor.view.oy = editor.H / 2 - (r.y + r.h / 2) * editor.view.s; editor.draw(); });
      return;
    }
    if (k === 'item') {
      const def = CATALOG.BY_ID[o.defId]; const cat = CATALOG.CATEGORIES.find(c => c.id === def.cat) || {};
      body.innerHTML = `<p class="prop-title">${esc(def.n)}</p><p class="prop-sub">${cat.icon || ''} ${cat.n || ''} · ${def.price ? def.price + '$' : ''} · ${def.mount === 'wall' ? 'يُثبّت على الجدار' : def.mount === 'ceiling' ? 'يُعلّق بالسقف' : 'أرضي'}</p>
        <div class="grid2">${num('x', 'الموضع X (م)', o.x.toFixed(2))}${num('y', 'الموضع Y (م)', o.y.toFixed(2))}</div>
        <label class="field">الدوران (°)<div class="range-row"><input type="range" name="rot" min="0" max="359" value="${Math.round(o.rot)}"><input type="number" name="rotn" value="${Math.round(o.rot)}" min="0" max="359"></div></label>
        <div class="grid3">${num('w', 'العرض', o.w.toFixed(2), 0.05, 0.05)}${num('d', 'العمق', o.d.toFixed(2), 0.05, 0.05)}${num('h', 'الارتفاع', o.h.toFixed(2), 0.05, 0.02)}</div>
        ${def.mount !== 'ceiling' ? num('elev', 'الارتفاع عن الأرض (م)', (o.elev || 0).toFixed(2), 0.05, 0) : ''}
        <div class="grid2"><label class="field">اللون الأساسي<input type="color" name="c" value="${o.c || def.c}"></label>${def.c2 ? `<label class="field">اللون الثانوي<input type="color" name="c2" value="${o.c2 || def.c2}"></label>` : ''}</div>
        <label class="field">الخامة في 3D<select name="finish">${STATE.FINISHES.map(f => `<option value="${f.id}" ${(o.finish || '') === f.id ? 'selected' : ''}>${f.n}</option>`).join('')}</select></label>
        <label class="check"><input type="checkbox" name="locked" ${o.locked ? 'checked' : ''}> 🔒 قفل القطعة (لا تتحرك ولا تدور بالخطأ)</label>
        <div class="prop-actions"><button class="tb" data-act="rot90">↻ 90°</button><button class="tb" data-act="flip">⇄ قلب</button><button class="tb" data-act="dup">⧉ نسخ</button><button class="tb" data-act="copy">📋 نسخ للحافظة</button><button class="tb" data-act="reset">↺ الأبعاد الأصلية</button><button class="tb danger" data-act="del">🗑️ حذف</button></div>`;
      const upd = (fn) => { P.snapshot(); fn(); P.emit('change'); };
      body.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => { const n = inp.name, v = inp.value; if (n === 'locked') { o.locked = inp.checked; P.emit('change'); return; } if (n === 'c' || n === 'c2') { o[n] = v; P.emit('change'); return; } const f = parseFloat(v); if (isNaN(f)) return; if (n === 'rot' || n === 'rotn') { o.rot = ((f % 360) + 360) % 360; body.querySelector('[name=rot]').value = o.rot; body.querySelector('[name=rotn]').value = Math.round(o.rot); } else o[n] = f; P.emit('change'); }));
      body.querySelectorAll('input').forEach(inp => inp.addEventListener('focus', () => P.snapshot()));
      body.querySelector('[name=finish]').onchange = e => { P.snapshot(); o.finish = e.target.value; P.emit('change'); };
      body.querySelector('[data-act=rot90]').onclick = () => upd(() => { o.rot = (o.rot + 90) % 360; });
      body.querySelector('[data-act=flip]').onclick = () => upd(() => { o.rot = (o.rot + 180) % 360; });
      body.querySelector('[data-act=copy]').onclick = () => { copyItem(o); toast('نُسخت القطعة — Ctrl+V للصق هنا أو في مشروع آخر'); };
      body.querySelector('[data-act=dup]').onclick = () => upd(() => { const c = P.addItem(o.defId, o.x + 0.3, o.y + 0.3, o.rot, { w: o.w, d: o.d, h: o.h, c: o.c, c2: o.c2, elev: o.elev }); editor.select(c.id); });
      body.querySelector('[data-act=reset]').onclick = () => upd(() => { o.w = def.w; o.d = def.d; o.h = def.h; o.c = def.c; o.c2 = def.c2 || null; renderProps(); });
      body.querySelector('[data-act=del]').onclick = () => upd(() => { P.remove(o.id); editor.select(null); });
    } else if (k === 'room') {
      body.innerHTML = `<p class="prop-title">${esc(o.name)}</p><p class="prop-sub">غرفة · ${(o.w * o.h).toFixed(2)} م²</p>
        <label class="field">الاسم<input name="name" value="${esc(o.name)}"></label>
        <label class="field">النوع<select name="type">${STATE.ROOM_TYPES.map(t => `<option value="${t.id}" ${t.id === o.type ? 'selected' : ''}>${t.n}</option>`).join('')}</select></label>
        <div class="grid2">${num('x', 'X', o.x.toFixed(2), 0.1)}${num('y', 'Y', o.y.toFixed(2), 0.1)}${num('w', 'العرض (م)', o.w.toFixed(2), 0.1, 0.5)}${num('h', 'الطول (م)', o.h.toFixed(2), 0.1, 0.5)}</div>
        <label class="field">الأرضية<select name="floor">${MATERIALS.FLOORS.map(f => `<option value="${f.id}" ${f.id === o.floor ? 'selected' : ''}>${f.n}</option>`).join('')}</select></label>
        <div class="grid2"><label class="field">دهان الجدران<input type="color" name="wall" value="${o.wall}"></label><label class="field">لون السقف<input type="color" name="ceiling" value="${o.ceiling || '#ffffff'}"></label></div>
        <label class="field">نمط التأثيث<select name="fstyle">${AI.STYLES.map(s => `<option value="${s.id}" ${s.id === app.style ? 'selected' : ''}>${s.n}</option>`).join('')}</select></label>
        <div class="prop-actions"><button class="tb primary" data-act="furnish">✨ تأثيث تلقائي</button><button class="tb" data-act="empty">🧹 إفراغ</button><button class="tb danger" data-act="del">🗑️ حذف الغرفة</button></div>
        <p class="hint">تغيير الأبعاد يحرّك جدران الغرفة المطابقة. حذف الغرفة لا يحذف الجدران.</p>`;
      body.querySelector('[name=name]').oninput = e => { o.name = e.target.value; P.emit('change'); };
      body.querySelector('[name=type]').onchange = e => { P.snapshot(); o.type = e.target.value; const rt = STATE.roomType(o.type); if (o.name.startsWith('غرفة') || o.name === rt.n || STATE.ROOM_TYPES.some(t => t.n === o.name)) o.name = rt.n; o.floor = rt.floor; o.wall = rt.wall; P.emit('change'); renderProps(); };
      ['x', 'y', 'w', 'h'].forEach(n => { body.querySelector(`[name=${n}]`).onchange = e => { const v = parseFloat(e.target.value); if (isNaN(v)) return; P.snapshot(); resizeRoom(o, n, v); P.emit('change'); }; });
      body.querySelector('[name=floor]').onchange = e => { P.snapshot(); o.floor = e.target.value; P.emit('change'); };
      body.querySelector('[name=wall]').oninput = e => { o.wall = e.target.value; P.emit('change'); }; body.querySelector('[name=ceiling]').oninput = e => { o.ceiling = e.target.value; P.emit('change'); };
      body.querySelector('[name=fstyle]').onchange = e => { app.style = e.target.value; };
      body.querySelector('[data-act=furnish]').onclick = () => { P.snapshot(); const n = AI.furnish(P, o, app.style); P.emit('change'); toast(`تم وضع ${n} قطعة في ${o.name}`); };
      body.querySelector('[data-act=empty]').onclick = () => { P.snapshot(); P.d.items = P.d.items.filter(i => !(i.x > o.x && i.x < o.x + o.w && i.y > o.y && i.y < o.y + o.h)); P.emit('change'); };
      body.querySelector('[data-act=del]').onclick = () => { P.snapshot(); P.removeRoom(o.id); editor.select(null); P.emit('change'); };
    } else if (k === 'wall') {
      const L = P.wallLength(o);
      body.innerHTML = `<p class="prop-title">جدار</p><p class="prop-sub">الطول ${L.toFixed(2)} م</p>
        <div class="grid2">${num('t', 'السماكة (م)', o.t.toFixed(2), 0.05, 0.05)}${num('h', 'الارتفاع (م)', (o.h || P.d.settings.wallHeight).toFixed(2), 0.1, 0.5)}</div>
        <div class="grid2">${num('x1', 'X1', o.x1.toFixed(2), 0.1)}${num('y1', 'Y1', o.y1.toFixed(2), 0.1)}${num('x2', 'X2', o.x2.toFixed(2), 0.1)}${num('y2', 'Y2', o.y2.toFixed(2), 0.1)}</div>
        <label class="check"><input type="checkbox" name="custom" ${o.color ? 'checked' : ''}> لون مخصص للجدار (بدل لون الغرفة)</label>
        <label class="field">اللون<input type="color" name="color" value="${o.color || '#f5f1e8'}" ${o.color ? '' : 'disabled'}></label>
        <div class="prop-actions"><button class="tb" data-act="door">🚪 إضافة باب</button><button class="tb" data-act="window">🪟 إضافة نافذة</button><button class="tb danger" data-act="del">🗑️ حذف</button></div>`;
      ['t', 'h', 'x1', 'y1', 'x2', 'y2'].forEach(n => body.querySelector(`[name=${n}]`).onchange = e => { const v = parseFloat(e.target.value); if (isNaN(v)) return; P.snapshot(); o[n] = v; P.emit('change'); });
      body.querySelector('[name=custom]').onchange = e => { P.snapshot(); o.color = e.target.checked ? body.querySelector('[name=color]').value : null; body.querySelector('[name=color]').disabled = !e.target.checked; P.emit('change'); };
      body.querySelector('[name=color]').oninput = e => { o.color = e.target.value; P.emit('change'); };
      body.querySelector('[data-act=door]').onclick = () => { P.snapshot(); const op = P.addOpening($('#doorTypeSel').value, o.id, 0.5); P.emit('change'); if (op) editor.select(op.id); };
      body.querySelector('[data-act=window]').onclick = () => { P.snapshot(); const op = P.addOpening($('#windowTypeSel').value, o.id, 0.5); P.emit('change'); if (op) editor.select(op.id); };
      body.querySelector('[data-act=del]').onclick = () => { P.snapshot(); P.removeWall(o.id); editor.select(null); P.emit('change'); };
    } else if (k === 'opening') {
      const ot = STATE.openingType(o.type); const isDoor = P.isDoor(o);
      body.innerHTML = `<p class="prop-title">${ot.n}</p><p class="prop-sub">${isDoor ? 'باب' : 'نافذة'} · ${ot.price}$</p>
        <label class="field">النوع<select name="type">${STATE.OPENING_TYPES.filter(t => (t.id.startsWith('window')) === !isDoor).map(t => `<option value="${t.id}" ${t.id === o.type ? 'selected' : ''}>${t.n}</option>`).join('')}</select></label>
        <div class="grid3">${num('w', 'العرض', o.w.toFixed(2), 0.05, 0.3)}${num('h', 'الارتفاع', o.h.toFixed(2), 0.05, 0.3)}${isDoor ? '' : num('sill', 'ارتفاع الجلسة', o.sill.toFixed(2), 0.05, 0)}</div>
        <label class="field">الموضع على الجدار (%)<input type="range" name="t" min="0" max="100" value="${Math.round(o.t * 100)}"></label>
        <div class="prop-actions">${isDoor ? '<button class="tb" data-act="flip">⇅ اتجاه الفتح</button><button class="tb" data-act="swing">⇄ جهة المفصلة</button>' : ''}<button class="tb danger" data-act="del">🗑️ حذف</button></div>`;
      body.querySelector('[name=type]').onchange = e => { P.snapshot(); const nt = STATE.openingType(e.target.value); o.type = nt.id; o.w = nt.w; o.h = nt.h; o.sill = nt.sill; P.emit('change'); renderProps(); };
      ['w', 'h', 'sill'].forEach(n => { const el = body.querySelector(`[name=${n}]`); if (el) el.onchange = e => { const v = parseFloat(e.target.value); if (isNaN(v)) return; P.snapshot(); o[n] = v; P.emit('change'); }; });
      body.querySelector('[name=t]').oninput = e => { o.t = parseInt(e.target.value) / 100; P.emit('change'); };
      const fl = body.querySelector('[data-act=flip]'); if (fl) fl.onclick = () => { P.snapshot(); o.flip = !o.flip; P.emit('change'); };
      const sw = body.querySelector('[data-act=swing]'); if (sw) sw.onclick = () => { P.snapshot(); o.swing = -(o.swing || 1); P.emit('change'); };
      body.querySelector('[data-act=del]').onclick = () => { P.snapshot(); P.remove(o.id); editor.select(null); P.emit('change'); };
    }
  }
  function resizeRoom(r, prop, v) {
    const walls = P.roomWalls(r); const old = { x: r.x, y: r.y, w: r.w, h: r.h }; r[prop] = v;
    const mapX = x => Math.abs(x - old.x) < 0.02 ? r.x : Math.abs(x - old.x - old.w) < 0.02 ? r.x + r.w : x; const mapY = y => Math.abs(y - old.y) < 0.02 ? r.y : Math.abs(y - old.y - old.h) < 0.02 ? r.y + r.h : y;
    walls.forEach(w => { w.x1 = mapX(w.x1); w.x2 = mapX(w.x2); w.y1 = mapY(w.y1); w.y2 = mapY(w.y2); });
    if (prop === 'x' || prop === 'y') { const dx = r.x - old.x, dy = r.y - old.y; P.d.items.forEach(i => { if (i.x > old.x && i.x < old.x + old.w && i.y > old.y && i.y < old.y + old.h) { i.x += dx; i.y += dy; } }); }
  }

  // ---------- العرض ثلاثي الأبعاد ----------
  function setMode(m) {
    app.mode = m; $('#btn2d').classList.toggle('active', m === '2d'); $('#btn3d').classList.toggle('active', m === '3d');
    $('#v3d').hidden = m !== '3d'; $('#c2d').style.visibility = m === '3d' ? 'hidden' : 'visible'; $('#floatTools').hidden = m === '3d'; $('#mnView').innerHTML = m === '3d' ? '📐<span>2D</span>' : '🏠<span>3D</span>';
    if (m === '3d') { if (!app.view3d) { try { app.view3d = new View3D($('#v3d'), P, app); } catch (e) { console.error(e); toast('تعذّر تشغيل العرض ثلاثي الأبعاد (WebGL غير متاح)'); setMode('2d'); return; } app.view3d.build(); app.view3d.focus(); app.dirty3d = false; } else { app.view3d.resize(); if (app.dirty3d) { app.view3d.build(); app.dirty3d = false; } } $('#stHint').textContent = 'اسحب للدوران · عجلة الماوس للتقريب · زر أيمن للتحريك · اضغط على قطعة لتحديدها'; }
    else { editor.resize(); hint(editor.tool); if (app.view3d && app.view3d.walk) setWalk(false); }
  }
  function setWalk(v) { if (!app.view3d) return; app.view3d.setWalk(v); $('#b3Walk').classList.toggle('active', v); $('#b3Orbit').classList.toggle('active', !v); $('#walkPad').hidden = !v; $('#stHint').textContent = v ? 'W A S D أو الأسهم للمشي · اسحب للنظر حولك' : 'اسحب للدوران · عجلة الماوس للتقريب'; }

  // ---------- تغييرات المشروع ----------
  let autosaveT, build3dT;
  P.on(kind => {
    editor.draw(); $('#projName').value = P.d.name; refreshMaterialSel();
    if (kind !== 'change' || !app.selected) renderProps(); else renderProps(true);
    if (kind === 'load' || kind === 'floor' || kind === 'undo' || kind === 'redo') renderFloors();
    if (kind === 'load') { app.selected = null; editor.select(null, true); renderProps(); editor.fit(); readSettings(); }
    if (app.selected && !P.find(app.selected)) { app.selected = null; editor.select(null, true); renderProps(); }
    if (app.mode === '3d' && app.view3d) { clearTimeout(build3dT); build3dT = setTimeout(() => app.view3d.build(), 120); } else app.dirty3d = true;
    $('#stInfo').textContent = `المساحة: ${P.totalArea().toFixed(1)} م² · ${P.d.items.length} قطعة`;
    $('#btnUndo').disabled = !P.undo.length; $('#btnRedo').disabled = !P.redo.length;
    clearTimeout(autosaveT); autosaveT = setTimeout(() => { try { localStorage.setItem(AUTOSAVE, JSON.stringify(P.d)); const h = STATE.Store.history(); if (!h[0] || Date.now() - h[0].t > 120000) STATE.Store.pushHistory(P.d, 'auto'); } catch (e) { } }, 800);
  });
  // ---------- الطوابق ----------
  function renderFloors() {
    const sel = $('#floorSel'); sel.innerHTML = P.d.floors.map((f, i) => `<option value="${i}" ${i === P.cur ? 'selected' : ''}>${esc(f.n)}</option>`).join('');
    $('#btnFloorDel').disabled = P.d.floors.length <= 1; $('#floorBar').classList.toggle('multi', P.d.floors.length > 1);
  }
  function switchFloor(i) { P.setFloor(i); app.selected = null; editor.select(null, true); renderFloors(); editor.fit(); renderProps(); if (app.view3d) { if (app.view3d.onlyFloor) app.view3d.build(); else app.view3d.updateSelection(); } $('#stInfo').textContent = `${P.d.floors[P.cur].n} · ${P.totalArea().toFixed(1)} م² · ${P.d.items.length} قطعة`; }
  function readSettings() { const s = P.d.settings; $('#setWallH').value = s.wallHeight; $('#setWallT').value = s.wallThickness; $('#setExt').value = s.exteriorColor; $('#setCur').value = s.currency; $('#setCeiling').checked = !!s.showCeiling; $('#b3Ceiling').classList.toggle('active', !!s.showCeiling); }

  // ---------- المشاريع ----------
  function saveProject(silent) { const thumb = editor.toDataURL(24); const ok = STATE.Store.save(P, thumb); STATE.Store.pushHistory(P.d, 'save'); if (!silent) toast(ok ? 'تم حفظ المشروع ✓' : 'تعذّر الحفظ (مساحة التخزين ممتلئة)'); renderSaved(); }
  function renderSaved() {
    const list = STATE.Store.list(); const el = $('#savedList');
    el.innerHTML = list.length ? list.map(p => `<div class="saved"><img src="${p.thumb || ''}" alt=""><div class="body"><b>${esc(p.name)}</b><small>${new Date(p.updated).toLocaleString('ar-EG')} · ${(p.data.rooms || []).length} غرف · ${(p.data.items || []).length} قطعة</small><div class="row"><button class="tb primary" data-open="${p.pid}">فتح</button><button class="tb" data-dup="${p.pid}">نسخ</button><button class="tb danger" data-del="${p.pid}">حذف</button></div></div></div>`).join('') : '<p class="hint">لا توجد مشاريع محفوظة بعد.</p>';
    el.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { const p = STATE.Store.get(b.dataset.open); if (p) { P.load(p.data); closeModals(); toast('تم فتح ' + p.name); } });
    el.querySelectorAll('[data-dup]').forEach(b => b.onclick = () => { const p = STATE.Store.get(b.dataset.dup); if (p) { const d = JSON.parse(JSON.stringify(p.data)); delete d.pid; d.name = p.name + ' (نسخة)'; const tmp = new STATE.Project(d); STATE.Store.save(tmp, p.thumb); renderSaved(); } });
    el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { if (confirm('حذف هذا المشروع نهائياً؟')) { STATE.Store.remove(b.dataset.del); renderSaved(); } });
    const hl = $('#histList'); const hist = STATE.Store.history();
    hl.innerHTML = hist.length ? hist.map((h, i) => `<div class="hist"><div><b>${esc(h.name || 'بدون اسم')}</b> <small>${new Date(h.t).toLocaleString('ar-EG')} · ${h.rooms} غرف · ${h.items} قطعة · ${h.reason === 'save' ? 'حفظ يدوي' : 'تلقائي'}</small></div><button class="tb" data-hist="${i}">استعادة</button></div>`).join('') : '<p class="hint">لا توجد نسخ بعد. تُحفظ نسخة مع كل حفظ وكل دقيقتين من العمل.</p>';
    hl.querySelectorAll('[data-hist]').forEach(b => b.onclick = () => { const h = STATE.Store.history()[+b.dataset.hist]; if (!h) return; P.snapshot(); const d = JSON.parse(h.json); delete d.pid; P.load(d); closeModals(); toast('تمت استعادة النسخة — يمكنك التراجع بـ Ctrl+Z'); });
  }
  function renderTemplates() { $('#tplGrid').innerHTML = TEMPLATES.list.map(t => `<button class="tpl" data-tpl="${t.id}"><div class="ic">${t.icon}</div><b>${t.n}</b><small>${t.desc}</small></button>`).join(''); $$('#tplGrid .tpl').forEach(b => b.onclick = () => { showLoading(true); setTimeout(() => { TEMPLATES.build(P, b.dataset.tpl); closeModals(); showLoading(false); toast('جاهز! عدّل ما تشاء أو افتح العرض ثلاثي الأبعاد'); }, 30); }); }
  function showLoading(v) { $('#loading').hidden = !v; }

  // ---------- المصمم الذكي ----------
  function chatAdd(text, who) { const log = $('#chatLog'); const d = document.createElement('div'); d.className = 'msg ' + who; d.innerHTML = esc(text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); log.appendChild(d); log.scrollTop = log.scrollHeight; }
  function selectedRoom() { const o = app.selected ? P.find(app.selected) : null; if (!o) return null; if (P.kindOf(o) === 'room') return o; if (P.kindOf(o) === 'item') return P.roomAt(o.x, o.y); return null; }
  function runActions(actions) {
    actions.forEach(a => {
      if (a.type === 'generate') { showLoading(true); setTimeout(() => { P.snapshot(); AI.generatePlan(P, a.opts); showLoading(false); }, 30); }
      else if (a.type === 'furnish') { const r = P.find(a.roomId); if (r) { P.snapshot(); AI.furnish(P, r, a.style); P.emit('change'); } }
      else if (a.type === 'furnishAll') { P.snapshot(); P.d.rooms.forEach(r => AI.furnish(P, r, a.style)); P.emit('change'); }
      else if (a.type === 'style') { P.snapshot(); app.style = a.style; AI.applyStyle(P, a.style); P.emit('change'); }
      else if (a.type === 'add') { const r = selectedRoom(); const [cx, cy] = r ? [r.x + r.w / 2, r.y + r.h / 2] : editor.toWorld(editor.W / 2, editor.H / 2); P.snapshot(); const it = P.addItem(a.defId, cx, cy, 0); P.emit('change'); editor.select(it.id); }
      else if (a.type === 'clearItems') { P.snapshot(); P.d.items = []; P.emit('change'); }
      else if (a.type === 'remove') { P.snapshot(); P.remove(a.id); editor.select(null); P.emit('change'); }
      else if (a.type === 'view3d') { closeModals(); setMode('3d'); }
    });
  }
  function ask(text) { if (!text.trim()) return; chatAdd(text, 'user'); const r = AI.chat(P, text, { style: app.style, selectedRoom: selectedRoom(), selectedId: app.selected }); setTimeout(() => { chatAdd(r.text, 'bot'); runActions(r.actions); refreshAIBoxes(); }, 250); }
  function refreshAIBoxes() { const e = AI.estimate(P); $('#estBox').innerHTML = `<table class="est-table">${e.rows.map(r => `<tr><td>${esc(r[0])}</td><td>${fmt(r[1])} ${e.cur}</td></tr>`).join('')}<tr class="total"><td>الإجمالي التقديري</td><td>${fmt(e.total)} ${e.cur}</td></tr></table><p class="hint">أسعار تقريبية لأغراض التخطيط فقط.</p>`; $('#tipsBox').innerHTML = `<ul class="tips">${AI.tips(P).map(t => `<li>${esc(t)}</li>`).join('')}</ul>`; }
  function renderStyles() {
    const opts = AI.STYLES.map(s => `<option value="${s.id}">${s.n}</option>`).join(''); $('#gStyle').innerHTML = opts; $('#fStyle').innerHTML = opts;
    $('#styleGrid').innerHTML = AI.STYLES.map(s => `<button class="style-card" data-style="${s.id}"><div class="sw"><i style="background:${s.wall}"></i><i style="background:${MATERIALS.byId(s.floor).base}"></i><i style="background:${s.accent}"></i><i style="background:${s.wood}"></i><i style="background:${s.fabric}"></i></div><b>${s.n}</b><small>${s.desc}</small></button>`).join('');
    $$('#styleGrid .style-card').forEach(b => b.onclick = () => { app.style = b.dataset.style; $('#fStyle').value = app.style; $('#gStyle').value = app.style; P.snapshot(); AI.applyStyle(P, app.style); P.emit('change'); chatAdd('طبّقت نمط «' + AI.style(app.style).n + '» على الغرف والأثاث.', 'bot'); });
  }

  // ---------- التصدير ----------
  function exportJSON() { const data = JSON.stringify(P.d, null, 1); download(fileName('omran.json'), 'data:application/json;charset=utf-8,' + encodeURIComponent(data)); }
  function exportCSV() { const rows = [['العنصر', 'الفئة', 'العرض', 'العمق', 'الارتفاع', 'الغرفة', 'السعر']]; P.d.items.forEach(i => { const def = CATALOG.BY_ID[i.defId] || {}; const r = P.roomAt(i.x, i.y); rows.push([def.n, (CATALOG.CATEGORIES.find(c => c.id === def.cat) || {}).n, i.w, i.d, i.h, r ? r.name : '', def.price || 0]); }); const e = AI.estimate(P); rows.push([]); e.rows.forEach(r => rows.push([r[0], '', '', '', '', '', Math.round(r[1])])); rows.push(['الإجمالي', '', '', '', '', '', Math.round(e.total)]); const csv = '﻿' + rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n'); download(fileName('csv'), 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)); }
  // ---------- تقرير PDF مفصّل ----------
  function buildReport() {
    const S = P.stats(); const cur = P.d.settings.currency; const est = AI.estimate(P); const saveFloor = P.cur;
    const plans = P.d.floors.map((f, i) => { P.setFloor(i); const url = editor.toDataURL(50); return { n: f.n, url, rooms: P.d.rooms.filter(r => STATE.fl(r) === i) }; });
    P.setFloor(saveFloor); editor.draw();
    const shot = app.view3d ? app.view3d.screenshot() : null;
    const catName = id => (CATALOG.CATEGORIES.find(c => c.id === id) || {}).n || '';
    const byRoom = {}; P.d.items.forEach(it => { const r = P.roomAt(it.x, it.y, STATE.fl(it)); const k = r ? r.id : '_'; (byRoom[k] = byRoom[k] || []).push(it); });
    const roomRows = plans.map(p => p.rooms.map(r => `<tr><td>${esc(p.n)}</td><td>${esc(r.name)}</td><td>${esc(STATE.roomType(r.type).n)}</td><td>${r.w.toFixed(2)} × ${r.h.toFixed(2)}</td><td>${(r.w * r.h).toFixed(2)}</td><td>${esc(MATERIALS.byId(r.floor).n)}</td><td><span class="sw" style="background:${r.wall}"></span> ${r.wall}</td></tr>`).join('')).join('');
    const furnRows = Object.keys(byRoom).map(k => { const r = k === '_' ? null : P.find(k); const list = byRoom[k]; const sum = list.reduce((a, i) => a + ((CATALOG.BY_ID[i.defId] || {}).price || 0), 0); return `<tr class="grp"><td colspan="5">${r ? esc(r.name) + ' — ' + esc(P.d.floors[STATE.fl(r)].n) : 'خارج الغرف'}</td><td>${fmt(sum)} ${cur}</td></tr>` + list.map(i => { const d = CATALOG.BY_ID[i.defId] || {}; return `<tr><td>${esc(d.n || i.defId)}</td><td>${esc(catName(d.cat))}</td><td>${i.w.toFixed(2)} × ${i.d.toFixed(2)} × ${i.h.toFixed(2)}</td><td><span class="sw" style="background:${i.c || d.c}"></span></td><td>${esc((STATE.FINISHES.find(f => f.id === (i.finish || '')) || {}).n || '')}</td><td>${d.price ? fmt(d.price) + ' ' + cur : '—'}</td></tr>`; }).join(''); }).join('');
    const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقرير ${esc(P.d.name)} — عمران</title>
<style>body{font-family:Tajawal,'Segoe UI',Tahoma,Arial,sans-serif;color:#1f2937;margin:0;padding:24px;line-height:1.6}h1{font-size:26px;margin:0 0 4px}h2{font-size:18px;margin:26px 0 8px;border-bottom:2px solid #a5431c;padding-bottom:4px}table{width:100%;border-collapse:collapse;font-size:12.5px}td,th{border:1px solid #d9d9d9;padding:5px 7px;text-align:right;vertical-align:top}th{background:#fbf1ea}tr.grp td{background:#f3f4f6;font-weight:800}.sw{display:inline-block;width:14px;height:14px;border-radius:3px;border:1px solid #999;vertical-align:middle}.meta{color:#5b6470;font-size:13px}.plan{max-width:100%;border:1px solid #ddd;border-radius:8px;margin:6px 0 12px}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}.stat{border:1px solid #ddd;border-radius:8px;padding:8px 10px}.stat b{display:block;font-size:18px;color:#8f3a16}.btn{position:fixed;top:12px;left:12px;background:#a5431c;color:#fff;border:0;border-radius:10px;padding:10px 16px;font-weight:800;font-size:14px;cursor:pointer}.tips{padding-right:18px}@media print{.btn{display:none}h2{page-break-after:avoid}tr{page-break-inside:avoid}}</style></head><body>
<button class="btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
<h1>${esc(P.d.name)}</h1><div class="meta">تقرير مشروع من عمران · ${new Date().toLocaleString('ar-EG')} · ${S.floors} ${S.floors > 1 ? 'طوابق' : 'طابق'} · ${S.rooms} غرف · ${S.items} قطعة</div>
<div class="stats"><div class="stat"><b>${S.area.toFixed(1)} م²</b>المساحة المبنية</div><div class="stat"><b>${S.wallLen.toFixed(0)} م</b>طول الجدران</div><div class="stat"><b>${S.doors} / ${S.windows}</b>أبواب / نوافذ</div><div class="stat"><b>${fmt(S.total)} ${cur}</b>التكلفة التقديرية</div></div>
${plans.map(p => `<h2>مخطط ${esc(p.n)}</h2><img class="plan" src="${p.url}" alt="مخطط ${esc(p.n)}">`).join('')}
${shot ? `<h2>العرض ثلاثي الأبعاد</h2><img class="plan" src="${shot}" alt="عرض ثلاثي الأبعاد">` : ''}
<h2>الغرف</h2><table><tr><th>الطابق</th><th>الغرفة</th><th>النوع</th><th>الأبعاد (م)</th><th>المساحة (م²)</th><th>الأرضية</th><th>الدهان</th></tr>${roomRows || '<tr><td colspan="7">لا غرف</td></tr>'}</table>
<h2>قائمة الأثاث والأجهزة</h2><table><tr><th>القطعة</th><th>الفئة</th><th>الأبعاد (م)</th><th>اللون</th><th>الخامة</th><th>السعر</th></tr>${furnRows || '<tr><td colspan="6">لا أثاث</td></tr>'}</table>
<h2>تقدير التكلفة</h2><table>${est.rows.map(r => `<tr><td>${esc(r[0])}</td><td>${fmt(r[1])} ${cur}</td></tr>`).join('')}${S.slabs ? `<tr><td>بلاطات الأدوار العليا</td><td>${fmt(S.slabs)} ${cur}</td></tr>` : ''}<tr class="grp"><td>الإجمالي التقديري</td><td>${fmt(est.total)} ${cur}</td></tr></table><p class="meta">الأسعار تقديرية لأغراض التخطيط ولا تغني عن عروض أسعار حقيقية.</p>
<h2>ملاحظات التصميم</h2><ul class="tips">${AI.tips(P).map(t => `<li>${esc(t)}</li>`).join('')}</ul>
<p class="meta">أُنشئ بواسطة عمران — مجاني ومفتوح المصدر.</p></body></html>`;
    const w = window.open('', '_blank'); if (!w) { toast('المتصفح منع فتح نافذة التقرير — اسمح بالنوافذ المنبثقة'); return; }
    w.document.open(); w.document.write(html); w.document.close(); toast('فُتح التقرير في تبويب جديد — اطبعه أو احفظه PDF');
  }
  function showShot(url, name) { $('#shotImg').src = url; $('#shotDl').href = url; $('#shotDl').download = name; closeModals(); openModal('#mShot'); }
  function shareLink() { try { const json = JSON.stringify(P.d); const b64 = btoa(unescape(encodeURIComponent(json))); const url = location.origin + location.pathname + '#p=' + b64; if (url.length > 60000) { toast('المشروع كبير جداً للرابط — استخدم تصدير JSON'); return; } (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('تم نسخ الرابط ✓ (يحتوي المشروع كاملاً)')).catch(() => prompt('انسخ الرابط:', url)); } catch (e) { toast('تعذّر إنشاء الرابط'); } }
  function loadFromHash() { if (location.hash.startsWith('#p=')) { try { const json = decodeURIComponent(escape(atob(location.hash.slice(3)))); P.load(JSON.parse(json)); history.replaceState(null, '', location.pathname); toast('تم فتح المشروع من الرابط'); return true; } catch (e) { console.warn(e); } } return false; }

  // ---------- الربط ----------
  function bind() {
    $('#projName').addEventListener('input', e => { P.d.name = e.target.value; });
    $('#btnUndo').onclick = () => P.doUndo(); $('#btnRedo').onclick = () => P.doRedo();
    $('#btn2d').onclick = () => setMode('2d'); $('#btn3d').onclick = () => setMode('3d');
    $('#btnAI').onclick = () => { openModal('#mAI'); refreshAIBoxes(); if (!$('#chatLog').children.length) chatAdd('أهلاً بك في عمران! أنا المصمم الذكي 👋\nاكتب ما تريد، مثلاً: «صمّم لي شقة غرفتين نوم بنمط مودرن» أو «أثّث المطبخ» أو «كم التكلفة؟». أو استخدم الأدوات على اليسار.', 'bot'); setTimeout(() => $('#chatText').focus(), 100); };
    $('#btnSave').onclick = () => saveProject(); $('#btnProjects').onclick = () => { renderSaved(); openModal('#mProjects'); }; $('#btnExport').onclick = () => openModal('#mExport'); $('#btnHelp').onclick = () => openModal('#mHelp'); $('#brand').onclick = () => { renderSaved(); openModal('#mProjects'); };
    $$('[data-close]').forEach(b => b.onclick = closeModals); $$('.modal').forEach(m => m.addEventListener('pointerdown', e => { if (e.target === m) closeModals(); }));
    $$('#sideTabs button').forEach(b => b.onclick = () => { $$('#sideTabs button').forEach(x => x.classList.toggle('active', x === b)); $$('.tab-body').forEach(t => t.hidden = t.id !== 'tab-' + b.dataset.tab); });
    $$('[data-mtab]').forEach(b => b.onclick = () => { $$('[data-mtab]').forEach(x => x.classList.toggle('active', x === b)); $('#mtab-new').hidden = b.dataset.mtab !== 'new'; $('#mtab-saved').hidden = b.dataset.mtab !== 'saved'; });
    $$('[data-tool]').forEach(b => b.onclick = () => editor.setTool(b.dataset.tool));
    $('#placeCancel').onclick = () => editor.setTool('select');
    $('#catSearch').oninput = e => { catQuery = e.target.value.trim(); renderCatalog(); };
    $('#btnZoomIn').onclick = $('#ftZoomIn').onclick = () => editor.zoom(1.25); $('#btnZoomOut').onclick = $('#ftZoomOut').onclick = () => editor.zoom(0.8); $('#btnFit').onclick = $('#ftFit').onclick = () => editor.fit();
    $('#chkGrid').onchange = e => { editor.showGrid = e.target.checked; editor.draw(); }; $('#chkLabels').onchange = e => { editor.showLabels = e.target.checked; editor.draw(); }; $('#chkKeep').onchange = e => { app.keepPlacing = e.target.checked; };
    $('#roomTypeSel').innerHTML = STATE.ROOM_TYPES.map(t => `<option value="${t.id}">${t.n}</option>`).join('');
    $('#doorTypeSel').innerHTML = STATE.OPENING_TYPES.filter(t => !t.id.startsWith('window')).map(t => `<option value="${t.id}">${t.n}</option>`).join('');
    $('#windowTypeSel').innerHTML = STATE.OPENING_TYPES.filter(t => t.id.startsWith('window')).map(t => `<option value="${t.id}">${t.n}</option>`).join('');
    // الإعدادات
    $('#setWallH').onchange = e => { P.snapshot(); const v = parseFloat(e.target.value); P.d.settings.wallHeight = v; P.d.walls.forEach(w => w.h = v); P.emit('change'); };
    $('#setWallT').onchange = e => { P.snapshot(); const v = parseFloat(e.target.value); P.d.settings.wallThickness = v; P.d.walls.forEach(w => w.t = v); P.emit('change'); };
    $('#setExt').oninput = e => { P.d.settings.exteriorColor = e.target.value; P.emit('change'); }; $('#setCur').oninput = e => { P.d.settings.currency = e.target.value || '$'; P.emit('change'); };
    $('#setCeiling').onchange = e => { P.d.settings.showCeiling = e.target.checked; $('#b3Ceiling').classList.toggle('active', e.target.checked); P.emit('change'); };
    $('#btnClearItems').onclick = () => { if (confirm('حذف كل الأثاث؟')) { P.snapshot(); P.d.items = []; P.emit('change'); } };
    $('#btnClearAll').onclick = () => { if (confirm('مسح المشروع بالكامل؟ (يمكن التراجع)')) { P.snapshot(); const n = P.d.name; P.load(STATE.blank(n)); } };
    // 3D
    $('#b3Orbit').onclick = () => setWalk(false); $('#b3Walk').onclick = () => setWalk(true); $('#b3Top').onclick = () => { setWalk(false); app.view3d.topView(); }; $('#b3Focus').onclick = () => app.view3d.focus();
    $('#b3Night').onclick = e => { app.view3d.setNight(!app.view3d.night); e.currentTarget.classList.toggle('active', app.view3d.night); };
    $('#b3Ceiling').onclick = () => { P.d.settings.showCeiling = !P.d.settings.showCeiling; $('#setCeiling').checked = P.d.settings.showCeiling; $('#b3Ceiling').classList.toggle('active', P.d.settings.showCeiling); app.view3d.build(); };
    $('#b3Shot').onclick = () => showShot(app.view3d.screenshot(), fileName('3d.png'));
    $$('#walkPad button').forEach(b => { const on = e => { e.preventDefault(); app.view3d.walkInput(b.dataset.k, true); }; const off = () => app.view3d.walkInput(b.dataset.k, false); b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off); });
    // المصمم الذكي
    $('#chatForm').onsubmit = e => { e.preventDefault(); const t = $('#chatText').value; $('#chatText').value = ''; ask(t); };
    $$('.chat-quick button').forEach(b => b.onclick = () => ask(b.dataset.q));
    $('#btnGenerate').onclick = () => { const opts = { width: parseFloat($('#gW').value), depth: parseFloat($('#gD').value), bedrooms: parseInt($('#gBed').value), bathrooms: parseInt($('#gBath').value), kids: parseInt($('#gKids').value), majlis: $('#gMajlis').checked, dining: $('#gDining').checked, office: $('#gOffice').checked, garden: $('#gGarden').checked, style: $('#gStyle').value, name: 'منزل ' + $('#gBed').value + ' غرف' }; app.style = opts.style; chatAdd(`ولّدت مخططاً ${opts.width}×${opts.depth} م بنمط ${AI.style(opts.style).n}.`, 'bot'); runActions([{ type: 'generate', opts }]); setTimeout(() => { refreshAIBoxes(); closeModals(); }, 150); };
    $('#btnFurnishSel').onclick = () => { const r = selectedRoom(); if (!r) { toast('حدّد غرفة في المخطط أولاً'); return; } P.snapshot(); const n = AI.furnish(P, r, $('#fStyle').value, $('#fKeep').checked); P.emit('change'); chatAdd(`تم وضع ${n} قطعة في «${r.name}».`, 'bot'); refreshAIBoxes(); };
    $('#btnFurnishAll').onclick = () => { if (!P.d.rooms.length) { toast('لا توجد غرف بعد'); return; } P.snapshot(); let n = 0; P.d.rooms.forEach(r => n += AI.furnish(P, r, $('#fStyle').value, $('#fKeep').checked)); P.emit('change'); chatAdd(`تم تأثيث ${P.d.rooms.length} غرفة بـ ${n} قطعة.`, 'bot'); refreshAIBoxes(); };
    // التصدير
    $('#exPng2d').onclick = () => showShot(editor.toDataURL(80), fileName('2d.png'));
    $('#exPng3d').onclick = () => { if (!app.view3d) { setMode('3d'); } setTimeout(() => showShot(app.view3d.screenshot(), fileName('3d.png')), 200); };
    $('#exJson').onclick = () => { exportJSON(); closeModals(); toast('تم تنزيل ملف المشروع'); }; $('#exCsv').onclick = () => { exportCSV(); closeModals(); toast('تم تنزيل قائمة الأثاث'); }; $('#exPrint').onclick = () => { closeModals(); setTimeout(() => window.print(), 100); }; $('#exLink').onclick = shareLink;
    $('#floorSel').onchange = e => switchFloor(+e.target.value);
    $('#btnFloorAdd').onclick = () => { P.snapshot(); const i = P.addFloor(); switchFloor(i); P.emit('floor'); toast('أُضيف ' + P.d.floors[i].n + ' — ارسم غرفه فوق شبح الدور الأسفل'); };
    $('#btnFloorDup').onclick = () => { P.snapshot(); const i = P.duplicateFloor(P.cur); switchFloor(i); P.emit('floor'); toast('نُسخ الدور إلى ' + P.d.floors[i].n); };
    $('#btnFloorDel').onclick = () => { if (P.d.floors.length <= 1) return; if (!confirm('حذف «' + P.d.floors[P.cur].n + '» بكل غرفه وأثاثه؟ (يمكن التراجع)')) return; P.snapshot(); P.removeFloor(P.cur); switchFloor(P.cur); P.emit('floor'); };
    $('#b3Only').onclick = e => { app.view3d.setOnlyFloor(!app.view3d.onlyFloor); e.currentTarget.classList.toggle('active', app.view3d.onlyFloor); };
    $('#exReport').onclick = () => { closeModals(); buildReport(); };
    $('#btnCustomItem').onclick = () => openModal('#mCustom'); $('#customForm').onsubmit = e => { e.preventDefault(); createCustomItem(e.target); };
    $('#btnImport').onclick = () => $('#fileImport').click(); $('#fileImport').onchange = e => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { try { const d = JSON.parse(rd.result); if (!d.rooms || !d.walls) throw 0; delete d.pid; P.load(d); closeModals(); toast('تم الاستيراد ✓'); } catch (err) { toast('ملف غير صالح'); } }; rd.readAsText(f); e.target.value = ''; };
    // الجوال
    $$('#mobileNav button').forEach(b => b.onclick = () => { const n = b.dataset.nav; if (n === 'view') { setMode(app.mode === '2d' ? '3d' : '2d'); return; } if (n === 'ai') { $('#btnAI').click(); return; } const sb = $('#sidebar'), pr = $('#props'); if (n === 'props') { const open = !pr.classList.contains('open'); closeSheets(); pr.classList.toggle('open', open); b.classList.toggle('active', open); return; } const wasOpen = sb.classList.contains('open') && $('#sideTabs .active').dataset.tab === n; closeSheets(); if (!wasOpen) { sb.classList.add('open'); $(`#sideTabs [data-tab=${n}]`).click(); b.classList.add('active'); } });
    $('#c2d').addEventListener('pointerdown', () => { if (window.innerWidth <= 900) closeSheets(); });
    // لوحة المفاتيح
    window.addEventListener('keydown', e => {
      if (!$$('.modal').every(m => m.hidden)) { if (e.key === 'Escape') closeModals(); return; } const tag = (e.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? P.doRedo() : P.doUndo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); P.doRedo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveProject(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') { const o = app.selected && P.find(app.selected); if (o && P.kindOf(o) === 'item') { e.preventDefault(); copyItem(o); toast('نُسخت القطعة'); } return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') { e.preventDefault(); pasteItem(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); const o = app.selected && P.find(app.selected); if (o && P.kindOf(o) === 'item') { P.snapshot(); const c = P.addItem(o.defId, o.x + 0.3, o.y + 0.3, o.rot, { w: o.w, d: o.d, h: o.h, c: o.c, c2: o.c2, elev: o.elev }); P.emit('change'); editor.select(c.id); } return; }
      if (app.mode === '2d') { if (editor.key(e)) { e.preventDefault(); return; } const map = { v: 'select', h: 'pan', g: 'room', w: 'wall', d: 'door', n: 'window', m: 'measure', x: 'delete' }; const t = map[e.key.toLowerCase()]; if (t && !e.ctrlKey && !e.metaKey) editor.setTool(t); }
    });
    window.addEventListener('resize', () => { editor.resize(); if (app.view3d) app.view3d.resize(); });
    window.addEventListener('beforeunload', () => { try { localStorage.setItem(AUTOSAVE, JSON.stringify(P.d)); } catch (e) { } });
  }
  function copyItem(o) { const def = CATALOG.BY_ID[o.defId]; try { localStorage.setItem(CLIP, JSON.stringify({ item: o, def: def && def.custom ? def : null })); } catch (e) { } }
  function pasteItem() {
    let c = null; try { c = JSON.parse(localStorage.getItem(CLIP) || 'null'); } catch (e) { } if (!c || !c.item) { toast('الحافظة فارغة'); return; }
    if (c.def && !CATALOG.BY_ID[c.def.id]) { P.addCustomDef(c.def); renderCatalog(); } else if (c.def && !(P.d.customDefs || []).some(d => d.id === c.def.id)) { P.d.customDefs.push(c.def); renderCatalog(); }
    if (!CATALOG.BY_ID[c.item.defId]) { toast('القطعة غير معروفة في هذا الإصدار'); return; }
    const m = editor.mouse; const [x, y] = m ? [editor.snap(m[0]), editor.snap(m[1])] : [c.item.x + 0.4, c.item.y + 0.4];
    P.snapshot(); const it = P.addItem(c.item.defId, x, y, c.item.rot, { w: c.item.w, d: c.item.d, h: c.item.h, c: c.item.c, c2: c.item.c2, elev: c.item.elev, finish: c.item.finish || '' }); P.emit('change'); editor.select(it.id); toast('تم اللصق');
  }
  function createCustomItem(form) {
    const f = new FormData(form); const def = { n: String(f.get('n')).trim().slice(0, 40), w: +f.get('w'), d: +f.get('d'), h: +f.get('h'), kind: f.get('kind'), mount: f.get('mount'), c: f.get('c'), price: +f.get('price') || 0, elev: f.get('mount') === 'wall' ? 1.0 : 0 };
    if (!def.n || !(def.w > 0) || !(def.d > 0) || !(def.h > 0)) { toast('أكمل الاسم والأبعاد'); return; }
    P.snapshot(); P.addCustomDef(def); catFilter = 'custom'; renderCatalog(); closeModals(); editor.setTool('place', def.id); P.emit('change'); toast('أنشئت «' + def.n + '» — اضغط في المخطط لوضعها');
  }
  function closeSheets() { $('#sidebar').classList.remove('open'); $('#props').classList.remove('open'); $$('#mobileNav button').forEach(b => b.classList.remove('active')); }

  // ---------- البدء ----------
  function init() {
    editor = new Editor2D($('#c2d'), P, app); app.editor = editor; window.OMRAN = { P, app, editor };
    renderCatalog(); renderMaterials(); renderTemplates(); renderStyles(); bind(); readSettings(); renderFloors();
    let loaded = loadFromHash();
    if (!loaded) { try { const a = localStorage.getItem(AUTOSAVE); if (a) { const d = JSON.parse(a); if (d && (d.rooms.length || d.walls.length || d.items.length)) { P.load(d); loaded = true; } } } catch (e) { } }
    if (!loaded) { P.emit('load'); renderSaved(); openModal('#mProjects'); }
    editor.fit(); renderProps(); showLoading(false);
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
