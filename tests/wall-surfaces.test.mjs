import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../dist/vendor/three.module.js';
import {configureTiles,TILE_SIZE,GROUT_SIZE} from '../dist/surface-materials.js';
import {validateDesign,resolveDesignTexture,designFingerprint} from '../dist/design-format.js';
import {SharedDesignSession} from '../dist/shared-session.js';

const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const walls=[],architecture=new THREE.Group(),materials={},surfaceAliases={};
const context=vm.createContext({THREE,architecture,walls,mainH:4,mats:{walls:new THREE.MeshStandardMaterial()},white:new THREE.MeshStandardMaterial(),glass:new THREE.MeshStandardMaterial(),surfaceAliases,
addSurface(key){const material=new THREE.MeshStandardMaterial();material.userData.surfaceKey=key;materials[key]=material;return material;}});
vm.runInContext(app.slice(app.indexOf('function box('),app.indexOf('function cyl(')),context);
vm.runInContext(app.slice(app.indexOf('const anchors='),app.indexOf('const footprint=')),context);
vm.runInContext(app.slice(app.indexOf('function applyWallCut('),app.indexOf('// Exterior:')),context);
context.w(420.5,710,420.5,1049,.07);
const partition=walls[0],solid=partition.parts[0].mesh;
assert.notEqual(solid.material[4],solid.material[5],'opposite room faces must be independent');
solid.material[4].color.set('#cc7744');
assert.equal(solid.material[5].color.getHexString(),'ffffff');
// Full corridor is split at room boundaries while retaining full-size door openings.
context.w(151,710,927.5,710,.07,4,[{at:2,width:.8,height:2.2},{at:4.7,width:1,height:2.2}]);
assert.ok(walls.length>3);
for(const wall of walls){context.applyWallCut(wall,4,.5);for(const part of wall.parts){if(part.bottom>=2.2)assert.equal(part.mesh.visible,false);assert.ok(part.mesh.scale.y>=0);}}
assert.equal(new Set(Object.keys(materials)).size,Object.keys(materials).length);
for(const axis of ['x','z','floor']){const material=new THREE.MeshStandardMaterial();configureTiles(material,axis);const shader={vertexShader:'#include <worldpos_vertex>',fragmentShader:'#include <map_fragment>'};material.onBeforeCompile(shader);assert.match(shader.vertexShader,/modelMatrix\*vec4\(transformed/);assert.match(shader.fragmentShader,/fwidth/);assert.ok(shader.fragmentShader.includes(String(TILE_SIZE+GROUT_SIZE)));assert.match(material.customProgramCacheKey(),new RegExp(axis+'$'));}
assert.equal(TILE_SIZE,.05);assert.equal(GROUT_SIZE,.002);

const finish={finish:'chalk',tint:'#ffffff',roughness:.65,scale:1};
const legacy={format:'ivry-design',version:1,units:'metres',materials:{walls:{...finish,tint:'#abcdef'}},textures:{walls:'data:image/png;base64,'+'a'.repeat(100000)},furniture:[],ceilings:{box:2.9,main:4}};
const keys=Array.from({length:100},(_,i)=>'wall-'+i);
const spec={surfaces:['walls','sdb-east','sdb-floor','sde-floor',...keys],surfaceDefaults:Object.fromEntries(['sdb-east','sdb-floor','sde-floor'].map(key=>[key,finish])),surfaceParents:Object.fromEntries(keys.map(key=>[key,'walls'])),finishes:['chalk','sage','paint'],furnitureIds:[]};
const migrated=validateDesign(legacy,spec);
assert.equal(migrated.materials['wall-0'].tint,'#abcdef');
assert.equal(migrated.textures['wall-99'],'@walls');
assert.equal(resolveDesignTexture(migrated.textures,'wall-99'),legacy.textures.walls);
assert.ok(JSON.stringify(migrated).length<150000,'migration must not multiply texture size');
assert.deepEqual(validateDesign(JSON.parse(JSON.stringify(migrated)),spec),migrated);
const missing=structuredClone(legacy);delete missing.materials.walls;assert.throws(()=>validateDesign(missing,spec));
const cyclic=structuredClone(migrated);cyclic.textures['wall-0']='@wall-1';cyclic.textures['wall-1']='@wall-0';assert.throws(()=>validateDesign(cyclic,spec),/Cyclic/);
const broken=structuredClone(migrated);broken.textures['wall-0']='@sdb-floor';assert.throws(()=>validateDesign(broken,spec),/Missing/);
const edited=structuredClone(migrated);edited.materials['sdb-east']={...finish,finish:'sage'};edited.materials['sdb-floor']={...finish,finish:'paint',tint:'#445566'};
assert.notEqual(designFingerprint(edited),designFingerprint(migrated));
assert.equal(edited.materials['sde-floor'].tint,'#ffffff');
assert.deepEqual(validateDesign(JSON.parse(JSON.stringify(edited)),spec),edited);
let remote={revision:1,payload:migrated},local=edited,other=migrated;
const read=async()=>structuredClone(remote),write=async(revision,payload)=>{assert.equal(revision,remote.revision);remote={revision:revision+1,payload:structuredClone(payload)};return remote;};
const a=new SharedDesignSession({read,write,capture:()=>local,apply:async d=>local=validateDesign(d,spec),fingerprint:designFingerprint});
a.revision=1;await a.save();
const b=new SharedDesignSession({read,write,capture:()=>other,apply:async d=>other=validateDesign(d,spec),fingerprint:designFingerprint});
await b.initialize();assert.deepEqual(other,edited);
console.log('PASS: independent wall faces, door cutaways, metric tiles, legacy migration, texture references, export and shared colour round-trip');
