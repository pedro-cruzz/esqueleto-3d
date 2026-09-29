const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const THREE = require('three');

test('body context shares the source frame without joining anatomy or intercepting selection', () => {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { checked: true, value: '24', addEventListener() {} });
    return elements.get(id);
  };
  const body = new THREE.Group();
  const surface = new THREE.Mesh(new THREE.SphereGeometry(.1)); body.add(surface);
  class Loader { load(path, done) { done({ scene: body }); } }
  const context = { window: {}, THREE: { ...THREE, GLTFLoader: Loader }, document: { getElementById: element }, console };
  vm.runInNewContext(fs.readFileSync('src/components/body-context.js','utf8'), context);
  const model = new THREE.Group();
  model.position.set(-.02,-.7,.01); model.rotation.y = .1;
  const organ = new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1)); model.add(organ);
  const scene = new THREE.Scene(); scene.add(model);
  const original = organ.position.toArray();
  let renders = 0, ready = 0;
  const api = context.window.BodyContext;
  api.init({ model, scene, requestRender: () => renders++, onReady: () => ready++ });
  assert.equal(ready, 1); assert.ok(renders > 0);
  assert.equal(body.parent, scene);
  assert.deepEqual(model.children, [organ]);
  assert.deepEqual(organ.position.toArray(), original);
  assert.deepEqual(body.matrix.toArray(), model.matrixWorld.toArray());
  assert.equal(surface.material.depthWrite, false);
  const hits = []; surface.raycast({},hits); assert.deepEqual(hits, []);
  assert.equal(api.object(), body);
  api.setSeparated(true); assert.equal(api.object(), null);
  api.setSeparated(false); assert.equal(api.object(), body);
  element('show-body-context').checked = false;
  api.setSeparated(true); api.setSeparated(false); assert.equal(api.object(), null);
});

test('illustrative body asset has a complete GLB and plausible full-body bounds', () => {
  const raw = fs.readFileSync('public/models/body-context.glb');
  assert.equal(raw.readUInt32LE(8), raw.length);
  const gltf = JSON.parse(raw.subarray(20,20+raw.readUInt32LE(12)));
  const bounds = gltf.accessors[0];
  assert.ok(bounds.min[1] >= -.03 && bounds.min[1] < .03);
  assert.ok(bounds.max[1] > 1.7 && bounds.max[1] < 1.8);
  assert.ok(bounds.min[0] < -.3 && bounds.max[0] > .3);
});
