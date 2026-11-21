import * as THREE from 'three';
import {models,modelList} from './design-library.js';

const pigmented={sofa:'fabric',westChair:'fabric',eastChair:'fabric',table:null,cabinetry:null,island:'island',stools:'stool',diningTable:'outTable',diningChairs:'outSeat',loungers:'outFabric'};
const matte=new Set(['fabric','stool','outFabric','outSeat','piping','cord']);
const timber=new Set(['walnut','oak','island','outTable']);
function finishMaterial(source,kind,maps,patio=false){
  const mat=source.clone();
  const isCloth=matte.has(kind)||kind==='boucle',isWood=timber.has(kind);
  if(['metal','brass','steel','black','light','olive','shadow'].includes(kind)){
    if(kind==='light'){mat.emissive.set('#ffe3ad');mat.emissiveIntensity=.6;}
    if(kind==='olive')mat.color.set('#95925f');
    return mat;
  }
  const tex=isCloth?(kind==='boucle'?maps.loops:maps.linen):isWood?maps.grain:kind==='paint'||kind==='porcelain'||kind==='plaster'?maps.plaster:maps.travertine;
  mat.onBeforeCompile=s=>{
    s.uniforms.detailTexture={value:tex};s.uniforms.yarnRelief={value:kind==='boucle'?maps.loopsRelief:maps.linenRelief};
    s.vertexShader='varying vec3 objectPoint,finishProjectionNormal,finishWorldPoint;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nobjectPoint=position;finishProjectionNormal=normal;finishWorldPoint=(modelMatrix*vec4(position,1.)).xyz;');
    s.fragmentShader='varying vec3 objectPoint,finishProjectionNormal,finishWorldPoint;uniform sampler2D detailTexture,yarnRelief;\n'+s.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      vec3 weight=pow(abs(finishProjectionNormal/max(length(finishProjectionNormal),.00001)),vec3(5.));weight/=max(.001,dot(weight,vec3(1.)));
      vec3 pt=objectPoint;
      float d=dot(weight,vec3(texture2D(detailTexture,pt.zy*FIELD).r,texture2D(detailTexture,pt.xz*FIELD).r,texture2D(detailTexture,pt.xy*FIELD).r));
      diffuseColor.rgb*=1.+(d-.50)*DETAIL;
      ${isCloth?`vec2 coords=abs(finishProjectionNormal.y)>.55?pt.xz:abs(finishProjectionNormal.z)>.55?pt.xy:pt.zy;
        vec3 weave=texture2D(yarnRelief,coords*1.52).rgb;
        diffuseColor.rgb*=.91+.21*weave.b+.22*(weave.r-.5)-.16*(weave.g-.5);
        float slub=sin(coords.y*971.+2.*sin(coords.x*41.))*(1.-smoothstep(.20,1.,fwidth(coords.y)*971.));
        diffuseColor.rgb*=1.+.038*slub;`:''}
    `.replaceAll('FIELD',isCloth?'vec2(1.55,1.55)':isWood?'vec2(.62,1.65)':'vec2(.92,1.72)').replace('DETAIL',isCloth?'1.12':isWood?'1.18':(kind==='plaster'?'.30':'.66')));
    if(isCloth)s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`
      #include <normal_fragment_maps>
      vec3 yarnX=dFdx(-vViewPosition),yarnY=dFdy(-vViewPosition);
      vec2 stitchX=dFdx(coords),stitchY=dFdy(coords);
      vec3 warp=yarnX*stitchY.y-yarnY*stitchX.y;
      vec3 weft=yarnY*stitchX.x-yarnX*stitchY.x;
      float scaleYarn=inversesqrt(max(1.e-12,max(dot(warp,warp),dot(weft,weft))));
      normal=normalize(normal+.25*scaleYarn*(warp*(weave.r*2.-1.)+weft*(weave.g*2.-1.)));`);
    if(patio)s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>',`
      vec2 hit=finishWorldPoint.xz+vec2(-1.37,1.25)*max(0.,2.97-finishWorldPoint.y);
      float under=step(-14.1,hit.x)*step(hit.x,-7.)*step(.51,hit.y)*step(hit.y,6.13);
      float band=abs(fract((hit.x+13.95)/.203+.5)-.5);
      float strip=1.-smoothstep(.09,.24,band);
      outgoingLight*=1.-under*.26*strip;
      #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey=()=>kind+(patio?'pergola':'inside');
  return mat;
}

