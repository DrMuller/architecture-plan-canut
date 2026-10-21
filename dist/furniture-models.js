import * as THREE from './vendor/three.module.js';

// Dimensions are metres. Bevels stay within the specified furniture envelope.
export function softBoxGeometry(w,h,d,r=.03){
 const radius=Math.min(r,w/2,h/2,d/2),geo=new THREE.BoxGeometry(w,h,d,10,10,10),p=geo.attributes.position,n=geo.attributes.normal,core=new THREE.Vector3(w/2-radius,h/2-radius,d/2-radius),v=new THREE.Vector3(),q=new THREE.Vector3(),normal=new THREE.Vector3();
 const edgeSamples=half=>[-half,-half+radius*.1,-half+radius*.3,-half+radius*.6,-half+radius,0,half-radius,half-radius*.6,half-radius*.3,half-radius*.1,half];
 const samples=[w,h,d].map(size=>edgeSamples(size/2));
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);for(let axis=0;axis<3;axis++){const size=[w,h,d][axis],index=Math.round((v.getComponent(axis)/size+.5)*10);v.setComponent(axis,samples[axis][index]);}q.copy(v).clamp(core.clone().negate(),core);normal.copy(v).sub(q).normalize();v.copy(normal).multiplyScalar(radius).add(q);p.setXYZ(i,v.x,v.y,v.z);n.setXYZ(i,normal.x,normal.y,normal.z);}return geo;
}
export function createFurnitureMaterials(){
 function texture(kind){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#ededed';ctx.fillRect(0,0,256,256);let seed=981;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 if(kind==='cloth'){for(let i=0;i<256;i+=2){ctx.fillStyle=i%4?'#bababa':'#ffffff';ctx.fillRect(i,0,1,256);ctx.fillStyle='#b0b0b060';ctx.fillRect(0,i,256,1);}}else{for(let i=0;i<750;i++){const x=random()*256;ctx.strokeStyle=`rgba(75,75,75,${.04+random()*.14})`;ctx.lineWidth=.3+random()*.7;ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x+3,80,x-4,170,x+2,256);ctx.stroke();}}
 const map=new THREE.CanvasTexture(c);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(kind==='cloth'?4:1,kind==='cloth'?4:1);map.anisotropy=8;return map;}
 const weave=texture('cloth'),grain=texture('wood');grain.colorSpace=THREE.SRGBColorSpace;
 return {wood:new THREE.MeshStandardMaterial({color:'#bb956a',map:grain,roughness:.48}),cloth:new THREE.MeshStandardMaterial({color:'#b6b1a4',bumpMap:weave,bumpScale:.006,roughness:.94}),linen:new THREE.MeshStandardMaterial({color:'#eee9df',bumpMap:weave,bumpScale:.003,roughness:.95}),blanket:new THREE.MeshStandardMaterial({color:'#829383',bumpMap:weave,bumpScale:.008,roughness:.98}),metal:new THREE.MeshStandardMaterial({color:'#30332e',roughness:.36,metalness:.65}),seam:new THREE.MeshStandardMaterial({color:'#898477',roughness:1})};
}
export function furnitureBuilder(materials){
 const mesh=(parent,geometry,material,position,part)=>{const m=new THREE.Mesh(geometry,material);m.position.set(...position);m.castShadow=m.receiveShadow=true;if(part)m.userData.furniturePart=part;parent.add(m);return m;};
 const soft=(g,x,y,z,w,h,d,mat,part,r=.025)=>mesh(g,softBoxGeometry(w,h,d,r),mat,[x,y+h/2,z],part);
 const rod=(g,a,b,r1=.022,r2=.018,mat=materials.wood,part='wood')=>{const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),m=mesh(g,new THREE.CylinderGeometry(r2,r1,start.distanceTo(end),16),mat,start.clone().add(end).multiplyScalar(.5).toArray(),part);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());return m;};
 function sofa(width){const g=new THREE.Group(),arm=.12,inner=width-arm*2,count=width<1?1:width<1.9?2:3;
 for(const x of [-width/2+.14,width/2-.14])for(const z of [-.28,.28])rod(g,[x,.02,z],[x,.20,z],.022,.018);
 soft(g,0,.17,0,width,.19,.83,materials.cloth,'upholstery',.045);
 soft(g,0,.33,-.33,width,.48,.17,materials.cloth,'upholstery',.055);
 for(const x of [-width/2+arm/2,width/2-arm/2])soft(g,x,.30,.01,arm,.36,.80,materials.cloth,'upholstery',.055);
 for(let i=0;i<count;i++){const x=-inner/2+(i+.5)*inner/count;soft(g,x,.355,.065,inner/count-.014,.16,.60,materials.cloth,'upholstery',.06);const back=soft(g,x,.49,-.225,inner/count-.02,.29,.13,materials.cloth,'upholstery',.045);back.rotation.x=-.10;
 // Fine piping gives each seat a defined upholstered edge.
 soft(g,x,.397,.365,inner/count-.075,.006,.006,materials.cloth,'upholstery',.003);}
 if(width>1.9){for(const side of [-1,1]){const pillow=soft(g,side*(width/2-.29),.51,-.04,.28,.29,.12,materials.blanket,'bedding',.055);pillow.rotation.z=side*.18;pillow.rotation.x=-.15;}}
 return g;
 }
 function chair(){const g=new THREE.Group();for(const x of [-.17,.17])for(const z of [-.155,.155])rod(g,[x*1.12,.015,z*1.1],[x,.43,z],.018,.024);
 soft(g,0,.40,0,.46,.045,.45,materials.wood,'wood',.025);soft(g,0,.442,.01,.405,.055,.38,materials.cloth,'upholstery',.025);
 for(const x of [-.19,.19])rod(g,[x,.43,-.175],[x,.82,-.215],.018,.015);
 const back=soft(g,0,.65,-.20,.45,.17,.055,materials.wood,'wood',.026);back.rotation.x=-.12;
 for(const x of [-.17,.17])rod(g,[x,.20,-.15],[x,.20,.15],.009,.009);return g;
 }
 function bed(w,d){const g=new THREE.Group();for(const x of [-w/2+.1,w/2-.1])for(const z of [-d/2+.12,d/2-.12])rod(g,[x,.02,z],[x,.20,z],.027,.025);
 soft(g,0,.16,0,w,.22,d,materials.wood,'wood',.025);soft(g,0,.38,0,w-.03,.24,d-.03,materials.linen,'bedding',.07);
 soft(g,0,.20,-d/2,w+.04,.78,.07,materials.wood,'wood',.025);
 soft(g,0,.62,.18,w-.04,.10,d-.52,materials.linen,'bedding',.065);
 const count=w>1.2?2:1;for(let i=0;i<count;i++){const pillow=soft(g,(i-(count-1)/2)*w/count,.64,-d/2+.32,w/count-.14,.13,.43,materials.linen,'bedding',.06);pillow.rotation.y=(i%2?.025:-.025);}
 soft(g,0,.725,d/2-.36,w-.08,.025,.56,materials.blanket,'upholstery',.012);
 for(let i=0;i<8;i++)soft(g,0,.748,d/2-.60+i*.06,w-.11,.003,.008,materials.blanket,'upholstery',.001);return g;
 }
 function table(w,d,h){const g=new THREE.Group();soft(g,0,h,0,w,.05,d,materials.wood,'wood',.024);soft(g,0,h-.10,0,w-.15,.10,d-.15,materials.wood,'wood',.02);
 for(const x of [-w/2+.10,w/2-.10])for(const z of [-d/2+.12,d/2-.12])rod(g,[x*1.03,.01,z*1.02],[x,h,z],.024,.041);return g;
 }
 function coffee(){const g=new THREE.Group();mesh(g,new THREE.CylinderGeometry(.40,.395,.035,64),materials.wood,[0,.4475,0],'wood');mesh(g,new THREE.CylinderGeometry(.38,.39,.012,64),materials.wood,[0,.424,0],'wood');for(let i=0;i<3;i++){const a=i*Math.PI*2/3;rod(g,[Math.sin(a)*.28,.01,Math.cos(a)*.28],[Math.sin(a)*.18,.42,Math.cos(a)*.18],.019,.032);}return g;}
 function wardrobe(w,d){const g=new THREE.Group();soft(g,0,.08,0,w,2.6,d,materials.wood,'wood',.012);const count=Math.max(2,Math.round(w/.5));for(let i=0;i<count;i++){const x=-w/2+(i+.5)*w/count;soft(g,x,.10,d/2+.007,w/count-.007,2.56,.018,materials.wood,'wood',.006);rod(g,[x+w/count/2-.055,1.05,d/2+.035],[x+w/count/2-.055,1.23,d/2+.035],.006,.006,materials.metal,null);}soft(g,0,.01,0,w-.09,.075,d-.06,materials.metal,null,.01);return g;}
 return {sofa,chair,bed,table,coffee,wardrobe};
}
// Each editable part gets private material instances; adjacent chairs never share tint.
export function isolateFurnitureMaterials(object){const clones=new Map(),parts={};object.traverse(mesh=>{const part=mesh.userData.furniturePart;if(!mesh.isMesh||!part)return;const key=part+':'+mesh.material.uuid;if(!clones.has(key)){const m=mesh.material.clone();clones.set(key,m);(parts[part]??=[]).push({material:m,original:m.color.clone()});}mesh.material=clones.get(key);});return parts;}
export function applyFurnitureColours(parts,colours={}){for(const [part,entries] of Object.entries(parts))for(const {material,original} of entries){material.color.copy(original);if(colours[part])material.color.set(colours[part]);}}
