const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'anatomy-catalog.js'), 'utf8'), sandbox);
const catalog = sandbox.window.ANATOMY_CATALOG;
const raw = fs.readFileSync(path.join(root, 'esqueleto-anatomico.glb'));
const gltf = JSON.parse(raw.subarray(20, 20 + raw.readUInt32LE(12)).toString());
const meshes = gltf.nodes.filter(n => n.mesh !== undefined && !n.name.startsWith('Skeletal system'));
const normalize = name => name.toLowerCase().replace(/[^a-z0-9]/g, '');

test('every selectable mesh has unique metadata, with no orphaned entries', () => {
  const keys = meshes.map(n => normalize(n.name));
  assert.equal(new Set(keys).size, meshes.length, 'mesh identifiers must be unique');
  assert.deepEqual(Object.keys(catalog).sort(), keys.sort());
  for (const node of meshes) {
    const entry = catalog[normalize(node.name)];
    for (const field of ['name', 'original', 'region', 'kind']) assert.ok(entry[field]?.trim(), `${node.name}: ${field}`);
    const side = node.name.includes('.r.') ? 'right' : node.name.includes('.l.') ? 'left' : 'midline';
    assert.equal(entry.side, side, node.name);
  }
});

test('teeth, cartilage and cavities are not catalogued as bones', () => {
  for (const entry of Object.values(catalog)) {
    if (/cartilage/.test(entry.original)) assert.equal(entry.kind, 'Cartilagem');
    else if (/incisor|canine|molar/.test(entry.original)) assert.equal(entry.kind, 'Dente');
    else if (/Sinus|cells/.test(entry.original)) assert.equal(entry.kind, 'Cavidade');
    else assert.equal(entry.kind, 'Estrutura óssea');
  }
});

test('similar small bones retain their anatomical region and identity', () => {
  assert.equal(catalog.scaphoidboner001.name, 'Osso escafoide');
  assert.equal(catalog.scaphoidboner001.region, 'Mãos');
  assert.equal(catalog.navicularboner001.region, 'Pés');
  assert.equal(catalog.atlasc1001.name, 'Atlas (C1)');
  assert.equal(catalog.axisc2001.name, 'Áxis (C2)');
  assert.equal(catalog.proximalphalanxoffirstfingerofhandr001.region, 'Mãos');
  assert.equal(catalog.proximalphalanxoffirstfingeroffootr001.region, 'Pés');
});

test('paired hip bones use the correct anatomical name and laterality', () => {
  assert.equal(catalog.hipboner001.name, 'Osso coxal');
  assert.equal(catalog.hipboner001.side, 'right');
  assert.equal(catalog.hipbonel001.name, 'Osso coxal');
  assert.equal(catalog.hipbonel001.side, 'left');
  assert.equal(catalog.hipboner001.region, 'Pelve');
  assert.equal(catalog.hipbonel001.region, 'Pelve');
});
