const MODEL_PATH = 'public/models/esqueleto-anatomico.glb';
const DRACO_PATH = 'public/draco/';
const radiologyMode = new URLSearchParams(window.location.search).get('radiology') === '1';

const container = document.getElementById('canvas-container');
const loadingEl = document.getElementById('loading');
const statusEl = document.getElementById('status');
const controlsRoot = document.getElementById('controls');
const uiEl = document.getElementById('ui');
const panelToggle = document.getElementById('panel-toggle');
const panelBody = document.getElementById('panel-body');
const sheetCountEl = document.querySelector('.sheet-count');
const resetBtn = document.getElementById('reset-pose');
const centerBtn = document.getElementById('center-camera');
const fullscreenBtn = document.getElementById('fullscreen');
const mobileMedia = window.matchMedia(
  '(max-width: 720px), (max-height: 560px) and (orientation: landscape)'
);
const coarsePointerMedia = window.matchMedia('(pointer: coarse)');

function control(section, id, label, axis, direction, min, max, candidate) {
  return {
    section,
    id,
    label,
    axis,
    direction,
    min,
    max,
    step: 1,
    candidates: [candidate],
  };
}

// Amplitudes funcionais aproximadas em graus para uma pessoa adulta sem lesão
// articular. Articulações em dobradiça não recebem valores negativos para
// impedir hiperextensões impossíveis (cotovelo e joelho).
const CONTROL_DEFS = [
  control('Corpo', 'hips', 'Pelve: frente / trás', 'x', 1, -12, 15, 'Hips'),
  control('Corpo', 'hipsLateral', 'Pelve: inclinação lateral', 'z', 1, -12, 12, 'Hips'),
  control('Corpo', 'hipsRotation', 'Pelve: rotação', 'y', 1, -15, 15, 'Hips'),
  control('Corpo', 'spine', 'Coluna: flexão / extensão', 'x', 1, -30, 60, 'Spine'),
  control('Corpo', 'spineLateral', 'Coluna: inclinação lateral', 'z', 1, -35, 35, 'Spine'),
  control('Corpo', 'spineRotation', 'Coluna: rotação', 'y', 1, -40, 40, 'Spine'),
  control('Corpo', 'neck', 'Pescoço: rotação', 'y', 1, -70, 70, 'Neck'),
  control('Corpo', 'neckLateral', 'Pescoço: inclinação lateral', 'z', 1, -35, 35, 'Neck'),
  control('Corpo', 'head', 'Cabeça: flexão / extensão', 'x', 1, -45, 50, 'Head'),

  control('Braço Direito', 'rightShoulder', 'Elevação Escapular', 'z', -1, -10, 20, 'RightShoulder'),
  control('Braço Direito', 'rightShoulderProtraction', 'Escápula: retrair / avançar', 'y', 1, -15, 25, 'RightShoulder'),
  control('Braço Direito', 'rightArm', 'Ombro: Frente / Trás', 'x', -1, -40, 150, 'RightArm'),
  control('Braço Direito', 'rightArmAbduction', 'Ombro: Abrir', 'z', -1, 0, 180, 'RightArmAbduction'),
  control('Braço Direito', 'rightArmRotation', 'Ombro: rotação', 'y', 1, -60, 70, 'RightArmAbduction'),
  control('Braço Direito', 'rightForeArm', 'Flexão do Cotovelo', 'x', -1, 0, 145, 'RightForeArm'),
  control('Braço Direito', 'rightForeArmRotation', 'Antebraço: supinar / pronar', 'y', 1, -80, 80, 'RightForeArm'),
  control('Braço Direito', 'rightHand', 'Punho: flexão / extensão', 'x', -1, -70, 80, 'RightHand'),
  control('Braço Direito', 'rightHandDeviation', 'Punho: desvio lateral', 'z', -1, -20, 30, 'RightHand'),

  control('Mão Direita', 'rightFinger1', 'Polegar', 'x', -1, 0, 70, 'RightFinger1'),
  control('Mão Direita', 'rightFinger2', 'Indicador', 'x', -1, 0, 90, 'RightFinger2'),
  control('Mão Direita', 'rightFinger3', 'Médio', 'x', -1, 0, 90, 'RightFinger3'),
  control('Mão Direita', 'rightFinger4', 'Anelar', 'x', -1, 0, 90, 'RightFinger4'),
  control('Mão Direita', 'rightFinger5', 'Mínimo', 'x', -1, 0, 90, 'RightFinger5'),

  control('Braço Esquerdo', 'leftShoulder', 'Elevação Escapular', 'z', 1, -10, 20, 'LeftShoulder'),
  control('Braço Esquerdo', 'leftShoulderProtraction', 'Escápula: retrair / avançar', 'y', -1, -15, 25, 'LeftShoulder'),
  control('Braço Esquerdo', 'leftArm', 'Ombro: Frente / Trás', 'x', -1, -40, 150, 'LeftArm'),
  control('Braço Esquerdo', 'leftArmAbduction', 'Ombro: Abrir', 'z', 1, 0, 180, 'LeftArmAbduction'),
  control('Braço Esquerdo', 'leftArmRotation', 'Ombro: rotação', 'y', -1, -60, 70, 'LeftArmAbduction'),
  control('Braço Esquerdo', 'leftForeArm', 'Flexão do Cotovelo', 'x', -1, 0, 145, 'LeftForeArm'),
  control('Braço Esquerdo', 'leftForeArmRotation', 'Antebraço: supinar / pronar', 'y', -1, -80, 80, 'LeftForeArm'),
  control('Braço Esquerdo', 'leftHand', 'Punho: flexão / extensão', 'x', -1, -70, 80, 'LeftHand'),
  control('Braço Esquerdo', 'leftHandDeviation', 'Punho: desvio lateral', 'z', 1, -20, 30, 'LeftHand'),

  control('Mão Esquerda', 'leftFinger1', 'Polegar', 'x', -1, 0, 70, 'LeftFinger1'),
  control('Mão Esquerda', 'leftFinger2', 'Indicador', 'x', -1, 0, 90, 'LeftFinger2'),
  control('Mão Esquerda', 'leftFinger3', 'Médio', 'x', -1, 0, 90, 'LeftFinger3'),
  control('Mão Esquerda', 'leftFinger4', 'Anelar', 'x', -1, 0, 90, 'LeftFinger4'),
  control('Mão Esquerda', 'leftFinger5', 'Mínimo', 'x', -1, 0, 90, 'LeftFinger5'),

  control('Perna Direita', 'rightUpLeg', 'Quadril: Frente / Trás', 'x', -1, -20, 120, 'RightUpLeg'),
  control('Perna Direita', 'rightUpLegAbduction', 'Quadril: Abrir', 'z', -1, -20, 45, 'RightUpLegAbduction'),
  control('Perna Direita', 'rightUpLegRotation', 'Quadril: rotação', 'y', 1, -45, 35, 'RightUpLegAbduction'),
  control('Perna Direita', 'rightLeg', 'Flexão do Joelho', 'x', 1, 0, 135, 'RightLeg'),
  control('Perna Direita', 'rightFoot', 'Tornozelo: dorsi / plantar', 'x', 1, -20, 45, 'RightFoot'),
  control('Perna Direita', 'rightFootInversion', 'Tornozelo: eversão / inversão', 'z', 1, -15, 30, 'RightFoot'),
  control('Perna Direita', 'rightToeBase', 'Flexão dos Dedos', 'x', 1, -30, 45, 'RightToeBase'),

  control('Pé Direito', 'rightToe1', 'Hálux', 'x', 1, -30, 45, 'RightToe1'),
  control('Pé Direito', 'rightToe2', 'Segundo Dedo', 'x', 1, -30, 45, 'RightToe2'),
  control('Pé Direito', 'rightToe3', 'Terceiro Dedo', 'x', 1, -30, 45, 'RightToe3'),
  control('Pé Direito', 'rightToe4', 'Quarto Dedo', 'x', 1, -30, 45, 'RightToe4'),
  control('Pé Direito', 'rightToe5', 'Quinto Dedo', 'x', 1, -30, 45, 'RightToe5'),

  control('Perna Esquerda', 'leftUpLeg', 'Quadril: Frente / Trás', 'x', -1, -20, 120, 'LeftUpLeg'),
  control('Perna Esquerda', 'leftUpLegAbduction', 'Quadril: Abrir', 'z', 1, -20, 45, 'LeftUpLegAbduction'),
  control('Perna Esquerda', 'leftUpLegRotation', 'Quadril: rotação', 'y', -1, -45, 35, 'LeftUpLegAbduction'),
  control('Perna Esquerda', 'leftLeg', 'Flexão do Joelho', 'x', 1, 0, 135, 'LeftLeg'),
  control('Perna Esquerda', 'leftFoot', 'Tornozelo: dorsi / plantar', 'x', 1, -20, 45, 'LeftFoot'),
  control('Perna Esquerda', 'leftFootInversion', 'Tornozelo: eversão / inversão', 'z', -1, -15, 30, 'LeftFoot'),
  control('Perna Esquerda', 'leftToeBase', 'Flexão dos Dedos', 'x', 1, -30, 45, 'LeftToeBase'),

  control('Pé Esquerdo', 'leftToe1', 'Hálux', 'x', 1, -30, 45, 'LeftToe1'),
  control('Pé Esquerdo', 'leftToe2', 'Segundo Dedo', 'x', 1, -30, 45, 'LeftToe2'),
  control('Pé Esquerdo', 'leftToe3', 'Terceiro Dedo', 'x', 1, -30, 45, 'LeftToe3'),
  control('Pé Esquerdo', 'leftToe4', 'Quarto Dedo', 'x', 1, -30, 45, 'LeftToe4'),
  control('Pé Esquerdo', 'leftToe5', 'Quinto Dedo', 'x', 1, -30, 45, 'LeftToe5'),
];

