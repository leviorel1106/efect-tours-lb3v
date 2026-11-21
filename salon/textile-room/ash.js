import * as THREE from 'three';
const vs=`varying vec3 P,N,W;void main(){vec4 w=modelMatrix*vec4(position,1.);P=w.xyz;N=normalize(mat3(modelMatrix)*normal);W=position;gl_Position=projectionMatrix*viewMatrix*w;}`;
const fs=`varying vec3 P,N,W;uniform sampler2D grain;uniform float dark;uniform vec4 models;
void main(){if((P.x>.93?models.z:models.y)>.5)discard;vec3 n=normalize(N);vec3 l=normalize(vec3(1.25,1.95,0.)-P);
vec2 coords=abs(n.y)>.6?W.xz:vec2(abs(n.x)>.6?W.z:W.x,W.y);
float bands=texture2D(grain,coords*vec2(.86,1.8)).r-.502;
vec3 ash=vec3(.325,.207,.115)*(1.+.64*bands);
float light=.54+.61*max(0.,dot(n,l))+.13*n.y;
gl_FragColor=vec4(mix(ash,vec3(.039,.031,.025),dark)*light,1.);}`;
export function fitBase(scene,model,texture,finishes){
 model.traverse(o=>{if(o.isMesh)o.material=new THREE.ShaderMaterial({vertexShader:vs,fragmentShader:fs,uniforms:{grain:{value:texture},models:finishes.models,dark:{value:o.material.name==='Decking'?1:0}}});});
 scene.add(model);
 // The two masks lie on different receivers (jute and stone) at their actual heights.
 for(const [x,y,a] of [[0,1.6,2.6],[1.8,1.2,3.3]])for(const rug of [false,true]){
   const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.36,1.32),new THREE.ShaderMaterial({
     transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,uniforms:{rug:{value:rug?1:0}},
     vertexShader:'varying vec2 q;varying vec3 P;void main(){q=uv;vec4 w=modelMatrix*vec4(position,1.);P=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
     fragmentShader:`varying vec2 q;varying vec3 P;uniform float rug;void main(){
       bool onRug=P.x>-.9&&P.x<4.3&&-P.z>1.2&&-P.z<4.8;
       if(onRug!=(rug>.5))discard;
       vec2 p=abs(q-.5);float area=(1.-smoothstep(.18,.49,p.x))*(1.-smoothstep(.18,.49,p.y));
       float feet=exp(-dot((p-vec2(.26,.24))*29.,(p-vec2(.26,.24))*29.));
       gl_FragColor=vec4(.028,.019,.011,area*.33+feet*.26);
     }`
   }));
   mesh.rotation.order='YXZ';mesh.rotation.x=-Math.PI/2;mesh.rotation.y=a;
   mesh.position.set(x,rug?.0198:.0015,-y);scene.add(mesh);
   const apply=()=>{mesh.visible=!finishes.model(x>.93?'eastChair':'westChair');};
   apply();finishes.addEventListener('change',apply);
 }
}
