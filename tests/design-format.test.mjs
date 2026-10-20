import assert from 'node:assert/strict';
import {validateDesign,designFingerprint} from '../dist/design-format.js';
const spec={surfaces:['floor'],finishes:['oak'],furnitureIds:['sofa','chair']};
const example={format:'ivry-design',version:1,units:'metres',materials:{floor:{finish:'oak',tint:'#12abef',roughness:.65,scale:2}},textures:{floor:'data:image/png;base64,aGVsbG8='},furniture:[{id:'sofa',x:4.2,z:6.1,angle:Math.PI/2},{id:'chair',x:5,z:2,angle:0}],ceilings:{box:3.1,main:4.2}};
assert.deepEqual(validateDesign(JSON.parse(JSON.stringify(example)),spec),example);
assert.equal(designFingerprint(example),designFingerprint({...example,savedAt:'later'}));
for(const mutate of [d=>d.version=2,d=>d.furniture[1].id='sofa',d=>d.furniture[0].x=Infinity,d=>d.ceilings.box=50,d=>d.materials.floor.tint='<script>',d=>d.textures.floor='https://example.com/texture.png',d=>d.furniture.pop()]){const d=structuredClone(example);mutate(d);assert.throws(()=>validateDesign(d,spec));}
console.log('PASS: complete design round-trip and rejection of malformed/unsupported imports');
