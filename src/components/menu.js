(() => {
  // Decorative symbols identify the modules; they are not anatomical diagrams.
  const icons = {
    skeletal: '<path d="M22 16a7 7 0 0 0-12-5 7 7 0 0 0 5 12l26 26a7 7 0 0 0 12 5 7 7 0 0 0-5-12L22 16Z"/><path d="m23 26 15 15"/>',
    muscular: '<path d="M14 51c7-8 4-18 14-25 9-6 17-4 20-12M16 53c8-6 18-3 25-13 6-9 4-17 13-23M14 51l2 2M48 14l6 3"/><path d="M20 47c5-7 8-17 23-25M25 47c10-11 12-10 21-23M25 38l11 2M29 31l11 4"/>',
    nervous: '<path d="M32 48V17c-1-10-15-10-17 0-9 1-12 13-5 18-4 9 5 17 12 13 3 7 10 3 10 0ZM32 17c1-10 15-10 17 0 9 1 12 13 5 18 4 9-5 17-12 13-3 7-10 3-10 0"/><path d="M21 17c-5 5 0 9 4 10M13 31c8-2 12 3 10 9M43 17c5 5 0 9-4 10M51 31c-8-2-12 3-10 9M32 51v8"/>',
    cardiovascular: '<path d="M31 20c-4-12-18-9-19 3-1 13 9 26 24 33 12-7 18-17 16-27-1-7-9-10-15-6"/><path d="M30 23V10h8v13M42 18l5-8 6 4-6 9M19 28c1 9 6 16 14 20"/>',
    organs: '<path d="M27 10v18c0 7-10 9-15 5-6 12 1 24 13 23 11-1 13-12 17-15 8-5 12-13 9-20-3-7-12-6-16-2V10"/><path d="M19 40c0 6 4 9 9 7M35 24c-4 8-5 14-9 16"/>',
  };
  const grid = document.getElementById('systems-grid');
  ANATOMY_SYSTEMS.forEach((system, index) => {
    const card = document.createElement('article');
    card.className = `system-menu-card ${system.available ? 'is-available' : 'is-planned'}${system.preview ? ' is-preview' : ''}`;
    const top = document.createElement('div'); top.className = 'card-top';
    const status = document.createElement('span'); status.className = 'system-status'; status.textContent = system.preview ? 'Prévia · em revisão' : system.available ? 'Disponível para explorar' : 'Em preparação';
    const number = document.createElement('span'); number.className = 'system-number'; number.textContent = `0${index + 1}`;
    top.append(status, number);
    const icon = document.createElement('div'); icon.className = `system-symbol symbol-${system.id}`;
    icon.innerHTML = `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[system.id] || icons.organs}</svg>`;
    const title = document.createElement('h3'); title.textContent = system.name;
    const description = document.createElement('p'); description.textContent = system.description;
    card.append(top, icon, title, description);
    if (system.available) {
      const link = document.createElement('a'); link.className = 'open-system'; link.href = `atlas.html?system=${system.id}&view=model`; link.setAttribute('aria-label', `Explorar ${system.name.toLowerCase()}`);
      const label = document.createElement('span'); label.textContent = 'Explorar sistema';
      const arrow = document.createElement('span'); arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true');
      link.append(label, arrow); card.append(link);
    } else {
      const note = document.createElement('span'); note.className = 'planned-label'; note.textContent = 'Modelo ainda não disponível'; card.append(note);
    }
    grid.append(card);
  });
})();
