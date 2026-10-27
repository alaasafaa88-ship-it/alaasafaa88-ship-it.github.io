/* هدّاف - لعبة تسديد كرة القدم. ملفات ثابتة فقط، بلا مكتبات. */
(() => {
'use strict';

/* ============ التخزين (محمي حيث يُحظر التخزين) ============ */
const KEY = 'haddaf.v1';
const MAX_HEARTS = 5, HEART_REGEN_MS = 2 * 60 * 1000;
const REWIND_COST = 50;
const DEFAULTS = { levels: {}, hearts: MAX_HEARTS, heartsAt: 0, name: 'البطل', kit: '#2563eb', skin: '#e8b894', hair: '#3a2416', sound: true, slowmo: true, points: 0, cash: 0, stats: { attempts: 0, goals: 0, assists: 0, curves: 0, lofts: 0 } };
let save = loadSave();
function loadSave() {
  try { const raw = localStorage.getItem(KEY); if (raw) { const o = Object.assign({}, DEFAULTS, JSON.parse(raw)); o.stats = Object.assign({}, DEFAULTS.stats, o.stats || {}); return o; } } catch (e) {}
  return Object.assign({}, DEFAULTS, { stats: Object.assign({}, DEFAULTS.stats) });
}
function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }

/* ============ أدوات ============ */
const $ = (s, r = document) => r.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const AR_DIGITS = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
function makeRng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function distPointSeg(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
  let t = l2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2 : 0; t = clamp(t, 0, 1);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
function toast(msg) { const t = $('#toast'); t.innerHTML = `<span>${msg}</span>`; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 1800); }

/* ============ العالم ============ */
const W = 100, H = 150, GOAL_L = 35, GOAL_R = 65, GOAL_H = 12, GK_Y = 3;
const TOTAL_LEVELS = 60, PER_SEASON = 10;
const SEASONS = ['الدوري المحلي', 'كأس البطولة', 'الدوري الممتاز', 'دوري الأبطال', 'كأس القارة', 'كأس العالم'];
const KITS = ['#2563eb', '#dc2626', '#16a34a', '#f59e0b', '#9333ea', '#0891b2', '#111827', '#f472b6'];
const SKINS = ['#f3d3b8', '#e8b894', '#c68642', '#8d5524', '#5c3a21'];
const HAIRS = ['#1b1b1b', '#3a2416', '#8b5a2b', '#d4a017', '#b0b0b0', '#c0392b'];
const HOME_CLUBS = ['النسور', 'الصقور', 'الأسود', 'النمور', 'العمالقة', 'الأبطال'];
const AWAY_CLUBS = ['الموج', 'الرعد', 'الفرسان', 'البرق', 'الجبل', 'الشعلة', 'القلعة', 'الرياح', 'السهم', 'الكوكب', 'الحصن', 'الفجر'];

/* ============ المستويات ============ */
const HINTS = {
  1: 'اسحب من الكرة نحو المرمى ثم ارفع إصبعك. الخط الأطول = تسديدة أقوى.',
  2: 'ارسم خطاً منحنياً لتلتفّ الكرة حول المدافع.',
  3: 'الطريق مغلق؟ مرّر إلى زميلك أولاً ثم سدّد.',
  4: 'الحارس يراقب الكرة. سدّد نحو الزاوية بقوة.',
  6: 'الخط الطويل جداً يرفع الكرة فوق المدافعين… وربما فوق العارضة!',
  11: 'المدافعون المتحرّكون يفتحون ثغرات. انتظر اللحظة المناسبة.',
};
const SALTS = { 4: 1, 10: 1, 14: 1, 17: 4, 19: 2, 23: 2, 24: 1, 26: 3, 27: 1, 30: 1, 31: 2, 32: 7, 34: 1, 37: 1, 38: 4, 40: 1, 41: 2, 43: 1, 44: 1, 45: 1, 46: 14, 47: 5, 49: 2, 50: 4, 52: 1, 53: 8, 55: 5, 56: 1, 57: 1, 58: 1, 59: 4, 60: 1 }; // تعديلات بذرة لمستويات تم التحقق من إمكانية حلّها آلياً
function handLevel(n) {
  if (n === 1) return { ball: { x: 50, y: 70 }, teammates: [], defenders: [], gk: { speed: 10, reaction: .45, reach: 4.5 } };
  if (n === 2) return { ball: { x: 50, y: 80 }, teammates: [], defenders: [{ x: 50, y: 45, react: 0 }], gk: { speed: 13, reaction: .4, reach: 4.8 } };
  if (n === 3) return { ball: { x: 50, y: 85 }, teammates: [{ x: 80, y: 55 }], defenders: [{ x: 44, y: 55, react: 0 }, { x: 57, y: 55, react: 0 }], gk: { speed: 14, reaction: .35, reach: 5 } };
  return null;
}
function solvePar(level) {
  const corners = [{ x: 38.5, y: 0 }, { x: 61.5, y: 0 }];
  const clear = (a, b) => level.defenders.every(d => distPointSeg(d, a, b) >= 6);
  const canScore = p => corners.some(c => clear(p, c));
  if (canScore(level.ball)) return 1;
  for (const t of level.teammates) if (clear(level.ball, t) && canScore(t)) return 2;
  for (const t of level.teammates) for (const u of level.teammates) if (t !== u && clear(level.ball, t) && clear(t, u) && canScore(u)) return 3;
  return 0;
}
function generateLevel(n) {
  const hand = handLevel(n);
  if (hand) { hand.par = solvePar(hand) || 1; return finalizeLevel(hand, n); }
  const rng = makeRng(1000 + n * 7919 + (SALTS[n] || 0) * 104729);
  const nDef = Math.min(5, 1 + Math.floor(n / 11));
  const moveP = Math.min(.7, n / 50);
  const react = n < 4 ? 0 : Math.min(12, 2 + n * .17);
  const gk = { speed: Math.min(21, 12 + n * .15), reaction: Math.max(.2, .38 - n * .003), reach: 4.5 + Math.min(1.2, n * .02) };
  const wantPar = n % 3 === 0 ? 2 : (n % 7 === 0 ? 3 : 0);
  let best = null;
  for (let attempt = 0; attempt < 400; attempt++) {
    const ball = { x: 15 + rng() * 70, y: 62 + rng() * 48 };
    const nTm = 1 + Math.floor(rng() * Math.min(3, 1 + n / 12));
    const teammates = [];
    for (let i = 0; i < nTm && teammates.length < 3; i++) {
      for (let k = 0; k < 20; k++) {
        const t = { x: 10 + rng() * 80, y: 18 + rng() * Math.max(10, ball.y - 10) };
        if (dist(t, ball) >= 18 && teammates.every(o => dist(o, t) >= 14)) { teammates.push(t); break; }
      }
    }
    const defenders = [];
    for (let i = 0; i < nDef; i++) {
      for (let k = 0; k < 30; k++) {
        const d = { x: 8 + rng() * 84, y: 10 + rng() * (ball.y - 22), react };
        if (dist(d, ball) < 12 || teammates.some(t => dist(t, d) < 8) || defenders.some(o => dist(o, d) < 9)) continue;
        if (rng() < moveP) d.patrol = { amp: 6 + rng() * 12, speed: 5 + rng() * (6 + n * .15), phase: rng() * Math.PI * 2 };
        defenders.push(d); break;
      }
    }
    const level = { ball, teammates, defenders, gk };
    const par = solvePar(level);
    if (!par) continue;
    level.par = par;
    if (!best) best = level;
    if (!wantPar || par === wantPar) { best = level; break; }
  }
  return finalizeLevel(best, n);
}
function finalizeLevel(level, n) {
  level.n = n; level.season = Math.ceil(n / PER_SEASON); level.hint = HINTS[n] || '';
  const r = makeRng(99 + n * 31);
  level.match = { home: HOME_CLUBS[level.season - 1], away: AWAY_CLUBS[Math.floor(r() * AWAY_CLUBS.length)], minute: 48 + Math.floor(r() * 44), homeGoals: Math.floor(r() * 2), awayGoals: Math.floor(r() * 2) };
  return level;
}

/* ============ الصوت ============ */
const audio = {
  ctx: null,
  ensure() { if (!save.sound) return null; try { this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; } catch (e) { return null; } },
  tone(f, dur, type = 'sine', vol = .3, slide = 0) {
    const c = this.ensure(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), c.currentTime + dur);
    g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(.001, c.currentTime + dur);
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + dur);
  },
  noise(dur, vol = .4, lp = 1200) {
    const c = this.ensure(); if (!c) return;
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    s.buffer = buf; f.type = 'lowpass'; f.frequency.value = lp; g.gain.value = vol;
    s.connect(f).connect(g).connect(c.destination); s.start();
  },
  kick(p) { this.noise(.12, .25 + p * .3, 900); this.tone(120, .1, 'sine', .25, -60); },
  goal() { this.noise(1.6, .5, 2500); [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, .35, 'square', .12), i * 110)); try { navigator.vibrate && navigator.vibrate([60, 40, 120]); } catch (e) {} },
  save() { this.noise(.2, .35, 500); this.tone(180, .25, 'triangle', .3, -100); },
  block() { this.noise(.15, .3, 700); },
  post() { this.tone(1800, .5, 'sine', .25, -400); this.tone(900, .3, 'triangle', .15); },
  whistle() { this.tone(2200, .18, 'square', .12); setTimeout(() => this.tone(2600, .25, 'square', .12), 160); },
  pass() { this.noise(.08, .2, 1500); this.tone(300, .08, 'sine', .15); },
  out() { this.tone(400, .2, 'sawtooth', .08, -200); },
};