const boneByName = new Map();
const controlState = new Map();
let scene;
let camera;
let renderer;
let orbitControls;
let cameraHome = new THREE.Vector3(0, 1.45, 3);
let orbitHome = new THREE.Vector3(0, 1, 0);
let radiologyMount = null;
let radiologyControls = null;

function createAnatomicalMaterials() {
  return {
    bone: new THREE.MeshStandardMaterial({
      color: 0xd8c8a8,
      roughness: 0.72,
      metalness: 0,
    }),
    cartilage: new THREE.MeshStandardMaterial({
      color: 0xaeb8ad,
      roughness: 0.62,
      metalness: 0,
      transparent: true,
      opacity: 0.9,
    }),
    teeth: new THREE.MeshStandardMaterial({
      color: 0xeee5d2,
      roughness: 0.5,
      metalness: 0,
    }),
  };
}

function anatomicalMaterialFor(mesh, materials) {
  const name = normalizeName(mesh.name);
  if (/tooth|incisor|canine|premolar|molar/.test(name)) return materials.teeth;
  if (/cartilage/.test(name)) return materials.cartilage;
  return materials.bone;
}

function normalizeName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function canonicalBoneName(name) {
  return normalizeName(name).replace(/^mixamorig/, '');
}

function modelSide(name) {
  const normalized = normalizeName(name);
  if (/r001$/.test(normalized)) return 'right';
  if (/l001$/.test(normalized)) return 'left';
  return null;
}

function createPivot(model, name, position) {
  const pivot = new THREE.Group();
  pivot.name = name;
  pivot.position.copy(position);
  model.add(pivot);
  return pivot;
}

function landmarkPosition(model, landmarkName) {
  const target = normalizeName(landmarkName);
  let match = null;

  model.traverse((node) => {
    const name = normalizeName(node.name);
    if (!match && name.startsWith(target) && name.endsWith('j001')) {
      match = node.getWorldPosition(new THREE.Vector3());
      model.worldToLocal(match);
    }
  });

  return match;
}

function jointCenter(model, landmarkNames, fallback) {
  const points = landmarkNames
    .map((name) => landmarkPosition(model, name))
    .filter(Boolean);

  if (points.length === 0) return fallback.clone();

  return points
    .reduce((center, point) => center.add(point), new THREE.Vector3())
    .multiplyScalar(1 / points.length);
}

function mirrorJoint(point) {
  return new THREE.Vector3(-point.x, point.y, point.z);
}

function attachKeepingWorld(parent, child) {
  parent.updateMatrixWorld(true);
  child.updateMatrixWorld(true);
  parent.attach(child);
}

function isHandBone(name) {
  return /hand|carpal|metacarpal|capitate|hamate|lunate|pisiform|scaphoid|trapezium|trapezoid|triquetrum/.test(name);
}

function isFootBone(name) {
  return /foot|metatarsal|talus|calcaneus|navicular|cuboid|cuneiform/.test(name);
}

const FINGER_WORDS = ['first', 'second', 'third', 'fourth', 'fifth'];

function meshCenter(model, phrase, side) {
  const target = normalizeName(phrase);
  const suffix = side === 'right' ? 'r001' : 'l001';
  let center = null;

  model.traverse((node) => {
    const name = normalizeName(node.name);
    if (!center && node.isMesh && name.startsWith(target) && name.endsWith(suffix)) {
      center = new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());
      model.worldToLocal(center);
    }
  });

  return center;
}

function midpoint(a, b, fallback) {
  if (!a || !b) return fallback.clone();
  return a.clone().add(b).multiplyScalar(0.5);
}

function buildFingerPivots(model, pivots, side) {
  FINGER_WORDS.forEach((word, index) => {
    const digit = index + 1;
    const handPivot = pivots[`${side}Hand`];
    const handPosition = handPivot.getWorldPosition(new THREE.Vector3());
    model.worldToLocal(handPosition);

    const metacarpal = meshCenter(model, `${word} metacarpal bone`, side);
    const proximal = meshCenter(model, `Proximal phalanx of ${word} finger of hand`, side);
    const middle = digit === 1
      ? null
      : meshCenter(model, `Middle phalanx of ${word} finger of hand`, side);
    const distal = meshCenter(model, `Distal phalanx of ${word} finger of hand`, side);

    const basePosition = midpoint(metacarpal, proximal, handPosition);
    const middlePosition = midpoint(proximal, middle, basePosition);
    const distalPosition = midpoint(middle || proximal, distal, middlePosition);

    const root = createPivot(model, `${side}Finger${digit}`, basePosition);
    const middlePivot = digit === 1
      ? null
      : createPivot(model, `${side}Finger${digit}Middle`, middlePosition);
    const distalPivot = createPivot(model, `${side}Finger${digit}Distal`, distalPosition);

    pivots[`${side}Finger${digit}`] = root;
    pivots[`${side}Finger${digit}Middle`] = middlePivot;
    pivots[`${side}Finger${digit}Distal`] = distalPivot;

    attachKeepingWorld(handPivot, root);
    if (middlePivot) {
      attachKeepingWorld(root, middlePivot);
      attachKeepingWorld(middlePivot, distalPivot);
    } else {
      attachKeepingWorld(root, distalPivot);
    }
  });
}

