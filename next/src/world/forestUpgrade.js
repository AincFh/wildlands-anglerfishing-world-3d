/* Optional CC0 realistic tree upgrade. Keeps the base forest usable offline.
 * Model © Innerscene, released CC0, source:
 * https://www.innerscene.com/tools/library/3d-parts/mature-scots-pine-tree-280307e1
 * External model loads only on network-enabled clients; failures are nonfatal.
 */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const MODEL='https://files.innerscene.com/library/mature-scots-pine-tree-280307e1/e52dca598822dfa9ffa9/mature-scots-pine-tree.glb';
export async function enhanceForest(world,{softwareGPU=false,mobile=false}={}){
 const status={loaded:false,instances:0,meshes:0,source:MODEL,error:null};
 try{
  const gltf=await new GLTFLoader().loadAsync(MODEL);
  const root=gltf.scene;root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(root);
  const size=new THREE.Vector3();bounds.getSize(size);
  if(!Number.isFinite(size.y)||size.y<=0)throw Error('Tree model has invalid bounds');
  const scale=17/size.y;
  const max=softwareGPU?35:mobile?75:175;
  const locations=[];
  let seed=0x137c419;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
  for(let tries=0;tries<max*24&&locations.length<max;tries++){
   const angle=random()*Math.PI*2,dist=72+Math.sqrt(random())*97;
   const x=Math.cos(angle)*dist,z=Math.sin(angle)*dist,y=world.terrain.heightAt(x,z);
   if(y<.5||y>22)continue;
   if(Math.hypot(x-18,z-65)<9||Math.hypot(x+61,z-27)<9||Math.hypot(x-57,z+32)<9)continue;
   locations.push({x,y,z,angle:random()*Math.PI*2,size:(.65+random()*.63)*scale});
  }
  const batch=new THREE.Group();batch.name='cc0-realistic-scots-pines';
  root.traverse(obj=>{
   if(!obj.isMesh||!obj.geometry||!obj.material)return;
   const geometry=obj.geometry.clone();geometry.applyMatrix4(obj.matrixWorld);
   // Position the original glTF origin on the ground.
   geometry.translate(-bounds.min.x,-bounds.min.y,-bounds.min.z);
   const material=Array.isArray(obj.material)?obj.material.map(m=>m.clone()):obj.material.clone();
   const inst=new THREE.InstancedMesh(geometry,material,locations.length);
   inst.frustumCulled=false;
   inst.castShadow=false;inst.receiveShadow=true;
   const pivot=new THREE.Object3D();
   locations.forEach((p,i)=>{
    pivot.position.set(p.x,p.y,p.z);pivot.rotation.set(0,p.angle,0);
    pivot.scale.setScalar(p.size);pivot.updateMatrix();inst.setMatrixAt(i,pivot.matrix);
   });
   inst.instanceMatrix.needsUpdate=true;batch.add(inst);status.meshes++;
  });
  if(!batch.children.length)throw Error('Model contains no supported mesh');
  world.scene.add(batch);status.loaded=true;status.instances=locations.length;
 }catch(err){status.error=String(err?.message||err).slice(0,250)}
 return status;
}
