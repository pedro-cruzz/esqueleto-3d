// Illustrative mannequin, not anatomical surface data. Coordinates are metres
// in the same Y-up frame as the Z-Anatomy visceral model. No organ is modified.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const THREE = require('three');
vm.runInNewContext(fs.readFileSync(require.resolve('three/examples/js/objects/MarchingCubes.js'), 'utf8'), { THREE });
const resolution = 80;
const field = new THREE.MarchingCubes(resolution, new THREE.MeshBasicMaterial());
field.isolation = 0;
const forms = [
  // center xyz, radii xyz: torso, waist, pelvis, neck and head
  [0,1.30,.015,.175,.185,.128], [0,1.12,.015,.139,.155,.113],
  [0,.945,.004,.151,.135,.115], [0,1.475,.002,.048,.075,.05],
  [0,1.611,.007,.079,.115,.092],
];
const limbs = [];
for (const side of [-1,1]) {
  forms.push([side*.17,1.365,0,.061,.071,.069]);
  limbs.push([[side*.184,1.353,0],[side*.258,1.092,-.009],.049,.034]);
  limbs.push([[side*.258,1.092,-.009],[side*.313,.906,.002],.035,.024]);
  forms.push([side*.323,.849,.004,.035,.075,.023]);
  limbs.push([[side*.083,.889,0],[side*.083,.455,-.017],.077,.046]);
  limbs.push([[side*.083,.455,-.017],[side*.079,.102,-.02],.052,.028]);
  forms.push([side*.079,.055,.048,.045,.043,.12]);
}
function smoothMin(a,b,k=.025) {
  const h = Math.max(k - Math.abs(a-b),0)/k;
  return Math.min(a,b) - h*h*k*.25;
}
function distance(x,y,z) {
  let d = 10;
  for (const [cx,cy,cz,rx,ry,rz] of forms) {
    const q = Math.sqrt(((x-cx)/rx)**2+((y-cy)/ry)**2+((z-cz)/rz)**2);
    d = smoothMin(d, (q-1)*Math.min(rx,ry,rz));
  }
  for (const [a,b,r0,r1] of limbs) {
    const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];
    const t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy+(z-a[2])*dz)/(dx*dx+dy*dy+dz*dz)));
    d=smoothMin(d,Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy,z-a[2]-t*dz)-(r0+(r1-r0)*t));
  }
  return d;
}
// Sample an anisotropic grid, then put the extracted vertices back in metres.
const scale = [.46,.92,.25], center = [0,.87,.015];
for(let z=0;z<resolution;z++) for(let y=0;y<resolution;y++) for(let x=0;x<resolution;x++) {
  field.field[x+y*resolution+z*resolution*resolution] = -distance(
    (x/resolution*2-1)*scale[0]+center[0],
    (y/resolution*2-1)*scale[1]+center[1],
    (z/resolution*2-1)*scale[2]+center[2]);
}
const geometry = field.generateBufferGeometry();
geometry.scale(...scale); geometry.translate(...center); geometry.computeBoundingBox();
const positions=geometry.attributes.position, normals=geometry.attributes.normal;
const positionBytes=Buffer.from(positions.array.buffer), normalBytes=Buffer.from(normals.array.buffer);
const binary=Buffer.concat([positionBytes,normalBytes]);
const gltf={asset:{version:'2.0',generator:'Pose Lab illustrative body context'},scene:0,scenes:[{nodes:[0]}],
  nodes:[{name:'Illustrative body envelope',mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0,NORMAL:1}}]}],
  buffers:[{byteLength:binary.length}],bufferViews:[{buffer:0,byteOffset:0,byteLength:positionBytes.length,target:34962},{buffer:0,byteOffset:positionBytes.length,byteLength:normalBytes.length,target:34962}],
  accessors:[{bufferView:0,componentType:5126,count:positions.count,type:'VEC3',min:geometry.boundingBox.min.toArray(),max:geometry.boundingBox.max.toArray()},{bufferView:1,componentType:5126,count:normals.count,type:'VEC3'}]};
let json=Buffer.from(JSON.stringify(gltf));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+binary.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(binary.length,0);binHeader.writeUInt32LE(0x004e4942,4);
fs.writeFileSync(path.join(__dirname,'../public/models/body-context.glb'),Buffer.concat([header,json,binHeader,binary]));
console.log(`Illustrative body: ${positions.count/3} triangles, ${Math.round(binary.length/1024)} KiB`);
