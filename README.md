# الجسد — Al-Jasad

موقع عربي (RTL) لاستكشاف جسم الإنسان ثلاثي الأبعاد بنماذج تشريحية **حقيقية** من قاعدة بيانات
[BodyParts3D](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/) (© DBCLS، رخصة CC BY-SA 2.1 JP).

## التشغيل
```bash
npm install
npm run dev      # خادم التطوير
npm run build    # نسخة الإنتاج في dist/
```

## خط معالجة النماذج
النماذج الجاهزة محفوظة في `public/models`. لإعادة توليدها من المصدر:
```bash
# 1) BodyParts3D 3.0 (OBJ الرسمي، أو نسخة STL المطابقة):
git clone --depth 1 https://github.com/Kevin-Mattheus-Moerman/BodyParts3D bp3d
# 2) تحويل → تبسيط (LOD حاسوب/جوال) → ضغط meshopt → تقسيم حسب الجهاز
node --max-old-space-size=12000 scripts/build-models.mjs bp3d/assets/BodyParts3D_data
# 3) بيانات التراكيب العربية
node scripts/build-structures.mjs
```
- `scripts/build-models.mjs`: يقرأ كل تركيب (معرّف FMA ثابت)، يدمج الرؤوس، يبسّط بـ meshoptimizer، يضغط بـ `EXT_meshopt_compression` ويكمّم، ويكتب `public/models/<group>.glb` و`<group>.m.glb` (جوال)، و`data/geometry.json` و`data/flow.json` (خطوط مركزية للأوعية).
- `scripts/build-structures.mjs` + `ar-dict.mjs` + `ar-info.mjs`: ينتج `data/structures.json` (الاسم العربي والإنجليزي، الجهاز، الطبقة، الوظيفة، معلومة، الأجزاء المجاورة).

## الرخص
- النماذج ومشتقاتها: CC BY-SA 2.1 JP — "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan".
- الشيفرة: MIT.

## روابط مباشرة
`?mode=xray|section|explode` · `depth=0..4` · `sys=skeletal,muscular` · `sel=FMA7274` · `fly=1` · `iso=1` · `tour=blood|food|arm` · `axis=x|y|z&pos=-1..1` · `lod=m` (نماذج خفيفة)