const placements={
 sofa:[[1.85,0,-4.64,0]],westChair:[[0,0,-1.6,2.60]],eastChair:[[1.8,0,-1.2,3.30]],table:[[1.7,0,-2.85,0]],
 cabinetry:[[-8.68,0,-7.56,0]],island:[[-8.72,0,-4.16,0]],stools:[[-7.95,0,-3.64,-Math.PI/2],[-7.95,0,-4.68,-Math.PI/2]],
 diningTable:[[-10.2,0,3.30,0]],diningChairs:[],loungers:[[-3.6,0,5.60,0],[-2.30,0,5.60,0]]
};
for(let i=0;i<4;i++)for(const side of [-1,1]){
  placements.diningChairs.push([-11.4+i*.8,0,3.3+side*.78,side>0?Math.PI:0]);
}
placements.diningChairs.push([-12.25,0,3.3,Math.PI/2],[-8.15,0,3.3,-Math.PI/2]);

function veneerKind(id,variant,kind){
  if(id==='island' && kind==='island')return variant===0?'stone':'oak';
  if(id==='diningTable' && kind==='outTable')return variant===1?'stone':'oak';
  if(id==='countertop')return 'stone';
  return kind;
}

function contact(scene,x,z,w,d,opacity){
  const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,
    uniforms:{power:{value:opacity}},vertexShader:'varying vec2 st; void main(){st=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec2 st;uniform float power;void main(){float shade=1.-smoothstep(.48,1.,length(st));gl_FragColor=vec4(.09,.067,.045,power*shade);}'});
  const obj=new THREE.Mesh(new THREE.PlaneGeometry(w,d),mat);obj.rotation.x=-Math.PI/2;obj.position.set(x,.019,z);scene.add(obj);
}
export async function installCollection(scene,loader,state,textures,renderer){
  const files=[...new Set(Object.values(models).flat().map(row=>row[2]).filter(Boolean))];
  const scanLoader=new THREE.TextureLoader();
  const scanFiles=['linen-surface','loops-surface','linen-relief','loops-relief'];
  const scans=await Promise.all(scanFiles.map(name=>scanLoader.loadAsync('../textile-room/'+name+'.webp?v=6')));
  for(const tex of scans){tex.flipY=false;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}
  Object.assign(textures,{linen:scans[0],loops:scans[1],linenRelief:scans[2],loopsRelief:scans[3]});
  const templates=new Map(await Promise.all(files.map(async file=>[file,(await loader.loadAsync(new URL('collection/'+file+'.glb',import.meta.url).href)).scene])));
  const records=[];
  for(const [id,poses] of Object.entries(placements)){
    modelList(id).forEach(([,pigment,file],index)=>{
      if(!file)return;
      const group=new THREE.Group(), dyes=[],counters=[];
      const shape=templates.get(file).clone(true);
      shape.traverse(mesh=>{
        if(!mesh.isMesh)return;
        const kind=mesh.material.name.replace(/^studio_/,'').split('.')[0];
        let surface=veneerKind(id,index,kind);
        if(kind==='fabric' && index===2 && ['sofa','westChair','eastChair'].includes(id))surface='boucle';
        mesh.material=finishMaterial(mesh.material,surface,textures,['diningChairs','diningTable'].includes(id));
        const chosen=pigmented[id] || (id==='table'?(index===3?'basalt':'walnut'):['oak','paint','walnut'][index]);
        if(kind===chosen)dyes.push(mesh.material);
        if(kind==='counter')counters.push(mesh.material);
        mesh.castShadow=true;mesh.receiveShadow=true;
      });
      for(const [x,y,z,angle] of poses){
        const copy=shape.clone(true);copy.position.set(x,y,z);copy.rotation.y=angle;group.add(copy);
      }
      scene.add(group);records.push({id,index,group,dyes,counters,pigment});
    });
  }

  // Three surfaces form a real jamb through the pre-existing 30 cm partition.
  const oak=finishMaterial(new THREE.MeshStandardMaterial({color:0xaa8d6b,roughness:.72}),'oak',textures);
  const trim=(x,y,z,w,h,d,mat)=>{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    mesh.position.set(x,y,z);mesh.receiveShadow=true;scene.add(mesh);return mesh;
  };
  for(const z of [-1.11,-2.69])trim(-6.2,1.17,z,.34,2.34,.05,oak);
  trim(-6.2,2.35,-1.90,.34,.06,1.63,oak);
  const plaster=finishMaterial(new THREE.MeshStandardMaterial({color:0xe3dcd0,roughness:.93}),'plaster',textures);
  // Lining follows the original west windows, deck door and new internal opening.
  const panel=(x,y,z,w,h,d)=>trim(x,y,z,w,h,d,plaster);
  panel(-8.68,1.65,-7.972,4.66,3.30,.035);
  panel(-8.68,3.291,-4.0,4.66,.014,7.95);
  for(const [a,b] of [[.0,1.95],[2.85,5.15],[6.05,8.]])panel(-10.979,1.65,-(a+b)/2,.028,3.3,b-a);
  for(const z of [-2.4,-5.60]){
    panel(-10.979,.65,z,.028,1.30,.90);panel(-10.979,2.75,z,.028,1.10,.90);
    trim(-10.987,1.294,z,.094,.018,.94,oak);
  }
  for(const [a,b] of [[-11,-10.45],[-8.95,-6.35]])panel((a+b)/2,1.65,-.027,b-a,3.30,.025);
  panel(-9.7,2.91,-.027,1.51,.78,.025);
  for(const [a,b] of [[0,1.10],[2.70,8.]])panel(-6.369,1.65,-(a+b)/2,.024,3.30,b-a);
  panel(-6.369,2.83,-1.90,.024,.94,1.60);
  const tiles=finishMaterial(new THREE.MeshStandardMaterial({color:0xd2c4ae,roughness:.72}),'stone',textures);
  const grout=new THREE.MeshStandardMaterial({color:0xb9ac94,roughness:.9});
  trim(-8.68,.004,-4.01,4.65,.008,7.95,grout);
  // Large stone slabs with tight joints and a continuous level threshold.
  for(let row=0;row<8;row++)for(let col=0;col<4;col++){
    trim(-10.423+col*1.16,.009,-.525-row*.993,1.157,.008,.990,tiles);
  }
  contact(scene,-8.72,-4.16,1.67,3.13,.30);
  placements.stools.forEach(([x,,z])=>contact(scene,x,z,.70,.72,.32));
  // The kitchen wing shares the existing beam locations. The backs of those
  // beams had no interior lighting in the original closed-wing bake.
  for(const x of [-9.8,-7.84])trim(x,3.159,-4.,.145,.247,7.97,oak);
  const pendants=[];
  function pendantSet(index){
    const group=new THREE.Group(),metal=new THREE.MeshStandardMaterial({color:[0x846c4d,0x625e50,0x635145][index],roughness:.49,metalness:.42});
    const inside=new THREE.MeshStandardMaterial({color:0xf6edd9,emissive:0xffe4bd,emissiveIntensity:.32});
    function suspended(geometry,mat,x,y,z){
      const obj=new THREE.Mesh(geometry,mat);obj.position.set(x,y,z);group.add(obj);return obj;
    }
    const stations=index===1?[-4.16]:[-3.60,-4.72];
    for(const z of stations){
      suspended(new THREE.CylinderGeometry(.045,.045,.018,24),metal,-8.72,3.272,z);
      suspended(new THREE.CylinderGeometry(.003,.003,1.09,10),metal,-8.72,2.737,z);
      if(index===1){
        suspended(new THREE.BoxGeometry(.09,.082,1.53),metal,-8.72,2.19,z);
        suspended(new THREE.BoxGeometry(.064,.008,1.48),inside,-8.72,2.145,z);
      }else{
        const shape=(index===2?[[.19,0],[.174,.041],[.125,.098],[.052,.139],[.021,.146]]:[[.132,0],[.136,.022],[.11,.096],[.042,.13],[.021,.145]]).map(([r,h])=>new THREE.Vector2(r,h));
        suspended(new THREE.LatheGeometry(shape,64),metal,-8.72,2.05,z);
        const disk=suspended(new THREE.CircleGeometry(shape[0].x*.974,64),inside,-8.72,2.05,z);disk.rotation.x=Math.PI/2;
      }
    }
    pendants.push(group);scene.add(group);
  }
  [0,1,2].forEach(pendantSet);
  const taskLight=new THREE.PointLight(0xffdeb4,1.35,2.7,2);taskLight.position.set(-9.0,1.52,-7.28);scene.add(taskLight);
  const spot=new THREE.SpotLight(0xffedd6,54,12,.74,.83,2);
  spot.position.set(-11.8,5.8,.9);spot.target.position.set(-8.72,.38,-4.18);
  spot.castShadow=true;spot.shadow.mapSize.set(1024,1024);spot.shadow.bias=-.00035;spot.shadow.normalBias=.012;
  scene.add(spot,spot.target);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  function apply(){
    const counter=state.get('countertop')||state.baseColor('countertop');
    for(const {id,index,group,dyes,counters,pigment} of records){
      group.visible=state.model(id)===index;
      for(const m of dyes)m.color.set(state.get(id)||pigment);
      for(const m of counters){m.color.set(counter);m.roughness=[.69,.44,.59][state.model('countertop')];}
    }
    pendants.forEach((group,i)=>{group.visible=i===state.model('island');});
    renderer.shadowMap.needsUpdate=true;
    plaster.color.set(state.get('kitchenWalls')||state.baseColor('kitchenWalls'));
    tiles.color.set(state.get('kitchenFloor')||state.baseColor('kitchenFloor'));

  }
  apply();state.addEventListener('change',apply);
}

