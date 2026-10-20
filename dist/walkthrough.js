import * as THREE from 'three';

export function walkDirection(yaw,pitch){const c=Math.cos(pitch);return {x:Math.sin(yaw)*c,y:Math.sin(pitch),z:-Math.cos(yaw)*c};}
export function turnHead(yaw,pitch,dx,dy){return {yaw:yaw-dx*.004,pitch:Math.max(-1.25,Math.min(1.25,pitch+dy*.0035))};}
export function isWalkClick(maxDistance){return maxDistance<=6;}

export function createWalkthrough({camera,canvas,viewport,architecture,furniture,points,onEnter,onExit,notify}){
 const eyeHeight=1.65,ray=new THREE.Raycaster(),bounds=new THREE.Box3();
 let active=false,yaw=0,pitch=-.22,current=null,gesture=null,lastMarkers=0;
 const markerLayer=document.createElement('div');markerLayer.className='walk-markers';markerLayer.hidden=true;viewport.append(markerLayer);
 const panel=document.createElement('div');panel.className='walk-panel';panel.hidden=true;
 const location=document.createElement('span');location.className='walk-location';location.setAttribute('role','status');
 const label=document.createElement('label');label.textContent='Jump to ';const menu=document.createElement('select');menu.setAttribute('aria-label','Walkthrough destination');label.append(menu);
 const exitButton=document.createElement('button');exitButton.textContent='Exit walkthrough';exitButton.onclick=()=>exit();
 const hint=document.createElement('small');hint.textContent='Click a floor point · Drag to look · Arrow keys to turn · Esc to exit';
 panel.append(location,label,exitButton,hint);viewport.append(panel);
 const flash=document.createElement('div');flash.className='walk-flash';viewport.append(flash);
 const entries=points.map(point=>{const button=document.createElement('button');button.className='walk-point';button.dataset.walkId=point.id;button.setAttribute('aria-label','Walk to '+point.label);button.title=point.label;const ring=document.createElement('span');ring.textContent='⌃';const text=document.createElement('small');text.textContent=point.label;button.append(ring,text);button.onclick=e=>{if(e.detail===0)jump(point.id);};markerLayer.append(button);const option=document.createElement('option');option.value=point.id;option.textContent=point.label;menu.append(option);return {...point,button,option,position:new THREE.Vector3(point.x,.08,point.z)};});
 const visible=object=>{for(let p=object;p;p=p.parent)if(!p.visible)return false;return true;};
 function obstacles(){const result=[];furniture.updateWorldMatrix(true,true);furniture.traverse(mesh=>{if(!mesh.isMesh||!visible(mesh))return;bounds.setFromObject(mesh);if(bounds.max.y>=.16&&bounds.min.y<=eyeHeight+.15)result.push(bounds.clone());});return result;}
 function occupied(point,boxes=obstacles()){return boxes.some(b=>point.x>b.min.x-.10&&point.x<b.max.x+.10&&point.z>b.min.z-.10&&point.z<b.max.z+.10);}
 function orient(){const d=walkDirection(yaw,pitch);camera.lookAt(camera.position.x+d.x,camera.position.y+d.y,camera.position.z+d.z);camera.updateMatrixWorld();}
 function jump(id,{first=false}={}){const point=entries.find(p=>p.id===id);if(!point)return false;if(occupied(point)){notify('This point is occupied by furniture. Choose another spot.');menu.value=current?.id||'';return false;}
  current=point;camera.position.set(point.x,eyeHeight,point.z);orient();location.textContent='Walkthrough · '+point.label;menu.value=point.id;lastMarkers=0;
  if(!first&&!matchMedia('(prefers-reduced-motion: reduce)').matches){flash.classList.remove('jumping');void flash.offsetWidth;flash.classList.add('jumping');}return true;
 }
 function start(){if(active)return;const point=entries.find(p=>!occupied(p));if(!point){notify('Move furniture to clear a walkthrough point.');return;}
  active=true;onEnter();yaw=0;pitch=-.22;camera.fov=74;camera.zoom=1;camera.updateProjectionMatrix();markerLayer.hidden=false;panel.hidden=false;viewport.classList.add('walkthrough');canvas.tabIndex=0;canvas.focus({preventScroll:true});jump(point.id,{first:true});
 }
 function exit(restore=true){if(!active)return;active=false;cancelGesture();markerLayer.hidden=true;panel.hidden=true;viewport.classList.remove('walkthrough');flash.classList.remove('jumping');onExit(restore);}
 menu.onchange=()=>jump(menu.value);
 function update(time){if(!active)return;orient();if(time-lastMarkers<120)return;lastMarkers=time;
  architecture.updateWorldMatrix(true,true);furniture.updateWorldMatrix(true,true);const rect=canvas.getBoundingClientRect(),boxes=obstacles();
  for(const point of entries){const blocked=occupied(point,boxes);point.option.disabled=blocked;let show=point!==current&&!blocked;const projected=point.position.clone().project(camera);
   show=show&&projected.z>-1&&projected.z<1&&Math.abs(projected.x)<.94&&Math.abs(projected.y)<.85;
   if(show){const direction=point.position.clone().sub(camera.position),distance=direction.length();ray.set(camera.position,direction.normalize());ray.far=distance-.10;show=!ray.intersectObjects([architecture,furniture],true).some(hit=>visible(hit.object)&&!(hit.object.material.transparent&&hit.object.material.opacity<.5));}
   point.button.hidden=!show;if(show){point.button.style.left=(projected.x*.5+.5)*rect.width+'px';point.button.style.top=(-projected.y*.5+.5)*rect.height+'px';}
  }
 }
 function isSceneTarget(target){return target===canvas||markerLayer.contains(target);}
 function cancelGesture(){if(gesture&&viewport.hasPointerCapture(gesture.id))viewport.releasePointerCapture(gesture.id);gesture=null;viewport.classList.remove('looking');}
 viewport.addEventListener('pointerdown',e=>{if(!active||!isSceneTarget(e.target)||e.button!==0)return;e.preventDefault();e.stopImmediatePropagation();if(gesture)return;gesture={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,maxDistance:0,destination:e.target.closest('[data-walk-id]')?.dataset.walkId};viewport.setPointerCapture(e.pointerId);viewport.classList.add('looking');},true);
 viewport.addEventListener('pointermove',e=>{if(!active||!gesture||gesture.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const next=turnHead(yaw,pitch,e.clientX-gesture.x,e.clientY-gesture.y);yaw=next.yaw;pitch=next.pitch;gesture.x=e.clientX;gesture.y=e.clientY;gesture.maxDistance=Math.max(gesture.maxDistance,Math.hypot(e.clientX-gesture.startX,e.clientY-gesture.startY));lastMarkers=0;},true);
 viewport.addEventListener('pointerup',e=>{if(!gesture||gesture.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const saved=gesture;cancelGesture();if(isWalkClick(saved.maxDistance)&&saved.destination)jump(saved.destination);},true);
 for(const event of ['pointercancel','lostpointercapture'])viewport.addEventListener(event,e=>{if(gesture?.id===e.pointerId)cancelGesture();},true);
 viewport.addEventListener('wheel',e=>{if(!active||!isSceneTarget(e.target))return;e.preventDefault();e.stopImmediatePropagation();zoom(e.deltaY>0?1.04:.96);},{capture:true,passive:false});
 window.addEventListener('blur',cancelGesture);
 window.addEventListener('keydown',e=>{if(!active||document.querySelector('dialog[open]')||e.target.closest('input,select,textarea,[contenteditable=true]'))return;const turns={ArrowLeft:[-.12,0],ArrowRight:[.12,0],ArrowUp:[0,.09],ArrowDown:[0,-.09]};if(e.key==='Escape'){e.preventDefault();exit();}else if(turns[e.key]){e.preventDefault();yaw+=turns[e.key][0];pitch=Math.max(-1.25,Math.min(1.25,pitch+turns[e.key][1]));lastMarkers=0;}});
 function zoom(factor){camera.fov=Math.max(45,Math.min(85,camera.fov*factor));camera.updateProjectionMatrix();lastMarkers=0;}
 return {start,exit,update,zoom,get active(){return active;}};
}
