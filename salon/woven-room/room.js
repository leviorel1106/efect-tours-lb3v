import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
const base='../woven-room/';
const vertex=`
varying vec3 P,N,energy; varying vec2 st;
void main(){
 vec4 w=modelMatrix*vec4(position,1.);
 P=w.xyz;N=normalize(mat3(modelMatrix)*normal);st=uv;
 #ifdef UPHOLSTERY
 energy=pow(max(color.rgb,vec3(0.)),vec3(2.2))*6.;
 #else
 energy=vec3(0.);
 #endif
 gl_Position=projectionMatrix*viewMatrix*w;
}`;
const common=`
varying vec3 P,N,energy; varying vec2 st;
uniform sampler2D lightmap, panels, materialMap, art, coast;
uniform samplerCube roomProbe;
uniform float t,probeWeight;
#ifdef FURNITURE_LAYOUT
uniform vec4 models;
uniform sampler2D layoutLight,duneLight,pieceLight;
vec3 plate(vec2 uv,float index){
  vec2 tile=vec2(mod(index,4.),floor(index/4.));
  return pow(texture2D(pieceLight,(tile+clamp(uv,vec2(.0015),vec2(.9985)))/vec2(4.,5.)).rgb,vec3(2.4))*8.;
}
uniform float pendant,duneDetails;
uniform vec3 pendantTint;
vec3 floorLight(vec2 uv,float arrangement){
 vec2 tile=vec2(mod(arrangement,4.),floor(arrangement/4.));
 uv=clamp(uv,vec2(.0015),vec2(.9985));
 return pow(texture2D(layoutLight,(uv+tile)*.25).rgb,vec3(2.4))*8.;
}
float underPiece(vec2 xy,vec2 center,vec2 halfSize){
 vec2 delta=abs(xy-center)-halfSize;
 return 1.-smoothstep(.0,.26,max(delta.x,delta.y));
}
#endif
#ifdef EDIT_SURFACE
uniform vec3 finishTint;
#endif
#ifdef EDIT_WALLS
uniform vec3 shelfTint,kitchenWallTint;
uniform sampler2D veneer;
#endif
float luma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
vec3 skyColor(vec3 r){
 vec2 uv=vec2(fract(.115+atan(r.x,r.z)/6.2831853),.5+asin(clamp(r.y,-1.,1.))/3.14159);
 return pow(texture2D(coast,uv).rgb,vec3(2.4))*6.;
}
vec3 localReflection(vec3 p,vec3 r,float blur){
 vec3 lo=vec3(-6.04,0.,-8.),hi=vec3(11.,3.32,0.);
 vec3 bound=mix(lo,hi,step(vec3(0.),r));
 vec3 lengths=(bound-p)/(r+vec3(.00001));
 float d=max(.0,min(lengths.x,min(lengths.y,lengths.z)));
 vec3 sampleDir=p+d*r-vec3(1.3,1.55,-3.4);
 return textureCube(roomProbe,sampleDir,blur).rgb;
}
vec2 planar(vec3 n,vec3 p){
 vec3 a=abs(n);
 if(a.y>=max(a.x,a.z))return p.xz;
 return a.x>a.z?p.zy:p.xy;
}
vec3 clothSample(float id,vec2 uv){
 vec2 origin=vec2(mod(id,3.),floor(id/3.));
 return texture2D(panels,(origin+.01+clamp(uv,0.,1.)*.98)/vec2(3.,2.)).rgb;
}
float hash(vec2 uv){return fract(sin(dot(uv,vec2(124.7,79.32)))*43758.54);}
float noise(vec2 v){vec2 i=floor(v),f=fract(v);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
`;
function surfaceType(name){
 if(/Piping|linen|boucle|Cotton|white_cloth/i.test(name))return 'CLOTH';
 if(/jute/.test(name))return 'RUG';
 if(/travertine/.test(name))return 'TRAVERTINE';
 if(/limestone/.test(name))return 'STONE';
 if(/terracotta/.test(name))return 'CLAY';
 if(/oak|timber|bark/.test(name))return 'WOOD';
 if(/fire$/.test(name))return 'FIRE';
 if(/plaster/.test(name))return 'PLASTER';
 if(/canvas/.test(name))return 'ART';
 if(/ceramic|brass|dark_steel/.test(name))return 'GLAZE';
 if(/Paper/.test(name))return 'PAPER';
 return 'OTHER';
}
const fragment=common+`
void main(){
 vec3 n=normalize(N),v=normalize(cameraPosition-P);if(dot(n,v)<0.)n=-n;
 
 #ifdef FURNITURE_LAYOUT
 if(P.x< -10.94 && P.x> -11.205 && P.y>1.30 && P.y<2.20 && (abs(P.z+2.40)<.45 || abs(P.z+5.60)<.45))discard;
 if(P.x> -6.39 && P.x< -5.92 && P.z> -2.70 && P.z< -1.10 && P.y>-.004 && P.y<2.355)discard;
 #endif
 #if defined(FURNITURE_LAYOUT) && defined(LANTERN_PART)
 bool oldLamp=length(P.xz-vec2(1.70,-2.85))<.46 && P.y>2.18 && P.y<3.32;
 if(pendant>.5 && oldLamp)discard;
 #endif
 vec2 uv=planar(n,P);
 #ifdef UPHOLSTERY
 vec3 c=energy;
 #else
 vec3 c=pow(max(texture2D(lightmap,st).rgb,vec3(0.)),vec3(2.4))*8.;
 #endif
 #if defined(FURNITURE_LAYOUT) && (defined(RUG) || defined(STONE))
 vec3 swapped=min(vec3(1.),models.xyz);
 float seating=dot(swapped,vec3(1.,2.,4.));
 float arrangement=seating+8.*min(models.w,1.);
 vec2 floorXY=vec2(P.x,-P.z);
 if(arrangement>.5 && P.y<.035 && P.x>-2. && P.x<7. && P.z<0. && P.z>-7.5){
   vec2 mapUV=(floorXY+vec2(2.,0.))/vec2(9.,7.5);
   vec3 original=floorLight(mapUV,0.),updated=floorLight(mapUV,arrangement);
   if(any(greaterThan(models.xyz,vec3(1.5))) || models.w>2.5){
     vec3 emptyFloor=plate(mapUV,0.);
     vec3 denom=max(vec3(.002),emptyFloor);
     vec3 a=plate(mapUV,1.+models.x)/denom,b=plate(mapUV,5.+models.y)/denom;
     vec3 d=plate(mapUV,9.+models.z)/denom,e=plate(mapUV,13.+models.w)/denom;
     updated=emptyFloor*clamp(a*b*d*e,vec3(.045),vec3(1.48));
   }else if(models.w>1.5){
     vec2 cell=vec2(mod(seating,4.),floor(seating/4.));
     updated=pow(texture2D(duneLight,(cell+clamp(mapUV,vec2(.0015),vec2(.9985)))/vec2(4.,2.)).rgb,vec3(2.4))*8.;
   }
   float exposed=swapped.x*max(underPiece(floorXY,vec2(1.99,4.70),vec2(2.35,.69)),underPiece(floorXY,vec2(3.62,3.63),vec2(.62,.62)));
   exposed=max(exposed,swapped.y*underPiece(floorXY,vec2(0,1.6),vec2(.58)));
   exposed=max(exposed,swapped.z*underPiece(floorXY,vec2(1.8,1.2),vec2(.57)));
   exposed=max(exposed,min(models.w,1.)*underPiece(floorXY,vec2(1.7,2.85),vec2(.86,.51)));
   // A surface hidden by the old base has no usable photographic colour.
   // Restore its Cycles result, retaining the photographic transfer elsewhere.
   c=mix(c*clamp((updated+.003)/(original+.003),vec3(.08),vec3(5.)),updated,exposed);
 }
 #endif
 // Leaf shadows live on the sun's plane and stay at the same point as the eye moves.
 vec2 shadowCoord=P.xz+P.y*vec2(.90,1.45);
 float canopy=smoothstep(-1.5,.7,shadowCoord.x)*(1.-smoothstep(5.5,7.3,shadowCoord.x))*(1.-smoothstep(4.,6.5,-shadowCoord.y));
 float gap=noise(shadowCoord*3.1)*.48+noise(shadowCoord*10.3)*.33+noise(shadowCoord*27.2)*.19;
 float leaf=canopy*smoothstep(.42,.6,gap)*smoothstep(.26,1.8,luma(c));
 c*=mix(vec3(1.),vec3(.40,.44,.47),leaf*.79);
 float Y=luma(c),F=pow(1.-max(.0,dot(n,v)),5.);
 float gloss=.015,roughMip=6.;
 #ifdef CLOTH
 vec2 tile=uv*2.2;
 vec3 weave=texture2D(materialMap,tile).rgb-.502;
 float id=3.;vec2 sheet=fract(uv);
 #ifdef UPHOLSTERY
 bool loose=P.y>.53 && P.z> -4.99 && P.z< -4.68;
 if(n.y>.43 && P.y<.59 && P.z> -5.07){
   float module=floor((P.x+.075)/1.05);id=mod(module,2.);
   sheet=vec2(fract((P.x+.075)/1.05),fract((-P.z-4.03)/.95));if(mod(module,2.)>.5)sheet.x=1.-sheet.x;
 }else if(P.z< -5.12 && P.y<.713){
   id=3.;sheet=vec2(fract((P.x+.28)/1.15),clamp((.70-P.y)/.67,0.,1.));
 }else if(P.y>.46){
   id=loose?5.:2.;sheet=vec2(fract((P.x+.075)/1.05),clamp((.955-P.y)/.48,0.,1.));
 }else{id=4.;sheet=vec2(fract(uv.x/.96),clamp((.56-P.y)/.51,0.,1.));}
 #endif
 vec3 panel=clothSample(id,sheet)-.502;
 float broad=panel.r;
 float rake=dot(normalize(vec3(-.65,.45,.61)),n);
 c=mix(c,vec3(1.12,1.01,.84)*Y,.32);
 c*=clamp(1.+1.13*broad+.76*weave.r+(panel.g*.29+panel.b*.20)*rake,.55,1.52);
 c+=vec3(.019,.017,.015)*pow(1.-abs(dot(n,v)),2.5)*min(1.,.25+Y)*(.8+weave.r);
 gloss=.0;
 #endif
 #ifdef RUG
 vec2 q=uv*vec2(425.,390.);vec2 aa=fwidth(q);
 float rib=cos(6.283*q.y+.58*sin(q.x*3.14))*(1.-smoothstep(.2,.65,aa.y));
 vec3 weave=texture2D(materialMap,uv*vec2(1.6,2.6)).rgb;
 c*=.91+.13*rib+.93*(weave.r-.5);gloss=0.;
 #endif
 #ifdef TRAVERTINE
 vec3 trav=texture2D(materialMap,uv*vec2(.84,2.15)).rgb-.502;
 c*=vec3(1.04,.995,.89)*(1.+.68*trav.r);
 n=normalize(n+vec3(trav.g,0.,trav.b)*.085);gloss=.048;roughMip=3.6;
 #endif
 #ifdef CLAY
 vec2 polar=vec2(atan(n.x,n.z)/6.2831853,P.y);vec3 patina=texture2D(materialMap,polar*vec2(3.,3.5)).rgb-.502;
 c*=vec3(1.015,.96,.91)*(1.+patina*.87);gloss=.024;roughMip=4.;
 #endif
 #ifdef STONE
 vec3 stone=texture2D(materialMap,uv*.65).rgb-.502;
 c*=1.+.49*stone.r;
 n=normalize(n+vec3(stone.g,0.,stone.b)*.095);
 gloss=.047;roughMip=3.8;
 #endif
 #ifdef WOOD
 #ifdef REPLACED_BASE
 if(P.y<.17 && ((abs(P.x)<.65 && abs(P.z+1.6)<.61) || (abs(P.x-1.8)<.54 && abs(P.z+1.2)<.55)))discard;
 #endif
 bool beam=P.y>2.9;vec2 woodUV=beam?vec2(P.z*.38,(abs(n.x)>.6?P.y:P.x)*1.25):uv*vec2(.62,.89);
 vec3 grain=texture2D(materialMap,woodUV).rgb-.502;
 c*=vec3(1.03,.99,.94)*(1.+.58*grain.r);gloss=.027;roughMip=4.;
 #endif
 #ifdef PLASTER
 float dust=texture2D(materialMap,uv*.43).r-.502;c*=1.+dust*.29;gloss=0.;
 #endif
 #ifdef ART
 if(P.x>10.8){
   vec2 artUV=vec2((P.z+4.64)/1.98,(P.y-1.01)/1.38);
   vec2 bound=min(artUV,1.-artUV);
   if(min(bound.x,bound.y)>.077)c*=.40+.91*texture2D(art,artUV).rgb;
 }
 #endif
 #ifdef GLAZE
 gloss=.09;roughMip=3.1;
 #endif
 #ifdef PAPER
 c*=.95+.05*cos(P.y*3600.)*(1.-smoothstep(.1,.8,fwidth(P.y)*600.));
 #endif
 #ifdef FIRE
 float x=P.x*15., h=clamp((P.y-.195)/.105,0.,1.);
 float tongues=noise(vec2(x,t*.53))*.55+.36*noise(vec2(x*2.-h,t*1.37-h));
 float a=smoothstep(h-.075,h+.08,tongues);
 c=mix(vec3(.009,.005,.003),vec3(4.6,1.58,.19)*(1.-h*.62)+vec3(1.1,.64,.4)*pow(1.-h,4.),a);
 gloss=0.;
 #endif
 #ifdef EDIT_SURFACE
 // Colour the diffuse surface after local shadow/detail and before reflections.
 #if defined(EDIT_WALLS)
 bool shelving=P.z < -7.48 && P.z > -7.99 && P.x > -3.06 && P.x < 6.06 && P.y < 2.91 && P.y >= -.01;
 bool interior=P.x>=-6.36 && P.x<=11.04 && P.z>=-8.04 && P.z<=.041 && P.y>-.015 && P.y<3.3;
 if(P.x< -6.32 && P.y>.014 && P.y<3.29 && abs(N.y)<.95)c*=kitchenWallTint;
 else if(shelving){
   c*=shelfTint;
   if(duneDetails>.5 && P.z < -7.925 && P.y>.62 && abs(N.z)>.96){
     float bay=floor((P.x+3.)/1.5);
     vec2 grainUV=vec2(P.y*.58,(P.x+bay*.19)*1.36);
     float grain=texture2D(veneer,grainUV).r;
     c*=vec3(.68,.51,.355)*(.76+.44*grain);
   }
 }
 else if(interior && abs(N.y)<.95)c*=finishTint;
 #elif defined(EDIT_CURTAINS)
 if(P.z>-.30)c*=finishTint;
 #elif defined(EDIT_RUG)
 if(P.x<4.43 && P.y<.035){
   c*=finishTint;
   if(duneDetails>.5){
     vec2 edge=vec2(2.60,1.80)-abs(P.xz-vec2(1.80,-3.00));
     float inset=min(edge.x,edge.y);
     float border=(1.-smoothstep(.009,.019,abs(inset-.082)))+.80*(1.-smoothstep(.003,.012,abs(inset-.113)));
     c*=mix(vec3(1.),vec3(.55,.49,.38),min(1.,border));
   }
 }
 #ifdef LANTERN_PART
 if(oldLamp)c*=pendantTint;
 #endif
 #elif defined(EDIT_TABLE)
 if(P.y<.39 && abs(P.x-1.7)<.88 && abs(P.z+2.85)<.53){if(models.w>.5)discard;c*=finishTint;}
 #else
 c*=finishTint;
 #endif
 #endif
 #ifdef FURNITURE_LAYOUT
 #ifdef SOFA_FEET
 if(models.x>.5 && P.y<.063 && abs(P.z+4.68)<.65 && (abs(P.x+.20)<.04 || abs(P.x-4.)<.04))discard;
 #endif
 #endif
 if(gloss>0. && probeWeight>0.){
   vec3 reflected=localReflection(P,reflect(-v,n),roughMip);
   c+=reflected*gloss*(.56+F*2.1);
 }
 gl_FragColor=vec4(max(c,vec3(0.)),1.);
}`;

