/* One reusable renderer creates lazy thumbnails; never one WebGL context per card. */
window.SpecimenGallery = (() => {
  let renderer, scene, camera, material, observer, pending = [], scheduled = false, ready = false;
  function init(entries, onStudy) {
    const list = document.getElementById('specimen-list');
    observer = new IntersectionObserver(records => {
      records.forEach(record => {
        if (!record.isIntersecting) return;
        const entry = entries.find(item => item.card === record.target);
        if (entry && !entry.thumbnailQueued) { entry.thumbnailQueued = true; pending.push(entry); }
      });
      schedule();
    }, { root: document.getElementById('specimen-gallery'), rootMargin: '180px' });
    entries.forEach(entry => {
      const card = document.createElement('button'); card.type = 'button'; card.className = 'specimen-card';
      card.dataset.structureId = entry.id; card.setAttribute('aria-label', `Estudar ${entry.displayName} em 3D`);
      const preview = document.createElement('div'); preview.className = 'specimen-preview';
      const placeholder = document.createElement('span'); placeholder.textContent = 'Preparando peça…'; preview.append(placeholder);
      const body = document.createElement('div'); body.className = 'specimen-caption';
      const name = document.createElement('strong'); name.textContent = entry.displayName;
      const detail = document.createElement('span'); detail.textContent = `${entry.region} · ${entry.kind}`;
      const action = document.createElement('span'); action.className = 'specimen-action'; action.textContent = 'Estudar em 3D ↗';
      body.append(name, detail, action); card.append(preview, body);
      card.addEventListener('click', () => onStudy(entry));
      entry.card = card; entry.preview = preview;
      list.append(card); observer.observe(card);
    });
  }
  function setupRenderer() {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(360, 260); renderer.setPixelRatio(1);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(38, 360 / 260, 0.00001, 100);
    scene.add(new THREE.HemisphereLight(0xf7f3e6, 0x324653, 1.2));
    const key = new THREE.DirectionalLight(0xffffff, 1.8); key.position.set(2, 4, 5); scene.add(key);
    const fill = new THREE.DirectionalLight(0x93d6ba, .4); fill.position.set(-3, 1, -2); scene.add(fill);
    material = new THREE.MeshStandardMaterial({ color: 0xe3d9c2, roughness: .7 });
    ready = true;
  }
  function schedule() {
    if (scheduled || !pending.length) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      if (document.getElementById('specimen-gallery').hidden) return;
      const entry = pending.shift();
      try {
        if (!ready) setupRenderer();
        material.color.copy(entry.baseColor);
        material.side = entry.mesh.material.side;
        const mesh = new THREE.Mesh(entry.mesh.geometry, material);
        mesh.quaternion.copy(entry.previewQuaternion); mesh.scale.copy(entry.previewScale);
        scene.add(mesh); mesh.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(mesh);
        mesh.position.sub(bounds.getCenter(new THREE.Vector3())); mesh.updateMatrixWorld(true);
        const size = bounds.getSize(new THREE.Vector3());
        const distance = Math.max(size.y, size.x / camera.aspect, .0001) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) * 1.3 + size.z / 2;
        camera.position.set(0, 0, distance); camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
        const image = document.createElement('img'); image.alt = entry.displayName; image.width = 360; image.height = 260;
        image.src = renderer.domElement.toDataURL('image/webp', .86);
        entry.preview.replaceChildren(image); scene.remove(mesh);
      } catch (error) {
        entry.preview.textContent = 'Abrir peça no visualizador 3D';
        console.warn('Prévia da estrutura indisponível:', error);
      }
      schedule();
    });
  }
  function filter(entries) {
    let count = 0;
    entries.forEach(entry => { entry.card.hidden = !entry.matches; if (entry.matches) count++; });
    document.getElementById('gallery-count').textContent = `${count} peças separadas`;
    document.getElementById('gallery-empty').hidden = count > 0;
    schedule();
  }
  return { init, filter, resume: schedule };
})();