export function finishTerrace(oldModel,state,terraceLight){
  const choice={value:new THREE.Vector3()},deckTint={value:new THREE.Vector3(1,1,1)};
  const deckBase=new THREE.Color(modelList('deck')[0][1]),color=new THREE.Color();
  function update(){
    choice.value.set(state.model('diningTable'),state.model('diningChairs'),state.model('loungers'));
    color.set(state.get('deck')||state.baseColor('deck'));
    deckTint.value.set(color.r/deckBase.r,color.g/deckBase.g,color.b/deckBase.b);
  }
  // The stage-one exterior windows were built as blind recesses. Open their
  // plaster backing while retaining the original outer frame and glass.
  for(const group of ['ARCH_IN','ARCH_OUT','FURN','LOW']){
    const shader=oldModel.getObjectByName(group)?.material;
    if(!shader?.fragmentShader)continue;
    shader.fragmentShader=shader.fragmentShader.replace('void main() { vec3 c =',`void main() {
      if(vW.x< -10.94 && vW.x> -11.205 && vW.y>1.30 && vW.y<2.20 && (abs(vW.z+2.40)<.45 || abs(vW.z+5.60)<.45))discard;
      vec3 c =`);
    shader.needsUpdate=true;
  }
  const deck=oldModel.getObjectByName('DECK').material;
  Object.assign(deck.uniforms,{deckTint,choice,terraceLight:{value:terraceLight}});
  deck.fragmentShader=`uniform vec3 deckTint,choice;
    uniform sampler2D terraceLight;
    vec3 deckPlate(vec2 local,float index){
      vec2 tile=vec2(mod(index,4.),floor(index/4.));
      return pow(texture2D(terraceLight,(tile+clamp(local,.002,.998))/vec2(4.,3.)).rgb,vec3(2.4))*8.;
    }
  `+deck.fragmentShader.replace('gl_FragColor = vec4(c, 1.0);',`
    vec2 local=vec2((vW.x+14.5)/15.,(7.5-vW.z)/7.5);
    bool lounge=vW.x> -5.4;
    float index=lounge?(choice.z>.5?8.+choice.z:0.):choice.x+3.*choice.y;
    if(index>.5 && all(greaterThan(local,vec2(0.))) && all(lessThan(local,vec2(1.))) && vW.y>-.13){
      vec3 previous=deckPlate(local,0.),next=deckPlate(local,index);
      vec3 coarse=c*clamp((next+.003)/(previous+.003),vec3(.075),vec3(6.));
      float change=smoothstep(.018,.115,length(next-previous));
      c=mix(coarse,next,change*.85);
    }
    gl_FragColor=vec4(c*deckTint,1.);`);
  deck.needsUpdate=true;
  const furn=oldModel.getObjectByName('FURN').material;
  Object.assign(furn.uniforms,{choice,tableDye:state.tint('diningTable'),chairDye:state.tint('diningChairs'),bedDye:state.tint('loungers'),grillDye:state.tint('outdoorKitchen')});
  furn.fragmentShader='uniform vec3 choice,tableDye,chairDye,bedDye,grillDye;\n'+furn.fragmentShader.replace('gl_FragColor = vec4(c, 1.0);',`
    vec2 d=abs(vW.xz-vec2(-10.2,3.3));
    if(d.x<2.39 && d.y<1.10 && vW.y>=-.005 && vW.y<1.4){
      if(d.x<1.731 && d.y<.535){if(vW.y<=.772){if(choice.x>.5)discard;c*=tableDye;}}
      else {if(choice.y>.5)discard;c*=chairDye;}
    }
    bool daybed=(abs(vW.x+3.6)<.37 || abs(vW.x+2.30)<.37) && abs(vW.z-5.60)<1.05 && vW.y>-.005 && vW.y<.85;
    if(daybed){if(choice.z>.5)discard;c*=bedDye;}
    if(abs(vW.x+13.55)<.43 && abs(vW.z-3.35)<2.17 && vW.y<.918)c*=grillDye;
    gl_FragColor=vec4(c,1.);
  `);
  furn.needsUpdate=true;update();state.addEventListener('change',update);
}
