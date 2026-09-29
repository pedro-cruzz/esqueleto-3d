// Separate from the anatomy model: never selectable, counted or exploded.
window.BodyContext = (() => {
  let root = null, material = null, api = null, separated = false;
  const $ = id => document.getElementById(id);
  function sync() {
    if (!root) return;
    root.visible = $('show-body-context').checked && !separated;
    material.uniforms.opacity.value = Number($('body-context-opacity').value) / 100;
    $('body-context-value').textContent = `${$('body-context-opacity').value}%`;
    $('body-context-opacity').disabled = !$('show-body-context').checked;
    $('body-context-note').textContent = separated
      ? 'Silhueta pausada enquanto as estruturas estão afastadas.'
      : 'Silhueta ilustrativa · proporções aproximadas. Não representa a pele do modelo anatômico.';
    api.requestRender();
  }
  function init(context) {
    api = context;
    $('body-context-controls').hidden = false;
    $('show-body-context').disabled = true;
    $('body-context-opacity').disabled = true;
    $('body-context-note').textContent = 'Carregando referência corporal…';
    new THREE.GLTFLoader().load('public/models/body-context.glb', gltf => {
      root = gltf.scene;
      root.name = 'BodyContext';
      // frameModel has translated the organs as a whole. Copy that transform,
      // not a bounding-box fit (which would distort relative anatomical position).
      context.model.updateMatrixWorld(true);
      root.matrixAutoUpdate = false;
      root.matrix.copy(context.model.matrixWorld);
      material = new THREE.ShaderMaterial({
        uniforms: { opacity: { value: .24 }, tint: { value: new THREE.Color(0xb9c9c0) } },
        vertexShader: 'varying vec3 n; varying vec3 v; void main(){ vec4 p=modelViewMatrix*vec4(position,1.0); n=normalize(normalMatrix*normal); v=-p.xyz; gl_Position=projectionMatrix*p; }',
        fragmentShader: 'uniform float opacity; uniform vec3 tint; varying vec3 n; varying vec3 v; void main(){ float rim=pow(1.0-abs(dot(normalize(n),normalize(v))),2.0); gl_FragColor=vec4(tint,opacity*(0.10+0.90*rim)); }',
        transparent: true, depthWrite: false, side: THREE.FrontSide,
      });
      root.traverse(mesh => {
        if (!mesh.isMesh) return;
        mesh.material = material; mesh.raycast = () => {};
        mesh.castShadow = mesh.receiveShadow = false;
      });
      context.scene.add(root);
      $('show-body-context').disabled = false;
      sync();
      context.onReady();
    }, undefined, error => {
      console.warn('Referência corporal indisponível:', error);
      $('show-body-context').checked = false;
      $('body-context-note').textContent = 'Silhueta indisponível. Recarregue para tentar novamente. Os órgãos continuam acessíveis.';
    });
    $('show-body-context').addEventListener('change', () => { sync(); context.onReady(); });
    $('body-context-opacity').addEventListener('input', sync);
  }
  return { init, object: () => root?.visible ? root : null,
    setSeparated(value) { if (separated !== value) { separated = value; sync(); } },
  };
})();
