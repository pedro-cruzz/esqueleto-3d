"""Build the muscular-system study index from the bundled muscle GLB."""
import json
import re
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODEL = ROOT / 'public' / 'models' / 'musculos.glb'
OUTPUT = ROOT / 'src' / 'data' / 'muscle-catalog.js'

# Whole-term overrides keep standard muscle names readable in Portuguese.
# These editorial labels retain the source name for specialist review.
EXACT_LABELS = {
    'sternocostal part of pectoralis major': 'Porção esternocostal do peitoral maior',
    'superficial part of masseter': 'Porção superficial do masseter',
    'deep part of masseter': 'Porção profunda do masseter',
    'anconeus': 'Ancôneo', 'brachialis': 'Braquial', 'coracobrachialis': 'Coracobraquial',
    'supraspinatus': 'Supraespinal', 'infraspinatus muscle': 'Infraespinal',
    'subscapularis': 'Subescapular', 'teres major': 'Redondo maior', 'teres minor': 'Redondo menor',
    'subclavius': 'Subclávio', 'levator scapulae': 'Levantador da escápula',
    'semimembranosus': 'Semimembranáceo', 'semitendinosus': 'Semitendíneo',
    'gracilis': 'Grácil', 'pectineus': 'Pectíneo', 'piriformis': 'Piriforme',
    'iliacus': 'Ilíaco', 'psoas major': 'Psoas maior', 'quadratus femoris': 'Quadrado femoral',
    'gemellus inferior': 'Gêmeo inferior', 'gemellus superior': 'Gêmeo superior',
    'obturator externus': 'Obturador externo', 'obturator internus': 'Obturador interno',
    'tensor fasciae latae': 'Tensor da fáscia lata', 'iliotibial tract': 'Trato iliotibial',
    'plantaris': 'Plantar', 'popliteus': 'Poplíteo', 'fibularis tertius': 'Fibular terceiro',
    'adductor minimus': 'Adutor mínimo', 'palmaris longus': 'Palmar longo',
    'pronator quadratus': 'Pronador quadrado', 'extensor indicis': 'Extensor do indicador',
    'extensor carpi radialis brevis': 'Extensor radial curto do carpo',
    'extensor carpi radialis longus': 'Extensor radial longo do carpo',
    'extensor carpi ulnaris': 'Extensor ulnar do carpo',
    'flexor carpi radialis': 'Flexor radial do carpo',
    'humeral head of flexor carpi ulnaris': 'Cabeça umeral do flexor ulnar do carpo',
    'ulnar head of flexor carpi ulnaris': 'Cabeça ulnar do flexor ulnar do carpo',
    'humeral head of pronator teres': 'Cabeça umeral do pronador redondo',
    'ulnar head of pronator teres': 'Cabeça ulnar do pronador redondo',
    'flexor digitorum profundus': 'Flexor profundo dos dedos',
    'flexor digitorum superficialis': 'Flexor superficial dos dedos',
    'flexor digitorum longus': 'Flexor longo dos dedos', 'flexor digitorum brevis': 'Flexor curto dos dedos',
    'extensor digitorum longus': 'Extensor longo dos dedos',
    'flexor pollicis longus': 'Flexor longo do polegar', 'flexor pollicis brevis': 'Flexor curto do polegar',
    'extensor pollicis longus': 'Extensor longo do polegar', 'extensor pollicis brevis': 'Extensor curto do polegar',
    'abductor pollicis longus': 'Abdutor longo do polegar', 'abductor pollicis brevis': 'Abdutor curto do polegar',
    'extensor digiti minimi': 'Extensor do dedo mínimo', 'opponens pollicis': 'Oponente do polegar',
    'flexor hallucis longus': 'Flexor longo do hálux', 'extensor hallucis longus': 'Extensor longo do hálux',
    'extensor hallucis brevis': 'Extensor curto do hálux', 'flexor accessorius': 'Quadrado plantar',
    'flexor retinaculum of wrist': 'Retináculo dos flexores do punho',
    'interosseous membrane of forearm': 'Membrana interóssea do antebraço',
    'interosseous membrane of leg': 'Membrana interóssea da perna',
    'long plantar ligament': 'Ligamento plantar longo',
    'external intercostal muscle': 'Intercostal externo', 'internal intercostal muscle': 'Intercostal interno',
    'innermost intercostal muscle': 'Intercostal íntimo', 'transversus abdominis': 'Transverso do abdome',
    'transversus thoracis': 'Transverso do tórax',
    'serratus posterior inferior': 'Serrátil posterior inferior', 'serratus posterior superior': 'Serrátil posterior superior',
    'scalenus anterior': 'Escaleno anterior', 'scalenus medius': 'Escaleno médio', 'scalenus posterior': 'Escaleno posterior',
    'splenius capitis': 'Esplênio da cabeça', 'splenius cervicis': 'Esplênio do pescoço',
    'longus capitis': 'Longo da cabeça', 'sternohyoid': 'Esterno-hióideo', 'sternothyroid': 'Esternotireóideo',
    'thyrohyoid': 'Tireo-hióideo', 'stylohyoid': 'Estilo-hióideo', 'omohyoid': 'Omo-hióideo',
    'mylohyoid': 'Milo-hióideo', 'geniohyoid': 'Gênio-hióideo', 'digastric': 'Digástrico',
    'platysma': 'Platisma', 'frontalis': 'Frontal', 'mentalis': 'Mentual', 'nasalis': 'Nasal',
    'risorius': 'Risório', 'procerus': 'Prócero', 'orbicularis oris': 'Orbicular da boca',
    'corrugator supercilii': 'Corrugador do supercílio', 'depressor anguli oris': 'Depressor do ângulo da boca',
    'depressor labii inferioris': 'Depressor do lábio inferior', 'levator labii superioris': 'Levantador do lábio superior',
    'levator palpebrae superioris': 'Levantador da pálpebra superior',
    'zygomaticus major': 'Zigomático maior', 'zygomaticus minor': 'Zigomático menor',
    'superior rectus': 'Reto superior', 'inferior rectus': 'Reto inferior',
    'medial rectus': 'Reto medial', 'lateral rectus': 'Reto lateral',
    'superior oblique': 'Oblíquo superior', 'inferior oblique': 'Oblíquo inferior',
    'coccygeus': 'Coccígeo', 'iliococcygeus': 'Iliococcígeo', 'pubococcygeus': 'Pubococcígeo',
    'puborectalis': 'Puborretal', 'external anal sphincter': 'Esfíncter externo do ânus',
    'arytenoid cartilage': 'Cartilagem aritenóidea',
    'anterior layer of thoracolumbar fascia': 'Lâmina anterior da fáscia toracolombar',
    'middle layer of thoracolumbar fascia': 'Lâmina média da fáscia toracolombar',
    'posterior layer of thoracolumbar fascia': 'Lâmina posterior da fáscia toracolombar',
}

