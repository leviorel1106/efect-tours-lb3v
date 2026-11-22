import * as THREE from 'three';
import {fitBase} from './ash.js';
import {installAlternatives} from './alternatives.js?v=2';

const vertex = `
attribute vec2 clothUV;
varying vec2 chart,st;
varying vec3 P,N;
uniform float layerDepth;
void main(){
  chart=uv;st=clothUV;
  vec4 world=modelMatrix*vec4(position+normal*layerDepth,1.);
  P=world.xyz;N=normalize(mat3(modelMatrix)*normal);
  gl_Position=projectionMatrix*viewMatrix*world;
}`;
const fragment = `
varying vec2 chart,st;
varying vec3 P,N;
uniform sampler2D reference, optical, relief, fibers, response, drape;
uniform float loops, cord, layerDepth;
uniform vec3 finishTint, eastChairTint, westChairTint;
uniform vec4 models;
const mat3 to2020=mat3(.6274,.0691,.0164,.3293,.9195,.0880,.0433,.0113,.8956);
const mat3 from2020=mat3(1.6605,-.1246,-.0182,-.5876,1.1329,-.1006,-.0728,-.0083,1.1187);
const mat3 inset=mat3(.856627,.137319,.111898,.095121,.761242,.076799,.048252,.101439,.811302);
const mat3 outset=mat3(1.127101,-.141330,-.141330,-.110607,1.157824,-.110607,-.016494,-.016494,1.251936);
float undoContrast(float x){
  vec2 parts=texture2D(response,vec2(clamp(x,.001,.997),.5)).rg;
  return (parts.x*65280.+parts.y*255.)/65535.;
}
vec3 cameraLight(vec3 rgb){
  vec3 lin=mix(rgb/12.92,pow((rgb+.055)/1.055,vec3(2.4)),step(.04045,rgb));
  vec3 value=inverse(outset)*pow(max(to2020*lin,vec3(0.)),vec3(1./2.2));
  vec3 logColor=vec3(undoContrast(value.r),undoContrast(value.g),undoContrast(value.b));
  return max(vec3(.0001),from2020*inverse(inset)*exp2(logColor*16.5-12.47393))/1.375;
}
void main(){
  if((P.z < -2.5 ? models.x : (P.x>.93 ? models.z : models.y))>.5)discard;
  vec4 captured=texture2D(reference,chart);
  vec3 cover=captured.rgb;
  float y=dot(cover,vec3(.2126,.7152,.0722));
  cover=mix(cover,vec3(1.065,1.012,.925)*y,.22);
  cover+=mix(vec3(.023,.023,.020),vec3(0.),loops);
  cover-=vec3(loops*.22*max(0.,y-.67));
  vec3 light=cameraLight(clamp(cover,.01,.965));
  // Binding and pile use the same dye as the cover beneath them. The needles
  // of reflected window light below retain the colour of the illuminant.
  vec3 dye=finishTint;
  if(P.z>-2.5) dye=P.x>.93?eastChairTint:westChairTint;
  light*=dye;
  vec3 n=normalize(N),v=normalize(cameraPosition-P);
  if(dot(n,v)<0.)n=-n;
  vec2 coord=st/vec2(mix(.271,.315,loops),mix(.271,.390,loops));
  vec2 dx=dFdx(coord),dy=dFdy(coord);
  vec3 px=dFdx(P),py=dFdy(P);
  float det=dx.x*dy.y-dx.y*dy.x;
  vec3 tangent=(px*dy.y-py*dx.y)*(det<0.?-1.:1.);
  tangent-=n*dot(n,tangent);
  tangent=normalize(tangent+vec3(.00000001));
  vec3 binormal=normalize(cross(n,tangent));
  if(dot(binormal,(-px*dy.x+py*dx.x)*sign(det))<0.)binormal=-binormal;
  vec3 relief0=texture2D(relief,coord).rgb;
  vec2 shift=vec2(dot(tangent,v),dot(binormal,v))/max(.32,dot(n,v));
  vec2 displaced=coord-shift*(relief0.b-.50)*mix(.0024,.0083,loops);
  vec3 sampleNormal=texture2D(relief,displaced).rgb;
  vec3 scan=texture2D(optical,displaced).rgb;
  vec3 direction=texture2D(fibers,displaced).rgb;
  vec3 dr=texture2D(drape,chart).rgb-.502;
  vec2 slope=2.*sampleNormal.rg-1.+dr.gb*.81;
  vec3 ns=normalize(n+(tangent*slope.x+binormal*slope.y)*mix(.82,1.04,loops));
  vec3 window=normalize(vec3(1.4,2.05,.38)-P);
  vec3 sun=normalize(vec3(-.36,.44,.82));
  float facing=max(dot(v,n),0.);
  float micro=dot(ns-n,window)*.50+dot(ns-n,sun)*.22;
  float albedo=(scan.r-.5)*mix(.95,1.06,loops)+.77*dr.r;
  float occlusion=mix(.74,1.06,scan.g);
  vec3 c=light*max(.38,(1.+albedo+micro)*occlusion);
  vec3 halfDir=normalize(v+window);
  vec2 orientation=normalize(direction.rg*2.-1.+.0001);
  vec3 yarn=normalize(tangent*orientation.x+binormal*orientation.y);
  float sheen=pow(1.-max(dot(v,halfDir),0.),3.) + .42*pow(1.-facing,2.2);
  float directional=mix(.83,1.47,abs(dot(yarn,halfDir))*direction.b);
  float softLight=.23+.77*captured.a;
  c+=vec3(1.,.905,.77)*softLight*directional*sheen*(.042+.058*loops)*(.35+.65*scan.b);
  if(cord>.5)c=light*(.67+.10*scan.r+.05*micro);
  if(layerDepth>0.){
    float h=layerDepth/.00225;
    float wisps=smoothstep(.27+.40*h,.65+.34*h,sampleNormal.b);
    float opacity=wisps*(.13+.40*pow(1.-facing,1.4));
    if(opacity<.034)discard;
    gl_FragColor=vec4(c*(1.+.18*h),opacity);
  }else{gl_FragColor=vec4(c,1.);}
}`;

