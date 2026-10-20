import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../dist/vendor/three.module.js';
const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const material=new THREE.MeshBasicMaterial();
const context={THREE,furn:new THREE.Group(),walls:[],mats:{joinery:material},dark:material,basic:()=>material,rand:()=>.5,
box(parent,x,y,z,w,h,d,mat){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y+h/2,z);parent.add(mesh);return mesh;}};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('const anchors='),source.indexOf('const footprint=')),context);
vm.runInContext(source.slice(source.indexOf('function applyWallCut'),source.indexOf('function wall(')),context);
vm.runInContext(source.slice(source.indexOf('const boxFurn='),source.indexOf('function wardrobe')),context);
const sections=context.walls;
assert.equal(sections.length,2);
for(const height of [2.4,2.9,3.4,2.9])for(const section of sections){
 context.applyWallCut(section,height,height);
 const bounds=new THREE.Box3().setFromObject(section.g);
 assert(Math.abs(bounds.max.y-height)<1e-6,'Furniture meets ceiling at every supported height');
 assert(Math.abs(bounds.min.y)<1e-6,'Furniture stays on the floor');
 for(const part of section.parts.filter(p=>p.topAnchored))assert(Math.abs(part.mesh.scale.y-1)<1e-6,'Top panels move without thickening');
 context.applyWallCut(section,height,.1);
 assert(new THREE.Box3().setFromObject(section.g.children.find(m=>m.visible)).max.y<=.100001,'Cutaway trims furniture');
}
for(const section of sections)context.applyWallCut(section,2.9,2.9);
const cabinetBounds=new THREE.Box3().setFromObject(sections[0].g),shelfBounds=new THREE.Box3().setFromObject(sections[1].g);
assert(Math.abs(shelfBounds.max.x-cabinetBounds.min.x)<1e-6,'Bookcase meets cupboard without a gap');
assert(Math.abs(shelfBounds.max.z-cabinetBounds.max.z)<1e-6,'Both furniture faces terminate flush');
assert(Math.abs(cabinetBounds.min.x-vm.runInContext('X(1076)+.035',context))<1e-6,'Cupboard touches white wall');
assert(Math.abs(shelfBounds.min.z-vm.runInContext('Z(576)+.035',context))<1e-6,'Bookcase touches white wall');
console.log('PASS: flush corner, wall contact, full-height resizing, fixed panel thickness, and cutaway');