/* ============ القلوب ============ */
function syncHearts() {
  if (save.hearts >= MAX_HEARTS) { save.heartsAt = 0; return; }
  if (!save.heartsAt) save.heartsAt = Date.now();
  const now = Date.now();
  while (save.hearts < MAX_HEARTS && now - save.heartsAt >= HEART_REGEN_MS) { save.hearts++; save.heartsAt += HEART_REGEN_MS; }
  if (save.hearts >= MAX_HEARTS) save.heartsAt = 0;
}
function heartsHtml() {
  syncHearts();
  let timer = '';
  if (save.hearts < MAX_HEARTS) { const left = Math.max(0, HEART_REGEN_MS - (Date.now() - save.heartsAt)); const m = Math.floor(left / 60000), s = Math.floor(left % 60000 / 1000); timer = `<span class="hearts__timer">${AR_DIGITS(m)}:${AR_DIGITS(String(s).padStart(2, '0'))}</span>`; }
  return `<span class="hearts__icon">❤</span><span>${AR_DIGITS(save.hearts)}</span>${timer}`;
}
function renderHearts() { document.querySelectorAll('.hearts').forEach(el => el.innerHTML = heartsHtml()); }
setInterval(() => { const before = save.hearts; renderHearts(); if (save.hearts !== before) persist(); }, 1000);

/* ============ التقدّم ============ */
const starsOf = n => (save.levels[n] && save.levels[n].stars) || 0;
const totalStars = () => Object.values(save.levels).reduce((a, l) => a + (l.stars || 0), 0);
function currentLevel() { for (let n = 1; n <= TOTAL_LEVELS; n++) if (!starsOf(n)) return n; return TOTAL_LEVELS; }
const isUnlocked = n => n === 1 || starsOf(n - 1) > 0;
const seasonDone = s => { for (let i = 1; i <= PER_SEASON; i++) if (!starsOf(s * PER_SEASON + i)) return false; return true; };
const trophies = () => SEASONS.filter((_, s) => seasonDone(s)).length;

/* ============ الشاشات ============ */
const screens = { home: $('#screen-home'), levels: $('#screen-levels'), settings: $('#screen-settings'), stats: $('#screen-stats'), play: $('#screen-play') };
function show(name) {
  Object.entries(screens).forEach(([k, el]) => el.hidden = k !== name);
  if (name === 'home') renderHome(); if (name === 'levels') renderLevels(); if (name === 'settings') renderSettings(); if (name === 'stats') renderStats();
  if (name !== 'play') game.active = false;
  renderHearts();
}
document.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => show(b.dataset.nav)));

function renderHome() {
  $('#home-hero-name').textContent = save.name || 'البطل';
  $('#home-kit').style.background = save.kit;
  $('#home-points').textContent = save.points.toLocaleString('ar-EG');
  $('#home-stars').textContent = `${totalStars().toLocaleString('ar-EG')} / ${(TOTAL_LEVELS * 3).toLocaleString('ar-EG')}`;
  $('#home-level').textContent = AR_DIGITS(currentLevel());
  $('#home-cash').textContent = AR_DIGITS(save.cash);
  $('#home-kit').style.background = save.kit;
  $('#btn-play').textContent = currentLevel() === 1 && !starsOf(1) ? '▶ ابدأ' : `▶ المستوى ${AR_DIGITS(currentLevel())}`;
}
$('#btn-play').addEventListener('click', () => startLevel(currentLevel()));
$('#btn-levels').addEventListener('click', () => show('levels'));
$('#btn-settings').addEventListener('click', () => show('settings'));
$('#btn-stats').addEventListener('click', () => show('stats'));
function renderStats() {
  const st = save.stats, best = Object.values(save.levels).reduce((a, l) => Math.max(a, l.best || 0), 0);
  const rows = [['⚽ أهداف', st.goals], ['🎯 محاولات', st.attempts], ['🤝 أهداف بعد تمريرة', st.assists], ['🌀 كرات ملتفّة', st.curves], ['🪁 كرات عالية', st.lofts], ['⭐ نجوم', totalStars()], ['🏅 أفضل نتيجة في مستوى', best], ['💰 نقود', save.cash]];
  $('#stats-list').innerHTML = rows.map(([k, v]) => `<li><span>${k}</span><b>${AR_DIGITS(v)}</b></li>`).join('');
  $('#stats-rate').textContent = st.attempts ? `${AR_DIGITS(Math.round(100 * st.goals / st.attempts))}٪ نسبة التسجيل` : 'لم تلعب بعد';
  $('#stats-trophies').innerHTML = SEASONS.map((name, s) => `<div class="trophy ${seasonDone(s) ? 'trophy--won' : ''}"><span>🏆</span><small>${name}</small></div>`).join('');
}

