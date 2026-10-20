import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../dist/vendor/three.module.js';
class Element {
 constructor(){this.children=[];this.dataset={};this.style={};this.listeners={};this.classList={add(){},remove(){}};this.offsetWidth=100;}
 append(...items){this.children.push(...items)} setAttribute(){} focus(){} closest(){return null} contains(t){return this.children.includes(t)}
 addEventListener(name,fn){(this.listeners[name]??=[]).push(fn)} setPointerCapture(id){this.pointer=id} hasPointerCapture(id){return this.pointer===id} releasePointerCapture(){this.pointer=null}
 getBoundingClientRect(){return {width:800,height:600}}
}
const context={THREE,document:{createElement:()=>new Element(),querySelector:()=>null},window:new Element(),matchMedia:()=>({matches:true})};vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('../dist/walkthrough.js',import.meta.url),'utf8').replace(/^import .*;\n/,'').replaceAll('export ',''),context);
const direction=context.walkDirection(0,0);assert.equal(direction.z,-1);assert.equal(direction.x,0);
assert.equal(context.turnHead(0,0,0,10000).pitch,1.25);assert.equal(context.turnHead(0,0,0,-10000).pitch,-1.25);
assert(context.isWalkClick(6));assert(!context.isWalkClick(7));
const viewport=new Element(),canvas=new Element(),camera=new THREE.PerspectiveCamera(74,4/3,.04,180),furniture=new THREE.Group();let entered=0,exited=0,notifications=0;
const tour=context.createWalkthrough({camera,canvas,viewport,architecture:new THREE.Group(),furniture,points:[{id:'a',label:'Room A',x:1,z:1},{id:'b',label:'Room B',x:4,z:4}],onEnter:()=>entered++,onExit:()=>exited++,notify:()=>notifications++});
tour.start();assert(tour.active);assert.equal(entered,1);assert.equal(camera.position.y,1.65);const position=camera.position.clone(),quaternion=camera.quaternion.clone();
const event=(x,y)=>({target:canvas,pointerId:1,button:0,clientX:x,clientY:y,preventDefault(){},stopImmediatePropagation(){}});
viewport.listeners.pointerdown[0](event(100,100));viewport.listeners.pointermove[0](event(250,200));viewport.listeners.pointerup[0](event(250,200));tour.update(1000);
assert(camera.position.equals(position),'Looking around must never orbit or translate');assert(!camera.quaternion.equals(quaternion),'Dragging must turn the head');
const panel=viewport.children[1],menu=panel.children[1].children[0];menu.value='b';menu.onchange();assert.equal(camera.position.x,4);assert.equal(camera.position.z,4);assert.equal(camera.position.y,1.65);
const obstruction=new THREE.Mesh(new THREE.BoxGeometry(1,1,1));obstruction.position.set(1,.5,1);furniture.add(obstruction);menu.value='a';menu.onchange();assert.equal(camera.position.x,4,'Do not jump into furniture');assert.equal(notifications,1);
tour.zoom(.001);assert.equal(camera.fov,45);tour.zoom(100);assert.equal(camera.fov,85);tour.exit();assert(!tour.active);assert.equal(exited,1);
console.log('PASS: fixed eye-level look, click threshold, pitch/FOV limits, room jumps, furniture obstruction and exit');

const sampled=context.buildWalkPoints([{id:'room',label:'Room',x:0,z:0}],[{id:'hall',destination:'room',path:[[0,0],[2,0],[2,2]]}],.5);
assert.equal(sampled.length,9,'Half-metre spacing follows both legs of the route');
assert.equal(sampled.filter(p=>!p.route).length,1,'Room menu retains only named destinations');
for(let i=1;i<sampled.length;i++){assert(Math.hypot(sampled[i].x-sampled[i-1].x,sampled[i].z-sampled[i-1].z)<=.50001);assert.equal(sampled[i].destination,'room');}
assert.equal(new Set(sampled.map(p=>p.x+','+p.z)).size,sampled.length,'Shared route endpoints are not duplicated');