function buildToePivots(model, pivots, side) {
  FINGER_WORDS.forEach((word, index) => {
    const digit = index + 1;
    const toeBasePivot = pivots[`${side}ToeBase`];
    const toeBasePosition = toeBasePivot.getWorldPosition(new THREE.Vector3());
    model.worldToLocal(toeBasePosition);

    const metatarsal = meshCenter(model, `${word} metatarsal bone`, side);
    const proximal = meshCenter(model, `Proximal phalanx of ${word} finger of foot`, side);
    const middle = digit === 1
      ? null
      : meshCenter(model, `Middle phalanx of ${word} finger of foot`, side);
    const distal = meshCenter(model, `Distal phalanx of ${word} finger of foot`, side);

    const basePosition = midpoint(metatarsal, proximal, toeBasePosition);
    const middlePosition = midpoint(proximal, middle, basePosition);
    const distalPosition = midpoint(middle || proximal, distal, middlePosition);

    const root = createPivot(model, `${side}Toe${digit}`, basePosition);
    const middlePivot = digit === 1
      ? null
      : createPivot(model, `${side}Toe${digit}Middle`, middlePosition);
    const distalPivot = createPivot(model, `${side}Toe${digit}Distal`, distalPosition);

    pivots[`${side}Toe${digit}`] = root;
    pivots[`${side}Toe${digit}Middle`] = middlePivot;
    pivots[`${side}Toe${digit}Distal`] = distalPivot;

    attachKeepingWorld(toeBasePivot, root);
    if (middlePivot) {
      attachKeepingWorld(root, middlePivot);
      attachKeepingWorld(middlePivot, distalPivot);
    } else {
      attachKeepingWorld(root, distalPivot);
    }
  });
}

function fingerTarget(name, side, pivots) {
  const wordIndex = FINGER_WORDS.findIndex((word) => name.includes(`${word}fingerofhand`));
  if (wordIndex === -1 || !name.includes('phalanx')) return null;

  const digit = wordIndex + 1;
  if (name.includes('distalphalanx')) return pivots[`${side}Finger${digit}Distal`];
  if (name.includes('middlephalanx')) return pivots[`${side}Finger${digit}Middle`];
  return pivots[`${side}Finger${digit}`];
}

function toeTarget(name, side, pivots) {
  const wordIndex = FINGER_WORDS.findIndex((word) => name.includes(`${word}fingeroffoot`));
  if (wordIndex === -1 || !name.includes('phalanx')) return null;

  const digit = wordIndex + 1;
  if (name.includes('distalphalanx')) return pivots[`${side}Toe${digit}Distal`];
  if (name.includes('middlephalanx')) return pivots[`${side}Toe${digit}Middle`];
  return pivots[`${side}Toe${digit}`];
}

function rigTargetForMesh(mesh, pivots) {
  const name = normalizeName(mesh.name);
  const side = modelSide(mesh.name);

  if (name.includes('skeletalsystem')) return null;

  if (side) {
    const finger = fingerTarget(name, side, pivots);
    if (finger) return finger;
    const toe = toeTarget(name, side, pivots);
    if (toe) return toe;
  }
  if (side && isHandBone(name)) return pivots[`${side}Hand`];
  if (side && /radius|ulna/.test(name)) return pivots[`${side}ForeArm`];
  if (side && name.includes('humerus')) return pivots[`${side}ArmAbduction`];
  if (side && /clavicle|scapula/.test(name)) return pivots[`${side}Shoulder`];

  if (side && isFootBone(name)) {
    if (/phalanx|metatarsal/.test(name)) return pivots[`${side}ToeBase`];
    return pivots[`${side}Foot`];
  }
  if (side && name.includes('patella')) return pivots[`${side}Patella`];
  if (side && /tibia|fibula/.test(name)) return pivots[`${side}Leg`];
  if (side && name.includes('femur')) return pivots[`${side}UpLegAbduction`];

  if (/hipbone|sacrum|coccyx/.test(name)) return pivots.hips;
  if (/vertebral[1-5]001$/.test(name)) return pivots.spine;
  if (/vertebrat(?:8|9|10|11|12)001$/.test(name)) return pivots.spine1;
  if (/vertebrat|rib|sternum|costalcartilage/.test(name)) return pivots.spine2;
  if (/vertebrac|atlas|axis|hyoid|thyroidcartilage|cricoidcartilage|arytenoidcartilage|corniculatecartilage/.test(name)) {
    return pivots.neck;
  }

  const center = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
  if (center.y > 1.5) return pivots.head;

  return null;
}