export async function fitTextiles({scene,room,loader,renderer,finishes}){
 const base='../textile-room/',load=new THREE.TextureLoader();
 const names=['photographic.webp','response.png','drape.webp',...['linen','loops'].flatMap(k=>['surface','relief','fiber'].map(t=>k+'-'+t+'.webp'))];
 const [model,seam,chairsBase,grain,maps]=await Promise.all([loader.loadAsync(base+'furniture.glb?v=final'),loader.loadAsync(base+'stitch.glb?v=final'),loader.loadAsync(base+'base.glb'),load.loadAsync('../woven-room/grain.webp'),Promise.all(names.map(n=>load.loadAsync(base+n+'?v=6')))]);
 const tex=Object.fromEntries(names.map((key,i)=>[key,maps[i]]));
 Object.entries(tex).forEach(([key,t])=>{
    t.flipY=false;t.anisotropy=Math.min(12,renderer.capabilities.getMaxAnisotropy());
    if(key.startsWith('linen')||key.startsWith('loops'))t.wrapS=t.wrapT=THREE.RepeatWrapping;
    if(key==='response.png'){t.generateMipmaps=false;t.minFilter=THREE.LinearFilter;}
 });
 room.getObjectByName('Linen').visible=false;
 room.getObjectByName('Objects').traverse(o=>{if(o.userData.replacedChair)o.visible=false;});
 const extra=[];
 model.scene.add(seam.scene);
 model.scene.traverse(o=>{
   if(!o.isMesh)return;
   const name=o.material.name,fluffy=/chair|cushionWool/.test(name),family=fluffy?'loops':'linen';
   if(/seatCord/.test(name)){o.visible=false;return;}
   const objectUV=o.geometry.attributes.uv1;
   if(!objectUV)throw Error('Missing metric panel UV');
   o.geometry.setAttribute('clothUV',objectUV);
   const uniforms={drape:{value:tex['drape.webp']},reference:{value:tex['photographic.webp']},response:{value:tex['response.png']},
     models:finishes.models,finishTint:finishes.tint(name==='textile_cotton'?'throw':'sofa'),eastChairTint:finishes.tint('eastChair'),westChairTint:finishes.tint('westChair'),
     optical:{value:tex[family+'-surface.webp']},relief:{value:tex[family+'-relief.webp']},fibers:{value:tex[family+'-fiber.webp']},
     loops:{value:fluffy?1:0},cord:{value:name==='stitch'?1:0},layerDepth:{value:0}};
   o.material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,side:THREE.DoubleSide,uniforms});
   if(fluffy && !renderer.userData?.compactTour){
     for(const distance of [.00085,.0018]){
       const outer=o.clone(false);
       outer.material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:{...uniforms,layerDepth:{value:distance}},side:THREE.FrontSide,transparent:true,depthWrite:false});
       extra.push([o.parent,outer]);
     }
   }
 });
 for(const [parent,shell] of extra)parent.add(shell);
 scene.add(model.scene);grain.wrapS=grain.wrapT=THREE.RepeatWrapping;
 fitBase(scene,chairsBase.scene,grain,finishes);
 await installAlternatives(scene,loader,finishes,renderer);
}
