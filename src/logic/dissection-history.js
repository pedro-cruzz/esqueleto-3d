(function (root) {
  function createHistory() {
    const stack = [];
    return {
      hide(entry) {
        if (!entry || entry.hidden) return false;
        entry.hidden = true; stack.push(entry); return true;
      },
      undo() {
        const entry = stack.pop();
        if (entry) entry.hidden = false;
        return entry || null;
      },
      reset() { stack.length = 0; },
      get size() { return stack.length; },
    };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = createHistory;
  else root.createDissectionHistory = createHistory;
})(typeof window === 'undefined' ? globalThis : window);
