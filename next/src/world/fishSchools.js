/* WILDLANDS NEXT — instanced shoaling fish below actual lake surface.
 * Two instanced draws render the complete school; no per-fish mesh allocation.
 * Simulation is pure and testable separately from the GPU.
 */
import * as THREE from 'three';
import {createLakeSchoolSimulation} from '../sim/lakeSchools.mjs';
import {fishShape} from '../sim/fishMotion.mjs';
const SPECIES_COLORS=[0xc2b7a0,0x667b53,0xdab75c,0xbba480,0x8da77b,0x8ba7a9,0xbc8b81,0x9ea99a];

function makeTailGeometry(){
 // Forked caudal fin with centre notch; two triangles share a peduncle.
 const g=new THREE.BufferGeometry(),vertices=new Float32Array([
  0,0,-.025, 0,.30,.39, 0,.05,.27,
  0,0,-.025, 0,-.30,.39, 0,-.05,.27,
 ]);
 g.setAttribute('position',new THREE.BufferAttribute(vertices,3));
 g.computeVertexNormals();return g;
}
export function createFishSchoolsView({heightAt,isMobile=false}={}){
 if(typeof heightAt!=='function')throw new Error('lakebed heightAt function required');
 const total=isMobile?20:48;
 const simulation=createLakeSchoolSimulation({seed:7654321,count:total});
 const group=new THREE.Group();group.name='live-underwater-fish-schools';
 const bodyMaterial=new THREE.MeshStandardMaterial({
  color:0xe5e8db,roughness:.42,metalness:.08,
  transparent:false,side:THREE.DoubleSide,emissive:0x0a1a18,emissiveIntensity:.09
 });
 const finMaterial=new THREE.MeshStandardMaterial({
  color:0xbecabc,roughness:.61,metalness:0,side:THREE.DoubleSide
 });
 const body=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,9),bodyMaterial,total);
 const tails=new THREE.InstancedMesh(makeTailGeometry(),finMaterial,total);
 for(const mesh of [body,tails]){
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;
  group.add(mesh);
 }
 body.name='underwater-fish-bodies';tails.name='independent-cauda-fins';
 const dummy=new THREE.Object3D(),bodyColor=new THREE.Color(),finColor=new THREE.Color();
 for(let i=0;i<total;i++){
  const f=simulation.fish[i],shape=fishShape(f.species);
  bodyColor.setHex(SPECIES_COLORS[f.species]).multiplyScalar(.82+(i%5)*.035);
  finColor.copy(bodyColor).multiplyScalar(.70);
  body.setColorAt(i,bodyColor);
  tails.setColorAt(i,finColor);
 }
 body.instanceColor.needsUpdate=true;tails.instanceColor.needsUpdate=true;
 let bait=null,disturbance=null,frame=0;
 // Keep underwater meshes out of the cube reflection pass: no additional
 // world render and no silhouettes reflected through the water.
 function setBait(location){
  bait=location&&Number.isFinite(location.x)&&Number.isFinite(location.z)
   ?{x:location.x,z:location.z}:null;
 }
 function scare(location){
  disturbance=location&&Number.isFinite(location.x)&&Number.isFinite(location.z)
   ?{x:location.x,z:location.z}:null;
 }
 function update(dt,{timeOfDay=.36,weather=.05,wind=.26}={}){
  simulation.update(dt,{timeOfDay,weather,wind,bait,disturbance});
  // Update instance transforms on every second frame for software/mobile GPU
  // while simulation remains smooth and deterministic for tests.
  frame++;
  if(isMobile&&frame%2!==0)return;
  for(let i=0;i<total;i++){
   const f=simulation.fish[i],shape=fishShape(f.species);
   const hidden=f.cooldown>0||f.reserved;
   const ground=heightAt(f.x,f.z);
   const y=Math.min(-.34,Math.max(f.y,ground+.54));
   const fishLength=.41*shape.length,fishWidth=.19*shape.width,fishHeight=.13*shape.depth;
   const scale=hidden?0:1;
   // Fish geometry faces local -Z; heading is measured with atan2(dz,dx).
   dummy.position.set(f.x,y,f.z);
   dummy.rotation.set(0,-Math.PI/2-f.heading,.035*Math.sin(simulation.time*2+f.phase));
   dummy.scale.set(fishWidth*scale,fishHeight*scale,fishLength*scale);
   dummy.updateMatrix();body.setMatrixAt(i,dummy.matrix);
   dummy.position.set(f.x-Math.cos(f.heading)*fishLength*.8,y,
     f.z-Math.sin(f.heading)*fishLength*.8);
   dummy.rotation.set(0,-Math.PI/2-f.heading+Math.sin(simulation.time*(5+f.species*.33)+f.phase)*.22,
     0);
   dummy.scale.set(.85*shape.width*scale,.69*shape.depth*scale,.84*shape.tail*scale);
   dummy.updateMatrix();tails.setMatrixAt(i,dummy.matrix);
  }
  body.instanceMatrix.needsUpdate=true;
  tails.instanceMatrix.needsUpdate=true;
 }
 return {group,simulation,update,setBait,scare,scan:(x,z,r)=>simulation.scan(x,z,r),
  hookNear:(x,z,env,r)=>simulation.hookNear(x,z,env,r),settleHook:(landed)=>simulation.settleHook(landed),
  getState:()=>({population:total,active:simulation.activeCount,removed:simulation.caughtCount,
   hooked:simulation.reservedCount,meshes:group.children.length,drawInstanced:true,bait:!!bait})};
}
