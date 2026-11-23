// Latin (Terminologia Anatomica) names for the structures in BodyParts3D.
// Hand-written for the common structures + rules for numbered series; anything not covered gets no Latin line
// (better none than a wrong one).

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
const ORD = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12 }

export const LAT = {
  // ---- skeleton ----
  'clavicle': 'Clavicula', 'scapula': 'Scapula', 'hip bone': 'Os coxae', 'humerus': 'Humerus', 'radius': 'Radius', 'ulna': 'Ulna',
  'femur': 'Femur', 'tibia': 'Tibia', 'fibula': 'Fibula', 'patella': 'Patella', 'talus': 'Talus', 'calcaneus': 'Calcaneus',
  'navicular bone of foot': 'Os naviculare', 'cuboid bone': 'Os cuboideum', 'medial cuneiform bone': 'Os cuneiforme mediale',
  'intermediate cuneiform bone': 'Os cuneiforme intermedium', 'lateral cuneiform bone': 'Os cuneiforme laterale',
  'scaphoid': 'Os scaphoideum', 'lunate': 'Os lunatum', 'triquetral': 'Os triquetrum', 'pisiform': 'Os pisiforme',
  'trapezium': 'Os trapezium', 'trapezoid': 'Os trapezoideum', 'capitate': 'Os capitatum', 'hamate': 'Os hamatum',
  'sesamoid bone of foot': 'Os sesamoideum pedis', 'temporal bone': 'Os temporale', 'parietal bone': 'Os parietale',
  'zygomatic bone': 'Os zygomaticum', 'lacrimal bone': 'Os lacrimale', 'nasal bone': 'Os nasale', 'maxilla': 'Maxilla',
  'palatine bone': 'Os palatinum', 'inferior nasal concha': 'Concha nasalis inferior', 'frontal bone': 'Os frontale',
  'occipital bone': 'Os occipitale', 'sphenoid bone': 'Os sphenoidale', 'ethmoid bone': 'Os ethmoidale', 'vomer': 'Vomer',
  'mandible': 'Mandibula', 'hyoid bone': 'Os hyoideum', 'sternum': 'Sternum', 'manubrium of sternum': 'Manubrium sterni',
  'body of sternum': 'Corpus sterni', 'xiphoid process': 'Processus xiphoideus', 'sacrum': 'Os sacrum', 'coccyx': 'Os coccygis',
  'atlas': 'Atlas (vertebra cervicalis I)', 'axis': 'Axis (vertebra cervicalis II)',
  'interosseous membrane of forearm': 'Membrana interossea antebrachii', 'interosseous membrane of leg': 'Membrana interossea cruris',
  'long plantar ligament': 'Ligamentum plantare longum', 'inguinal ligament': 'Ligamentum inguinale', 'iliotibial tract': 'Tractus iliotibialis',
  'calcaneal tendon': 'Tendo calcaneus', 'flexor retinaculum of wrist': 'Retinaculum musculorum flexorum manus',
  'eyeball': 'Bulbus oculi', 'ethmoid': 'Os ethmoidale', 'manubrium': 'Manubrium sterni', 'linea alba': 'Linea alba',
  'gingiva of upper jaw': 'Gingiva maxillaris', 'gingiva of lower jaw': 'Gingiva mandibularis', 'intervertebral disk of axis': 'Discus intervertebralis C2–C3',
  'external anal sphincter': 'Musculus sphincter ani externus', 'thoracic rotator': 'Musculi rotatores thoracis', 'intermediate tendon': 'Tendo intermedius musculi digastrici',
  // ---- muscles ----
  'external oblique': 'Musculus obliquus externus abdominis', 'internal oblique': 'Musculus obliquus internus abdominis',
  'transversus abdominis': 'Musculus transversus abdominis', 'rectus abdominis': 'Musculus rectus abdominis', 'pyramidalis': 'Musculus pyramidalis',
  'quadratus lumborum': 'Musculus quadratus lumborum', 'sternohyoid': 'Musculus sternohyoideus', 'omohyoid': 'Musculus omohyoideus',
  'sternothyroid': 'Musculus sternothyroideus', 'thyrohyoid': 'Musculus thyrohyoideus', 'stylohyoid': 'Musculus stylohyoideus',
  'mylohyoid': 'Musculus mylohyoideus', 'geniohyoid': 'Musculus geniohyoideus', 'anterior belly of digastric': 'Venter anterior musculi digastrici',
  'posterior belly of digastric': 'Venter posterior musculi digastrici', 'latissimus dorsi': 'Musculus latissimus dorsi',
  'pectoralis minor': 'Musculus pectoralis minor', 'clavicular part of pectoralis major': 'Pars clavicularis musculi pectoralis majoris',
  'sternocostal part of pectoralis major': 'Pars sternocostalis musculi pectoralis majoris', 'abdominal part of pectoralis major': 'Pars abdominalis musculi pectoralis majoris',
  'rhomboid major': 'Musculus rhomboideus major', 'rhomboid minor': 'Musculus rhomboideus minor', 'scalenus anterior': 'Musculus scalenus anterior',
  'scalenus medius': 'Musculus scalenus medius', 'scalenus posterior': 'Musculus scalenus posterior', 'serratus anterior': 'Musculus serratus anterior',
  'serratus posterior superior': 'Musculus serratus posterior superior', 'serratus posterior inferior': 'Musculus serratus posterior inferior',
  'sternocleidomastoid': 'Musculus sternocleidomastoideus', 'subclavius': 'Musculus subclavius', 'subscapularis': 'Musculus subscapularis',
  'supraspinatus': 'Musculus supraspinatus', 'infraspinatus muscle': 'Musculus infraspinatus', 'teres major': 'Musculus teres major',
  'teres minor': 'Musculus teres minor', 'levator scapulae': 'Musculus levator scapulae', 'ascending part of trapezius': 'Pars ascendens musculi trapezii',
  'transverse part of trapezius': 'Pars transversa musculi trapezii', 'descending part of trapezius': 'Pars descendens musculi trapezii',
  'clavicular part of deltoid': 'Pars clavicularis musculi deltoidei', 'acromial part of deltoid': 'Pars acromialis musculi deltoidei',
  'spinal part of deltoid': 'Pars spinalis musculi deltoidei', 'coracobrachialis': 'Musculus coracobrachialis', 'brachialis': 'Musculus brachialis',
  'short head of biceps brachii': 'Caput breve musculi bicipitis brachii', 'long head of biceps brachii': 'Caput longum musculi bicipitis brachii',
  'medial head of triceps brachii': 'Caput mediale musculi tricipitis brachii', 'lateral head of triceps brachii': 'Caput laterale musculi tricipitis brachii',
  'long head of triceps brachii': 'Caput longum musculi tricipitis brachii', 'anconeus': 'Musculus anconeus', 'brachioradialis': 'Musculus brachioradialis',
  'pronator quadratus': 'Musculus pronator quadratus', 'humeral head of pronator teres': 'Caput humerale musculi pronatoris teretis',
  'ulnar head of pronator teres': 'Caput ulnare musculi pronatoris teretis', 'flexor carpi radialis': 'Musculus flexor carpi radialis',
  'palmaris longus': 'Musculus palmaris longus', 'humeral head of flexor carpi ulnaris': 'Caput humerale musculi flexoris carpi ulnaris',
  'ulnar head of flexor carpi ulnaris': 'Caput ulnare musculi flexoris carpi ulnaris', 'flexor digitorum profundus': 'Musculus flexor digitorum profundus',
  'humeroulnar head of flexor digitorum superficialis': 'Caput humero-ulnare musculi flexoris digitorum superficialis',
  'radial head of flexor digitorum superficialis': 'Caput radiale musculi flexoris digitorum superficialis', 'flexor pollicis longus': 'Musculus flexor pollicis longus',
  'extensor carpi radialis longus': 'Musculus extensor carpi radialis longus', 'extensor carpi radialis brevis': 'Musculus extensor carpi radialis brevis',
  'humeral head of extensor carpi ulnaris': 'Caput humerale musculi extensoris carpi ulnaris', 'ulnar head of extensor carpi ulnaris': 'Caput ulnare musculi extensoris carpi ulnaris',
  'extensor digitorum': 'Musculus extensor digitorum', 'extensor digiti minimi': 'Musculus extensor digiti minimi', 'supinator': 'Musculus supinator',
  'abductor pollicis longus': 'Musculus abductor pollicis longus', 'extensor pollicis brevis': 'Musculus extensor pollicis brevis',
  'extensor pollicis longus': 'Musculus extensor pollicis longus', 'extensor indicis': 'Musculus extensor indicis',
  'abductor pollicis brevis': 'Musculus abductor pollicis brevis', 'opponens pollicis': 'Musculus opponens pollicis',
  'superficial head of flexor pollicis brevis': 'Caput superficiale musculi flexoris pollicis brevis', 'deep head of flexor pollicis brevis': 'Caput profundum musculi flexoris pollicis brevis',
  'oblique head of adductor pollicis': 'Caput obliquum musculi adductoris pollicis', 'transverse head of adductor pollicis': 'Caput transversum musculi adductoris pollicis',
  'abductor digiti minimi of hand': 'Musculus abductor digiti minimi manus', 'flexor digiti minimi brevis of hand': 'Musculus flexor digiti minimi brevis manus',
  'opponens digiti minimi of hand': 'Musculus opponens digiti minimi', 'set of lumbricals of hand': 'Musculi lumbricales manus',
  'set of palmar interossei of hand': 'Musculi interossei palmares', 'set of dorsal interossei of hand': 'Musculi interossei dorsales manus',
  'iliacus': 'Musculus iliacus', 'psoas major': 'Musculus psoas major', 'obturator internus': 'Musculus obturatorius internus',
  'obturator externus': 'Musculus obturatorius externus', 'gluteus maximus': 'Musculus gluteus maximus', 'gluteus medius': 'Musculus gluteus medius',
  'gluteus minimus': 'Musculus gluteus minimus', 'gemellus superior': 'Musculus gemellus superior', 'gemellus inferior': 'Musculus gemellus inferior',
  'quadratus femoris': 'Musculus quadratus femoris', 'piriformis': 'Musculus piriformis', 'sartorius': 'Musculus sartorius',
  'tensor fasciae latae': 'Musculus tensor fasciae latae', 'semitendinosus': 'Musculus semitendinosus', 'semimembranosus': 'Musculus semimembranosus',
  'long head of biceps femoris': 'Caput longum musculi bicipitis femoris', 'short head of biceps femoris': 'Caput breve musculi bicipitis femoris',
  'pectineus': 'Musculus pectineus', 'gracilis': 'Musculus gracilis', 'adductor brevis': 'Musculus adductor brevis', 'adductor longus': 'Musculus adductor longus',
  'adductor magnus': 'Musculus adductor magnus', 'adductor minimus': 'Musculus adductor minimus', 'rectus femoris': 'Musculus rectus femoris',
  'vastus lateralis': 'Musculus vastus lateralis', 'vastus medialis': 'Musculus vastus medialis', 'vastus intermedius': 'Musculus vastus intermedius',
  'tibialis anterior': 'Musculus tibialis anterior', 'tibialis posterior': 'Musculus tibialis posterior', 'extensor hallucis longus': 'Musculus extensor hallucis longus',
  'extensor digitorum longus': 'Musculus extensor digitorum longus', 'fibularis tertius': 'Musculus fibularis tertius', 'fibularis longus': 'Musculus fibularis longus',
  'fibularis brevis': 'Musculus fibularis brevis', 'medial head of gastrocnemius': 'Caput mediale musculi gastrocnemii',
  'lateral head of gastrocnemius': 'Caput laterale musculi gastrocnemii', 'soleus': 'Musculus soleus', 'plantaris': 'Musculus plantaris',
  'popliteus': 'Musculus popliteus', 'flexor hallucis longus': 'Musculus flexor hallucis longus', 'flexor digitorum longus': 'Musculus flexor digitorum longus',
  'extensor digitorum brevis': 'Musculus extensor digitorum brevis', 'extensor hallucis brevis': 'Musculus extensor hallucis brevis',
  'abductor hallucis': 'Musculus abductor hallucis', 'flexor digitorum brevis': 'Musculus flexor digitorum brevis', 'flexor accessorius': 'Musculus quadratus plantae',
  'abductor digiti minimi of foot': 'Musculus abductor digiti minimi pedis', 'flexor digiti minimi brevis of foot': 'Musculus flexor digiti minimi brevis pedis',
  'opponens digiti minimi of foot': 'Musculus opponens digiti minimi pedis', 'set of dorsal interossei of foot': 'Musculi interossei dorsales pedis',
  'medial head of flexor hallucis brevis': 'Caput mediale musculi flexoris hallucis brevis', 'lateral head of flexor hallucis brevis': 'Caput laterale musculi flexoris hallucis brevis',
  'oblique head of adductor hallucis': 'Caput obliquum musculi adductoris hallucis', 'transverse head of adductor hallucis': 'Caput transversum musculi adductoris hallucis',
  'splenius cervicis': 'Musculus splenius cervicis', 'splenius capitis': 'Musculus splenius capitis', 'iliocostalis lumborum': 'Musculus iliocostalis lumborum',
  'iliocostalis thoracis': 'Musculus iliocostalis thoracis', 'iliocostalis cervicis': 'Musculus iliocostalis cervicis', 'longissimus thoracis': 'Musculus longissimus thoracis',
  'longissimus capitis': 'Musculus longissimus capitis', 'longissimus cervicis': 'Musculus longissimus cervicis', 'spinalis thoracis': 'Musculus spinalis thoracis',
  'spinalis cervicis': 'Musculus spinalis cervicis', 'semispinalis thoracis': 'Musculus semispinalis thoracis', 'semispinalis cervicis': 'Musculus semispinalis cervicis',
  'semispinalis capitis': 'Musculus semispinalis capitis', 'multifidus': 'Musculi multifidi', 'lumbar rotator': 'Musculi rotatores lumborum',
  'cervical rotator': 'Musculi rotatores cervicis', 'rectus capitis posterior major': 'Musculus rectus capitis posterior major',
  'rectus capitis posterior minor': 'Musculus rectus capitis posterior minor', 'obliquus capitis superior': 'Musculus obliquus capitis superior',
  'obliquus capitis inferior': 'Musculus obliquus capitis inferior', 'longus capitis': 'Musculus longus capitis', 'rectus capitis anterior': 'Musculus rectus capitis anterior',
  'rectus capitis lateralis': 'Musculus rectus capitis lateralis', 'set of levatores costarum longi': 'Musculi levatores costarum longi',
  'set of levatores costarum breves': 'Musculi levatores costarum breves', 'transversus thoracis': 'Musculus transversus thoracis',
  'pubococcygeus': 'Musculus pubococcygeus', 'puborectalis': 'Musculus puborectalis', 'iliococcygeus': 'Musculus iliococcygeus', 'coccygeus': 'Musculus coccygeus',
  'platysma': 'Platysma', 'frontalis': 'Venter frontalis musculi occipitofrontalis', 'occipitalis': 'Venter occipitalis musculi occipitofrontalis',
  'temporoparietalis': 'Musculus temporoparietalis', 'orbital part of orbicularis oculi': 'Pars orbitalis musculi orbicularis oculi',
  'palpebral part of orbicularis oculi': 'Pars palpebralis musculi orbicularis oculi', 'corrugator supercilii': 'Musculus corrugator supercilii',
  'levator labii superioris alaeque nasi': 'Musculus levator labii superioris alaeque nasi', 'levator labii superioris': 'Musculus levator labii superioris',
  'zygomaticus major': 'Musculus zygomaticus major', 'zygomaticus minor': 'Musculus zygomaticus minor', 'depressor labii inferioris': 'Musculus depressor labii inferioris',
  'levator anguli oris': 'Musculus levator anguli oris', 'mentalis': 'Musculus mentalis', 'depressor anguli oris': 'Musculus depressor anguli oris',
  'buccinator': 'Musculus buccinator', 'risorius': 'Musculus risorius', 'orbicularis oris': 'Musculus orbicularis oris', 'nasalis': 'Musculus nasalis',
  'depressor septi nasi': 'Musculus depressor septi nasi', 'procerus': 'Musculus procerus', 'superficial part of masseter': 'Pars superficialis musculi masseteris',
  'deep part of masseter': 'Pars profunda musculi masseteris', 'temporalis': 'Musculus temporalis', 'medial pterygoid': 'Musculus pterygoideus medialis',
  'upper head of lateral pterygoid': 'Caput superius musculi pterygoidei lateralis', 'lower head of lateral pterygoid': 'Caput inferius musculi pterygoidei lateralis',
  'diaphragm': 'Diaphragma', 'aponeurosis of epicranius': 'Galea aponeurotica',
  // ---- heart & vessels ----
  'wall of heart': 'Paries cordis (myocardium)', 'aorta': 'Aorta', 'ascending aorta': 'Aorta ascendens', 'arch of aorta': 'Arcus aortae',
  'descending aorta': 'Aorta descendens', 'thoracic aorta': 'Pars thoracica aortae', 'abdominal aorta': 'Pars abdominalis aortae',
  'pulmonary trunk': 'Truncus pulmonalis', 'superior vena cava': 'Vena cava superior', 'inferior vena cava': 'Vena cava inferior',
  'renal vein': 'Vena renalis', 'renal artery': 'Arteria renalis', 'common iliac artery': 'Arteria iliaca communis', 'external iliac artery': 'Arteria iliaca externa',
  'internal iliac artery': 'Arteria iliaca interna', 'common iliac vein': 'Vena iliaca communis', 'external iliac vein': 'Vena iliaca externa',
  'internal iliac vein': 'Vena iliaca interna', 'common carotid artery': 'Arteria carotis communis', 'subclavian artery': 'Arteria subclavia',
  'subclavian vein': 'Vena subclavia', 'brachiocephalic vein': 'Vena brachiocephalica', 'brachiocephalic trunk': 'Truncus brachiocephalicus',
  'internal jugular vein': 'Vena jugularis interna', 'coronary sinus': 'Sinus coronarius', 'posterior papillary muscle of ventricle': 'Musculus papillaris posterior',
  'splenic vein': 'Vena splenica', 'superior mesenteric vein': 'Vena mesenterica superior', 'superior mesenteric artery': 'Arteria mesenterica superior',
  'inferior mesenteric artery': 'Arteria mesenterica inferior', 'left gastric artery': 'Arteria gastrica sinistra', 'common hepatic artery': 'Arteria hepatica communis',
  'splenic artery': 'Arteria splenica', 'celiac artery': 'Truncus coeliacus', 'brachiocephalic artery': 'Truncus brachiocephalicus',
  'trunk of right coronary artery': 'Arteria coronaria dextra', 'stem of left coronary artery': 'Arteria coronaria sinistra',
  'marginal branch of right coronary artery': 'Ramus marginalis dexter', 'posterior interventricular branch of right coronary artery': 'Ramus interventricularis posterior',
  'anterior interventricular branch of left coronary artery': 'Ramus interventricularis anterior', 'circumflex branch of left coronary artery': 'Ramus circumflexus',
  'great cardiac vein': 'Vena cardiaca magna', 'middle cardiac vein': 'Vena cardiaca media', 'set of anterior cardiac veins': 'Venae cardiacae anteriores',
  'pulmonary artery': 'Arteria pulmonalis', 'pulmonary vein': 'Vena pulmonalis', 'tricuspid valve': 'Valva atrioventricularis dextra (tricuspidalis)',
  'mitral valve': 'Valva atrioventricularis sinistra (mitralis)', 'aortic valve': 'Valva aortae', 'pulmonary valve': 'Valva trunci pulmonalis',
  'external intercostal muscle': 'Musculi intercostales externi', 'internal intercostal muscle': 'Musculi intercostales interni',
  'innermost intercostal muscle': 'Musculi intercostales intimi', 'set of interspinales lumborum': 'Musculi interspinales lumborum',
  'set of interspinales thoracis': 'Musculi interspinales thoracis', 'set of interspinales cervicis': 'Musculi interspinales cervicis',
  'tendinous arch of levator ani': 'Arcus tendineus musculi levatoris ani',
  // ---- nervous ----
  'optic nerve': 'Nervus opticus', 'optic tract': 'Tractus opticus', 'optic chiasm': 'Chiasma opticum', 'thalamus': 'Thalamus', 'hippocampus': 'Hippocampus',
  'superior frontal gyrus': 'Gyrus frontalis superior', 'middle frontal gyrus': 'Gyrus frontalis medius', 'inferior frontal gyrus': 'Gyrus frontalis inferior',
  'precentral gyrus': 'Gyrus precentralis', 'postcentral gyrus': 'Gyrus postcentralis', 'supramarginal gyrus': 'Gyrus supramarginalis', 'angular gyrus': 'Gyrus angularis',
  'middle temporal gyrus': 'Gyrus temporalis medius', 'inferior temporal gyrus': 'Gyrus temporalis inferior', 'fusiform gyrus': 'Gyrus fusiformis',
  'parahippocampal gyrus': 'Gyrus parahippocampalis', 'cingulate gyrus': 'Gyrus cinguli', 'caudate nucleus': 'Nucleus caudatus', 'putamen': 'Putamen',
  'globus pallidus': 'Globus pallidus', 'amygdala': 'Corpus amygdaloideum', 'occipital lobe': 'Lobus occipitalis', 'insula': 'Insula',
  'lateral geniculate body': 'Corpus geniculatum laterale', 'medial geniculate body': 'Corpus geniculatum mediale', 'superior colliculus': 'Colliculus superior',
  'inferior colliculus': 'Colliculus inferior', 'lateral ventricle': 'Ventriculus lateralis', 'cerebellum': 'Cerebellum', 'corpus callosum': 'Corpus callosum',
  'pons': 'Pons', 'medulla oblongata': 'Medulla oblongata', 'midbrain': 'Mesencephalon', 'fornix of forebrain': 'Fornix', 'stria terminalis': 'Stria terminalis',
  // ---- organs ----
  'liver': 'Hepar', 'gallbladder': 'Vesica biliaris', 'stomach': 'Gaster', 'esophagus': 'Oesophagus', 'duodenum': 'Duodenum', 'jejunum': 'Jejunum',
  'ileum': 'Ileum', 'pancreas': 'Pancreas', 'spleen': 'Splen (Lien)', 'kidney': 'Ren', 'ureter': 'Ureter', 'urinary bladder': 'Vesica urinaria',
  'urethra': 'Urethra', 'adrenal gland': 'Glandula suprarenalis', 'thyroid gland': 'Glandula thyroidea', 'pituitary gland': 'Hypophysis',
  'trachea': 'Trachea', 'upper lobe of lung': 'Lobus superior pulmonis', 'middle lobe of lung': 'Lobus medius pulmonis dextri', 'lower lobe of lung': 'Lobus inferior pulmonis',
  'lobe of thymus': 'Lobus thymi', 'testis': 'Testis', 'epididymis': 'Epididymis', 'deferent duct': 'Ductus deferens', 'seminal vesicle': 'Glandula vesiculosa',
  'prostate': 'Prostata', 'penis': 'Penis', 'rectum': 'Rectum', 'appendix': 'Appendix vermiformis', 'skin': 'Cutis', 'ear': 'Auris externa',
  'set of nasal cartilages': 'Cartilagines nasi', 'thyroid cartilage': 'Cartilago thyroidea', 'cricoid cartilage': 'Cartilago cricoidea',
}

