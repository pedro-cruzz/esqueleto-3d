const MODEL_PATH = 'esqueleto-anatomico.glb';
const DRACO_PATH = 'draco/';

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

// Amplitudes aproximadas em graus para uma pessoa adulta sem lesão articular.
const CONTROL_DEFS = [
  control('Corpo', 'hips', 'Inclinação da Pelve', 'x', 1, -15, 15, 'Hips'),
  control('Corpo', 'spine', 'Flexão Lombar', 'x', 1, -20, 35, 'Spine'),
  control('Corpo', 'spine1', 'Inclinação do Tronco', 'z', 1, -20, 20, 'Spine1'),
  control('Corpo', 'spine2', 'Rotação do Peito', 'y', 1, -35, 35, 'Spine2'),
  control('Corpo', 'neck', 'Rotação do Pescoço', 'y', 1, -50, 50, 'Neck'),
  control('Corpo', 'head', 'Flexão da Cabeça', 'x', 1, -30, 40, 'Head'),

  control('Braço Direito', 'rightShoulder', 'Elevação Escapular', 'z', -1, -10, 20, 'RightShoulder'),
  control('Braço Direito', 'rightArm', 'Ombro: Frente / Trás', 'x', -1, -40, 150, 'RightArm'),
  control('Braço Direito', 'rightArmAbduction', 'Ombro: Abrir', 'z', -1, 0, 180, 'RightArmAbduction'),
  control('Braço Direito', 'rightForeArm', 'Flexão do Cotovelo', 'x', 1, 0, 145, 'RightForeArm'),
  control('Braço Direito', 'rightHand', 'Flexão do Punho', 'x', 1, -70, 80, 'RightHand'),

  control('Mão Direita', 'rightFinger1', 'Polegar', 'x', -1, 0, 70, 'RightFinger1'),
  control('Mão Direita', 'rightFinger2', 'Indicador', 'x', -1, 0, 90, 'RightFinger2'),
  control('Mão Direita', 'rightFinger3', 'Médio', 'x', -1, 0, 90, 'RightFinger3'),
  control('Mão Direita', 'rightFinger4', 'Anelar', 'x', -1, 0, 90, 'RightFinger4'),
  control('Mão Direita', 'rightFinger5', 'Mínimo', 'x', -1, 0, 90, 'RightFinger5'),

  control('Braço Esquerdo', 'leftShoulder', 'Elevação Escapular', 'z', 1, -10, 20, 'LeftShoulder'),
  control('Braço Esquerdo', 'leftArm', 'Ombro: Frente / Trás', 'x', -1, -40, 150, 'LeftArm'),
  control('Braço Esquerdo', 'leftArmAbduction', 'Ombro: Abrir', 'z', 1, 0, 180, 'LeftArmAbduction'),
  control('Braço Esquerdo', 'leftForeArm', 'Flexão do Cotovelo', 'x', 1, 0, 145, 'LeftForeArm'),
  control('Braço Esquerdo', 'leftHand', 'Flexão do Punho', 'x', 1, -70, 80, 'LeftHand'),

  control('Mão Esquerda', 'leftFinger1', 'Polegar', 'x', -1, 0, 70, 'LeftFinger1'),
  control('Mão Esquerda', 'leftFinger2', 'Indicador', 'x', -1, 0, 90, 'LeftFinger2'),
  control('Mão Esquerda', 'leftFinger3', 'Médio', 'x', -1, 0, 90, 'LeftFinger3'),
  control('Mão Esquerda', 'leftFinger4', 'Anelar', 'x', -1, 0, 90, 'LeftFinger4'),
  control('Mão Esquerda', 'leftFinger5', 'Mínimo', 'x', -1, 0, 90, 'LeftFinger5'),

  control('Perna Direita', 'rightUpLeg', 'Quadril: Frente / Trás', 'x', -1, -20, 120, 'RightUpLeg'),
  control('Perna Direita', 'rightUpLegAbduction', 'Quadril: Abrir', 'z', -1, -20, 45, 'RightUpLegAbduction'),
  control('Perna Direita', 'rightLeg', 'Flexão do Joelho', 'x', 1, 0, 135, 'RightLeg'),
  control('Perna Direita', 'rightFoot', 'Flexão do Tornozelo', 'x', 1, -20, 50, 'RightFoot'),
  control('Perna Direita', 'rightToeBase', 'Flexão dos Dedos', 'x', 1, -30, 45, 'RightToeBase'),

  control('Pé Direito', 'rightToe1', 'Hálux', 'x', 1, -30, 45, 'RightToe1'),
  control('Pé Direito', 'rightToe2', 'Segundo Dedo', 'x', 1, -30, 45, 'RightToe2'),
  control('Pé Direito', 'rightToe3', 'Terceiro Dedo', 'x', 1, -30, 45, 'RightToe3'),
  control('Pé Direito', 'rightToe4', 'Quarto Dedo', 'x', 1, -30, 45, 'RightToe4'),
  control('Pé Direito', 'rightToe5', 'Quinto Dedo', 'x', 1, -30, 45, 'RightToe5'),

  control('Perna Esquerda', 'leftUpLeg', 'Quadril: Frente / Trás', 'x', -1, -20, 120, 'LeftUpLeg'),
  control('Perna Esquerda', 'leftUpLegAbduction', 'Quadril: Abrir', 'z', 1, -20, 45, 'LeftUpLegAbduction'),
  control('Perna Esquerda', 'leftLeg', 'Flexão do Joelho', 'x', 1, 0, 135, 'LeftLeg'),
  control('Perna Esquerda', 'leftFoot', 'Flexão do Tornozelo', 'x', 1, -20, 50, 'LeftFoot'),
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

  const pivots = {
    hips: createPivot(model, 'Hips', new THREE.Vector3(0, 0.9, -0.02)),
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
    attachKeepingWorld(pivots.hips, pivots[`${side}UpLeg`]);
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

      const collapsed = mobileMedia.matches && sections.size > 0;
      section.classList.toggle('is-collapsed', collapsed);
      sectionToggle.setAttribute('aria-expanded', String(!collapsed));
      sectionToggle.addEventListener('click', () => {
        if (!mobileMedia.matches) return;
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
      if (!mobileMedia.matches) {
        sectionToggle.setAttribute('aria-expanded', 'true');
      } else {
        sectionToggle.setAttribute(
          'aria-expanded',
          String(!section.classList.contains('is-collapsed'))
        );
      }
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

    if (def.id === 'rightArmAbduction' || def.id === 'leftArmAbduction') {
      const side = def.id.startsWith('right') ? 'right' : 'left';
      scapularRotation[side] = rawDegrees <= 30
        ? rawDegrees / 6
        : 5 + ((rawDegrees - 30) * 55) / 150;
      jointDegrees -= scapularRotation[side];
    }

    applyRotation(state, jointDegrees);
  });

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
  applyPose();
}

function centerCamera() {
  camera.position.copy(cameraHome);
  orbitControls.target.copy(orbitHome);
  orbitControls.update();
}

function frameModel(model) {
  model.updateMatrixWorld(true);

  const initialBox = new THREE.Box3().setFromObject(model);
  const initialCenter = initialBox.getCenter(new THREE.Vector3());
  model.position.x -= initialCenter.x;
  model.position.y -= initialBox.min.y;
  model.position.z -= initialCenter.z;
  model.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const distance = (maxDimension / (2 * Math.tan(verticalFov / 2))) * 1.35;

  orbitHome = new THREE.Vector3(center.x, box.min.y + size.y * 0.52, center.z);
  cameraHome = new THREE.Vector3(
    orbitHome.x,
    orbitHome.y + size.y * 0.04,
    orbitHome.z + distance
  );

  camera.near = Math.max(maxDimension / 1000, 0.01);
  camera.far = Math.max(maxDimension * 20, 100);
  camera.updateProjectionMatrix();
  centerCamera();
}

function initScene() {
  const compactRendering = mobileMedia.matches || coarsePointerMedia.matches;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090c12);
  scene.fog = new THREE.Fog(0x090c12, 5, 14);

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
    new THREE.MeshStandardMaterial({
      color: 0x0d1118,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 0.95,
    })
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
      bindBones();
      if (anatomicalMeshCount > 0) {
        setStatus(`Pronto. ${anatomicalMeshCount} estruturas anatômicas conectadas aos controles.`);
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
  if (document.hidden) return;
  orbitControls.update();
  renderer.render(scene, camera);
}

function attachActions() {
  resetBtn.addEventListener('click', resetPose);
  centerBtn.addEventListener('click', centerCamera);
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
  attachActions();
  loadModel();
  animate();
}

start();
