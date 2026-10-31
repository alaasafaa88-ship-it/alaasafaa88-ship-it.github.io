/* فاتورتي - تطبيق فواتير عربي. كل البيانات على جهاز المستخدم (localStorage). */
(() => {
'use strict';

/* ---------- data layer ---------- */
const KEY = 'fatoorati.v1';
const CURRENCIES = {
  SAR:{label:'ريال سعودي',sym:'ر.س',dec:2}, AED:{label:'درهم إماراتي',sym:'د.إ',dec:2}, KWD:{label:'دينار كويتي',sym:'د.ك',dec:3},
  QAR:{label:'ريال قطري',sym:'ر.ق',dec:2}, BHD:{label:'دينار بحريني',sym:'د.ب',dec:3}, OMR:{label:'ريال عماني',sym:'ر.ع',dec:3},
  EGP:{label:'جنيه مصري',sym:'ج.م',dec:2}, JOD:{label:'دينار أردني',sym:'د.أ',dec:3}, IQD:{label:'دينار عراقي',sym:'د.ع',dec:0},
  MAD:{label:'درهم مغربي',sym:'د.م',dec:2}, USD:{label:'دولار أمريكي',sym:'$',dec:2}, EUR:{label:'يورو',sym:'€',dec:2},
};
const ACCENTS = ['#1d4ed8','#0f766e','#7c3aed','#be123c','#d97706','#111827'];
const STATUS = {
  invoice: {draft:'مسودة',sent:'مرسلة',paid:'مدفوعة',overdue:'متأخرة'},
  estimate:{draft:'مسودة',sent:'مرسل',accepted:'مقبول',declined:'مرفوض',converted:'حُوِّل لفاتورة'},
};
const defaults = () => ({
  settings:{
    business:{name:'',address:'',phone:'',email:'',vat:'',website:'',logo:''},
    currency:'SAR', taxRate:15, template:'classic', accent:ACCENTS[0],
    invPrefix:'INV-', invNext:1, estPrefix:'EST-', estNext:1, dueDays:14,
    notes:'شكراً لتعاملكم معنا.', terms:'يُرجى السداد خلال المدة المحددة. تُحتسب الأسعار شاملة ضريبة القيمة المضافة.',
    payment:'', signature:'', qr:true, onboarded:false,
  },
  clients:[], products:[], docs:[],
});
let db = load();
function load(){
  try{ const raw = localStorage.getItem(KEY); if(!raw) return defaults();
    const d = JSON.parse(raw); const base = defaults();
    return {...base, ...d, settings:{...base.settings, ...(d.settings||{}), business:{...base.settings.business, ...((d.settings||{}).business||{})}}};
  }catch(e){ return defaults(); }
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(db)); }catch(e){ toast('تعذّر الحفظ: مساحة التخزين ممتلئة'); } }
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const today = () => new Date().toISOString().slice(0,10);
const addDays = (iso,n) => { const d = new Date(iso); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };

