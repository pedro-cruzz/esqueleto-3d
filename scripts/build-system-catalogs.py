"""Index original Z-Anatomy names; translate only explicit editorial matches.

Unknown terms remain in the source language, never machine-composed anatomy.
Rebuild: python3 scripts/build-system-catalogs.py
"""
import json
import re
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODELS = {'cardiovascular': 'cardiovascular', 'nervous': 'nervoso', 'organs': 'orgaos'}
LABELS = {
    'right atrium': 'Átrio direito', 'left atrium': 'Átrio esquerdo',
    'right ventricle': 'Ventrículo direito', 'left ventricle': 'Ventrículo esquerdo',
    'ascending aorta': 'Aorta ascendente', 'arch of aorta': 'Arco da aorta',
    'aortic arch': 'Arco da aorta', 'descending aorta': 'Aorta descendente',
    'thoracic aorta': 'Aorta torácica', 'abdominal aorta': 'Aorta abdominal',
    'superior vena cava': 'Veia cava superior', 'inferior vena cava': 'Veia cava inferior',
    'pulmonary trunk': 'Tronco pulmonar', 'coronary sinus': 'Seio coronário',
    'right coronary artery': 'Artéria coronária direita', 'left coronary artery': 'Artéria coronária esquerda',
    'common carotid artery': 'Artéria carótida comum', 'internal carotid artery': 'Artéria carótida interna',
    'external carotid artery': 'Artéria carótida externa', 'subclavian artery': 'Artéria subclávia',
    'axillary artery': 'Artéria axilar', 'brachial artery': 'Artéria braquial',
    'radial artery': 'Artéria radial', 'ulnar artery': 'Artéria ulnar',
    'femoral artery': 'Artéria femoral', 'popliteal artery': 'Artéria poplítea',
    'renal artery': 'Artéria renal', 'renal vein': 'Veia renal', 'femoral vein': 'Veia femoral',
    'internal jugular vein': 'Veia jugular interna', 'great saphenous vein': 'Veia safena magna',
    'small saphenous vein': 'Veia safena parva', 'cephalic vein': 'Veia cefálica',
    'basilic vein': 'Veia basílica', 'portal vein': 'Veia porta',
    'sciatic nerve': 'Nervo isquiático', 'median nerve': 'Nervo mediano',
    'ulnar nerve': 'Nervo ulnar', 'radial nerve': 'Nervo radial', 'femoral nerve': 'Nervo femoral',
    'tibial nerve': 'Nervo tibial', 'common fibular nerve': 'Nervo fibular comum',
    'optic nerve': 'Nervo óptico', 'vagus nerve': 'Nervo vago', 'facial nerve': 'Nervo facial',
    'trigeminal nerve': 'Nervo trigêmeo', 'brachial plexus': 'Plexo braquial',
    'spinal cord': 'Medula espinal', 'cerebellum': 'Cerebelo', 'pons': 'Ponte',
    'medulla oblongata': 'Bulbo', 'thalamus': 'Tálamo', 'hypothalamus': 'Hipotálamo',
    'hippocampus': 'Hipocampo', 'amygdaloid body': 'Corpo amigdaloide',
    'choroid plexus': 'Plexo corióideo', 'central sulcus': 'Sulco central',
    'precentral gyrus': 'Giro pré-central', 'postcentral gyrus': 'Giro pós-central',
    'falx cerebri': 'Foice do cérebro', 'spinal dura': 'Dura-máter espinal',
    'stomach': 'Estômago', 'liver': 'Fígado', 'pancreas': 'Pâncreas',
    'gallbladder': 'Vesícula biliar', 'kidney': 'Rim', 'urinary bladder': 'Bexiga urinária',
    'ureter': 'Ureter', 'urethra': 'Uretra', 'renal pelvis': 'Pelve renal',
    'oesophagus': 'Esôfago', 'duodenum': 'Duodeno', 'jejunum': 'Jejuno',
    'ascending colon': 'Colo ascendente', 'transverse colon': 'Colo transverso',
    'descending colon': 'Colo descendente', 'sigmoid colon': 'Colo sigmoide',
    'vermiform appendix': 'Apêndice vermiforme', 'tongue': 'Língua',
    'trachea': 'Traqueia', 'epiglottis': 'Epiglote', 'pharynx': 'Faringe',
    'oropharynx': 'Orofaringe', 'nasopharynx': 'Nasofaringe', 'laryngopharynx': 'Laringofaringe',
    'superior lobe of right lung': 'Lobo superior do pulmão direito',
    'middle lobe of right lung': 'Lobo médio do pulmão direito',
    'inferior lobe of right lung': 'Lobo inferior do pulmão direito',
    'superior lobe of left lung': 'Lobo superior do pulmão esquerdo',
    'inferior lobe of left lung': 'Lobo inferior do pulmão esquerdo',
    'right main bronchus': 'Brônquio principal direito', 'left main bronchus': 'Brônquio principal esquerdo',
    'thyroid gland': 'Glândula tireoide', 'suprarenal gland': 'Glândula suprarrenal',
    'pineal gland': 'Glândula pineal', 'adenohypophysis': 'Adeno-hipófise',
    'neurohypophysis': 'Neuro-hipófise', 'prostate': 'Próstata', 'testis': 'Testículo',
    'epididymis': 'Epidídimo', 'ductus deferens': 'Ducto deferente',
    'seminal gland': 'Glândula seminal', 'parotid gland': 'Glândula parótida',
    'sublingual gland': 'Glândula sublingual', 'submandibular gland': 'Glândula submandibular',
    'bile duct': 'Ducto biliar', 'pancreatic duct': 'Ducto pancreático',
    'pleura': 'Pleura', 'greater omentum': 'Omento maior', 'lesser omentum': 'Omento menor',
}