function buildAnatomicalRig(model) {
  model.updateMatrixWorld(true);

  const rightShoulder = jointCenter(
    model,
    ['Head of humerus', 'Glenoid fossa'],
    new THREE.Vector3(-0.17, 1.4, -0.025)
  );
  const rightElbow = jointCenter(
    model,
    ['Capitulum of humerus', 'Trochlea of humerus', 'Articular facet of head of radius'],
    new THREE.Vector3(-0.24, 1.1, -0.02)
  );
  const rightWrist = jointCenter(
    model,
    ['Carpal articular surface', 'Head of ulna'],
    new THREE.Vector3(-0.27, 0.85, 0.015)
  );
  const rightHip = jointCenter(
    model,
    ['Head of femur', 'Acetabulum'],
    new THREE.Vector3(-0.09, 0.89, -0.01)
  );
  const rightKnee = jointCenter(
    model,
    ['Lateral condyle of femur', 'Medial condyle of femur', 'Superior articular surfaces of tibia'],
    new THREE.Vector3(-0.08, 0.45, -0.035)
  );
  const rightAnkle = jointCenter(
    model,
    ['Inferior articular surface of tibia', 'Trochlea of talus'],
    new THREE.Vector3(-0.075, 0.075, -0.04)
  );
  const rightClavicle = jointCenter(
    model,
    ['Sternal end'],
    new THREE.Vector3(-0.03, 1.425, 0.04)
  );
  const pelvicCenter = rightHip.clone().add(mirrorJoint(rightHip)).multiplyScalar(0.5);

  const pivots = {
    // A pelve gira ao redor do eixo que une as cabeças femorais. As pernas
    // permanecem ligadas ao modelo (e não à pelve), simulando a inclinação
    // pélvica em cadeia fechada, com os pés apoiados.
    hips: createPivot(model, 'Hips', pelvicCenter),
    spine: createPivot(model, 'Spine', new THREE.Vector3(0, 0.98, -0.03)),
    spine1: createPivot(model, 'Spine1', new THREE.Vector3(0, 1.12, -0.04)),
    spine2: createPivot(model, 'Spine2', new THREE.Vector3(0, 1.3, -0.04)),
    neck: createPivot(model, 'Neck', new THREE.Vector3(0, 1.47, -0.02)),
    head: createPivot(model, 'Head', new THREE.Vector3(0, 1.55, -0.015)),
    rightShoulder: createPivot(model, 'RightShoulder', rightClavicle),
    rightArm: createPivot(model, 'RightArm', rightShoulder),
    rightArmAbduction: createPivot(model, 'RightArmAbduction', rightShoulder),
    rightForeArm: createPivot(model, 'RightForeArm', rightElbow),
    rightHand: createPivot(model, 'RightHand', rightWrist),
    leftShoulder: createPivot(model, 'LeftShoulder', mirrorJoint(rightClavicle)),
    leftArm: createPivot(model, 'LeftArm', mirrorJoint(rightShoulder)),
    leftArmAbduction: createPivot(model, 'LeftArmAbduction', mirrorJoint(rightShoulder)),
    leftForeArm: createPivot(model, 'LeftForeArm', mirrorJoint(rightElbow)),
    leftHand: createPivot(model, 'LeftHand', mirrorJoint(rightWrist)),
    rightUpLeg: createPivot(model, 'RightUpLeg', rightHip),
    rightUpLegAbduction: createPivot(model, 'RightUpLegAbduction', rightHip),
    rightLeg: createPivot(model, 'RightLeg', rightKnee),
    rightPatella: createPivot(model, 'RightPatella', rightKnee),
    rightFoot: createPivot(model, 'RightFoot', rightAnkle),
    rightToeBase: createPivot(model, 'RightToeBase', new THREE.Vector3(-0.09, 0.04, 0.04)),
    leftUpLeg: createPivot(model, 'LeftUpLeg', mirrorJoint(rightHip)),
    leftUpLegAbduction: createPivot(model, 'LeftUpLegAbduction', mirrorJoint(rightHip)),
    leftLeg: createPivot(model, 'LeftLeg', mirrorJoint(rightKnee)),
    leftPatella: createPivot(model, 'LeftPatella', mirrorJoint(rightKnee)),
    leftFoot: createPivot(model, 'LeftFoot', mirrorJoint(rightAnkle)),
    leftToeBase: createPivot(model, 'LeftToeBase', new THREE.Vector3(0.09, 0.04, 0.04)),
  };

  model.updateMatrixWorld(true);
  attachKeepingWorld(pivots.hips, pivots.spine);
  attachKeepingWorld(pivots.spine, pivots.spine1);
  attachKeepingWorld(pivots.spine1, pivots.spine2);
  attachKeepingWorld(pivots.spine2, pivots.neck);
  attachKeepingWorld(pivots.neck, pivots.head);

  ['right', 'left'].forEach((side) => {
    attachKeepingWorld(pivots.spine2, pivots[`${side}Shoulder`]);
    attachKeepingWorld(pivots[`${side}Shoulder`], pivots[`${side}Arm`]);
    attachKeepingWorld(pivots[`${side}Arm`], pivots[`${side}ArmAbduction`]);
    attachKeepingWorld(pivots[`${side}ArmAbduction`], pivots[`${side}ForeArm`]);
    attachKeepingWorld(pivots[`${side}ForeArm`], pivots[`${side}Hand`]);
    // UpLeg continua como filho direto do modelo. Se fosse filho de Hips, a
    // pelve arrastaria o fêmur e todo o corpo giraria como uma peça rígida.
    attachKeepingWorld(pivots[`${side}UpLeg`], pivots[`${side}UpLegAbduction`]);
    attachKeepingWorld(pivots[`${side}UpLegAbduction`], pivots[`${side}Leg`]);
    attachKeepingWorld(pivots[`${side}UpLegAbduction`], pivots[`${side}Patella`]);
    attachKeepingWorld(pivots[`${side}Leg`], pivots[`${side}Foot`]);
    attachKeepingWorld(pivots[`${side}Foot`], pivots[`${side}ToeBase`]);
    buildFingerPivots(model, pivots, side);
    buildToePivots(model, pivots, side);
  });

  const meshes = [];
  model.traverse((node) => {
    if (node.isMesh) meshes.push(node);
  });

  meshes.forEach((mesh) => {
    const target = rigTargetForMesh(mesh, pivots);
    if (target) {
      attachKeepingWorld(target, mesh);
    } else if (normalizeName(mesh.name).includes('skeletalsystem')) {
      mesh.visible = false;
    }
  });

  Object.values(pivots).forEach((pivot) => {
    if (!pivot) return;
    pivot.userData.baseQuaternion = pivot.quaternion.clone();
    boneByName.set(canonicalBoneName(pivot.name), pivot);
  });

  return meshes.length;
}

function setStatus(message) {
  statusEl.textContent = message;
}

function updateLoading(message) {
  loadingEl.textContent = message;
}

function createControl(def) {
  const wrapper = document.createElement('div');
  wrapper.className = 'control';
  wrapper.dataset.controlId = def.id;

  const label = document.createElement('label');
  label.setAttribute('for', def.id);

  const title = document.createElement('span');
  title.textContent = def.label;

  const value = document.createElement('span');
  value.className = 'value';
  value.id = `${def.id}-value`;
  value.textContent = '0°';

  label.appendChild(title);
  label.appendChild(value);

  const input = document.createElement('input');
  input.type = 'range';
  input.id = def.id;
  input.min = String(def.min);
  input.max = String(def.max);
  input.step = String(def.step);
  input.value = '0';
  input.disabled = true;
  input.title = `Amplitude anatômica aproximada: ${def.min}° a ${def.max}°`;

  wrapper.appendChild(label);
  wrapper.appendChild(input);

  return { wrapper, input, value };
}

function buildUI() {
  const sections = new Map();
  controlsRoot.innerHTML = '';
  sheetCountEl.textContent = `${CONTROL_DEFS.length} ajustes`;

  CONTROL_DEFS.forEach((def) => {
    if (!sections.has(def.section)) {
      const section = document.createElement('section');
      section.className = 'section';

      const sectionId = `section-${normalizeName(def.section)}`;
      const sectionToggle = document.createElement('button');
      sectionToggle.className = 'section-toggle';
      sectionToggle.type = 'button';
      sectionToggle.textContent = def.section;
      sectionToggle.setAttribute('aria-controls', sectionId);

      const sectionControls = document.createElement('div');
      sectionControls.className = 'section-controls';
      sectionControls.id = sectionId;

      const collapsed = sections.size > 0;
      section.classList.toggle('is-collapsed', collapsed);
      sectionToggle.setAttribute('aria-expanded', String(!collapsed));
      sectionToggle.addEventListener('click', () => {
        const shouldCollapse = !section.classList.contains('is-collapsed');
        section.classList.toggle('is-collapsed', shouldCollapse);
        sectionToggle.setAttribute('aria-expanded', String(!shouldCollapse));
      });

      section.appendChild(sectionToggle);
      section.appendChild(sectionControls);

      sections.set(def.section, { section, sectionControls, sectionToggle });
      controlsRoot.appendChild(section);
    }

    const sectionState = sections.get(def.section);
    const control = createControl(def);
    sectionState.sectionControls.appendChild(control.wrapper);
    controlState.set(def.id, {
      def,
      input: control.input,
      value: control.value,
      bone: null,
      baseQuaternion: null,
    });

    control.input.addEventListener('input', () => applyControl(def.id));
  });

  const syncSections = () => {
    sections.forEach(({ section, sectionToggle }) => {
      sectionToggle.setAttribute('aria-expanded', String(!section.classList.contains('is-collapsed')));
    });
  };

  if (mobileMedia.addEventListener) {
    mobileMedia.addEventListener('change', syncSections);
  } else {
    mobileMedia.addListener(syncSections);
  }
}

