const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const THREE = require('three');
const root = path.resolve(__dirname, '..');

// Reproduce the actual GLB hierarchy and transforms. Accessor bounds suffice
// for rig joint centers; these tests do not need a GPU or Draco decompression.
function skeleton() {
  const bytes = fs.readFileSync(path.join(root, 'public/models/esqueleto-anatomico.glb'));
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
  const nodes = gltf.nodes.map(node => {
    let object = new THREE.Group();
    if (node.mesh !== undefined) {
      const geometry = new THREE.BufferGeometry();
      const points = gltf.meshes[node.mesh].primitives.flatMap(primitive => {
        const accessor = gltf.accessors[primitive.attributes.POSITION];
        return [...accessor.min, ...accessor.max];
      });
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
      object = new THREE.Mesh(geometry);
    }
    object.name = node.name || '';
    if (node.matrix) {
      new THREE.Matrix4().fromArray(node.matrix).decompose(object.position, object.quaternion, object.scale);
    } else {
      if (node.translation) object.position.fromArray(node.translation);
      if (node.rotation) object.quaternion.fromArray(node.rotation);
      if (node.scale) object.scale.fromArray(node.scale);
    }
    return object;
  });
  gltf.nodes.forEach((node, i) => (node.children || []).forEach(child => nodes[i].add(nodes[child])));
  const model = new THREE.Group();
  gltf.scenes[gltf.scene || 0].nodes.forEach(i => model.add(nodes[i]));
  model.updateMatrixWorld(true);
  return model;
}

function runtime(model) {
  const context = vm.createContext({
    THREE, URLSearchParams, model, console,
    window: {
      location: { search: '?system=skeletal' },
      ANATOMY_SYSTEMS: [{ id: 'skeletal' }],
      matchMedia: () => ({ matches: false }),
    },
    document: { getElementById: () => null, querySelector: () => null },
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'src/data/body-profiles.js'), 'utf8'), context);
  const source = fs.readFileSync(path.join(root, 'src/core/app.js'), 'utf8');
  vm.runInContext(source.slice(0, source.lastIndexOf('\ntry {\n  start();')), context);
  return code => vm.runInContext(code, context);
}

function snapshot(model) {
  model.updateMatrixWorld(true);
  const result = new Map();
  model.traverse(node => {
    if (node.isMesh && !node.name.startsWith('Skeletal system')) {
      result.set(node.name, {
        matrix: node.matrixWorld.toArray(),
        points: Array.from(node.geometry.attributes.position.array),
      });
    }
  });
  return result;
}

function assertSameAssembly(before, after) {
  assert.equal(after.size, 277);
  for (const [name, original] of before) {
    const current = after.get(name);
    assert.ok(current, name);
    original.matrix.forEach((value, i) => {
      assert.ok(Math.abs(value - current.matrix[i]) < 0.00001, `${name}: world transform ${i}`);
    });
    assert.deepEqual(current.points, original.points, `${name}: geometry changed`);
  }
}

test('all 277 structures retain the GLB assembly through profile preparation and rigging', () => {
  const model = skeleton();
  const run = runtime(model);
  const before = snapshot(model);
  run('normalizeModelForSystem(model); prepareBodyProfileMeshes(model); applyBodyProfile(model, "masculine");');
  assertSameAssembly(before, snapshot(model));
  run('buildAnatomicalRig(model);');
  assertSameAssembly(before, snapshot(model));
  run('applyBodyProfile(model, "feminine");');
  assertSameAssembly(before, snapshot(model));
});

test('moving the shoulder and knee then restoring neutral preserves every bone transform', () => {
  const model = skeleton();
  const run = runtime(model);
  const before = snapshot(model);
  run(`
    prepareBodyProfileMeshes(model);
    buildAnatomicalRig(model);
    CONTROL_DEFS.forEach(def => {
      const bone = findBone(def.candidates);
      controlState.set(def.id, { def, bone, baseQuaternion: bone.quaternion.clone(), input: { value: '0' } });
    });
    applyPose();
  `);
  assertSameAssembly(before, snapshot(model));
  run("controlState.get('rightArm').input.value = '45'; controlState.get('leftLeg').input.value = '60'; applyPose();");
  assert.notDeepEqual(snapshot(model).get('Humerus.r.001').matrix, before.get('Humerus.r.001').matrix);
  run("controlState.forEach(state => { state.input.value = '0'; }); applyPose();");
  assertSameAssembly(before, snapshot(model));
});