function renderLevels() {
  const grid = $('#levels-grid'); grid.innerHTML = '';
  const cur = currentLevel();
  for (let s = 0; s < SEASONS.length; s++) {
    const sec = document.createElement('div'); sec.className = 'season';
    let got = 0; for (let i = 1; i <= PER_SEASON; i++) got += starsOf(s * PER_SEASON + i);
    sec.innerHTML = `<div class="season__head"><h3>${seasonDone(s) ? '🏆 ' : ''}${SEASONS[s]}</h3><span>★ ${AR_DIGITS(got)} / ${AR_DIGITS(PER_SEASON * 3)}</span></div><div class="season__grid"></div>`;
    const g = $('.season__grid', sec);
    for (let i = 1; i <= PER_SEASON; i++) {
      const n = s * PER_SEASON + i, st = starsOf(n), unlocked = isUnlocked(n);
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'lvl' + (st ? ' lvl--done' : '') + (n === cur ? ' lvl--current' : '') + (unlocked ? '' : ' lvl--locked');
      b.innerHTML = unlocked ? `${AR_DIGITS(n)}<span class="lvl__stars">${[1, 2, 3].map(k => `<i class="${k <= st ? 'on' : ''}">★</i>`).join('')}</span>` : '🔒';
      if (unlocked) b.addEventListener('click', () => startLevel(n));
      g.appendChild(b);
    }
    grid.appendChild(sec);
  }
  const curEl = $('.lvl--current', grid); if (curEl) setTimeout(() => curEl.scrollIntoView({ block: 'center' }), 0);
}

function renderSettings() {
  $('#set-name').value = save.name; $('#set-sound').checked = !!save.sound; $('#set-slowmo').checked = !!save.slowmo;
  const swatches = (id, list, key) => { const box = $(id); box.innerHTML = ''; list.forEach(c => { const b = document.createElement('button'); b.type = 'button'; b.style.background = c; b.className = c === save[key] ? 'on' : ''; b.setAttribute('aria-label', 'لون'); b.addEventListener('click', () => { save[key] = c; persist(); renderSettings(); }); box.appendChild(b); }); };
  swatches('#set-kits', KITS, 'kit'); swatches('#set-skins', SKINS, 'skin'); swatches('#set-hairs', HAIRS, 'hair');
  drawPreview();
}
$('#set-name').addEventListener('input', e => { save.name = e.target.value.trim() || 'البطل'; persist(); });
$('#set-sound').addEventListener('change', e => { save.sound = e.target.checked; persist(); if (save.sound) audio.whistle(); });
$('#set-slowmo').addEventListener('change', e => { save.slowmo = e.target.checked; persist(); });
$('#set-reset').addEventListener('click', () => {
  modal(`<div class="menu"><h3>مسح التقدّم؟</h3><p class="result__msg">ستُحذف النجوم والنقاط ولا يمكن التراجع.</p>
    <button class="btn btn--danger btn--block" id="m-reset">نعم، امسح</button><button class="btn btn--ghost btn--block" id="m-cancel">إلغاء</button></div>`);
  $('#m-reset').addEventListener('click', () => { save = Object.assign({}, DEFAULTS, { stats: Object.assign({}, DEFAULTS.stats), name: save.name, kit: save.kit, skin: save.skin, hair: save.hair, sound: save.sound, slowmo: save.slowmo }); persist(); closeModal(); show('home'); toast('تم مسح التقدّم'); });
  $('#m-cancel').addEventListener('click', closeModal);
});

function modal(html) { $('#modal-body').innerHTML = html; $('#modal').hidden = false; }
function closeModal() { $('#modal').hidden = true; }

/* ============ اللعبة ============ */
const canvas = $('#pitch'), ctx = canvas.getContext('2d');
const game = { active: false, level: null, state: null, last: 0, view: null, shake: 0, confetti: [], raf: 0 };

function startLevel(n) {
  syncHearts();
  if (save.hearts <= 0) { noHeartsModal(); return; }
  game.level = generateLevel(n);
  resetState(false);
  show('play');
  game.active = true; game.last = 0;
  $('#hud-season').textContent = SEASONS[game.level.season - 1];
  $('#hud-level').textContent = `المستوى ${AR_DIGITS(n)}`;
  renderScoreboard();
  const hint = $('#hint'); hint.hidden = !game.level.hint; hint.textContent = game.level.hint;
  $('#objective').textContent = `الهدف: سجّل خلال ${AR_DIGITS(game.level.par)} ${game.level.par === 1 ? 'لمسة' : 'لمسات'} لتحصل على ثلاث نجوم`;
  audio.whistle();
  cancelAnimationFrame(game.raf); game.raf = requestAnimationFrame(loop);
}
function noHeartsModal() {
  renderHearts();
  modal(`<div class="result"><div class="result__title result__title--bad">لا قلوب متبقية</div><p class="result__msg">يعود قلب كل دقيقتين. استرح قليلاً وعد للتسجيل!</p><div class="hearts" id="hearts-modal">${heartsHtml()}</div>
    <div class="result__actions"><button class="btn btn--ghost btn--block" id="m-home">الرئيسية</button></div></div>`);
  $('#m-home').addEventListener('click', () => { closeModal(); show('home'); });
}
function resetState(keepTouches) {
  const L = game.level;
  const s = game.state;
  game.state = {
    phase: 'aim', time: 0, touches: keepTouches && s ? s.touches : 0,
    holder: { x: L.ball.x, y: L.ball.y }, holderIdx: -1,
    ball: { x: L.ball.x, y: L.ball.y, h: 0, vx: 0, vy: 0, spin: 0 },
    path: null, pathS: 0, speed: 0, loft: 0, curve: 0,
    gk: { x: 50, y: GK_Y, vx: 0, timer: 0, dive: 0, face: 0, target: null, lastTarget: 50 },
    defenders: L.defenders.map(d => ({ x: d.x, y: d.y, hx: d.x, hy: d.y, react: d.react, patrol: d.patrol, face: 0 })),
    teammates: L.teammates.map(t => ({ x: t.x, y: t.y, hx: t.x, hy: t.y })),
    drag: null, result: null, kickedAt: 0, lastKicker: null, hero: { x: L.ball.x, y: L.ball.y + 5 }, slow: 1,
  };
  game.confetti = []; game.shake = 0;
  updateTouchesHud();
}
function renderScoreboard() {
  const m = game.level.match, st = game.state, scored = st && st.result === 'goal' ? 1 : 0;
  $('#scoreboard').innerHTML = `<span class="sb__club"><i style="background:${save.kit}"></i>${m.home}</span><b>${AR_DIGITS(m.homeGoals + scored)} - ${AR_DIGITS(m.awayGoals)}</b><span class="sb__club"><i style="background:#e63946"></i>${m.away}</span><span class="sb__min">${AR_DIGITS(m.minute + (st ? st.touches : 0))}'</span>`;
}
function updateTouchesHud() { const st = game.state; $('#hud-touches').textContent = `اللمسات ${AR_DIGITS(st.touches)} / ${AR_DIGITS(game.level.par)}`; }