/* ---------- helpers ---------- */
const $ = (s,el=document) => el.querySelector(s);
const $$ = (s,el=document) => [...el.querySelectorAll(s)];
const esc = s => String(s??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cur = () => CURRENCIES[db.settings.currency] || CURRENCIES.SAR;
function money(n){ const c = cur(); const v = Number(n||0).toLocaleString('en-US',{minimumFractionDigits:c.dec,maximumFractionDigits:c.dec}); return `${v} ${c.sym}`; }
function fmtDate(iso){ if(!iso) return '—'; const d = new Date(iso+'T00:00:00'); return d.toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{year:'numeric',month:'long',day:'numeric'}); }
let toastT; function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('is-on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('is-on'),2200); }
function openModal(title, html, after){ $('#modaltitle').textContent=title; $('#modalbody').innerHTML=html; $('#modal').hidden=false; after && after($('#modalbody')); const f=$('#modalbody').querySelector('input,select,textarea,button'); f && f.focus(); }
function closeModal(){ $('#modal').hidden=true; $('#modalbody').innerHTML=''; }
$('#modalclose').addEventListener('click', closeModal);
$('#modal').addEventListener('click', e => { if(e.target.id==='modal') closeModal(); });
document.addEventListener('keydown', e => { if(e.key==='Escape' && !$('#modal').hidden) closeModal(); });
function confirmBox(msg, onYes){ openModal('تأكيد', `<p>${esc(msg)}</p><div class="actions"><button class="btn btn--danger" id="cyes">نعم، متأكد</button><button class="btn btn--ghost" id="cno">إلغاء</button></div>`, b => { $('#cyes',b).onclick=()=>{closeModal(); onYes();}; $('#cno',b).onclick=closeModal; }); }
function applyAccent(){ document.documentElement.style.setProperty('--accent', db.settings.accent); document.documentElement.style.setProperty('--accent-soft', db.settings.accent+'22'); const m=$('meta[name=theme-color]'); m && (m.content=db.settings.accent); }

/* ---------- document math ---------- */
function calc(doc){
  let sub=0; for(const it of doc.items){ const line = (Number(it.qty)||0)*(Number(it.price)||0); const disc = line*((Number(it.discount)||0)/100); sub += line-disc; }
  const discount = doc.discountType==='amount' ? Math.min(Number(doc.discount)||0, sub) : sub*((Number(doc.discount)||0)/100);
  const taxable = sub-discount; const tax = taxable*((Number(doc.taxRate)||0)/100); const total = taxable+tax;
  return {sub, discount, taxable, tax, total};
}
function lineTotal(it){ const line=(Number(it.qty)||0)*(Number(it.price)||0); return line - line*((Number(it.discount)||0)/100); }
function isOverdue(d){ return d.type==='invoice' && d.status==='sent' && d.dueDate && d.dueDate < today(); }
function effStatus(d){ return isOverdue(d) ? 'overdue' : d.status; }
function newDoc(type){
  const s = db.settings;
  return { id:uid(), type, number:'', date:today(), dueDate:addDays(today(), s.dueDays||14), client:{id:'',name:'',phone:'',email:'',address:'',vat:''},
    items:[{desc:'',qty:1,price:'',discount:0}], discount:0, discountType:'percent', taxRate:s.taxRate, status:'draft', notes:s.notes, terms:s.terms, payment:s.payment, createdAt:Date.now() };
}
function assignNumber(doc){
  if(doc.number) return;
  const s=db.settings;
  if(doc.type==='invoice'){ doc.number = s.invPrefix + String(s.invNext).padStart(4,'0'); s.invNext++; }
  else { doc.number = s.estPrefix + String(s.estNext).padStart(4,'0'); s.estNext++; }
}

/* ---------- router ---------- */
const routes = [];
function route(re, fn){ routes.push([re, fn]); }
function navigate(h){ location.hash = h; }
function render(){
  const h = location.hash.replace(/^#/, '') || '/invoices';
  if(!db.settings.onboarded && !h.startsWith('/settings') && !h.startsWith('/welcome')){ location.hash = '#/welcome'; return; }
  for(const [re,fn] of routes){ const m = h.match(re); if(m){ fn(...m.slice(1)); break; } }
  $$('.tabbar a').forEach(a => a.classList.toggle('is-active', h.startsWith('/'+a.dataset.tab) || (a.dataset.tab==='invoices' && /^\/(edit|view)\//.test(h) && currentType==='invoice') || (a.dataset.tab==='estimates' && /^\/(edit|view)\//.test(h) && currentType==='estimate')));
  window.scrollTo(0,0);
}
let currentType = 'invoice';
function page(title, html, {back=null, actions=''}={}){
  $('#pagetitle').textContent = title; document.title = title + ' - فاتورتي';
  const b = $('#backbtn'); b.hidden = !back; b.onclick = () => navigate(back);
  $('#topactions').innerHTML = actions;
  $('#main').innerHTML = html;
}
window.addEventListener('hashchange', render);

/* ---------- S00 welcome ---------- */
route(/^\/welcome$/, () => {
  page('مرحباً بك', `
  <div class="card" style="text-align:center">
    <div class="empty__icon">🧾</div>
    <h2 style="margin-bottom:8px">فاتورتي</h2>
    <p style="color:var(--ink-2)">أنشئ فواتير وعروض أسعار احترافية بالعربية في دقيقة. بياناتك تبقى على جهازك ولا تحتاج إلى حساب.</p>
  </div>
  <div class="card">
    <h3 class="card__title">ابدأ ببيانات نشاطك</h3>
    <form id="wform">
      <div class="field"><label for="wname">اسم النشاط أو الشركة *</label><input class="input" id="wname" required maxlength="80" placeholder="مثال: مؤسسة النور للتجارة"></div>
      <div class="field"><label for="wphone">رقم الجوال</label><input class="input" id="wphone" type="tel" inputmode="tel" placeholder="05xxxxxxxx"></div>
      <div class="field"><label for="wcur">العملة</label><select class="select" id="wcur">${Object.entries(CURRENCIES).map(([k,v])=>`<option value="${k}" ${k===db.settings.currency?'selected':''}>${v.label} (${v.sym})</option>`).join('')}</select></div>
      <div class="field"><label for="wtax">نسبة الضريبة الافتراضية %</label><input class="input" id="wtax" type="number" inputmode="decimal" min="0" max="100" step="0.5" value="${db.settings.taxRate}"></div>
      <button class="btn btn--block" type="submit">ابدأ الآن</button>
      <p class="hint" style="margin-top:8px;text-align:center">يمكنك تعديل كل شيء لاحقاً من الإعدادات.</p>
    </form>
  </div>`);
  $('#wform').onsubmit = e => { e.preventDefault(); const s=db.settings; s.business.name=$('#wname').value.trim(); s.business.phone=$('#wphone').value.trim(); s.currency=$('#wcur').value; s.taxRate=Number($('#wtax').value)||0; s.onboarded=true; save(); toast('أهلاً بك!'); navigate('/invoices'); };
});

/* ---------- S01/S04 document lists ---------- */
function listPage(type){
  currentType = type;
  const isInv = type==='invoice';
  const q = (listState[type].q||'').trim(); const f = listState[type].f||'all';
  let docs = db.docs.filter(d => d.type===type).sort((a,b)=> (b.date.localeCompare(a.date)) || (b.createdAt-a.createdAt));
  const all = docs;
  if(f!=='all') docs = docs.filter(d => effStatus(d)===f);
  if(q) docs = docs.filter(d => (d.number+' '+d.client.name+' '+d.items.map(i=>i.desc).join(' ')).includes(q));
  const totals = {paid:0, due:0, overdue:0};
  for(const d of all){ const t=calc(d).total; const s=effStatus(d); if(s==='paid') totals.paid+=t; else if(s==='overdue') totals.overdue+=t; else if(s==='sent') totals.due+=t; }
  const filters = isInv ? {all:'الكل',draft:'مسودة',sent:'مرسلة',paid:'مدفوعة',overdue:'متأخرة'} : {all:'الكل',draft:'مسودة',sent:'مرسل',accepted:'مقبول',converted:'محوَّل'};
  page(isInv?'الفواتير':'عروض الأسعار', `
    ${installTip()}
    ${isInv && all.length ? `<div class="stats">
      <div class="stat stat--ok"><div class="stat__label">محصّل</div><div class="stat__value">${money(totals.paid)}</div></div>
      <div class="stat stat--warn"><div class="stat__label">مستحق</div><div class="stat__value">${money(totals.due)}</div></div>
      <div class="stat stat--bad"><div class="stat__label">متأخر</div><div class="stat__value">${money(totals.overdue)}</div></div></div>`:''}
    ${all.length ? `<input class="input search" id="q" type="search" placeholder="ابحث برقم ${isInv?'الفاتورة':'العرض'} أو اسم العميل" value="${esc(q)}" aria-label="بحث">
    <div class="chips" role="tablist">${Object.entries(filters).map(([k,v])=>`<button class="chip ${f===k?'is-active':''}" data-f="${k}" role="tab" aria-selected="${f===k}">${v}</button>`).join('')}</div>`:''}
    ${docs.length ? `<div class="list">${docs.map(d => { const t=calc(d).total; const s=effStatus(d); return `
      <a class="item" href="#/view/${d.id}">
        <div class="avatar">${esc((d.client.name||'؟').trim().charAt(0))}</div>
        <div class="item__main"><div class="item__title">${esc(d.client.name||'بدون عميل')}</div><div class="item__sub">${esc(d.number||'مسودة')} · ${fmtDate(d.date)}</div></div>
        <div style="text-align:end"><div class="item__amt">${money(t)}</div><span class="badge badge--${s}">${STATUS[type][s]}</span></div>
      </a>`;}).join('')}</div>`
    : all.length ? `<div class="empty"><div class="empty__icon">🔍</div><h2>لا نتائج</h2><p>جرّب كلمة بحث أو تصفية أخرى.</p></div>`
    : `<div class="empty"><div class="empty__icon">${isInv?'🧾':'📝'}</div><h2>${isInv?'لا توجد فواتير بعد':'لا توجد عروض أسعار بعد'}</h2><p>${isInv?'أنشئ أول فاتورة لك وأرسلها لعميلك كملف PDF خلال دقيقة.':'اكتب عرض سعر، وحوّله إلى فاتورة بنقرة عند الموافقة.'}</p><a class="btn" href="#/new/${type}">+ ${isInv?'فاتورة جديدة':'عرض سعر جديد'}</a></div>`}
    <a class="btn fab" href="#/new/${type}">+ ${isInv?'فاتورة جديدة':'عرض سعر'}</a>`);
  const qi = $('#q'); if(qi){ qi.oninput = () => { listState[type].q = qi.value; const pos=qi.selectionStart; listPage(type); const n=$('#q'); n.focus(); n.setSelectionRange(pos,pos); }; }
  $$('.chip').forEach(c => c.onclick = () => { listState[type].f = c.dataset.f; listPage(type); });
}
const listState = {invoice:{}, estimate:{}};
route(/^\/invoices$/, () => listPage('invoice'));
route(/^\/estimates$/, () => listPage('estimate'));
route(/^\/new\/(invoice|estimate)$/, type => { const d = newDoc(type); draft = d; navigate('/edit/'+d.id); });

/* ---------- S02 editor ---------- */
let draft = null;
route(/^\/edit\/([a-z0-9]+)$/, id => {
  let doc = (draft && draft.id===id) ? draft : db.docs.find(d => d.id===id);
  if(!doc){ navigate('/invoices'); return; }
  doc = draft = JSON.parse(JSON.stringify(doc)); currentType = doc.type;
  const isInv = doc.type==='invoice'; const isNew = !db.docs.some(d=>d.id===id);
  const t = calc(doc);
  page(isNew ? (isInv?'فاتورة جديدة':'عرض سعر جديد') : 'تعديل '+(doc.number||''), `
  <form id="eform" novalidate>
    <div class="card">
      <h3 class="card__title">العميل <button type="button" class="btn btn--soft btn--sm" id="pickclient">اختيار من العملاء</button></h3>
      <div class="field"><label for="cname">اسم العميل *</label><input class="input" id="cname" maxlength="80" value="${esc(doc.client.name)}" required></div>
      <div class="row row--2">
        <div class="field"><label for="cphone">الجوال</label><input class="input" id="cphone" type="tel" value="${esc(doc.client.phone)}"></div>
        <div class="field"><label for="cemail">البريد</label><input class="input" id="cemail" type="email" dir="ltr" value="${esc(doc.client.email)}"></div>
      </div>
      <div class="row row--2">
        <div class="field"><label for="caddr">العنوان</label><input class="input" id="caddr" value="${esc(doc.client.address)}"></div>
        <div class="field"><label for="cvat">الرقم الضريبي</label><input class="input" id="cvat" inputmode="numeric" value="${esc(doc.client.vat)}"></div>
      </div>
      <label class="hint" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="saveclient" ${doc.client.id?'':'checked'}> حفظ العميل في دفتر العملاء</label>
    </div>
    <div class="card">
      <h3 class="card__title">التفاصيل</h3>
      <div class="row row--2">
        <div class="field"><label for="dnum">الرقم</label><input class="input" id="dnum" dir="ltr" value="${esc(doc.number)}" placeholder="تلقائي"></div>
        <div class="field"><label for="ddate">التاريخ</label><input class="input" id="ddate" type="date" value="${doc.date}"></div>
      </div>
      <div class="row row--2">
        <div class="field"><label for="ddue">${isInv?'تاريخ الاستحقاق':'صالح حتى'}</label><input class="input" id="ddue" type="date" value="${doc.dueDate}"></div>
        <div class="field"><label for="dtax">الضريبة %</label><input class="input" id="dtax" type="number" inputmode="decimal" min="0" max="100" step="0.5" value="${doc.taxRate}"></div>
      </div>
    </div>
    <div class="card">
      <h3 class="card__title">البنود <button type="button" class="btn btn--soft btn--sm" id="pickproduct">من المنتجات</button></h3>
      <div class="lines" id="lines"></div>
      <button type="button" class="btn btn--ghost btn--block" id="addline" style="margin-top:12px">+ إضافة بند</button>
      <div class="row row--2" style="margin-top:16px">
        <div class="field"><label for="ddisc">خصم على الإجمالي</label><input class="input" id="ddisc" type="number" inputmode="decimal" min="0" step="0.01" value="${doc.discount||''}" placeholder="0"></div>
        <div class="field"><label for="ddisctype">نوع الخصم</label><select class="select" id="ddisctype"><option value="percent" ${doc.discountType==='percent'?'selected':''}>نسبة %</option><option value="amount" ${doc.discountType==='amount'?'selected':''}>مبلغ</option></select></div>
      </div>
      <div class="totals" id="totals"></div>
    </div>
    <div class="card">
      <h3 class="card__title">ملاحظات وشروط</h3>
      <div class="field"><label for="dnotes">ملاحظات للعميل</label><textarea class="textarea" id="dnotes">${esc(doc.notes)}</textarea></div>
      <div class="field"><label for="dterms">الشروط والأحكام</label><textarea class="textarea" id="dterms">${esc(doc.terms)}</textarea></div>
      <div class="field"><label for="dpay">تعليمات الدفع (آيبان، حساب بنكي، STC Pay...)</label><textarea class="textarea" id="dpay">${esc(doc.payment)}</textarea></div>
    </div>
    <p class="error" id="formerr" hidden></p>
    <div class="actions"><button class="btn" type="submit">حفظ ومعاينة</button><button class="btn btn--ghost" type="button" id="cancel">إلغاء</button></div>
  </form>`, {back: isInv?'/invoices':'/estimates'});

  const linesEl = $('#lines');
  function renderLines(){
    linesEl.innerHTML = doc.items.map((it,i) => `
      <div class="line" data-i="${i}">
        <div class="field" style="margin:0"><label for="ld${i}">الوصف</label><input class="input" id="ld${i}" data-k="desc" value="${esc(it.desc)}" placeholder="مثال: تصميم شعار" maxlength="200"></div>
        <div class="line__grid">
          <div class="field" style="margin:0"><label for="lq${i}">الكمية</label><input class="input" id="lq${i}" data-k="qty" type="number" inputmode="decimal" min="0" step="any" value="${it.qty}"></div>
          <div class="field" style="margin:0"><label for="lp${i}">السعر</label><input class="input" id="lp${i}" data-k="price" type="number" inputmode="decimal" min="0" step="any" value="${it.price}" placeholder="0"></div>
          <div class="field" style="margin:0"><label for="lx${i}">خصم %</label><input class="input" id="lx${i}" data-k="discount" type="number" inputmode="decimal" min="0" max="100" step="any" value="${it.discount||''}" placeholder="0"></div>
        </div>
        <div class="line__foot"><button type="button" class="btn btn--danger btn--sm" data-del="${i}" ${doc.items.length===1?'disabled':''}>حذف</button><b>${money(lineTotal(it))}</b></div>
      </div>`).join('');
    renderTotals();
  }
  function renderTotals(){
    const t = calc(doc);
    $('#totals').innerHTML = `<div><span>المجموع</span><span>${money(t.sub)}</span></div>${t.discount?`<div><span>الخصم</span><span>- ${money(t.discount)}</span></div>`:''}<div><span>الضريبة (${doc.taxRate}%)</span><span>${money(t.tax)}</span></div><div class="grand"><span>الإجمالي</span><span>${money(t.total)}</span></div>`;
  }
  renderLines();
  linesEl.addEventListener('input', e => { const inp=e.target; const i=+inp.closest('.line').dataset.i; doc.items[i][inp.dataset.k] = inp.value; $$('.line__foot b',linesEl)[i].textContent = money(lineTotal(doc.items[i])); renderTotals(); });
  linesEl.addEventListener('click', e => { const b=e.target.closest('[data-del]'); if(!b) return; doc.items.splice(+b.dataset.del,1); renderLines(); });
  $('#addline').onclick = () => { doc.items.push({desc:'',qty:1,price:'',discount:0}); renderLines(); $$('.line input',linesEl).at(-4).focus(); };
  const sync = () => { doc.client={...doc.client,name:$('#cname').value.trim(),phone:$('#cphone').value.trim(),email:$('#cemail').value.trim(),address:$('#caddr').value.trim(),vat:$('#cvat').value.trim()}; doc.number=$('#dnum').value.trim(); doc.date=$('#ddate').value||today(); doc.dueDate=$('#ddue').value; doc.taxRate=Number($('#dtax').value)||0; doc.discount=Number($('#ddisc').value)||0; doc.discountType=$('#ddisctype').value; doc.notes=$('#dnotes').value; doc.terms=$('#dterms').value; doc.payment=$('#dpay').value; };
  ['#dtax','#ddisc','#ddisctype'].forEach(s => $(s).addEventListener('input', () => { sync(); renderTotals(); }));
  $('#pickclient').onclick = () => pickClient(c => { doc.client={...c}; $('#cname').value=c.name; $('#cphone').value=c.phone||''; $('#cemail').value=c.email||''; $('#caddr').value=c.address||''; $('#cvat').value=c.vat||''; $('#saveclient').checked=false; });
  $('#pickproduct').onclick = () => pickProduct(p => { const empty = doc.items.findIndex(i=>!i.desc && !i.price); const it={desc:p.name,qty:1,price:p.price,discount:0}; if(empty>=0) doc.items[empty]=it; else doc.items.push(it); renderLines(); });
  $('#cancel').onclick = () => { draft=null; navigate(isNew ? (isInv?'/invoices':'/estimates') : '/view/'+id); };
  $('#eform').onsubmit = e => {
    e.preventDefault(); sync();
    const err = $('#formerr'); const problems=[];
    if(!doc.client.name) problems.push('اكتب اسم العميل.');
    doc.items = doc.items.filter(i => i.desc || Number(i.price));
    if(!doc.items.length) problems.push('أضف بنداً واحداً على الأقل بوصف وسعر.');
    if(doc.items.some(i => !i.desc)) problems.push('كل بند يحتاج إلى وصف.');
    if(problems.length){ err.hidden=false; err.textContent=problems.join(' '); $('#cname').setAttribute('aria-invalid', !doc.client.name); err.scrollIntoView({block:'center'}); if(!doc.items.length) doc.items.push({desc:'',qty:1,price:'',discount:0}); renderLines(); return; }
    if($('#saveclient').checked && doc.client.name){ const c={id:uid(),name:doc.client.name,phone:doc.client.phone,email:doc.client.email,address:doc.client.address,vat:doc.client.vat}; db.clients.push(c); doc.client.id=c.id; }
    assignNumber(doc);
    const idx = db.docs.findIndex(d=>d.id===doc.id); if(idx>=0) db.docs[idx]=doc; else db.docs.push(doc);
    draft=null; save(); toast('تم الحفظ'); navigate('/view/'+doc.id);
  };
});
function pickClient(cb){
  if(!db.clients.length){ toast('لا يوجد عملاء محفوظون بعد'); return; }
  openModal('اختر عميلاً', `<input class="input search" id="pq" placeholder="بحث"><div class="menu" id="plist"></div>`, b => {
    const draw = () => { const q=$('#pq',b).value.trim(); $('#plist',b).innerHTML = db.clients.filter(c=>c.name.includes(q)||(c.phone||'').includes(q)).map(c=>`<button type="button" class="btn btn--soft" data-id="${c.id}">${esc(c.name)} <span class="hint">${esc(c.phone||'')}</span></button>`).join('') || '<p class="hint">لا نتائج</p>'; };
    draw(); $('#pq',b).oninput=draw; $('#plist',b).onclick = e => { const x=e.target.closest('[data-id]'); if(!x) return; cb(db.clients.find(c=>c.id===x.dataset.id)); closeModal(); };
  });
}
function pickProduct(cb){
  if(!db.products.length){ toast('لا توجد منتجات محفوظة. أضفها من الإعدادات ← المنتجات'); return; }
  openModal('اختر منتجاً أو خدمة', `<input class="input search" id="pq" placeholder="بحث"><div class="menu" id="plist"></div>`, b => {
    const draw = () => { const q=$('#pq',b).value.trim(); $('#plist',b).innerHTML = db.products.filter(p=>p.name.includes(q)).map(p=>`<button type="button" class="btn btn--soft" data-id="${p.id}">${esc(p.name)} <span class="hint">${money(p.price)}${p.unit?' / '+esc(p.unit):''}</span></button>`).join('') || '<p class="hint">لا نتائج</p>'; };
    draw(); $('#pq',b).oninput=draw; $('#plist',b).onclick = e => { const x=e.target.closest('[data-id]'); if(!x) return; cb(db.products.find(p=>p.id===x.dataset.id)); closeModal(); };
  });
}

/* ---------- S03 viewer ---------- */
route(/^\/view\/([a-z0-9]+)$/, id => {
  const doc = db.docs.find(d => d.id===id); if(!doc){ navigate('/invoices'); return; }
  currentType = doc.type; const isInv = doc.type==='invoice'; const s = effStatus(doc); const t = calc(doc);
  const statusBtns = isInv
    ? [['sent','تعليم كمرسلة'],['paid','تعليم كمدفوعة'],['draft','إرجاع لمسودة']]
    : [['sent','تعليم كمرسل'],['accepted','مقبول'],['declined','مرفوض'],['draft','إرجاع لمسودة']];
  page(doc.number, `
    <div class="card no-print" style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
      <div><span class="badge badge--${s}">${STATUS[doc.type][s]}</span> <b style="margin-inline-start:8px">${money(t.total)}</b></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${statusBtns.filter(([k])=>k!==doc.status).map(([k,v])=>`<button class="btn btn--sm ${k==='paid'||k==='accepted'?'':'btn--soft'}" data-status="${k}">${v}</button>`).join('')}</div>
    </div>
    <div class="actions no-print">
      <button class="btn" id="pdf">⬇ تنزيل PDF</button>
      <button class="btn btn--soft" id="share">↗ مشاركة</button>
      <a class="btn btn--soft" href="#/edit/${doc.id}">✎ تعديل</a>
      <button class="btn btn--soft" id="more">⋯</button>
    </div>
    <div class="doc-wrap"><div id="docmount"></div></div>
    <p class="hint no-print" style="text-align:center">لحفظ PDF: اضغط «تنزيل PDF» ثم اختر «حفظ كـ PDF» من نافذة الطباعة.</p>`,
    {back: isInv?'/invoices':'/estimates'});
  $('#docmount').innerHTML = renderDoc(doc); drawQR(doc); fitDoc();
  $$('[data-status]').forEach(b => b.onclick = () => { doc.status=b.dataset.status; save(); toast('تم تحديث الحالة'); render(); });
  $('#pdf').onclick = () => window.print();
  $('#share').onclick = async () => {
    const text = `${isInv?'فاتورة':'عرض سعر'} ${doc.number} من ${db.settings.business.name}\nالعميل: ${doc.client.name}\nالإجمالي: ${money(t.total)}\n${isInv?'تاريخ الاستحقاق':'صالح حتى'}: ${fmtDate(doc.dueDate)}`;
    if(navigator.share){ try{ await navigator.share({title:doc.number, text}); }catch(e){} }
    else { try{ await navigator.clipboard.writeText(text); toast('نُسخ الملخص. استخدم «تنزيل PDF» لإرفاق الملف.'); }catch(e){ toast('المشاركة غير مدعومة في هذا المتصفح'); } }
  };
  $('#more').onclick = () => openModal('خيارات', `<div class="menu">
      ${!isInv && doc.status!=='converted' ? '<button class="btn" id="m-convert">↪ تحويل إلى فاتورة</button>':''}
      <button class="btn btn--soft" id="m-dup">⎘ نسخة مكررة</button>
      <button class="btn btn--danger" id="m-del">🗑 حذف</button></div>`, b => {
    const cv=$('#m-convert',b); if(cv) cv.onclick = () => { const n={...JSON.parse(JSON.stringify(doc)), id:uid(), type:'invoice', number:'', status:'draft', date:today(), dueDate:addDays(today(), db.settings.dueDays||14), createdAt:Date.now()}; assignNumber(n); db.docs.push(n); doc.status='converted'; save(); closeModal(); toast('أُنشئت الفاتورة '+n.number); navigate('/view/'+n.id); };
    $('#m-dup',b).onclick = () => { const n={...JSON.parse(JSON.stringify(doc)), id:uid(), number:'', status:'draft', date:today(), dueDate:addDays(today(), db.settings.dueDays||14), createdAt:Date.now()}; assignNumber(n); db.docs.push(n); save(); closeModal(); toast('تم النسخ'); navigate('/view/'+n.id); };
    $('#m-del',b).onclick = () => { closeModal(); confirmBox(`حذف ${doc.number} نهائياً؟`, () => { db.docs = db.docs.filter(d=>d.id!==doc.id); save(); toast('تم الحذف'); navigate(isInv?'/invoices':'/estimates'); }); };
  });
});
function fitDoc(){ const w = $('.doc-wrap'); if(!w) return; const avail = w.clientWidth - 16; const scale = Math.min(1, avail / (210*3.7795)); w.style.setProperty('--doc-scale', scale.toFixed(3)); }
window.addEventListener('resize', fitDoc);

function renderDoc(doc){
  const s=db.settings, b=s.business, t=calc(doc), isInv=doc.type==='invoice'; const st=effStatus(doc);
  const stamp = isInv && st==='paid' ? '<div class="doc__stamp">مدفوعة</div>' : isInv && st==='overdue' ? '<div class="doc__stamp" style="--stamp:#dc2626">متأخرة</div>' : (!isInv && st==='accepted') ? '<div class="doc__stamp">مقبول</div>' : '';
  return `<article class="doc doc--${s.template}" style="--doc-accent:${s.accent}" lang="ar" dir="rtl">
    ${stamp}
    <header class="doc__head">
      <div class="doc__brand">${b.logo?`<img class="doc__logo" src="${b.logo}" alt="">`:''}<div class="doc__biz"><b>${esc(b.name)}</b>${b.address?esc(b.address)+'<br>':''}${b.phone?esc(b.phone)+' ':''}${b.email?'· '+esc(b.email):''}${b.vat?'<br>الرقم الضريبي: '+esc(b.vat):''}${b.website?'<br>'+esc(b.website):''}</div></div>
      <div><div class="doc__kind">${isInv?(b.vat?'فاتورة ضريبية':'فاتورة'):'عرض سعر'}</div>
        <div class="doc__meta"><div><span>الرقم</span><span dir="ltr">${esc(doc.number)}</span></div><div><span>التاريخ</span><span>${fmtDate(doc.date)}</span></div><div><span>${isInv?'الاستحقاق':'صالح حتى'}</span><span>${fmtDate(doc.dueDate)}</span></div></div></div>
    </header>
    <section class="doc__parties">
      <div class="doc__party"><h4>${isInv?'فاتورة إلى':'عرض مقدم إلى'}</h4><b>${esc(doc.client.name)}</b>${doc.client.address?`<div>${esc(doc.client.address)}</div>`:''}${doc.client.phone?`<div>${esc(doc.client.phone)}</div>`:''}${doc.client.email?`<div dir="ltr" style="text-align:end">${esc(doc.client.email)}</div>`:''}${doc.client.vat?`<div>الرقم الضريبي: ${esc(doc.client.vat)}</div>`:''}</div>
      <div class="doc__party"><h4>${isInv?'حالة السداد':'ملخص'}</h4><b>${money(t.total)}</b><div>${isInv?STATUS.invoice[st]:doc.items.length+' بنود'}</div>${doc.payment?`<div style="margin-top:6px;white-space:pre-wrap">${esc(doc.payment)}</div>`:''}</div>
    </section>
    <table><thead><tr><th style="width:36px">#</th><th>الوصف</th><th class="num">الكمية</th><th class="num">السعر</th>${doc.items.some(i=>Number(i.discount))?'<th class="num">خصم</th>':''}<th class="num">الإجمالي</th></tr></thead>
    <tbody>${doc.items.map((it,i)=>`<tr><td>${i+1}</td><td>${esc(it.desc)}</td><td class="num">${Number(it.qty)||0}</td><td class="num">${money(it.price)}</td>${doc.items.some(x=>Number(x.discount))?`<td class="num">${Number(it.discount)||0}%</td>`:''}<td class="num">${money(lineTotal(it))}</td></tr>`).join('')}</tbody></table>
    <section class="doc__sum">
      <div class="doc__qr" id="qr"></div>
      <div class="doc__totals"><div><span>المجموع الفرعي</span><span>${money(t.sub)}</span></div>${t.discount?`<div><span>الخصم</span><span>- ${money(t.discount)}</span></div><div><span>الخاضع للضريبة</span><span>${money(t.taxable)}</span></div>`:''}<div><span>ضريبة القيمة المضافة ${doc.taxRate}%</span><span>${money(t.tax)}</span></div><div class="grand"><span>الإجمالي المستحق</span><span>${money(t.total)}</span></div></div>
    </section>
    <section class="doc__notes">${doc.notes?`<div><h4>ملاحظات</h4><p>${esc(doc.notes)}</p></div>`:'<div></div>'}${doc.terms?`<div><h4>الشروط والأحكام</h4><p>${esc(doc.terms)}</p></div>`:''}</section>
    ${s.signature?`<div class="doc__sign"><img src="${s.signature}" alt="التوقيع"><div>${esc(b.name)}</div></div>`:''}
    <footer class="doc__foot">${esc(b.name)}${b.phone?' · '+esc(b.phone):''}${b.email?' · '+esc(b.email):''} · أُنشئت بواسطة فاتورتي</footer>
  </article>`;
}
/* ZATCA phase-1 style TLV QR: seller, VAT no, timestamp, total, VAT. Falls back to plain text when no VAT number. */
function tlv(tag, str){ const bytes = new TextEncoder().encode(str); return [tag, bytes.length, ...bytes]; }
function qrPayload(doc){
  const s=db.settings, b=s.business, t=calc(doc);
  if(b.vat){ const bytes=[...tlv(1,b.name),...tlv(2,b.vat),...tlv(3,new Date(doc.date+'T00:00:00').toISOString()),...tlv(4,t.total.toFixed(2)),...tlv(5,t.tax.toFixed(2))]; return btoa(String.fromCharCode(...bytes)); }
  return `${b.name} | ${doc.number} | ${fmtDate(doc.date)} | ${money(t.total)}`;
}
function drawQR(doc){ const el=$('#qr'); if(!el) return; if(!db.settings.qr || typeof qrcode==='undefined'){ el.remove(); return; } try{ const q=qrcode(0,'M'); q.addData(qrPayload(doc),'Byte'); q.make(); el.innerHTML=q.createSvgTag({cellSize:3,margin:0,scalable:true}); el.querySelector('svg').setAttribute('aria-label','رمز QR للفاتورة'); }catch(e){ el.remove(); } }

/* ---------- S05 clients ---------- */
route(/^\/clients$/, () => {
  const q=(listState.clients||'').trim(); const cs = db.clients.filter(c=>!q||c.name.includes(q)||(c.phone||'').includes(q)).sort((a,b)=>a.name.localeCompare(b.name,'ar'));
  page('العملاء', `
    ${db.clients.length?`<input class="input search" id="cq" type="search" placeholder="بحث بالاسم أو الجوال" value="${esc(q)}" aria-label="بحث">`:''}
    ${cs.length ? `<div class="list">${cs.map(c=>{ const n=db.docs.filter(d=>d.client.id===c.id&&d.type==='invoice'); const owed=n.filter(d=>['sent','overdue'].includes(effStatus(d))).reduce((a,d)=>a+calc(d).total,0); return `
      <button class="item" data-id="${c.id}"><div class="avatar">${esc(c.name.charAt(0))}</div><div class="item__main"><div class="item__title">${esc(c.name)}</div><div class="item__sub">${esc(c.phone||c.email||'بدون بيانات اتصال')} · ${n.length} فواتير</div></div>${owed?`<div class="item__amt" style="color:var(--warn)">${money(owed)}</div>`:''}</button>`;}).join('')}</div>`
    : db.clients.length ? `<div class="empty"><div class="empty__icon">🔍</div><h2>لا نتائج</h2></div>`
    : `<div class="empty"><div class="empty__icon">👥</div><h2>دفتر العملاء فارغ</h2><p>أضف عملاءك هنا لتختارهم بنقرة عند إنشاء الفاتورة. يُحفظ العميل تلقائياً عند حفظ أول فاتورة له.</p><button class="btn" id="addc0">+ إضافة عميل</button></div>`}
    <button class="btn fab" id="addc">+ عميل</button>`);
  const cq=$('#cq'); if(cq) cq.oninput=()=>{ listState.clients=cq.value; const p=cq.selectionStart; render(); const n=$('#cq'); n.focus(); n.setSelectionRange(p,p); };
  const add = () => clientForm(null);
  $('#addc').onclick=add; const a0=$('#addc0'); if(a0) a0.onclick=add;
  $$('.item[data-id]').forEach(b=> b.onclick=()=>clientForm(db.clients.find(c=>c.id===b.dataset.id)));
});
function clientForm(c){
  const isNew=!c; c = c || {id:uid(),name:'',phone:'',email:'',address:'',vat:''};
  openModal(isNew?'عميل جديد':'تعديل عميل', `<form id="cf">
    <div class="field"><label for="fn">الاسم *</label><input class="input" id="fn" required maxlength="80" value="${esc(c.name)}"></div>
    <div class="field"><label for="fp">الجوال</label><input class="input" id="fp" type="tel" value="${esc(c.phone)}"></div>
    <div class="field"><label for="fe">البريد</label><input class="input" id="fe" type="email" dir="ltr" value="${esc(c.email)}"></div>
    <div class="field"><label for="fa">العنوان</label><input class="input" id="fa" value="${esc(c.address)}"></div>
    <div class="field"><label for="fv">الرقم الضريبي</label><input class="input" id="fv" inputmode="numeric" value="${esc(c.vat)}"></div>
    <div class="actions"><button class="btn" type="submit">حفظ</button>${isNew?'':'<button class="btn btn--danger" type="button" id="fdel">حذف</button>'}</div></form>`, b => {
    $('#cf',b).onsubmit = e => { e.preventDefault(); const n=$('#fn',b).value.trim(); if(!n){ $('#fn',b).focus(); return; } Object.assign(c,{name:n,phone:$('#fp',b).value.trim(),email:$('#fe',b).value.trim(),address:$('#fa',b).value.trim(),vat:$('#fv',b).value.trim()}); if(isNew) db.clients.push(c); save(); closeModal(); toast('تم الحفظ'); render(); };
    const d=$('#fdel',b); if(d) d.onclick=()=>{ closeModal(); confirmBox(`حذف العميل "${c.name}"؟ لن تُحذف فواتيره.`, ()=>{ db.clients=db.clients.filter(x=>x.id!==c.id); save(); toast('تم الحذف'); render(); }); };
  });
}

/* ---------- S06 products ---------- */
route(/^\/products$/, () => {
  const ps=[...db.products].sort((a,b)=>a.name.localeCompare(b.name,'ar'));
  page('المنتجات والخدمات', `
    ${ps.length ? `<div class="list">${ps.map(p=>`<button class="item" data-id="${p.id}"><div class="avatar">📦</div><div class="item__main"><div class="item__title">${esc(p.name)}</div><div class="item__sub">${esc(p.unit||'')}</div></div><div class="item__amt">${money(p.price)}</div></button>`).join('')}</div>`
    : `<div class="empty"><div class="empty__icon">📦</div><h2>لا توجد منتجات بعد</h2><p>أضف خدماتك ومنتجاتك بأسعارها لتدرجها في الفاتورة بنقرة واحدة.</p><button class="btn" id="addp0">+ إضافة منتج</button></div>`}
    <button class="btn fab" id="addp">+ منتج</button>`, {back:'/settings'});
  const add=()=>productForm(null); $('#addp').onclick=add; const a0=$('#addp0'); if(a0) a0.onclick=add;
  $$('.item[data-id]').forEach(b=> b.onclick=()=>productForm(db.products.find(p=>p.id===b.dataset.id)));
});
function productForm(p){
  const isNew=!p; p = p || {id:uid(),name:'',price:'',unit:''};
  openModal(isNew?'منتج أو خدمة جديدة':'تعديل', `<form id="pf">
    <div class="field"><label for="pn">الاسم *</label><input class="input" id="pn" required maxlength="120" value="${esc(p.name)}"></div>
    <div class="row row--2"><div class="field"><label for="pp">السعر *</label><input class="input" id="pp" type="number" inputmode="decimal" min="0" step="any" required value="${esc(p.price)}"></div>
    <div class="field"><label for="pu">الوحدة</label><input class="input" id="pu" placeholder="ساعة، قطعة، شهر" value="${esc(p.unit)}"></div></div>
    <div class="actions"><button class="btn" type="submit">حفظ</button>${isNew?'':'<button class="btn btn--danger" type="button" id="pdel">حذف</button>'}</div></form>`, b => {
    $('#pf',b).onsubmit = e => { e.preventDefault(); const n=$('#pn',b).value.trim(); const pr=Number($('#pp',b).value); if(!n||isNaN(pr)) return; Object.assign(p,{name:n,price:pr,unit:$('#pu',b).value.trim()}); if(isNew) db.products.push(p); save(); closeModal(); toast('تم الحفظ'); render(); };
    const d=$('#pdel',b); if(d) d.onclick=()=>{ db.products=db.products.filter(x=>x.id!==p.id); save(); closeModal(); toast('تم الحذف'); render(); };
  });
}

/* ---------- S08 reports ---------- */
route(/^\/reports$/, () => {
  const inv = db.docs.filter(d=>d.type==='invoice');
  const sum = f => inv.filter(f).reduce((a,d)=>a+calc(d).total,0);
  const paid=sum(d=>d.status==='paid'), due=sum(d=>effStatus(d)==='sent'), over=sum(d=>effStatus(d)==='overdue'), tax=inv.filter(d=>d.status==='paid').reduce((a,d)=>a+calc(d).tax,0);
  const months={}; for(const d of inv){ const m=d.date.slice(0,7); months[m]=months[m]||{n:0,total:0,paid:0}; months[m].n++; months[m].total+=calc(d).total; if(d.status==='paid') months[m].paid+=calc(d).total; }
  const mk = Object.keys(months).sort().reverse().slice(0,12);
  const top={}; for(const d of inv.filter(d=>d.status==='paid')){ top[d.client.name]=(top[d.client.name]||0)+calc(d).total; }
  const topc = Object.entries(top).sort((a,b)=>b[1]-a[1]).slice(0,5);
  page('التقارير', inv.length ? `
    <div class="stats"><div class="stat stat--ok"><div class="stat__label">محصّل</div><div class="stat__value">${money(paid)}</div></div><div class="stat stat--warn"><div class="stat__label">مستحق</div><div class="stat__value">${money(due)}</div></div><div class="stat stat--bad"><div class="stat__label">متأخر</div><div class="stat__value">${money(over)}</div></div></div>
    <div class="card"><h3 class="card__title">ملخص</h3><table class="table"><tr><td>عدد الفواتير</td><td class="num">${inv.length}</td></tr><tr><td>الفواتير المدفوعة</td><td class="num">${inv.filter(d=>d.status==='paid').length}</td></tr><tr><td>ضريبة محصّلة (من المدفوع)</td><td class="num">${money(tax)}</td></tr><tr><td>متوسط الفاتورة</td><td class="num">${money(inv.reduce((a,d)=>a+calc(d).total,0)/inv.length)}</td></tr></table></div>
    <div class="card"><h3 class="card__title">حسب الشهر</h3><table class="table"><thead><tr><th>الشهر</th><th class="num">فواتير</th><th class="num">الإجمالي</th><th class="num">المدفوع</th></tr></thead><tbody>${mk.map(m=>`<tr><td>${new Date(m+'-01T00:00:00').toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{month:'long',year:'numeric'})}</td><td class="num">${months[m].n}</td><td class="num">${money(months[m].total)}</td><td class="num">${money(months[m].paid)}</td></tr>`).join('')}</tbody></table></div>
    ${topc.length?`<div class="card"><h3 class="card__title">أفضل العملاء</h3><table class="table">${topc.map(([n,v])=>`<tr><td>${esc(n)}</td><td class="num">${money(v)}</td></tr>`).join('')}</table></div>`:''}`
  : `<div class="empty"><div class="empty__icon">📊</div><h2>لا بيانات بعد</h2><p>ستظهر هنا أرقامك: المحصّل والمستحق والمتأخر، شهراً بشهر.</p><a class="btn" href="#/new/invoice">+ فاتورة جديدة</a></div>`);
});

/* ---------- S07 settings ---------- */
route(/^\/settings$/, () => {
  const s=db.settings, b=s.business;
  page('الإعدادات', `
  <form id="sf">
    <div class="card"><h3 class="card__title">بيانات النشاط</h3>
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">
        <img class="logo-preview" id="logoprev" src="${b.logo||'icons/icon.svg'}" alt="الشعار">
        <div><label class="btn btn--soft btn--sm" for="logo">رفع شعار</label><input type="file" id="logo" accept="image/*" hidden> ${b.logo?'<button type="button" class="btn btn--danger btn--sm" id="logodel">إزالة</button>':''}<p class="hint">PNG أو JPG، يُصغَّر تلقائياً.</p></div>
      </div>
      <div class="field"><label for="bn">اسم النشاط *</label><input class="input" id="bn" required maxlength="80" value="${esc(b.name)}"></div>
      <div class="row row--2"><div class="field"><label for="bp">الجوال</label><input class="input" id="bp" type="tel" value="${esc(b.phone)}"></div><div class="field"><label for="be">البريد</label><input class="input" id="be" type="email" dir="ltr" value="${esc(b.email)}"></div></div>
      <div class="field"><label for="ba">العنوان</label><input class="input" id="ba" value="${esc(b.address)}"></div>
      <div class="row row--2"><div class="field"><label for="bv">الرقم الضريبي</label><input class="input" id="bv" inputmode="numeric" value="${esc(b.vat)}"></div><div class="field"><label for="bw">الموقع الإلكتروني</label><input class="input" id="bw" dir="ltr" value="${esc(b.website)}"></div></div>
      <p class="hint">عند إدخال الرقم الضريبي يصبح عنوان المستند «فاتورة ضريبية» ويُولَّد رمز QR بصيغة هيئة الزكاة والضريبة (المرحلة الأولى).</p>
    </div>
    <div class="card"><h3 class="card__title">الفاتورة</h3>
      <div class="row row--2"><div class="field"><label for="scur">العملة</label><select class="select" id="scur">${Object.entries(CURRENCIES).map(([k,v])=>`<option value="${k}" ${k===s.currency?'selected':''}>${v.label} (${v.sym})</option>`).join('')}</select></div><div class="field"><label for="stax">الضريبة الافتراضية %</label><input class="input" id="stax" type="number" inputmode="decimal" min="0" max="100" step="0.5" value="${s.taxRate}"></div></div>
      <div class="row row--3"><div class="field"><label for="sip">بادئة الفاتورة</label><input class="input" id="sip" dir="ltr" value="${esc(s.invPrefix)}"></div><div class="field"><label for="sin">الرقم التالي</label><input class="input" id="sin" type="number" min="1" value="${s.invNext}"></div><div class="field"><label for="sdd">أيام الاستحقاق</label><input class="input" id="sdd" type="number" min="0" value="${s.dueDays}"></div></div>
      <div class="row row--2"><div class="field"><label for="sep">بادئة عرض السعر</label><input class="input" id="sep" dir="ltr" value="${esc(s.estPrefix)}"></div><div class="field"><label for="sen">الرقم التالي</label><input class="input" id="sen" type="number" min="1" value="${s.estNext}"></div></div>
      <label class="hint" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="sqr" ${s.qr?'checked':''}> إظهار رمز QR على الفاتورة</label>
    </div>
    <div class="card"><h3 class="card__title">المظهر</h3>
      <div class="field"><label>القالب</label><div class="tpl-pick" id="tpl">${[['classic','كلاسيكي'],['modern','عصري'],['minimal','بسيط']].map(([k,v])=>`<button type="button" data-t="${k}" class="${s.template===k?'is-active':''}">${v}</button>`).join('')}</div></div>
      <div class="field"><label>اللون الأساسي</label><div class="swatches" id="sw">${ACCENTS.map(c=>`<button type="button" class="swatch ${s.accent===c?'is-active':''}" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}<input type="color" id="swc" value="${s.accent}" aria-label="لون مخصص" style="width:36px;height:36px;border:0;padding:0;background:none"></div></div>
    </div>
    <div class="card"><h3 class="card__title">التوقيع</h3>
      ${s.signature?`<img class="sig-preview" src="${s.signature}" alt="التوقيع الحالي"><div class="actions"><button type="button" class="btn btn--soft btn--sm" id="sigre">إعادة التوقيع</button><button type="button" class="btn btn--danger btn--sm" id="sigdel">إزالة</button></div>`:`<canvas class="sig-pad" id="sig" width="600" height="200" aria-label="لوحة التوقيع: ارسم توقيعك بإصبعك"></canvas><div class="actions"><button type="button" class="btn btn--soft btn--sm" id="sigclear">مسح</button><button type="button" class="btn btn--sm" id="sigsave">حفظ التوقيع</button></div>`}
    </div>
    <div class="card"><h3 class="card__title">النصوص الافتراضية</h3>
      <div class="field"><label for="sn">ملاحظات</label><textarea class="textarea" id="sn">${esc(s.notes)}</textarea></div>
      <div class="field"><label for="st">الشروط والأحكام</label><textarea class="textarea" id="st">${esc(s.terms)}</textarea></div>
      <div class="field"><label for="sp">تعليمات الدفع</label><textarea class="textarea" id="sp" placeholder="اسم البنك، الآيبان، أو رقم المحفظة">${esc(s.payment)}</textarea></div>
    </div>
    <button class="btn btn--block" type="submit">حفظ الإعدادات</button>
  </form>
  <div class="card" style="margin-top:16px"><h3 class="card__title">المزيد</h3><div class="menu">
    <a class="btn btn--soft" href="#/products">📦 المنتجات والخدمات <span class="hint">(${db.products.length})</span></a>
    <button class="btn btn--soft" id="backup" type="button">⬇ نسخة احتياطية (JSON)</button>
    <label class="btn btn--soft" for="restore">⬆ استعادة نسخة</label><input type="file" id="restore" accept="application/json,.json" hidden>
    <button class="btn btn--danger" id="wipe" type="button">مسح كل البيانات</button>
  </div><p class="hint" style="margin-top:12px">بياناتك محفوظة على هذا الجهاز فقط. خذ نسخة احتياطية قبل تغيير الهاتف أو مسح بيانات المتصفح.</p></div>
  <p class="hint" style="text-align:center">فاتورتي · إصدار 1.0 · مجاني ومفتوح المصدر</p>`);

  $('#logo').onchange = e => { const f=e.target.files[0]; if(!f) return; shrinkImage(f, 320, url => { b.logo=url; $('#logoprev').src=url; save(); toast('تم رفع الشعار'); render(); }); };
  const ld=$('#logodel'); if(ld) ld.onclick=()=>{ b.logo=''; save(); render(); };
  $('#tpl').onclick = e => { const x=e.target.closest('[data-t]'); if(!x) return; s.template=x.dataset.t; $$('#tpl button').forEach(y=>y.classList.toggle('is-active',y===x)); };
  $('#sw').onclick = e => { const x=e.target.closest('[data-c]'); if(!x) return; s.accent=x.dataset.c; $('#swc').value=s.accent; $$('.swatch').forEach(y=>y.classList.toggle('is-active',y===x)); applyAccent(); };
  $('#swc').oninput = e => { s.accent=e.target.value; $$('.swatch').forEach(y=>y.classList.remove('is-active')); applyAccent(); };
  const sig=$('#sig'); if(sig) sigPad(sig, $('#sigclear'), $('#sigsave'), url => { s.signature=url; save(); toast('تم حفظ التوقيع'); render(); });
  const sr=$('#sigre'); if(sr) sr.onclick=()=>{ s.signature=''; render(); };
  const sd=$('#sigdel'); if(sd) sd.onclick=()=>{ s.signature=''; save(); render(); };
  $('#sf').onsubmit = e => { e.preventDefault(); const n=$('#bn').value.trim(); if(!n){ $('#bn').focus(); toast('اسم النشاط مطلوب'); return; }
    Object.assign(b,{name:n,phone:$('#bp').value.trim(),email:$('#be').value.trim(),address:$('#ba').value.trim(),vat:$('#bv').value.trim(),website:$('#bw').value.trim()});
    Object.assign(s,{currency:$('#scur').value,taxRate:Number($('#stax').value)||0,invPrefix:$('#sip').value,invNext:Math.max(1,Number($('#sin').value)||1),dueDays:Number($('#sdd').value)||0,estPrefix:$('#sep').value,estNext:Math.max(1,Number($('#sen').value)||1),qr:$('#sqr').checked,notes:$('#sn').value,terms:$('#st').value,payment:$('#sp').value});
    save(); applyAccent(); toast('تم حفظ الإعدادات'); };
  $('#backup').onclick = () => { const blob=new Blob([JSON.stringify(db,null,1)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`fatoorati-backup-${today()}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000); };
  $('#restore').onchange = e => { const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ try{ const d=JSON.parse(r.result); if(!d.settings||!Array.isArray(d.docs)) throw 0; confirmBox('استبدال كل البيانات الحالية بالنسخة المحددة؟', ()=>{ try{ localStorage.setItem(KEY, JSON.stringify(d)); }catch(x){} db=load(); applyAccent(); toast('تمت الاستعادة'); render(); }); }catch(x){ toast('الملف غير صالح'); } }; r.readAsText(f); };
  $('#wipe').onclick = () => confirmBox('مسح كل الفواتير والعملاء والإعدادات نهائياً؟ لا يمكن التراجع.', ()=>{ try{ localStorage.removeItem(KEY); }catch(x){} db=load(); applyAccent(); navigate('/welcome'); });
});
function shrinkImage(file, max, cb){ const img=new Image(); img.onload=()=>{ const r=Math.min(1, max/Math.max(img.width,img.height)); const c=document.createElement('canvas'); c.width=Math.round(img.width*r); c.height=Math.round(img.height*r); c.getContext('2d').drawImage(img,0,0,c.width,c.height); cb(c.toDataURL('image/png')); URL.revokeObjectURL(img.src); }; img.src=URL.createObjectURL(file); }
function sigPad(cv, clearBtn, saveBtn, cb){
  const ctx=cv.getContext('2d'); ctx.lineWidth=3; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='#111'; let drawing=false, dirty=false;
  const pos = e => { const r=cv.getBoundingClientRect(); return [(e.clientX-r.left)*cv.width/r.width, (e.clientY-r.top)*cv.height/r.height]; };
  cv.addEventListener('pointerdown', e => { drawing=true; dirty=true; cv.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.moveTo(...pos(e)); });
  cv.addEventListener('pointermove', e => { if(!drawing) return; ctx.lineTo(...pos(e)); ctx.stroke(); });
  const up = () => drawing=false; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  clearBtn.onclick = () => { ctx.clearRect(0,0,cv.width,cv.height); dirty=false; };
  saveBtn.onclick = () => { if(!dirty){ toast('ارسم توقيعك أولاً'); return; } cb(cv.toDataURL('image/png')); };
}

/* ---------- install tip + boot ---------- */
let deferredInstall=null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall=e; render(); });
function installTip(){ let off=false; try{ off=!!sessionStorage.getItem('tipoff'); }catch(e){} if(!deferredInstall || off) return ''; return `<div class="install-tip no-print"><span>📲</span><span style="flex:1">ثبّت «فاتورتي» على هاتفك ليعمل بدون إنترنت.</span><button class="btn btn--sm" id="installbtn">تثبيت</button><button class="iconbtn" id="tipoff" aria-label="إخفاء">✕</button></div>`; }
document.addEventListener('click', e => { if(e.target.id==='installbtn' && deferredInstall){ deferredInstall.prompt(); deferredInstall=null; } if(e.target.id==='tipoff'){ try{ sessionStorage.setItem('tipoff','1'); }catch(x){} deferredInstall=null; render(); } });
if('serviceWorker' in navigator && location.protocol==='https:'){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
applyAccent(); render();
})();
