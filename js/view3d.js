/* العرض ثلاثي الأبعاد — Three.js */
(function (global) {
  'use strict';
  const rad = d => d * Math.PI / 180;

  class View3D {
    constructor(container, project, app) {
      this.el = container; this.project = project; this.app = app; this.night = false; this.walk = false; this.quality = 'high';
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
      this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.outputEncoding = THREE.sRGBEncoding; this.el.appendChild(this.renderer.domElement);
      this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#cfe6f5');
      this.camera = new THREE.PerspectiveCamera(55, 1, 0.05, 500); this.camera.position.set(10, 9, 12);
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement); this.controls.maxPolarAngle = Math.PI / 2 - 0.02; this.controls.enableDamping = true; this.controls.dampingFactor = 0.08;
      this.controls.addEventListener('change', () => this.requestRender());
      this.root = new THREE.Group(); this.scene.add(this.root); this.lights = new THREE.Group(); this.scene.add(this.lights);
      this.geoCache = {}; this.matCache = {}; this.texCache = {}; this.needs = true; this.walkState = { yaw: 0, pitch: 0, keys: {}, pos: new THREE.Vector3() };
      this.selBox = null; this.raycaster = new THREE.Raycaster(); this.pick = new THREE.Vector2();
      this.setupLights(); this.ground(); this.bindPick(); this.resize(); this.loop();
    }
    resize() { const r = this.el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return; this.renderer.setSize(r.width, r.height, false); this.renderer.domElement.style.width = '100%'; this.renderer.domElement.style.height = '100%'; this.camera.aspect = r.width / r.height; this.camera.updateProjectionMatrix(); this.requestRender(); }
    requestRender() { this.needs = true; }
    loop() { requestAnimationFrame(() => this.loop()); if (this.walk) { this.stepWalk(); this.needs = true; } else this.controls.update(); if (this.needs) { this.needs = false; this.renderer.render(this.scene, this.camera); } }

    setupLights() {
      this.hemi = new THREE.HemisphereLight('#ffffff', '#8c9a8c', 0.75); this.lights.add(this.hemi);
      this.sun = new THREE.DirectionalLight('#fff6e0', 1.1); this.sun.position.set(12, 20, 8); this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048); this.sun.shadow.bias = -0.0005; this.lights.add(this.sun); this.lights.add(this.sun.target);
      this.amb = new THREE.AmbientLight('#ffffff', 0.15); this.lights.add(this.amb);
    }
    ground() {
      const tex = this.floorTexture('grass'); tex.repeat.set(200, 200);
      const g = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: tex, color: '#b9c9a8' })); g.rotation.x = -Math.PI / 2; g.position.y = -0.02; g.receiveShadow = true; this.scene.add(g); this.groundMesh = g;
    }
    floorTexture(id) { if (!this.texCache[id]) { const t = new THREE.CanvasTexture(MATERIALS.texture(id, 256)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; this.texCache[id] = t; } return this.texCache[id]; }
    mat(color, opts) {
      opts = opts || {}; const key = color + '|' + (opts.op || 1) + '|' + (opts.em ? 1 : 0) + '|' + (opts.metal ? 1 : 0);
      if (!this.matCache[key]) { const m = new THREE.MeshStandardMaterial({ color, roughness: opts.metal ? 0.2 : 0.75, metalness: opts.metal ? 0.9 : 0.05 }); if (opts.op && opts.op < 1) { m.transparent = true; m.opacity = opts.op; } if (opts.em) { m.emissive = new THREE.Color(color); m.emissiveIntensity = 0.6; } this.matCache[key] = m; }
      return this.matCache[key];
    }
    geo(type, seg) { const key = type + (seg || ''); if (!this.geoCache[key]) { this.geoCache[key] = type === 'box' ? new THREE.BoxGeometry(1, 1, 1) : type === 'cyl' ? new THREE.CylinderGeometry(1, 1, 1, seg || 24) : type === 'sph' ? new THREE.SphereGeometry(1, 20, 14) : new THREE.ConeGeometry(1, 1, seg || 24); } return this.geoCache[key]; }

    clear() { while (this.root.children.length) { const c = this.root.children.pop(); c.traverse(o => { if (o.geometry && !Object.values(this.geoCache).includes(o.geometry)) o.geometry.dispose(); }); } this.pointLights = []; }

    build() {
      const P = this.project, d = P.d, S = d.settings; this.clear();
      const extMat = this.mat(S.exteriorColor || '#e5ded2');
      // الأرضيات والأسقف
      d.rooms.forEach(r => {
        const tex = this.floorTexture(r.floor); const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }); m.map = tex.clone(); m.map.needsUpdate = true; m.map.repeat.set(r.w, r.h);
        const f = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.h), m); f.rotation.x = -Math.PI / 2; f.position.set(r.x + r.w / 2, 0.005, r.y + r.h / 2); f.receiveShadow = true; f.userData = { id: r.id }; this.root.add(f);
        if (S.showCeiling || this.walk) { const c = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.h), this.mat(r.ceiling || '#ffffff')); c.rotation.x = Math.PI / 2; c.position.set(r.x + r.w / 2, S.wallHeight - 0.005, r.y + r.h / 2); this.root.add(c); }
      });
      // الجدران
      d.walls.forEach(w => this.buildWall(w, extMat));
      // العناصر
      d.items.forEach(it => this.buildItem(it));
      // إطار البيت الخارجي (أرضية خارجية حول المبنى)
      const b = P.bounds(); if (d.rooms.length) { const pad = 3; const slab = new THREE.Mesh(new THREE.BoxGeometry(b.w + pad * 2, 0.02, b.h + pad * 2), this.mat('#d6d0c4')); slab.position.set(b.x + b.w / 2, -0.012, b.y + b.h / 2); slab.receiveShadow = true; this.root.add(slab); }
      // ظل الشمس يغطي المبنى
      const sz = Math.max(b.w, b.h, 10) * 1.2; this.sun.shadow.camera.left = -sz; this.sun.shadow.camera.right = sz; this.sun.shadow.camera.top = sz; this.sun.shadow.camera.bottom = -sz; this.sun.shadow.camera.near = 1; this.sun.shadow.camera.far = 80; this.sun.shadow.camera.updateProjectionMatrix();
      this.sun.position.set(b.x + b.w / 2 + 12, 22, b.y + b.h / 2 + 8); this.sun.target.position.set(b.x + b.w / 2, 0, b.y + b.h / 2);
      this.applyNight(); this.updateSelection(); this.requestRender();
    }
    roomColorAt(x, y) { const r = this.project.roomAt(x, y); return r ? r.wall : null; }
    buildWall(w, extMat) {
      const P = this.project, S = P.d.settings; const L = P.wallLength(w); if (L < 0.01) return; const H = w.h || S.wallHeight, T = w.t || S.wallThickness;
      const a = Math.atan2(w.y2 - w.y1, w.x2 - w.x1); const nx = -Math.sin(a), ny = Math.cos(a);
      const mx = (w.x1 + w.x2) / 2, my = (w.y1 + w.y2) / 2;
      const cA = w.color || this.roomColorAt(mx + nx * (T / 2 + 0.05), my + ny * (T / 2 + 0.05)); const cB = w.color || this.roomColorAt(mx - nx * (T / 2 + 0.05), my - ny * (T / 2 + 0.05));
      const matA = cA ? this.mat(cA) : extMat, matB = cB ? this.mat(cB) : extMat;
      const mats = [extMat, extMat, extMat, extMat, matA, matB]; // +x,-x,+y,-y,+z,-z
      const group = new THREE.Group(); group.position.set(w.x1, 0, w.y1); group.rotation.y = -a; group.userData = { id: w.id };
      const seg = (s0, s1, y0, y1) => { const len = s1 - s0; if (len < 0.005 || y1 - y0 < 0.005) return; const m = new THREE.Mesh(this.geo('box'), mats); m.scale.set(len, y1 - y0, T); m.position.set((s0 + s1) / 2, (y0 + y1) / 2, 0); m.castShadow = true; m.receiveShadow = true; m.userData = { id: w.id }; group.add(m); };
      const ops = P.d.openings.filter(o => o.wallId === w.id).map(o => ({ o, s0: Math.max(0, o.t * L - o.w / 2), s1: Math.min(L, o.t * L + o.w / 2) })).sort((x, y) => x.s0 - y.s0);
      let cur = -T / 2; // تمديد الزوايا
      ops.forEach(({ o, s0, s1 }) => {
        seg(cur, s0, 0, H); const top = Math.min(H, o.sill + o.h);
        if (o.sill > 0) seg(s0, s1, 0, o.sill); if (top < H) seg(s0, s1, top, H);
        this.buildOpening(group, o, s0, s1, T); cur = s1;
      });
      seg(cur, L + T / 2, 0, H); this.root.add(group);
    }
    buildOpening(group, o, s0, s1, T) {
      const P = this.project; const w = s1 - s0, cx = (s0 + s1) / 2; const frame = this.mat(o.type === 'main_door' ? '#4a2e1a' : '#ffffff'); const wood = this.mat(o.type === 'main_door' ? '#5b3a29' : '#a8784f'); const glass = this.mat('#9ad0ec', { op: 0.35 });
      const fr = (x, y, sw, sh) => { const m = new THREE.Mesh(this.geo('box'), frame); m.scale.set(sw, sh, T + 0.02); m.position.set(x, y, 0); group.add(m); };
      if (P.isDoor(o)) {
        const H = o.h; fr(s0 + 0.03, H / 2, 0.06, H); fr(s1 - 0.03, H / 2, 0.06, H); fr(cx, H - 0.03, w, 0.06);
        if (o.type === 'arch') return;
        if (o.type === 'sliding_door') { const g1 = new THREE.Mesh(this.geo('box'), glass); g1.scale.set(w / 2, H - 0.1, 0.03); g1.position.set(cx - w / 4, H / 2, 0.03); group.add(g1); const g2 = g1.clone(); g2.position.set(cx + w / 4, H / 2, -0.03); group.add(g2); return; }
        const leaves = o.type === 'double_door' ? 2 : 1; const lw = (w - 0.12) / leaves; const open = 0.35; // زاوية فتح الباب
        for (let i = 0; i < leaves; i++) {
          const hingeStart = leaves === 2 ? i === 0 : (o.swing || 1) > 0; const hinge = hingeStart ? s0 + 0.06 : s1 - 0.06; const dir = hingeStart ? 1 : -1; const swing = (o.flip ? -1 : 1);
          const piv = new THREE.Group(); piv.position.set(hinge, 0, 0); piv.rotation.y = -dir * swing * open;
          const leaf = new THREE.Mesh(this.geo('box'), wood); leaf.scale.set(lw, H - 0.08, 0.05); leaf.position.set(dir * lw / 2, (H - 0.08) / 2, 0); leaf.castShadow = true; piv.add(leaf);
          const knob = new THREE.Mesh(this.geo('sph'), this.mat('#c9a227', { metal: true })); knob.scale.set(0.025, 0.025, 0.025); knob.position.set(dir * (lw - 0.08), 1.0, 0.04); piv.add(knob);
          group.add(piv);
        }
      } else {
        const y0 = o.sill, y1 = o.sill + o.h; fr(s0 + 0.03, (y0 + y1) / 2, 0.06, o.h); fr(s1 - 0.03, (y0 + y1) / 2, 0.06, o.h); fr(cx, y1 - 0.03, w, 0.06); fr(cx, y0 + 0.03, w, 0.06);
        const g = new THREE.Mesh(this.geo('box'), glass); g.scale.set(w - 0.1, o.h - 0.1, 0.02); g.position.set(cx, (y0 + y1) / 2, 0); group.add(g);
        if (w > 1.0) { fr(cx, (y0 + y1) / 2, 0.04, o.h); }
      }
    }
    buildItem(it) {
      const def = CATALOG.BY_ID[it.defId]; if (!def) return; const S = this.project.d.settings;
      let parts; try { parts = CATALOG.BUILD[def.kind](it.w, it.d, it.h, it.c || def.c, it.c2 || def.c2); } catch (e) { parts = CATALOG.BUILD.generic(it.w, it.d, it.h, it.c || def.c); }
      const g = new THREE.Group(); let elev = it.elev || 0; if (def.mount === 'ceiling') elev = S.wallHeight - it.h;
      g.position.set(it.x, elev, it.y); g.rotation.y = -rad(it.rot); g.userData = { id: it.id };
      parts.forEach(p => {
        const m = new THREE.Mesh(this.geo(p.g, p.seg), this.mat(p.c, { op: p.op, em: p.em, metal: p.metal }));
        m.position.set(p.p[0], p.p[1], p.p[2]); m.scale.set(p.s[0], p.s[1], p.s[2]); if (p.r) m.rotation.set(p.r[0], p.r[1], p.r[2]);
        m.castShadow = !p.op; m.receiveShadow = true; m.userData = { id: it.id }; g.add(m);
        if (p.em && def.cat === 'lighting' && this.pointLights.length < 10) { const pl = new THREE.PointLight('#ffe9b8', 0, 7, 2); pl.position.set(p.p[0], p.p[1] - 0.05, p.p[2]); g.add(pl); this.pointLights.push(pl); }
      });
      this.root.add(g);
    }
    applyNight() {
      const n = this.night; this.scene.background = new THREE.Color(n ? '#0d1526' : '#cfe6f5'); this.hemi.intensity = n ? 0.12 : 0.75; this.sun.intensity = n ? 0.08 : 1.1; this.amb.intensity = n ? 0.08 : 0.15; this.sun.color.set(n ? '#8fa6d6' : '#fff6e0');
      (this.pointLights || []).forEach(pl => { pl.intensity = n ? 1.4 : 0; }); this.requestRender();
    }
    setNight(v) { this.night = v; this.applyNight(); }
    focus() { const b = this.project.bounds(); const cx = b.x + b.w / 2, cz = b.y + b.h / 2; const R = Math.max(b.w, b.h, 6); this.controls.target.set(cx, 0.5, cz); this.camera.position.set(cx + R * 0.7, R * 0.8, cz + R * 1.0); this.controls.update(); this.requestRender(); }
    topView() { const b = this.project.bounds(); const cx = b.x + b.w / 2, cz = b.y + b.h / 2; this.controls.target.set(cx, 0, cz); this.camera.position.set(cx, Math.max(b.w, b.h) * 1.3 + 4, cz + 0.01); this.controls.update(); this.requestRender(); }
    updateSelection() {
      if (this.selBox) { this.scene.remove(this.selBox); this.selBox = null; }
      const id = this.app.selectedId && this.app.selectedId(); if (!id) { this.requestRender(); return; }
      const obj = this.root.children.find(c => c.userData && c.userData.id === id); if (!obj) { this.requestRender(); return; }
      this.selBox = new THREE.BoxHelper(obj, 0x2563eb); this.scene.add(this.selBox); this.requestRender();
    }
    bindPick() {
      let down = null; const el = this.renderer.domElement;
      el.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
      el.addEventListener('pointerup', e => { if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6 || this.walk) { down = null; return; } down = null; const r = el.getBoundingClientRect(); this.pick.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); this.raycaster.setFromCamera(this.pick, this.camera); const hits = this.raycaster.intersectObjects(this.root.children, true); const h = hits.find(x => x.object.userData && x.object.userData.id); this.app.onSelect3D && this.app.onSelect3D(h ? h.object.userData.id : null); });
      // التحكم بالنظر في وضع المشي
      let look = null; el.addEventListener('pointerdown', e => { if (this.walk) look = [e.clientX, e.clientY]; });
      el.addEventListener('pointermove', e => { if (this.walk && look) { this.walkState.yaw -= (e.clientX - look[0]) * 0.004; this.walkState.pitch = Math.max(-1.2, Math.min(1.2, this.walkState.pitch - (e.clientY - look[1]) * 0.004)); look = [e.clientX, e.clientY]; } });
      el.addEventListener('pointerup', () => { look = null; }); el.addEventListener('pointercancel', () => { look = null; });
      window.addEventListener('keydown', e => { if (this.walk) { this.walkState.keys[e.key.toLowerCase()] = true; if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault(); } });
      window.addEventListener('keyup', e => { this.walkState.keys[e.key.toLowerCase()] = false; });
    }
    setWalk(v) {
      this.walk = v; this.controls.enabled = !v;
      if (v) { const b = this.project.bounds(); const r = this.project.d.rooms[0]; const ws = this.walkState; ws.pos.set(r ? r.x + r.w / 2 : b.x + b.w / 2, 1.6, r ? r.y + r.h / 2 : b.y + b.h / 2); ws.yaw = 0; ws.pitch = 0; this.camera.fov = 70; } else { this.camera.fov = 55; this.focus(); }
      this.camera.updateProjectionMatrix(); this.build();
    }
    walkInput(dir, on) { this.walkState.keys['__' + dir] = on; }
    stepWalk() {
      const ws = this.walkState, k = ws.keys; const sp = 0.045; const f = new THREE.Vector3(-Math.sin(ws.yaw), 0, -Math.cos(ws.yaw)); const rgt = new THREE.Vector3(f.z, 0, -f.x).negate();
      if (k['w'] || k['arrowup'] || k['__f']) ws.pos.addScaledVector(f, sp); if (k['s'] || k['arrowdown'] || k['__b']) ws.pos.addScaledVector(f, -sp);
      if (k['a'] || k['arrowleft'] || k['__l']) ws.pos.addScaledVector(rgt, -sp); if (k['d'] || k['arrowright'] || k['__r']) ws.pos.addScaledVector(rgt, sp);
      if (k['__tl']) ws.yaw += 0.03; if (k['__tr']) ws.yaw -= 0.03;
      this.camera.position.copy(ws.pos); const look = new THREE.Vector3(ws.pos.x - Math.sin(ws.yaw) * Math.cos(ws.pitch), ws.pos.y + Math.sin(ws.pitch), ws.pos.z - Math.cos(ws.yaw) * Math.cos(ws.pitch)); this.camera.lookAt(look);
    }
    screenshot() { this.renderer.render(this.scene, this.camera); return this.renderer.domElement.toDataURL('image/png'); }
  }
  global.View3D = View3D;
})(window);
