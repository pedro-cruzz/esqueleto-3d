/* Shared, renderer-independent rules for filtering and separated positions. */
(function (root) {
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function matches(entry, filters) {
    return entry.search.includes(normalize(filters.query.trim())) &&
      (filters.region === 'all' || entry.region === filters.region) &&
      (filters.side === 'all' || entry.side === filters.side) &&
      (filters.kind === 'all' || entry.kind === filters.kind);
  }
  function isVisible(entry, filters, isolatedId) {
    return !entry.hidden && matches(entry, filters) && (!isolatedId || entry.id === isolatedId);
  }
  function separatedLayout(items, gap) {
    if (!items.length) return [];
    const center = [0, 1, 2].map(axis => items.reduce((sum, item) => sum + item.center[axis], 0) / items.length);
    const positions = items.map(item => item.center.map((value, axis) => center[axis] + (value - center[axis]) * (axis === 1 ? 1.2 : 2)));
    const half = items.map(item => item.size.map(value => Math.max(value, gap * 0.3) / 2));
    const overlap = (i, j) => [0, 1, 2].map(axis => half[i][axis] + half[j][axis] + gap - Math.abs(positions[i][axis] - positions[j][axis]));
    for (let iteration = 0; iteration < 100; iteration++) {
      let collisions = 0;
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
        const penetration = overlap(i, j);
        if (penetration.some(value => value <= 0)) continue;
        collisions++;
        const axis = penetration.indexOf(Math.min(...penetration));
        const sign = positions[i][axis] >= positions[j][axis] ? 1 : -1;
        const shift = (penetration[axis] + gap * 0.01) / 2;
        positions[i][axis] += sign * shift;
        positions[j][axis] -= sign * shift;
      }
      if (!collisions) break;
    }
    // Search nearby free space for dense clusters instead of sending pieces into a long row.
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < items.length; i++) {
      const collides = () => positions.some((_, j) => j !== i && overlap(i, j).every(value => value > 0));
      if (!collides()) continue;
      const anchor = positions[i].slice();
      let placed = false;
      for (let shell = 1; shell <= 100 && !placed; shell++) {
        const radius = shell * gap * 2;
        for (let sample = 0; sample < 64; sample++) {
          const y = 1 - 2 * (sample + .5) / 64;
          const radial = Math.sqrt(1 - y * y);
          const angle = (sample + i) * goldenAngle;
          positions[i] = [anchor[0] + radius * radial * Math.cos(angle), anchor[1] + radius * y, anchor[2] + radius * radial * Math.sin(angle)];
          if (!collides()) { placed = true; break; }
        }
      }
      if (!placed) positions[i][0] = Math.max(...positions.map((p, j) => p[0] + half[j][0])) + half[i][0] + gap * 1.01;
    }
    return positions;
  }
  const logic = { normalize, matches, isVisible, separatedLayout };
  if (typeof module !== 'undefined' && module.exports) module.exports = logic;
  else root.AnatomyStudyLogic = logic;
})(typeof window === 'undefined' ? globalThis : window);
