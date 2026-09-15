"""Build the study index from mesh names in the bundled GLB (no geometry decoding)."""
import json
import re
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = {
'Parietal bone':'Osso parietal', 'Sinus of frontal bone':'Seio frontal', 'Frontal bone':'Osso frontal',
'Occipital bone':'Osso occipital','Sinus of sphenoid bone':'Seio esfenoidal','Sphenoid bone':'Osso esfenoide',
'Temporal bone':'Osso temporal','Ethmoid bone':'Osso etmoide','Inferior nasal concha bone':'Concha nasal inferior',
'Lacrimal bone':'Osso lacrimal','Nasal bone':'Osso nasal','Maxilla':'Maxila','Palatine bone':'Osso palatino',
'Zygomatic bone':'Osso zigomático','Mandible':'Mandíbula','Hyoid bone':'Osso hioide','Malleus':'Martelo',
'Incus':'Bigorna','Stapes':'Estribo','Vomer':'Vômer','Major alar cartilage':'Cartilagem alar maior',
'Lateral process of nasal septal cartilage':'Processo lateral da cartilagem do septo nasal',
'Nasal septal cartilage':'Cartilagem do septo nasal','Thyroid cartilage':'Cartilagem tireóidea',
'Cricoid cartilage':'Cartilagem cricóidea','Arytenoid cartilage':'Cartilagem aritenóidea',
'Corniculate cartilage':'Cartilagem corniculada','Atlas (C1)':'Atlas (C1)','Axis (C2)':'Áxis (C2)',
'Coccyx':'Cóccix','Manubrium of sternum':'Manúbrio do esterno','Xiphoid process':'Processo xifoide',
'Body of sternum':'Corpo do esterno','Clavicle':'Clavícula','Humerus':'Úmero','Patella':'Patela',
'Talus':'Tálus','Calcaneus':'Calcâneo','Navicular bone':'Osso navicular','Cuboid bone':'Osso cuboide',
'Intermediate cuneiform bone':'Osso cuneiforme intermédio','Lateral cuneiform bone':'Osso cuneiforme lateral',
'Medial cuneiform bone':'Osso cuneiforme medial','Sesamoid bones of foot':'Ossos sesamoides do pé',
'Capitate bone':'Osso capitato','Hamate bone':'Osso hamato','Lunate bone':'Osso semilunar',
'Pisiform bone':'Osso pisiforme','Scaphoid bone':'Osso escafoide','Trapezium bone':'Osso trapézio',
'Trapezoid bone':'Osso trapezoide','Triquetrum bone':'Osso piramidal','Scapula':'Escápula',
'Radius':'Rádio','Ulna':'Ulna','Femur':'Fêmur','Hip bone':'Osso coxal','Tibia':'Tíbia','Fibula':'Fíbula','Sacrum':'Sacro',
}
NUMBERS = ['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth']
HAND = ['Capitate','Hamate','Lunate','Pisiform','Scaphoid','Trapezium','Trapezoid','Triquetrum']
FOOT = ['Talus','Calcaneus','Navicular','Cuboid','cuneiform','Sesamoid']
def translate(base):
    if base in BASE: return BASE[base]
    if base.startswith('Vertebra '): return base.replace('Vertebra ', 'Vértebra ')
    match = re.fullmatch(r'(Posterior|Middle|Anterior) cells of ethmoid bone',base)
    if match: return 'Células etmoidais ' + {'Posterior':'posteriores','Middle':'médias','Anterior':'anteriores'}[match[1]]
    match = re.fullmatch(r'(Proximal|Middle|Distal) phalanx of (\w+) finger of (hand|foot)',base)
    if match:
        level={'Proximal':'proximal','Middle':'média','Distal':'distal'}[match[1]]
        return f'Falange {level} do {NUMBERS.index(match[2])+1}º dedo ' + ('da mão' if match[3]=='hand' else 'do pé')
    match = re.fullmatch(r'(\w+) meta(carpal|tarsal) bone',base,re.I)
    if match: return f'{NUMBERS.index(match[1].lower())+1}º meta' + ('carpal' if match[2]=='carpal' else 'tarsal')
    match = re.fullmatch(r'(Costal cartilage of )?(\w+) rib',base,re.I)
    if match: return ('Cartilagem costal da ' if match[1] else '') + f'{NUMBERS.index(match[2].lower())+1}ª costela'
    match = re.fullmatch(r'(Upper|Lower) (medial incisor|lateral incisor|canine|first premolar|second premolar|first molar tooth|second molar tooth)',base)
    if match:
        tooth={'medial incisor':'Incisivo central','lateral incisor':'Incisivo lateral','canine':'Canino','first premolar':'1º pré-molar','second premolar':'2º pré-molar','first molar tooth':'1º molar','second molar tooth':'2º molar'}[match[2]]
        return tooth + (' superior' if match[1]=='Upper' else ' inferior')
    raise ValueError('Missing translation: '+base)
def region(base):
    if 'hand' in base or 'metacarpal' in base or any(x in base for x in HAND): return 'Mãos'
    if 'foot' in base or 'metatarsal' in base or any(x in base for x in FOOT): return 'Pés'
    if base in ['Clavicle','Scapula','Humerus','Radius','Ulna']: return 'Membros superiores'
    if base in ['Femur','Patella','Tibia','Fibula']: return 'Membros inferiores'
    if base in ['Hip bone','Sacrum','Coccyx']: return 'Pelve'
    if base.startswith('Vertebra') or base in ['Atlas (C1)','Axis (C2)']: return 'Coluna vertebral'
    if 'rib' in base or 'sternum' in base or base=='Xiphoid process': return 'Tórax'
    return 'Cabeça e pescoço'
def main():
    raw=(ROOT/'public/models/esqueleto-anatomico.glb').read_bytes()
    length=struct.unpack_from('<I',raw,12)[0]
    gltf=json.loads(raw[20:20+length]); records={}
    for node in gltf['nodes']:
        if 'mesh' not in node or node['name'].startswith('Skeletal system'): continue
        name=node['name']; base=re.sub(r'(\.[rl])?\.001$','',name)
        side='right' if '.r.' in name else 'left' if '.l.' in name else 'midline'
        kind='Cartilagem' if 'cartilage' in base else 'Dente' if re.search('incisor|canine|molar',base) else 'Cavidade' if re.search('Sinus|cells',base) else 'Estrutura óssea'
        key=re.sub('[^a-z0-9]','',name.lower())
        records[key]={'name':translate(base),'original':base,'side':side,'region':region(base),'kind':kind}
    (ROOT/'src/data/anatomy-catalog.js').write_text('// Generated by scripts/build-catalog.py. Names are editorial translations, pending specialist review.\nwindow.ANATOMY_CATALOG = '+json.dumps(records,ensure_ascii=False,indent=2)+';\n')
    print(f'{len(records)} structures indexed, all translated.')
if __name__=='__main__': main()