def classify(system, name):
    n = name.lower()
    if system == 'cardiovascular':
        kind = 'Veia' if any(x in n for x in ('vein', 'venous', 'vena', 'sinus')) else 'Artéria' if any(x in n for x in ('arter', 'aort', 'pulmonary trunk')) else 'Vaso sanguíneo'
        if any(x in n for x in ('atrium', 'ventricle', 'leaflet', 'valve', 'papillary', 'heart', 'coronary', 'cardiac')):
            return 'Coração', kind if kind in ('Artéria', 'Veia') else 'Estrutura cardíaca'
        return ('Circulação pulmonar' if 'pulmonary' in n or 'lung' in n else 'Circulação sistêmica'), kind
    if system == 'nervous':
        if any(x in n for x in ('retina', 'eyeball', 'lens', 'cornea', 'iris', 'cochlea', 'tympan', 'ear', 'ossicle', 'sclera', 'semicircular', 'utricle', 'saccule')):
            return 'Órgãos dos sentidos', 'Estrutura sensorial'
        if any(x in n for x in ('nerve', 'plexus', 'ganglion')) and 'nucleus' not in n:
            return 'Nervos e plexos', 'Nervo / plexo'
        if any(x in n for x in ('spinal cord', 'spinal dura', 'spinal tract', 'spinothalamic', 'spinocerebellar', 'central canal')):
            return 'Medula e vias espinais', 'Estrutura nervosa'
        return 'Encéfalo e envoltórios', 'Estrutura nervosa'
    if any(x in n for x in ('hypophysis', 'thyroid', 'suprarenal', 'pineal')):
        return 'Sistema endócrino', 'Glândula'
    if any(x in n for x in ('kidney', 'renal', 'ureter', 'urethra', 'urinary')):
        return 'Sistema urinário', 'Órgão / parte'
    if any(x in n for x in ('testis', 'epididym', 'deferens', 'seminal', 'prostate', 'ejaculatory', 'penis')):
        return 'Sistema genital masculino', 'Órgão / parte'
    if any(x in n for x in ('lung', 'bronch', 'trachea', 'epiglottis', 'pleura', 'nasal')):
        return 'Sistema respiratório', 'Órgão / parte'
    return 'Sistema digestório e anexos', 'Órgão / parte'

def main():
    for system, filename in MODELS.items():
        data = (ROOT / 'public/models' / f'{filename}.glb').read_bytes()
        gltf = json.loads(data[20:20 + struct.unpack_from('<I', data, 12)[0]])
        records = {}
        for index, node in enumerate(gltf['nodes']):
            name = node.get('name', '')
            # Collection marker meshes are not anatomical structures.
            if 'mesh' not in node or re.search(r'\.g\.\d+$', name):
                continue
            key = re.sub('[^a-z0-9]', '', name.lower()) + f'node{index}'
            suffix = re.search(r'\.([lr])\.\d+$', name)
            side = ('left' if suffix[1] == 'l' else 'right') if suffix else 'right' if re.search(r'\bright\b', name, re.I) else 'left' if re.search(r'\bleft\b', name, re.I) else 'midline'
            base = re.sub(r'(?:\.[lrj])?\.\d+$', '', name).strip()
            label = LABELS.get(base.lower(), base)
            identified = bool(re.search('[A-Za-z]', base))
            region, kind = classify(system, base)
            records[key] = {'name': label if identified else 'Estrutura sem identificação na fonte', 'original': base, 'sourceNode': index,
                            'side': side, 'sideInName': not bool(suffix), 'region': region, 'kind': kind,
                            'translation': 'editorial' if base.lower() in LABELS else 'source',
                            'review': 'Tradução editorial; revisão anatômica pendente.' if base.lower() in LABELS else 'Nome original da fonte; tradução e revisão pendentes.'}
        output = '// Generated by scripts/build-system-catalogs.py.\nwindow.ANATOMY_CATALOGS = window.ANATOMY_CATALOGS || {};\n'
        output += f'window.ANATOMY_CATALOGS.{system} = ' + json.dumps(records, ensure_ascii=False, indent=2) + ';\n'
        (ROOT / 'src/data' / f'{system}-catalog.js').write_text(output)
        print(system, len(records), 'structures')

if __name__ == '__main__':
    main()