function findBone(candidates) {
  for (let i = 0; i < candidates.length; i += 1) {
    const exactMatch = boneByName.get(canonicalBoneName(candidates[i]));
    if (exactMatch) return exactMatch;
  }

  return null;
}

function setValueText(controlId, value) {
  const state = controlState.get(controlId);
  if (!state) return;
  const degrees = Math.round(Number(value));
  state.value.textContent = `${degrees}°`;
  state.input.setAttribute('aria-valuetext', `${degrees} graus`);
}

function applyControl(controlId) {
  const state = controlState.get(controlId);
  if (!state) return;
  setValueText(controlId, parseFloat(state.input.value));
  applyPose();
}

function axisVector(axis) {
  return new THREE.Vector3(
    axis === 'x' ? 1 : 0,
    axis === 'y' ? 1 : 0,
    axis === 'z' ? 1 : 0
  );
}

function applyRotation(state, degrees) {
  const radians = THREE.MathUtils.degToRad(degrees * state.def.direction);
  const delta = new THREE.Quaternion().setFromAxisAngle(axisVector(state.def.axis), radians);
  state.bone.quaternion.multiply(delta);
}

function rotatePivot(pivot, axis, degrees) {
  if (!pivot) return;
  const radians = THREE.MathUtils.degToRad(degrees);
  pivot.quaternion.multiply(
    new THREE.Quaternion().setFromAxisAngle(axisVector(axis), radians)
  );
}

// A coluna humana não dobra em uma única vértebra. Cada controle distribui o
// arco entre a região lombar e duas regiões torácicas, preservando uma curva
// contínua em vez de criar uma quebra rígida no tronco.
const SPINE_COUPLING = {
  spine: [0.45, 0.3, 0.25],
  spineLateral: [0.35, 0.35, 0.3],
  spineRotation: [0.2, 0.35, 0.45],
};

function applySpinalMotion(state, rawDegrees) {
  const weights = SPINE_COUPLING[state.def.id];
  if (!weights) return false;

  const direction = state.def.direction;
  applyRotation(state, rawDegrees * weights[0]);
  rotatePivot(
    boneByName.get(canonicalBoneName('Spine1')),
    state.def.axis,
    rawDegrees * weights[1] * direction
  );
  rotatePivot(
    boneByName.get(canonicalBoneName('Spine2')),
    state.def.axis,
    rawDegrees * weights[2] * direction
  );
  return true;
}

function applyFingerCurl(state, rawDegrees) {
  const match = state.def.id.match(/^(right|left)Finger([1-5])$/);
  if (!match) return false;

  const side = match[1];
  const digit = Number(match[2]);
  const direction = state.def.direction;
  const middle = boneByName.get(canonicalBoneName(`${side}Finger${digit}Middle`));
  const distal = boneByName.get(canonicalBoneName(`${side}Finger${digit}Distal`));

  if (digit === 1) {
    applyRotation(state, rawDegrees * 0.55);
    rotatePivot(distal, 'x', rawDegrees * 0.9 * direction);
  } else {
    applyRotation(state, rawDegrees * 0.75);
    rotatePivot(middle, 'x', rawDegrees * 1.05 * direction);
    rotatePivot(distal, 'x', rawDegrees * 0.75 * direction);
  }

  return true;
}

function applyToeCurl(state, rawDegrees) {
  const match = state.def.id.match(/^(right|left)Toe([1-5])$/);
  if (!match) return false;

  const side = match[1];
  const digit = Number(match[2]);
  const direction = state.def.direction;
  const middle = boneByName.get(canonicalBoneName(`${side}Toe${digit}Middle`));
  const distal = boneByName.get(canonicalBoneName(`${side}Toe${digit}Distal`));

  if (digit === 1) {
    applyRotation(state, rawDegrees * 0.65);
    rotatePivot(distal, 'x', rawDegrees * 0.7 * direction);
  } else {
    applyRotation(state, rawDegrees * 0.55);
    rotatePivot(middle, 'x', rawDegrees * 0.8 * direction);
    rotatePivot(distal, 'x', rawDegrees * 0.6 * direction);
  }

  return true;
}

function applyPose() {
  const resetBones = new Set();

  boneByName.forEach((bone) => {
    if (bone.userData.baseQuaternion) {
      bone.quaternion.copy(bone.userData.baseQuaternion);
    }
  });

  controlState.forEach((state) => {
    if (!state.bone || !state.baseQuaternion || resetBones.has(state.bone)) return;
    state.bone.quaternion.copy(state.baseQuaternion);
    resetBones.add(state.bone);
  });

  const scapularRotation = { right: 0, left: 0 };

  CONTROL_DEFS.forEach((def) => {
    const state = controlState.get(def.id);
    if (!state || !state.bone) return;

    const rawDegrees = parseFloat(state.input.value);
    let jointDegrees = rawDegrees;

    if (applyFingerCurl(state, rawDegrees)) return;
    if (applyToeCurl(state, rawDegrees)) return;
    if (applySpinalMotion(state, rawDegrees)) return;

    if (def.id === 'rightArmAbduction' || def.id === 'leftArmAbduction') {
      const side = def.id.startsWith('right') ? 'right' : 'left';
      scapularRotation[side] = rawDegrees <= 30
        ? rawDegrees / 6
        : 5 + ((rawDegrees - 30) * 55) / 150;
      jointDegrees -= scapularRotation[side];
    }

    applyRotation(state, jointDegrees);
  });

  // A inclinação pélvica é acompanhada por uma pequena compensação lombar.
  // Ela mantém o tórax estável sem esconder a rotação real da pelve.
  const pelvicTilt = controlState.get('hips');
  if (pelvicTilt) {
    rotatePivot(
      boneByName.get(canonicalBoneName('Spine')),
      'x',
      -parseFloat(pelvicTilt.input.value) * 0.2
    );
  }

  ['right', 'left'].forEach((side) => {
    const shoulder = controlState.get(`${side}Shoulder`);
    const arm = controlState.get(`${side}ArmAbduction`);
    if (!shoulder || !arm || !shoulder.bone) return;

    const radians = THREE.MathUtils.degToRad(scapularRotation[side] * arm.def.direction);
    const delta = new THREE.Quaternion().setFromAxisAngle(axisVector('z'), radians);
    shoulder.bone.quaternion.multiply(delta);
  });

  ['right', 'left'].forEach((side) => {
    const patella = boneByName.get(canonicalBoneName(`${side}Patella`));
    const knee = controlState.get(`${side}Leg`);
    if (!patella || !knee || !patella.userData.baseQuaternion) return;

    patella.quaternion.copy(patella.userData.baseQuaternion);
    const tracking = THREE.MathUtils.degToRad(parseFloat(knee.input.value) * 0.35);
    patella.quaternion.multiply(
      new THREE.Quaternion().setFromAxisAngle(axisVector('x'), tracking)
    );
    patella.updateMatrixWorld(true);
  });

  resetBones.forEach((bone) => bone.updateMatrixWorld(true));
}

