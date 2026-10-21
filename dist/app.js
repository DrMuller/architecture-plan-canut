import {createFurnitureMaterials,furnitureBuilder,isolateFurnitureMaterials,applyFurnitureColours} from './furniture-models.js?v=e27026fc65f2';
import {nextSurfaceSelection,rememberColour,selectionGeometry} from './surface-editor.js?v=e27026fc65f2';
import {configureTiles} from './surface-materials.js?v=e27026fc65f2';
import {createWalkthrough,buildWalkPoints} from './walkthrough.js?v=e27026fc65f2';
import {DESIGN_FORMAT,MAX_DESIGN_BYTES,validateDesign,designFingerprint,resolveDesignTexture} from './design-format.js?v=e27026fc65f2';
import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
const $=id=>document.getElementById(id), wrap=$('canvas-wrap');
const scene=new THREE.Scene();scene.background=new THREE.Color('#eef0e8');
const perspective=new THREE.PerspectiveCamera(40,1,.04,180);const orthographic=new THREE.OrthographicCamera(-10,10,6.7,-6.7,.04,180);let camera=perspective;
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.10;wrap.append(renderer.domElement);
let walkthrough=null,walkReturnView='overview';
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=.35;controls.maxDistance=60;controls.maxPolarAngle=Math.PI*.49;controls.zoomSpeed=.8;controls.panSpeed=.7;
scene.add(new THREE.HemisphereLight(0xffffff,0x9b9c86,1.6));const sun=new THREE.DirectionalLight(0xfff7e4,2.8);sun.position.set(-4,18,13);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:.1,far:60});sun.shadow.bias=-.0007;sun.shadow.normalBias=.025;scene.add(sun);scene.add(sun.target);sun.target.position.set(7,0,4);
const fill=new THREE.DirectionalLight(0xe5efff,.85);fill.position.set(18,9,-5);scene.add(fill);
const catalog=[{id:'paint',name:'Custom colour',desc:'Your chosen colour',color:'#ffffff',kind:'plain'},{id:'inox',name:'Brushed stainless steel',desc:'Inox · brushed metal with a 5 mm worktop edge',color:'#bec5c8',kind:'metal'},{id:'oak',name:'Natural oak',desc:'Warm, lightly grained timber',color:'#c7a776',kind:'wood'},{id:'walnut',name:'Smoked walnut',desc:'Deep brown, open timber grain',color:'#796047',kind:'wood'},{id:'honey',name:'Honey oak',desc:'Golden timber with a warm character',color:'#b68a50',kind:'wood'},{id:'chalk',name:'Chalk white',desc:'Soft, matt mineral white',color:'#f1efe5',kind:'plain'},{id:'sage',name:'Muted sage',desc:'Quiet, earthy green',color:'#929e83',kind:'plain'},{id:'clay',name:'Clay',desc:'Warm terracotta plaster',color:'#b77d63',kind:'plain'},{id:'stone',name:'Limestone',desc:'Fine, softly mottled mineral texture',color:'#ccc8b5',kind:'stone'},{id:'charcoal',name:'Charcoal',desc:'Dark, understated stone',color:'#485654',kind:'stone'},{id:'blue',name:'Beam blue',desc:'Blue-grey, inspired by the 3D reference',color:'#7d9da5',kind:'plain'}];
const defaults={mainbeam:{finish:'walnut',tint:'#ffffff',roughness:.9,scale:1},countertop:{finish:'inox',tint:'#ffffff',roughness:.25,scale:1},floor:{finish:'oak',tint:'#ffffff',roughness:.75,scale:1},walls:{finish:'chalk',tint:'#ffffff',roughness:.9,scale:1},joinery:{finish:'oak',tint:'#ffffff',roughness:.75,scale:1},beams:{finish:'walnut',tint:'#ffffff',roughness:.9,scale:1},stone:{finish:'stone',tint:'#ffffff',roughness:.8,scale:1},ceiling:{finish:'chalk',tint:'#ffffff',roughness:1,scale:1}};
const surfaceMeta={},surfaceParents={},surfaceAliases={};let savedFinishes={};
const furnitureParts=new Map();let furnitureColours={};
let state=structuredClone(defaults);try{const saved=savedFinishes=JSON.parse(localStorage.getItem('ivry-finishes-v1'));if(saved)for(const k in defaults)if(saved[k]&&catalog.some(f=>f.id===saved[k].finish))state[k]={...defaults[k],...saved[k]};}catch{}
let recentColours=[];try{const saved=JSON.parse(localStorage.getItem('ivry-recent-colours-v1'));if(Array.isArray(saved))recentColours=saved.filter(c=>/^#[0-9a-f]{6}$/i.test(c)).slice(0,12);}catch{}
const selectedSurfaces=new Set(),surfaceOverlays=[];
const mats={},customTextures={};const basic=(color,roughness=.8)=>new THREE.MeshStandardMaterial({color,roughness});
let seed=1234;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
function texture(f){const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');ctx.fillStyle=f.color;ctx.fillRect(0,0,512,512);seed=1267;
if(f.kind==='wood'){for(let i=0;i<12;i++){ctx.fillStyle=`rgba(${i%3?255:60},${i%3?240:40},${i%3?210:25},${.025+rand()*.08})`;ctx.fillRect(i*43,0,42,512)}for(let i=0;i<1500;i++){let x=rand()*512,y=rand()*512;ctx.strokeStyle=`rgba(69,43,20,${rand()*.14})`;ctx.lineWidth=rand()*.7+.2;ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+rand()*7,y+25,x-rand()*4,y+70,x+2,y+rand()*180);ctx.stroke()}for(let i=0;i<12;i++){ctx.fillStyle='#60422330';ctx.fillRect(i*43,0,1,512);ctx.fillRect(i*43,(i%3)*160,43,1)}}else if(f.kind==='metal'){for(let i=0;i<1500;i++){ctx.fillStyle=i%2?'#ffffff0c':'#26303808';ctx.fillRect(0,rand()*512,512,.3+rand()*.5)}}else if(f.kind==='stone'){for(let i=0;i<17000;i++){ctx.fillStyle=rand()>.5?'#ffffff18':'#292b2510';ctx.fillRect(rand()*512,rand()*512,rand()*3,rand()*3)}}
const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
// A local studio reflection map gives stainless steel a readable satin finish.
const metalEnvironment=(()=>{const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const c=canvas.getContext('2d'),gradient=c.createLinearGradient(0,0,0,256);gradient.addColorStop(0,'#eef2f5');gradient.addColorStop(.5,'#9ba6af');gradient.addColorStop(1,'#474b50');c.fillStyle=gradient;c.fillRect(0,0,512,256);c.fillStyle='#ffffff';c.fillRect(55,45,70,135);c.fillRect(340,25,100,95);const source=new THREE.CanvasTexture(canvas);source.mapping=THREE.EquirectangularReflectionMapping;source.colorSpace=THREE.SRGBColorSpace;const generator=new THREE.PMREMGenerator(renderer),result=generator.fromEquirectangular(source).texture;source.dispose();generator.dispose();return result;})();
function applyMaterial(key){const s=state[key],f=catalog.find(f=>f.id===s.finish);if(!mats[key])mats[key]=basic('#ffffff');const m=mats[key];if(m.map&&!customTextures[key])m.map.dispose();if(surfaceMeta[key]?.tile){m.map=null;m.color.set(f.color).multiply(new THREE.Color(s.tint));m.roughness=Number(s.roughness);m.metalness=0;m.envMap=null;configureTiles(m,surfaceMeta[key].axis);m.needsUpdate=true;return;}const t=customTextures[key]||texture(f);t.repeat.set(s.scale,s.scale);m.map=t;m.color.set(s.tint);if(surfaceMeta[key]&&!customTextures[key]&&s.tint!=='#ffffff'){m.map=null;t.dispose();}m.roughness=Number(s.roughness);m.metalness=f.kind==='metal'&&!customTextures[key]?1:0;m.envMap=m.metalness?metalEnvironment:null;m.envMapIntensity=1;m.needsUpdate=true;if(key==='joinery')syncFurnitureWood();}
function syncFurnitureWood(){const base=catalog.find(f=>f.id===state.joinery.finish),colour=new THREE.Color(base.color).multiply(new THREE.Color(state.joinery.tint));for(const [id,parts] of furnitureParts){for(const entry of parts.wood||[])entry.original.copy(colour);applyFurnitureColours(parts,furnitureColours[id]);}}
function addSurface(key,label,{tile=false,axis='x',parent=null,group='Individual wall faces'}={}){
surfaceMeta[key]={label,tile,axis,group,parent};if(parent)surfaceParents[key]=parent;
defaults[key]=structuredClone(tile?{finish:'chalk',tint:'#ffffff',roughness:.65,scale:1}:defaults[parent||'walls']);
const saved=savedFinishes?.[key];state[key]=structuredClone(saved&&catalog.some(f=>f.id===saved.finish)?{...defaults[key],...saved}:state[parent]||defaults[key]);
applyMaterial(key);mats[key].userData.surfaceKey=key;return mats[key];
}
for(const room of ['sdb','sde'])for(const face of ['north','east','south','west','floor'])addSurface(`${room}-${face}`,`${room==='sdb'?'Bathroom · SDB':'Shower room · SDE'} · ${face==='floor'?'floor':face+' wall'}`,{tile:true,axis:face==='floor'?'floor':['east','west'].includes(face)?'z':'x',group:room==='sdb'?'Bathroom · 5 × 5 cm tiles':'Shower room · 5 × 5 cm tiles'});
Object.keys(state).forEach(applyMaterial);
const white=basic('#eeeae0'),fabric=basic('#c9c7b9'),dark=basic('#404a45'),metal=basic('#8c9490',.3),water=basic('#d3e0de',.2),tile=basic('#e3ded1');const glass=new THREE.MeshStandardMaterial({color:'#b7d0ce',transparent:true,opacity:.2,roughness:.1,depthWrite:false});
let architecture=new THREE.Group(),furn=new THREE.Group(),roof=new THREE.Group(),boxRoof=new THREE.Group(),joists=new THREE.Group(),beam=new THREE.Group(),zones=new THREE.Group(),dims=new THREE.Group();scene.add(architecture,furn,roof,boxRoof,joists,beam,zones,dims);const walls=[],roomLabels=[],dimensionLabels=[];let mainH=4,boxH=2.9;
function box(parent,x,y,z,w,h,d,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y+h/2,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function cyl(parent,x,y,z,r,h,mat){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,40),mat);m.position.set(x,y+h/2,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
// Movable objects keep every component together and rotate about their centre.
const movableObjects=[];
const detailedFurniture=furnitureBuilder(createFurnitureMaterials());
function placeFurniture(group,parent,x,z,rotation=0){group.position.set(x,0,z);group.rotation.y=rotation;parent.add(group);return group;}
function registerFurniture(object,id,label){
object.userData.furniture={id,label,original:{x:object.position.x,z:object.position.z,angle:object.rotation.y}};
furnitureParts.set(id,isolateFurnitureMaterials(object));syncFurnitureWood();movableObjects.push(object);return object;
}
function groupFurniture(start,id,label,x,z){
const pieces=furn.children.slice(start),group=new THREE.Group();group.position.set(x,0,z);furn.add(group);
for(const piece of pieces){piece.position.x-=x;piece.position.z-=z;group.add(piece);}
return registerFurniture(group,id,label);
}
const anchors=[[151,0],[417,2.93],[424,3],[666,5.72],[673,5.79],[924,8.55],[931,8.62],[1386,13.745],[1413,14.045]];
function X(p){for(let i=1;i<anchors.length;i++)if(p<=anchors[i][0]){const [a,b]=anchors[i-1],[c,d]=anchors[i];return b+(p-a)/(c-a)*(d-b)}return 14.045+(p-1413)/89.7}const Z=p=>(p-271)/89.7;
const footprint=[[0,Z(563)],[X(228),Z(563)],[X(228),Z(600)],[X(286),Z(600)],[X(286),Z(563)],[X(383),Z(563)],[X(383),Z(600)],[X(827),Z(600)],[X(827),0],[14.045,0],[13.745,Z(1049)],[0,Z(1049)]];
function polygon(parent,points,y,mat){const shape=new THREE.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),mat);mesh.rotation.x=-Math.PI/2;mesh.position.y=y;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
polygon(architecture,footprint,0,mats.floor);polygon(architecture,footprint,-.12,basic('#8e9181'));
// A thin, dark plinth makes the traced perimeter legible.
for(let i=0;i<footprint.length;i++){const a=footprint[i],b=footprint[(i+1)%footprint.length];const len=Math.hypot(b[0]-a[0],b[1]-a[1]);const m=box(architecture,(a[0]+b[0])/2,-.17,(a[1]+b[1])/2,len,.16,.08,basic('#929886'));m.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);}
polygon(architecture,[[X(1134),0],[14.045,0],[13.93,Z(571)],[X(1134),Z(571)]],.014,mats.stone);
polygon(architecture,[[0,Z(563)],[X(228),Z(563)],[X(228),Z(600)],[X(286),Z(600)],[X(286),Z(563)],[X(383),Z(563)],[X(383),Z(600)],[X(566),Z(600)],[X(566),Z(710)],[0,Z(710)]],.018,mats['sde-floor']);
polygon(architecture,[[X(936),.08],[X(1130),.08],[X(1130),Z(435)],[X(936),Z(435)]],.018,mats['sdb-floor']);
polygon(architecture,[[X(828),0],[X(930),0],[X(930),Z(435)],[X(828),Z(435)]],.018,tile);
// Trim each wall solid from its original bottom; never scale the wall group.
// Lintels disappear below their fixed underside, leaving doors open to the cut.
function applyWallCut(w,ceilingHeight,cutHeight){
for(const part of w.parts){
const delta=ceilingHeight-w.h;
const bottom=part.bottom+(part.topAnchored?delta:0);
const top=part.top+(part.followsCeiling?delta:0);
const visibleHeight=Math.max(0,Math.min(top,cutHeight)-bottom);
part.mesh.visible=visibleHeight>0.00001;
part.mesh.scale.y=visibleHeight/part.height;
part.mesh.position.y=bottom+visibleHeight/2;
}
}
function wall(a,b,thick=.07,h=mainH,openings=[],out=null,material=mats.walls,lowBox=false,skirting=true){const g=new THREE.Group();architecture.add(g);const len=Math.hypot(b[0]-a[0],b[1]-a[1]);g.position.set(a[0],0,a[1]);g.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);const cuts=[0,len,...openings.flatMap(o=>[o.at,o.at+o.width])].sort((a,b)=>a-b);for(let i=0;i<cuts.length-1;i++){const s=Math.max(0,cuts[i]),e=Math.min(len,cuts[i+1]);if(e-s<.001)continue;const o=openings.find(o=>(s+e)/2>o.at&&(s+e)/2<o.at+o.width);if(!o)box(g,(s+e)/2,0,0,e-s,h,thick,material);else{if(o.sill)box(g,(s+e)/2,0,0,e-s,o.sill,thick,material);const top=(o.sill||0)+o.height;if(h>top)box(g,(s+e)/2,top,0,e-s,h-top,thick,material);if(o.window){const y=o.sill;box(g,(s+e)/2,y,0,e-s,o.height,.025,glass);for(const xx of [s+.025,(s+e)/2,e-.025])box(g,xx,y,0,.035,o.height,.07,white);for(const yy of [y,y+o.height/2,y+o.height-.03])box(g,(s+e)/2,yy,0,e-s,.035,.07,white);box(g,(s+e)/2,y-.04,0,e-s+.08,.05,thick+.09,white)}}}
// Skirting stops at door jambs instead of bridging the opening.
if(skirting)for(let i=0;i<cuts.length-1;i++){
const s=Math.max(0,cuts[i]),e=Math.min(len,cuts[i+1]);if(e-s<.001)continue;
const opening=openings.find(o=>(s+e)/2>o.at&&(s+e)/2<o.at+o.width);
if(!opening||opening.sill)box(g,(s+e)/2,0,0,e-s,.095,thick+.016,white);
}
const parts=g.children.map(mesh=>{const height=mesh.geometry.parameters.height,bottom=mesh.position.y-height/2,top=bottom+height;return{mesh,height,bottom,top,followsCeiling:Math.abs(top-h)<.00001};});
walls.push({g,a,b,out,h,lowBox,parts,cutHeight:h});return g;}
function roomAt(x,z){
if(z>=Z(710)){if(x<X(420.5))return 'Bedroom 1';if(x<X(669.5))return 'Bedroom 2';if(x<X(927.5))return 'Office';return 'Living room';}
if(x<X(566)&&z>=Z(563))return 'Shower room';
if(x>=X(930)&&x<=X(1130)&&z<Z(435))return 'Bathroom';
if(x>=X(827)&&x<X(930)&&z<Z(435))return 'WC';
if(x>X(1130))return 'Kitchen';if(x>X(930)&&z<Z(600))return 'Entry';return 'Hall';
}
const wallLabelCounts={};
function w(ax,az,bx,bz,t=.07,h=mainH,o=[],out=null,mat=mats.walls,lb=false){
if(mat!==mats.walls)return wall([X(ax),Z(az)],[X(bx),Z(bz)],t,h,o,out,mat,lb);
// Split long partitions at room boundaries so neighbouring rooms stay independent.
const a=[X(ax),Z(az)],b=[X(bx),Z(bz)],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;
const cuts=[0,1];const boundaries=az===bz?[420.5,566,669.5,827,930,1130].map(X):ax===bx?[435,576,600,710].map(Z):[];
for(const v of boundaries){const q=az===bz?(v-a[0])/dx:(v-a[1])/dz;if(q>.001&&q<.999&&!o.some(open=>q*len>open.at+.001&&q*len<open.at+open.width-.001))cuts.push(q);}
cuts.sort((a,b)=>a-b);let result;
for(let i=0;i<cuts.length-1;i++){
const from=cuts[i],to=cuts[i+1],start=[a[0]+dx*from,a[1]+dz*from],end=[a[0]+dx*to,a[1]+dz*to],mid=[(start[0]+end[0])/2,(start[1]+end[1])/2];
const faces=[1,-1].map(side=>{const outside=out&&(nx*side*out[0]+nz*side*out[1]>.5);const room=outside?'Exterior':roomAt(mid[0]+nx*side*(t/2+.12),mid[1]+nz*side*(t/2+.12));const direction=Math.abs(nx)>.5?(nx*side>0?'west':'east'):(nz*side>0?'north':'south');const label=room+' · '+direction+' wall';const count=wallLabelCounts[label]=(wallLabelCounts[label]||0)+1;const key=`wall-${ax}-${az}-${bx}-${bz}-${i}-${side>0?'a':'b'}`;if(!outside&&['Bathroom','Shower room'].includes(room))surfaceAliases[key]=(room==='Bathroom'?'sdb-':'sde-')+direction;return addSurface(key,label+(count>1?' · section '+count:''),{parent:'walls',group:outside?'Exterior wall faces':'Individual wall faces'});});
const openings=o.filter(open=>open.at<to*len&&open.at+open.width>from*len).map(open=>({...open,at:open.at-from*len}));
result=wall(start,end,t,h,openings,out,[faces[0],faces[0],faces[0],faces[0],faces[0],faces[1]],lb);
}
return result;
}
// Exterior: real window gaps, thick masonry and a slightly tapered east wall.
w(151,563,151,1049,.43,4,[],[-1,0]);for(const [ax,az,bx,bz]of[[151,563,228,563],[228,563,228,600],[228,600,286,600],[286,600,286,563],[286,563,383,563],[383,563,383,600],[383,600,827,600]])w(ax,az,bx,bz,.20,4,[],[0,-1]);w(827,600,827,271,.38,4,[{at:Z(600)-Z(550),width:1.0,height:2.5}],[-1,0]);w(827,271,1413,271,.43,4,[],[0,-1]);
w(1413,271,1386,1049,.43,4,[{at:.48,width:1.7,sill:.92,height:2.4,window:true}],[1,0]);
const facadeWindows=[[172,327],[466,575],[676,786],[930,1080],[1178,1332]].map(([a,b])=>({at:X(a),width:X(b)-X(a),sill:.17,height:3.1,window:true}));w(151,1049,1386,1049,.43,4,facadeWindows,[0,1]);
// Bedroom partitions, corridor doors and the red entry / bathroom box.
w(420.5,710,420.5,1049,.07);w(669.5,710,669.5,1049,.07);w(927.5,710,927.5,1049,.07);
w(151,710,927.5,710,.07,4,[{at:X(335),width:X(416)-X(335),height:2.2},{at:X(572),width:X(661)-X(572),height:2.2},{at:X(682),width:X(751)-X(682),height:2.2}]);
w(566,600,566,710,.07,4,[{at:Z(628)-Z(600),width:.84,height:2.2}]);
w(930,271,930,576,.07,boxH,[{at:Z(458),width:1.04,height:2.5}],null,mats.walls,true);
w(827,435,930,435,.07,boxH,[{at:.035,width:X(913)-X(830),height:2.1}],null,mats.walls,true);
w(936,435,1130,435,.07,boxH,[{at:X(987)-X(936),width:X(1064)-X(987),height:2.1}],null,mats.walls,true);
// White partitions step inward below the bath; the 62 cm cupboard sits outside.
w(1130,271,1130,435,.07,boxH,[],null,mats.walls,true);
// Thin wood cladding only on the kitchen face; the bathroom keeps its plaster wall.
// Align the finished face with the adjacent 62 cm cupboard fronts.
const claddingInner=X(1130)+.035,claddingOuter=X(1076)+.035+.62;
addSurface('kitchen-cladding','Kitchen · wood-clad wall',{parent:'joinery'});
const kitchenCladding=wall([(claddingInner+claddingOuter)/2,Z(271)],[(claddingInner+claddingOuter)/2,Z(435)+.035],claddingOuter-claddingInner,boxH,[],null,mats['kitchen-cladding'],true,false);
kitchenCladding.name='Kitchen-facing wood wall cladding';
w(1076,435,1076,576,.07,boxH,[],null,mats.walls,true);
w(936,576,1076,576,.07,boxH,[],null,mats.walls,true);
// Thin tiled linings on the bathroom side only; plaster and wooden joinery remain behind.
// Their world-space grid stays metric through every cutaway and height adjustment.
function tileWall(room,face,a,b,h,openings=[],low=false,out=null){return wall(a,b,.004,h,openings,out,mats[`${room}-${face}`],low,false);}
const skin=.011;
tileWall('sdb','north',[X(936),.215+skin],[X(1130),.215+skin],boxH,[],true,[0,-1]);
tileWall('sdb','south',[X(936),Z(435)-.035-skin],[X(1130),Z(435)-.035-skin],boxH,[{at:X(987)-X(936),width:X(1064)-X(987),height:2.1}],true);
tileWall('sdb','west',[X(930)+.035+skin,.215],[X(930)+.035+skin,Z(435)],boxH,[],true);
tileWall('sdb','east',[X(1130)-.035-skin,.215],[X(1130)-.035-skin,Z(435)],boxH,[],true);
addSurface('sdb-laundry-return','Bathroom · SDB · ML cupboard return',{tile:true,axis:'x',group:'Bathroom · 5 × 5 cm tiles'});
tileWall('sdb','laundry-return',[X(936),Z(358)+.025+skin],[X(997),Z(358)+.025+skin],boxH,[],true);
// The shower room follows the stepped outline of the old masonry.
for(const [ax,az,bx,bz] of [[151,563,228,563],[228,563,228,600],[228,600,286,600],[286,600,286,563],[286,563,383,563],[383,563,383,600],[383,600,566,600]]){
const a=[X(ax),Z(az)],b=[X(bx),Z(bz)],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),offset=.10+skin;
let face='north';if(az!==bz){face='recess-'+ax;addSurface('sde-'+face,'Shower room · SDE · recess return '+({228:'1',286:'2',383:'3'}[ax]),{tile:true,axis:'z',group:'Shower room · 5 × 5 cm tiles'});}
tileWall('sde',face,[a[0]-dz/length*offset,a[1]+dx/length*offset],[b[0]-dz/length*offset,b[1]+dx/length*offset],4,[],false,[0,-1]);
}
tileWall('sde','west',[.215+skin,Z(563)],[.215+skin,Z(710)],4,[],false,[-1,0]);
tileWall('sde','south',[0,Z(710)-.035-skin],[X(566),Z(710)-.035-skin],4,[{at:X(335),width:X(416)-X(335),height:2.2}]);
tileWall('sde','east',[X(566)-.035-skin,Z(600)],[X(566)-.035-skin,Z(710)],4,[{at:Z(628)-Z(600),width:.84,height:2.2}]);
function makeCeilings(){for(const g of [roof,boxRoof,joists,beam,zones,dims]){while(g.children.length){const m=g.children.pop();m.geometry?.dispose();m.parent=null;}}for(const l of dimensionLabels)l.el.remove();dimensionLabels.length=0;
const mainShape=[[8.62,0],[14.045,0],[13.745,Z(1049)],[8.62,Z(1049)]];const ceilMat=mats.beams;const highCeiling=polygon(roof,mainShape,mainH,ceilMat);highCeiling.material.side=THREE.DoubleSide;highCeiling.castShadow=true;
box(boxRoof,(X(930)+X(1134))/2,boxH,(Z(271)+Z(600))/2,X(1134)-X(930),.10,Z(600),mats.ceiling);
for(let z=.17;z<Z(1049);z+=.32){const right=14.045-.3*z/Z(1049);box(joists,(8.62+right)/2,mainH-.16,z,right-8.62,.16,.10,mats.beams)}
box(beam,X(1148),mainH-.4,Z(1049)/2,.30,.4,Z(1049),mats.mainbeam);
const red=new THREE.MeshBasicMaterial({color:'#d68473',transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false});const blue=new THREE.MeshBasicMaterial({color:'#668fab',transparent:true,opacity:.13,side:THREE.DoubleSide,depthWrite:false});polygon(zones,mainShape,.042,blue);polygon(zones,[[8.62,0],[X(1134),0],[X(1134),Z(600)],[8.62,Z(600)]],.052,red);zones.visible=$('zone-colors').checked;
const dimLine=(a,b,text)=>{const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a),new THREE.Vector3(...b)]);dims.add(new THREE.Line(geo,new THREE.LineBasicMaterial({color:'#58755d'})));for(const p of [a,b])box(dims,p[0],p[1]-.04,p[2],.035,.08,.16,mats.walls);label(text,'',new THREE.Vector3((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2),true)};
for(const [a,b,txt]of[[0,2.93,'2.93 m'],[3,5.72,'2.72 m'],[5.79,8.55,'2.76 m'],[8.62,13.745,'5.125 m']])dimLine([a,.08,9.25],[b,.08,9.25],txt);
dimLine([14.65,0,3],[14.65,mainH,3],mainH.toFixed(2)+' m');dimLine([10.65,0,3.9],[10.65,boxH,3.9],boxH.toFixed(2)+' m');dims.visible=$('dimensions').checked;
}function label(name,area,pos,isDim=false){const el=document.createElement('div');el.className='room-label'+(isDim?' dim':'');el.textContent=name;if(area){const s=document.createElement('span');s.textContent=area;el.append(s)}$('labels').append(el);(isDim?dimensionLabels:roomLabels).push({el,pos});}
makeCeilings();
// Built-in joinery: continuous kitchen, tall box face, shelving and peninsula.
for(let i=0;i<5;i++){const x=X(1135)+.3135+i*.627;box(furn,x,.10,.37,.612,.78,.62,mats.joinery);box(furn,x,1.55,.25,.612,.65,.42,white);box(furn,x,.50,.697,.48,.012,.01,dark)}
const worktopThickness=.005;
box(furn,X(1135)+3.135/2,.88,.37,3.135,worktopThickness,.66,mats.countertop);
box(furn,12.9,.12,Z(460),1.77,.77,.84,mats.joinery);box(furn,12.9,.89,Z(460),1.82,worktopThickness,.9,mats.countertop);
box(furn,11.76,.885,.36,.62,.015,.43,metal);box(furn,11.76,.897,.36,.52,.01,.34,dark);cyl(furn,11.76,.90,.16,.018,.24,metal);box(furn,11.76,1.12,.23,.035,.035,.16,metal);box(furn,13.0,.885,.36,.58,.018,.49,dark);for(const dx of[-.16,.16])for(const dz of[-.13,.13])cyl(furn,13+dx,.904,.36+dz,.09,.008,metal);
// Built-in furniture is separate from the plaster partitions, with its own
// carcass, doors and shelves, fitted flush to the walls and box ceiling.
const boxFurn=new THREE.Group();boxFurn.name='Entry cupboard and living-room bookcase';furn.add(boxFurn);
const cabinetH=2.9,cabinetRearFace=X(1076)+.035,cabinetBack=cabinetRearFace+.0125,cabinetFront=cabinetRearFace+.62-.011;
function furnitureSection(name,a,b){const g=new THREE.Group();g.name=name;boxFurn.add(g);return {g,a,b};}
function finishFurnitureSection(section){const parts=section.g.children.map(mesh=>{const height=mesh.geometry.parameters.height,bottom=mesh.position.y-height/2,top=bottom+height;const followsCeiling=Math.abs(top-cabinetH)<.00001;return{mesh,height,bottom,top,followsCeiling,topAnchored:followsCeiling&&height<.05};});walls.push({...section,out:null,h:cabinetH,lowBox:true,isFurniture:true,parts,cutHeight:cabinetH});}
const cupboardStart=Z(435)+.035,cupboardEnd=Z(600),cupboardDepth=cupboardEnd-cupboardStart;
const tallCupboard=furnitureSection('62 cm deep kitchen-side cupboard',[cabinetFront,cupboardStart],[cabinetFront,cupboardEnd]);
box(tallCupboard.g,cabinetBack,0,(cupboardStart+cupboardEnd)/2,.025,cabinetH,cupboardDepth,mats.joinery);
for(const z of [cupboardStart+.0125,cupboardEnd-.0125])box(tallCupboard.g,cabinetRearFace+.31,0,z,.62,cabinetH,.025,mats.joinery);
for(const y of [0,cabinetH-.025])box(tallCupboard.g,cabinetRearFace+.31,y,(cupboardStart+cupboardEnd)/2,.62,.025,cupboardDepth,mats.joinery);
for(let i=0;i<3;i++){const z=cupboardStart+(i+.5)*cupboardDepth/3;box(tallCupboard.g,cabinetFront,0,z,.022,cabinetH,cupboardDepth/3-.008,mats.joinery);box(tallCupboard.g,cabinetFront+.025,1.05,z+cupboardDepth/6-.05,.025,.20,.012,dark);}
finishFurnitureSection(tallCupboard);
const shelfLeft=X(930)-.035,shelfRight=cabinetRearFace,shelfX=(shelfLeft+shelfRight)/2,shelfW=shelfRight-shelfLeft,shelfBack=Z(576)+.035,shelfFront=Z(600),shelfDepth=shelfFront-shelfBack;
const bookcase=furnitureSection('Living-room bookcase',[shelfLeft,shelfFront],[shelfRight,shelfFront]);
box(bookcase.g,shelfX,0,shelfBack+.01,shelfW,cabinetH,.02,mats.joinery);
for(const x of [shelfLeft+.0125,shelfX,shelfRight-.0125])box(bookcase.g,x,0,(shelfBack+shelfFront)/2,.025,cabinetH,shelfDepth,mats.joinery);
for(const y of [.0,.75,1.21,1.67,2.13,cabinetH-.025])box(bookcase.g,shelfX,y,(shelfBack+shelfFront)/2,shelfW,.025,shelfDepth,mats.joinery);
box(bookcase.g,shelfX,0,shelfFront-.0125,shelfW,.73,.025,mats.joinery);
for(let i=0;i<9;i++)box(bookcase.g,shelfLeft+.08+i*.065,.775,shelfFront-.09,.045,.23+rand()*.08,.15,basic(['#a59c83','#8b9c88','#bba88d'][i%3]));
finishFurnitureSection(bookcase);
function wardrobe(x,z,w,id,label,d=.6){registerFurniture(placeFurniture(detailedFurniture.wardrobe(w,d),furn,x,z),id,label);}
wardrobe(1,Z(740),2,'wardrobe-1','Bedroom 1 · wardrobe');wardrobe(3.8,Z(740),1.57,'wardrobe-2','Bedroom 2 · wardrobe');wardrobe(7.55,Z(740),1.85,'wardrobe-office','Office · wardrobe');
function bed(x,z,w,d,rot,id,label){registerFurniture(placeFurniture(detailedFurniture.bed(w,d),furn,x,z,rot),id,label);}
bed(1.14,Z(912),1.6,2,Math.PI/2,'bed-1','Bedroom 1 · bed');bed(5.08,Z(952),.9,2,0,'bed-2','Bedroom 2 · bed');
function sofa(parent,x,z,width=2.3,rot=0){return placeFurniture(detailedFurniture.sofa(width),parent,x,z,rot);}
registerFurniture(sofa(furn,9.05,Z(892),2.35,Math.PI/2),'sofa-living','Living room · sofa');registerFurniture(sofa(furn,8.1,Z(900),1.65,-Math.PI/2),'sofa-office','Office · sofa');
function chair(x,z,rot,id,label){return registerFurniture(placeFurniture(detailedFurniture.chair(),furn,x,z,rot),id,label);}
registerFurniture(placeFurniture(detailedFurniture.table(1,2.4,.74),furn,12.63,Z(793)),'dining-table','Dining table');
for(const [i,z]of[Z(722),Z(795),Z(868)].entries()){chair(11.88,z,Math.PI/2,'chair-west-'+i,'Dining chair · west '+(i+1));chair(13.38,z,-Math.PI/2,'chair-east-'+i,'Dining chair · east '+(i+1))}chair(12.63,Z(793)-1.49,0,'chair-north','Dining chair · kitchen end');chair(12.63,Z(793)+1.49,Math.PI,'chair-south','Dining chair · window end');
registerFurniture(placeFurniture(detailedFurniture.coffee(),furn,10.07,Z(875)),'coffee-table','Coffee table');
registerFurniture(sofa(furn,10.85,Z(746),.82,Math.atan2(10.07-10.85,Z(875)-Z(746))),'armchair-north','Armchair · kitchen side');registerFurniture(sofa(furn,10.85,Z(968),.82,Math.atan2(10.07-10.85,Z(875)-Z(968))),'armchair-south','Armchair · window side');
registerFurniture(placeFurniture(detailedFurniture.table(1.15,.60,.73),furn,6.45,Z(1023)),'desk','Office · desk');chair(6.45,Z(982),0,'desk-chair','Office · desk chair');
// Bathroom fittings traced from the plan: ML cupboard NW, basin SW, bath east.
// Fixed plumbing keeps existing saved movable-furniture layouts compatible.
const bathroom=new THREE.Group();bathroom.name='SDB · fixed fittings';furn.add(bathroom);
const wc=new THREE.Group();wc.name='WC · fixed fittings';furn.add(wc);
const tubX=X(1097),tubZ=Z(363);
box(bathroom,tubX,0,tubZ,.70,.55,1.60,white);
box(bathroom,tubX,.55,tubZ,.57,.012,1.43,water);
cyl(bathroom,tubX,.57,Z(300),.018,.17,metal);box(bathroom,tubX,.72,Z(305),.035,.025,.14,metal);
// The circular symbol below ML is a washbasin, not a second WC.
const basinX=X(958),basinZ=Z(396);
box(bathroom,basinX,.12,basinZ,.45,.68,.80,mats.joinery);
box(bathroom,basinX,.80,basinZ,.46,.045,.81,white);
cyl(bathroom,basinX,.845,basinZ,.20,.055,white);
cyl(bathroom,basinX,.899,basinZ,.155,.003,water);
cyl(bathroom,X(941),.845,basinZ,.014,.17,metal);
box(bathroom,X(946),1.0,basinZ,.14,.025,.025,metal);
box(bathroom,X(934),1.1,basinZ,.015,.85,.65,metal);
// ML: 60 cm front-loader facing east into the bathroom aisle.
const washer=new THREE.Group();washer.name='ML · washing machine';bathroom.add(washer);
box(washer,X(966),.02,Z(324),.60,.83,.60,white);
box(washer,X(994),.71,Z(324),.025,.10,.55,metal);
const drum=cyl(washer,X(996),.29,Z(324),.21,.025,dark);
drum.rotation.z=Math.PI/2;drum.position.y=.44;
const drumGlass=cyl(washer,X(998),.29,Z(324),.16,.027,glass);
drumGlass.rotation.z=Math.PI/2;drumGlass.position.y=.44;
// Tall panels trim with the walls, without squashing the door or appliance.
w(936,286,1082,286,.035,boxH,[],null,mats.joinery,true);
w(936,358,997,358,.05,boxH,[],null,mats.walls,true);
const laundryDoor=w(999,290,999,354,.025,boxH,[],null,mats.joinery,true);
laundryDoor.name='ML · full-height wooden door';
const laundryDoorWall=walls[walls.length-1];
const laundryHandle=box(laundryDoor,Z(354)-Z(290)-.06,1.02,-.035,.018,.18,.025,metal);
laundryDoorWall.parts.push({mesh:laundryHandle,height:.18,bottom:1.02,top:1.20,followsCeiling:false});
// Separate WC: toilet against the rear service cupboard, hand basin by entry.
w(830,304,927,304,.04,4,[],null,mats.walls);
box(wc,X(873),.32,Z(313),.37,.43,.15,white);
const toilet=cyl(wc,X(873),.12,Z(336),.19,.29,white);toilet.scale.z=1.42;
const seat=cyl(wc,X(873),.41,Z(336),.20,.035,white);seat.scale.z=1.43;
const bowl=cyl(wc,X(873),.447,Z(336),.135,.003,water);bowl.scale.z=1.45;
box(wc,X(919),.72,Z(417),.22,.10,.34,white);
cyl(wc,X(919),.82,Z(417),.08,.005,water);
cyl(wc,X(925),.82,Z(417),.012,.12,metal);
box(furn,.50,.02,Z(642),.95,.08,.98,white);box(furn,.99,.10,Z(642),.015,2,.98,glass);box(furn,1.8,0,Z(625),1.1,.8,.50,mats.joinery);box(furn,1.8,.8,Z(625),1.1,.05,.52,white);cyl(furn,1.8,.85,Z(625),.22,.06,white);
// Radiators follow the long exterior walls.
for(const [x,z,len,rot]of[[.95,Z(1043),1.5,0],[8,Z(1043),1.15,0],[9.4,Z(1043),1.35,0],[13.75,Z(960),.8,Math.PI/2]]){const g=new THREE.Group();furn.add(g);g.position.set(x,0,z);g.rotation.y=rot;for(let i=0;i<len/.075;i++)box(g,-len/2+i*.075,.14,0,.05,.55,.13,white)}
label('Chambre 1','11.23 m²',new THREE.Vector3(1.47,.2,7.8));label('Chambre 2','9.67 m²',new THREE.Vector3(4.25,.2,7.8));label('Bureau','10.58 m²',new THREE.Vector3(7.15,.2,7.7));label('Séjour','26.49 m² · H 4.00 m',new THREE.Vector3(11.05,.2,6.3));label('Cuisine','12.84 m² · H 4.00 m',new THREE.Vector3(12.15,.2,2.8));label('Entrée + SDB','H 2.90 m',new THREE.Vector3(9.6,2.99,1.6));label('Salle d’eau','6.43 m²',new THREE.Vector3(3.1,.2,4.35));
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.12}));ground.rotation.x=-Math.PI/2;ground.position.y=-.19;ground.receiveShadow=true;scene.add(ground);
let activeView='overview',transition=null;const presets={bathroom:{p:[7.0,7.8,5.2],t:[9.45,.6,1.15]},overview:{p:[19,16,21],t:[7,0,4.2]},living:{p:[20,12,17],t:[11.1,1,4.3]},inside:{p:[11.15,1.65,8.1],t:[11.4,1.8,.7]},plan:{p:[7,24,4.34],t:[7,0,4.3]}};
function setView(name,instant=false){if(walkthrough?.active)walkthrough.exit(false);const previous=camera;camera=name==='plan'?orthographic:perspective;if(camera!==previous){camera.position.copy(previous.position);controls.object=camera;}activeView=name;$('viewport').classList.toggle('interior',name==='inside');if(camera.isPerspectiveCamera)camera.fov=name==='inside'?62:40;camera.zoom=1;camera.updateProjectionMatrix();const source=presets[name],p={p:[...source.p],t:[...source.t]};const rect=wrap.getBoundingClientRect();if(name!=='inside'&&name!=='plan'){const fit=Math.max(1,1.25/(rect.width/rect.height));p.p=p.p.map((v,i)=>p.t[i]+(v-p.t[i])*fit);}document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));if(instant){camera.position.fromArray(p.p);controls.target.fromArray(p.t);controls.update()}else transition={from:camera.position.clone(),to:new THREE.Vector3(...p.p),ft:controls.target.clone(),tt:new THREE.Vector3(...p.t),start:performance.now()};}
setView('overview',true);document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));controls.addEventListener('start',()=>transition=null);
function segmentCross(a,b,c,d){const cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);return cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0;}
const ray=new THREE.Raycaster();function updateCutaway(){const mode=walkthrough?.active?'full':$('wall-mode').value;const elevated=camera.position.y>mainH+.2;const cam2=[camera.position.x,camera.position.z],tar2=[controls.target.x,controls.target.z];for(const w of walls){let scale=1;const h=w.lowBox?boxH:w.h+(mainH-4);if(mode==='off')scale=w.isFurniture?1:.001;else if(mode==='low')scale=.035;else if(mode==='auto'){const mx=(w.a[0]+w.b[0])/2,mz=(w.a[1]+w.b[1])/2;const front=w.out&&((camera.position.x-mx)*w.out[0]+(camera.position.z-mz)*w.out[1]>.3);const obstruct=segmentCross(cam2,tar2,w.a,w.b)&&camera.position.y<h+2;if(elevated&&!w.out&&!w.lowBox)scale=.29;if((front&&elevated)||obstruct)scale=.035;if(activeView==='plan'&&elevated)scale=.035;}w.cutHeight+=(scale*h-w.cutHeight)*.18;applyWallCut(w,h,w.cutHeight);w.g.visible=w.isFurniture||mode!=='off';}
const cm=walkthrough?.active?'full':$('ceiling-mode').value;roof.visible=cm==='full'||(cm==='auto'&&camera.position.y<mainH-.12);boxRoof.visible=cm==='full'||(cm==='auto'&&camera.position.y>boxH+.25)|| (cm==='auto'&&camera.position.x>8.62&&camera.position.x<X(1134)&&camera.position.z<Z(600));joists.visible=cm==='full'||cm==='structure'||(cm==='auto'&&camera.position.y<mainH);beam.visible=cm!=='off'&&activeView!=='plan';if(cm==='structure'||(activeView==='plan'&&cm==='auto'))boxRoof.visible=false;
}
function showLabels(){const r=wrap.getBoundingClientRect();for(const a of [...roomLabels,...dimensionLabels]){const isDim=dimensionLabels.includes(a);const show=isDim?$('dimensions').checked:($('room-labels').checked&&camera.position.y>4.5);const p=a.pos.clone().project(camera);a.el.style.display=show&&p.z<1&&p.z>-1?'block':'none';a.el.style.left=(p.x*.5+.5)*r.width+'px';a.el.style.top=(-p.y*.5+.5)*r.height+'px';}}
function resize(){const r=wrap.getBoundingClientRect();perspective.aspect=r.width/r.height;perspective.updateProjectionMatrix();const planHalfHeight=Math.max(6.7,8/(r.width/r.height));orthographic.left=-planHalfHeight*r.width/r.height;orthographic.right=planHalfHeight*r.width/r.height;orthographic.top=planHalfHeight;orthographic.bottom=-planHalfHeight;orthographic.updateProjectionMatrix();renderer.setSize(r.width,r.height)}new ResizeObserver(resize).observe(wrap);resize();
function frame(t){requestAnimationFrame(frame);if(transition){let p=Math.min((t-transition.start)/850,1);p=1-Math.pow(1-p,3);camera.position.lerpVectors(transition.from,transition.to,p);controls.target.lerpVectors(transition.ft,transition.tt,p);if(p>=1)transition=null}if(walkthrough?.active)walkthrough.update(t);else controls.update();updateCutaway();showLabels();updateSelectionOutline();renderer.render(scene,camera)}requestAnimationFrame(frame);$('loading').hidden=true;
function toast(msg){$('toast').textContent=msg;$('toast').style.opacity=1;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').style.opacity=0,2800)}
function persist(){queueDesignSave();try{localStorage.setItem('ivry-finishes-v1',JSON.stringify(state))}catch{toast('Browser storage unavailable; finishes remain for this visit.')}}
const overlayMaterial=new THREE.MeshBasicMaterial({color:0x13a6d5,transparent:true,opacity:.32,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4,toneMapped:false});
function updateSurfaceSelection(){
for(const mesh of surfaceOverlays){mesh.removeFromParent();mesh.geometry.dispose();}surfaceOverlays.length=0;
const meshes=[];architecture.traverse(mesh=>{if(mesh.isMesh)meshes.push(mesh);});
for(const mesh of meshes){const geometry=selectionGeometry(mesh,selectedSurfaces);if(!geometry)continue;const overlay=new THREE.Mesh(geometry,[overlayMaterial]);overlay.userData.selectionOverlay=true;overlay.raycast=()=>{};overlay.renderOrder=20;mesh.add(overlay);surfaceOverlays.push(overlay);}
$('surface-selection').hidden=!selectedSurfaces.size;$('selection-count').textContent=selectedSurfaces.size+' surface'+(selectedSurfaces.size===1?'':'s')+' selected';
$('selection-list').textContent=[...selectedSurfaces].map(key=>surfaceMeta[key].label).join(' · ');
}
function selectSurface(key,additive=false){const next=nextSurfaceSelection(selectedSurfaces,key,additive);selectedSurfaces.clear();for(const id of next)selectedSurfaces.add(id);if(selectedSurfaces.size)$('surface').value=[...selectedSurfaces].at(-1);else $('surface').value=key;updateSurfaceSelection();surfaceUI();}
function clearSurfaceSelection(){selectedSurfaces.clear();updateSurfaceSelection();}
function surfaceTargets(){return selectedSurfaces.size?[...selectedSurfaces]:[$('surface').value];}
function currentColour(){const key=$('surface').value,s=state[key];return s.tint==='#ffffff'?catalog.find(f=>f.id===s.finish).color:s.tint;}
function saveRecentColour(colour){recentColours=rememberColour(recentColours,colour);try{localStorage.setItem('ivry-recent-colours-v1',JSON.stringify(recentColours));}catch{}renderRecentColours();}
function renderRecentColours(){
$('recent-colours').replaceChildren();$('furniture-recent-colours').replaceChildren();$('recent-empty').hidden=recentColours.length>0;
recentColours.forEach((colour,index)=>{const b=document.createElement('button');b.className='recent-colour';b.style.setProperty('--colour',colour);b.title=(index===0?'Last used · ':'')+colour;b.setAttribute('aria-label','Apply saved colour '+colour);b.textContent=index===0?'Last':colour;b.onclick=()=>{applyColour(colour);saveRecentColour(colour);persist();};$('recent-colours').append(b);const furnitureButton=b.cloneNode(true);furnitureButton.setAttribute('aria-label','Apply furniture colour '+colour);furnitureButton.onclick=()=>setFurnitureColour(colour);$('furniture-recent-colours').append(furnitureButton);});
}
function applyColour(colour){for(const key of surfaceTargets()){state[key].finish='paint';state[key].tint=colour;delete customTextures[key];applyMaterial(key);}persist();surfaceUI();}
$('save-colour').onclick=()=>{saveRecentColour(currentColour());persist();toast('Colour saved to your reusable palette');};
$('clear-surfaces').onclick=()=>{clearSurfaceSelection();surfaceUI();};
const surfaceGroups={};
for(const [key,meta] of Object.entries(surfaceMeta)){if(surfaceAliases[key])continue;let group=surfaceGroups[meta.group];if(!group){group=document.createElement('optgroup');group.label=meta.group;surfaceGroups[meta.group]=group;$('surface').append(group);}const option=document.createElement('option');option.value=key;option.textContent=meta.label;group.append(option);}
function surfaceUI(){const key=$('surface').value,s=state[key],f=catalog.find(f=>f.id===s.finish);$('material-name').textContent=customTextures[key]?'Your uploaded texture':f.name;$('material-description').textContent=surfaceMeta[key]?.tile?'5 × 5 cm tiles · 2 mm grout · '+(selectedSurfaces.size>1?'applies to selected surfaces':'this surface only'):customTextures[key]?'Included when you save or export the design':f.desc;$('material-preview').style.background=s.tint==='#ffffff'?f.color:s.tint;$('tint').value=surfaceMeta[key]&&s.tint==='#ffffff'?f.color:s.tint;$('roughness').value=s.roughness;$('roughness-value').value=Math.round(s.roughness*100)+'%';$('texture-scale').value=s.scale;$('scale-value').value=s.scale+'×';$('remove-texture').hidden=!customTextures[key];$('swatches').innerHTML='';const tiled=surfaceTargets().some(key=>surfaceMeta[key]?.tile)||selectedSurfaces.size>1;$('texture').closest('.upload-box').hidden=tiled;$('texture-scale').hidden=tiled;document.querySelector('label[for="texture-scale"]').hidden=tiled;const relevant=tiled?catalog.filter(f=>f.id!=='paint'&&(f.kind==='plain'||f.kind==='stone')):key==='floor'||key==='joinery'||key==='beams'||key==='mainbeam'||surfaceMeta[key]?.parent==='joinery'?catalog.filter(f=>f.kind==='wood'||['chalk','sage','blue'].includes(f.id)):catalog.filter(f=>f.id!=='paint'&&f.kind!=='wood');for(const f of relevant){const b=document.createElement('button');b.className='swatch'+(s.finish===f.id?' active':'');b.setAttribute('aria-label',f.name);b.setAttribute('aria-pressed',String(s.finish===f.id));const i=document.createElement('i');i.style.background=f.kind==='wood'?`repeating-linear-gradient(93deg,transparent 0px,${f.color} 2px,transparent 5px,${f.color} 8px),linear-gradient(15deg,${f.color},${f.color}bb)`:f.color;b.append(i,document.createTextNode(f.name));b.onclick=()=>{for(const target of surfaceTargets()){state[target].finish=f.id;state[target].tint='#ffffff';if(f.kind==='metal')state[target].roughness=.25;delete customTextures[target];applyMaterial(target);}saveRecentColour(f.color);persist();surfaceUI()};$('swatches').append(b)}}
$('surface').onchange=()=>{if(surfaceMeta[$('surface').value])selectSurface($('surface').value);else{clearSurfaceSelection();surfaceUI();}};surfaceUI();renderRecentColours();for(const [id,field]of[['tint','tint'],['roughness','roughness'],['texture-scale','scale']])$(id).oninput=()=>{
if(field==='tint'){applyColour($(id).value);return;}
for(const key of surfaceTargets()){state[key][field]=Number($(id).value);applyMaterial(key);}persist();surfaceUI();
};
$('tint').onchange=()=>{saveRecentColour($('tint').value);persist();};
$('texture').onchange=async()=>{const file=$('texture').files[0];if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)){toast('Choose a JPG, PNG or WebP image.');return}const key=$('surface').value;try{const img=await createImageBitmap(file,{resizeWidth:1024,resizeQuality:'high'});const c=document.createElement('canvas');c.width=img.width;c.height=img.height;c.getContext('2d').drawImage(img,0,0);const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;customTextures[key]=tex;state[key].tint='#ffffff';applyMaterial(key);surfaceUI();queueDesignSave();toast('Texture applied · included in design saves and exports')}catch{toast('This image could not be loaded. Try another file.')}};
$('remove-texture').onclick=()=>{const k=$('surface').value;delete customTextures[k];$('texture').value='';applyMaterial(k);surfaceUI();queueDesignSave()};
$('reset').onclick=()=>{state=structuredClone(defaults);furnitureColours={};for(const parts of furnitureParts.values())applyFurnitureColours(parts);for(const key in state){delete customTextures[key];applyMaterial(key)}persist();surfaceUI();furnitureColourUI();toast('Original material palette restored')};
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.tab-panel').forEach(p=>p.hidden=p.id!==b.dataset.tab)});
$('furniture').onchange=()=>{furn.visible=$('furniture').checked;if(!furn.visible)selectFurniture(null);};$('dimensions').onchange=()=>dims.visible=$('dimensions').checked;$('zone-colors').onchange=()=>zones.visible=$('zone-colors').checked;$('laundry-open').onchange=()=>{const open=$('laundry-open').checked;laundryDoor.rotation.y=open?0:-Math.PI/2;const length=Z(354)-Z(290);laundryDoorWall.b=[X(999)+(open?length:0),Z(290)+(open?0:length)];};$('inspect-bathroom').onclick=()=>{$('ceiling-mode').value='off';$('wall-mode').value='low';$('wall-mode').onchange();setView('bathroom');};$('wall-mode').onchange=()=>{$('status').textContent={auto:'Automatic cutaway',full:'Full-height walls',low:'Walls lowered',off:'Walls hidden'}[$('wall-mode').value]};
function heights(){queueDesignSave();boxH=Number($('box-height').value);mainH=Number($('main-height').value);document.querySelector('.height-card>div').innerHTML='<b>'+boxH.toFixed(2)+' m</b><i>→</i><b>'+mainH.toFixed(2)+' m</b>';$('box-height-value').value=boxH.toFixed(2)+' m';$('main-height-value').value=mainH.toFixed(2)+' m';makeCeilings();for(const l of roomLabels){if(l.el.firstChild.textContent==='Entrée + SDB'){l.pos.y=boxH+.09;l.el.querySelector('span').textContent='H '+boxH.toFixed(2)+' m'}else if(['Séjour','Cuisine'].includes(l.el.firstChild.textContent))l.el.querySelector('span').textContent=l.el.firstChild.textContent==='Séjour'?'26.49 m² · H '+mainH.toFixed(2)+' m':'12.84 m² · H '+mainH.toFixed(2)+' m'}}$('box-height').oninput=heights;$('main-height').oninput=heights;$('restore-height').onclick=()=>{$('box-height').value=2.9;$('main-height').value=4;heights()};
function zoom(f){if(walkthrough?.active){walkthrough.zoom(f);return;}transition=null;if(camera.isOrthographicCamera){camera.zoom=Math.max(.4,Math.min(8,camera.zoom/f));camera.updateProjectionMatrix();return}const d=camera.position.clone().sub(controls.target);d.multiplyScalar(f);d.clampLength(.35,60);camera.position.copy(controls.target).add(d);controls.update()}$('zoom-in').onclick=()=>zoom(.83);$('zoom-out').onclick=()=>zoom(1.2);$('home').onclick=()=>setView('overview');$('export').onclick=()=>{renderer.render(scene,camera);const a=document.createElement('a');a.href=renderer.domElement.toDataURL('image/png');a.download='ivry-apartment-view.png';a.click();toast('View saved as PNG')};$('enlarge-plan').onclick=()=>$('plan-dialog').showModal();$('close-plan').onclick=()=>$('plan-dialog').close();
window.addEventListener('keydown',e=>{if(/INPUT|SELECT/.test(document.activeElement.tagName))return;if(e.key==='Home')setView('overview');if(e.key==='+')zoom(.9);if(e.key==='-')zoom(1.1)});
// Read-only model metadata is useful when inspecting the saved reconstruction.
window.ivryModel={units:'metres',bedroomWidths:[2.93,2.72,2.76],livingWidth:5.125,roomAreaSum:91.5,mainBeam:{width:.30,depth:.40,source:'inferred section; plan-aligned position'},get heights(){return{box:boxH,main:mainH}},get camera(){return camera.position.toArray()},get materials(){return structuredClone(state)},get furniture(){return movableObjects.map(o=>({id:o.userData.furniture.id,name:o.userData.furniture.label,x:o.position.x,z:o.position.z,angle:THREE.MathUtils.radToDeg(o.rotation.y)}))},get wallCount(){return walls.length}};

