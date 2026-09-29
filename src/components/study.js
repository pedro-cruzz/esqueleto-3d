/* Study tools operate on mesh positions; the existing joint rig remains independent. */
window.AnatomyStudy = (() => {
  const systems = window.ANATOMY_SYSTEMS;
  const system = systems.find(item => item.id === new URLSearchParams(window.location.search).get('system') && item.available) || systems[0];
  const activeSystemId = system.id;
  const $ = (id) => document.getElementById(id);
  const { normalize, matches, isVisible, separatedLayout } = AnatomyStudyLogic;
  const sides = { right: 'Direito', left: 'Esquerdo', midline: 'Mediano' };
  let entries = [], selected = null, hovered = null, isolated = null, api;
  let pointerStart = null, labelsEnabled = true, mode = 'model';
  let separationReady = false;
  let dissecting = false;
  const dissection = window.createDissectionHistory();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const screenPoint = new THREE.Vector3();
  const labelPoint = new THREE.Vector3();
  const visibleMeshes = [];
  const byMesh = new Map();

  function fullName(entry) {
    return entry.name + (entry.side === 'midline' || entry.sideInName ? '' : ` ${sides[entry.side].toLowerCase()}`);
  }
  function init(context) {
    api = context;
    $('muscle-dissection').hidden = activeSystemId !== 'muscular';
    const catalog = window.ANATOMY_CATALOGS?.[activeSystemId] || window.ANATOMY_CATALOG;
    const kinds = [...new Set(Object.values(catalog).map(entry => entry.kind))].sort();
    $('kind-filter').replaceChildren(new Option('Todas as estruturas', 'all'), ...kinds.map(kind => new Option(kind, kind)));
    context.model.updateMatrixWorld(true);
    const modelBox = new THREE.Box3();
    context.model.traverseVisible(mesh => {
      if (!mesh.isMesh) return;
      mesh.geometry.computeBoundingBox();
      modelBox.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
    });
    const height = modelBox.getSize(new THREE.Vector3()).y;
    context.model.traverse((mesh) => {
      if (!mesh.isMesh || !mesh.visible) return;
      const key = mesh.userData.catalogKey || mesh.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const metadata = catalog[key];
      if (!metadata) { console.warn('Structure missing from catalog:', mesh.name); return; }
      mesh.geometry.computeBoundingBox();
      const localCenter = mesh.geometry.boundingBox.getCenter(new THREE.Vector3());
      const worldCenter = mesh.localToWorld(localCenter.clone());
      const bounds = new THREE.Box3().setFromObject(mesh);
      mesh.material = mesh.material.clone();
      const entry = { ...metadata, id: key, mesh, localCenter, basePosition: mesh.position.clone(), offset: new THREE.Vector3(), worldCenter, worldSize: bounds.getSize(new THREE.Vector3()),
        previewQuaternion: mesh.getWorldQuaternion(new THREE.Quaternion()), previewScale: mesh.getWorldScale(new THREE.Vector3()),
        hidden: false, separation: 0, baseColor: mesh.material.color.clone(), opacity: mesh.material.opacity, transparent: mesh.material.transparent };
      entry.displayName = fullName(entry);
      entry.search = normalize(`${fullName(entry)} ${entry.original} ${entry.region} ${entry.kind}`);
      entries.push(entry);
      byMesh.set(mesh, entry);
    });
    entries.sort((a, b) => fullName(a).localeCompare(fullName(b), 'pt-BR', { numeric: true }));
    prepareSeparation(height);
    SpecimenGallery.init(entries, entry => {
      selected = entry; isolated = entry; entry.hidden = false;
      setMode('model'); refresh(); fit(visibleMeshes);
      if (mobileMedia.matches && uiEl.classList.contains('is-open')) panelToggle.click();
    });
    const regions = [...new Set(entries.map(e => e.region))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    regions.forEach(region => { const option = document.createElement('option'); option.value = region; option.textContent = region; $('region-filter').append(option); });
    entries.forEach(entry => {
      const button = document.createElement('button');
      button.className = 'bone-row'; button.type = 'button'; button.dataset.structureId = entry.id;
      button.setAttribute('aria-pressed', 'false');
      const dot = document.createElement('span'); dot.className = 'bone-dot'; dot.setAttribute('aria-hidden', 'true');
      const title = document.createElement('span'); title.textContent = fullName(entry);
      const subtitle = document.createElement('small'); subtitle.textContent = `${entry.region} · ${entry.kind}`; title.append(subtitle);
      const side = document.createElement('span'); side.className = 'side-code'; side.textContent = entry.side === 'midline' ? '—' : entry.side === 'right' ? 'D' : 'E';
      button.setAttribute('aria-label', fullName(entry));
      button.append(dot, title, side); button.addEventListener('click', () => {
        select(entry);
        if (compact.matches) showSelectionDetails();
      });
      entry.button = button; $('bone-list').append(button);
    });
    const empty = document.createElement('p'); empty.id = 'empty-results'; empty.className = 'empty-results'; empty.textContent = 'Nenhuma estrutura encontrada. Tente outro nome ou região.'; empty.hidden = true; $('bone-list').append(empty);
    $('scene-summary').textContent = `${entries.length} estruturas · Modelo humano em 3D`;
    document.querySelector('.sheet-count').textContent = `${entries.length} estruturas`;
    document.querySelector('.inspector-foot p').textContent = system.preview
      ? 'Prévia para avaliação. Modelos Z-Anatomy; nomenclatura e agrupamentos em revisão. Alguns nomes permanecem no idioma da fonte.'
      : 'Modelo educacional. A contagem inclui partes de estruturas; não equivale ao número de ossos ou músculos do corpo.';
    if (system.preview) $('scene-summary').textContent += ' · Prévia';
    $('restore-study').disabled = false; $('mode-gallery').disabled = false;
    bindEvents(); filterList(); refresh();
    const initialView = new URLSearchParams(window.location.search).get('view');
    if (initialView === 'gallery') {
      $('kind-filter').value = activeSystemId === 'muscular' ? 'Músculo' : activeSystemId === 'skeletal' ? 'Estrutura óssea' : 'all';
      applyFilters(); setMode('gallery');
    } else if (initialView === 'motion' && activeSystemId === 'skeletal') {
      document.querySelector('[data-tab="motion"]').click();
      if (mobileMedia.matches && !uiEl.classList.contains('is-open')) panelToggle.click();
    }
  }
  function prepareSeparation(height) {
    $('explode').disabled = $('separate-bone').disabled = true;
    const items = entries.map(entry => ({ center: entry.worldCenter.toArray(), size: entry.worldSize.toArray() }));
    const apply = separated => {
      entries.forEach((entry, index) => {
        const origin = entry.mesh.parent.worldToLocal(entry.worldCenter.clone());
        entry.offset.copy(entry.mesh.parent.worldToLocal(new THREE.Vector3(...separated[index]))).sub(origin);
      });
      separationReady = true;
      $('explode').disabled = $('separate-bone').disabled = mode === 'gallery';
    };
    let worker;
    const fallback = () => { worker?.terminate(); setTimeout(() => apply(separatedLayout(items, height * .008)), 0); };
    try {
      worker = new Worker('src/logic/separation-worker.js');
      worker.onmessage = ({ data }) => { worker.terminate(); apply(data); };
      worker.onerror = fallback;
      worker.postMessage({ items, gap: height * .008 });
    } catch { fallback(); }
  }
  function filters() {
    return { query: $('bone-search').value, region: $('region-filter').value, side: $('side-filter').value, kind: $('kind-filter').value };
  }
  function filterList() {
    const current = filters();
    const activeFilters = ['region', 'side', 'kind'].filter(key => current[key] !== 'all').length;
    $('filter-options-count').hidden = !activeFilters;
    $('filter-options-count').textContent = `${activeFilters} ${activeFilters === 1 ? 'filtro ativo' : 'filtros ativos'}`;
    let count = 0;
    entries.forEach(entry => {
      entry.matches = matches(entry, current);
      entry.button.hidden = !entry.matches;
      if (entry.matches) count++;
    });
    $('result-count').textContent = `${count} de ${entries.length}`;
    $('empty-results').hidden = count > 0;
    $('clear-filters').disabled = !current.query && current.region === 'all' && current.side === 'all' && current.kind === 'all' && !isolated && !entries.some(entry => entry.hidden);
    SpecimenGallery.filter(entries);
  }
  function applyFilters() {
    isolated = null; hovered = null;
    if (selected && !matches(selected, filters())) selected = null;
    // An explicit filter change starts a fresh group view, including previously hidden pieces.
    entries.forEach(entry => { entry.hidden = false; });
    dissection.reset();
    filterList(); refresh(); fit(visibleMeshes);
  }
  function clearFilters() {
    $('bone-search').value = '';
    $('region-filter').value = $('side-filter').value = $('kind-filter').value = 'all';
    applyFilters();
  }
  function setMode(next) {
    mode = next;
    const gallery = mode === 'gallery';
    if (gallery) window.MobileStudyControls?.clear();
    if (gallery) dissecting = false;
    $('specimen-gallery').hidden = !gallery;
    document.body.classList.toggle('gallery-mode', gallery);
    $('mode-model').setAttribute('aria-pressed', String(!gallery));
    $('mode-gallery').setAttribute('aria-pressed', String(gallery));
    api.orbitControls.enabled = !gallery;
    $('explode').disabled = gallery || !separationReady;
    $('separate-bone').disabled = gallery || !separationReady;
    $('show-label').disabled = gallery;
    $('context-mode').disabled = gallery;
    if (gallery) { isolated = null; hovered = null; }
    refresh();
    if (gallery) SpecimenGallery.resume();
    api.requestRender();
  }
  function select(entry) {
    const wasIsolated = Boolean(isolated);
    hovered = null;
    selected = entry;
    // A new selection remains visible when navigating through an isolated set.
    if (isolated) isolated = entry;
    if (entry) entry.hidden = false;
    refresh();
    if (wasIsolated) fit(visibleMeshes);
  }
  function refresh() {
    if (activeSystemId === 'muscular') document.querySelector('.scene-heading .eyebrow').textContent = dissecting ? 'DISSECAÇÃO ATIVA · TOQUE PARA OCULTAR' : 'EXPLORAR MUSCULATURA EM 3D';
    $('dissection-mode').setAttribute('aria-pressed', String(dissecting));
    $('dissection-mode').textContent = dissecting ? 'Encerrar dissecação por toque' : 'Ativar dissecação por toque';
    $('undo-dissection').disabled = !dissection.size;
    $('dissection-feedback').textContent = dissection.size ? `${dissection.size} ${dissection.size === 1 ? 'ocultação' : 'ocultações'} no histórico. Use desfazer para recuperar.` : 'Nenhuma estrutura removida.';
    visibleMeshes.length = 0;
    const currentFilters = filters();
    entries.forEach(entry => {
      entry.mesh.visible = isVisible(entry, currentFilters, isolated?.id);
      if (entry.mesh.visible) visibleMeshes.push(entry.mesh);
      const highlight = entry === selected;
      if (highlight) entry.mesh.material.color.setHex(activeSystemId === 'muscular' ? 0xe6a096 : 0x93d6ba);
      else entry.mesh.material.color.copy(entry.baseColor);
      entry.mesh.material.emissive.setHex(highlight ? (activeSystemId === 'muscular' ? 0x71332f : 0x458d69) : 0x000000);
      entry.mesh.material.emissiveIntensity = highlight ? (activeSystemId === 'muscular' ? 0.22 : 0.55) : 0;
      const dim = $('context-mode').checked && selected && !highlight;
      const material = entry.mesh.material;
      const transparent = Boolean(dim || entry.transparent);
      if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true; }
      material.opacity = dim ? 0.13 : entry.opacity;
      material.depthWrite = !dim;
      entry.mesh.castShadow = !dim;
      entry.button.setAttribute('aria-pressed', String(highlight));
      entry.button.classList.toggle('is-hidden', !entry.mesh.visible);
    });
    $('scene-empty').hidden = visibleMeshes.length > 0 || mode === 'gallery';
    $('scene-summary').textContent = isolated ? `Estrutura isolada · ${fullName(isolated)}` : `${visibleMeshes.length} de ${entries.length} estruturas · ${$('region-filter').value === 'all' ? 'Todas as regiões' : $('region-filter').value}`;
    if (system.preview) $('scene-summary').textContent += ' · Prévia';
    $('visible-count').textContent = `${visibleMeshes.length} / ${entries.length} estruturas visíveis`;
    $('selection-empty').hidden = Boolean(selected); $('selection-details').hidden = !selected;
    $('clear-selection').disabled = !selected;
    window.MobileStudyControls?.selectionChanged(selected?.id || null);
    $('ui').classList.toggle('has-selection', Boolean(selected));
    const selectionShortcut = $('selection-shortcut');
    selectionShortcut.hidden = !selected;
    const announcement = selected ? `Estrutura selecionada: ${fullName(selected)}. A ficha está disponível nas ferramentas de estudo.` : '';
    if ($('selection-announcement').textContent !== announcement) $('selection-announcement').textContent = announcement;
    if (selected) {
      selectionShortcut.setAttribute('aria-label', `Ver ficha de ${fullName(selected)}`);
      $('detail-name').textContent = fullName(selected); $('detail-original').textContent = selected.original;
      if (selected.review) $('detail-original').textContent += ` · ${selected.review}`;
      $('detail-kind').textContent = selected.kind; $('detail-region').textContent = selected.region;
      $('detail-side').textContent = sides[selected.side]; $('detail-visibility').textContent = selected.mesh.visible ? 'Visível' : 'Oculta';
      $('isolate-bone').textContent = isolated ? 'Sair do isolamento' : 'Isolar estrutura';
      $('isolate-bone').setAttribute('aria-pressed', String(Boolean(isolated)));
      $('hide-bone').textContent = selected.hidden ? 'Mostrar estrutura' : 'Ocultar estrutura';
      $('focus-bone').disabled = !selected.mesh.visible;
      $('separate-bone').value = selected.separation; $('separate-value').textContent = `${selected.separation}%`;
    }
    filterList();
    updatePositions();
  }
  function updatePositions() {
    const globalAmount = Number($('explode').value) / 100;
    $('explode-value').textContent = `${$('explode').value}%`;
    entries.forEach(entry => entry.mesh.position.copy(entry.basePosition).addScaledVector(entry.offset, globalAmount + entry.separation / 100));
    window.BodyContext?.setSeparated(globalAmount > 0 || entries.some(entry => entry.separation > 0));
    updateRestoreAction();
    if (api) api.model.updateMatrixWorld(true);
    api?.requestRender();
  }
  function updateRestoreAction() {
    $('restore-study').hidden = !(Number($('explode').value) || !labelsEnabled || $('context-mode').checked || mode === 'gallery' || dissecting || entries.some(entry => entry.separation));
  }
  function hideStructure(entry) {
    if (!dissection.hide(entry)) return;
    if (isolated === entry) isolated = null;
    if (selected === entry) selected = null;
    hovered = null;
    refresh();
    $('dissection-feedback').textContent = `${fullName(entry)} ocultado. ${dissection.size} no histórico.`;
  }
  function fit(objects) {
    const box = new THREE.Box3();
    objects.forEach(mesh => box.expandByObject(mesh));
    const body = window.BodyContext?.object();
    if (body && objects === visibleMeshes && visibleMeshes.length === entries.length && !isolated) box.expandByObject(body);
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    api.camera.updateMatrixWorld(true);
    const size = box.clone().applyMatrix4(api.camera.matrixWorldInverse).getSize(new THREE.Vector3());
    const fov = THREE.MathUtils.degToRad(api.camera.fov);
    const compactViewport = window.matchMedia('(max-width: 720px), (max-height: 560px) and (orientation: landscape)').matches;
    const fitMargin = compactViewport ? 1.16 : 1.45;
    const distance = Math.max(size.y, size.x / api.camera.aspect, 0.004) / (2 * Math.tan(fov / 2)) * fitMargin + size.z / 2;
    const direction = api.camera.position.clone().sub(api.orbitControls.target).normalize();
    api.orbitControls.target.copy(center); api.camera.position.copy(center).addScaledVector(direction, distance);
    api.orbitControls.update();
  }
  function pick(event) {
    const rect = api.renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, api.camera);
    const hits = raycaster.intersectObjects(visibleMeshes, false);
    return hits.length ? byMesh.get(hits[0].object) : null;
  }
  function bindEvents() {
    $('dissection-mode').addEventListener('click', () => {
      const next = !dissecting;
      if (mode === 'gallery') setMode('model');
      dissecting = next; hovered = null; refresh();
    });
    $('undo-dissection').addEventListener('click', () => { dissection.undo(); refresh(); });
    ['bone-search', 'region-filter', 'side-filter', 'kind-filter'].forEach(id => $(id).addEventListener('input', applyFilters));
    $('clear-filters').addEventListener('click', clearFilters);
    $('mode-model').addEventListener('click', () => { setMode('model'); fit(visibleMeshes); });
    $('mode-gallery').addEventListener('click', () => {
      setMode('gallery');
      if (mobileMedia.matches && uiEl.classList.contains('is-open')) panelToggle.click();
    });
    $('explode').addEventListener('input', () => { updatePositions(); fit(visibleMeshes); });
    $('separate-bone').addEventListener('input', () => {
      if (!selected) return;
      selected.separation = Number($('separate-bone').value); $('separate-value').textContent = `${selected.separation}%`; updatePositions(); fit(visibleMeshes);
    });
    $('show-label').addEventListener('change', () => { labelsEnabled = $('show-label').checked; $('bone-label').hidden = !labelsEnabled; updateRestoreAction(); });
    $('context-mode').addEventListener('change', refresh);
    $('clear-selection').addEventListener('click', () => {
      select(null);
      if (compact.matches) $('bone-search').focus({ preventScroll: true });
    });
    $('focus-bone').addEventListener('click', () => { if (selected) { setMode('model'); fit([selected.mesh]); } });
    $('isolate-bone').addEventListener('click', () => {
      setMode('model'); isolated = isolated ? null : selected;
      if (isolated) isolated.hidden = false;
      refresh(); fit(visibleMeshes);
    });
    $('isolate-region').addEventListener('click', () => {
      if (!selected) return;
      $('bone-search').value = ''; $('side-filter').value = $('kind-filter').value = 'all';
      $('region-filter').value = selected.region;
      setMode('model'); applyFilters();
    });
    $('hide-bone').addEventListener('click', () => {
      if (!selected) return;
      if (activeSystemId === 'muscular') hideStructure(selected);
      else { selected.hidden = !selected.hidden; if (selected.hidden) isolated = null; refresh(); fit(visibleMeshes); }
    });
    $('restore-study').addEventListener('click', () => {
      dissection.reset(); dissecting = false;
      isolated = null; hovered = null; selected = null; $('explode').value = '0'; $('context-mode').checked = false;
      $('show-label').checked = labelsEnabled = true;
      $('bone-search').value = ''; $('region-filter').value = $('side-filter').value = $('kind-filter').value = 'all';
      entries.forEach(entry => { entry.hidden = false; entry.separation = 0; });
      setMode('model'); refresh(); filterList(); api.centerCamera(); fit(visibleMeshes);
    });
    const canvas = api.renderer.domElement;
    const activePointers = new Set();
    canvas.addEventListener('pointerdown', event => {
      activePointers.add(event.pointerId);
      pointerStart = activePointers.size === 1 ? { x: event.clientX, y: event.clientY, id: event.pointerId, moved: false } : null;
    });
    canvas.addEventListener('pointermove', event => {
      if (pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 6) pointerStart.moved = true;
      if (event.buttons || event.pointerType === 'touch') { hovered = null; api.requestRender(); return; }
      hovered = pick(event); canvas.style.cursor = hovered ? (dissecting ? 'crosshair' : 'pointer') : 'grab';
      api.requestRender();
    });
    canvas.addEventListener('pointerup', event => {
      activePointers.delete(event.pointerId);
      if (pointerStart && !pointerStart.moved && pointerStart.id === event.pointerId && Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)<6) {
        const entry = pick(event);
        if (dissecting) hideStructure(entry);
        else select(entry);
      }
      pointerStart = null;
    });
    canvas.addEventListener('pointercancel', event => { activePointers.delete(event.pointerId); pointerStart = null; });
    canvas.addEventListener('pointerleave', () => { hovered = null; canvas.style.cursor = 'grab'; api.requestRender(); });
    document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
      const directions = { front: [0, 0, 1], back: [0, 0, -1], right: [-1, 0, 0], left: [1, 0, 0] };
      const direction = new THREE.Vector3(...directions[button.dataset.view]);
      const distance = api.camera.position.distanceTo(api.orbitControls.target);
      api.camera.position.copy(api.orbitControls.target).addScaledVector(direction, distance); api.orbitControls.update();
    }));
    document.addEventListener('keydown', event => {
      if (!event.defaultPrevented && event.key === 'Escape' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) select(null);
    });
  }
  function update() {
    if (!api || mode === 'gallery') return;
    const entry = hovered || selected, label = $('bone-label');
    label.hidden = true;
    if (!labelsEnabled || !entry || !entry.mesh.visible) return;
    entry.mesh.localToWorld(labelPoint.copy(entry.localCenter));
    screenPoint.copy(labelPoint).project(api.camera);
    if (Math.abs(screenPoint.x)>1 || Math.abs(screenPoint.y)>1 || Math.abs(screenPoint.z)>1) return;
    label.textContent = fullName(entry); label.hidden = false;
    const rect = api.renderer.domElement.getBoundingClientRect();
    const parent = $('viewport').getBoundingClientRect();
    const x = (screenPoint.x * .5 + .5) * rect.width + 16;
    const y = (-screenPoint.y * .5 + .5) * rect.height - 16;
    label.style.left = `${rect.left - parent.left + Math.max(8, Math.min(x, rect.width - label.offsetWidth - 8))}px`;
    label.style.top = `${rect.top - parent.top + Math.max(8, Math.min(y, rect.height - label.offsetHeight - 8))}px`;
  }
  // Navigation is available before the model finishes loading, including on failures.
  function showSelectionDetails() {
    if (!selected) return;
    document.querySelector('[data-tab="explore"]').click();
    if (mobileMedia.matches && !uiEl.classList.contains('is-open')) panelToggle.click();
    requestAnimationFrame(() => {
      const panel = $('panel-body');
      const tabsHeight = document.querySelector('.tabs').getBoundingClientRect().height;
      panel.scrollTop += $('inspector').getBoundingClientRect().top - panel.getBoundingClientRect().top - tabsHeight - 12;
      $('detail-name').focus({ preventScroll: true });
    });
  }
  $('selection-shortcut').addEventListener('click', showSelectionDetails);
  document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
    if (api && button.dataset.tab === 'motion') {
      const wasGallery = mode === 'gallery';
      setMode('model');
      if (wasGallery) fit(visibleMeshes);
    }
    document.querySelectorAll('[data-tab]').forEach(tab => {
      const active = tab === button; tab.setAttribute('aria-pressed', String(active)); $(`tab-${tab.dataset.tab}`).hidden = !active;
    });
  }));
  systems.forEach(system => {
    const card = document.createElement('article'); card.className = `system-card${system.available ? ' active' : ''}`;
    const title = document.createElement('h3'); title.textContent = system.name;
    const description = document.createElement('p'); description.textContent = system.description;
    const status = document.createElement('span'); status.textContent = system.available ? 'DISPONÍVEL NESTE ATLAS' : 'EXPANSÃO PLANEJADA';
    card.append(title, description, status); $('system-list').append(card);
    if (system.available) {
      const link = document.createElement('a');
      link.className = 'systems-menu-link'; link.href = `atlas.html?system=${system.id}&view=model`;
      link.textContent = system.id === activeSystemId ? 'Sistema atual' : 'Abrir sistema ↗';
      if (system.id === activeSystemId) link.setAttribute('aria-current', 'page');
      card.append(link);
      if (system.preview) status.textContent = 'PRÉVIA · CONTEÚDO EM REVISÃO';
    }
  });
  const compact = window.matchMedia('(max-width: 1150px), (max-height: 560px) and (orientation: landscape)');
  const moveInspector = () => $(compact.matches ? 'mobile-inspector' : 'inspector-dock').append($('inspector'));
  compact.addEventListener('change', moveInspector); moveInspector();
  return { init, update, systems, isGallery: () => mode === 'gallery', centerView: () => { if (mode === 'gallery') $('specimen-gallery').scrollTo({ top: 0 }); else fit(visibleMeshes); } };
})();
