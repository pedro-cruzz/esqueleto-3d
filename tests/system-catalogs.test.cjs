const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const THREE = require('three');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const files = { cardiovascular: 'cardiovascular', nervous: 'nervoso', organs: 'orgaos' };

for (const [system, file] of Object.entries(files)) {
  test(`${system}: every real mesh has distinct metadata tied to its original node`, () => {
    const context = { window: {} };
    vm.runInNewContext(read(`src/data/${system}-catalog.js`), context);
    const catalog = Object.values(context.window.ANATOMY_CATALOGS[system]);
    const raw = fs.readFileSync(path.join(root, `public/models/${file}.glb`));
    assert.equal(raw.readUInt32LE(8), raw.length, 'complete GLB file');
    const gltf = JSON.parse(raw.subarray(20, 20 + raw.readUInt32LE(12)));
    const indexes = gltf.nodes.flatMap((node, index) => node.mesh !== undefined && !/\.g\.\d+$/.test(node.name) ? [index] : []);
    assert.deepEqual(catalog.map(entry => entry.sourceNode).sort((a,b) => a-b), indexes);
    assert.equal(new Set(catalog.map(entry => entry.sourceNode)).size, catalog.length);
    for (const entry of catalog) {
      assert.ok(entry.name && entry.original && entry.region && entry.kind && entry.review);
      assert.ok(['left', 'right', 'midline'].includes(entry.side));
      const node = gltf.nodes[entry.sourceNode];
      assert.equal(gltf.meshes[node.mesh].primitives.length, 1, 'one mesh per source-node association');
      if (/\.l\.\d+$/.test(node.name)) assert.equal(entry.side, 'left');
      if (/\.r\.\d+$/.test(node.name)) assert.equal(entry.side, 'right');
    }
  });
}

test('muscular and new systems preserve source geometry and local transforms during preparation', () => {
  for (const [system, file] of Object.entries({ muscular: 'musculos', ...files })) {
    const raw = fs.readFileSync(path.join(root, `public/models/${file}.glb`));
    const gltf = JSON.parse(raw.subarray(20, 20 + raw.readUInt32LE(12)));
    const model = new THREE.Group();
    for (const node of gltf.nodes.filter(node => node.mesh !== undefined)) {
      const accessor = gltf.accessors[gltf.meshes[node.mesh].primitives[0].attributes.POSITION];
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([...accessor.min, ...accessor.max], 3));
      const mesh = new THREE.Mesh(geometry); mesh.name = node.name;
      if (node.matrix) new THREE.Matrix4().fromArray(node.matrix).decompose(mesh.position, mesh.quaternion, mesh.scale);
      else {
        if (node.translation) mesh.position.fromArray(node.translation);
        if (node.rotation) mesh.quaternion.fromArray(node.rotation);
        if (node.scale) mesh.scale.fromArray(node.scale);
      }
      model.add(mesh);
    }
    const before = model.children.map(mesh => ({geometry: mesh.geometry, points: [...mesh.geometry.attributes.position.array], position: mesh.position.toArray(), scale: mesh.scale.toArray(), rotation: mesh.quaternion.toArray()}));
    const context = vm.createContext({ THREE, URLSearchParams, model, console,
      window: { location: { search: `?system=${system}` }, matchMedia: () => ({ matches: false }) },
      document: { getElementById: () => null, querySelector: () => null } });
    vm.runInContext(read('src/data/systems.js'), context);
    vm.runInContext(read('src/data/body-profiles.js'), context);
    const app = read('src/core/app.js');
    vm.runInContext(app.slice(0, app.lastIndexOf('\ntry {\n  start();')), context);
    vm.runInContext('normalizeModelForSystem(model); prepareBodyProfileMeshes(model); applyBodyProfile(model, "feminine");', context);
    model.children.forEach((mesh, i) => {
      assert.equal(mesh.geometry, before[i].geometry, `${system}: no geometry clone`);
      assert.deepEqual([...mesh.geometry.attributes.position.array], before[i].points);
      assert.deepEqual(mesh.position.toArray(), before[i].position);
      assert.deepEqual(mesh.scale.toArray(), before[i].scale);
      assert.deepEqual(mesh.quaternion.toArray(), before[i].rotation);
    });
    assert.equal(model.scale.x, system === 'muscular' ? 0.001 : 1);
    assert.equal(model.rotation.x, system === 'muscular' ? -Math.PI / 2 : 0);
  }
});

test('render requests coalesce, idle rendering stops, and hidden views do not draw', () => {
  const frames = []; let draws = 0, labels = 0;
  const context = vm.createContext({ THREE, URLSearchParams, console,
    window: { location: { search: '?system=muscular' }, matchMedia: () => ({ matches: false }) },
    document: { hidden: false, getElementById: () => null, querySelector: () => null },
    requestAnimationFrame: callback => { frames.push(callback); return frames.length; },
    AnatomyStudy: { isGallery: () => false, update: () => labels++ },
    mockRenderer: { render: () => draws++ }, mockControls: { update: () => {} } });
  vm.runInContext(read('src/data/systems.js'), context);
  const app = read('src/core/app.js');
  vm.runInContext(app.slice(0, app.lastIndexOf('\ntry {\n  start();')), context);
  vm.runInContext('renderer = mockRenderer; orbitControls = mockControls; requestRender(); requestRender(); requestRender();', context);
  assert.equal(frames.length, 1);
  frames.shift()(); assert.equal(draws, 1); assert.equal(labels, 1); assert.equal(frames.length, 0);
  vm.runInContext('document.hidden = true; requestRender();', context);
  frames.shift()(); assert.equal(draws, 1); assert.equal(frames.length, 0);
  vm.runInContext('document.hidden = false; requestRender();', context);
  frames.shift()(); assert.equal(draws, 2);
});
