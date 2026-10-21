import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {softBoxGeometry,furnitureBuilder,isolateFurnitureMaterials,applyFurnitureColours} from '../dist/furniture-models.js';
import {validateDesign,designFingerprint} from '../dist/design-format.js';
import {SharedDesignSession} from '../dist/shared-session.js';
const material=()=>new THREE.MeshStandardMaterial({color:'#b6b1a4'});
const builder=furnitureBuilder(Object.fromEntries(['wood','cloth','linen','blanket','metal','seam'].map(k=>[k,material()])));
for(const [w,h,d,r] of [[2.3,.19,.83,.045],[.40,.055,.38,.025],[1.6,.24,2,.07]]){
 const geo=softBoxGeometry(w,h,d,r);geo.computeBoundingBox();const size=geo.boundingBox.getSize(new THREE.Vector3());for(const [actual,expected] of [[size.x,w],[size.y,h],[size.z,d]])assert.ok(Math.abs(actual-expected)<1e-6);for(const n of geo.attributes.normal.array)assert(Number.isFinite(n));assert(geo.attributes.position.count<1000);}
const chair1=builder.chair(),chair2=builder.chair(),parts1=isolateFurnitureMaterials(chair1),parts2=isolateFurnitureMaterials(chair2),before=parts2.upholstery[0].material.color.getHexString();
applyFurnitureColours(parts1,{upholstery:'#bd8065'});assert.equal(parts1.upholstery[0].material.color.getHexString(),'bd8065');assert.equal(parts2.upholstery[0].material.color.getHexString(),before);assert.notEqual(parts1.upholstery[0].material,parts2.upholstery[0].material);
applyFurnitureColours(parts1);assert.equal(parts1.upholstery[0].material.color.getHexString(),before);
for(const object of [builder.sofa(2.35),builder.sofa(.82),builder.bed(1.6,2),builder.table(1,2.4,.74),builder.coffee(),builder.wardrobe(2,.6)]){const parts=isolateFurnitureMaterials(object);assert(Object.keys(parts).length>0);const bounds=new THREE.Box3().setFromObject(object);assert(bounds.min.y>=-.001);assert(bounds.max.y<2.71);object.traverse(mesh=>{if(mesh.isMesh){assert(mesh.castShadow);assert(mesh.receiveShadow);}});}
const spec={surfaces:['floor'],finishes:['oak'],furnitureIds:['chair-1','chair-2']};
const old={format:'ivry-design',version:1,units:'metres',materials:{floor:{finish:'oak',tint:'#ffffff',roughness:.7,scale:1}},textures:{},furniture:[{id:'chair-1',x:1,z:1,angle:0},{id:'chair-2',x:2,z:2,angle:0}],ceilings:{box:2.9,main:4}};
assert.deepEqual(validateDesign(old,spec),old);
const design={...old,furnitureColours:{'chair-1':{wood:'#bb956a',upholstery:'#bd8065'}}};assert.deepEqual(validateDesign(JSON.parse(JSON.stringify(design)),spec),design);assert.notEqual(designFingerprint(old),designFingerprint(design));
for(const bad of [{unknown:{wood:'#ffffff'}},{'chair-1':{wood:'red'}},{'chair-1':{fake:'#ffffff'}}])assert.throws(()=>validateDesign({...old,furnitureColours:bad},spec));
let local=design,received=old,remote={revision:1,payload:old};const read=async()=>structuredClone(remote),write=async(expected,payload)=>{assert.equal(expected,remote.revision);remote={revision:expected+1,payload};return remote;};
const a=new SharedDesignSession({read,write,capture:()=>local,apply:async d=>local=d,fingerprint:designFingerprint});a.revision=1;await a.save();const b=new SharedDesignSession({read,write,capture:()=>received,apply:async d=>received=validateDesign(d,spec),fingerprint:designFingerprint});await b.initialize();assert.deepEqual(received.furnitureColours,design.furnitureColours);
console.log('PASS: bounded rounded furniture, isolated per-piece colours, restore, old design compatibility, export and shared colour saves');

let keyboard,moves=0,prevented=0;const keyContext={window:{addEventListener:(_,handler)=>keyboard=handler},document:{activeElement:{tagName:'BUTTON'}},selectedFurniture:{},furnitureDrag:null,walkthrough:{active:true},moveSelected:()=>moves++,selectFurniture:()=>{},rotateSelected:()=>moves++};vm.createContext(keyContext);const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');vm.runInContext(app.split('\n').find(line=>line.startsWith("window.addEventListener('keydown',event=>")),keyContext);keyboard({key:'ArrowLeft',preventDefault:()=>prevented++});assert.equal(moves,0,'Walkthrough arrow keys must not move selected furniture');keyboard({key:'Escape',preventDefault:()=>prevented++});assert.equal(prevented,1,'Escape deselects before walkthrough exits');keyContext.walkthrough.active=false;keyboard({key:'ArrowLeft',preventDefault:()=>prevented++});assert.equal(moves,1,'Arrow movement stays available outside walkthrough');
