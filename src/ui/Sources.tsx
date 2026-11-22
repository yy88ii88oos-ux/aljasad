import { useStore } from '../store'

export default function Sources() {
  const set = useStore((s) => s.set)
  const close = () => { set({ page: 'viewer' }); history.replaceState(null, '', location.pathname) }
  return (
    <div className="sources" role="dialog" aria-modal aria-labelledby="src-title">
      <div className="sources-inner glass">
        <button className="card-x" onClick={close} aria-label="إغلاق">×</button>
        <h1 id="src-title">المصادر والرخصة</h1>
        <h2>النماذج التشريحية</h2>
        <p>
          كل النماذج ثلاثية الأبعاد في «الجسد» مأخوذة من قاعدة بيانات <b dir="ltr">BodyParts3D</b> التي أنتجها
          <b> مركز قواعد بيانات علوم الحياة (DBCLS)</b> في اليابان، وهي نماذج مستخلصة من تصوير مقطعي لجسم إنسان حقيقي (ذكر بالغ)
          ومُعرّفة بمعرّفات «النموذج التأسيسي للتشريح» <span dir="ltr">(FMA)</span>. لم يُبنَ أي عضو بأشكال هندسية برمجية.
        </p>
        <div className="credit" dir="ltr">
          BodyParts3D, © The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan
        </div>
        <ul>
          <li>الرخصة: <a href="https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en" target="_blank" rel="noreferrer">المشاع الإبداعي — نسب المصنَّف — المشاركة بالمثل 2.1 اليابان (CC BY-SA 2.1 JP)</a></li>
          <li>صفحة الرخصة الرسمية: <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html" target="_blank" rel="noreferrer" dir="ltr">dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html</a></li>
          <li>صفحة التحميل الرسمية: <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html" target="_blank" rel="noreferrer" dir="ltr">dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html</a> — <span dir="ltr">DOI: 10.18908/lsdba.nbdc00837-000</span></li>
          <li>الإصدار المستخدم: <span dir="ltr">3.0 (20110915)</span> — اختير لأن الإصدار 4.0 فيه تداخل بين الجلد والعضلات في بعض المناطق.</li>
          <li>نسخة الملفات المستعملة في المعالجة: مستودع <a href="https://github.com/Kevin-Mattheus-Moerman/BodyParts3D" target="_blank" rel="noreferrer" dir="ltr">Kevin-Mattheus-Moerman/BodyParts3D</a> (تحويل حرفي لملفات OBJ الرسمية إلى STL، بالرخصة نفسها).</li>
          <li>المرجع العلمي: <span dir="ltr">Mitsuhashi N, et al. BodyParts3D: 3D structure database for anatomical concepts. Nucleic Acids Res. 2009;37:D782–5. doi:10.1093/nar/gkn613</span></li>
        </ul>
        <h2>التعديلات التي أجريناها (مطلوب إعلانها بموجب الرخصة)</h2>
        <ul>
          <li>تحويل الإحداثيات من المليمتر (المحور Z للأعلى) إلى المتر (المحور Y للأعلى) وتوسيط الجسم.</li>
          <li>دمج الرؤوس المكررة وتبسيط المضلعات بخوارزمية meshoptimizer لإنتاج نسختين: حاسوب وجوال (LOD).</li>
          <li>ضغط الهندسة بـ <span dir="ltr">EXT_meshopt_compression</span> وتكميمها، وتقسيمها حسب الأجهزة: عظام، جلد، عضلات، قلب وأوعية، جهاز عصبي، أعضاء.</li>
          <li>استبعاد مجموعات الشعر والحاجبين، واستخلاص خطوط مركزية للأوعية لتحريك جزيئات الدم.</li>
        </ul>
        <p>تُتاح النماذج المعدّلة في هذا الموقع (مجلد <span dir="ltr">public/models</span>) بالرخصة نفسها <b dir="ltr">CC BY-SA 2.1 JP</b>.</p>
        <h2>المحتوى العربي</h2>
        <p>
          الأسماء العربية مبنية على مصطلحات <b>المعجم الطبي الموحّد</b> قدر الإمكان، والمعلومات الوظيفية والحقائق مستندة إلى المراجع التشريحية
          والفيزيولوجية القياسية (Gray’s Anatomy، Guyton &amp; Hall)، والأرقام التقريبية مسبوقة بكلمة «نحو». الموقع تعليمي ولا يُغني عن الطبيب.
        </p>
        <h2>البرمجيات</h2>
        <p dir="ltr" className="ltr-list">three.js · React Three Fiber · drei · postprocessing · GSAP · glTF-Transform · meshoptimizer · three-mesh-bvh · IBM Plex Sans Arabic (OFL)</p>
        <h2>حدود البيانات</h2>
        <p>
          لا تحتوي BodyParts3D 3.0 على الأعصاب الطرفية ولا النخاع الشوكي ولا شرايين الأطراف، لذلك تظهر «نبضات الأعصاب» على الدماغ والمسار البصري فقط،
          وجزيئات الدم في الأوعية الكبرى المتوفرة في البيانات.
        </p>
      </div>
    </div>
  )
}
