/* WILDLANDS — THE ANGLER'S TRAIL · offline original WebGL2 fishing adventure
   Independent rebuild; no external JS framework or CDN. */
(()=>{'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,s)=>a+(b-a)*s,TAU=Math.PI*2;
let randSeed=30815; const rand=()=>{randSeed=(Math.imul(randSeed,1664525)+1013904223)>>>0;return randSeed/4294967296},R=(a,b)=>a+(b-a)*rand(),choose=a=>a[Math.floor(rand()*a.length)];
const canvas=$('#world'),gl=canvas.getContext('webgl2',{antialias:true,alpha:false,depth:true,powerPreference:'high-performance'});
if(!gl){$('#start').disabled=true;$('#start').textContent='当前浏览器不支持 WebGL 2';return}
const PINE='pine',BIRCH='birch',GRASS='grass';
const SPECIES=[
 {id:'rainbow',name:'虹鳟',en:'RAINBOW TROUT',rarity:'普通',base:1.8,max:7.3,pull:.65,color:[.72,.78,.64],price:155,depth:1.1},
 {id:'bass',name:'大口黑鲈',en:'LARGEMOUTH BASS',rarity:'普通',base:2.2,max:6.2,pull:.82,color:[.31,.49,.31],price:170,depth:.8},
 {id:'perch',name:'金鲈',en:'YELLOW PERCH',rarity:'普通',base:.7,max:2.7,pull:.42,color:[.8,.68,.28],price:95,depth:1.0},
 {id:'pike',name:'北方狗鱼',en:'NORTHERN PIKE',rarity:'稀有',base:3.7,max:14.8,pull:1.3,color:[.43,.62,.39],price:340,depth:1.7},
 {id:'trout',name:'湖鳟',en:'LAKE TROUT',rarity:'稀有',base:2.9,max:11.6,pull:1.05,color:[.45,.57,.63],price:255,depth:2.4},
 {id:'carp',name:'镜鲤',en:'MIRROR CARP',rarity:'普通',base:2.6,max:18.5,pull:1.06,color:[.76,.62,.37],price:210,depth:1.2},
 {id:'salmon',name:'帝王鲑',en:'KING SALMON',rarity:'史诗',base:4.8,max:23.1,pull:1.62,color:[.56,.62,.67],price:610,depth:3.2},
 {id:'sturgeon',name:'湖鲟',en:'LAKE STURGEON',rarity:'传说',base:8.7,max:46.0,pull:2.0,color:[.47,.52,.47],price:1250,depth:4.6},
 {id:'char',name:'北极红点鲑',en:'ARCTIC CHAR',rarity:'史诗',base:2.4,max:8.3,pull:1.2,color:[.81,.46,.27],price:530,depth:2.3},
 {id:'walleye',name:'玻璃梭鲈',en:'WALLEYE',rarity:'稀有',base:1.7,max:8.9,pull:.94,color:[.66,.67,.43],price:285,depth:2.0},
 {id:'bluegill',name:'蓝鳃太阳鱼',en:'BLUEGILL',rarity:'普通',base:.4,max:1.8,pull:.37,color:[.32,.53,.70],price:80,depth:.5},
 {id:'golden',name:'金色虹鳟',en:'GOLDEN TROUT',rarity:'传说',base:2.0,max:9.2,pull:1.5,color:[.99,.73,.23],price:1600,depth:2.7}
];
const RODS=[
 {name:'溪谷入门竿',en:'STREAM STARTER',price:0,range:1,line:1,drag:1,desc:'适合探索山谷的全能轻量竿。'},
 {name:'松影碳素竿',en:'PINE CARBON',price:750,range:1.17,line:1.15,drag:1.12,desc:'更高的抛投精准度与柔韧竿身。'},
 {name:'北岸战斗竿',en:'NORTHSHORE',price:1850,range:1.24,line:1.39,drag:1.26,desc:'更强的抗拉性能，应对猛力逃窜。'},
 {name:'岬角远投竿',en:'FARCAST PRO',price:3400,range:1.52,line:1.25,drag:1.29,desc:'远距离抛竿，探索深水区鱼群。'},
 {name:'山脊传奇竿',en:'RIDGELINE X',price:7200,range:1.75,line:1.83,drag:1.48,desc:'专为大型鱼获打造的顶级装备。'}
];
const LURES=[
 {name:'溪虫软饵',en:'SOFT BAIT',price:0,bonus:1,desc:'适合鳟鱼及小型鱼类。'},
 {name:'旋转亮片',en:'SPINNER',price:250,bonus:1.24,desc:'反光亮片，让掠食鱼更容易发现。'},
 {name:'深潜米诺',en:'DEEP MINNOW',price:650,bonus:1.37,desc:'深水区诱鱼，提高珍稀鱼出现概率。'},
 {name:'仿生溪虾',en:'CRAWFISH',price:1050,bonus:1.50,desc:'专业级动态拟饵，适合岸边障碍区。'}
];
const POINTS=[
 {name:'松影湖岸',short:'NORTH BANK',pos:[-12,41],yaw:0,pitch:-.08,desc:'营地旁的石滩，适合初次寻找鱼群。'},
 {name:'白桦隐湾',short:'BIRCH COVE',pos:[-178,-2],yaw:.85,pitch:-.09,desc:'白桦树与芦苇环绕的隐蔽水湾。'},
 {name:'岬角礁岸',short:'CLIFF POINT',pos:[182,-5],yaw:-.79,pitch:-.11,desc:'深水与裸露岩壁交错，常有大鱼出没。'}
];
const SAVEKEY='wildlands_angler_v1';let data={money:1200,level:1,xp:0,catches:0,weight:0,best:0,rod:0,lure:0,ownedRods:[0],ownedLures:[0],gallery:{},quest:0,point:0,dayTime:6.7,quality:1,music:false};
try{let val=JSON.parse(localStorage.getItem(SAVEKEY)||'null');if(val&&typeof val==='object'){data={...data,...val};data.gallery=val.gallery&&typeof val.gallery==='object'?val.gallery:{};data.ownedRods=Array.isArray(val.ownedRods)?val.ownedRods:[0];data.ownedLures=Array.isArray(val.ownedLures)?val.ownedLures:[0]}}catch(e){}
const save=()=>{try{localStorage.setItem(SAVEKEY,JSON.stringify(data))}catch(e){}};
const state={started:false,panel:'',phase:'ready',power:0,chargeStart:0,elapsed:0,biteDelay:0,biteWindow:0,castTimer:0,castLength:1.22,castStart:[0,0,0],castTarget:[0,0,0],bobber:[0,0,0],fish:null,weight:0,length:0,stamina:1,tension:.2,stress:0,slack:0,distance:0,reeling:false,shake:0,boat:false,boatYaw:0,boatSpeed:0,boatX:-22,boatZ:22,fishSchool:[],quality:.86,fps:0};
const cam={x:-12,z:41,y:0,yaw:0,pitch:-.08,targetYaw:0,targetPitch:-.08,bob:0};
let nowTime=0,lastFrame=0,clock=0,drawCount=0,drawSec=0,worldMeshes=[],worldBuilt=false,toastTimer=0,qualityAdjust=0,music=null;
const VK={}; const keyHeld=new Set();let pointerCharge=false,rotateCamera=false,dragX=0,dragY=0,boatNear=false;
function chooseFish(){
 // Spawn weights depend on the actual cast location. Open water, coves, time and tackle matter.
 const x=state.bobber[0],z=state.bobber[2];
 const radius=Math.hypot(x/225,(z+140)/160),deep=clamp((.98-radius)*3.7),shore=1-deep;
 const twilight=data.dayTime<9||data.dayTime>17,lure=data.lure;
 const pool=SPECIES.map((f,i)=>{
  let weight=Math.max(.32,9-i*.63)*(i>9?.32:1);
  if(['sturgeon','salmon','trout','char'].includes(f.id))weight*=.35+deep*2.2;
  if(['bass','perch','carp','bluegill','pike'].includes(f.id))weight*=.60+shore*1.22;
  if(lure===2&&['sturgeon','trout','salmon','walleye'].includes(f.id))weight*=2.1;
  if(lure===1&&['bass','pike','perch'].includes(f.id))weight*=1.70;
  if(lure===3&&['carp','bass','sturgeon'].includes(f.id))weight*=1.85;
  if(twilight&&['rainbow','trout','salmon','char'].includes(f.id))weight*=1.52;
  if(Math.abs(x)>125&&['pike','bass','walleye'].includes(f.id))weight*=1.22;
  return {f,weight};
 });
 let total=pool.reduce((sum,p)=>sum+p.weight,0),r=R(0,total);
 for(let p of pool){r-=p.weight;if(r<=0)return p.f}return SPECIES[0]
}
function noiser(x,z){return .60*Math.sin(x*.047+Math.sin(z*.018)*2)*Math.cos(z*.053)+.28*Math.sin(x*.124+z*.093)*Math.cos(z*.114)+.12*Math.sin(x*.39-z*.25)}
function terrainHeight(x,z){const d=Math.hypot(x/225,(z+140)/160),edge=d-1;
 let base=clamp(edge*47-2,-18,64);
 let mountain=Math.pow(Math.max(0,d-1.31),1.24)*111;
 let erosion=Math.max(0,d-.99)*noiser(x,z)*(4.2+Math.max(0,d-1.2)*9);
 let ridges= Math.max(0,d-1.35)*7.7*Math.sin(x*.038+z*.017);
 let shore=Math.exp(-Math.pow((d-1.08)*10,2))*noiser(x*.8,z*.8)*.6;
 return base+mountain+erosion+ridges+shore;
}
const WORLD={solid:[],foliage:[],water:[],dynamic:[]};
const COL={dark:[.14,.20,.18],wood:[.46,.35,.25],oak:[.40,.29,.20],stone:[.49,.53,.50],rock:[.41,.45,.43],trunk:[.25,.20,.17],cream:[.80,.80,.68],red:[.52,.20,.16],tarp:[.20,.34,.31],glass:[.73,.85,.75],fish:[.48,.65,.52],gold:[.78,.64,.39],reed:[.47,.56,.29]};
function vertex(m,p,n,uv,c,mat){m.push(...p,...n,...uv,...c,mat)}
function tri(m,a,b,c,col=[1,1,1],mat=3,uvs=null,normal=null){let p=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],q=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];let n=normal||[p[1]*q[2]-p[2]*q[1],p[2]*q[0]-p[0]*q[2],p[0]*q[1]-p[1]*q[0]],inv=1/(Math.hypot(...n)||1);n=n.map(x=>x*inv);let t=uvs||[[0,0],[1,0],[1,1]];vertex(m,a,n,t[0],col,mat);vertex(m,b,n,t[1],col,mat);vertex(m,c,n,t[2],col,mat)}
function quad(m,a,b,c,d,col=COL.wood,mat=3,uvs=null){let u=uvs||[[0,0],[1,0],[1,1],[0,1]];tri(m,a,b,c,col,mat,[u[0],u[1],u[2]]);tri(m,a,c,d,col,mat,[u[0],u[2],u[3]])}
function box(m,x,y,z,sx,sy,sz,col=COL.wood,mat=2){let X=sx/2,Y=sy/2,Z=sz/2,A=[x-X,y-Y,z+Z],B=[x+X,y-Y,z+Z],C=[x+X,y+Y,z+Z],D=[x-X,y+Y,z+Z],E=[x-X,y-Y,z-Z],F=[x+X,y-Y,z-Z],G=[x+X,y+Y,z-Z],H=[x-X,y+Y,z-Z];quad(m,A,B,C,D,col,mat);quad(m,F,E,H,G,col,mat);quad(m,B,F,G,C,col,mat);quad(m,E,A,D,H,col,mat);quad(m,D,C,G,H,col,mat);quad(m,E,F,B,A,col,mat)}
function ellipsoid(m,x,y,z,rx,ry,rz,col=COL.stone,mat=3,lat=6,lon=9){for(let j=0;j<lat;j++)for(let i=0;i<lon;i++){const a=j*Math.PI/lat,b=(j+1)*Math.PI/lat,c=i*TAU/lon,d=(i+1)*TAU/lon;const p=(t,k)=>[x+rx*Math.sin(t)*Math.cos(k),y+ry*Math.cos(t),z+rz*Math.sin(t)*Math.sin(k)];tri(m,p(a,c),p(b,c),p(b,d),col,mat);tri(m,p(a,c),p(b,d),p(a,d),col,mat)}}
function cylinder(m,x,y,z,r,h,col=COL.wood,seg=8,r2=r,mat=2){for(let i=0;i<seg;i++){let a=i*TAU/seg,b=(i+1)*TAU/seg,p=[x+Math.cos(a)*r,y,z+Math.sin(a)*r],q=[x+Math.cos(b)*r,y,z+Math.sin(b)*r],t=[x+Math.cos(b)*r2,y+h,z+Math.sin(b)*r2],u=[x+Math.cos(a)*r2,y+h,z+Math.sin(a)*r2];quad(m,p,q,t,u,col,mat);tri(m,[x,y+h,z],u,t,col,mat)}}
function link(m,a,b,r,col=COL.wood,mat=2,seg=5){let dir=b.map((v,i)=>v-a[i]),L=Math.hypot(...dir)||1;dir=dir.map(v=>v/L);let help=Math.abs(dir[1])<.97?[0,1,0]:[1,0,0];const cross=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];let v=cross(dir,help),n=Math.hypot(...v);v=v.map(x=>x/n);let w=cross(dir,v);let at=(p,ang)=>p.map((x,i)=>x+r*(Math.cos(ang)*v[i]+Math.sin(ang)*w[i]));for(let i=0;i<seg;i++){let A=i*TAU/seg,B=(i+1)*TAU/seg;quad(m,at(a,A),at(a,B),at(b,B),at(b,A),col,mat)}}
function billboard(m,x,y,z,w,h,type=5,shade=1,turn=0){let col=[shade,shade,shade];for(let angle of [turn,turn+Math.PI/2]){let dx=Math.cos(angle)*w*.5,dz=Math.sin(angle)*w*.5;let A=[x-dx,y,z-dz],B=[x+dx,y,z+dz],C=[x+dx,y+h,z+dz],D=[x-dx,y+h,z-dz];quad(m,A,B,C,D,col,type);quad(m,B,A,D,C,col,type)}}
// Subtle ground cover: asymmetric layered conifer crowns built as real 3D geometry.
// Only near and medium-distance trees use the heavier meshes; far forest remains batched billboards.
function sculptPine(m,x,z,h,variant=0){
 const y=terrainHeight(x,z),rot=R(0,TAU),seed=rand(),width=h*(.22+seed*.06),rings=variant?8:10,sides=8;
 cylinder(m,x,y,z,h*.016,h*.78,[.22,.19,.15],6,h*.010,3);
 for(let j=0;j<rings;j++){
  const t=j/rings,Y=y+h*(.19+t*.70),radius=width*Math.pow(1.-t,.90)*(1+.14*Math.sin(t*32.+seed*7));
  for(let k=0;k<sides;k++){
   const ang=rot+k*TAU/sides+(j%2)*.14,a2=ang+TAU/sides;
   const shade=.72+.28*Math.sin((k+variant*3+j)*2.3),c=variant?[.24*shade,.36*shade,.27*shade]:[.13*shade,.34*shade,.24*shade];
   const r1=radius*(.84+.24*Math.sin(k*5.3+j*1.2)),r2=radius*(.84+.20*Math.cos(k*3.7-j));
   const A=[x+Math.cos(ang)*r1,Y,z+Math.sin(ang)*r1],B=[x+Math.cos(a2)*r2,Y+.11*h/rings,z+Math.sin(a2)*r2];
   const tip=[x+Math.cos(ang+.31)*radius*.26,Y+h*.115,z+Math.sin(ang+.31)*radius*.26];
   tri(m,A,B,tip,c,3);tri(m,tip,B,A,c,3);
  }
 }
 const peak=[x,y+h,z];for(let k=0;k<sides;k++){
  const a=rot+k*TAU/sides,b=rot+(k+1)*TAU/sides;
  tri(m,[x+Math.cos(a)*h*.034,y+h*.86,z+Math.sin(a)*h*.034],
  [x+Math.cos(b)*h*.034,y+h*.86,z+Math.sin(b)*h*.034],peak,[.17,.40,.28],3);
 }
}
function terrainNormal(x,z){let h=.9;let nx=terrainHeight(x-h,z)-terrainHeight(x+h,z),nz=terrainHeight(x,z-h)-terrainHeight(x,z+h),s=Math.hypot(nx,2*h,nz);return [nx/s,2*h/s,nz/s]}
function addTent(m,x,z){let y=terrainHeight(x,z)+.2;let A=[x-3,y,z-2.2],B=[x+3,y,z-2.2],C=[x,y+3.1,z-2.2],D=[x-3,y,z+2.2],E=[x+3,y,z+2.2],F=[x,y+3.1,z+2.2];quad(m,A,D,F,C,[.24,.36,.30],3);quad(m,F,E,B,C,[.32,.44,.34],3);tri(m,A,B,C,[.15,.27,.24],3);tri(m,D,F,E,[.13,.26,.22],3);tri(m,[x-1.35,y,z+2.22],[x+1.35,y,z+2.22],F,[.13,.18,.14],3);link(m,C,F,.06,COL.dark,3);for(let j of [-1,1])for(let k of [-1,1]){let xx=x+j*3.2,zz=z+k*2.9;link(m,[xx,y-.03,zz],[x+j*2,y+1.1,z+k*1.6],.026,COL.cream,3)}}
function buildCabin(m,x,z){let ground=terrainHeight(x,z),y=Math.max(ground,.9);if(ground<0){for(let xx of [-6.8,6.8])for(let zz of [-5,5])cylinder(m,x+xx,-5,z+zz,.45,y+5,COL.wood,7,.4,2);box(m,x,y-.13,z,18,.4,16,COL.wood,2)}const roofY=y+9.5;
 box(m,x,y+4.2,z,14,8.1,11,COL.oak,2);
 for(let side of [-1,1])for(let i=0;i<10;i++){let yy=y+.52+i*.78;link(m,[x-7.2,yy,z+side*5.6],[x+7.2,yy,z+side*5.6],.14,[.34,.25,.19],2,6)}
 // exposed timber beams and steep pitched roof
 for(let xx of [-7.8,7.8])for(let zz of [-6.4,6.4])cylinder(m,x+xx,y,z+zz,.38,9.8,COL.wood,7,.3,2);
 for(let side of [-1,1]){let a=[x-9,y+8.7,z+side*7],b=[x+9,y+8.7,z+side*7],c=[x+9,roofY+4,z],d=[x-9,roofY+4,z];quad(m,a,b,c,d,[.15,.22,.21],3)}
 tri(m,[x-9,y+8.7,z-7],[x+9,y+8.7,z-7],[x,roofY+4,z],[.25,.23,.19],2);
 box(m,x,y+2.5,z-5.67,3.3,5.0,.21,COL.dark,3);
 box(m,x+4.9,y+5.7,z-5.69,2.7,2.4,.17,[.78,.70,.43],3);
 box(m,x-5,y+5.7,z-5.69,2.7,2.4,.17,[.70,.69,.47],3);
 for(let wx of [-5,4.9]){box(m,x+wx,y+5.7,z-5.78,.16,2.5,.19,COL.wood,2);box(m,x+wx,y+5.7,z-5.80,2.8,.14,.21,COL.wood,2)}
 box(m,x,y+.22,z-9.6,16,.45,6,COL.wood,2);
 for(let xx of [-8,8])cylinder(m,x+xx,y-1,z-11.5,.35,3.2,COL.wood,7,.32,2);
 for(let xx of [-8,8])link(m,[x+xx,y+1.1,z-11],[x+xx,y+1.1,z-8],.15,COL.wood,2);
 // Warm exterior lamp and rustic water barrel
 ellipsoid(m,x-5.7,y+7.2,z-6.0,.26,.39,.25,[1,.79,.37],3,5,7);
 cylinder(m,x+7,y,z-8,.86,1.8,COL.wood,10,.9,2);
}
function buildBoat(m,x,z,yaw=0){
 let y=.18+Math.sin(clock*1.1+x)*.045;
 const at=(a,b,h=0)=>[x+Math.cos(yaw)*a+Math.sin(yaw)*b,y+h,z-Math.sin(yaw)*a+Math.cos(yaw)*b];
 // Curved clinker-built canoe: multiple longitudinal hull strakes, inner floor, raised bow/stern.
 const row=[];const N=20;
 for(let i=0;i<=N;i++){
  let t=i/N,b=-4+t*8,shape=Math.max(.02,1-Math.pow(Math.abs(b)/4,2.1));let w=1.18*Math.pow(shape,.68);
  row.push({b,w,base:-.27+.22*Math.pow(Math.abs(b)/4,2),rim:.45+.42*Math.pow(Math.abs(b)/4,4)});
 }
 for(let i=0;i<N;i++){
  let a=row[i],b=row[i+1],dark=i%2? [.34,.22,.16]:[.42,.29,.19];
  for(let side of [-1,1]){
   let v0=at(side*a.w,a.b,a.base),v1=at(side*b.w,b.b,b.base);
   let r0=at(side*a.w*1.17,a.b,a.rim),r1=at(side*b.w*1.17,b.b,b.rim);
   quad(m,v0,v1,r1,r0,dark,2);
   link(m,r0,r1,.053,[.25,.22,.17],3,5);
   let m0=at(side*a.w*1.08,a.b,.08),m1=at(side*b.w*1.08,b.b,.08);
   link(m,m0,m1,.026,[.66,.47,.29],3,4);
  }
  quad(m,at(-a.w*.76,a.b,a.base),at(a.w*.76,a.b,a.base),at(b.w*.76,b.b,b.base),at(-b.w*.76,b.b,b.base),[.29,.22,.15],2);
 }
 for(let b of [-2.1,.18,2.2]){
  let p=at(0,b,.22);box(m,p[0],p[1],p[2],1.56,.13,.42,[.54,.36,.22],2);
  for(let side of [-1,1])link(m,at(side*.70,b,.21),at(side*.96,b,.43),.035,[.26,.20,.14],3,5)
 }
 // Wooden paddle stowed along the port gunwale.
 link(m,at(-.72,-.85,.54),at(-2.72,1.06,.54),.045,[.57,.36,.20],2,6);
 let blade=at(-2.9,1.22,.52),bl2=at(-3.28,1.58,.52);link(m,blade,bl2,.16,[.63,.44,.27],2,6);
 // Bow rope to the shoreline, visible only for the docked boat.
}
function buildScene(){let s=WORLD.solid,f=WORLD.foliage,w=WORLD.water;s.length=f.length=w.length=0;randSeed=30815;
 // Non-flat continuous terrain. Lake occupies a genuine low-elevation basin.
 const NX=145,NZ=123,X0=-375,Z0=-420,DX=750/NX,DZ=645/NZ;
 for(let iz=0;iz<NZ;iz++)for(let ix=0;ix<NX;ix++){
 let x=X0+ix*DX,z=Z0+iz*DZ,X=x+DX,Z=z+DZ;
 let a=[x,terrainHeight(x,z),z],b=[X,terrainHeight(X,z),z],c=[X,terrainHeight(X,Z),Z],d=[x,terrainHeight(x,Z),Z];
 let y=(a[1]+b[1]+c[1]+d[1])*.25,material=y>40||Math.abs(y-a[1])>3?1:0;
 // Per-vertex terrain normals produce smooth grazing light and remove faceted mountain stripes.
 let na=terrainNormal(x,z),nb=terrainNormal(X,z),nc=terrainNormal(X,Z),nd=terrainNormal(x,Z),col=[.94,.95,.94];
 vertex(s,a,na,[x/11,z/11],col,material);vertex(s,d,nd,[x/11,Z/11],col,material);vertex(s,c,nc,[X/11,Z/11],col,material);
 vertex(s,a,na,[x/11,z/11],col,material);vertex(s,c,nc,[X/11,Z/11],col,material);vertex(s,b,nb,[X/11,z/11],col,material);
 }
 // High alpine valley mountain monoliths behind the lake.
 for(let i=0;i<0;i++){let x=R(-370,370),z=R(-453,-338),y=terrainHeight(x,z),r=R(18,37),h=R(14,42);let top=[x+R(-4,4),y+h,z+R(-4,4)];for(let j=0;j<10;j++){let a=j*TAU/10,b=(j+1)*TAU/10;tri(s,[x+Math.cos(a)*r,y-5,z+Math.sin(a)*r],[x+Math.cos(b)*r,y-5,z+Math.sin(b)*r],top,choose([[.61,.66,.63],[.47,.53,.53],[.38,.47,.46]]),1)}}
 // Forest edge; standable clearing around camp; far trees are alpha-cutout textured cards.
 for(let i=0;i<2350;i++){
 let x=R(-350,350),z=R(-395,190),y=terrainHeight(x,z);if(y<.4||y>105)continue;
 if(Math.hypot((x+12)*1.0,(z-73)*1.0)<25||Math.hypot(x+51,z-24)<19||Math.abs(x)<11&&z>0&&z<90)continue;
 let h=R(8,28)*(y>38?.73:1),ww=h*R(.37,.53);
 if(rand()<.12&&y<22)billboard(f,x,y,z,ww*1.2,h*.88,6,R(.84,1.08),R(-.8,.8));
 else billboard(f,x,y,z,ww,h,5,R(.75,1.03),R(-.8,.8));
 if(i%6===0&&Math.hypot(x-cam.x,z-cam.z)<140)cylinder(s,x,y,z,h*.029,h*.27,COL.trunk,5,h*.020,3);
 }
 // Volumetric grove that creates actual parallax, lighting and depth while walking.
 // Favor shore contour and the foreground path rather than spraying every tree over the landscape.
 for(let i=0;i<260;i++){
   let a=R(0,TAU),rad=R(28,172),x=-12+Math.cos(a)*rad,z=43+Math.sin(a)*rad,y=terrainHeight(x,z);
   if(y<.8||y>62||Math.hypot(x+12,z-48)<26||Math.hypot(x+54,z-72)<26)continue;
   sculptPine(s,x,z,R(9,24)*(y>30?.80:1),rand()>.74?1:0);
 }
 for(let i=0;i<230;i++){
   let a=R(0,TAU),r=R(18,48),x=-65+Math.cos(a)*r,z=-28+Math.sin(a)*r,y=terrainHeight(x,z);
   if(y>.7&&y<47)sculptPine(s,x,z,R(9,20),1);
 }
 // Carefully placed foreground grove silhouettes — near, medium and distant layers.
 for(let [x,z,h,type] of [[-46,43,25,5],[55,38,21,5],[-66,-7,19,5],[-80,-19,15,6],[-95,25,17,5],[72,-2,23,5],[94,35,19,6],[105,-23,22,5],[-108,-67,18,6],[137,-47,16,5],[-42,-49,14,6],[53,-54,12,5]]){
   let y=terrainHeight(x,z);if(y>.3){billboard(f,x,y,z,h*.6,h,type,1,0.18);cylinder(s,x,y,z,.17,h*.24,COL.trunk,6,.14,3)}
 }
 // shoreline stones & boulders, intentionally avoiding the cabin entrance
 for(let i=0;i<440;i++){
  let x=R(-255,255),z=R(-308,76),y=terrainHeight(x,z);
  if(y<-.4||y>26||Math.hypot(x+12,z-73)<9)continue;
  let r=R(.3,1.6)*((rand()<.10)?2.4:1);
  ellipsoid(s,x,y+.07,z,r,r*R(.37,.8),r*R(.5,1.1),choose([COL.stone,COL.rock,[.54,.53,.45],[.35,.42,.41]]),1,4,6)
 }
 // Fallen timber and close-up rock clusters add scale cues in the near field.
 for(let i=0;i<115;i++){
    const x=R(-120,110),z=R(-28,135),y=terrainHeight(x,z);
    if(y<.25||y>30||Math.hypot(x+12,z-73)<12)continue;
    let a=R(0,TAU),len=R(1.6,5.6);
    if(rand()<.46)link(s,[x,y+.20,z],[x+Math.cos(a)*len,y+.14,z+Math.sin(a)*len],R(.11,.25),[.32,.28,.20],3,7);
    else ellipsoid(s,x,y+.10,z,R(.45,1.5),R(.2,.7),R(.35,1.0),[.33,.38,.33],1,5,7);
 }
 // dense meadow / reeds near exposed near shore. Each sways in shader via vUV.
 for(let i=0;i<1350;i++){
 let x=R(-340,340),z=R(-326,190),y=terrainHeight(x,z);
 if(y<-.1||y>18||Math.hypot(x+12,z-73)<15||Math.hypot(x+51,z-24)<19)continue;
 let height=R(.7,2.4)*(y<2?1.4:.8);billboard(f,x,y,z,R(.60,1.2),height,7,R(.7,1.14),R(-2,2));
 }
 // Cabin far up shoreline, trail marker, hanging lantern and a campsite (no static dock scene).
 buildCabin(s,-54,72);addTent(s,43,73);
 for(let p of [[-2,46],[-7,51],[7,51]]){
 let yy=terrainHeight(...p);ellipsoid(s,p[0],yy+.12,p[1],R(.9,2.1),.34,R(1.2,2.5),[.57,.52,.42],1,5,8)
 }
 let cy=terrainHeight(13,49);
 for(let i=0;i<10;i++){let a=i*TAU/10;let x=13+Math.cos(a)*1.27,z=49+Math.sin(a)*1.27,y=terrainHeight(x,z);ellipsoid(s,x,y+.1,z,.5,.25,.5,COL.stone,1,4,6)}
 for(let i=0;i<4;i++){let a=i*TAU/4;link(s,[13+Math.cos(a)*.65,cy+.22,49+Math.sin(a)*.65],[13-Math.cos(a)*.65,cy+.45,49-Math.sin(a)*.65],.12,COL.wood,2)}
 // Landmark signpost and direction indicator.
 let sx=-26,sz=45,sy=terrainHeight(sx,sz);cylinder(s,sx,sy,sz,.12,3.9,COL.wood,7,.11);box(s,sx,sy+3.3,sz-.13,3.6,.62,.25,COL.wood,2);
 // Visible floating distant boats plus the enterable near-shore canoe.
 buildBoat(s,-78,-40,.3);buildBoat(s,69,-126,-1.4);
 for(let ix=0;ix<115;ix++)for(let iz=0;iz<80;iz++){let x=-285+ix*5,z=-350+iz*5;let a=[x,0,z],b=[x+5,0,z],c=[x+5,0,z+5],d=[x,0,z+5];quad(w,a,d,c,b,[1,1,1],8,[[x/25,z/25],[x/25,(z+5)/25],[(x+5)/25,(z+5)/25],[(x+5)/25,z/25]])}
 worldBuilt=true;
}
const fullscreenVS=`#version 300 es
precision highp float;
out vec2 uv;
void main(){vec2 p=vec2(gl_VertexID==1?3.0:-1.0,gl_VertexID==2?3.0:-1.0);uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
const skyFS=`#version 300 es
precision highp float;
in vec2 uv;out vec4 frag;
uniform float uClock,uYaw,uPitch,uHour,uAspect;
uniform sampler2D uCloud;
float hash(float n){return fract(sin(n)*43758.5453123);}
void main(){
 vec2 st=uv;float horizon=.49-uPitch*.59;
 float day=clamp(smoothstep(5.1,7.7,uHour)*(1.-smoothstep(17.7,21.,uHour)),.17,1.);
 vec3 zenith=mix(vec3(.028,.071,.095),vec3(.24,.43,.49),day),mid=mix(vec3(.12,.17,.22),vec3(.70,.73,.65),day),near=mix(vec3(.20,.22,.24),vec3(.97,.79,.55),day);
 vec3 sky=mix(near,mid,smoothstep(horizon,horizon+.30,st.y));sky=mix(sky,zenith,smoothstep(horizon+.23,1.24,st.y)*.9);
 float sx=.76-sin(uYaw)*.54,sy=horizon+.29;
 float sun=exp(-pow(length((st-vec2(sx,sy))*vec2(uAspect,1.)),2.)*650.);
 float aura=exp(-pow(length((st-vec2(sx,sy))*vec2(uAspect,1.)),2.)*13.);
 sky+=vec3(1.,.70,.32)*aura*.38;sky=mix(sky,vec3(1.,.92,.71),sun*.95);
 vec2 cloudUV=vec2(st.x*.75+uYaw*.10+uClock*.00021,st.y*.55);
 float noise=texture(uCloud,cloudUV).r*.65+texture(uCloud,cloudUV*2.43+.16).r*.35;
 float clouds=smoothstep(.48,.60,noise+ .10*sin(st.x*19.+uClock*.003))*smoothstep(horizon+.06,horizon+.27,st.y);
 sky=mix(sky,mix(vec3(.52,.56,.55),vec3(.99,.91,.80),day),clouds*.18);
 // Very distant ridgelines improve depth beyond the actual high-detail terrain
 float wx=(st.x-.5)*uAspect*2.8+uYaw*1.6;
 float ridge=horizon-.064+sin(wx*3.1)*.035+sin(wx*7.7+1.2)*.021+sin(wx*16.)*.009;
 sky=mix(vec3(.28,.39,.39),sky,smoothstep(ridge-.01,ridge+.04,st.y));
 float ridge2=horizon-.13+sin(wx*2.1+2.3)*.015+sin(wx*9.1+3.2)*.010;
 sky=mix(vec3(.17,.30,.32),sky,smoothstep(ridge2-.01,ridge2+.01,st.y));
 float stars=step(.9996,hash(floor(st.x*900.)+floor(st.y*600.)*912.));
 sky+=vec3(stars*(1.-day)*.6)*smoothstep(horizon+.2,horizon+.65,st.y);
 frag=vec4(sky,1.);
}`;
const sceneVS=`#version 300 es
precision highp float;
layout(location=0)in vec3 aPos;
layout(location=1)in vec3 aNorm;
layout(location=2)in vec2 aUV;
layout(location=3)in vec3 aColor;
layout(location=4)in float aMat;
uniform vec3 uCam;uniform float uYaw,uPitch,uAspect,uFov,uClock,uMirror;
out vec3 vWorld,vNormal,vColor;out vec2 vUV;flat out int vMat;out float vDepth;
void main(){
 vec3 pos=aPos;vMat=int(aMat+.1);
 if(vMat==8){pos.y+=sin(pos.x*.34+uClock*.91)*.019+cos(pos.z*.27+uClock*1.21)*.015;}
 if(vMat==7){pos.x+=sin(uClock*1.6+pos.z*.19)*.12*aUV.y;}
 if(vMat==5||vMat==6){pos.x+=sin(uClock*.7+pos.z*.015)*.05*aUV.y;}
 vec3 forward=vec3(sin(uYaw)*cos(uPitch),sin(uPitch),-cos(uYaw)*cos(uPitch));
 vec3 right=vec3(cos(uYaw),0.,sin(uYaw));
 vec3 up=cross(right,forward);
 vec3 p=pos-uCam;float depth=dot(p,forward);
 float f=1./tan(uFov*.5);float nz=depth*(1200.0+.11)/(1200.0-.11)-2.*1200.*.11/(1200.0-.11);
 gl_Position=vec4(dot(p,right)*f/uAspect,dot(p,up)*f*(1.-2.*uMirror),nz,depth);
 vDepth=depth;vWorld=pos;vNormal=aNorm;vUV=aUV;vColor=aColor;
}`;
const sceneFS=`#version 300 es
precision highp float;
in vec3 vWorld,vNormal,vColor;in vec2 vUV;flat in int vMat;in float vDepth;out vec4 frag;
uniform sampler2D uForest,uRock,uWood,uPine,uBirch,uMeadow;
uniform vec3 uCam;uniform float uHour,uClock;
void main(){
 vec3 albedo=vColor;float alpha=1.;
 if(vMat==0||vMat==1){
  vec3 n=abs(normalize(vNormal));vec3 blend=pow(n,vec3(4.));blend/=max(dot(blend,vec3(1.)),.001);
  vec3 rX=texture(uRock,vWorld.zy*.090).rgb;
  vec3 rY=texture(uRock,vWorld.xz*.095).rgb;
  vec3 rZ=texture(uRock,vWorld.xy*.090).rgb;
  vec3 rock=rX*blend.x+rY*blend.y+rZ*blend.z;
  vec3 leaf=texture(uForest,vWorld.xz*.072).rgb;
  float slope=smoothstep(.14,.77,1.-normalize(vNormal).y);
  float alpine=smoothstep(27.,100.,vWorld.y);
  vec3 forest=leaf*vec3(.74,.97,.69);
  vec3 stone=rock*vec3(.77,.83,.78);
  albedo=mix(forest,stone,clamp(slope*.91+alpine*.18,0.,1.));
  float groundOcc=clamp(.87+vNormal.y*.13,.55,1.);
  albedo*=groundOcc;
 }
 else if(vMat==2){albedo*=texture(uWood,vUV*.64+vWorld.xz*.035).rgb*1.35;}
 else if(vMat==5){vec4 p=texture(uPine,vUV);if(p.a<.22)discard;albedo*=p.rgb;}
 else if(vMat==6){vec4 p=texture(uBirch,vUV);if(p.a<.22)discard;albedo*=p.rgb;}
 else if(vMat==7){vec4 p=texture(uMeadow,vUV);if(p.a<.23)discard;albedo*=p.rgb;}
 vec3 n=normalize(vNormal),sunDir=normalize(vec3(.39,.73,-.43));
 float day=smoothstep(5.1,7.9,uHour)*(1.-smoothstep(17.3,20.4,uHour));
 float diff=max(dot(n,sunDir),0.);
 float sky=.27+.27*max(n.y,0.);
 float bounce=.13+.12*max(-n.y,0.);
 if(vMat==5||vMat==6||vMat==7){sky=.39;diff=.38;}
 vec3 sunColor=mix(vec3(1.0,.54,.29),vec3(1.0,.91,.70),day);
 vec3 col=albedo*(vec3(.54,.67,.72)*(sky+bounce)+sunColor*diff*(.78+.22*day));
 // Height-sensitive aerial perspective preserves close-up contrast and hazes the distant ridges.
 float d=length(vWorld-uCam);float fog=1.-exp(-pow(max(d-17.,0.)/570.,1.48));
 vec3 fogTint=mix(vec3(.27,.39,.40),vec3(.53,.64,.61),clamp((vWorld.y+10.)/140.,0.,1.));
 col=mix(col,fogTint,fog*.75);
 col=col/(col+vec3(.13));col=pow(col,vec3(.94));
 frag=vec4(col,alpha);
}`;
const waterFS=`#version 300 es
precision highp float;
in vec3 vWorld,vNormal,vColor;in vec2 vUV;flat in int vMat;in float vDepth;out vec4 frag;
uniform sampler2D uNormals,uCaustics,uReflection;
uniform vec3 uCam;uniform float uClock,uHour;uniform vec2 uViewport;uniform float uHasReflection;
void main(){
 vec2 p=vWorld.xz;
 vec2 uv1=p*.022+vec2(uClock*.008,uClock*.005),uv2=p*.029-vec2(uClock*.004,uClock*.006);
 vec3 n1=texture(uNormals,uv1).xyz*2.-1.,n2=texture(uNormals,uv2).xyz*2.-1.;
 vec3 N=normalize(vec3((n1.x+n2.x)*.22,1.,(n1.y+n2.y)*.22));
 vec3 V=normalize(uCam-vWorld);
 float fres=pow(1.-clamp(dot(N,V),0.,1.),3.0)*.8+.13;
 float depth=length(vWorld-uCam);
 float d=sqrt((p.x/225.)*(p.x/225.)+((p.y+140.)/160.)*((p.y+140.)/160.));
 float shallow=smoothstep(.94,1.10,d);
 vec3 deep=vec3(.016,.115,.155),bank=vec3(.075,.22,.19),reflection=vec3(.32,.49,.51);
 vec3 water=mix(deep,bank,shallow*.69);
 vec2 screenUV=gl_FragCoord.xy/uViewport;
 vec2 perturb=(n1.xy+n2.xy)*(.007+.008*fres);
 vec3 reflected=texture(uReflection,clamp(screenUV+perturb,vec2(.003),vec2(.997))).rgb;
 // Reflect mountain silhouette and forest on high quality settings; keep a cheap fallback on mobile.
 reflected=mix(reflection,reflected,uHasReflection);
 water=mix(water,reflected,clamp(.27+fres*.65,0.,.88));
 float sparkle=pow(max(dot(reflect(-normalize(vec3(.40,.70,-.56)),N),V),0.),130.);
 water+=vec3(.99,.88,.60)*sparkle*2.5;
 float ripple=sin(p.x*.75+uClock*2.1)*sin(p.y*.51-uClock*1.4);
 water+=ripple*.011;
 float caps=sin(p.x*.18+uClock*.84)*cos(p.y*.32-uClock*1.2);
 water+=vec3(.019,.036,.033)*(caps*.5+.5);
 float foam=smoothstep(.970,1.007,d)*(1.-smoothstep(1.007,1.045,d));
 foam*=.40+.3*sin(p.x*.25+uClock*1.8+p.y*.27);
 water=mix(water,vec3(.80,.91,.80),clamp(foam,0.,.5));
 float fog=1.-exp(-pow(depth/310.,1.6));water=mix(water,vec3(.25,.45,.47),fog*.57);
 water=water/(water+vec3(.12));frag=vec4(pow(water,vec3(.93)),1.);
}`;
function compile(type,src){const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error('GLSL error: '+gl.getShaderInfoLog(sh));return sh}
function program(v,f){const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,v));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error('GL program: '+gl.getProgramInfoLog(p));return p}
let programs={};let models={};let textures={};let reflection={fbo:null,color:null,depth:null,width:0,height:0};
function resizeReflection(w,h){
 w=Math.max(128,Math.min(1120,Math.floor(w*.62)));h=Math.max(96,Math.min(720,Math.floor(h*.62)));
 if(reflection.fbo&&w===reflection.width&&h===reflection.height)return;
 if(reflection.fbo){gl.deleteFramebuffer(reflection.fbo);gl.deleteTexture(reflection.color);gl.deleteRenderbuffer(reflection.depth)}
 reflection.width=w;reflection.height=h;reflection.fbo=gl.createFramebuffer();reflection.color=gl.createTexture();reflection.depth=gl.createRenderbuffer();
 gl.bindTexture(gl.TEXTURE_2D,reflection.color);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 gl.bindRenderbuffer(gl.RENDERBUFFER,reflection.depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,w,h);
 gl.bindFramebuffer(gl.FRAMEBUFFER,reflection.fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,reflection.color,0);
 gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,reflection.depth);
 if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Reflection target incomplete');
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);
}
function uniforms(p,names){let r={};for(let n of names)r[n]=gl.getUniformLocation(p,n);return r}
function makeModel(list,usage=gl.STATIC_DRAW){let vao=gl.createVertexArray(),buffer=gl.createBuffer();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(list),usage);let stride=12*4;for(let [index,size,offset] of [[0,3,0],[1,3,3],[2,2,6],[3,3,8],[4,1,11]]){gl.enableVertexAttribArray(index);gl.vertexAttribPointer(index,size,gl.FLOAT,false,stride,offset*4)}gl.bindVertexArray(null);return {vao,buffer,count:list.length/12}}
function refreshDynamic(){if(!models.dynamic){models.dynamic=makeModel(WORLD.dynamic,gl.DYNAMIC_DRAW)}else{gl.bindBuffer(gl.ARRAY_BUFFER,models.dynamic.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(WORLD.dynamic),gl.DYNAMIC_DRAW);models.dynamic.count=WORLD.dynamic.length/12}}
function uploadModels(){for(let name of ['solid','foliage','water']){if(models[name]){gl.deleteBuffer(models[name].buffer);gl.deleteVertexArray(models[name].vao)}models[name]=makeModel(WORLD[name])}}
function loadTexture(name,file,repeat=true){let t=gl.createTexture();textures[name]=t;gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([145,165,153,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,repeat?gl.REPEAT:gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,repeat?gl.REPEAT:gl.CLAMP_TO_EDGE);gl.generateMipmap(gl.TEXTURE_2D);let img=new Image();img.crossOrigin='anonymous';img.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);gl.generateMipmap(gl.TEXTURE_2D);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false)};img.onerror=()=>console.warn('Missing texture asset:',file);img.src=window.WILDLANDS_MEDIA[file]||'assets/'+file}
function initGPU(){
 programs.sky={p:program(fullscreenVS,skyFS)};programs.sky.u=uniforms(programs.sky.p,['uClock','uYaw','uPitch','uHour','uAspect','uCloud']);
 programs.scene={p:program(sceneVS,sceneFS)};programs.scene.u=uniforms(programs.scene.p,['uCam','uYaw','uPitch','uAspect','uFov','uClock','uMirror','uHour','uForest','uRock','uWood','uPine','uBirch','uMeadow']);
 programs.water={p:program(sceneVS,waterFS)};programs.water.u=uniforms(programs.water.p,['uCam','uYaw','uPitch','uAspect','uFov','uClock','uMirror','uHour','uNormals','uCaustics','uReflection','uViewport','uHasReflection']);
 loadTexture('forest','forest_floor.jpg');loadTexture('rock','granite_cliff.jpg');loadTexture('wood','weathered_timber.jpg');loadTexture('normals','water_normals.png');loadTexture('caustics','lake_caustics.jpg');loadTexture('pine','pine.png',false);loadTexture('birch','birch.png',false);loadTexture('meadow','meadow.png',false);loadTexture('cloud','cloud_noise.png');
 buildScene();uploadModels();gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.clearColor(.3,.5,.55,1);
}
function useTexture(unit,name,loc){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,textures[name]);gl.uniform1i(loc,unit)}
function cameraUniforms(obj,mirror=false){let u=obj.u;gl.uniform3f(u.uCam,cam.x,mirror?-cam.y:cam.y,cam.z);gl.uniform1f(u.uYaw,cam.yaw);gl.uniform1f(u.uPitch,mirror?-cam.pitch:cam.pitch);if(u.uMirror)gl.uniform1f(u.uMirror,mirror?1:0);gl.uniform1f(u.uAspect,canvas.width/canvas.height);gl.uniform1f(u.uFov,1.04);gl.uniform1f(u.uClock,clock);gl.uniform1f(u.uHour,data.dayTime)}
function draw(model){if(!model||!model.count)return;gl.bindVertexArray(model.vao);gl.drawArrays(gl.TRIANGLES,0,model.count);}
function renderWorld(){
 const {width,height}=canvas;
 if(!reflection.color)resizeReflection(width,height);
 const highReflection=state.quality>.72 && (state.fps>=22||state.fps===0);
 let sc=programs.scene,wa=programs.water;
 // Offscreen planar mirror. Uses mirrored camera; avoids a static painted reflection.
 if(highReflection){
  resizeReflection(width,height);
  gl.bindFramebuffer(gl.FRAMEBUFFER,reflection.fbo);gl.viewport(0,0,reflection.width,reflection.height);
  gl.clearColor(.40,.57,.61,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.disable(gl.BLEND);
  gl.useProgram(sc.p);cameraUniforms(sc,true);
  for(let [j,n] of ['forest','rock','wood','pine','birch','meadow'].entries())useTexture(j,n,sc.u['u'+n[0].toUpperCase()+n.slice(1)]);
  draw(models.solid);draw(models.foliage);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
 }
 gl.viewport(0,0,width,height);gl.clearColor(.24,.40,.44,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 gl.depthMask(true);gl.disable(gl.DEPTH_TEST);
 let sk=programs.sky;gl.useProgram(sk.p);gl.uniform1f(sk.u.uClock,clock);gl.uniform1f(sk.u.uYaw,cam.yaw);gl.uniform1f(sk.u.uPitch,cam.pitch);gl.uniform1f(sk.u.uHour,data.dayTime);gl.uniform1f(sk.u.uAspect,width/height);useTexture(0,'cloud',sk.u.uCloud);gl.drawArrays(gl.TRIANGLES,0,3);
 gl.enable(gl.DEPTH_TEST);
 gl.useProgram(sc.p);cameraUniforms(sc);
 for(let [j,n] of ['forest','rock','wood','pine','birch','meadow'].entries())useTexture(j,n,sc.u['u'+n[0].toUpperCase()+n.slice(1)]);
 draw(models.solid);
 gl.useProgram(wa.p);cameraUniforms(wa);useTexture(0,'normals',wa.u.uNormals);useTexture(1,'caustics',wa.u.uCaustics);
 gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,reflection.color);gl.uniform1i(wa.u.uReflection,2);
 gl.uniform2f(wa.u.uViewport,width,height);gl.uniform1f(wa.u.uHasReflection,highReflection?1:0);draw(models.water);
 gl.useProgram(sc.p);cameraUniforms(sc);
 for(let [j,n] of ['forest','rock','wood','pine','birch','meadow'].entries())useTexture(j,n,sc.u['u'+n[0].toUpperCase()+n.slice(1)]);
 draw(models.foliage);draw(models.dynamic);gl.bindVertexArray(null);
}
function viewDir(){return [Math.sin(cam.yaw)*Math.cos(cam.pitch),Math.sin(cam.pitch),-Math.cos(cam.yaw)*Math.cos(cam.pitch)]}
function rodAnimation(){let M=WORLD.dynamic;const f=viewDir(),right=[Math.cos(cam.yaw),0,Math.sin(cam.yaw)],p=(forward,side,up)=>[cam.x+f[0]*forward+right[0]*side,cam.y+up+f[1]*forward,cam.z+f[2]*forward+right[2]*side];
 let reelAngle=clock*1.6*(state.reeling?8:1);
 let first=p(.73,.51,-.59),handle=p(1.14,.46,-.51),middle=p(2.0,.31,-.23),tip=p(3.15,.21,.16);
 let bend=state.phase==='fighting' ? Math.pow(state.tension,1.2)*.94 : state.phase==='charging'?state.power*.19:0;
 tip[1]-=bend+Math.sin(clock*3)*.015; middle[1]-=bend*.33;
 ellipsoid(M,...p(.53,.48,-.68),.16,.22,.18,[.70,.53,.36],3,5,7);
 link(M,p(.58,.48,-.7),p(1.29,.43,-.45),.088,[.12,.14,.12],3,8);
 link(M,p(1.29,.43,-.45),middle,.040,[.34,.37,.33],3,8);
 link(M,middle,tip,.016,[.47,.51,.46],3,7);
 for(let q of [.50,.72,.9]){let point=[mix(handle[0],tip[0],q),mix(handle[1],tip[1],q),mix(handle[2],tip[2],q)];link(M,[point[0]-right[0]*.08,point[1]-.06,point[2]-right[2]*.08],[point[0]+right[0]*.08,point[1]+.07,point[2]+right[2]*.08],.012,COL.dark,3)}
 let reel=p(1.01,.59,-.69);ellipsoid(M,...reel,.19,.12,.19,[.24,.31,.30],3,6,10);ellipsoid(M,reel[0]+right[0]*.12,reel[1],reel[2]+right[2]*.12,.09,.13,.10,[.66,.71,.64],3,6,9);
 link(M,[reel[0],reel[1]-.14,reel[2]],[reel[0]+right[0]*(.21+.03*Math.sin(reelAngle)),reel[1]-.23,reel[2]+right[2]*(.21+.03*Math.sin(reelAngle))],.028,COL.dark,3);
 // natural-looking separate right forearm and sleeve
 link(M,p(.25,.59,-.88),p(.74,.49,-.63),.16,[.23,.35,.31],3,8);
 if(['casting','waiting','bite','fighting'].includes(state.phase)){
  let end=state.bobber;let sag=state.phase==='fighting'?.06:.55;let last=tip;
  for(let i=1;i<=18;i++){let u=i/18,pt=[mix(tip[0],end[0],u),mix(tip[1],end[1]+.29,u)-sag*Math.sin(u*Math.PI),mix(tip[2],end[2],u)];link(M,last,pt,.007,[.89,.95,.83],3,3);last=pt}
  ellipsoid(M,end[0],end[1]+.17,end[2],.11,.21,.11,[.96,.37,.20],3,5,8);
  ellipsoid(M,end[0],end[1]+.075,end[2],.12,.085,.12,[.95,.93,.76],3,4,8);
  link(M,[end[0],end[1]+.25,end[2]],[end[0],end[1]+.41,end[2]],.013,COL.dark,3);
  if(state.phase==='waiting'||state.phase==='bite'){let ringR=.5+(clock*.6%1)*1.55;for(let r=0;r<2;r++){let size=ringR+r*.35;for(let i=0;i<17;i++){let a=i*TAU/17,b=(i+1)*TAU/17;link(M,[end[0]+Math.cos(a)*size,.025,end[2]+Math.sin(a)*size],[end[0]+Math.cos(b)*size,.025,end[2]+Math.sin(b)*size],.011,[.65,.78,.65],3,3)}}}
 }
}
function fishModel(m,x,y,z,heading,scale,color,flip=0){let s=scale,a=heading;let forward=[Math.sin(a),0,-Math.cos(a)],right=[Math.cos(a),0,Math.sin(a)];let loc=(u,v,w=0)=>[x+forward[0]*u+right[0]*v,y+w,z+forward[2]*u+right[2]*v];
 let body=loc(0,0,0);ellipsoid(m,body[0],body[1],body[2],s*.56,s*.21,s*.24,color,3,6,10);
 let tail=loc(-s*.52,0);let t1=loc(-s*.9,0,s*.28),t2=loc(-s*.95,0,-s*.23);tri(m,tail,t1,t2,color.map(x=>x*.76),3);
 let fin=loc(-s*.14,0,s*.18),fin2=loc(-s*.45,0,s*.33),fin3=loc(s*.18,0,s*.18);tri(m,fin,fin2,fin3,color.map(x=>x*.72),3);
 let eye=loc(s*.39,s*.16,s*.095);ellipsoid(m,...eye,s*.029,s*.029,s*.018,[.03,.08,.07],3,4,6)
}
function animateFish(dt){for(let f of state.fishSchool){f.phase+=dt*f.speed*3.4;f.yaw+=Math.sin(f.phase*.4)*dt*.4;f.x+=Math.sin(f.yaw)*dt*f.speed;f.z-=Math.cos(f.yaw)*dt*f.speed;if(Math.hypot(f.x/216,(f.z+140)/148)>0.88)f.yaw+=dt*3.0;}
}
function drawFishDynamic(){const m=WORLD.dynamic;let fishDrawn=0;for(let f of state.fishSchool){let distance=Math.hypot(cam.x-f.x,cam.z-f.z);if(distance>90)continue;let near=distance<45;let leap=Math.max(0,Math.sin(f.phase*.36+f.id*2.2))**18;if(leap>.45){let height=Math.sin((leap-.45)/.55*Math.PI)*1.25;fishModel(m,f.x,height+.19,f.z,f.yaw,RandScale(f.size),f.color);fishDrawn++}else if(state.phase==='fighting'&&near&&f.id%9===0){fishModel(m,f.x,.05,f.z,f.yaw,f.size*.5,f.color);fishDrawn++}}
 if(state.phase==='fighting'&&state.fish){let p=state.bobber;let jump=Math.pow(Math.max(0,Math.sin(clock*3.4)),6);if(jump>.35){fishModel(m,p[0]+Math.sin(clock*2)*.5,Math.sin(jump*Math.PI)*1.25+.25,p[2],clock*.8,Math.min(2.7,.70+state.weight*.13),state.fish.color)}}
}
function RandScale(s){return s*(.85+.15*Math.sin(clock*.07))}
function boatDynamic(){buildBoat(WORLD.dynamic,state.boatX,state.boatZ,state.boatYaw)}
function makeDynamic(){WORLD.dynamic.length=0;rodAnimation();drawFishDynamic();boatDynamic();refreshDynamic()}
function spawnFish(){state.fishSchool=[];for(let i=0;i<70;i++){let a=R(0,TAU),radius=R(13,150),x=Math.cos(a)*radius*.93,z=-140+Math.sin(a)*radius;state.fishSchool.push({id:i,x,z,depth:R(1,6),yaw:R(0,TAU),size:R(.32,.95),speed:R(.1,.7),phase:R(0,TAU),color:choose(SPECIES).color})}}
const tone=(freq,duration=.1,type='sine',vol=.03)=>{if(!data.music)return;try{const ctx=tone.ctx||(tone.ctx=new(window.AudioContext||window.webkitAudioContext)());let osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.value=freq;gain.gain.setValueAtTime(vol,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+duration)}catch(e){}};
function sound(name,vol=.25){if(!data.music)return;try{let a=new Audio(window.WILDLANDS_MEDIA[name+'.wav']||'assets/'+name+'.wav');a.volume=vol;a.play().catch(()=>{})}catch(e){}}
function syncSound(){if(!music){music=new Audio(window.WILDLANDS_MEDIA['morning_forest.wav']||'assets/morning_forest.wav');music.loop=true;music.volume=.19}if(data.music&&state.started)music.play().catch(()=>{});else music.pause()}
function notify(message,duration=2700){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),duration)}
function alertCenter(message,duration=2000){$('#message').textContent=message;$('#message').classList.add('show');setTimeout(()=>$('#message').classList.remove('show'),duration)}
function setPhase(phase){state.phase=phase;$('#bitePrompt').classList.toggle('show',phase==='bite');$('#tensionMetric').classList.toggle('active',phase==='fighting');}
function ready(){state.reeling=false;state.fish=null;state.power=0;state.biteWindow=0;state.tension=.2;state.stress=0;state.slack=0;setPhase('ready')}
function startAction(){if(!state.started||state.panel||$('#catchOverlay').classList.contains('open'))return;
 if(state.phase==='ready'){state.chargeStart=performance.now()/1000;state.power=0;setPhase('charging');tone(330,.09)}
 else if(state.phase==='bite')strike();else if(state.phase==='fighting')state.reeling=true;
}
function releaseAction(){if(state.phase==='charging'){state.power=(1-Math.cos(Math.min((performance.now()/1000-state.chargeStart)*1.27,Math.PI)))*.5;cast()}state.reeling=false;}
function cast(){
 const f=viewDir(),v=[Math.sin(cam.yaw),-Math.cos(cam.yaw)],rod=RODS[data.rod];
 let dist=(24+state.power*62)*rod.range;
 let tx=cam.x+v[0]*dist,tz=cam.z+v[1]*dist;for(let j=0;j<12&&terrainHeight(tx,tz)>.05;j++){dist+=4;tx=cam.x+v[0]*dist;tz=cam.z+v[1]*dist;}
 if(terrainHeight(tx,tz)>.05){ready();notify('前方是陆地，请面向湖水重新抛竿。');return}
 state.castStart=[cam.x,cam.y-.5,cam.z];state.castTarget=[tx,.08,tz];state.bobber=state.castStart.slice();state.castLength=.85+state.power*.55;state.castTimer=0;setPhase('casting');sound('cast',.22);
}
function triggerBite(){state.fish=chooseFish();state.weight=+(state.fish.base*(.65+rand()*1.8)).toFixed(2);state.weight=Math.min(state.weight,state.fish.max);state.length=Math.round(22+Math.sqrt(state.weight)*20+R(0,7));state.biteWindow=3.6;setPhase('bite');tone(960,.20,'triangle',.045);notify('咬钩！按空格扬竿！',1800)}
function strike(){if(state.phase!=='bite')return;state.stamina=1;state.tension=.26;state.distance=Math.hypot(cam.x-state.bobber[0],cam.z-state.bobber[2])+state.weight*.70;state.stress=0;state.slack=0;state.reeling=false;setPhase('fighting');tone(440,.2,'sawtooth',.035);notify('成功扬竿！收线时观察右侧张力条。',2400)}
function escaped(message){notify(message,3400);tone(180,.4,'triangle');ready()}
function fishArtwork(f){
 const rgb=f.color.map(c=>Math.round(clamp(c)*255)), base=`rgb(${rgb.join(',')})`;
 const bright=`rgb(${rgb.map(v=>Math.min(255,Math.round(v*.78+64))).join(',')})`;
 const dark=`rgb(${rgb.map(v=>Math.round(v*.48)).join(',')})`;
 const long=['pike','sturgeon','salmon'].includes(f.id),fat=['carp','bass','sturgeon'].includes(f.id);
 const cy=94,h=long?39:fat?60:50,back=long?31:23;
 const tail=long?'M 81 91 L 12 56 Q 32 95 10 133 Z':'M 80 93 L 18 56 Q 40 92 18 131 Z';
 const spots=['rainbow','trout','char','golden','salmon','pike'].includes(f.id);
 const bands=['perch','walleye','bass'].includes(f.id);
 let pattern='';
 if(spots){for(let i=0;i<43;i++){const x=130+(i*53%235),y=cy+Math.sin(i*8.6)*(h*.38);pattern+=`<circle cx="${x}" cy="${y.toFixed(1)}" r="${(1.4+i%3*.7).toFixed(1)}" fill="${dark}" opacity=".45"/>`;}}
 if(bands){for(let i=0;i<6;i++){let x=145+i*40;pattern+=`<path d="M ${x} ${cy-h*.77} q -17 21 -8 ${h*1.28}" fill="none" stroke="${dark}" stroke-width="${7-i*.32}" opacity=".28"/>`;}}
 let anatomy=`<path d="M 110 ${cy-h*.56} Q 190 ${cy-h*1.38} 312 ${cy-h*.79} Q 378 ${cy-h*.24} 402 ${cy-5} Q 380 ${cy+h*.41} 286 ${cy+h*.65} Q 158 ${cy+h*.81} 110 ${cy+h*.52} Q 81 ${cy+21} 78 ${cy} Q 82 ${cy-20} 110 ${cy-h*.56} Z" fill="url(#body-${f.id})" stroke="${dark}" stroke-width="2.3"/>`;
 return `<svg viewBox="0 0 440 192" role="img" aria-label="${f.name}原创矢量插画" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="body-${f.id}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${dark}"/><stop offset=".29" stop-color="${bright}"/><stop offset=".63" stop-color="${base}"/><stop offset="1" stop-color="${dark}"/></linearGradient><linearGradient id="fin-${f.id}"><stop stop-color="${bright}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs><ellipse cx="226" cy="174" rx="165" ry="9" fill="#000" opacity=".11"/><path d="${tail}" fill="url(#fin-${f.id})" stroke="${dark}" stroke-width="3"/><path d="M ${back+144} ${cy-h*.72} Q 194 ${cy-h*1.75} 256 ${cy-h*.80} Z" fill="url(#fin-${f.id})" stroke="${dark}" stroke-width="2"/><path d="M 165 ${cy+h*.54} Q 191 ${cy+h*1.65} 244 ${cy+h*.68} Z" fill="url(#fin-${f.id})" stroke="${dark}" stroke-width="2"/>${anatomy}<path d="M 126 ${cy+5} Q 250 ${cy+h*.33} 389 ${cy+4}" fill="none" stroke="${bright}" stroke-width="3" opacity=".52"/>${pattern}<path d="M 337 ${cy-h*.44} Q 313 ${cy} 340 ${cy+h*.37}" fill="none" stroke="${dark}" stroke-width="2.2" opacity=".55"/><ellipse cx="370" cy="${cy-10}" rx="5.5" ry="5.5" fill="#f8edd2"/><circle cx="371.3" cy="${cy-10}" r="3.5" fill="#182c30"/><circle cx="372.5" cy="${cy-11.5}" r="1.1" fill="white"/><path d="M 398 ${cy+8} q -11 8 -22 4" fill="none" stroke="${dark}" stroke-width="2"/></svg>`;
}
function fishCaught(){const f=state.fish,w=state.weight,len=state.length;
 let reward=Math.round((f.price*w/(f.base||1))*(f.rarity==='传说'?1.3:1));reward=Math.max(reward,60);
 data.money+=reward;data.xp+=Math.round(w*31);data.catches++;data.weight+=w;data.best=Math.max(data.best,w);
 const entry=data.gallery[f.id]||{count:0,best:0};entry.count++;entry.best=Math.max(w,entry.best);data.gallery[f.id]=entry;
 if(data.xp>=data.level*350){data.xp-=data.level*350;data.level++;notify('经验提升！现在达到 LV '+data.level)}
 if(data.quest===0&&data.catches>=3){data.quest=1;data.money+=380}
 if(data.quest===1&&data.best>=5){data.quest=2;data.money+=850}
 if(data.quest===2&&Object.keys(data.gallery).length>=5){data.quest=3;data.money+=1500}
 save();$('#catchArtwork').innerHTML=fishArtwork(f);$('#catchRarity').textContent=f.rarity+' · '+(entry.count===1?'FIRST DISCOVERY':'FIELD RECORD');$('#catchName').textContent=f.name;$('#catchLatin').textContent=f.en;$('#catchWeight').innerHTML=w.toFixed(2)+' <em>kg</em>';$('#catchLength').innerHTML=len+' <em>cm</em>';$('#catchCoins').textContent='◈ '+reward.toLocaleString();$('#catchOverlay').classList.add('open');tone(700,.3,'sine',.045);sound('catch',.37);ready();updateHUD()}