TRANSLATIONS = {
    'abdominal part': 'porção abdominal', 'acromial part': 'porção acromial',
    'ascending part': 'porção ascendente', 'clavicular part': 'porção clavicular',
    'descending part': 'porção descendente', 'spinal part': 'porção espinal',
    'transverse part': 'porção transversa', 'long head': 'cabeça longa',
    'short head': 'cabeça curta', 'lateral head': 'cabeça lateral',
    'medial head': 'cabeça medial', 'intermediate tendon': 'tendão intermédio',
    'muscle': '', 'tendon': 'tendão', 'aponeurosis': 'aponeurose',
    'pectoralis major': 'peitoral maior', 'pectoralis minor': 'peitoral menor',
    'deltoid': 'deltoide', 'trapezius': 'trapézio', 'serratus anterior': 'serrátil anterior',
    'latissimus dorsi': 'latíssimo do dorso', 'rhomboid major': 'romboide maior',
    'rhomboid minor': 'romboide menor', 'biceps brachii': 'bíceps braquial',
    'triceps brachii': 'tríceps braquial', 'brachioradialis': 'braquiorradial',
    'extensor digitorum': 'extensor dos dedos', 'flexor digitorum': 'flexor dos dedos',
    'gluteus maximus': 'glúteo máximo', 'gluteus medius': 'glúteo médio',
    'gluteus minimus': 'glúteo mínimo', 'biceps femoris': 'bíceps femoral',
    'rectus femoris': 'reto femoral', 'vastus lateralis': 'vasto lateral',
    'vastus medialis': 'vasto medial', 'vastus intermedius': 'vasto intermédio',
    'adductor longus': 'adutor longo', 'adductor magnus': 'adutor magno',
    'sartorius': 'sartório', 'gastrocnemius': 'gastrocnêmio', 'soleus': 'sóleo',
    'tibialis anterior': 'tibial anterior', 'tibialis posterior': 'tibial posterior',
    'fibularis longus': 'fibular longo', 'fibularis brevis': 'fibular curto',
    'calcaneal tendon': 'tendão calcâneo', 'sternocleidomastoid': 'esternocleidomastóideo',
    'masseter': 'masseter', 'temporalis': 'temporal', 'diaphragm': 'diafragma',
    'rectus abdominis': 'reto abdominal', 'external oblique': 'oblíquo externo',
    'internal oblique': 'oblíquo interno', 'quadratus lumborum': 'quadrado lombar',
}

