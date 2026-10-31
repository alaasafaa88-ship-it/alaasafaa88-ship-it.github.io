/* قوالب جاهزة */
(function (global) {
  'use strict';
  const TEMPLATES = [
    { id: 'studio', n: 'استوديو صغير', desc: 'غرفة معيشة ونوم مفتوحة + مطبخ + حمام (~45 م²)', icon: '🏢', opts: { width: 8, depth: 6, bedrooms: 0, bathrooms: 1, majlis: false, dining: false, style: 'scandi', name: 'استوديو' } },
    { id: 'apt2', n: 'شقة غرفتين', desc: 'غرفتا نوم، حمامان، صالة، مطبخ، سفرة (~120 م²)', icon: '🏠', opts: { width: 13, depth: 10, bedrooms: 2, bathrooms: 2, majlis: false, dining: true, style: 'modern', name: 'شقة غرفتين' } },
    { id: 'apt3', n: 'شقة 3 غرف مع مجلس', desc: '3 غرف نوم، مجلس، صالة، مطبخ، سفرة، حمامان (~170 م²)', icon: '🏡', opts: { width: 16, depth: 11, bedrooms: 3, bathrooms: 2, majlis: true, dining: true, style: 'arabic', name: 'شقة عائلية' } },
    { id: 'villa', n: 'فيلا (دور أرضي)', desc: 'مجلس، صالة، سفرة، مطبخ، 4 غرف نوم، مكتب، 3 حمامات، حديقة (~250 م²)', icon: '🏰', opts: { width: 20, depth: 14, bedrooms: 3, bathrooms: 3, kids: 1, majlis: true, dining: true, office: true, garden: true, style: 'luxury', name: 'فيلا' } },
    { id: 'family', n: 'منزل عائلي مع غرفة أطفال', desc: 'غرفة رئيسية، غرفة أطفال، غرفة نوم، صالة، مطبخ (~150 م²)', icon: '👨‍👩‍👧', opts: { width: 15, depth: 11, bedrooms: 2, bathrooms: 2, kids: 1, majlis: false, dining: true, style: 'kids_fun', name: 'منزل عائلي' } },
    { id: 'office', n: 'مكتب صغير', desc: 'مكتب مدير، غرفة اجتماعات، استقبال، مطبخ صغير، حمام', icon: '💼', custom: 'office' },
    { id: 'blank', n: 'مشروع فارغ', desc: 'ابدأ من الصفر: ارسم الغرف والجدران بنفسك', icon: '📐', custom: 'blank' },
  ];

  function build(P, id) {
    const t = TEMPLATES.find(x => x.id === id); if (!t) return;
    if (t.custom === 'blank') { P.load(STATE.blank('مشروع جديد')); return; }
    if (t.custom === 'office') {
      const d = STATE.blank('مكتب'); P.load(d);
      const rec = P.addRoom(0, 0, 6, 4, 'hall'); rec.name = 'الاستقبال'; rec.floor = 'marble'; const meet = P.addRoom(6, 0, 5, 4, 'dining'); meet.name = 'غرفة الاجتماعات'; meet.floor = 'carpet_grey';
      const o1 = P.addRoom(0, 4, 4, 4, 'office'); o1.name = 'مكتب المدير'; const o2 = P.addRoom(4, 4, 4, 4, 'office'); o2.name = 'مكتب 2'; const k = P.addRoom(8, 4, 1.8, 4, 'kitchen'); k.name = 'مطبخ صغير'; const b = P.addRoom(9.8, 4, 1.2, 4, 'bathroom'); b.name = 'حمام';
      const wallBetween = (x1, y1, x2, y2) => P.d.walls.find(w => (Math.abs(w.x1 - x1) < 0.01 && Math.abs(w.y1 - y1) < 0.01 && Math.abs(w.x2 - x2) < 0.01 && Math.abs(w.y2 - y2) < 0.01) || (Math.abs(w.x1 - x2) < 0.01 && Math.abs(w.y1 - y2) < 0.01 && Math.abs(w.x2 - x1) < 0.01 && Math.abs(w.y2 - y1) < 0.01));
      const door = (w, t, type) => { if (w) P.addOpening(type || 'door', w.id, t); };
      door(wallBetween(0, 0, 0, 4), 0.5, 'sliding_door'); door(wallBetween(6, 0, 6, 4), 0.5, 'sliding_door'); door(wallBetween(0, 4, 4, 4), 0.5); door(wallBetween(4, 4, 8, 4), 0.5); door(wallBetween(8, 4, 9.8, 4), 0.5, 'arch'); door(wallBetween(9.8, 4, 11, 4), 0.5);
      door(wallBetween(0, 0, 6, 0), 0.5, 'window_wide'); door(wallBetween(6, 0, 11, 0), 0.5, 'window_wide'); door(wallBetween(0, 8, 4, 8), 0.5, 'window'); door(wallBetween(4, 8, 8, 8), 0.5, 'window');
      // تأثيث
      AI.furnish(P, meet, 'modern'); P.d.items = P.d.items.filter(i => !(i.x > meet.x && i.x < meet.x + meet.w && i.y > meet.y && i.y < meet.y + meet.h));
      P.addItem('meeting_table', 8.5, 2, 0, {}); [[7.4, 1.2, 0], [8.5, 1.2, 0], [9.6, 1.2, 0], [7.4, 2.8, 180], [8.5, 2.8, 180], [9.6, 2.8, 180]].forEach(([x, y, r]) => P.addItem('visitor_chair', x, y, r, {})); P.addItem('tv65', 10.85, 2, 90, { elev: 1.1 }); P.addItem('whiteboard', 8.5, 0.15, 0, {}); P.addItem('chandelier', 8.5, 2, 0, {});
      AI.furnish(P, o1, 'modern'); AI.furnish(P, o2, 'modern'); AI.furnish(P, k, 'modern'); AI.furnish(P, b, 'modern');
      P.addItem('sofa3', 3, 0.6, 0, { c: '#3d3d3d' }); P.addItem('coffee_table', 3, 1.6, 0, {}); P.addItem('desk', 1.2, 3.4, 180, { c: '#f3f3f1' }); P.addItem('office_chair', 1.2, 2.6, 0, {}); P.addItem('plant_big', 5.5, 3.5, 0, {}); P.addItem('plant_big', 0.5, 3.5, 0, {}); P.addItem('painting_l', 1.5, 0.12, 0, {}); P.addItem('spot', 1.5, 2, 0, {}); P.addItem('spot', 4.5, 2, 0, {});
      P.d.settings.wallHeight = 3.0; P.emit('load'); return;
    }
    AI.generatePlan(P, t.opts);
  }
  global.TEMPLATES = { list: TEMPLATES, build };
})(window);
