const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'src/data/muscle-catalog.js'), 'utf8'), sandbox);
const catalog = sandbox.window.ANATOMY_CATALOGS.muscular;
const raw = fs.readFileSync(path.join(root, 'public/models/musculos.glb'));
const gltf = JSON.parse(raw.subarray(20, 20 + raw.readUInt32LE(12)).toString());
const meshes = gltf.nodes.filter((node) => node.mesh !== undefined && node.name !== 'BodyMuscles');
const normalize = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

test('every muscular mesh has catalog metadata and correct laterality', () => {
  const keys = meshes.map((node) => normalize(node.name));
  assert.equal(new Set(keys).size, meshes.length, 'muscle identifiers must be unique');
  assert.deepEqual(Object.keys(catalog).sort(), keys.sort());
  for (const node of meshes) {
    const entry = catalog[normalize(node.name)];
    for (const field of ['name', 'original', 'region', 'kind']) assert.ok(entry[field]?.trim(), `${node.name}: ${field}`);
    const side = /\bleft\b/i.test(node.name) ? 'left' : /\bright\b/i.test(node.name) ? 'right' : 'midline';
    assert.equal(entry.side, side, node.name);
    assert.ok(['Músculo', 'Tendão', 'Ligamento', 'Aponeurose', 'Cartilagem', 'Fáscia', 'Retináculo', 'Membrana'].includes(entry.kind), `${node.name}: kind`);
  }
});

test('connective tissue is not presented as muscle, and shoulder and thigh groups are specific', () => {
  assert.equal(catalog.leftiliotibialtract.kind, 'Fáscia');
  assert.equal(catalog.flexorretinaculumofleftwrist.kind, 'Retináculo');
  assert.equal(catalog.leftsupraspinatus.region, 'Membros superiores');
  assert.equal(catalog.leftsemitendinosus.region, 'Coxa');
});

test('muscle catalog includes representative structures and regions', () => {
  assert.equal(catalog.longheadofrightbicepsbrachii.kind, 'Músculo');
  assert.equal(catalog.longheadofrightbicepsbrachii.region, 'Membros superiores');
  assert.equal(catalog.rightgluteusmaximus.name, 'Glúteo máximo');
  assert.equal(catalog.rightgluteusmaximus.side, 'right');
  assert.equal(catalog.rightcalcanealtendon.kind, 'Tendão');
});
