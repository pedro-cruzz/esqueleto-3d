"""Build the muscular-system study index from the bundled muscle GLB."""
import json
import re
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODEL = ROOT / 'public' / 'models' / 'musculos.glb'
OUTPUT = ROOT / 'src' / 'data' / 'muscle-catalog.js'

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
    text = base.lower()
    for source, target in sorted(TRANSLATIONS.items(), key=lambda pair: -len(pair[0])):
        text = text.replace(source, target)
    words = [WORD_TRANSLATIONS.get(word, word) for word in text.split()]
    text = re.sub(r'\s+', ' ', ' '.join(words)).strip(' -')
    return text[:1].upper() + text[1:]


def region_for(base):
    text = base.lower()
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
        if re.search(r'cartilage', base, re.I):
            kind = 'Cartilagem'
        elif re.search(r'ligament', base, re.I):
            kind = 'Ligamento'
        elif re.search(r'aponeurosis', base, re.I):
            kind = 'Aponeurose'
        elif re.search(r'tendon', base, re.I):
            kind = 'Tendão'
        else:
            kind = 'Músculo'
        records[key] = {
            'name': label_for(base), 'original': base, 'side': side,
            'region': region_for(base), 'kind': kind,
        }
    output = "// Generated by scripts/build-muscle-catalog.py. Editorial translations pending specialist review.\nwindow.ANATOMY_CATALOGS = window.ANATOMY_CATALOGS || {};\nwindow.ANATOMY_CATALOGS.muscular = " + json.dumps(records, ensure_ascii=False, indent=2) + ';\n'
    OUTPUT.write_text(output)
    print(f'{len(records)} muscular structures indexed.')


if __name__ == '__main__':
    main()