function bindBones() {
  const connected = [];
  const missing = [];

  CONTROL_DEFS.forEach((def) => {
    const state = controlState.get(def.id);
    const bone = findBone(def.candidates);

    if (bone) {
      state.bone = bone;
      state.baseQuaternion = bone.quaternion.clone();
      state.input.disabled = false;
      connected.push(`${def.label}: ${bone.name}`);
    } else {
      state.input.disabled = true;
      missing.push(def.label);
    }
  });

  if (missing.length > 0) {
    setStatus(`Conectados ${connected.length}/${CONTROL_DEFS.length}. Faltando: ${missing.join(', ')}.`);
    console.warn('Controles sem osso correspondente:', missing);
  } else {
    setStatus(`Pronto. ${connected.length}/${CONTROL_DEFS.length} controles conectados.`);
  }

  console.log('Ossos conectados:', connected);
  applyPose();
}

function resetPose() {
  controlState.forEach((state, controlId) => {
    state.input.value = '0';
    setValueText(controlId, 0);
  });
  if (radiologyMode) {
    applyRadiologyPatientPose();
  } else {
    applyPose();
  }
}

function applyRadiologyPatientPose() {
  // Pose clínica de decúbito lateral: braços próximos ao tronco, com o braço
  // superior ligeiramente anteriorizado, cotovelos relaxados e joelhos com
  // uma pequena flexão. São amplitudes conservadoras, não uma pose de modelo.
  const pose = {
    rightArm: 2,
    rightArmAbduction: 4,
    rightForeArm: 10,
    rightHand: 4,
    leftArm: 14,
    leftArmAbduction: 12,
    leftForeArm: 24,
    leftHand: 6,
    rightUpLeg: 8,
    rightUpLegAbduction: 2,
    rightLeg: 12,
    leftUpLeg: 10,
    leftUpLegAbduction: -2,
    leftLeg: 12,
  };

  Object.entries(pose).forEach(([controlId, value]) => {
    const state = controlState.get(controlId);
    if (!state) return;
    state.input.value = String(value);
    setValueText(controlId, value);
  });
  applyPose();
}

function centerCamera() {
  camera.position.copy(cameraHome);
  orbitControls.target.copy(orbitHome);
  orbitControls.update();
}

function visibleModelBounds(model) {
  const box = new THREE.Box3();
  model.traverseVisible((node) => {
    if (!node.isMesh) return;
    node.geometry.computeBoundingBox();
    box.union(node.geometry.boundingBox.clone().applyMatrix4(node.matrixWorld));
  });
  return box;
}

function frameModel(model) {
  model.updateMatrixWorld(true);

  const initialBox = visibleModelBounds(model);
  const initialCenter = initialBox.getCenter(new THREE.Vector3());
  model.position.x -= initialCenter.x;
  model.position.y -= initialBox.min.y;
  model.position.z -= initialCenter.z;
  model.updateMatrixWorld(true);

  const box = visibleModelBounds(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const distance = (Math.max(size.y, size.x / camera.aspect) / (2 * Math.tan(verticalFov / 2))) * 1.5;

  orbitHome = new THREE.Vector3(center.x, box.min.y + size.y * 0.52, center.z);
  cameraHome = new THREE.Vector3(
    orbitHome.x,
    orbitHome.y + size.y * 0.04,
    orbitHome.z + distance
  );

  camera.near = Math.max(maxDimension / 10000, 0.001);
  camera.far = Math.max(maxDimension * 20, 100);
  camera.updateProjectionMatrix();
  centerCamera();
}

function radiologyBox(parent, size, position, color, options = {}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshStandardMaterial({ color, roughness: .72, metalness: .05, ...options })
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function buildRadiologyRoom() {
  const wall = radiologyBox(scene, [7, 5.5, .12], [0, 2.7, -2.5], 0x181e18);
  wall.receiveShadow = true;

  // Equipamento fixo: mesa horizontal e receptor vertical, como numa sala
  // radiográfica universal. A rotação do paciente ocorre em outro grupo.
  const table = new THREE.Group();
  table.position.set(0, 1.05, 0);
  scene.add(table);
  radiologyBox(table, [1.7, .12, 2.85], [0, 0, 0], 0x2a322b);
  radiologyBox(table, [1.52, .08, 2.65], [0, .1, 0], 0x3b493f, { roughness: .82 });
  radiologyBox(table, [1.7, .08, 2.85], [0, -.2, 0], 0x232a24);
  [-.57, .57].forEach((x) => [-.78, .78].forEach((z) => radiologyBox(table, [.18, .75, .18], [x, -.58, z], 0x313b33)));
  radiologyBox(table, [1.95, .12, .18], [0, -.95, 0], 0x354038);
  radiologyBox(table, [.12, .12, 3.05], [-.94, -.95, 0], 0x354038);
  radiologyBox(table, [.12, .12, 3.05], [.94, -.95, 0], 0x354038);
  radiologyBox(table, [1.28, .025, 2.1], [0, .145, 0], 0x101511, { roughness: .35, metalness: .25 });

  const wallDetector = radiologyBox(scene, [1.55, 2.85, .035], [0, 1.65, -2.37], 0x101511, { roughness: .35, metalness: .25 });
  wallDetector.name = 'Receptor mural';
  radiologyBox(scene, [.08, 3.35, .08], [1.15, 1.65, -2.28], 0x3d4d42);
  radiologyBox(scene, [.08, 3.35, .08], [-1.15, 1.65, -2.28], 0x3d4d42);

  const cArm = new THREE.Group();
  cArm.position.set(0, 1.65, .45);
  const arc = new THREE.Mesh(
    new THREE.TorusGeometry(1.42, .055, 10, 48, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x526158, roughness: .55, metalness: .25 })
  );
  arc.rotation.z = Math.PI / 2;
  cArm.add(arc);
  const source = radiologyBox(cArm, [.4, .26, .5], [0, -1.42, 0], 0x313b33);
  source.name = 'Tubo de raios X';
  radiologyBox(cArm, [.2, .12, .18], [0, -1.6, .15], 0x8caa98);
  const receptor = radiologyBox(cArm, [.55, .12, .62], [0, 1.42, 0], 0x101511, { roughness: .35, metalness: .25 });
  receptor.name = 'Receptor do arco em C';
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(.16, .48, 2.45, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xa8d8bf, transparent: true, opacity: .08, side: THREE.DoubleSide, depthWrite: false })
  );
  // O cilindro já nasce alinhado no eixo Y, entre o tubo e o receptor.
  beam.rotation.z = 0;
  beam.position.y = 0;
  cArm.add(beam);
  scene.add(cArm);

  scene.userData.radiologyTable = table;
  scene.userData.radiology = { table, cArm, beam, baseTableY: 1.05, baseCArmY: 1.65 };
}