const DIG_HAND = { thumb: 'pollicis', 'index finger': 'digiti II manus', 'middle finger': 'digiti III manus', 'ring finger': 'digiti IV manus', 'little finger': 'digiti V manus' }
const DIG_FOOT = { 'big toe': 'hallucis', 'second toe': 'digiti II pedis', 'third toe': 'digiti III pedis', 'fourth toe': 'digiti IV pedis', 'little toe': 'digiti V pedis' }
const PH = { proximal: 'proximalis', middle: 'media', distal: 'distalis' }

export function latin(base) {
  if (LAT[base]) return LAT[base]
  let m
  if ((m = base.match(/^(\w+) rib$/)) && ORD[m[1]]) return `Costa ${ROMAN[ORD[m[1]]]}`
  if ((m = base.match(/^(\w+) costal cartilage$/)) && ORD[m[1]]) return `Cartilago costalis ${ROMAN[ORD[m[1]]]}`
  if (base === 'costal cartilage') return 'Cartilagines costales'
  if ((m = base.match(/^(\w+) (cervical|thoracic|lumbar) vertebra$/)) && ORD[m[1]]) return `Vertebra ${{ cervical: 'cervicalis', thoracic: 'thoracica', lumbar: 'lumbalis' }[m[2]]} ${ROMAN[ORD[m[1]]]}`
  if ((m = base.match(/^(\w+) metacarpal bone$/)) && ORD[m[1]]) return `Os metacarpi ${ROMAN[ORD[m[1]]]}`
  if ((m = base.match(/^(\w+) metatarsal bone$/)) && ORD[m[1]]) return `Os metatarsi ${ROMAN[ORD[m[1]]]}`
  if ((m = base.match(/^(proximal|middle|distal) phalanx of (.+)$/))) {
    const d = DIG_HAND[m[2]] || DIG_FOOT[m[2]]
    if (d) return `Phalanx ${PH[m[1]]} ${d}`
  }
  if ((m = base.match(/^intervertebral disk of (\w+) (cervical|thoracic|lumbar) vertebra$/)) && ORD[m[1]]) {
    const L = { cervical: 'C', thoracic: 'T', lumbar: 'L' }[m[2]], n = ORD[m[1]]
    const next = L === 'C' && n === 7 ? 'T1' : L === 'T' && n === 12 ? 'L1' : L === 'L' && n === 5 ? 'S1' : L + (n + 1)
    return `Discus intervertebralis ${L}${n}–${next}`
  }
  if ((m = base.match(/^(upper|lower) (?:(central|lateral|first|second|third) )?secondary (incisor|canine|premolar|molar) tooth$/))) {
    const kind = { incisor: 'incisivus', canine: 'caninus', premolar: 'premolaris', molar: 'molaris' }[m[3]]
    const pos = !m[2] ? '' : m[2] === 'central' ? ' medialis' : m[2] === 'lateral' ? ' lateralis' : ' ' + ROMAN[ORD[m[2]]]
    return `Dens ${kind}${pos} ${m[1] === 'upper' ? 'superior' : 'inferior'}`
  }
  if ((m = base.match(/^(\w+) lumbrical of foot$/)) && ORD[m[1]]) return `Musculus lumbricalis ${ROMAN[ORD[m[1]]]} pedis`
  if ((m = base.match(/^(\w+) plantar interosseous of foot$/)) && ORD[m[1]]) return `Musculus interosseus plantaris ${ROMAN[ORD[m[1]]]}`
  return ''
}