/* --- الإسقاط المنظوري --- */
function computeView() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cw = canvas.clientWidth, ch = canvas.clientHeight;
  if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) { canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); }
  const top = Math.max(ch * .17, 132), bottom = ch - ch * .07;
  const ph = bottom - top, pw = Math.min(cw * .96, ph * .78);
  game.view = { dpr, cw, ch, top, ph, pw, cx: cw / 2 };
}
const widthScale = t => .62 + .38 * t;
function toScreen(wx, wy) {
  const v = game.view, t = wy / H;
  return { x: v.cx + (wx - 50) / 100 * v.pw * widthScale(t), y: v.top + t * v.ph, s: widthScale(t) * v.pw / 100 };
}
function toWorld(sx, sy) {
  const v = game.view, t = (sy - v.top) / v.ph;
  return { x: 50 + (sx - v.cx) / (v.pw * widthScale(clamp(t, 0, 1))) * 100, y: t * H };
}

/* --- الإدخال --- */
canvas.addEventListener('pointerdown', e => {
  const st = game.state; if (!game.active || !st || st.phase !== 'aim') return;
  canvas.setPointerCapture(e.pointerId);
  const w = toWorld(e.clientX - canvas.getBoundingClientRect().left, e.clientY - canvas.getBoundingClientRect().top);
  st.drag = { origin: w, raw: [{ x: st.holder.x, y: st.holder.y }], pts: [] };
  $('#hint').hidden = true;
  $('#meter').hidden = false;
});
canvas.addEventListener('pointermove', e => {
  const st = game.state; if (!st || !st.drag) return;
  const r = canvas.getBoundingClientRect();
  const w = toWorld(e.clientX - r.left, e.clientY - r.top);
  const p = { x: st.holder.x + (w.x - st.drag.origin.x), y: st.holder.y + (w.y - st.drag.origin.y) };
  const last = st.drag.raw[st.drag.raw.length - 1];
  if (dist(p, last) >= .8) st.drag.raw.push(p);
  st.drag.pts = buildPath(st.drag.raw);
  const L = pathLength(st.drag.pts);
  $('#meter-power').style.width = clamp(L / 110 * 100, 0, 100) + '%';
  const loft = loftFor(L);
  $('#meter-label').textContent = loft > 1 ? `القوة • كرة عالية (${AR_DIGITS(Math.round(loft))})` : 'القوة';
});
const endDrag = e => {
  const st = game.state; if (!st || !st.drag) return;
  const pts = st.drag.pts, drag = st.drag; st.drag = null; $('#meter').hidden = true;
  if (!pts || pathLength(pts) < 8) return;
  kick(pts);
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

function buildPath(raw) {
  if (raw.length < 2) return raw.slice();
  let pts = raw;
  for (let k = 0; k < 2; k++) { // تنعيم
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) out.push({ x: (pts[i - 1].x + pts[i].x * 2 + pts[i + 1].x) / 4, y: (pts[i - 1].y + pts[i].y * 2 + pts[i + 1].y) / 4 });
    out.push(pts[pts.length - 1]); pts = out;
  }
  const res = [pts[0]]; let acc = 0; // إعادة أخذ عيّنات كل وحدة
  for (let i = 1; i < pts.length; i++) {
    let a = pts[i - 1], b = pts[i], d = dist(a, b);
    while (acc + d >= 1) { const t = (1 - acc) / d; const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; res.push(p); a = p; d = dist(a, b); acc = 0; }
    acc += d;
  }
  return res;
}
const pathLength = pts => pts.length ? pts.length - 1 : 0;
const loftFor = L => clamp((L - 60) * .4, 0, 14);
function curveOf(pts) { if (pts.length < 3) return 0; const a = pts[0], b = pts[pts.length - 1]; let m = 0; for (const p of pts) m = Math.max(m, distPointSeg(p, a, b)); return m; }

function kick(pts) {
  const st = game.state, L = pathLength(pts);
  st.snapshot = JSON.parse(JSON.stringify({ holder: st.holder, holderIdx: st.holderIdx, touches: st.touches, ball: st.ball, teammates: st.teammates, defenders: st.defenders, gk: st.gk, hero: st.hero, time: st.time }));
  st.path = pts; st.pathS = 0; st.speed = clamp(L * 1.1 + 22, 36, 115); st.loft = loftFor(L); st.curve = curveOf(pts);
  st.ball.x = pts[0].x; st.ball.y = pts[0].y; st.ball.h = 0;
  st.phase = 'flight'; st.kickedAt = st.time; st.lastKicker = st.holderIdx;
  st.touches++; updateTouchesHud();
  st.gk.timer = 0; st.gk.target = null; st.gk.lastTarget = st.gk.x;
  if (!game.headless) audio.kick(st.speed / 115);
}

