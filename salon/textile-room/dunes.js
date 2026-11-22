import * as THREE from 'three';

const tau=Math.PI*2;
const studioAsset=name=>new URL('../textile-room/'+name,document.baseURI).href;
const material=(color,roughness=.8)=>new THREE.MeshStandardMaterial({color,roughness});
function mesh(parent,geometry,surface,x=0,y=0,z=0){
  const piece=new THREE.Mesh(geometry,surface);
  piece.position.set(x,y,z);
  parent.add(piece);
  return piece;
}

// A wide, shallow paper lantern. The skin follows the bamboo hoops. Both the
// circumferential ribs and the curved paper-panel joins follow its surface UVs.
function paperLantern(){
  const lamp=new THREE.Group();
  lamp.position.set(1.70,0,-2.85);
  const paper=material('#ecdcc1',.94);
  paper.side=THREE.DoubleSide;
  paper.emissive.set('#473726');
  const rows=120, profile=[];
  for(let i=0;i<=rows;i++){
    const angle=Math.PI*i/rows, h=i/rows;
    const belly=Math.pow(Math.sin(angle),.72);
    const hoop=.0032*Math.cos(tau*h*20)*belly;
    profile.push(new THREE.Vector2(.028+.612*belly*(.92+.12*h)+hoop,2.205+.445*h));
  }
  const skin=mesh(lamp,new THREE.LatheGeometry(profile,96),paper);
  skin.scale.set(1.15,1,.88);skin.rotation.y=-.32;
  paper.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec2 skinUv;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nskinUv=uv;');
    shader.fragmentShader='varying vec2 skinUv;\n'+shader.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      float hoop=abs(fract(skinUv.y*20.+.5)-.5);
      float seam=abs(fract(skinUv.x*12.+.5)-.5);
      float fibre=sin(720.*skinUv.y+2.8*sin(skinUv.x*85.))*(1.-smoothstep(.1,1.,fwidth(skinUv.y)*190.));
      diffuseColor.rgb*=1.+.024*fibre;
      diffuseColor.rgb*=1.-.22*(1.-smoothstep(.035,.10+fwidth(skinUv.y)*6.,hoop));
      diffuseColor.rgb*=1.-.075*(1.-smoothstep(.012,.037+fwidth(skinUv.x)*5.,seam));
    `);
  };
  const brass=material('#695744',.46);brass.metalness=.57;
  const linenCord=material('#514a3b');
  mesh(lamp,new THREE.CylinderGeometry(.004,.004,.653,12),linenCord,0,2.971);
  mesh(lamp,new THREE.CylinderGeometry(.055,.047,.026,40),brass,0,3.286);
  mesh(lamp,new THREE.CylinderGeometry(.031,.044,.042,36),brass,0,2.666);
  mesh(lamp,new THREE.CylinderGeometry(.035,.031,.009,32),brass,0,2.204);
  return {lamp,paper};
}

// A two-panel cast relief on the east wall. Both casts are cut from one relief
// field so the curved ridges continue naturally across the narrow reveal.
function plasterDiptych(){
  const group=new THREE.Group();
  group.rotation.y=-Math.PI/2;
  group.position.set(10.90,1.70,-3.65);
  const backing=material('#827665');
  mesh(group,new THREE.BoxGeometry(2.04,1.44,.034),backing,0,0,-.012);
  const limestone=material('#c3b59d',.96);
  limestone.vertexColors=true;
  for(const side of [-1,1]){
    const center=side*.497;
    const surface=new THREE.PlaneGeometry(.962,1.37,86,88);
    const pos=surface.attributes.position, colors=[];
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i)+center,y=pos.getY(i);
      const angle=.45*x+.21*y;
      const curve=Math.hypot((x+1.11)*.93,(y+.39+.18*Math.sin(angle))*.87);
      const wave=.5+.5*Math.cos(tau*(curve*4.7+.12*Math.sin(1.9*y)));
      const taper=Math.min(1,Math.max(0,(.49-Math.abs(x-center))*33),Math.max(0,(.694-Math.abs(y))*35));
      pos.setZ(i,.035+taper*(.018+.043*wave**1.4));
      const pigment=.72+.26*wave+.016*Math.sin(99*x+62*y);
      colors.push(pigment,pigment,pigment);
    }
    surface.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    surface.computeVertexNormals();
    mesh(group,new THREE.BoxGeometry(.964,1.372,.064),material('#cec2ad'),center,0,.001);
    mesh(group,surface,limestone,center);
  }
  return group;
}

export async function installDunes(scene,loader,state,stoneDetail){
  const table=(await loader.loadAsync(studioAsset('dune-table.glb'))).scene;
  table.position.set(1.70,0,-2.85);
  const stone=material('#8d7962',.61);
  stone.onBeforeCompile=shader=>{
    shader.uniforms.vein={value:stoneDetail};
    shader.vertexShader='varying vec3 slabPoint;varying vec3 slabNormal;\n'+shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nslabPoint=(modelMatrix*vec4(position,1.)).xyz;slabNormal=mat3(modelMatrix)*normal;');
    shader.fragmentShader='varying vec3 slabPoint;varying vec3 slabNormal;uniform sampler2D vein;\n'+shader.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      vec3 n=abs(normalize(slabNormal)),p=slabPoint;
      vec3 weights=pow(n,vec3(4.));weights/=max(.001,weights.x+weights.y+weights.z);
      float grain=dot(weights,vec3(texture2D(vein,p.zy*vec2(.85,2.8)).r,
        texture2D(vein,p.xz*vec2(.72,1.9)).r,texture2D(vein,p.xy*vec2(.72,2.8)).r));
      diffuseColor.rgb*=.66+.69*grain;
      diffuseColor.rgb*=.82+.18*smoothstep(.018,.12,p.y);
      if(n.y>.8 && p.y>.37){
        vec2 books=abs(p.xz-vec2(1.30,-2.90))-vec2(.17,.13);
        float shade=1.-smoothstep(-.008,.068,length(max(books,0.)));
        float bowl=1.-smoothstep(.055,.174,length(p.xz-vec2(2.20,-2.75)));
        float vase=1.-smoothstep(.045,.104,length(p.xz-vec2(2.05,-3.10)));
        diffuseColor.rgb*=1.-.36*max(shade,max(bowl,vase));
      }
    `);
  };
  table.traverse(piece=>{if(piece.isMesh)piece.material=stone;});
  const {lamp,paper}=paperLantern(),art=plasterDiptych();
  scene.add(table,lamp,art);
  function apply(){
    table.visible=state.model('table')===2;
    lamp.visible=state.model('pendant')===1;
    art.visible=Boolean(state.duneDetails.value);
    stone.color.set(state.get('table')||'#8d7962');
    paper.color.set(state.get('pendant')||'#ecdcc1');
  }
  apply();
  state.addEventListener('change',apply);
}
