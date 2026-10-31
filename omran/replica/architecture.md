# المعمارية: عمران (إعادة بناء الميزات الأساسية لـ Planner 5D)

## المكدّس

| الطبقة | الاختيار | لماذا |
| --- | --- | --- |
| الويب | HTML + CSS + JavaScript بلا إطار ولا خطوة بناء | التطبيق محرر رسوميات؛ الحالة في ذاكرة الصفحة، والنشر على GitHub Pages لا يدعم خادماً |
| الرسم 2D | Canvas 2D | أداء عالٍ لمئات القطع، تحكم كامل بالسحب واللمس |
| الرسم 3D | Three.js r128 مضمّن محلياً (MIT) | مكتبة WebGL الأنضج؛ نسخة محلية لتعمل بدون CDN وبدون إنترنت |
| قاعدة البيانات | localStorage (JSON) | لا حساب ولا خادم؛ المشاريع ملك المستخدم على جهازه. مزامنة سحابية اختيارية لاحقاً (انظر أدناه) |
| المصادقة | لا شيء | لا بيانات تغادر الجهاز؛ تعالج شكوى الفوترة والتسجيل في الأصلي |
| المدفوعات | لا شيء (مجاني ومفتوح المصدر) | انظر launch/pricing.md |
| البريد | لا شيء | — |
| المهام المجدولة | لا شيء | — |
| الاستضافة | GitHub Pages من الفرع main | مجاني، HTTPS تلقائي، يدعم نطاقاً مخصصاً |
| PWA | manifest.json + sw.js (cache-first) | تثبيت على الجوال والعمل بدون إنترنت |

## المخطط

البيانات نموذج JSON واحد لكل مشروع (انظر `js/state.js`). الجداول: 5 (project, rooms, walls, openings, items) + 3 مراجع ثابتة في الكود (catalog, materials, styles). قواعد الوصول: لا توجد، فالبيانات محلية.

```
project  { pid, name, created, updated, version:1,
           settings { wallHeight, wallThickness, currency, showCeiling, exteriorColor },
           rooms[], walls[], openings[], items[] }
room     { id, name, type, x, y, w, h, lvl, floor(مادة), wall, ceiling }   -- lvl = رقم الطابق على كل الكيانات
floors   [{ id, n }]  + currentFloor
wall     { id, x1, y1, x2, y2, t, h, color|null }
opening  { id, type, wallId, t(0..1), w, h, sill, flip, swing }
item     { id, defId, x, y, rot, w, d, h, c, c2, elev }
```

مفاتيح التخزين: `omran_projects` (قائمة المشاريع مع صورة مصغرة) و`omran_autosave` (آخر حالة).
القيود: `addWall` يرفض الجدران المكررة (نفس الطرفين)، `addOpening` يقصّ الموضع بحيث تبقى الفتحة داخل الجدار، `addRoom` ينشئ الجدران الأربعة ويدمج المشترك منها.

مزامنة سحابية اختيارية (should-have غير مبني): جدول واحد على Supabase مع RLS، يُنفَّذ فقط إذا طلب المستخدمون ذلك. انظر `schema.sql`.

## الواجهة البرمجية (وحدات JavaScript بدل مسارات HTTP)

| الوحدة.الدالة | تفعل | من يستدعيها | المدخل | المخرج | التدفق |
| --- | --- | --- | --- | --- | --- |
| STATE.Project.addRoom | تنشئ غرفة + جدرانها | المحرر، المولّد | x,y,w,h,type | room | F02, F04 |
| STATE.Project.addWall | جدار مع منع التكرار | المحرر | x1,y1,x2,y2 | wall | F02 |
| STATE.Project.addOpening | باب/نافذة على جدار | المحرر، المولّد | type, wallId, t | opening | F02 |
| STATE.Project.addItem | قطعة من الكتالوج | المحرر، AI | defId,x,y,rot | item | F03, F04 |
| STATE.Project.snapshot/doUndo/doRedo | تراجع | التطبيق | — | — | الكل |
| STATE.Project.stats | مساحة، أطوال، تكلفة | الخصائص، AI | — | stats | F08 |
| STATE.Store.save/list/get/remove | التخزين المحلي | التطبيق | project, thumb | — | F07 |
| Editor2D.setTool/placeAt/hit/toDataURL | المحرر | التطبيق | — | — | F02, F03, F07 |
| View3D.build/setWalk/setNight/screenshot | العرض 3D | التطبيق | project | — | F05 |
| AI.furnish | تأثيث غرفة | التطبيق | room, style, keep | عدد القطع | F04 |
| AI.generatePlan | توليد مخطط | التطبيق | opts | project | F04 |
| AI.applyStyle | تطبيق نمط | التطبيق | style | — | F04 |
| AI.estimate / AI.tips | التكلفة والنصائح | التطبيق | — | rows/tips | F08 |
| AI.chat | تفسير طلب نصي | التطبيق | text, ctx | {text, actions[]} | F04 |
| TEMPLATES.build | قالب | التطبيق | id | — | F01 |

Webhooks: لا شيء. Jobs: لا شيء (الحفظ التلقائي مؤقت 800ms داخل الصفحة).

## الأجزاء التي تعضّ

- **الجدران بالفتحات في 3D**: يُقسَّم كل جدار إلى قطع حول كل فتحة (أسفل الجلسة، فوق الباب) بدل CSG. حُلّ.
- **سباقات الحفظ**: الحفظ التلقائي مؤجّل؛ الإغلاق المفاجئ يكتب نسخة في beforeunload. تاريخ النسخ (3 نسخ) مضاف لمعالجة شكوى "ضاع عملي".
- **حجم localStorage** (~5 م.ب): الصور المصغرة صغيرة (24px/م)؛ رسالة واضحة عند الامتلاء وتصدير JSON كبديل.
- **الأداء على الجوال**: إعادة بناء المشهد 3D مؤجّلة 120ms، هندسة ومواد مخزّنة مؤقتاً، حد 10 أضواء نقطية.
- **اللمس**: pointer events + pinch؛ `touch-action:none` على الكانفاس.
- **WebGL غير متاح**: رسالة والرجوع إلى 2D.
- **RTL**: الكانفاس لا يتأثر بالاتجاه؛ القوائم والنوافذ RTL بالكامل.
- **روابط المشاركة**: base64 للمشروع كاملاً؛ حد 60 ألف حرف ثم إرشاد لتصدير JSON.

## ترتيب البناء

1. الشريحة العمودية: S01 → S02 (غرفة + باب) → S03 (قطعة) → S08 (3D) → حفظ. **منجزة** في الالتزام fbf0666.
2. must-haves: كلها منجزة (انظر parity.md) عدا موديلات الأصلي المرخّصة (skip).
3. should-haves: طوابق متعددة، قفل القطع، نسخ/لصق، خامات القطع، تقرير PDF — مبنية في الجولة الثانية. المتبقي: تعدد اللغات، مزامنة سحابية.
4. إصلاحات من replica-entrepreneur: تاريخ النسخ (حفظ 3 نسخ سابقة)، استيراد قطعة مخصصة (صندوق بأبعاد واسم ولون) — انظر fixes.md.