// Furniture editing is independent of camera orbiting and architectural geometry.
let selectedFurniture=null,arranging=false,furnitureDrag=null,rotationGesture=false;
const layoutHistory=[],pickRay=new THREE.Raycaster(),pointerNDC=new THREE.Vector2();
const selectionOutline=new THREE.BoxHelper(undefined,0x507b50);selectionOutline.material.depthTest=false;selectionOutline.material.transparent=true;selectionOutline.material.opacity=.95;selectionOutline.renderOrder=100;selectionOutline.visible=false;scene.add(selectionOutline);
const normalizedAngle=r=>((THREE.MathUtils.radToDeg(r)%360)+360)%360;
function layoutSnapshot(){return movableObjects.map(o=>({id:o.userData.furniture.id,x:o.position.x,z:o.position.z,angle:o.rotation.y}));}
function restoreSnapshot(snapshot){for(const item of snapshot){const object=movableObjects.find(o=>o.userData.furniture.id===item.id);if(object&&[item.x,item.z,item.angle].every(Number.isFinite)&&item.x>=-2&&item.x<=16&&item.z>=-2&&item.z<=11){object.position.set(item.x,0,item.z);object.rotation.y=item.angle;}}}
try{const saved=JSON.parse(localStorage.getItem('ivry-layout-v1'));if(Array.isArray(saved))restoreSnapshot(saved);}catch{}
function saveLayout(){queueDesignSave();try{localStorage.setItem('ivry-layout-v1',JSON.stringify(layoutSnapshot()));$('layout-save-status').textContent='Layout saved locally in this browser';}catch{$('layout-save-status').textContent='Browser storage unavailable · layout kept for this visit';}}
function rememberLayout(snapshot=layoutSnapshot()){layoutHistory.push(snapshot);if(layoutHistory.length>30)layoutHistory.shift();$('undo-layout').disabled=false;}
function showLayoutPanel(){document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab==='layout'));document.querySelectorAll('.tab-panel').forEach(p=>p.hidden=p.id!=='layout');}
function setArranging(enabled){if(enabled&&typeof pickingSurface!=='undefined')setSurfacePicking(false);if(enabled&&walkthrough?.active)walkthrough.exit();arranging=enabled;$('arrange-toggle').setAttribute('aria-pressed',String(enabled));$('arrange-toggle').textContent=enabled?'✓ Arranging furniture':'↔ Arrange furniture';renderer.domElement.style.cursor=enabled?'grab':'';if(enabled){furn.visible=true;$('furniture').checked=true;showLayoutPanel();}else selectFurniture(null);}
function syncObjectFields(){if(!selectedFurniture)return;const o=selectedFurniture;$('object-x').value=o.position.x.toFixed(2);$('object-z').value=o.position.z.toFixed(2);const deg=normalizedAngle(o.rotation.y);$('object-angle').value=Math.round(deg);$('object-angle-value').value=Math.round(deg)+'°';}
const furniturePartLabels={wood:'Wood & frame',upholstery:'Upholstery / fabric',bedding:'Bedding / scatter cushions'};
function furnitureColourUI(rebuild=false){if(!selectedFurniture)return;const id=selectedFurniture.userData.furniture.id,parts=furnitureParts.get(id),menu=$('furniture-part');if(rebuild||!parts[menu.value]){menu.replaceChildren();for(const key of Object.keys(parts)){const option=document.createElement('option');option.value=key;option.textContent=furniturePartLabels[key];menu.append(option);}if(parts.upholstery)menu.value='upholstery';}
const part=menu.value;$('furniture-colour').value=furnitureColours[id]?.[part]||'#'+parts[part][0].original.getHexString();$('furniture-colour-value').textContent=$('furniture-colour').value;$('furniture-colour-reset').disabled=!furnitureColours[id];}
function setFurnitureColour(colour,remember=true){if(!selectedFurniture)return;const id=selectedFurniture.userData.furniture.id,part=$('furniture-part').value;(furnitureColours[id]??={})[part]=colour;applyFurnitureColours(furnitureParts.get(id),furnitureColours[id]);if(remember)saveRecentColour(colour);furnitureColourUI();queueDesignSave();}
$('furniture-part').onchange=()=>furnitureColourUI();$('furniture-colour').oninput=()=>setFurnitureColour($('furniture-colour').value,false);$('furniture-colour').onchange=()=>{saveRecentColour($('furniture-colour').value);queueDesignSave();};
$('furniture-colour-save').onclick=()=>{saveRecentColour($('furniture-colour').value);queueDesignSave();toast('Furniture colour added to saved colours');};
$('furniture-colour-reset').onclick=()=>{if(!selectedFurniture)return;const id=selectedFurniture.userData.furniture.id;delete furnitureColours[id];applyFurnitureColours(furnitureParts.get(id));furnitureColourUI();queueDesignSave();};
for(const colour of ['#b6b1a4','#7b8d78','#bd8065','#587d8b','#bb956a','#424b48']){const b=document.createElement('button');b.className='recent-colour';b.style.setProperty('--colour',colour);b.textContent=colour;b.setAttribute('aria-label','Furniture swatch '+colour);b.onclick=()=>setFurnitureColour(colour);$('furniture-swatches').append(b);}
function selectFurniture(object){selectedFurniture=object;$('object-controls').hidden=!object;$('object-select').value=object?.userData.furniture.id||'';if(object){$('object-name').textContent=object.userData.furniture.label;syncObjectFields();furnitureColourUI(true);}updateSelectionOutline();}
function updateSelectionOutline(){selectionOutline.visible=!!selectedFurniture&&furn.visible;if(selectionOutline.visible){selectedFurniture.updateWorldMatrix(true,true);selectionOutline.setFromObject(selectedFurniture);}}
for(const object of movableObjects){const option=document.createElement('option');option.value=object.userData.furniture.id;option.textContent=object.userData.furniture.label;$('object-select').append(option);}
let pickingSurface=false,surfacePointer=null;
function setSurfacePicking(enabled){pickingSurface=enabled;$('pick-surface').setAttribute('aria-pressed',String(enabled));$('pick-surface').textContent=enabled?'✓ Select walls · Shift-click to add':'⌖ Pick walls or tiled floors';renderer.domElement.style.cursor=enabled?'crosshair':'';if(!enabled)clearSurfaceSelection();}
$('pick-surface').onclick=()=>{const enabled=!pickingSurface;if(enabled)setArranging(false);setSurfacePicking(enabled);};
renderer.domElement.addEventListener('pointerdown',e=>{
if((pickingSurface||e.shiftKey)&&!walkthrough?.active&&!arranging&&e.button===0){surfacePointer={id:e.pointerId,x:e.clientX,y:e.clientY,additive:e.shiftKey,distance:0};if(e.shiftKey){e.preventDefault();e.stopImmediatePropagation();renderer.domElement.setPointerCapture(e.pointerId);}}
},true);
renderer.domElement.addEventListener('pointermove',e=>{if(!surfacePointer||surfacePointer.id!==e.pointerId)return;surfacePointer.distance=Math.max(surfacePointer.distance,Math.hypot(e.clientX-surfacePointer.x,e.clientY-surfacePointer.y));if(surfacePointer.additive){e.preventDefault();e.stopImmediatePropagation();}},true);
renderer.domElement.addEventListener('pointerup',e=>{
if(!surfacePointer||e.pointerId!==surfacePointer.id)return;const start=surfacePointer;surfacePointer=null;
if(start.additive){e.preventDefault();e.stopImmediatePropagation();if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);}
if(Math.max(start.distance,Math.hypot(e.clientX-start.x,e.clientY-start.y))>5)return;
pickSurfaceAt(e,start.additive);
},true);
// Walkthrough owns its drag gesture and forwards stationary scene clicks here.
function pickSurfaceAt(e,additive=false){
scene.updateMatrixWorld(true);rayFromPointer(e);
const hit=pickRay.intersectObjects([architecture,furn,roof,boxRoof],true).find(hit=>effectivelyVisible(hit.object)&&!(hit.object.material.transparent&&hit.object.material.opacity<.5));
const material=hit&&(Array.isArray(hit.object.material)?hit.object.material[hit.face.materialIndex]:hit.object.material),pickedKey=material?.userData.surfaceKey,key=surfaceAliases[pickedKey]||pickedKey;
if(!key){if(!additive){clearSurfaceSelection();surfaceUI();}return;}
selectSurface(key,additive);setSurfacePicking(true);
document.querySelector('[data-tab="materials"]').click();
}
renderer.domElement.addEventListener('pointercancel',()=>surfacePointer=null,true);
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&(pickingSurface||selectedSurfaces.size)){e.preventDefault();setSurfacePicking(false);surfaceUI();}});
$('arrange-toggle').onclick=()=>setArranging(!arranging);
document.querySelector('[data-tab="layout"]').addEventListener('click',()=>{if(walkthrough?.active)setSurfacePicking(false);else setArranging(true);});
$('object-select').onchange=()=>{if(walkthrough?.active)setSurfacePicking(false);else setArranging(true);selectFurniture(movableObjects.find(o=>o.userData.furniture.id===$('object-select').value)||null);};
$('deselect-object').onclick=()=>selectFurniture(null);
function moveSelected(dx,dz){if(!selectedFurniture)return;rememberLayout();selectedFurniture.position.x=THREE.MathUtils.clamp(selectedFurniture.position.x+dx,-2,16);selectedFurniture.position.z=THREE.MathUtils.clamp(selectedFurniture.position.z+dz,-2,11);syncObjectFields();saveLayout();}
function rotateSelected(degrees){if(!selectedFurniture)return;rememberLayout();selectedFurniture.rotation.y=THREE.MathUtils.degToRad((normalizedAngle(selectedFurniture.rotation.y)+degrees+360)%360);syncObjectFields();saveLayout();}
for(const [id,axis,min,max]of[['object-x','x',-2,16],['object-z','z',-2,11]])$(id).onchange=()=>{if(!selectedFurniture)return;const value=Number($(id).value);if($(id).value.trim()===''||!Number.isFinite(value)){syncObjectFields();return}rememberLayout();selectedFurniture.position[axis]=THREE.MathUtils.clamp(value,min,max);syncObjectFields();saveLayout();};
$('object-angle').oninput=()=>{if(!selectedFurniture)return;if(!rotationGesture){rememberLayout();rotationGesture=true;}selectedFurniture.rotation.y=THREE.MathUtils.degToRad(Number($('object-angle').value));syncObjectFields();saveLayout();};$('object-angle').onchange=()=>rotationGesture=false;
$('rotate-left').onclick=()=>rotateSelected(-15);$('rotate-right').onclick=()=>rotateSelected(15);$('flip-object').onclick=()=>rotateSelected(180);
document.querySelectorAll('[data-nudge]').forEach(button=>button.onclick=()=>{const [dx,dz]=button.dataset.nudge.split(',').map(Number);moveSelected(dx*.1,dz*.1);});
$('reset-object').onclick=()=>{if(!selectedFurniture)return;rememberLayout();const {x,z,angle}=selectedFurniture.userData.furniture.original;selectedFurniture.position.set(x,0,z);selectedFurniture.rotation.y=angle;syncObjectFields();saveLayout();};
$('reset-layout').onclick=()=>{rememberLayout();for(const object of movableObjects){const {x,z,angle}=object.userData.furniture.original;object.position.set(x,0,z);object.rotation.y=angle;}syncObjectFields();saveLayout();toast('Original furniture layout restored');};
$('undo-layout').onclick=()=>{const previous=layoutHistory.pop();if(previous){restoreSnapshot(previous);syncObjectFields();saveLayout();}$('undo-layout').disabled=layoutHistory.length===0;};
function rayFromPointer(event){const rect=renderer.domElement.getBoundingClientRect();pointerNDC.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);pickRay.setFromCamera(pointerNDC,camera);}
function effectivelyVisible(object){for(let p=object;p;p=p.parent)if(!p.visible)return false;return true;}
function pickFurniture(event){if(!furn.visible)return null;scene.updateMatrixWorld(true);rayFromPointer(event);const hits=pickRay.intersectObjects(movableObjects,true).filter(h=>effectivelyVisible(h.object));if(!hits.length)return null;const hit=hits[0];const blockers=pickRay.intersectObjects([architecture,roof,boxRoof,joists,beam],true).filter(h=>effectivelyVisible(h.object)&&!(h.object.material.transparent&&h.object.material.opacity<.5));if(blockers.some(h=>h.distance<hit.distance-.025))return null;let root=hit.object;while(root&&!root.userData.furniture)root=root.parent;return root?{object:root,point:hit.point}:null;}
const editorCanvas=renderer.domElement;
editorCanvas.addEventListener('pointerdown',event=>{
if(!arranging||event.button!==0||furnitureDrag)return;
const hit=pickFurniture(event);if(!hit)return;
event.preventDefault();event.stopImmediatePropagation();transition=null;controls.enabled=false;selectFurniture(hit.object);
furnitureDrag={pointerId:event.pointerId,object:hit.object,startX:event.clientX,startY:event.clientY,plane:new THREE.Plane(new THREE.Vector3(0,1,0),-hit.point.y),point:hit.point.clone(),origin:hit.object.position.clone(),before:layoutSnapshot(),moved:false};
editorCanvas.setPointerCapture(event.pointerId);editorCanvas.style.cursor='grabbing';
},true);
editorCanvas.addEventListener('pointermove',event=>{
if(!furnitureDrag||event.pointerId!==furnitureDrag.pointerId)return;
event.preventDefault();event.stopImmediatePropagation();const drag=furnitureDrag;if(!drag.moved&&Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)<4)return;
rayFromPointer(event);const point=pickRay.ray.intersectPlane(drag.plane,new THREE.Vector3());if(!point)return;
let x=drag.origin.x+point.x-drag.point.x,z=drag.origin.z+point.z-drag.point.z;if($('object-snap').checked){x=Math.round(x/.05)*.05;z=Math.round(z/.05)*.05;}
drag.object.position.set(THREE.MathUtils.clamp(x,-2,16),0,THREE.MathUtils.clamp(z,-2,11));drag.moved=true;syncObjectFields();
},true);
function finishFurnitureDrag(event,cancel=false){if(!furnitureDrag||event.pointerId!==furnitureDrag.pointerId)return;event.stopImmediatePropagation();const drag=furnitureDrag;furnitureDrag=null;if(cancel)restoreSnapshot(drag.before);else if(drag.moved){rememberLayout(drag.before);saveLayout();}controls.enabled=true;editorCanvas.style.cursor=arranging?'grab':'';if(editorCanvas.hasPointerCapture(event.pointerId))editorCanvas.releasePointerCapture(event.pointerId);syncObjectFields();}
editorCanvas.addEventListener('pointerup',event=>finishFurnitureDrag(event),true);editorCanvas.addEventListener('pointercancel',event=>finishFurnitureDrag(event,true),true);editorCanvas.addEventListener('lostpointercapture',event=>finishFurnitureDrag(event,true),true);
window.addEventListener('keydown',event=>{if(/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)||!selectedFurniture||furnitureDrag)return;if(walkthrough?.active){if(event.key==='Escape'){event.preventDefault();selectFurniture(null);}return;}const step=event.shiftKey?.01:.1;if(event.key==='Escape'){selectFurniture(null);return}const moves={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};if(moves[event.key]){event.preventDefault();moveSelected(...moves[event.key]);}else if(event.key.toLowerCase()==='r'){event.preventDefault();rotateSelected(event.shiftKey?-15:15);}else if((event.metaKey||event.ctrlKey)&&event.key==='z'){event.preventDefault();$('undo-layout').click();}});

