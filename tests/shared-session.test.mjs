import assert from 'node:assert/strict';
import {SharedDesignSession} from '../dist/shared-session.js';
let shared={revision:0,payload:null};
const write=async(expected,payload)=>{if(expected!==shared.revision){const error=new Error('newer revision');error.code='40001';throw error;}shared={revision:shared.revision+1,payload:structuredClone(payload)};return structuredClone(shared);};
function client(value){let local={value};const session=new SharedDesignSession({read:async()=>structuredClone(shared),write,capture:()=>structuredClone(local),apply:async value=>{local=structuredClone(value)},fingerprint:JSON.stringify});return{session,edit(value){local={value};session.changed()},get value(){return local.value}};}
const a=client('first'),b=client('second');await a.session.initialize({hasDraft:false});assert(await a.session.save());await b.session.initialize({hasDraft:false});assert.equal(b.value,'first');
a.edit('A changes');b.edit('B changes');assert(await a.session.save());assert.equal(await b.session.save(),false);assert.equal(b.session.conflict,true);assert.equal(b.value,'B changes');assert.equal(shared.payload.value,'A changes');
assert(await b.session.save({replaceLatest:true}));assert.equal(shared.payload.value,'B changes');await a.session.refresh();assert.equal(a.value,'B changes');
a.edit('local offline');a.session.read=async()=>{throw new Error('Offline')};assert.equal(await a.session.refresh(),false);assert.equal(a.value,'local offline');
const c=client('recovered local');await c.session.initialize({hasDraft:true,base:null});assert.equal(c.session.conflict,true);assert.equal(c.value,'recovered local');
// Edits made while a save request is in flight remain dirty after that request completes.
const d=client('before request');await d.session.initialize({hasDraft:false});d.edit('sent');let unblock;d.session.write=async(rev,payload)=>{await new Promise(resolve=>unblock=resolve);return write(rev,payload)};const pending=d.session.save();d.edit('during request');unblock();assert(await pending);assert.equal(d.session.dirty,true);assert.equal(d.value,'during request');
console.log('PASS: shared load/save, competing edits, explicit replacement, offline draft recovery, and edits during save');

// Polling an unchanged revision must preserve selection, undo history and textures.
const e=client('fresh');await e.session.initialize({hasDraft:false});let applied=0;e.session.apply=async()=>{applied++};await e.session.refresh();assert.equal(applied,0);