/* --- المحاكاة --- */
function update(dt) {
  const st = game.state, L = game.level;
  st.time += dt;
  // المدافعون
  for (const d of st.defenders) {
    if (d.patrol) { const tx = d.hx + Math.sin(st.time * d.patrol.speed / 10 + d.patrol.phase) * d.patrol.amp; d.face = tx > d.x ? 1 : -1; d.x = tx; }
    if (st.phase === 'flight' && d.react > 0) {
      const b = st.ball, dx = b.x - d.x, dy = b.y - d.y, dd = Math.hypot(dx, dy) || 1;
      const nx = d.x + dx / dd * d.react * dt, ny = d.y + dy / dd * d.react * dt;
      if (Math.hypot(nx - (d.patrol ? d.x : d.hx), ny - d.hy) <= 10) { d.x = nx; d.y = ny; d.face = dx > 0 ? 1 : -1; }
    }
  }
  if (st.phase !== 'flight') {
    // الحارس يعود نحو مركز المرمى مع ميل بسيط نحو الكرة
    const g = st.gk, tx = 50 + (st.ball.x - 50) * .2, dx = tx - g.x, step = L.gk.speed * .5 * dt;
    g.x += Math.abs(dx) <= step ? dx : Math.sign(dx) * step; g.dive = 0; g.face = Math.abs(dx) > .5 ? Math.sign(dx) : 0;
    return;
  }
  const b = st.ball;
  const prev = { x: b.x, y: b.y };
  if (st.path && st.pathS < pathLength(st.path)) {
    st.pathS += st.speed * dt;
    const s = Math.min(st.pathS, pathLength(st.path)), i = Math.floor(s), f = s - i;
    const p0 = st.path[i], p1 = st.path[Math.min(i + 1, st.path.length - 1)];
    b.x = p0.x + (p1.x - p0.x) * f; b.y = p0.y + (p1.y - p0.y) * f;
    b.vx = (b.x - prev.x) / dt; b.vy = (b.y - prev.y) / dt;
    b.h = st.loft * Math.sin(Math.PI * s / pathLength(st.path));
    if (st.pathS >= pathLength(st.path)) { const d = Math.hypot(b.vx, b.vy) || 1; b.vx = b.vx / d * st.speed; b.vy = b.vy / d * st.speed; }
  } else {
    const sp = Math.hypot(b.vx, b.vy);
    const nsp = Math.max(0, sp * Math.exp(-.9 * dt) - 14 * dt);
    if (sp > 0) { b.vx *= nsp / sp; b.vy *= nsp / sp; }
    b.x += b.vx * dt; b.y += b.vy * dt; b.h = Math.max(0, b.h - 30 * dt);
    if (nsp < 3) { finish('stop'); return; }
  }
  b.spin += Math.hypot(b.vx, b.vy) * dt * .15;

  // الحارس
  const gk = st.gk;
  if (b.vy < -1 && b.y < 95) {
    gk.timer += dt;
    if (gk.timer >= L.gk.reaction) {
      if (b.y < 18 && gk.target == null) gk.target = gk.lastTarget; // يلتزم باتجاهه قرب المرمى
      let px = gk.target;
      if (px == null) {
        const tcross = (b.y - GK_Y) / -b.vy;
        px = clamp(b.x * .4 + (b.x + b.vx * tcross) * .6, GOAL_L + 1, GOAL_R - 1);
        gk.lastTarget = px;
      }
      const dx = px - gk.x, step = L.gk.speed * dt;
      gk.x += Math.abs(dx) <= step ? dx : Math.sign(dx) * step;
      gk.face = Math.sign(dx);
      gk.dive = b.y < 22 && Math.abs(dx) > 2 ? Math.sign(dx) : 0;
    }
  } else { gk.dive = 0; gk.target = null; }
  // زملاء يستلمون
  st.teammates.forEach((t, i) => {
    if (i === st.lastKicker && st.time - st.kickedAt < .35) return;
    if (dist(t, b) < 3.8 && b.h < 6) { receive(i); }
  });
  if (st.phase !== 'flight') return;
  // اعتراض المدافعين
  for (const d of st.defenders) if (dist(d, b) < 3.6 && b.h < 7) { finish('block'); return; }
  // الحارس يصد
  const reach = L.gk.reach + (gk.dive ? 1.5 : 0);
  if (b.y < 14 && Math.hypot(b.x - gk.x, b.y - gk.y) < reach && b.h < 11) { finish('save'); return; }
  // خطوط الملعب
  if (b.x < -1 || b.x > W + 1 || b.y > H + 1) { finish('out'); return; }
  if (b.y <= 0) {
    if (Math.abs(b.x - GOAL_L) < 1.4 || Math.abs(b.x - GOAL_R) < 1.4) { if (b.h < GOAL_H + 1) { finish('post'); return; } }
    if (b.x > GOAL_L && b.x < GOAL_R) { if (b.h < GOAL_H) { finish('goal'); return; } else { finish('over'); return; } }
    finish('wide'); return;
  }
}
function receive(i) {
  const st = game.state, t = st.teammates[i];
  st.phase = 'aim'; st.holder = { x: t.x, y: t.y }; st.holderIdx = i; st.path = null;
  st.ball.x = t.x; st.ball.y = t.y + 2.5; st.ball.h = 0; st.ball.vx = st.ball.vy = 0;
  st.hero = { x: t.x, y: t.y };
  if (!game.headless) { audio.pass(); toast('تمريرة جميلة! سدّد الآن'); }
}
const MESSAGES = {
  goal: ['هدف!', 'هدف رائع!', 'يا لها من تسديدة!'], save: ['صدّها الحارس'], block: ['اعترضها المدافع'], post: ['القائم!'],
  over: ['فوق العارضة'], wide: ['بجانب المرمى'], out: ['خرجت الكرة'], stop: ['توقفت الكرة'],
};
function finish(kind) {
  const st = game.state; st.phase = 'done'; st.result = kind;
  if (game.headless) return;
  const banner = $('#banner'); banner.hidden = false;
  const msgs = MESSAGES[kind]; const msg = msgs[Math.floor(Math.random() * msgs.length)];
  save.stats.attempts++;
  if (kind === 'goal') {
    save.stats.goals++; if (st.touches >= 2) save.stats.assists++; if (st.curve >= 10) save.stats.curves++; if (st.ball.h >= 6) save.stats.lofts++;
    renderScoreboard();
    audio.goal(); game.shake = .6;
    for (let i = 0; i < 90; i++) game.confetti.push({ x: Math.random(), y: -.1 - Math.random() * .3, vy: .25 + Math.random() * .4, vx: (Math.random() - .5) * .3, c: ['#ffd21f', '#3ddc84', '#ff5c5c', '#fff', save.kit][i % 5], r: Math.random() * 6.28, s: 4 + Math.random() * 6 });
    const stars = starsFor();
    banner.className = 'banner banner--goal'; banner.innerHTML = `${msg}<small>${save.name}</small>`;
    setTimeout(() => resultModal(true, stars), 1400);
  } else {
    if (kind === 'save') audio.save(); else if (kind === 'block') audio.block(); else if (kind === 'post') audio.post(); else audio.out();
    if (kind === 'post') game.shake = .3;
    banner.className = 'banner banner--bad'; banner.textContent = msg;
    syncHearts(); save.hearts = Math.max(0, save.hearts - 1); if (save.hearts < MAX_HEARTS && !save.heartsAt) save.heartsAt = Date.now(); persist(); renderHearts();
    setTimeout(() => resultModal(false, 0, msg), 1100);
  }
}
function starsFor() {
  const st = game.state, L = game.level, b = st.ball;
  let stars = 1;
  if (st.touches <= L.par) stars++;
  const quality = Math.abs(b.x - st.gk.x) >= 8 || b.h >= 6 || st.curve >= 10;
  if (quality) stars++;
  return stars;
}
const prevStarsRef = n => starsOf(n);
function resultModal(goal, stars, msg) {
  $('#banner').hidden = true;
  const n = game.level.n, st = game.state;
  if (goal) {
    const pts = stars * 100 + Math.round(st.speed) + (st.curve >= 10 ? 50 : 0) + (st.ball.h >= 6 ? 40 : 0);
    const cash = stars * 20 + (st.curve >= 10 ? 10 : 0) + (st.ball.h >= 6 ? 10 : 0) + (!prevStarsRef(n) ? 20 : 0);
    const prevStars = starsOf(n);
    const rec = save.levels[n] || { stars: 0, best: 0 };
    rec.stars = Math.max(rec.stars, stars); rec.best = Math.max(rec.best, pts); save.levels[n] = rec;
    save.points += pts; save.cash += cash; persist();
    const wonTrophy = seasonDone(game.level.season - 1) && n % PER_SEASON === 0;
    const notes = [];
    if (st.curve >= 10) notes.push('كرة ملتفّة +٥٠'); if (st.ball.h >= 6) notes.push('كرة عالية +٤٠'); if (st.touches <= game.level.par) notes.push('ضمن اللمسات'); else notes.push(`تجاوزت اللمسات (${AR_DIGITS(st.touches)} من ${AR_DIGITS(game.level.par)})`);
    modal(`<div class="result"><div class="result__title result__title--goal">هدف!</div>
      <div class="result__stars">${[1, 2, 3].map(k => `<i class="${k <= stars ? 'on' : ''}">★</i>`).join('')}</div>
      <div class="result__pts"><b>+${AR_DIGITS(pts)}</b> نقطة • <b>+${AR_DIGITS(cash)}</b> 💰${stars > prevStars && prevStars ? ' • رقم جديد' : ''}</div>
      ${wonTrophy ? `<div class="result__trophy">🏆 فزت بكأس ${SEASONS[game.level.season - 1]}!</div>` : ''}
      <p class="result__msg">${notes.join(' • ')}</p>
      <div class="result__actions">
        ${n < TOTAL_LEVELS ? `<button class="btn btn--block" id="m-next">المستوى التالي</button>` : `<p class="result__msg">أنهيت كل المستويات! أنت أسطورة ⚽</p>`}
        ${stars < 3 ? `<button class="btn btn--ghost btn--block" id="m-retry">أعد اللعب لثلاث نجوم</button>` : ''}
        <button class="btn btn--ghost btn--block" id="m-levels">المستويات</button></div></div>`);
    const nx = $('#m-next'); if (nx) nx.addEventListener('click', () => { closeModal(); startLevel(n + 1); });
    const rt = $('#m-retry'); if (rt) rt.addEventListener('click', () => { closeModal(); startLevel(n); });
  } else {
    const tip = ({ save: 'سدّد بقوة نحو الزاوية البعيدة عن الحارس.', block: 'ارسم خطاً منحنياً أو مرّر لزميل في مكان مفتوح.', post: 'كان قريباً جداً! غيّر الزاوية قليلاً.', over: 'قصّر الخط قليلاً لتقلّ قوة الارتفاع.', wide: 'صوّب نحو داخل القائمين.', out: 'الخط اتجه خارج الملعب.', stop: 'ارسم خطاً أطول لتزيد القوة.' })[st.result];
    modal(`<div class="result"><div class="result__title result__title--bad">${msg}</div><p class="result__msg">${tip}</p>
      <div class="hearts">${heartsHtml()}</div>
      <div class="result__actions">
        <button class="btn btn--block" id="m-retry" ${save.hearts <= 0 ? 'disabled' : ''}>أعد المحاولة</button>
        <button class="btn btn--ghost btn--block" id="m-rewind" ${save.cash < REWIND_COST || !st.snapshot ? 'disabled' : ''}>⏪ إعادة اللقطة (${AR_DIGITS(REWIND_COST)} 💰) — يعيد القلب</button>
        <button class="btn btn--ghost btn--block" id="m-levels">المستويات</button></div></div>`);
    $('#m-retry').addEventListener('click', () => { closeModal(); startLevel(n); });
    $('#m-rewind').addEventListener('click', rewind);
  }
  $('#m-levels').addEventListener('click', () => { closeModal(); show('levels'); });
}
function rewind() {
  const st = game.state; if (!st.snapshot || save.cash < REWIND_COST) return;
  save.cash -= REWIND_COST; syncHearts(); save.hearts = Math.min(MAX_HEARTS, save.hearts + 1); if (save.hearts >= MAX_HEARTS) save.heartsAt = 0; persist(); renderHearts();
  const snap = st.snapshot;
  Object.assign(st, snap, { phase: 'aim', result: null, path: null, drag: null, snapshot: null, slow: 1 });
  st.ball.vx = st.ball.vy = 0; st.ball.h = 0;
  closeModal(); $('#banner').hidden = true; game.shake = 0; game.confetti = [];
  updateTouchesHud(); renderScoreboard(); toast('أُعيدت اللقطة. حاول مجدداً');
}
$('#btn-pause').addEventListener('click', () => {
  if (!game.active) return;
  modal(`<div class="menu"><h3>توقّف</h3>
    <button class="btn btn--block" id="m-resume">متابعة</button>
    <button class="btn btn--ghost btn--block" id="m-restart">إعادة المستوى</button>
    <button class="btn btn--ghost btn--block" id="m-levels">المستويات</button>
    <button class="btn btn--ghost btn--block" id="m-home">الرئيسية</button></div>`);
  $('#m-resume').addEventListener('click', closeModal);
  $('#m-restart').addEventListener('click', () => { closeModal(); $('#banner').hidden = true; startLevel(game.level.n); });
  $('#m-levels').addEventListener('click', () => { closeModal(); $('#banner').hidden = true; show('levels'); });
  $('#m-home').addEventListener('click', () => { closeModal(); $('#banner').hidden = true; show('home'); });
});

