// Pure selection and palette operations shared by the UI and regression tests.
export function nextSurfaceSelection(current,key,additive=false){const next=new Set(additive?current:[]);if(additive&&next.has(key))next.delete(key);else next.add(key);return next;}
export function rememberColour(colours,colour){const normalized=colour.toLowerCase();if(!/^#[0-9a-f]{6}$/.test(normalized))throw new Error('Invalid colour');return [normalized,...colours.filter(c=>c.toLowerCase()!==normalized)].slice(0,12);}
export function selectionGeometry(mesh,selection){
const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
const indices=new Set(materials.flatMap((m,i)=>selection.has(m.userData.surfaceKey)?[i]:[]));if(!indices.size)return null;
const geometry=mesh.geometry.clone();
if(Array.isArray(mesh.material)){const groups=geometry.groups.filter(group=>indices.has(group.materialIndex));geometry.clearGroups();for(const group of groups)geometry.addGroup(group.start,group.count,0);}else{geometry.clearGroups();geometry.addGroup(0,geometry.index?.count||geometry.attributes.position.count,0);}
return geometry;
}
