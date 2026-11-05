/* WILDLANDS NEXT — native 3D fish model, reusable across species.
 * Parametric body + physically lit fins, eyes, gills and spot detail.
 * Geometry and material are entirely local; no external models or image URLs.
 */
import * as THREE from 'three';

export function makeFishModel() {
  const group=new THREE.Group();
  group.name='fish-3d-trophy';
  const color=new THREE.Color();
  const segments=50,round=22,vertices=[],vertexColors=[],uv=[],indices=[];
  for(let i=0;i<=segments;i++){
    const t=i/segments;
    const z=-.77+t*1.53;
    // Gently tapered, asymmetric anatomy: snout, deep shoulder, narrow peduncle.
    const fullness=Math.pow(Math.max(.006,Math.sin(Math.PI*t)),.65);
    const shoulder=.76+.24*Math.sin(Math.PI*t);
    const rx=.27*fullness*shoulder+.035*(1-t);
    const ry=.225*fullness*shoulder+.015*(1-t);
    for(let j=0;j<=round;j++){
      const angle=2*Math.PI*j/round,c=Math.cos(angle),s=Math.sin(angle);
      const x=rx*s, y=ry*c+.04*Math.sin(Math.PI*t)-.015;
      vertices.push(x,y,z);uv.push(t,j/round);
      const dark=(1-c)*.5;
      const stripe=.04*Math.sin(t*53+angle*3);
      // Dark dorsal pigment, light pearl-silver belly, lateral band.
      color.setRGB(Math.min(1,.39+.50*dark+stripe),
                   Math.min(1,.48+.43*dark+stripe),
                   Math.min(1,.35+.52*dark+stripe));
      vertexColors.push(color.r,color.g,color.b);
    }
  }
  for(let i=0;i<segments;i++)for(let j=0;j<round;j++){
    const a=i*(round+1)+j,b=a+round+1;
    indices.push(a,b,a+1,b,b+1,a+1);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(vertexColors,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geo.setIndex(indices);geo.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({
    color:0xacc6aa,vertexColors:true,side:THREE.DoubleSide,metalness:.08,
    roughness:.46,flatShading:false
  });
  const body=new THREE.Mesh(geo,material);body.name='anatomical-fish-body';
  body.castShadow=true;group.add(body);
  const finMat=new THREE.MeshStandardMaterial({
    color:0x67795e,side:THREE.DoubleSide,roughness:.62,metalness:.02
  });
  function fin(name,points) {
    const v=[],ix=[];
    points.forEach(([x,y,z])=>v.push(x,y,z));
    for(let i=1;i<points.length-1;i++)ix.push(0,i,i+1);
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
    g.setIndex(ix);g.computeVertexNormals();
    const mesh=new THREE.Mesh(g,finMat);mesh.name=name;mesh.castShadow=true;
    group.add(mesh);return mesh;
  }
  // Forked caudal fin, dorsal spines, secondary dorsal + paired pectorals.
  fin('forked-tail',[[0,0,.67],[0,.39,1.12],[0,.14,.98],[0,0,.85],
                     [0,-.14,.98],[0,-.39,1.12]]);
  fin('dorsal-fin',[[0,.17,-.29],[0,.43,-.14],[0,.47,.03],[0,.38,.2],[0,.16,.31]]);
  fin('adipose-fin',[[0,.085,.45],[0,.18,.53],[0,.07,.62]]);
  fin('anal-fin',[[0,-.11,.34],[0,-.31,.5],[0,-.08,.62]]);
  for(const side of [-1,1]){
    fin(side===1?'right-pectoral':'left-pectoral',
       [[side*.15,-.035,-.28],[side*.44,-.24,-.04],[side*.23,-.1,.09]]);
    fin(side===1?'right-pelvic':'left-pelvic',
       [[side*.1,-.13,.11],[side*.29,-.32,.38],[side*.1,-.1,.33]]);
    const sclera=new THREE.Mesh(
      new THREE.SphereGeometry(.041,12,10),
      new THREE.MeshStandardMaterial({color:0xf0e7bc,roughness:.25})
    );
    sclera.position.set(side*.154,.058,-.58);sclera.name='eye';group.add(sclera);
    const pupil=new THREE.Mesh(
      new THREE.SphereGeometry(.026,12,10),
      new THREE.MeshStandardMaterial({color:0x101c15,metalness:.05,roughness:.18})
    );
    pupil.position.set(side*.189,.059,-.586);pupil.name='pupil';group.add(pupil);
    const glint=new THREE.Mesh(new THREE.SphereGeometry(.008,8,6),
      new THREE.MeshBasicMaterial({color:0xffffff}));
    glint.position.set(side*.207,.071,-.595);group.add(glint);
    const gillCurve=new THREE.CatmullRomCurve3([
      new THREE.Vector3(side*.205,.115,-.43),
      new THREE.Vector3(side*.244,.02,-.37),
      new THREE.Vector3(side*.215,-.095,-.37)
    ]);
    const gill=new THREE.Mesh(new THREE.TubeGeometry(gillCurve,15,.006,5),
      new THREE.MeshStandardMaterial({color:0x465e52,roughness:.85}));
    gill.name='gill-line';group.add(gill);
    const spotMat=new THREE.MeshStandardMaterial({color:0x344b35,roughness:.89});
    for(let k=0;k<26;k++){
      const t=.27+((k*13%29)/38),a=.5+((k*7%15)/36);
      const full=Math.pow(Math.max(0.001,Math.sin(Math.PI*t)),.65);
      const z=-.77+t*1.53,x=side*(.27*full+.009),y=(.22*full)*Math.cos(a*1.65);
      const spot=new THREE.Mesh(new THREE.SphereGeometry(.009+(k%3)*.003,5,4),spotMat);
      spot.position.set(x,y,z);spot.name='scales-spot';group.add(spot);
    }
  }
  group.traverse(o=>{if(o.isMesh)o.frustumCulled=false});
  return {group,material,tail:group.getObjectByName('forked-tail')};
}
