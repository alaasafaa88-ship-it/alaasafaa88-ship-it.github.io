# مواصفات المكونات — عمران

كل القيم من `tokens.json` (css/tokens.css). لا hex خام في المكونات.

```
Button (.tb)
  variants  default, primary, danger, full
  sizes     md 34px (padding 7/11)، على الجوال نفسه مع أهداف لمس ≥ 36px
  states    default, hover (surface), disabled (opacity .45), active (primary: accent-strong)
  tokens    bg panel / accent، text text / on-accent، radius sm، font sm/700
  a11y      <button> حقيقي، تركيز مرئي بحلقة المتصفح، نص لا أيقونة فقط
  used on   الكل

Float tool button (.ft)
  variants  أيقونة 36×36
  states    default, hover, active (accent-soft + حلقة accent 1.5px)
  a11y      title على كل زر؛ data-tool للاختبارات
  used on   S02, S08

Tabs (.tabs)
  variants  رئيسية (11px padding)، صغيرة (نوافذ)
  states    active (لون accent + خط سفلي 2px)
  a11y      أزرار داخل div؛ role=tablist على مبدّل 2D/3D
  used on   S03–S06، S01

Chip (.chip)        states active (accent-soft) · used on S03
Item card (.item-card)
  parts     canvas معاينة علوية 64px، الاسم (سطران)، الأبعاد والسعر، زر + (يظهر عند hover وعلى الجوال دائماً)
  states    hover (حد accent + ظل card)، active (قيد الوضع: حلقة selection)
  a11y      title بالاسم والأبعاد
Material swatch (.mat / .paint)
  states    active (حد selection 2px)، hover tooltip بالاسم (paint)
Field (.field)
  variants  number, text, color, select, range (+number)
  states    focus (حلقة المتصفح)، disabled
  tokens    border border-input (3.7:1)، radius sm، padding 7/9
  a11y      <label> يلف كل حقل؛ aria-label للبحث واسم المشروع
Check (.check)      checkbox + نص داخل label
Modal (.modal / .modal-box)
  variants  560px، wide 960px، ai (شبكة 1.3fr/1fr)
  states    open/closed، إغلاق بـ Esc أو النقر على الخلفية أو ✕
  motion    pop 180ms
  a11y      زر إغلاق أول العناصر؛ Esc يعمل حتى والتركيز داخل حقل
Toast (#toast)      دائم 2.2s، bg toast-bg، نص on-toast، pill
Status bar (#status) ثلاث خانات: إحداثيات، معلومات، تلميح (accent-strong)
Place banner        selection bg، زر إلغاء
Chat message (.msg) user (accent، يمين)، bot (panel + حد، يسار)، عرض ≤ 88%
Template card (.tpl) / Saved card (.saved) / Style card (.style-card) hover: حد accent + رفع 1px
Walk pad (#walkPad) 6 أزرار 48×44، touch-action none
Mobile nav (#mobileNav) 5 أزرار، active = accent + accent-soft
Canvas gizmos      مقبض تدوير (دائرة 8px بيضاء بحد selection)، إطار تحديد متقطع، معاينة أداة، شارة قفل 🔒
```

حالات لكل شاشة: empty (لا غرف/لا محفوظات/لا نتائج بحث)، filled، error (ملف غير صالح، تخزين ممتلئ، WebGL غير متاح)، loading (شاشة تحميل أولية + spinner عند التوليد)، long content (اسم قطعة 40 حرفاً يُقصّ؛ اسم مشروع في حقل مرن)، mobile.
