/* Shoreline dressing for WILDLANDS NEXT.
   Original procedural instanced rocks, reeds, grass and driftwood.
   Textures reused from the existing WILDLANDS project under assets/.
 */
import * as THREE from 'three';
const TAU=Math.PI*2;
function rng(seed){return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296}}
const chance=(r,a,b)=>a+(b-a)*r();
const rockyGeo=()=>{
  const geo=new THREE.IcosahedronGeometry(1,2);
  const a=geo.attributes.position,v=new THREE.Vector3();
  for(let i=0;i<a.count;i++){
    v.fromBufferAttribute(a,i);
    const swell=1+.13*Math.sin(v.x*8.1+v.z*5.7)+.085*Math.cos(v.y*11.8+v.x*2.2);
    v.multiplyScalar(swell);v.y*=.63;a.setXYZ(i,v.x,v.y,v.z);
  }
  geo.computeVertexNormals();return geo;
};
function reedsGeom(){
  const verts=[];
  for(let k=0;k<5;k++){
    const theta=k*TAU/5,rad=.08;
    const dx=Math.cos(theta),dz=Math.sin(theta);
    // Tapered, gently bent reed blade with a non-coplanar tip.
    const b=[dx*rad,0,dz*rad],m=[dx*(rad+.08),.65,dz*(rad+.09)],t=[dx*(rad+.17),1.45,dz*(rad+.05)];
    verts.push(...b,...m,...t);
    verts.push(...b,...t,...m);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.computeVertexNormals();
  return geo;
}
function grassGeom(){
  const p=[];
  for(let k=0;k<4;k++){
    const angle=k*TAU/4,cs=Math.cos(angle),sn=Math.sin(angle);
    const base=[cs*.035,0,sn*.035],tip=[cs*.24,.6,sn*.22],w=[cs*.075,.19,sn*.075];
    p.push(...base,...tip,...w);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.computeVertexNormals();
  return geo;
}
function tintInstances(mesh,locations,palette){
  const obj=new THREE.Object3D(),color=new THREE.Color();
  locations.forEach((a,i)=>{
    obj.position.set(a.x,a.y,a.z);obj.rotation.set(a.rx||0,a.rot||0,a.rz||0);
    obj.scale.set(a.sx,a.sy,a.sz);obj.updateMatrix();mesh.setMatrixAt(i,obj.matrix);
    color.setHex(palette[Math.floor((a.tint||0)*palette.length)%palette.length]);mesh.setColorAt(i,color);
  });
  mesh.instanceMatrix.needsUpdate=true;
  if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  return mesh;
}
export function createShoreDetails(heightAt,{lowPower=false}={}){
  const group=new THREE.Group();group.name='shoreline-dressing';
  const r=rng(0x4aa9b73),count={rocks:0,grass:0,reeds:0,wood:0};
  const loader=new THREE.TextureLoader();
  const base=new URL('../../../assets/granite_cliff.jpg',import.meta.url).href;
  const woodPath=new URL('../../../assets/weathered_timber.jpg',import.meta.url).href;
  const rockTex=loader.load(base);rockTex.colorSpace=THREE.SRGBColorSpace;
  rockTex.wrapS=rockTex.wrapT=THREE.RepeatWrapping;
  const woodTex=loader.load(woodPath);woodTex.colorSpace=THREE.SRGBColorSpace;
  const create=(size,pick,range)=>{
    const list=[];let attempts=0;
    while(list.length<size&&attempts<size*22){
      attempts++;
      const a=r()*TAU,rad=chance(r,range[0],range[1]);
      const x=Math.cos(a)*rad,z=Math.sin(a)*rad,y=heightAt(x,z);
      if(y < -0.05 || y > 11.5)continue;
      if(!pick(x,z,y,rad))continue;
      list.push({x,y,z,rot:r()*TAU,sx:1,sy:1,sz:1,tint:r()});
    }
    return list;
  };
  const landmarks=[[18,65],[-61,27],[57,-32]];
  const nearLanding=(x,z)=>landmarks.some(([xx,zz])=>Math.hypot(x-xx,z-zz)<3.6);
  const rocks=create(lowPower?115:300,(x,z,y,rad)=>rad<91&&!nearLanding(x,z),[59,91]);
  for(const a of rocks){
    const s=chance(r,.21,1.5)*((Math.hypot(a.x,a.z)<72)?1.1:.65);
    a.sx=s*chance(r,.8,1.5);a.sy=s*chance(r,.48,.85);a.sz=s*chance(r,.8,1.48);
    a.y+=.10*a.sy;
  }
  const rockMat=new THREE.MeshStandardMaterial({color:0xc6cac2,map:rockTex,roughness:1,metalness:0});
  const rockMesh=new THREE.InstancedMesh(rockyGeo(),rockMat,rocks.length);
  tintInstances(rockMesh,rocks,[0xffffff,0xb6bbb2,0x89958d,0xd8d5ca]);rockMesh.receiveShadow=true;
  group.add(rockMesh);count.rocks=rocks.length;
  // Beach grass remains near the lake. Individual blades are lit and instanced.
  const grasses=create(lowPower?650:2300,(x,z,y,rad)=>rad>=61&&rad<=84&&y>.05&&!nearLanding(x,z),[61,86]);
  for(const a of grasses){
    const size=chance(r,.33,1.07);a.sx=size;a.sy=size*chance(r,.65,1.45);a.sz=size;
    a.y-=.04;
  }
  const grassMat=new THREE.MeshStandardMaterial({
    color:0xffffff,side:THREE.DoubleSide,roughness:1,metalness:0,depthWrite:true
  });
  const grass=new THREE.InstancedMesh(grassGeom(),grassMat,grasses.length);
  tintInstances(grass,grasses,[0x93a56f,0x536944,0x7f8a4c,0xb0a66b,0x4b724b]);
  grass.frustumCulled=false;group.add(grass);count.grass=grasses.length;
  // Reed blades cluster by the waterline.
  const reeds=create(lowPower?90:260,(x,z,y,rad)=>rad>=60&&rad<=72&&y<4.3&&!nearLanding(x,z),[60,73]);
  for(const a of reeds){const size=chance(r,.48,1.4);a.sx=size;a.sy=size;a.sz=size;a.y-=.04}
  const reedMat=new THREE.MeshStandardMaterial({color:0xffffff,side:THREE.DoubleSide,roughness:.94});
  const reedMesh=new THREE.InstancedMesh(reedsGeom(),reedMat,reeds.length);
  tintInstances(reedMesh,reeds,[0x65835e,0x7a8b59,0x9c9660,0x436d55]);
  reedMesh.frustumCulled=false;group.add(reedMesh);count.reeds=reeds.length;
  // Driftwood — actual tapering logs, not floating texture quads.
  const woods=create(lowPower?12:32,(x,z,y,rad)=>rad>60&&rad<74&&!nearLanding(x,z),[60,74]);
  for(const a of woods){a.sy=chance(r,.36,.95);a.sx=chance(r,.08,.17);a.sz=a.sx;a.rx=Math.PI/2;a.y+=.13}
  const woodMat=new THREE.MeshStandardMaterial({color:0x9d8b71,map:woodTex,roughness:.93});
  const logs=new THREE.InstancedMesh(new THREE.CylinderGeometry(.75,1,5.5,9),woodMat,woods.length);
  tintInstances(logs,woods,[0xc5a988,0xd3bea2,0x98816a]);group.add(logs);count.wood=woods.length;
  return {group,count};
}