// Complete local recovery and portable design export/import.
let designReady=false,applyingDesign=false,designSaveTimer=null,designEpoch=0,previousImportedDesign=null;
const designSpec={surfaces:Object.keys(defaults),surfaceDefaults:Object.fromEntries(Object.keys(surfaceMeta).map(key=>[key,defaults[key]])),surfaceParents,finishes:catalog.map(f=>f.id),furnitureIds:movableObjects.map(o=>o.userData.furniture.id)};
const designStorage=new Promise((resolve,reject)=>{try{const request=indexedDB.open('ivry-designs',1);request.onupgradeneeded=()=>request.result.createObjectStore('designs');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('Close older editor tabs and try saving again.'));}catch(error){reject(error)}});
designStorage.catch(()=>{});
async function designStore(mode,key,value){const db=await designStorage;return new Promise((resolve,reject)=>{const tx=db.transaction('designs',mode),store=tx.objectStore('designs');let result;const req=mode==='readwrite'?store.put(value,key):store.get(key);req.onsuccess=()=>result=req.result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Save was interrupted'));});}
function captureDesign(){const textures={},sources=new Map();for(const [key,texture]of Object.entries(customTextures)){if(!texture.userData.exportData)texture.userData.exportData=texture.image.toDataURL('image/webp',.86);const data=texture.userData.exportData;textures[key]=sources.has(data)?'@'+sources.get(data):data;if(!sources.has(data))sources.set(data,key);}return validateDesign({format:DESIGN_FORMAT,version:1,units:'metres',materials:structuredClone(state),recentColours:[...recentColours],furnitureColours:structuredClone(furnitureColours),textures,furniture:layoutSnapshot(),ceilings:{box:boxH,main:mainH}},designSpec);}
function queueDesignSave(){if(applyingDesign)return;designEpoch++;if(!designReady)return;window.ivrySharing?.changed();clearTimeout(designSaveTimer);$('design-status').textContent='Saving a recovery copy on this device…';designSaveTimer=setTimeout(()=>saveCompleteDesign(false),650);}
async function saveCompleteDesign(notify=true){clearTimeout(designSaveTimer);try{await designStore('readwrite','current',{design:captureDesign(),savedAt:new Date().toISOString(),sharedBase:window.ivrySharing?.base()||null});$('design-status').textContent='Saved on this device at '+new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})+'. Export a file for a portable backup.';if(notify)toast('Complete design saved on this device');return true;}catch(error){$('design-status').textContent='Local save failed: '+error.message+'. Export a design file to keep your changes.';if(notify)toast('Could not save locally. Please export the design.');return false;}}
function decodeDesignTexture(data){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{if(image.width>4096||image.height>4096){reject(new Error('An imported texture is larger than 4096 pixels.'));return}const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;canvas.getContext('2d').drawImage(image,0,0);const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;texture.userData.exportData=data;resolve(texture)};image.onerror=()=>reject(new Error('An imported texture could not be decoded.'));image.src=data;});}
async function applyCompleteDesign(input,{markChanged=true}={}){
const design=validateDesign(input,designSpec),startEpoch=designEpoch,decoded=new Map();const entries=await Promise.all(Object.keys(design.textures).map(async key=>{const data=resolveDesignTexture(design.textures,key);if(!decoded.has(data))decoded.set(data,decodeDesignTexture(data));const source=await decoded.get(data);return[key,source.clone()];}));for(const promise of decoded.values())(await promise).dispose();
if(designEpoch!==startEpoch){entries.forEach(([,texture])=>texture.dispose());throw new Error('The design changed while loading. Try again.');}
applyingDesign=true;
try{furnitureColours=structuredClone(design.furnitureColours||{});for(const [id,parts] of furnitureParts)applyFurnitureColours(parts,furnitureColours[id]);state=structuredClone(design.materials);recentColours=design.recentColours||recentColours;for(const m of Object.values(state))if(m.tint!=='#ffffff'&&!recentColours.includes(m.tint))recentColours=[...recentColours,m.tint].slice(0,12);renderRecentColours();for(const key of Object.keys(customTextures))delete customTextures[key];for(const [key,texture]of entries)customTextures[key]=texture;Object.keys(state).forEach(applyMaterial);restoreSnapshot(design.furniture);$('box-height').value=design.ceilings.box;$('main-height').value=design.ceilings.main;heights();surfaceUI();syncObjectFields();furnitureColourUI();layoutHistory.length=0;$('undo-layout').disabled=true;try{localStorage.setItem('ivry-recent-colours-v1',JSON.stringify(recentColours));localStorage.setItem('ivry-finishes-v1',JSON.stringify(state));localStorage.setItem('ivry-layout-v1',JSON.stringify(layoutSnapshot()));}catch{}}
finally{applyingDesign=false;}
if(markChanged)queueDesignSave();
}
function downloadDesign(){try{const document={...captureDesign(),exportedAt:new Date().toISOString()};const blob=new Blob([JSON.stringify(document,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ivry-design-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('design-status').textContent='Design file exported with furniture, finishes, textures and ceiling heights.';}catch(error){$('design-status').textContent='Export failed: '+error.message;}}
$('save-share').onclick=()=>$('save-dialog').showModal();$('close-save').onclick=()=>$('save-dialog').close();$('save-local').onclick=()=>saveCompleteDesign();$('export-design').onclick=downloadDesign;$('import-design').onclick=()=>$('design-file').click();
const undoImport=document.createElement('button');undoImport.className='wide';undoImport.textContent='Undo design import';undoImport.hidden=true;$('design-status').before(undoImport);undoImport.onclick=async()=>{if(!previousImportedDesign)return;try{await applyCompleteDesign(previousImportedDesign);previousImportedDesign=null;undoImport.hidden=true;await saveCompleteDesign(false);toast('Previous design restored');}catch(error){$('design-status').textContent=error.message;}};
$('design-file').onchange=async()=>{const file=$('design-file').files[0];if(!file)return;try{if(file.size>MAX_DESIGN_BYTES)throw new Error('Choose a design file smaller than 8 MB.');const design=validateDesign(JSON.parse(await file.text()),designSpec),before=captureDesign();await applyCompleteDesign(design);previousImportedDesign=before;undoImport.hidden=false;await saveCompleteDesign(false);$('design-status').textContent='Design imported. Use Save shared design to publish it to everyone.';toast('Complete design imported');}catch(error){$('design-status').textContent='Import failed: '+error.message;}finally{$('design-file').value='';}};
window.addEventListener('beforeunload',()=>{if(designReady&&!applyingDesign)saveCompleteDesign(false);});
window.ivryDesign={capture:captureDesign,apply:applyCompleteDesign,saveLocal:saveCompleteDesign,validate:input=>validateDesign(input,designSpec),fingerprint:designFingerprint,get epoch(){return designEpoch},get busy(){return !!furnitureDrag||applyingDesign}};
const recoveryEpoch=designEpoch;
const designRecovery=designStore('readonly','current').then(async saved=>{if(saved?.design&&designEpoch===recoveryEpoch&&!furnitureDrag){await applyCompleteDesign(saved.design,{markChanged:false});$('design-status').textContent='Complete design recovered from this device.';return{hasDraft:true,base:saved.sharedBase||null};}return{hasDraft:false,base:null};}).catch(error=>{$('design-status').textContent='Local recovery unavailable: '+error.message+'. Export files can still be used.';return{hasDraft:false,base:null};}).finally(()=>{designReady=true;});
window.ivryDesign.ready=designRecovery;window.dispatchEvent(new Event('ivry-design-ready'));

// Walkthrough is a local viewing mode; it never changes the shared design.
walkthrough=createWalkthrough({camera:perspective,canvas:renderer.domElement,viewport:$('viewport'),architecture,furniture:furn,notify:toast,
onSceneClick:(event,additive)=>{if(pickingSurface||additive)pickSurfaceAt(event,additive);else{const hit=pickFurniture(event);if(hit){selectFurniture(hit.object);showLayoutPanel();}}},
points:buildWalkPoints([
{id:'living',label:'Living room',x:10.8,z:6.45},{id:'dining',label:'Dining area',x:11.25,z:6.6},
{id:'kitchen',label:'Kitchen aisle',x:11.55,z:2.9},{id:'worktop',label:'Kitchen worktop',x:12,z:1.18},
{id:'entry',label:'Entry',x:9.8,z:2.6},{id:'front-door',label:'Entrance hall',x:8.05,z:2.8},
{id:'bathroom',label:'Bathroom',x:9.65,z:1.4},{id:'wc',label:'WC',x:8.0,z:1.45},
{id:'hall-east',label:'Hall · living end',x:8.0,z:4.25},{id:'hall-west',label:'Hall · bedrooms',x:5.0,z:4.35},
{id:'bedroom-1',label:'Bedroom 1',x:2.5,z:5.95},{id:'bedroom-2',label:'Bedroom 2',x:4.0,z:6.3},
{id:'office',label:'Office',x:7.0,z:6.2},{id:'shower',label:'Shower room',x:3.6,z:4.35}],[
{id:'living-kitchen',destination:'kitchen',path:[[10.8,6.45],[11.25,6.6],[11.25,5.7],[11.55,4.25],[11.55,2.9]]},
{id:'dining',destination:'dining',path:[[11.25,6.6],[11.25,8.1],[12.6,8.1]]},
{id:'worktop',destination:'worktop',path:[[11.55,2.9],[11.55,1.18],[12,1.18],[13.4,1.18]]},
{id:'hall',destination:'hall-east',path:[[11.55,4.25],[8.05,4.25],[5,4.35]]},
{id:'entrance',destination:'front-door',path:[[8.05,4.25],[8.05,2.8],[8.05,2.1]]},
{id:'wc-path',destination:'wc',path:[[8.05,2.1],[8,1.45]]},
{id:'entry-path',destination:'entry',path:[[8.05,2.8],[9.25,2.8],[9.8,2.6]]},
{id:'bath-path',destination:'bathroom',path:[[9.8,2.6],[9.65,2.1],[9.65,1.4]]},
{id:'shower',destination:'shower',path:[[5,4.35],[3.6,4.35],[1.3,4.35]]},
{id:'bedroom-1',destination:'bedroom-1',path:[[2.5,4.35],[2.5,5.95],[2.5,7.9]]},
{id:'bedroom-2',destination:'bedroom-2',path:[[5,4.35],[5.1,4.9],[5.1,5.8],[4,5.8],[4,7.5]]},
{id:'office',destination:'office',path:[[6.2,4.31],[6.2,5.8],[7,6.2],[7.2,7.3]]}
]),
onEnter:()=>{setSurfacePicking(false);walkReturnView=presets[activeView]?activeView:'overview';setArranging(false);transition=null;camera=perspective;controls.object=camera;controls.enabled=false;activeView='walkthrough';$('viewport').classList.add('interior');$('walk-start').classList.add('active');document.querySelectorAll('[data-view]').forEach(b=>b.classList.remove('active'));$('status').textContent='Eye level · 1.65 m';document.querySelector('.nav-help').textContent='Drag to look around · Click a floor point to move';},
onExit:restore=>{controls.target.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(3));controls.enabled=true;$('walk-start').classList.remove('active');$('wall-mode').onchange();document.querySelector('.nav-help').textContent='Drag to orbit · Scroll to zoom · Right-drag to pan';if(restore)setView(walkReturnView);}
});
$('walk-start').onclick=()=>walkthrough.active?walkthrough.exit():walkthrough.start();