function mountRadiologyModel(model) {
  const box = visibleModelBounds(model);
  const height = box.getSize(new THREE.Vector3()).y;
  model.position.y = -height / 2;
  model.rotation.x = -Math.PI / 2;
  // Depois de deitar o modelo, recalcule o centro nos três eixos. O GLB nasce
  // apoiado pelos pés; sem este passo, eles acabam no meio da mesa e a cabeça
  // fica deslocada para uma das extremidades. O centro também vira o eixo de
  // rolamento do paciente.
  model.updateMatrixWorld(true);
  const lyingBox = visibleModelBounds(model);
  const lyingCenter = lyingBox.getCenter(new THREE.Vector3());
  model.position.sub(lyingCenter);
  radiologyMount = new THREE.Group();
  radiologyMount.position.set(0, 1.45, 0);
  radiologyMount.add(model);
  scene.add(radiologyMount);
  // Alinha pelo ponto mais baixo da geometria, e não apenas pelo centro do
  // corpo. Assim o esqueleto repousa sobre o tampo sem atravessá-lo.
  radiologyMount.userData.baseY = 1.45;
  applyRadiologyControls();
  orbitHome = new THREE.Vector3(0, 1.1, 0);
  cameraHome = new THREE.Vector3(3.35, 2.55, 4.5);
  camera.near = .001;
  camera.far = 100;
  camera.updateProjectionMatrix();
  centerCamera();
  document.title = 'Pose Lab | Mesa de raio X';
  const breadcrumb = document.querySelector('.breadcrumb strong');
  if (breadcrumb) breadcrumb.textContent = 'Mesa de raio X';
  const eyebrow = document.querySelector('.scene-heading .eyebrow');
  if (eyebrow) eyebrow.textContent = 'ESTAÇÃO RADIOGRÁFICA';
  const heading = document.querySelector('.scene-heading h1');
  if (heading) heading.textContent = 'Esqueleto sobre a mesa';
  document.body.classList.add('radiology-mode');
}

function setRadiologyControlValue(id, value) {
  if (!radiologyControls) return;
  const control = radiologyControls.inputs[id];
  if (!control) return;
  const min = Number(control.input.min);
  const max = Number(control.input.max);
  control.input.value = String(Math.max(min, Math.min(max, value)));
  control.input.dispatchEvent(new Event('input'));
}

function applyRadiologyControls() {
  if (!radiologyControls) return;
  const { height, beamAngle, intensity, patientRotation } = radiologyControls.values;
  const equipment = scene?.userData.radiology;
  const heightOffset = (height - 85) * .008;
  if (equipment) {
    equipment.table.position.y = equipment.baseTableY + heightOffset;
    equipment.cArm.position.y = equipment.baseCArmY + heightOffset;
    equipment.cArm.rotation.z = THREE.MathUtils.degToRad(beamAngle);
    equipment.beam.material.opacity = .025 + (intensity / 100) * .15;
  }
  if (radiologyMount) {
    // Com o esqueleto deitado, o eixo longitudinal do paciente é Z. A
    // rotação em Z faz o rolamento para decúbito lateral sem girar a mesa.
    radiologyMount.rotation.z = THREE.MathUtils.degToRad(patientRotation);
    radiologyMount.position.y = radiologyMount.userData.baseY + heightOffset;
    radiologyMount.updateMatrixWorld(true);
    const tableTopY = 1.22 + heightOffset;
    const patientBox = visibleModelBounds(radiologyMount);
    radiologyMount.position.y += tableTopY - patientBox.min.y;
  }
}

function buildRadiologyControls() {
  const panel = document.createElement('section');
  panel.className = 'radiology-console';
  panel.setAttribute('aria-labelledby', 'radiology-console-title');
  panel.innerHTML = `
    <header class="radiology-console-head"><h3 id="radiology-console-title">Console radiológica</h3><span>RX · AO VIVO</span></header>
    <div class="rx-control-block"><label class="rx-control-label" for="rx-table-height"><span>Altura da mesa</span><output id="rx-table-height-value">85 cm</output></label><div class="rx-control-row"><button class="rx-nudge" type="button" data-rx-target="height" data-rx-step="-1" aria-label="Diminuir altura">−</button><input id="rx-table-height" type="range" min="55" max="115" value="85" step="1"><button class="rx-nudge" type="button" data-rx-target="height" data-rx-step="1" aria-label="Aumentar altura">+</button></div></div>
    <div class="rx-control-block"><label class="rx-control-label" for="rx-beam-angle"><span>Angulação do raio-X</span><output id="rx-beam-angle-value">0°</output></label><div class="rx-control-row"><button class="rx-nudge" type="button" data-rx-target="beamAngle" data-rx-step="-5" aria-label="Reduzir angulação">−</button><input id="rx-beam-angle" type="range" min="-90" max="90" value="0" step="1"><button class="rx-nudge" type="button" data-rx-target="beamAngle" data-rx-step="5" aria-label="Aumentar angulação">+</button></div><div class="rx-preset-row"><button class="rx-preset" type="button" data-rx-preset="ap" aria-pressed="true">AP</button><button class="rx-preset" type="button" data-rx-preset="lateral" aria-pressed="false">LATERAL</button><button class="rx-preset" type="button" data-rx-preset="obl" aria-pressed="false">OBLÍQUA</button></div></div>
    <div class="rx-control-block"><label class="rx-control-label" for="rx-beam-intensity"><span>Intensidade do feixe</span><output id="rx-beam-intensity-value">60%</output></label><div class="rx-control-row"><button class="rx-nudge" type="button" data-rx-target="intensity" data-rx-step="-5" aria-label="Reduzir intensidade">−</button><input id="rx-beam-intensity" type="range" min="0" max="100" value="60" step="1"><button class="rx-nudge" type="button" data-rx-target="intensity" data-rx-step="5" aria-label="Aumentar intensidade">+</button></div></div>
    <div class="rx-control-block"><label class="rx-control-label" for="rx-patient-rotation"><span>Rolamento do esqueleto</span><output id="rx-patient-rotation-value">+90°</output></label><div class="rx-control-row"><button class="rx-nudge" type="button" data-rx-target="patientRotation" data-rx-step="-1" aria-label="Girar esqueleto para a esquerda">−</button><input id="rx-patient-rotation" type="range" min="-90" max="90" value="90" step="1"><button class="rx-nudge" type="button" data-rx-target="patientRotation" data-rx-step="1" aria-label="Girar esqueleto para a direita">+</button></div><div class="rx-preset-row"><button class="rx-patient-preset" type="button" data-rx-patient="supine" aria-pressed="false">SUPINO</button><button class="rx-patient-preset" type="button" data-rx-patient="right" aria-pressed="true">LATERAL D.</button><button class="rx-patient-preset" type="button" data-rx-patient="left" aria-pressed="false">LATERAL E.</button></div></div>
    <p class="radiology-console-note">Arraste o modelo para orbitar a câmera. Os controles articulares da aba Movimentar podem ser usados junto com o posicionamento radiológico.</p>`;
  document.getElementById('panel-body').prepend(panel);
  radiologyControls = { values: { height: 85, beamAngle: 0, intensity: 60, patientRotation: 90 }, inputs: {} };
  const fields = [
    ['height', 'rx-table-height', 'rx-table-height-value', (v) => `${v} cm`],
    ['beamAngle', 'rx-beam-angle', 'rx-beam-angle-value', (v) => `${v > 0 ? '+' : ''}${v}°`],
    ['intensity', 'rx-beam-intensity', 'rx-beam-intensity-value', (v) => `${v}%`],
    ['patientRotation', 'rx-patient-rotation', 'rx-patient-rotation-value', (v) => `${v > 0 ? '+' : ''}${v}°`],
  ];
  fields.forEach(([key, inputId, outputId, format]) => {
    const input = document.getElementById(inputId);
    const output = document.getElementById(outputId);
    radiologyControls.inputs[key] = { input, output };
    input.addEventListener('input', () => {
      const next = Number(input.value);
      radiologyControls.values[key] = next;
      output.textContent = format(next);
      applyRadiologyControls();
    });
  });
  panel.querySelectorAll('[data-rx-step]').forEach((button) => button.addEventListener('click', () => {
    const key = button.dataset.rxTarget;
    setRadiologyControlValue(key, radiologyControls.values[key] + Number(button.dataset.rxStep));
  }));
  const presets = { ap: { angle: 0 }, lateral: { angle: 90 }, obl: { angle: 45 } };
  panel.querySelectorAll('[data-rx-preset]').forEach((button) => button.addEventListener('click', () => {
    const preset = presets[button.dataset.rxPreset];
    setRadiologyControlValue('beamAngle', preset.angle);
    panel.querySelectorAll('[data-rx-preset]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  }));
  const patientPresets = { supine: 0, right: 90, left: -90 };
  panel.querySelectorAll('[data-rx-patient]').forEach((button) => button.addEventListener('click', () => {
    setRadiologyControlValue('patientRotation', patientPresets[button.dataset.rxPatient]);
    panel.querySelectorAll('[data-rx-patient]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    applyRadiologyPatientPose();
  }));
}

function initScene() {
  const compactRendering = mobileMedia.matches || coarsePointerMedia.matches;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x10181e);
  scene.fog = new THREE.Fog(0x10181e, 5, 14);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.45, 3.0);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compactRendering ? 1.4 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.physicallyCorrectLights = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
  orbitControls.target.set(0, 1, 0);
  orbitControls.enableDamping = true;

  const ambient = new THREE.AmbientLight(0xfff6e8, 0.55);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0xb9ddf2, 0x211c18, 0.8);
  hemi.position.set(0, 20, 0);
  scene.add(hemi);

  const directional = new THREE.DirectionalLight(0xfff4df, 2.4);
  directional.position.set(4, 8, 5);
  directional.castShadow = true;
  directional.shadow.mapSize.width = compactRendering ? 1024 : 2048;
  directional.shadow.mapSize.height = compactRendering ? 1024 : 2048;
  scene.add(directional);

  const fill = new THREE.DirectionalLight(0x8ecdf0, 0.55);
  fill.position.set(-4, 3, -2);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffc98f, 0.65);
  rim.position.set(2, 4, -5);
  scene.add(rim);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(5.5, 48),
    new THREE.ShadowMaterial({ opacity: 0.18, depthWrite: false })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(11, 28, 0x3e5068, 0x1c2531);
  grid.material.transparent = true;
  grid.material.opacity = 0.22;
  grid.position.y = 0.001;
  scene.add(grid);
  if (radiologyMode) buildRadiologyRoom();
}

function loadModel() {
  const loader = new THREE.GLTFLoader();
  const dracoLoader = new THREE.DRACOLoader();
  dracoLoader.setDecoderPath(DRACO_PATH);
  loader.setDRACOLoader(dracoLoader);

  loader.load(
    MODEL_PATH,
    (gltf) => {
      const model = gltf.scene;
      const anatomicalMaterials = createAnatomicalMaterials();
      model.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          node.material = anatomicalMaterialFor(node, anatomicalMaterials);
        }
      });
      scene.add(model);

      model.traverse((node) => {
        if (node.isBone) {
          boneByName.set(canonicalBoneName(node.name), node);
        }
      });

      const anatomicalMeshCount = boneByName.size === 0 ? buildAnatomicalRig(model) : 0;

      console.log('Bones encontrados:', Array.from(boneByName.keys()));

      frameModel(model);
      if (radiologyMode) mountRadiologyModel(model);
      bindBones();
      if (radiologyMode) applyRadiologyPatientPose();
      AnatomyStudy.init({ model, camera, renderer, orbitControls, centerCamera });
      if (anatomicalMeshCount > 0) {
        setStatus(`Pronto. ${CONTROL_DEFS.length} controles de movimento conectados.`);
      }
      updateLoading('Modelo carregado.');
      setTimeout(() => {
        loadingEl.style.display = 'none';
      }, 350);
    },
    (xhr) => {
      if (xhr.total > 0) {
        const percent = Math.round((xhr.loaded / xhr.total) * 100);
        updateLoading(
          percent === 100
            ? 'Montando articulações anatômicas...'
            : `Carregando esqueleto: ${percent}%`
        );
      }
    },
    (error) => {
      console.error('Erro ao carregar', MODEL_PATH, error);
      updateLoading('Erro ao carregar o esqueleto anatômico. Verifique os arquivos do app.');
      setStatus('Não foi possível carregar o modelo local.');
    }
  );
}