export async function installWoven(scene,oldModel,renderer,sky,sea,glass,fitFabric=null,finishes=null) {
 const compact=renderer.userData?.compactTour;
 const draco=new DRACOLoader();draco.setWorkerLimit(compact?1:3);draco.setDecoderPath('./vendor/examples/jsm/libs/draco/gltf/');
 const loader=new GLTFLoader().setDRACOLoader(draco),images=new THREE.TextureLoader();
 const names=['Shell','Objects','cloth-panels','weave','stone','grain','plaster','print','coastal-light','travertine','clay','jute'];
 const [room,outside,maps]=await Promise.all([loader.loadAsync(base+'room.glb?v=2'),loader.loadAsync(base+'outside.glb?v=3'),
  Promise.all(names.map(n=>images.loadAsync((fitFabric && (n==='Shell'||n==='Objects')?'../textile-room/':base)+n+'.webp?v=3')))]);
 const textures=Object.fromEntries(names.map((n,i)=>[n,maps[i]]));
 for(const k of names){
   const tex=textures[k];tex.anisotropy=Math.min(12,renderer.capabilities.getMaxAnisotropy());
   if(k==='Shell'||k==='Objects')tex.flipY=false;
   if(['weave','stone','grain','plaster','coastal-light','travertine','clay','jute'].includes(k))tex.wrapS=THREE.RepeatWrapping;
   if(['weave','stone','grain','plaster','travertine','clay','jute'].includes(k))tex.wrapT=THREE.RepeatWrapping;
   if(k==='cloth-panels')tex.flipY=false;
 }
 const coast=textures['coastal-light'];
 const skyBody='vec3 realSky(vec3 d){d=normalize(d);vec2 p=vec2(fract(.115+atan(d.x,d.z)/6.2831853),.5+asin(clamp(d.y,-1.,1.))/3.14159265);return pow(texture2D(coast,p).rgb,vec3(2.4))*6.;}';
 sky.material=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{coast:{value:coast}},vertexShader:'varying vec3 dir;void main(){dir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform sampler2D coast;varying vec3 dir;'+skyBody+'void main(){gl_FragColor=vec4(realSky(dir),1.);}'});
 // The distant waves and horizon belong to one capture, beyond the existing deck and pool.
 sea.material.fragmentShader='varying vec3 vW;uniform sampler2D coast;uniform float uT;'+skyBody+'void main(){vec3 d=normalize(vW-cameraPosition);d.y+=.00052*sin(vW.x*.015+uT*.74)*exp(-length(vW-cameraPosition)/1300.);gl_FragColor=vec4(realSky(d),1.);}';
 sea.material.uniforms.coast={value:coast};sea.material.needsUpdate=true;
 const cube=new THREE.WebGLCubeRenderTarget(compact?96:256,{type:renderer.extensions.has('EXT_color_buffer_float')?THREE.HalfFloatType:THREE.UnsignedByteType,generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter});
 const probe=new THREE.CubeCamera(.07,12000,cube);probe.position.set(1.3,1.55,-3.4);
 const time={value:0},enabled={value:0};
 const u={panels:{value:textures['cloth-panels']},art:{value:textures.print},coast:{value:coast},roomProbe:{value:cube.texture},t:time,probeWeight:enabled};
 if(finishes){
   const [light,duneLight,pieceLight]=await Promise.all(['layout-light','dune-light','collection-light'].map(name=>images.loadAsync('../textile-room/'+name+'.webp')));
   light.flipY=duneLight.flipY=pieceLight.flipY=false;u.pieceLight={value:pieceLight};u.kitchenWallTint=finishes.tint('kitchenWalls');
   u.veneer={value:textures.grain};u.duneLight={value:duneLight};u.pendant=finishes.pendant;u.pendantTint=finishes.tint('pendant');u.duneDetails=finishes.duneDetails;
   u.layoutLight={value:light};u.models=finishes.models;
 }
 for(const group of ['ARCH_IN','ARCH_OUT','LOW','FURN','FOL']){
   const prev=oldModel.getObjectByName(group);
   if(!prev)continue;
   prev.visible=false;
   const replacement=outside.scene.getObjectByName('Outside_'+group);
   if(replacement)replacement.traverse(o=>{if(o.isMesh)o.material=prev.material;});
 }
 scene.add(outside.scene);
 for(const groupName of ['Shell','Objects','Linen']){
   const group=room.scene.getObjectByName(groupName);
   if(!group)throw Error('Missing '+groupName);
   group.traverse(mesh=>{
     if(!mesh.isMesh)return;
     const type=surfaceType(mesh.material.name),linen=groupName==='Linen';
     const editableSurface=finishes?.roomSurface(groupName,mesh.material.name);
     mesh.userData.replacedChair=groupName==='Objects' && /boucle/i.test(mesh.material.name);
     const weave={CLOTH:'weave',RUG:'jute',STONE:'stone',TRAVERTINE:'travertine',CLAY:'clay',WOOD:'grain',PLASTER:'plaster'};
     mesh.material=new THREE.ShaderMaterial({side:THREE.DoubleSide,vertexColors:linen,vertexShader:vertex,fragmentShader:fragment,
       defines:{[type]:1,...(finishes && groupName==='Objects' && ['id_dark_steel','id_bulb','id_jute'].includes(mesh.material.name)?{LANTERN_PART:1}:{}),...editableSurface?.defines,...(finishes?{FURNITURE_LAYOUT:1}:{}),...(finishes&&mesh.material.name==='id_dark_steel'?{SOFA_FEET:1}:{}),...(fitFabric&&type==='WOOD'&&groupName==='Objects'?{REPLACED_BASE:1}:{}),...(linen?{UPHOLSTERY:1}:{})},
       uniforms:{...u,...editableSurface?.uniforms,materialMap:{value:textures[weave[type]||'plaster']},lightmap:{value:textures[groupName]||textures.Objects}}});
   });
 }
 scene.add(room.scene);
 if(finishes){
   const {installDunes}=await import('../textile-room/dunes.js?v=1');
   const {installCollection,finishTerrace}=await import('../textile-room/villa-collection.js?v=3');
   const [terraceLight]=await Promise.all([images.loadAsync('../textile-room/terrace-light.webp'),installDunes(scene,loader,finishes,textures.travertine),installCollection(scene,loader,finishes,textures,renderer)]);
   terraceLight.flipY=false;finishTerrace(oldModel,finishes,terraceLight);
 }
 if(fitFabric)await fitFabric({scene,room:room.scene,loader,renderer,finishes});
 scene.add(probe);
 // Avoid reading from the same cubemap while writing it.
 const neutral=new THREE.CubeTexture();
 const visibleGlass=oldModel.getObjectByName('GLASS');
 function refreshReflections(){
   const showGlass=visibleGlass?.visible;
   u.roomProbe.value=neutral;enabled.value=0;
   if(visibleGlass)visibleGlass.visible=false;
   try{probe.update(renderer,scene);}
   finally{
     if(visibleGlass)visibleGlass.visible=showGlass;
     u.roomProbe.value=cube.texture;enabled.value=1;
   }
 }
 refreshReflections();
 if(finishes && renderer.extensions.has('EXT_color_buffer_float')){
   const pmrem=new THREE.PMREMGenerator(renderer);
   scene.environment=pmrem.fromCubemap(cube.texture).texture;
   pmrem.dispose();
 }
 glass.uniforms.coast={value:coast};glass.uniforms.reflection={value:cube.texture};
 glass.fragmentShader='varying vec3 vW;varying vec3 vN;uniform sampler2D coast;uniform samplerCube reflection;'+skyBody+'void main(){vec3 v=normalize(vW-cameraPosition),n=normalize(vN);n=faceforward(n,v,n);float f=.035+.78*pow(1.-max(dot(-v,n),0.),5.);vec3 r=reflect(v,n);vec3 c=mix(realSky(r),textureCube(reflection,r,1.2).rgb,.80);gl_FragColor=vec4(c,clamp(f,.035,.74));}';glass.needsUpdate=true;
 draco.dispose();
 if(finishes){
   let queued;
   finishes.addEventListener('change',()=>{
     clearTimeout(queued);
     queued=setTimeout(refreshReflections,280);
   });
 }
 return seconds=>{time.value=seconds;};
}
