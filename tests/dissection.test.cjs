const { test } = require('node:test');
const assert = require('node:assert/strict');
const history = require('../src/logic/dissection-history.js');

test('dissection hides once, undoes in reverse order and leaves source positions intact', () => {
  const h = history();
  const superficial = { hidden: false, position: [1,2,3] };
  const deep = { hidden: false, position: [3,2,1] };
  assert.equal(h.hide(superficial), true);
  assert.equal(h.hide(superficial), false);
  assert.equal(h.hide(null), false);
  h.hide(deep); assert.equal(h.size, 2);
  assert.equal(h.undo(), deep); assert.equal(deep.hidden, false);
  assert.equal(superficial.hidden, true);
  assert.equal(h.undo(), superficial); assert.equal(superficial.hidden, false);
  assert.equal(h.undo(), null);
  assert.deepEqual(superficial.position, [1,2,3]);
  h.hide(deep); h.reset(); assert.equal(h.size, 0); assert.equal(h.undo(), null);
});