function updateFishing(dt){let p=state.phase;if(p==='charging')state.power=(1-Math.cos(Math.min((performance.now()/1000-state.chargeStart)*1.27,Math.PI)))*.5;
 if(p==='casting'){state.castTimer+=dt;let t=clamp(state.castTimer/state.castLength),k=1-Math.pow(1-t,1.7);for(let j=0;j<3;j++)state.bobber[j]=mix(state.castStart[j],state.castTarget[j],k);state.bobber[1]+=Math.sin(t*Math.PI)*(3+state.power*10);if(t>=1){state.bobber=state.castTarget.slice();state.biteDelay=R(3.4,7.3)/LURES[data.lure].bonus;setPhase('waiting');sound('splash',.38)}}
 if(p==='waiting'){state.biteDelay-=dt;state.bobber[1]=.02+.06*Math.sin(clock*3);if(state.biteDelay<=0)triggerBite()}
 if(p==='bite'){state.biteWindow-=dt;state.bobber[1]=-.15+.16*Math.sin(clock*19);$('#biteBar').style.width=(clamp(state.biteWindow/3.6)*100)+'%';if(state.biteWindow<=0)escaped('鱼儿脱钩了。下次及时按空格扬竿。')}
 if(p==='fighting'){
 let f=state.fish;if(!f){ready();return}
 let pull=.55+.37*Math.sin(clock*4.0+state.weight)+.13*Math.sin(clock*9);
 let rod=RODS[data.rod],swing=pull*f.pull;
 state.tension+=dt*(state.reeling?(.27+swing*.27)/rod.line:(-.23+swing*.07));
 state.tension=clamp(state.tension);
 if(state.reeling){state.distance-=dt*(5.2+rod.drag*3.4)*(state.tension<.20?.55:1);state.stamina=Math.max(0,state.stamina-dt*.095*rod.drag)}
 else{state.distance+=dt*(.14+.45*swing)*(state.stamina>.2?1:.5);state.stamina=Math.min(1,state.stamina+dt*.009)}
 if(state.tension>.92)state.stress+=dt*(.9+.34*swing)/rod.line;else state.stress=Math.max(0,state.stress-dt*.95);
 if(state.tension<.025)state.slack+=dt;else state.slack=Math.max(0,state.slack-dt*.8);
 if(state.stress>.8){escaped('鱼线断了！张力过大时要松开收线。');return}
 if(state.slack>3){escaped('鱼线太松，鱼儿逃跑了！');return}
 if(state.distance<=1.25||state.stamina<=0){fishCaught();return}
 state.distance=Math.min(state.distance,180);state.bobber[1]=-.06+.12*Math.sin(clock*7);
 }
}
function updateCamera(dt){if(!state.started||state.panel||$('#catchOverlay').classList.contains('open'))return;
 cam.yaw=mix(cam.yaw,cam.targetYaw,clamp(dt*10));cam.pitch=mix(cam.pitch,cam.targetPitch,clamp(dt*10));
 if(state.boat){let throttle=(keyHeld.has('w')?1:0)-(keyHeld.has('s')?1:0);let steer=(keyHeld.has('d')?1:0)-(keyHeld.has('a')?1:0);
 state.boatSpeed=clamp(state.boatSpeed+dt*throttle*6,-3,12);state.boatSpeed*=Math.exp(-dt*(throttle?.35:1.15));state.boatYaw+=steer*dt*(.38+.03*Math.abs(state.boatSpeed));let nx=state.boatX+Math.sin(state.boatYaw)*state.boatSpeed*dt,nz=state.boatZ-Math.cos(state.boatYaw)*state.boatSpeed*dt;
 if(terrainHeight(nx,nz)<-.2){state.boatX=nx;state.boatZ=nz}else{state.boatSpeed=0}
 cam.x=state.boatX;cam.z=state.boatZ+1.15;cam.y=mix(cam.y,2.1+Math.sin(clock*1.3)*.09,clamp(dt*6));cam.targetYaw=state.boatYaw;cam.targetPitch=-.11;
 }else{
 let moveX=0,moveZ=0;let fw=[Math.sin(cam.yaw),-Math.cos(cam.yaw)],side=[Math.cos(cam.yaw),Math.sin(cam.yaw)];
 const up=keyHeld.has('w')||keyHeld.has('arrowup'),down=keyHeld.has('s')||keyHeld.has('arrowdown'),left=keyHeld.has('a')||keyHeld.has('arrowleft'),right=keyHeld.has('d')||keyHeld.has('arrowright');
 if(up){moveX+=fw[0];moveZ+=fw[1]};if(down){moveX-=fw[0];moveZ-=fw[1]};if(left){moveX-=side[0];moveZ-=side[1]};if(right){moveX+=side[0];moveZ+=side[1]}
 const l=Math.hypot(moveX,moveZ),speed=keyHeld.has('shift')?7.2:3.85;
 if(l>0){let nx=cam.x+moveX/l*speed*dt,nz=cam.z+moveZ/l*speed*dt;if(terrainHeight(nx,nz)>-.48&&Math.abs(nx)<365&&nz>-420&&nz<210){cam.x=nx;cam.z=nz;cam.bob+=dt*speed*1.4}else notify('前方水太深，请从岸边绕行。',1300)}
 cam.y=mix(cam.y,terrainHeight(cam.x,cam.z)+1.75+(l?Math.sin(cam.bob*2)*.043:0),clamp(dt*8));
 }
}
function resize(){let dpr=Math.min(devicePixelRatio||1,1.5),mult=state.quality;canvas.width=Math.max(320,Math.floor(innerWidth*dpr*mult));canvas.height=Math.max(200,Math.floor(innerHeight*dpr*mult));canvas.style.width='100%';canvas.style.height='100%'}
function clockText(){let h=Math.floor(data.dayTime)%24,m=Math.floor((data.dayTime-h)*60);return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')}
function currentPlace(){let best=POINTS[0],distance=1e9;for(let p of POINTS){let d=Math.hypot(cam.x-p.pos[0],cam.z-p.pos[1]);if(d<distance){best=p;distance=d}}return distance<105?best:{name:'奥尔德湖区',desc:'自由探索山野湖岸，沿着水线寻找鱼群。',short:'THE ALDER VALLEY'}}
let uiTimer=0;
function updateHUD(){let place=currentPlace();$('#locName').textContent='奥尔德山谷 · '+place.name;$('#placeTitle').textContent=place.name;$('#placeDesc').textContent=place.desc;$('#timeLabel').textContent=clockText();$('#weatherLabel').textContent=data.dayTime>18?'薄暮 · 9°C':'晨雾 · 14°C';$('#level').textContent=String(data.level).padStart(2,'0');$('#money').textContent=data.money.toLocaleString();$('#catchCount').textContent=data.catches.toLocaleString();
 let quest=data.quest,txt=['山谷的第一条鱼','五公斤的挑战','生态观察者','自由垂钓'][Math.min(3,quest)],desc=['捕获任意 3 条鱼，完成初次探险','钓获重量达到 5 kg 的鱼','发现至少 5 种不同鱼类','自由探索，寻找传奇鱼种'][Math.min(3,quest)],done=quest===0?Math.min(data.catches,3)+'/ 3':quest===1?(Math.min(5,data.best).toFixed(1)+'/ 5 kg'):quest===2?Object.keys(data.gallery).length+'/ 5':'✓';$('#questTitle').textContent=txt;$('#questDesc').textContent=desc;$('#questProgress').textContent=done;
 let p=state.phase,title={ready:'准备抛竿',charging:'蓄力抛投中',casting:'鱼漂正在飞行',waiting:'观察鱼漂',bite:'鱼儿正在咬钩',fighting:'收线搏鱼中'};$('#stateHeading').textContent=title[p]||'准备抛竿';$('#powerText').innerHTML=Math.round(state.power*100)+'<span>%</span>';$('#powerBar').style.width=state.power*100+'%';$('#distanceText').innerHTML=['fighting'].includes(p)?state.distance.toFixed(1)+' <span>m</span>':['waiting','bite','casting'].includes(p)?Math.round(Math.hypot(state.bobber[0]-cam.x,state.bobber[2]-cam.z))+' <span>m</span>':'— <span>m</span>';$('#staminaBar').style.width=(p==='fighting'?state.stamina*100:0)+'%';$('#tensionText').innerHTML=Math.round(state.tension*100)+'<span>%</span>';$('#tensionBar').style.width=state.tension*100+'%';$('#tensionLabel').textContent=state.tension>.78?'DANGER':state.tension<.15?'LOW':'NORMAL';$('#tensionLabel').style.color=state.tension>.78?'#ecad8b':'#b7d7c3';
 $('#actionHint').innerHTML= p==='ready'?'<span class="mouse-icon">◉</span> 按住左键蓄力 · 松开抛竿 <span class="key-alt">右键拖动观察</span>':p==='charging'?'◉ <strong>松开左键投出鱼线</strong>':p==='waiting'?'◉ 等待鱼漂异动 · 观察湖面':p==='bite'?'空格 / 点击湖面 <strong>立即扬竿</strong>':p==='fighting'?'空格 / 按住左键 <strong>收线</strong> · 松开降低张力':'◉ 鱼漂飞行中';
 $('#boatText').textContent=state.boat?'下船':'登船';boatNear=Math.hypot(cam.x-state.boatX,cam.z-state.boatZ)<20;$('#boatBtn').style.opacity=state.boat||boatNear?'1':'.53';
}
function teleport(i){if(state.phase==='fighting')return notify('搏鱼中无法快速旅行');let p=POINTS[i];cam.x=p.pos[0];cam.z=p.pos[1];cam.y=terrainHeight(cam.x,cam.z)+1.75;cam.yaw=cam.targetYaw=p.yaw;cam.pitch=cam.targetPitch=p.pitch;state.boat=false;data.point=i;save();ready();closePanel();notify('已抵达 '+p.name)}
function toggleBoat(){
 if(state.phase==='fighting')return notify('搏鱼时无法切换船只');
 if(state.boat){
  ready();state.boat=false;state.boatSpeed=0;
  // Prefer the nearest dry shore instead of teleporting to another lake point.
  let found=false,x=state.boatX,z=state.boatZ;
  for(let r=2;r<60&&!found;r+=2){for(let a=0;a<12;a++){
   let angle=a*TAU/12,nx=x+Math.cos(angle)*r,nz=z+Math.sin(angle)*r;
   if(terrainHeight(nx,nz)>.45){cam.x=nx;cam.z=nz;found=true;break}
  }}
  if(!found){cam.x=POINTS[0].pos[0];cam.z=POINTS[0].pos[1]}
  cam.y=terrainHeight(cam.x,cam.z)+1.75;notify('已靠岸 · 继续步行探索');return;
 }
 if(Math.hypot(cam.x-state.boatX,cam.z-state.boatZ)>20)return notify('请先走到北岸的小船旁边再登船');
 ready();state.boat=true;state.boatYaw=cam.yaw;state.boatSpeed=0;
 cam.x=state.boatX;cam.z=state.boatZ+1.15;cam.targetPitch=-.10;
 notify('已登上独木舟 · WASD 驾驶，B 下船');
}
function equip(kind,i){let arr=kind==='rod'?RODS:LURES,owned=kind==='rod'?data.ownedRods:data.ownedLures,key=kind==='rod'?'rod':'lure',item=arr[i];if(!item)return;
 if(!owned.includes(i)){if(data.money<item.price)return notify('金币不足，需要 ◈ '+item.price.toLocaleString());data.money-=item.price;owned.push(i);tone(740,.19)}data[key]=i;save();openPanel(state.panel);notify('已装备 '+item.name)}
function openPanel(name){if(!state.started)return;state.panel=name;state.reeling=false;let head={map:['TRAVEL / ALDER VALLEY','山谷地图','在同一片真实 3D 山谷内选择不同岸线观景点。'],gear:['EQUIPMENT / TACKLE','我的渔具','装备升级影响抛投距离、鱼线强度和收线速度。'],shop:['SUPPLY OUTPOST','户外补给站','钓到鱼可以赚取金币，解锁高性能渔具和鱼饵。'],species:['FIELD GUIDE / WILDLIFE','鱼类图鉴','记录发现的鱼种与各自的最佳重量。'],missions:['FIELD NOTES / MISSIONS','探险日志','从营地的第一次抛投，成长为山谷中的钓鱼老手。'],settings:['SYSTEM / SETTINGS','游戏设置','图像质量与操作提示。所有进度保存在当前浏览器中。']}[name];if(!head)return;
 $('#panelKicker').textContent=head[0];$('#panelTitle').textContent=head[1];$('#panelLead').textContent=head[2];
 let html='';
 if(name==='map')html=POINTS.map((p,i)=>`<div class="map-card"><span class="marker">0${i+1}</span><div><strong>${p.name}</strong><p>${p.short} · ${p.desc}</p></div><button data-travel="${i}">前往</button></div>`).join('')+'<p class="guide">地图在同一片连续的湖谷场景内工作。也可使用 WASD 沿岸步行移动。</p>';
 if(name==='shop'||name==='gear')html= '<div class="eyebrow">FISHING RODS / 钓竿</div><div class="card-grid" style="margin:15px 0 28px">'+RODS.map((r,i)=>card(r,i,'rod')).join('')+'</div><div class="eyebrow">LURES / 鱼饵</div><div class="card-grid" style="margin-top:15px">'+LURES.map((l,i)=>card(l,i,'lure')).join('')+'</div>';
 if(name==='species')html='<div class="fish-list">'+SPECIES.map(f=>{let g=data.gallery[f.id];return `<div class="fish-row"><div class="fish-shape">${g?fishArtwork(f):'<span class="undiscovered">?</span>'}</div><div><strong>${g?f.name:'??? · 未发现'}</strong><small>${g?f.en+' · 已捕获 '+g.count+' 次 · 最佳 '+g.best.toFixed(2)+' kg':f.rarity+' · 山谷水域'}</small></div><span class="fish-price">${g?'✓': '—'}</span></div>`}).join('')+'</div>';
 if(name==='missions')html=`<div class="item-card"><span class="card-tag">MAIN EXPLORATION / 主线进度</span><h3>${['山谷的第一条鱼','五公斤的挑战','生态观察者','自由垂钓'][Math.min(data.quest,3)]}</h3><p>${['累计捕获三条鱼，奖励 380 金币','单次钓获超过 5 kg，奖励 850 金币','解锁五种不同鱼类，奖励 1500 金币','恭喜完成三个探险目标，你可以自由发现全部鱼类'][Math.min(data.quest,3)]}</p></div><div class="guide" style="margin-top:26px">渔获总数：${data.catches}<br>累计重量：${data.weight.toFixed(2)} kg<br>最重鱼获：${data.best.toFixed(2)} kg<br>已发现物种：${Object.keys(data.gallery).length} / ${SPECIES.length}<br>等级：${data.level} · 经验：${data.xp}</div>`;
 if(name==='settings')html=`<div class="setting-row"><span>渲染分辨率</span><select id="qualityOption"><option value=".66">流畅</option><option value=".86">均衡</option><option value="1">高画质</option></select></div><div class="setting-row"><span>场景时间</span><select id="timeOption"><option value="6.7">清晨 06:42</option><option value="12.5">正午 12:30</option><option value="18.3">黄昏 18:18</option></select></div><div class="setting-row"><span>环境音效</span><button class="menu-button secondary" id="audioOption">${data.music?'已开启':'已关闭'}</button></div><p class="guide">操作：<br><code>WASD</code> 在真实地形上移动<br><code>SHIFT</code> 加速奔跑<br><code>右键拖动</code> 转动第一人称视角<br><code>左键按住</code> 蓄力，松开抛竿<br><code>SPACE</code> 咬钩扬竿；搏鱼收线<br><code>B</code> 从岸边登上独木舟 / 返回岸上<br><code>M / I / J / Q / G</code> 打开菜单</p><div class="save-tools"><button class="menu-button secondary" id="exportSave">导出存档 JSON</button><label class="menu-button secondary import-label" for="importSave">导入存档 JSON</label><input type="file" id="importSave" accept=".json,application/json" hidden /></div><button class="menu-button secondary" id="resetSave">清除本地存档（不可撤销）</button>`;
 $('#panelBody').innerHTML=html;$('#panelShade').classList.add('open');$('#panel').classList.add('open');
 if(name==='map')$$('[data-travel]').forEach(b=>b.addEventListener('click',()=>teleport(Number(b.dataset.travel))));
 if(name==='shop'||name==='gear')$$('[data-equip]').forEach(b=>b.addEventListener('click',()=>equip(b.dataset.equip,Number(b.dataset.idx))));
 if(name==='settings'){$('#qualityOption').value=String(data.quality);$('#qualityOption').addEventListener('change',e=>{data.quality=+e.target.value;state.quality=data.quality;resize();save()});$('#timeOption').value=String(data.dayTime);if(![6.7,12.5,18.3].includes(data.dayTime))$('#timeOption').value='6.7';$('#timeOption').addEventListener('change',e=>{data.dayTime=+e.target.value;save()});$('#audioOption').onclick=()=>{data.music=!data.music;syncSound();save();openPanel('settings')};$('#exportSave').onclick=()=>{let blob=new Blob([JSON.stringify({format:'wildlands-save-v1',progress:data},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='WILDLANDS-save.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)};
 $('#importSave').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>200000)throw Error('文件过大');const payload=JSON.parse(await file.text());if(payload.format!=='wildlands-save-v1'||typeof payload.progress!=='object'||!Number.isFinite(payload.progress.money)||!Number.isFinite(payload.progress.catches)||!Array.isArray(payload.progress.ownedRods)||!Array.isArray(payload.progress.ownedLures))throw Error('文件不是有效的游戏存档');if(!confirm('导入会覆盖当前游戏进度，是否继续？'))return;const parsed=payload.progress;let safe={...data, money:clamp(parsed.money,0,1e9), catches:clamp(parsed.catches,0,1e8),weight:clamp(parsed.weight,0,1e9),best:clamp(parsed.best,0,1e6),xp:clamp(parsed.xp,0,1e9),level:clamp(parsed.level,1,500),quest:clamp(parsed.quest,0,3),point:clamp(parsed.point,0,2),rod:clamp(parsed.rod,0,RODS.length-1),lure:clamp(parsed.lure,0,LURES.length-1), gallery:parsed.gallery&&typeof parsed.gallery==='object'?parsed.gallery:{},ownedRods:parsed.ownedRods.filter(n=>Number.isInteger(n)&&n>=0&&n<RODS.length),ownedLures:parsed.ownedLures.filter(n=>Number.isInteger(n)&&n>=0&&n<LURES.length)};if(!safe.ownedRods.includes(safe.rod))safe.rod=0;if(!safe.ownedLures.includes(safe.lure))safe.lure=0;localStorage.setItem(SAVEKEY,JSON.stringify(safe));location.reload()}catch(error){notify('导入失败：'+error.message,3500)}};
 $('#resetSave').onclick=()=>{if(confirm('确定删除本地所有钓鱼进度？此操作无法恢复。')){try{localStorage.removeItem(SAVEKEY)}catch(e){}location.reload()}}}
}
function card(item,i,kind){let owned=(kind==='rod'?data.ownedRods:data.ownedLures).includes(i),current=data[kind]===i;return `<div class="item-card ${current?'current':''}"><span class="card-tag">${item.en}</span><h3>${item.name}</h3><p>${item.desc}</p><div class="card-bottom"><span>◈ ${item.price.toLocaleString()}</span><button data-equip="${kind}" data-idx="${i}" ${current?'disabled':''}>${current?'使用中':owned?'装备':'购买'}</button></div></div>`}
function closePanel(){state.panel='';$('#panelShade').classList.remove('open');$('#panel').classList.remove('open')}
function keyboard(e,down){let k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();if(down){if(keyHeld.has(k))return;keyHeld.add(k)}else keyHeld.delete(k);
 if(!down)return k===' '?releaseAction():undefined;
 if(k==='escape'){if(state.panel)closePanel();else if($('#catchOverlay').classList.contains('open'))$('#continue').click();return}
 if(!state.started||state.panel||$('#catchOverlay').classList.contains('open'))return;
 if(k===' '){startAction();return}
 if(k==='r')ready();if(k==='b')toggleBoat();if(k==='m')openPanel('map');if(k==='i')openPanel('gear');if(k==='j')openPanel('species');if(k==='q')openPanel('missions');if(k==='g')openPanel('shop');
}
function initInputs(){window.addEventListener('keydown',e=>keyboard(e,true));window.addEventListener('keyup',e=>keyboard(e,false));window.addEventListener('blur',()=>{keyHeld.clear();releaseAction();rotateCamera=false});
 canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'){rotateCamera=true;dragX=e.clientX;dragY=e.clientY;try{canvas.setPointerCapture?.(e.pointerId)}catch(err){}return}if(e.button===2){rotateCamera=true;dragX=e.clientX;dragY=e.clientY;return}if(e.button===0){pointerCharge=true;try{canvas.setPointerCapture?.(e.pointerId)}catch(err){}startAction()}});
 canvas.addEventListener('pointermove',e=>{if(rotateCamera){let x=e.clientX-dragX,y=e.clientY-dragY;cam.targetYaw+=x*.0047;cam.targetPitch=clamp(cam.targetPitch-y*.0031,-.6,.38);dragX=e.clientX;dragY=e.clientY}});
 canvas.addEventListener('pointerup',e=>{if(e.button===2||e.pointerType==='touch')rotateCamera=false;if(e.button===0&&e.pointerType!=='touch'){pointerCharge=false;releaseAction()}});
 window.addEventListener('pointerup',e=>{if(e.button===2)rotateCamera=false});canvas.addEventListener('pointercancel',releaseAction);
 $('#start').onclick=()=>{state.started=true;document.body.classList.add('started');$('#loading').classList.add('hidden');syncSound();updateHUD();notify('WASD 移动 · 右键环顾 · 按住左键抛竿',4300)};
 $('#continue').onclick=()=>{$('#catchOverlay').classList.remove('open');ready()};$('#closePanel').onclick=closePanel;$('#panelShade').onclick=closePanel;
 $$('[data-panel]').forEach(b=>b.onclick=()=>openPanel(b.dataset.panel));$('#boatBtn').onclick=toggleBoat;
 $('#sound').onclick=()=>{data.music=!data.music;save();syncSound();notify(data.music?'环境音已开启':'环境音已关闭')};
 for(let [id,key] of [['tw','w'],['ta','a'],['ts','s'],['td','d']]){let b=$('#'+id);b.addEventListener('pointerdown',e=>{e.preventDefault();keyHeld.add(key)});for(let ev of ['pointerup','pointercancel','pointerleave'])b.addEventListener(ev,()=>keyHeld.delete(key))}
 $('#tlook').onclick=()=>{cam.targetYaw+=.32;cam.targetPitch=clamp(cam.targetPitch-.05,-.6,.38)};
 for(let id of ['tcast','tspace']){let b=$('#'+id);b.addEventListener('pointerdown',e=>{e.preventDefault();startAction()});for(let ev of ['pointerup','pointercancel'])b.addEventListener(ev,e=>{e.preventDefault();releaseAction()})}
 window.addEventListener('resize',resize);
}
function loop(ms){requestAnimationFrame(loop);let dt=clamp((ms-lastFrame)/1000,.001,.07);lastFrame=ms;clock+=dt;state.elapsed+=dt;drawCount++;drawSec+=dt;if(drawSec>1){state.fps=Math.round(drawCount/drawSec);drawCount=0;drawSec=0;if(state.fps<14&&state.started&&qualityAdjust<2){state.quality=Math.max(.53,state.quality*.81);resize();qualityAdjust++}}
 if(state.started){updateCamera(dt);if(!state.panel&&!$('#catchOverlay').classList.contains('open'))updateFishing(dt);animateFish(dt);if((uiTimer+=dt)>.1){updateHUD();uiTimer=0}}
 makeDynamic();renderWorld();
}
function boot(){initGPU();spawnFish();initInputs();let p=POINTS[data.point]||POINTS[0];cam.x=p.pos[0];cam.z=p.pos[1];cam.y=terrainHeight(cam.x,cam.z)+1.75;cam.yaw=cam.targetYaw=p.yaw;cam.pitch=cam.targetPitch=p.pitch;state.quality=data.quality;resize();updateHUD();requestAnimationFrame(loop)}
try{boot()}catch(error){console.error('Failed to boot Wildlands',error);$('#start').disabled=true;$('#start').textContent='图形初始化失败，请检查控制台：'+error.message}
window.WILDLANDS={getState(){return {started:state.started,phase:state.phase,power:state.power,tension:state.tension,distance:state.distance,fish:state.fish?.id||null,catches:data.catches,money:data.money,rod:data.rod,lure:data.lure,point:data.point,boat:state.boat,player:{x:cam.x,y:cam.y,z:cam.z,yaw:cam.yaw},fps:state.fps,staticVertices:models.solid?.count,foliageVertices:models.foliage?.count,waterVertices:models.water?.count,swimmingFish:state.fishSchool.length}},test:{bite(){if(state.phase!=='waiting')return false;triggerBite();return true},finish(){if(state.phase!=='fighting')return false;state.distance=0;updateFishing(.015);return true},tick(dt=1,held=false){state.reeling=held;clock+=dt;updateFishing(dt);return state.phase},setMoney(n){data.money=n;save()},setCamera(x,z,yaw=0){cam.x=x;cam.z=z;cam.targetYaw=cam.yaw=yaw;cam.y=terrainHeight(x,z)+1.75}}};
})();