/* --- الحلقة --- */
function loop(ts) {
  if (!game.active) return;
  game.raf = requestAnimationFrame(loop);
  if (!game.last) game.last = ts;
  let dt = Math.min(.05, (ts - game.last) / 1000); game.last = ts;
  const st = game.state;
  st.slow = (save.slowmo && st.phase === 'flight' && st.ball.y < 26 && st.ball.vy < 0) ? .4 : 1;
  const sdt = dt * st.slow;
  if (!$('#modal').hidden) { draw(dt); return; }
  const steps = 3; for (let i = 0; i < steps; i++) { if (st.phase === 'done') break; update(sdt / steps); }
  if (st.phase === 'done') st.time += sdt;
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt);
  for (const c of game.confetti) { c.y += c.vy * dt; c.x += c.vx * dt; c.r += dt * 4; }
  game.confetti = game.confetti.filter(c => c.y < 1.2);
  draw(dt);
}

/* --- الرسم --- */
function draw(dt) {
  computeView();
  const v = game.view, st = game.state, L = game.level;
  ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
  ctx.clearRect(0, 0, v.cw, v.ch);
  ctx.save();
  if (game.shake > 0) ctx.translate((Math.random() - .5) * game.shake * 14, (Math.random() - .5) * game.shake * 14);

  // الخلفية والمدرجات
  const sky = ctx.createLinearGradient(0, 0, 0, v.top); sky.addColorStop(0, '#071a11'); sky.addColorStop(1, '#0e3a24');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, v.cw, v.top + 2);
  drawCrowd(v);
  // العشب
  const quad = (y0, y1, color) => { const a = toScreen(-3, y0), b = toScreen(103, y0), c = toScreen(103, y1), d = toScreen(-3, y1); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill(); };
  quad(-10, 0, '#2f8f4e');
  for (let i = 0; i < 10; i++) quad(i * 15, (i + 1) * 15, i % 2 ? '#2f8f4e' : '#35a158');
  // خطوط
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  const poly = (pts, close) => { ctx.beginPath(); pts.forEach((p, i) => { const s = toScreen(p[0], p[1]); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); }); if (close) ctx.closePath(); ctx.stroke(); };
  poly([[0, 0], [100, 0], [100, 150], [0, 150]], true);
  poly([[20, 0], [20, 26], [80, 26], [80, 0]]);
  poly([[40, 0], [40, 9], [60, 9], [60, 0]]);
  { const c = toScreen(50, 18); ctx.beginPath(); ctx.arc(c.x, c.y, 2.5, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); }
  { ctx.beginPath(); for (let a = 0; a <= 64; a++) { const ang = Math.PI * (.25 + .5 * a / 64); const s = toScreen(50 + Math.cos(ang) * 14, 18 + Math.sin(ang) * 14); a ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); } ctx.stroke(); }
  poly([[0, 120], [100, 120]]);
  { ctx.beginPath(); for (let a = 0; a <= 64; a++) { const ang = Math.PI + Math.PI * a / 64; const s = toScreen(50 + Math.cos(ang) * 14, 120 + Math.sin(ang) * 14); a ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); } ctx.stroke(); }

  // المرمى (الشبكة خلف)
  drawGoal(v, false);

  // مسار الرسم
  if (st.drag && st.drag.pts && st.drag.pts.length > 1) {
    ctx.save(); ctx.setLineDash([6, 8]); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineCap = 'round';
    ctx.beginPath(); st.drag.pts.forEach((p, i) => { const s = toScreen(p.x, p.y); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); }); ctx.stroke();
    const e = toScreen(st.drag.pts[st.drag.pts.length - 1].x, st.drag.pts[st.drag.pts.length - 1].y);
    ctx.setLineDash([]); ctx.fillStyle = '#ffd21f'; ctx.beginPath(); ctx.arc(e.x, e.y, 7, 0, 7); ctx.fill();
    ctx.restore();
  } else if (st.phase === 'flight' && st.path) {
    ctx.save(); ctx.setLineDash([4, 10]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath(); st.path.forEach((p, i) => { const s = toScreen(p.x, p.y); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); }); ctx.stroke(); ctx.restore();
  }

  // اللاعبون مرتّبون بالعمق
  const ents = [];
  ents.push({ y: st.gk.y, draw: () => drawPlayer(st.gk.x, st.gk.y, '#ffb703', '#111', st.gk.dive ? st.gk.dive : st.gk.face, true, '1') });
  st.defenders.forEach((d, i) => ents.push({ y: d.y, draw: () => drawPlayer(d.x, d.y, '#e63946', '#fff', d.face, false, String(i + 2)) }));
  st.teammates.forEach((t, i) => ents.push({ y: t.y, draw: () => drawPlayer(t.x, t.y, save.kit, '#fff', 0, false, String(i + 7), st.holderIdx === i) }));
  if (st.holderIdx === -1) ents.push({ y: st.hero.y, draw: () => drawPlayer(st.hero.x, st.hero.y, save.kit, '#fff', 0, false, '10', true, save.skin, save.hair) });
  ents.push({ y: st.ball.y + .01, draw: () => drawBall() });
  ents.sort((a, b) => a.y - b.y).forEach(e => e.draw());

  // القائمان أمام
  drawGoal(v, true);

  // قصاصات
  for (const c of game.confetti) { ctx.save(); ctx.translate(c.x * v.cw, c.y * v.ch); ctx.rotate(c.r); ctx.fillStyle = c.c; ctx.fillRect(-c.s / 2, -c.s / 4, c.s, c.s / 2); ctx.restore(); }
  // تعتيم الحركة البطيئة
  if (st.slow < 1) { ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(0, 0, v.cw, v.ch); }
  ctx.restore();
}
function drawCrowd(v) {
  const rng = makeRng(7);
  const rows = 4;
  for (let r = 0; r < rows; r++) {
    const y = v.top * (.25 + .18 * r);
    ctx.fillStyle = r % 2 ? '#122e21' : '#163828'; ctx.fillRect(0, y - 5, v.cw, v.top * .18);
    for (let x = 0; x < v.cw; x += 9) { ctx.fillStyle = `hsl(${rng() * 360},50%,${35 + rng() * 30}%)`; ctx.beginPath(); ctx.arc(x + rng() * 4, y + rng() * 4, 2.5, 0, 7); ctx.fill(); }
  }
}
function drawGoal(v, front) {
  const l = toScreen(GOAL_L, 0), r = toScreen(GOAL_R, 0), lb = toScreen(GOAL_L, -7), rb = toScreen(GOAL_R, -7);
  const gh = GOAL_H * (v.ph / H) * 1.15;
  if (!front) {
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.moveTo(l.x, l.y - gh); ctx.lineTo(r.x, r.y - gh); ctx.lineTo(rb.x, rb.y - gh * .85); ctx.lineTo(lb.x, lb.y - gh * .85); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.moveTo(lb.x, lb.y - gh * .85); ctx.lineTo(rb.x, rb.y - gh * .85); ctx.lineTo(rb.x, rb.y); ctx.lineTo(lb.x, lb.y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 12; i++) { const t = i / 12; ctx.beginPath(); ctx.moveTo(l.x + (r.x - l.x) * t, l.y - gh); ctx.lineTo(lb.x + (rb.x - lb.x) * t, lb.y); ctx.stroke(); }
    for (let i = 0; i <= 6; i++) { const t = i / 6; ctx.beginPath(); ctx.moveTo(l.x + (lb.x - l.x) * t, l.y - gh + (lb.y - l.y + gh * .15) * t); ctx.lineTo(r.x + (rb.x - r.x) * t, r.y - gh + (rb.y - r.y + gh * .15) * t); ctx.stroke(); }
    for (let i = 0; i <= 5; i++) { const t = i / 5; ctx.beginPath(); ctx.moveTo(lb.x + (rb.x - lb.x) * t, lb.y - gh * .85); ctx.lineTo(lb.x + (rb.x - lb.x) * t, lb.y); ctx.stroke(); }
    ctx.restore();
  } else {
    ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 4;
    ctx.beginPath(); ctx.moveTo(l.x, l.y + 2); ctx.lineTo(l.x, l.y - gh); ctx.lineTo(r.x, r.y - gh); ctx.lineTo(r.x, r.y + 2); ctx.stroke();
    ctx.restore();
  }
}
function drawPlayer(wx, wy, kit, numColor, face, isGk, num, isHero, skin, hair) {
  const s = toScreen(wx, wy), r = s.s * 3.2;
  ctx.save();
  // ظل
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(s.x, s.y + r * .2, r * 1.1, r * .45, 0, 0, 7); ctx.fill();
  if (isHero) { ctx.strokeStyle = 'rgba(255,210,31,.9)'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.ellipse(s.x, s.y + r * .2, r * 1.6, r * .7, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  const lean = face ? face * r * .5 : 0;
  // الجسد
  ctx.translate(s.x, s.y - r * .9);
  ctx.fillStyle = kit; ctx.beginPath(); ctx.ellipse(lean * .3, 0, r * (face ? 1.25 : 1), r * .85, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  // الذراعان
  ctx.strokeStyle = kit; ctx.lineWidth = r * .35; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-r * .8, 0); ctx.lineTo(-r * 1.2 + lean, r * .35); ctx.moveTo(r * .8, 0); ctx.lineTo(r * 1.2 + lean, r * .35); ctx.stroke();
  // الرأس
  ctx.fillStyle = skin || '#e8b894'; ctx.beginPath(); ctx.arc(lean * .5, -r * .55, r * .5, 0, 7); ctx.fill();
  ctx.fillStyle = hair || (isGk ? '#2b2b2b' : '#3a2416'); ctx.beginPath(); ctx.arc(lean * .5, -r * .62, r * .5, Math.PI, 0); ctx.fill();
  // الرقم
  ctx.fillStyle = numColor; ctx.font = `bold ${Math.max(7, r * .8)}px Tajawal, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(num, lean * .3, r * .15);
  ctx.restore();
}
function drawBall() {
  const st = game.state, b = st.ball, s = toScreen(b.x, b.y), r = s.s * 1.6;
  const lift = b.h * s.s * 1.1;
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${.3 - Math.min(.2, b.h * .015)})`; ctx.beginPath(); ctx.ellipse(s.x, s.y, r * (1 + b.h * .05), r * .5 * (1 + b.h * .05), 0, 0, 7); ctx.fill();
  ctx.translate(s.x, s.y - lift - r * .4);
  ctx.rotate(b.spin);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.fillStyle = '#1b1b1b';
  for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283; ctx.beginPath(); ctx.arc(Math.cos(a) * r * .55, Math.sin(a) * r * .55, r * .22, 0, 7); ctx.fill(); }
  ctx.beginPath(); ctx.arc(0, 0, r * .18, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
  ctx.restore();
}

function drawPreview() {
  const pc = $('#hero-preview'); if (!pc) return;
  const pctx = pc.getContext('2d'), r = 26;
  pctx.clearRect(0, 0, pc.width, pc.height); pctx.save(); pctx.translate(pc.width / 2, pc.height / 2 + 14);
  pctx.fillStyle = 'rgba(0,0,0,.3)'; pctx.beginPath(); pctx.ellipse(0, r * .2, r * 1.1, r * .45, 0, 0, 7); pctx.fill();
  pctx.translate(0, -r * .9);
  pctx.fillStyle = save.kit; pctx.beginPath(); pctx.ellipse(0, 0, r, r * .85, 0, 0, 7); pctx.fill();
  pctx.strokeStyle = save.kit; pctx.lineWidth = r * .35; pctx.lineCap = 'round'; pctx.beginPath(); pctx.moveTo(-r * .8, 0); pctx.lineTo(-r * 1.2, r * .35); pctx.moveTo(r * .8, 0); pctx.lineTo(r * 1.2, r * .35); pctx.stroke();
  pctx.fillStyle = save.skin; pctx.beginPath(); pctx.arc(0, -r * .55, r * .5, 0, 7); pctx.fill();
  pctx.fillStyle = save.hair; pctx.beginPath(); pctx.arc(0, -r * .62, r * .5, Math.PI, 0); pctx.fill();
  pctx.fillStyle = '#fff'; pctx.font = `bold ${r * .8}px Tajawal, sans-serif`; pctx.textAlign = 'center'; pctx.textBaseline = 'middle'; pctx.fillText('10', 0, r * .15);
  pctx.restore();
}

/* ============ تشغيل ============ */
window.addEventListener('resize', () => { if (game.active) draw(0); });
document.addEventListener('visibilitychange', () => { if (document.hidden) game.last = 0; });
if ('serviceWorker' in navigator && location.protocol !== 'file:') { window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {})); }
renderHearts();
show('home');
function simulate(n, shots) { // محاكاة بلا رسم (للاختبار)
  const prevLevel = game.level, prevState = game.state;
  game.headless = true; game.level = generateLevel(n); resetState(false);
  const st = game.state; let result = null;
  for (const pts of shots) {
    if (st.phase !== 'aim') break;
    const path = buildPath([{ x: st.holder.x, y: st.holder.y }, ...pts]);
    if (pathLength(path) < 8) break;
    kick(path);
    let guard = 0; while (st.phase === 'flight' && guard++ < 20000) update(1 / 240);
  }
  result = { result: st.result, touches: st.touches, phase: st.phase, stars: st.result === 'goal' ? starsFor() : 0 };
  game.headless = false; game.level = prevLevel; game.state = prevState;
  return result;
}
window.__haddaf = { game, generateLevel, solvePar, kick, startLevel, simulate, SALTS, get save() { return save; } };
})();
