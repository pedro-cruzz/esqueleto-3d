const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalize, matches, isVisible, separatedLayout } = require('../study-logic.js');
const filters = { query: '', region: 'all', side: 'all', kind: 'all' };
const entries = [
  { id: 'femur-r', search: normalize('Fêmur direito Femur'), region: 'Membros inferiores', side: 'right', kind: 'Estrutura óssea' },
  { id: 'femur-l', search: normalize('Fêmur esquerdo Femur'), region: 'Membros inferiores', side: 'left', kind: 'Estrutura óssea' },
  { id: 'scapula-r', search: normalize('Escápula direita Scapula'), region: 'Membros superiores', side: 'right', kind: 'Estrutura óssea' },
  { id: 'cartilage-r', search: 'cartilagem costal', region: 'Tórax', side: 'right', kind: 'Cartilagem' },
];

test('region, side, search and structure type constrain actual 3D visibility', () => {
  const visible = current => entries.filter(entry => isVisible(entry, current, null)).map(entry => entry.id);
  assert.deepEqual(visible({ ...filters, region: 'Membros inferiores' }), ['femur-r', 'femur-l']);
  assert.deepEqual(visible({ ...filters, query: 'FÊMUR', side: 'left' }), ['femur-l']);
  assert.deepEqual(visible({ ...filters, kind: 'Cartilagem' }), ['cartilage-r']);
  assert.deepEqual(visible({ ...filters, query: 'inexistente' }), []);
  assert.deepEqual(visible(filters), entries.map(entry => entry.id));
});

test('isolation shows exactly one matching structure and respects hide', () => {
  assert.deepEqual(entries.filter(entry => isVisible(entry, filters, 'femur-r')).map(entry => entry.id), ['femur-r']);
  assert.equal(isVisible({ ...entries[0], hidden: true }, filters, 'femur-r'), false);
  assert.equal(isVisible(entries[0], { ...filters, side: 'left' }, 'femur-r'), false);
  assert.equal(matches(entries[2], { ...filters, query: 'escapula' }), true);
});

test('fully separated positions keep dense overlapping pieces apart without mutating source positions', () => {
  const items = Array.from({ length: 50 }, (_, index) => ({ center: [(index % 2) * .01, 1 + index * .001, 0], size: [.1, .03, .15] }));
  const before = JSON.stringify(items);
  const gap = .01, positions = separatedLayout(items, gap);
  assert.equal(JSON.stringify(items), before);
  assert.deepEqual(separatedLayout(items, gap), positions);
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const disjoint = [0, 1, 2].some(axis => Math.abs(positions[i][axis] - positions[j][axis]) >= (items[i].size[axis] + items[j].size[axis]) / 2 + gap - 1e-10);
    assert.ok(disjoint, `pieces ${i} and ${j} overlap`);
  }
  assert.deepEqual(separatedLayout([], gap), []);
});
