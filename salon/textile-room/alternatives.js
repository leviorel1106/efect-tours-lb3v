import * as THREE from 'three';

// Each placement owns its finish, while repeated chairs share geometry and texture maps.
export async function installAlternatives(scene,loader,state,renderer){
  const templates=new Map();
  await Promise.all([...new Set(Object.values(state.catalog).map(entry=>entry.asset))].map(async name=>{
    const url=new URL('../test-site/assets/'+name+'/'+name+'.gltf',document.baseURI);
    templates.set(name,(await loader.loadAsync(url.href)).scene);
  }));
  const hemi=new THREE.HemisphereLight(0xfff4dd,0xb4a08a,1.58);
  const windowLight=new THREE.DirectionalLight(0xffecd4,2.38);
  windowLight.position.set(-2.4,3.4,4.2);windowLight.target.position.set(1.65,.45,-3.6);
  const bounce=new THREE.DirectionalLight(0xdce8f4,.52);bounce.position.set(4,2,-5);
  scene.add(hemi,windowLight,windowLight.target,bounce);
  const records=[];
  for(const [id,entry] of Object.entries(state.catalog)){
    const object=templates.get(entry.asset).clone(true);
    object.position.fromArray(entry.position);object.rotation.y=entry.angle;object.scale.fromArray(entry.scale);
    const dye={value:new THREE.Color()},strength={value:0};
    object.traverse(mesh=>{
      if(!mesh.isMesh)return;
      const mat=mesh.material=mesh.material.clone();
      for(const texture of [mat.map,mat.normalMap,mat.roughnessMap,mat.metalnessMap]){
        if(texture)texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      }
      // Metallic roughness assets use red for baked ambient occlusion. Three r160
      // supports the original UV set if the texture explicitly uses channel zero.
      if(!mat.aoMap && mat.metalnessMap?.image && entry.asset==='modern_arm_chair_01'){
        mat.aoMap=mat.metalnessMap;mat.aoMapIntensity=.65;
      }
      if(/_legs$/.test(mat.name))return;
      const isSofa=id==='sofa';
      const baseLuma=isSofa?.105:id==='table'?.26:.032;
      mat.onBeforeCompile=shader=>{
        shader.uniforms.newDye=dye;shader.uniforms.dyeOn=strength;
        shader.vertexShader='varying float seatHeight;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nseatHeight=position.y;');
        shader.fragmentShader='varying float seatHeight;uniform vec3 newDye;uniform float dyeOn;\n'+shader.fragmentShader.replace('#include <map_fragment>',`
          #include <map_fragment>
          float yarn=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
          float pattern=clamp(pow((yarn+.003)/${baseLuma.toFixed(3)},.77),.18,3.5);
          diffuseColor.rgb=mix(diffuseColor.rgb,newDye*pattern,dyeOn*${isSofa?'smoothstep(.16,.22,seatHeight)':'1.'});
        `);
      };
      mat.customProgramCacheKey=()=>entry.asset;
    });
    records.push({id,object,dye,strength});
    scene.add(object);
  }
  function apply(){
    for(const {id,object,dye,strength} of records){
      object.visible=state.model(id)===1;
      const hex=state.get(id);strength.value=hex?1:0;
      if(hex)dye.value.set(hex);
    }
  }
  apply();state.addEventListener('change',apply);
}