WORD_TRANSLATIONS = {
    'left': '', 'right': '', 'of': 'do', 'and': 'e', 'part': 'porção',
    'foot': 'pé', 'hand': 'mão', 'finger': 'dedo', 'abductor': 'abdutor',
    'adductor': 'adutor', 'flexor': 'flexor', 'extensor': 'extensor',
    'pronator': 'pronador', 'supinator': 'supinador', 'interosseous': 'interósseo',
    'lumbrical': 'lumbrical', 'carpi': 'do carpo', 'radialis': 'radial',
    'ulnaris': 'ulnar', 'brevis': 'curto', 'longus': 'longo', 'profundus': 'profundo',
    'superficialis': 'superficial', 'hallucis': 'do hálux', 'digiti': 'do dedo',
    'superior': 'superior', 'inferior': 'inferior', 'medial': 'medial',
    'lateral': 'lateral', 'anterior': 'anterior', 'posterior': 'posterior',
    'intercostal': 'intercostal', 'innermost': 'íntimo', 'external': 'externo',
    'internal': 'interno', 'transversus': 'transverso', 'transverse': 'transverso',
    'thoracic': 'torácico', 'cervical': 'cervical', 'lumbar': 'lombar',
}


def label_for(base):
    clean = re.sub(r' \(\d+\)$', '', base.lower())
    suffix = base[len(clean):]
    if clean in EXACT_LABELS:
        return EXACT_LABELS[clean] + suffix
    text = base.lower()
    for source, target in sorted(TRANSLATIONS.items(), key=lambda pair: -len(pair[0])):
        text = text.replace(source, target)
    words = [WORD_TRANSLATIONS.get(word, word) for word in text.split()]
    text = re.sub(r'\s+', ' ', ' '.join(words)).strip(' -')
    text = text.replace('do mão', 'da mão').replace('minimi', 'mínimo').replace('pollicis', 'do polegar')
    return text[:1].upper() + text[1:]


