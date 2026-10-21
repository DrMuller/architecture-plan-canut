// Tile dimensions are metres. Mapping uses world positions, never stretched mesh UVs.
export const TILE_SIZE=.05;
export const GROUT_SIZE=.002;
export function configureTiles(material,axis){
material.onBeforeCompile=shader=>{
shader.vertexShader='varying vec3 vTileWorld;\n'+shader.vertexShader;
shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvTileWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
shader.fragmentShader='varying vec3 vTileWorld;\n'+shader.fragmentShader;
const coordinates=axis==='floor'?'vTileWorld.xz':axis==='z'?'vTileWorld.zy':'vTileWorld.xy';
shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
vec2 tileUV=${coordinates}/${TILE_SIZE+GROUT_SIZE};
vec2 edge=min(fract(tileUV),1.0-fract(tileUV));
vec2 aa=max(fwidth(tileUV),vec2(0.0001));
vec2 interior=smoothstep(vec2(${GROUT_SIZE/(2*(TILE_SIZE+GROUT_SIZE))})-aa*0.5,vec2(${GROUT_SIZE/(2*(TILE_SIZE+GROUT_SIZE))})+aa*0.5,edge);
float tileMask=interior.x*interior.y;
diffuseColor.rgb=mix(vec3(0.58,0.57,0.53),diffuseColor.rgb,tileMask);`);
};
material.customProgramCacheKey=()=>`ivry-tiles-5cm-${axis}`;
}
