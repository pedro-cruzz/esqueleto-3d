// Reproducible static study plate, rendered from the shipped anatomical GLB.
// Uses the local Draco decoder, Three.js matrix math and Pillow for WebP encoding.
// No browser, graphics driver, external service or generated anatomy is involved.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const THREE = require('three');
const Draco = require('../public/draco/draco_decoder.js');
const root = path.resolve(__dirname, '..');

async function main() {
  const data = fs.readFileSync(path.join(root, 'public/models/esqueleto-anatomico.glb'));
  const jsonLength = data.readUInt32LE(12);
  const gltf = JSON.parse(data.subarray(20, 20 + jsonLength));
  const bin = data.subarray(28 + jsonLength);
  // This legacy Emscripten module is a self-resolving thenable, so wrap it
  // before awaiting to avoid native Promise assimilation repeatedly calling it.
  const { module: draco } = await new Promise(resolve => Draco({}).then(module => resolve({ module })));
  const decoder = new draco.Decoder();
  const nodes = gltf.nodes.map(node => {
    const object = new THREE.Object3D();
    if (node.matrix) new THREE.Matrix4().fromArray(node.matrix).decompose(object.position, object.quaternion, object.scale);
    else {
      if (node.translation) object.position.fromArray(node.translation);
      if (node.rotation) object.quaternion.fromArray(node.rotation);
      if (node.scale) object.scale.fromArray(node.scale);
    }
    return object;
  });
  gltf.nodes.forEach((node, i) => (node.children || []).forEach(child => nodes[i].add(nodes[child])));
  const scene = new THREE.Group();
  gltf.scenes[gltf.scene || 0].nodes.forEach(i => scene.add(nodes[i]));
  scene.rotation.y = -0.14;
  scene.updateMatrixWorld(true);
  const meshes = [];
  const point = new THREE.Vector3();
  gltf.nodes.forEach((node, nodeIndex) => {
    if (node.mesh === undefined || node.name.startsWith('Skeletal system')) return;
    for (const primitive of gltf.meshes[node.mesh].primitives) {
      const extension = primitive.extensions.KHR_draco_mesh_compression;
      const view = gltf.bufferViews[extension.bufferView];
      const compressed = bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
      const buffer = new draco.DecoderBuffer();
      buffer.Init(new Int8Array(compressed.buffer, compressed.byteOffset, compressed.byteLength), compressed.length);
      const mesh = new draco.Mesh();
      const status = decoder.DecodeBufferToMesh(buffer, mesh);
      if (!status.ok()) throw new Error(status.error_msg());
      const vertices = mesh.num_points();
      const attributes = {};
      for (const [name, id] of Object.entries(extension.attributes)) {
        const attribute = decoder.GetAttributeByUniqueId(mesh, id);
        const values = new draco.DracoFloat32Array();
        decoder.GetAttributeFloatForAllPoints(mesh, attribute, values);
        attributes[name] = Float32Array.from({ length: vertices * 3 }, (_, i) => values.GetValue(i));
        draco.destroy(values);
      }
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(nodes[nodeIndex].matrixWorld);
      for (let i = 0; i < vertices; i++) {
        point.fromArray(attributes.POSITION, i * 3).applyMatrix4(nodes[nodeIndex].matrixWorld).toArray(attributes.POSITION, i * 3);
        point.fromArray(attributes.NORMAL, i * 3).applyMatrix3(normalMatrix).normalize().toArray(attributes.NORMAL, i * 3);
      }
      const faces = new Uint32Array(mesh.num_faces() * 3);
      const face = new draco.DracoInt32Array();
      for (let i = 0; i < mesh.num_faces(); i++) {
        decoder.GetFaceFromMesh(mesh, i, face);
        for (let j = 0; j < 3; j++) faces[i * 3 + j] = face.GetValue(j);
      }
      meshes.push({ positions: attributes.POSITION, normals: attributes.NORMAL, faces });
      draco.destroy(face); draco.destroy(mesh); draco.destroy(buffer);
    }
  });
  draco.destroy(decoder);
  console.log(`Decoded ${meshes.length} anatomical meshes, ${meshes.reduce((sum, mesh) => sum + mesh.faces.length / 3, 0)} triangles.`);

  const width = 1600, height = 1800;
  const scale = 1580;
  const centerY = 1.245;
  const depth = new Float32Array(width * height).fill(-Infinity);
  const colors = new Uint8Array(width * height * 4);
  const light = new THREE.Vector3(-0.65, 0.9, 1.5).normalize();
  const lightX = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), light).normalize();
  const lightY = new THREE.Vector3().crossVectors(light, lightX).normalize();
  const shadowSize = 1400, shadowScale = 700;
  const shadow = new Float32Array(shadowSize * shadowSize).fill(-Infinity);
  const projected = meshes.map(mesh => {
    const screen = new Float32Array(mesh.positions.length);
    const lamp = new Float32Array(mesh.positions.length);
    for (let i = 0; i < mesh.positions.length; i += 3) {
      const x = mesh.positions[i], y = mesh.positions[i + 1], z = mesh.positions[i + 2];
      screen[i] = width / 2 + x * scale;
      screen[i + 1] = height / 2 - (y - centerY) * scale;
      screen[i + 2] = z;
      lamp[i] = shadowSize / 2 + (x * lightX.x + (y - 0.95) * lightX.y + z * lightX.z) * shadowScale;
      lamp[i + 1] = shadowSize / 2 - (x * lightY.x + (y - 0.95) * lightY.y + z * lightY.z) * shadowScale;
      lamp[i + 2] = x * light.x + y * light.y + z * light.z;
    }
    return { ...mesh, screen, lamp };
  });
  function raster(mesh, positions, target, w, h, shade) {
    const { faces, normals, lamp } = mesh;
    for (let f = 0; f < faces.length; f += 3) {
      const a = faces[f] * 3, b = faces[f + 1] * 3, c = faces[f + 2] * 3;
      const ax = positions[a], ay = positions[a + 1], bx = positions[b], by = positions[b + 1], cx = positions[c], cy = positions[c + 1];
      const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx))), maxX = Math.min(w - 1, Math.ceil(Math.max(ax, bx, cx)));
      const minY = Math.max(0, Math.floor(Math.min(ay, by, cy))), maxY = Math.min(h - 1, Math.ceil(Math.max(ay, by, cy)));
      const denominator = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      if (Math.abs(denominator) < 0.00001) continue;
      const az = positions[a + 2], bz = positions[b + 2], cz = positions[c + 2];
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        const u = ((by - cy) * (x + 0.5 - cx) + (cx - bx) * (y + 0.5 - cy)) / denominator;
        const v = ((cy - ay) * (x + 0.5 - cx) + (ax - cx) * (y + 0.5 - cy)) / denominator;
        const t = 1 - u - v;
        if (u < 0 || v < 0 || t < 0) continue;
        const z = u * az + v * bz + t * cz, pixel = y * w + x;
        if (z <= target[pixel]) continue;
        target[pixel] = z;
        if (!shade) continue;
        let nx = u * normals[a] + v * normals[b] + t * normals[c];
        let ny = u * normals[a + 1] + v * normals[b + 1] + t * normals[c + 1];
        let nz = u * normals[a + 2] + v * normals[b + 2] + t * normals[c + 2];
        const length = Math.hypot(nx, ny, nz) || 1;
        nx /= length; ny /= length; nz /= length;
        const sx = Math.round(u * lamp[a] + v * lamp[b] + t * lamp[c]);
        const sy = Math.round(u * lamp[a + 1] + v * lamp[b + 1] + t * lamp[c + 1]);
        const sz = u * lamp[a + 2] + v * lamp[b + 2] + t * lamp[c + 2];
        let visible = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const sample = shadow[(sy + dy) * shadowSize + sx + dx];
          visible += sample === undefined || sz + 0.0018 >= sample ? 1 : 0;
        }
        const diffuse = Math.max(0, nx * light.x + ny * light.y + nz * light.z);
        const fill = Math.max(0, nx * 0.6 + ny * 0.1 + nz * 0.25);
        const rim = Math.pow(Math.max(0, 1 - Math.abs(nz)), 3) * 0.12;
        const luminance = 0.20 + 0.10 * Math.max(0, ny) + diffuse * (0.24 + 0.64 * visible / 9) + fill * 0.14 + rim;
        const intensity = Math.min(1.0, Math.pow(luminance, 0.85));
        const out = pixel * 4;
        colors[out] = Math.round(244 * intensity);
        colors[out + 1] = Math.round(232 * intensity);
        colors[out + 2] = Math.round(211 * intensity);
        colors[out + 3] = 255;
      }
    }
  }
  for (const mesh of projected) raster(mesh, mesh.lamp, shadow, shadowSize, shadowSize, false);
  for (const mesh of projected) raster(mesh, mesh.screen, depth, width, height, true);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'pose-lab-render-'));
  const raw = path.join(temp, 'render.rgba');
  fs.writeFileSync(raw, colors);
  const output = path.join(root, 'public/images/skeleton-study.webp');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const bundledPython = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3');
  const python = process.env.POSE_LAB_PYTHON || (fs.existsSync(bundledPython) ? bundledPython : 'python3');
  execFileSync(python, ['-c', 'from PIL import Image; import sys; im=Image.frombytes("RGBA",(1600,1800),open(sys.argv[1],"rb").read()); im.resize((800,900),Image.Resampling.LANCZOS).save(sys.argv[2],"WEBP",quality=92,method=6)', raw, output]);
  fs.rmSync(temp, { recursive: true });
  console.log(`${output}: ${fs.statSync(output).size} bytes`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
