// Versioned, portable design format. Imported files are validated before changing the model.
export const DESIGN_FORMAT='ivry-design';
export const MAX_DESIGN_BYTES=8*1024*1024;
export function validateDesign(input,spec){
const bad=message=>{throw new Error(message);};
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const number=(v,min,max,label)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)bad('Invalid '+label);return v;};
if(!record(input)||input.format!==DESIGN_FORMAT||input.version!==1)bad('Choose an Ivry design export (version 1).');
if(input.units!=='metres')bad('The design must use metres.');
if(!record(input.materials)||!record(input.ceilings)||!record(input.textures))bad('The design is missing finishes or ceiling settings.');
const materials={},textures={};
for(const key of spec.surfaces){const missing=input.materials[key]===undefined;const parent=spec.surfaceParents?.[key];const m=missing?(parent?input.materials[parent]:spec.surfaceDefaults?.[key]):input.materials[key];if(!record(m)||!spec.finishes.includes(m.finish)||!/^#[0-9a-f]{6}$/i.test(m.tint))bad('Invalid finish for '+key);materials[key]={finish:m.finish,tint:m.tint,roughness:number(m.roughness,.1,1,'roughness'),scale:number(m.scale,.25,4,'texture scale')};
const texture=input.textures[key]??(missing&&parent&&input.textures[parent]!==undefined?'@'+parent:undefined);if(texture!==undefined){const data=texture;if(typeof data!=='string'||data.length>1500000||(!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(data)&&!(data.startsWith('@')&&spec.surfaces.includes(data.slice(1)))))bad('Invalid texture for '+key);textures[key]=data;}}
for(const key of Object.keys(textures))resolveDesignTexture(textures,key);
const ids=new Set(spec.furnitureIds);if(!Array.isArray(input.furniture)||input.furniture.length!==ids.size)bad('The furniture list does not match this apartment.');
const furniture=input.furniture.map(item=>{if(!record(item)||!ids.delete(item.id))bad('Unknown or duplicate furniture item');return{id:item.id,x:number(item.x,-2,16,'furniture X'),z:number(item.z,-2,11,'furniture Y'),angle:number(item.angle,-100*Math.PI,100*Math.PI,'rotation')};});
const ceilings={box:number(input.ceilings.box,2.4,3.4,'box ceiling'),main:number(input.ceilings.main,3.5,4.5,'main ceiling')};
const result={format:DESIGN_FORMAT,version:1,units:'metres',materials,textures,furniture,ceilings};
if(input.furnitureColours!==undefined){if(!record(input.furnitureColours))bad('Invalid furniture colours');const colours={};for(const [id,parts] of Object.entries(input.furnitureColours)){if(!spec.furnitureIds.includes(id)||!record(parts))bad('Unknown furniture colour target');colours[id]={};for(const [part,colour] of Object.entries(parts)){if(!['wood','upholstery','bedding'].includes(part)||typeof colour!=='string'||!/^#[0-9a-f]{6}$/i.test(colour))bad('Invalid furniture colour');colours[id][part]=colour;}}result.furnitureColours=colours;}
if(input.recentColours!==undefined){if(!Array.isArray(input.recentColours)||input.recentColours.length>12||input.recentColours.some(c=>typeof c!=='string'||!/^#[0-9a-f]{6}$/i.test(c)))bad('Invalid saved colour palette');result.recentColours=[...new Set(input.recentColours.map(c=>c.toLowerCase()))];}
if(JSON.stringify(result).length>MAX_DESIGN_BYTES)bad('This design is too large (maximum 8 MB).');
return result;
}
export function designFingerprint(design){return JSON.stringify({materials:design.materials,textures:design.textures,furniture:design.furniture,ceilings:design.ceilings,recentColours:design.recentColours,furnitureColours:design.furnitureColours});}

// References preserve a formerly shared texture without duplicating it per wall.
export function resolveDesignTexture(textures,key){
const seen=new Set();let data=textures[key];
while(typeof data==='string'&&data.startsWith('@')){if(seen.has(key))throw new Error('Cyclic texture reference');seen.add(key);key=data.slice(1);data=textures[key];}
if(typeof data!=='string'||!data.startsWith('data:image/'))throw new Error('Missing texture reference');return data;
}
