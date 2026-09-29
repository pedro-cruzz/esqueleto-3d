/* Move the real range and label into the mobile dock. Existing input handlers,
   IDs, disabled states and pose values remain authoritative. */
window.createMobileStudyControls = ({ media, setPanelOpen }) => {
  const $ = id => document.getElementById(id);
  const dock = $('compact-tools');
  const content = $('compact-control-content');
  const panel = $('panel-body');
  const records = [];
  let active = null;
  let menuOpen = false;
  let selectedId = null;

  const syncButtons = () => records.forEach(record => {
    record.button.disabled = record.input.disabled;
    record.value.textContent = `${record.input.value}${record.unit}`;
    record.button.setAttribute('aria-pressed', String(record === active));
  });
  const restore = record => {
    if (record) record.wrapper.prepend(record.label, record.input);
  };
  const render = () => {
    const visible = Boolean(media.matches && active && !menuOpen);
    dock.hidden = !visible;
    document.body.classList.toggle('compact-tool-active', Boolean(media.matches && active));
    if (active) {
      $('compact-context').textContent = active.input.id === 'separate-bone' ? $('detail-name').textContent : active.group;
      $('compact-context').title = $('compact-context').textContent;
      if (visible) content.append(active.label, active.input);
      else restore(active);
    }
    syncButtons();
  };
  const clear = ({ focus = false } = {}) => {
    const hadFocus = dock.contains(document.activeElement);
    restore(active);
    active = null;
    render();
    if (focus || hadFocus) $('panel-toggle').focus({ preventScroll: true });
  };
  const activate = record => {
    if (!media.matches || record.input.disabled) return;
    restore(active);
    active = record;
    setPanelOpen(false);
    render();
    record.input.focus({ preventScroll: true });
  };

  document.querySelectorAll('#controls .control, .adjustment-control').forEach(wrapper => {
    const input = wrapper.querySelector('input[type="range"]');
    const label = wrapper.querySelector('.tool-heading') || wrapper.querySelector('label');
    const title = wrapper.dataset.compactLabel || label.querySelector('span').textContent;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'compact-launch';
    const group = wrapper.closest('.section')?.querySelector('.section-toggle').textContent || 'Explorar';
    button.setAttribute('aria-label', `Ajustar ${title.toLowerCase()}${wrapper.dataset.controlId ? ` (${group})` : ''}`);
    button.setAttribute('aria-controls', 'compact-tools');
    const name = document.createElement('span'); name.textContent = title;
    const value = document.createElement('span'); value.className = 'compact-launch-value';
    const arrow = document.createElement('span'); arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true');
    button.append(name, value, arrow);
    wrapper.classList.add('has-compact-control');
    wrapper.append(button);
    const record = { wrapper, input, label, button, value, group, unit: wrapper.dataset.controlId ? '°' : '%' };
    records.push(record);
    button.addEventListener('click', () => activate(record));
    new MutationObserver(() => {
      if (record === active && input.disabled) clear();
      syncButtons();
    }).observe(input, { attributes: true, attributeFilter: ['disabled'] });
  });

  $('compact-change').addEventListener('click', () => {
    setPanelOpen(true);
    if (active) {
      // Ensure the chosen row can be reached even after using another tab.
      const section = active.wrapper.closest('[id^="tab-"]');
      if (section) document.querySelector(`[data-tab="${section.id.slice(4)}"]`).click();
      const details = active.wrapper.closest('details');
      if (details) details.open = true;
      const group = active.wrapper.closest('.section');
      if (group) {
        group.classList.remove('is-collapsed');
        group.querySelector('.section-toggle').setAttribute('aria-expanded', 'true');
      }
      active.button.focus({ preventScroll: true });
      panel.scrollTop += active.button.getBoundingClientRect().top - panel.getBoundingClientRect().top - 70;
    }
  });
  $('compact-close').addEventListener('click', () => clear({ focus: true }));
  document.addEventListener('input', syncButtons);
  document.addEventListener('click', () => queueMicrotask(syncButtons));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !event.defaultPrevented && media.matches && active && !menuOpen) {
      event.preventDefault();
      clear({ focus: true });
    }
  });
  media.addEventListener('change', () => {
    if (!media.matches) {
      const record = active;
      const hadFocus = dock.contains(document.activeElement);
      clear();
      if (hadFocus && record) {
        const target = record.input.closest('[hidden]') ? document.querySelector('.tabs [aria-pressed="true"]') : record.input;
        target.focus({ preventScroll: true });
      }
    } else render();
  });
  render();
  return {
    clear,
    focusVisibleControl() { (media.matches && active && !menuOpen ? active.input : $('panel-toggle')).focus({ preventScroll: true }); },
    setMenuOpen(open) { menuOpen = open; render(); },
    selectionChanged(id) {
      if (id !== selectedId && active?.input.id === 'separate-bone') clear();
      selectedId = id;
    },
  };
};