function animate() {
  requestAnimationFrame(animate);
  if (document.hidden || AnatomyStudy.isGallery()) return;
  orbitControls.update();
  renderer.render(scene, camera);
  AnatomyStudy.update();
}

function attachActions() {
  resetBtn.addEventListener('click', resetPose);
  centerBtn.addEventListener('click', () => AnatomyStudy.centerView());
  fullscreenBtn.addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.warn('Não foi possível alternar a tela cheia:', error);
    }
  });

  const setPanelOpen = (open) => {
    const shouldOpen = mobileMedia.matches && open;
    uiEl.classList.toggle('is-open', shouldOpen);
    document.body.classList.toggle('panel-open', shouldOpen);
    panelToggle.setAttribute('aria-expanded', String(shouldOpen));
    panelBody.inert = mobileMedia.matches && !shouldOpen;
  };

  let pointerStartY = null;
  let suppressNextClick = false;

  panelToggle.addEventListener('pointerdown', (event) => {
    pointerStartY = event.clientY;
  });

  panelToggle.addEventListener('pointerup', (event) => {
    if (pointerStartY === null) return;
    const distance = event.clientY - pointerStartY;
    pointerStartY = null;

    if (Math.abs(distance) < 34) return;
    suppressNextClick = true;
    setPanelOpen(distance < 0);
  });

  panelToggle.addEventListener('pointercancel', () => {
    pointerStartY = null;
  });

  panelToggle.addEventListener('click', () => {
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }
    setPanelOpen(!uiEl.classList.contains('is-open'));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mobileMedia.matches) setPanelOpen(false);
  });

  const syncPanelMode = () => {
    if (mobileMedia.matches) {
      setPanelOpen(false);
    } else {
      uiEl.classList.remove('is-open');
      document.body.classList.remove('panel-open');
      panelToggle.setAttribute('aria-expanded', 'true');
      panelBody.inert = false;
    }
  };

  if (mobileMedia.addEventListener) {
    mobileMedia.addEventListener('change', syncPanelMode);
  } else {
    mobileMedia.addListener(syncPanelMode);
  }

  let resizeFrame = null;
  const resizeRenderer = () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      const compactRendering = mobileMedia.matches || coarsePointerMedia.matches;
      const viewport = container.getBoundingClientRect();
      const width = Math.max(1, Math.round(viewport.width));
      const height = Math.max(1, Math.round(viewport.height));
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compactRendering ? 1.4 : 2));
      renderer.setSize(width, height);
    });
  };

  window.addEventListener('resize', resizeRenderer, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resizeRenderer, { passive: true });
  }
  if ('ResizeObserver' in window) {
    new ResizeObserver(resizeRenderer).observe(container);
  }

  syncPanelMode();
}

function start() {
  buildUI();
  initScene();
  if (radiologyMode) buildRadiologyControls();
  attachActions();
  loadModel();
  animate();
}

try {
  start();
} catch (error) {
  console.error('Falha ao iniciar o visualizador:', error);
  updateLoading('Não foi possível iniciar o visualizador 3D. Verifique a conexão e o suporte a WebGL e recarregue a página.');
  setStatus('Visualizador indisponível.');
}