def region_for(base):
    text = base.lower()
    if any(term in text for term in ('supraspinatus', 'infraspinatus', 'subscapularis', 'teres major', 'teres minor', 'subclavius', 'levator scapulae', 'coracobrachialis', 'brachialis')):
        return 'Membros superiores'
    if any(term in text for term in ('semimembranosus', 'semitendinosus', 'gracilis')):
        return 'Coxa'
    if any(term in text for term in ('anal sphincter', 'iliococcygeus', 'levator ani')):
        return 'Quadril'
    if any(term in text for term in ('superior rectus', 'inferior rectus', 'medial rectus', 'lateral rectus', 'superior oblique', 'inferior oblique', 'pterygoid', 'longus colli', 'longus capitis', 'frontalis', 'nasalis', 'mentalis', 'procerus', 'risorius', 'zygomatic', 'labii', 'oris', 'supercilii')):
        return 'Cabeça e pescoço'
    if 'thoracolumbar fascia' in text:
        return 'Tronco'
    if 'iliotibial tract' in text:
        return 'Coxa'
    if any(term in text for term in ('masseter', 'temporalis', 'orbicular', 'sternocleidomastoid', 'scalen', 'genio', 'hyoid', 'mylohyoid', 'digastric', 'platysma', 'stylohyoid', 'thyro', 'crico', 'rectus capitis', 'levator veli', 'palpebrae')):
        return 'Cabeça e pescoço'
    if any(term in text for term in ('foot', 'toe', 'plantar', 'hallucis')):
        return 'Pés'
    if any(term in text for term in ('hand', 'finger', 'lumbrical', 'interosse', 'pollicis')):
        return 'Mãos'
    if any(term in text for term in ('gastrocnemius', 'soleus', 'tibialis', 'fibularis', 'peroneus', 'popliteus')):
        return 'Perna'
    if any(term in text for term in ('femoris', 'vastus', 'sartorius', 'adductor', 'hamstring', 'gracilis')):
        return 'Coxa'
    if any(term in text for term in ('glute', 'iliopsoas', 'iliacus', 'psoas', 'piriformis', 'obturator', 'quadratus femoris', 'coccygeus', 'pubococcygeus', 'puborectalis', 'gemellus', 'pectineus', 'tensor fasciae')):
        return 'Quadril'
    if any(term in text for term in ('pectoralis', 'intercostal', 'serratus', 'latissimus', 'trapezius', 'rhomboid', 'diaphragm')):
        return 'Tórax e dorso'
    if any(term in text for term in ('abdom', 'oblique', 'erector spinae', 'multifidus', 'quadratus lumborum', 'spinalis', 'intertransversarius', 'longissimus', 'semispinalis', 'splenius', 'iliocostalis', 'transversus thoracis')):
        return 'Tronco'
    if any(term in text for term in ('brach', 'deltoid', 'biceps brachii', 'triceps brachii', 'forearm', 'wrist', 'anconeus', 'carpi', 'radialis', 'ulnaris', 'pronator', 'supinator', 'palmaris')):
        return 'Membros superiores'
    return 'Corpo inteiro'


def main():
    raw = MODEL.read_bytes()
    length = struct.unpack_from('<I', raw, 12)[0]
    gltf = json.loads(raw[20:20 + length])
    records = {}
    for node in gltf['nodes']:
        name = node.get('name', '')
        if 'mesh' not in node or name == 'BodyMuscles':
            continue
        base = re.sub(r'\s+', ' ', re.sub(r'\b(left|right)\b', '', name, flags=re.I)).strip()
        side = 'right' if re.search(r'\bright\b', name, re.I) else 'left' if re.search(r'\bleft\b', name, re.I) else 'midline'
        key = re.sub('[^a-z0-9]', '', name.lower())
        if re.search(r'fascia\b|iliotibial tract', base, re.I):
            kind = 'Fáscia'
        elif re.search(r'retinaculum', base, re.I):
            kind = 'Retináculo'
        elif re.search(r'membrane', base, re.I):
            kind = 'Membrana'
        elif re.search(r'cartilage', base, re.I):
            kind = 'Cartilagem'
        elif re.search(r'ligament', base, re.I):
            kind = 'Ligamento'
        elif re.search(r'aponeurosis', base, re.I):
            kind = 'Aponeurose'
        elif re.search(r'tendon|tendinous', base, re.I):
            kind = 'Tendão'
        else:
            kind = 'Músculo'
        records[key] = {
            'name': label_for(base), 'original': base, 'side': side,
            'region': region_for(base), 'kind': kind,
            'review': 'Nomenclatura editorial em revisão; nome original preservado.',
        }
    output = "// Generated by scripts/build-muscle-catalog.py. Editorial translations pending specialist review.\nwindow.ANATOMY_CATALOGS = window.ANATOMY_CATALOGS || {};\nwindow.ANATOMY_CATALOGS.muscular = " + json.dumps(records, ensure_ascii=False, indent=2) + ';\n'
    OUTPUT.write_text(output)
    print(f'{len(records)} muscular structures indexed.')


if __name__ == '__main__':
    main()
