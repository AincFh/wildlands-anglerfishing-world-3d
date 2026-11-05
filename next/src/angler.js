/* WILDLANDS NEXT — fishing gameplay layer on the MIT Luminous Lake scene.
   Original interaction logic. Uses Three.js world units (metres) and a deterministic
   state machine; scene inspection/debug handle exposed for browser smoke tests. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {makeFishModel} from './world/fishModel.js';
import {BAITS, baitStock, selectedBait, buyBait, consumeBait, waitForBite, chooseSpecies} from './sim/bait.mjs';
import {CONTRACTS, normalizeContracts, recordCatch, claimContract, availableClaims, contractUnlocked} from './sim/contracts.mjs';
import {habitat,chooseLakeSpecies,biteSeconds,speciesForecast,SPOT_NAMES} from './sim/ecology.mjs';
import {normalizeCatchLog,recordLanding,journalStats} from './sim/catchLog.mjs';
import {LINE_SEGMENTS,lineCurve} from './sim/linePhysics.mjs';

const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const lerp=(a,b,t)=>a+(b-a)*t;
const SPECIES=[
 {name:'虹鳟',en:'Rainbow trout',min:.6,max:5.8,pull:.48,value:145,rare:'常见',color:0xc1c8a0},
 {name:'大口黑鲈',en:'Largemouth bass',min:.8,max:6.4,pull:.63,value:180,rare:'常见',color:0x455e42},
 {name:'黄鲈',en:'Yellow perch',min:.3,max:2.3,pull:.37,value:105,rare:'常见',color:0xc9a951},
 {name:'镜鲤',en:'Mirror carp',min:1.4,max:14,pull:.88,value:230,rare:'常见',color:0xb59b74},
 {name:'北方狗鱼',en:'Northern pike',min:2,max:13,pull:1.06,value:380,rare:'稀有',color:0x6d9269},
 {name:'湖鳟',en:'Lake trout',min:1.5,max:9.8,pull:.94,value:290,rare:'稀有',color:0x7b939b},
 {name:'帝王鲑',en:'King salmon',min:4,max:22,pull:1.37,value:670,rare:'史诗',color:0x8d9ca2},
 {name:'湖鲟',en:'Lake sturgeon',min:6,max:42,pull:1.6,value:1150,rare:'传说',color:0x757e71}
];
const GEAR=[
 {name:'旅行者溪流竿',price:0,drag:1.0,reel:1.0,range:1},
 {name:'RANGER 碳素远投',price:750,drag:1.15,reel:1.12,range:1.13},
 {name:'SUMMIT 远岸战斗竿',price:2100,drag:1.36,reel:1.34,range:1.22},
 {name:'APEX 钛合金旗舰',price:5800,drag:1.65,reel:1.68,range:1.42}
];
const KEY='wildlands-next-2026';
const firstSave=()=>({coins:1200,catches:0,best:0,gear:0,owned:[0],collection:{},location:0,bait:0,baitStock:{1:0,2:0,3:0},contracts:normalizeContracts(),catchLog:[]});
function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(!v||typeof v!=='object')return firstSave();const stock=baitStock(v.baitStock);return {...firstSave(),...v,collection:typeof v.collection==='object'&&v.collection?v.collection:{},owned:Array.isArray(v.owned)?v.owned:[0],baitStock:stock,bait:selectedBait(v.bait,stock),contracts:normalizeContracts(v.contracts),catchLog:normalizeCatchLog(v.catchLog)}}catch{return firstSave()}}
const FISHING_ROD='https://cdn.3dassets.dev/assets/22406/v1/model.glb';
function cylinderBetween(a,b,r0,r1,material,segments=8){
 const len=a.distanceTo(b),geo=new THREE.CylinderGeometry(r1,r0,len,segments);
 const mesh=new THREE.Mesh(geo,material);mesh.position.copy(a).add(b).multiplyScalar(.5);
 mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());return mesh;
}
function makeFallbackRod(){
 const group=new THREE.Group();
 const grip=new THREE.MeshStandardMaterial({color:0x765037,metalness:.05,roughness:.86});
 const shaft=new THREE.MeshStandardMaterial({color:0x1d3430,metalness:.54,roughness:.33});
 const metal=new THREE.MeshStandardMaterial({color:0xb4bbad,metalness:.87,roughness:.20});
 const path=[new THREE.Vector3(0,0,0),new THREE.Vector3(.015,.12,-.6),new THREE.Vector3(.06,.19,-1.3),new THREE.Vector3(.12,.26,-2.15)];
 group.add(cylinderBetween(path[0],path[1],.047,.022,grip,10));
 group.add(cylinderBetween(path[1],path[2],.021,.011,shaft,8));
 group.add(cylinderBetween(path[2],path[3],.011,.004,shaft,7));
 for(let i=1;i<=3;i++){const p=path[i];const ring=new THREE.Mesh(new THREE.TorusGeometry(.052-(i*.012),.005,7,24),metal);
   ring.position.set(p.x,p.y,p.z);ring.rotation.x=.18;group.add(ring)}
 const spool=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.07,20),metal);
 spool.rotation.z=Math.PI/2;spool.position.set(-.095,-.07,-.3);group.add(spool);
 const reelBody=new THREE.Mesh(new THREE.SphereGeometry(.062,12,8),shaft);
 reelBody.position.set(-.12,-.07,-.30);group.add(reelBody);
 const handle=cylinderBetween(new THREE.Vector3(-.16,-.08,-.3),new THREE.Vector3(-.22,-.17,-.32),.013,.012,metal);
 group.add(handle);return group;
}
function makeBobber(){
 const group=new THREE.Group();
 const ivory=new THREE.MeshStandardMaterial({color:0xf8efe2,metalness:0,roughness:.34});
 const crimson=new THREE.MeshStandardMaterial({color:0xdc4b32,metalness:.05,roughness:.32});
 const cap=new THREE.Mesh(new THREE.SphereGeometry(.13,14,10),ivory);group.add(cap);
 const tip=new THREE.Mesh(new THREE.CylinderGeometry(.075,.11,.15,14),crimson);tip.position.y=.1;group.add(tip);
 const stem=new THREE.Mesh(new THREE.CylinderGeometry(.014,.014,.16,8),ivory);stem.position.y=.25;group.add(stem);
 const ringGeo=new THREE.RingGeometry(.16,.18,44);
 const rings=[];
 for(let i=0;i<2;i++){const mesh=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:0xd7f2e3,side:THREE.DoubleSide,transparent:true,opacity:.25,depthWrite:false}));
 mesh.rotation.x=-Math.PI/2;mesh.position.y=-.085-i*.005;group.add(mesh);rings.push(mesh)}
 return {group,rings};
}

export function createAngler(world){
 const scene=world.scene,camera=world.camera;
 const ui=(id)=>document.getElementById(id);
 const state={phase:'ready',power:0,charging:false,reeling:false,elapsed:0,castT:0,waitT:0,biteT:0,distance:0,tension:.2,stress:0,slack:0,stamina:1,drag:.55,fish:null,weight:0,location:0,worldX:0,worldZ:0,started:false,model:'carbon-fiber',activeBait:0};
 let saveData=load(),totalTime=0,toastTimer=null;
 state.location=clamp(saveData.location|0,0,2);
 scene.add(camera); // first-person rod stays in the camera's local coordinate system
 const rodPivot=new THREE.Group();rodPivot.position.set(.46,-.60,-1.20);camera.add(rodPivot);
 let rodMesh=makeFallbackRod();rodPivot.add(rodMesh);
 // Optional real CC0 glTF asset; fallback always works if the CDN is blocked.
 const loader=new GLTFLoader();
 if(new URLSearchParams(location.search).get('rod')==='kit')loader.load(FISHING_ROD,(asset)=>{
  const m=asset.scene;m.rotation.x=-Math.PI/2;m.scale.setScalar(.85);
  m.traverse(o=>{if(o.isMesh){o.castShadow=false;o.frustumCulled=false}});
  rodPivot.remove(rodMesh);rodMesh=m;rodPivot.add(m);state.model='cc0-glb';
 },undefined,()=>{state.model='procedural-fallback'});
 const bobber=makeBobber();scene.add(bobber.group);bobber.group.visible=false;
 const fishModel=makeFishModel();scene.add(fishModel.group);fishModel.group.visible=false;
 const geom=new THREE.BufferGeometry();const linePos=new Float32Array(LINE_SEGMENTS*3);
 geom.setAttribute('position',new THREE.BufferAttribute(linePos,3));
 const line=new THREE.Line(geom,new THREE.LineBasicMaterial({color:0xe2dfcf,transparent:true,opacity:.88,depthTest:true}));
 scene.add(line);line.visible=false;line.frustumCulled=false;
 const temp=new THREE.Vector3(),tip=new THREE.Vector3(),from=new THREE.Vector3(),target=new THREE.Vector3();
 const ripples=bobber.rings;
 function store(){try{localStorage.setItem(KEY,JSON.stringify(saveData))}catch{}}
 function hint(tag,text,detail){ui('statusTag').textContent=tag;ui('instruction').textContent=text;ui('hint').textContent=detail}
 function event(title,detail){ui('eventTitle').textContent=title;ui('eventText').textContent=detail}
 function toast(text){const el=ui('toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2200)}
 const audioBase=new URL('../../assets/',import.meta.url);
 const sfxUrls={
   cast:new URL('cast.wav',audioBase).href,
   splash:new URL('splash.wav',audioBase).href,
   catch:new URL('catch.wav',audioBase).href
 };
 const ambience=new Audio(new URL('morning_forest.wav',audioBase).href);
 ambience.loop=true;ambience.volume=.12;ambience.preload='none';
 let audioEnabled=true;
 function ambientPlay(){
   if(audioEnabled&&state.started&&!document.hidden)ambience.play().catch(()=>{});
 }
 function playCue(name){
   if(!audioEnabled||!sfxUrls[name])return;
   try{
     const audio=new Audio(sfxUrls[name]);audio.volume=name==='catch'?.33:.22;
     audio.play().catch(()=>{});
   }catch{}
 }
 function sound(freq=440,len=.1){if(!audioEnabled)return;try{const AC=window.AudioContext||window.webkitAudioContext;
   if(!AC)return;const c=sound.ctx||(sound.ctx=new AC());const osc=c.createOscillator(),gain=c.createGain();
   osc.type='sine';osc.frequency.setValueAtTime(freq,c.currentTime);gain.gain.setValueAtTime(.013,c.currentTime);
   gain.gain.exponentialRampToValueAtTime(.001,c.currentTime+len);osc.connect(gain).connect(c.destination);osc.start();osc.stop(c.currentTime+len)}catch{}}
 function updateFunds(){ui('funds').textContent='金币 '+saveData.coins.toLocaleString()+' · 鱼获 '+saveData.catches;
  if(ui('contracts')){const ready=availableClaims(saveData.contracts,saveData.catches);ui('contracts').textContent=ready?'委托 · '+ready+' 可领取':'湖泊委托'}const b=BAITS[saveData.bait];const n=saveData.bait===0?'∞':(saveData.baitStock[saveData.bait]||0);if(ui('baitHud'))ui('baitHud').textContent='当前饵料 '+b.name+' · '+n+' 份 · 装备中可购买补充' }
 function setPhase(v){state.phase=v;state.elapsed=0;state.charging=false;state.reeling=false;ui('fight').hidden=v!=='fighting';
  const labels={ready:'抛竿',charging:'蓄力',flying:'抛投中',waiting:'收回',bite:'提竿!',fighting:'收线',caught:'继续',failed:'重试'};
  ui('cast').textContent=labels[v]||'抛竿';ui('controlHelp').textContent={
   ready:'按住蓄力 · 松开抛投',charging:'松开按键 · 准备抛投',flying:'观察鱼漂入水',
   waiting:'等待鱼讯 · 点击收回',bite:'立即按下提竿！',fighting:'按住持续收线 · 松开释放张力',
   caught:'点击重新开始',failed:'点击重新开始'}[v];
  ui('powerFill').style.width=v==='charging'?'0%':v==='fighting'?'0%':'0%';
 }
 function viewLocation(i){
  if(state.phase!=='ready'&&state.phase!=='caught'&&state.phase!=='failed'){toast('先完成本次抛竿，再切换钓点');return}
  state.location=i;saveData.location=i;store();
  const spots=[{pos:[18,65],title:'晨雾北岸 · NORTH BANK'},
    {pos:[-61,27],title:'白桦浅湾 · BIRCH COVE'},
    {pos:[57,-32],title:'岬角深水 · ROCKY POINT'}];
  const spot=spots[i];camera.position.set(spot.pos[0],world.terrain.heightAt(spot.pos[0],spot.pos[1])+1.73,spot.pos[1]);
  const inward=new THREE.Vector3(-spot.pos[0],0,-spot.pos[1]).normalize();
  world.director.controls.target.copy(camera.position).addScaledVector(inward,25);
  world.director.controls.update();event(spot.title,'观察水面反光及鱼群动向，再决定抛投位置。');toast('已抵达 '+spot.title);
 }
 function beginCharge(){
  if(!state.started||!ui('modal').hidden||!ui('intro').hidden)return;
  if(state.phase==='ready'||state.phase==='caught'||state.phase==='failed'){if(fishModel.group.parent===camera){scene.add(fishModel.group);fishModel.group.visible=false;fishModel.group.scale.setScalar(1)}setPhase('charging');state.power=.03;state.charging=true;hint('蓄力中','控制合适的抛投力度','松开空格或抛竿按钮，鱼饵将飞向湖面');sound(360,.035)}
  else if(state.phase==='bite')hook();
  else if(state.phase==='fighting')state.reeling=true;
  else if(state.phase==='waiting')reset();
 }
 function endCharge(){
  if(state.phase==='charging'){state.charging=false;cast()}
  else if(state.phase==='fighting')state.reeling=false;
 }
 function projectAim(power=state.power){
  // Calculate an actual line/surface intersection. Never teleport an
  // invalid cast to the middle of the lake when looking back at the forest.
  const dir=new THREE.Vector3();camera.getWorldDirection(dir);dir.y=0;
  if(dir.lengthSq()<.0001)return {ok:false,reason:'请面向湖泊'};
  dir.normalize();
  const b=camera.position.x*dir.x+camera.position.z*dir.z;
  const c=camera.position.x**2+camera.position.z**2-54.5**2;
  const discriminant=b*b-c;
  if(b>=0||discriminant<=.01)return {ok:false,reason:'请转向水面'};
  const root=Math.sqrt(discriminant);
  const entry=-b-root,exit=-b+root;
  const requested=(14+39*clamp(power,.03,1))*GEAR[saveData.gear].range;
  if(requested<entry+1.5)return {ok:false,reason:'需要增加抛投力度'};
  const travel=Math.min(requested,exit-1.5);
  if(travel<entry+1.5)return {ok:false,reason:'角度太偏，请调整朝向'};
  const x=camera.position.x+dir.x*travel,z=camera.position.z+dir.z*travel;
  return {ok:true,x,z,travel,depth:Math.max(0,1-Math.hypot(x,z)/54.5)};
 }
 function cast(){
  if(state.phase!=='charging')return;
  const aim=projectAim();
  if(!aim.ok){
   setPhase('ready');hint('抛投方向无效',aim.reason,'拖动镜头对准湖面后重新蓄力');toast(aim.reason);sound(200,.10);
   return;
  }
  camera.updateWorldMatrix(true,false);rodPivot.updateWorldMatrix(true,false);
  tip.set(.15,.25,-2.15);rodPivot.localToWorld(tip);from.copy(tip);
  target.set(aim.x,0,aim.z);
  state.worldX=target.x;state.worldZ=target.z;state.depth=aim.depth;
  state.activeBait=selectedBait(saveData.bait,saveData.baitStock);
  state.castT=0;setPhase('flying');bobber.group.visible=true;line.visible=true;
  bobber.group.position.copy(from);
  hint('鱼饵飞行中',aim.travel.toFixed(1)+' 米抛投 · 观察落点','松开镜头操作，让鱼漂自然入水');
  playCue('cast');sound(280,.10);
 }
 function beginWaiting(){
  // Consume a premium lure ONLY when the bobber reaches the water. Invalid
  // casts never spend bait; swapping equipment after the cast cannot change
  // that cast's species distribution.
  const used=consumeBait(saveData.baitStock,state.activeBait);
  state.activeBait=used.id;saveData.baitStock=used.stock;
  if(saveData.bait!==0&&!(used.stock[saveData.bait]>0))saveData.bait=0;
  store();updateFunds();
  const conditions=world.getState();
  world.shoals.setBait({x:state.worldX,z:state.worldZ});
  state.castEnvironment={bait:state.activeBait,depth:state.depth,location:state.location,
   timeOfDay:conditions.timeOfDay,weather:conditions.weather,wind:conditions.wind};
  setPhase('waiting');state.waitT=biteSeconds({...state.castEnvironment,random:Math.random()});state.biteT=2.6;
  hint('等待鱼讯',BAITS[state.activeBait].name+' 已入水 · 观察鱼漂','鱼漂突然下沉时，按空格或点击提竿');
  event('鱼漂已落在湖面','已使用 '+BAITS[state.activeBait].name+'，钓点与深浅会影响鱼种。');playCue('splash');sound(170,.14);
 }
 function hook(){
  if(state.phase!=='bite')return;
  // A visible fish from the swimming school can take this bait; distant
  // underwater fish are still generated by the established ecology model.
  const nearby=world.shoals.hookNear(state.worldX,state.worldZ,state.castEnvironment,Math.random());
  const idx=nearby?.species??chooseLakeSpecies({...state.castEnvironment,random:Math.random()});
  state.hookFromSchool=!!nearby;
  world.shoals.setBait(null);world.shoals.scare({x:state.worldX,z:state.worldZ});
  state.fish=SPECIES[idx];state.weight=+(Math.min(state.fish.max,lerp(state.fish.min,state.fish.max,Math.pow(Math.random(),1.7))*BAITS[state.activeBait].weight)).toFixed(2);
  state.distance=21+state.power*30;state.tension=.16;state.stamina=1;state.stress=0;state.slack=0;
  setPhase('fighting');hint('搏鱼中','根据张力调整泄力并收线','按住空格/按钮收线 · 张力过高及时松开');
  event('鱼已上钩 · '+state.fish.name,state.fish.en+(state.hookFromSchool?' · 来自可见水下鱼群':' · 深水鱼讯')+' · 注意张力！');
  fishModel.setSpecies(idx);fishModel.animate(totalTime,.92);
  fishModel.material.color.setHex(state.fish.color);fishModel.group.visible=true;sound(780,.16);
 }
 function fail(message){
  world.shoals.settleHook(false);world.shoals.setBait(null);world.shoals.scare(null);
  setPhase('failed');state.fish=null;fishModel.group.visible=false;bobber.group.visible=false;line.visible=false;
  hint('本次失败',message,'点击中央按钮重新抛竿');event('鱼逃脱了',message+'。改变泄力与收线节奏，下一次会更好。');sound(200,.24);
 }
 function land(){
  world.shoals.settleHook(true);world.shoals.setBait(null);world.shoals.scare(null);
  const fish=state.fish;
  const payout=Math.round(fish.value*(.65+state.weight/(fish.min+fish.max)*1.5));
  saveData.coins+=payout;saveData.catches++;saveData.best=Math.max(saveData.best,state.weight);
  const entry=saveData.collection[fish.name]||{count:0,best:0};
  entry.count++;entry.best=Math.max(entry.best,state.weight);saveData.collection[fish.name]=entry;
  const mission=recordCatch(saveData.contracts,{species:fish.name,weight:state.weight,location:state.location,bait:state.activeBait,depth:state.depth},saveData.catches);
  saveData.contracts=mission.progress;
  const env=state.castEnvironment||world.getState();
  saveData.catchLog=recordLanding(saveData.catchLog,{species:fish.name,weight:state.weight,
   location:state.location,bait:state.activeBait,depth:state.depth,time:env.timeOfDay,
   weather:env.weather,payout,number:saveData.catches});
  store();setPhase('caught');bobber.group.visible=false;line.visible=false;
  // Present the actual animated 3D fish in a cinematic first-person
  // trophy reveal, instead of text-only capture results.
  camera.add(fishModel.group);
  fishModel.group.position.set(-.38,-.16,-2.9);
  fishModel.group.rotation.set(.03,1.22,0);
  fishModel.group.scale.setScalar(.94);
  fishModel.group.visible=true;
  hint('成功上岸','捕获 '+fish.name+' · '+state.weight.toFixed(2)+' kg','获得 '+payout+' 枚金币 · 点击继续');
  event('完美上岸 · '+fish.name,'重量 '+state.weight.toFixed(2)+' kg · 奖励 '+payout+' 金币');updateFunds();sound(970,.3);
  playCue('catch');toast(mission.completed.length?'委托完成 '+mission.completed.length+' 项 · 前往委托台领奖':'收获 '+fish.name+' '+state.weight.toFixed(2)+' kg！');
 }
 function reset(){world.shoals.settleHook(false);world.shoals.setBait(null);world.shoals.scare(null);bobber.group.visible=false;fishModel.group.visible=false;scene.add(fishModel.group);fishModel.group.scale.setScalar(1);line.visible=false;state.fish=null;setPhase('ready');
  hint('准备抛投','寻找水面波纹，选择抛投力度','WASD 沿湖岸移动 · 拖动环顾 · 空格蓄力')}
 function adjustDrag(n){state.drag=clamp(state.drag+n,.2,.90);ui('drag').textContent='泄力 '+Math.round(state.drag*100)+'%';sound(460,.035)}
 function openModal(title,html){const pane=ui('modal');ui('modalTitle').textContent=title;ui('modalBody').innerHTML=html;pane.hidden=false}
 function shop(){
  const cards=GEAR.map((g,i)=>{
   const bought=saveData.owned.includes(i),selected=saveData.gear===i;
   return '<article class="item"><b>'+g.name+'</b><small>抗拉 ×'+g.drag.toFixed(2)+' · 收线 ×'+g.reel.toFixed(2)+' · 远投 ×'+g.range.toFixed(2)+'</small><button data-gear="'+i+'" '+(selected||!bought&&saveData.coins<g.price?'disabled':'')+'>'+(selected?'已装备':bought?'装备':'购买 · '+g.price.toLocaleString()+' 金币')+'</button></article>';
  }).join('');
  const lures=BAITS.map((b,i)=>{
   const count=i===0?'无限':(saveData.baitStock[i]||0)+' 份';
   const equipped=saveData.bait===i,available=i===0||(saveData.baitStock[i]||0)>0;
   return '<article class="item"><b>'+b.name+' · '+b.en+'</b><small>'+b.detail+'</small><small>咬钩速度 ×'+(1/b.wait).toFixed(2)+' · 库存 '+count+'</small>'+
     '<button data-bait-equip="'+i+'" '+(equipped||!available?'disabled':'')+'>'+(equipped?'已装备':'选择饵料')+'</button>'+
     (i===0?'':'<button data-bait-buy="'+i+'" '+(saveData.coins<b.price?'disabled':'')+'>购买 '+b.pack+' 份 · '+b.price+' 金币</button>')+'</article>';
  }).join('');
  openModal('装备与饵料 · '+saveData.coins.toLocaleString()+' 金币',
    '<h3 class="catalog-title">FISHING RODS / 钓竿</h3><div class="catalog">'+cards+'</div>'+
    '<h3 class="catalog-title">BAIT & ECOLOGY / 饵料 · 水域生态</h3><div class="catalog">'+lures+'</div>');
  document.querySelectorAll('[data-gear]').forEach(btn=>btn.onclick=()=>{
    const i=+btn.dataset.gear,g=GEAR[i];if(!saveData.owned.includes(i)){if(saveData.coins<g.price)return;
    saveData.coins-=g.price;saveData.owned.push(i)}saveData.gear=i;store();updateFunds();shop();toast('已装备 '+g.name)});
  document.querySelectorAll('[data-bait-buy]').forEach(btn=>btn.onclick=()=>{
    const i=+btn.dataset.baitBuy,tx=buyBait(saveData.coins,saveData.baitStock,i);
    if(!tx.ok)return;saveData.coins=tx.coins;saveData.baitStock=tx.stock;
    store();updateFunds();shop();toast('购入 '+BAITS[i].name+' · '+BAITS[i].pack+' 份')});
  document.querySelectorAll('[data-bait-equip]').forEach(btn=>btn.onclick=()=>{
    const i=+btn.dataset.baitEquip;
    if(selectedBait(i,saveData.baitStock)!==i)return;
    saveData.bait=i;store();updateFunds();shop();toast('已选择 '+BAITS[i].name)});
 }
 function journal(){
  const cards=SPECIES.map(f=>{const saved=saveData.collection[f.name];
  return '<article class="item"><b>'+f.name+'</b><small>'+f.en+' · '+f.rare+'</small><small>'+(saved?'鱼获 '+saved.count+' · 最大 '+saved.best.toFixed(2)+' kg':'尚未发现')+'</small></article>'}).join('');
  const notes=saveData.catchLog.slice().reverse().slice(0,20).map(x=>{
    const minutes=Math.floor(x.time*1440),time=String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
    return '<div class="field-row"><b>'+x.species+'</b><span>'+x.weight.toFixed(2)+' kg · '+SPOT_NAMES[x.location]+' · '+BAITS[x.bait].name+'</span><small>'+time+' · '+(x.weather>.68?'风雨':x.weather>.3?'多云':'晴朗')+' · '+x.payout+' 金币</small></div>';
  }).join('');
  const stats=journalStats(saveData.catchLog);
  openModal('湖泊鱼类图鉴 · '+Object.keys(saveData.collection).length+'/'+SPECIES.length,
    '<div class="catalog">'+cards+'</div>'+
    '<h3 class="catalog-title" style="margin-top:23px">FIELD JOURNAL / 最近 20 次鱼获</h3>'+
    '<p class="contract-intro">本地保存最近 40 条鱼获，包含钓点、饵料、天气、时段与金币。旧版鱼获计数仍会保留。</p>'+
    '<div class="field-stats">近期 '+stats.count+' 次 · '+stats.unique+' 种鱼 · 收益 '+stats.totalEarned.toLocaleString()+' 金币</div>'+
    (notes||'<p class="contract-intro">目前还没有垂钓记录。第一条鱼获会自动写入。</p>'));

 }
 function contractsMenu(){
  const progress=normalizeContracts(saveData.contracts);
  const cards=CONTRACTS.map(job=>{
   const unlocked=contractUnlocked(job,saveData.catches);
   const count=progress.counts[job.id],done=count>=job.goal,claimed=progress.claimed[job.id];
   const status=!unlocked?'累计钓获 '+job.unlock+' 条后解锁':claimed?'奖励已领取':done?'目标完成 · 等待领取':'进度 '+count+' / '+job.goal;
   const action=unlocked&&done&&!claimed?'<button type="button" data-contract-claim="'+job.id+'">领取 '+job.reward.toLocaleString()+' 金币</button>':'';
   return '<article class="item contract-item'+(done?' complete':'')+'"><div class="contract-kicker">'+(unlocked?'RANGER COMMISSION':'LOCKED · 未解锁')+'</div><b>'+job.name+'</b><small>'+job.detail+'</small><div class="contract-track"><span style="width:'+Math.round(count/job.goal*100)+'%"></span></div><small>'+status+' · 奖励 '+job.reward.toLocaleString()+' 金币</small>'+action+'</article>';
  }).join('');
  openModal('湖泊巡护委托 · '+availableClaims(progress,saveData.catches)+' 项待领奖',
   '<p class="contract-intro">完成垂钓调查，积累金币升级钓具。任务在本机存档中持续保留，奖励每项仅可领取一次。</p><div class="catalog">'+cards+'</div>');
  document.querySelectorAll('[data-contract-claim]').forEach(btn=>btn.onclick=()=>{
   const result=claimContract(saveData.contracts,btn.dataset.contractClaim,saveData.catches);
   if(!result.ok)return;
   saveData.contracts=result.progress;saveData.coins+=result.reward;
   store();updateFunds();contractsMenu();sound(1040,.18);toast('巡护奖励 +'+result.reward.toLocaleString()+' 金币');
  });
 }
 function locationMenu(){
  const w=world.getState(),depth=[.30,.22,.72][state.location],center={x:150,y:150},scout=speciesForecast({
   bait:saveData.bait,depth,location:state.location,timeOfDay:w.timeOfDay,weather:w.weather,wind:w.wind});
  const environment=habitat({bait:saveData.bait,depth,location:state.location,timeOfDay:w.timeOfDay,weather:w.weather,wind:w.wind});
  const stations=[{x:18,z:65},{x:-61,z:27},{x:57,z:-32}];
  const circles=stations.map((spot,i)=>{
   const x=center.x+spot.x*1.15,y=center.y+spot.z*1.15;
   return '<g><circle cx="'+x+'" cy="'+y+'" r="'+(i===state.location?9:6)+'" fill="'+(i===state.location?'#d0f0ac':'#9acaca')+'" stroke="#06262d" stroke-width="3"/>'+
    '<text x="'+x+'" y="'+(y-15)+'" text-anchor="middle" fill="#f1fff6" font-size="10">'+SPOT_NAMES[i]+'</text></g>';
  }).join('');
  const map='<svg viewBox="0 0 300 300" role="img" aria-label="山谷湖泊水深等深线与三处钓点" class="sonar-map">'+
    '<defs><radialGradient id="lakeDepth"><stop stop-color="#133f58"/><stop offset=".57" stop-color="#25647a"/><stop offset="1" stop-color="#407d79"/></radialGradient></defs>'+
    '<rect width="300" height="300" rx="18" fill="#112d31"/>'+
    '<circle cx="150" cy="150" r="93" stroke="#638e78" stroke-width="26" fill="#294f4c"/>'+
    '<circle cx="150" cy="150" r="74" fill="url(#lakeDepth)" stroke="#90c0a0" stroke-width="2"/>'+
    '<circle cx="150" cy="150" r="56" fill="none" stroke="#b1e8ec" stroke-opacity=".24" stroke-dasharray="5 7"/>'+
    '<circle cx="150" cy="150" r="32" fill="none" stroke="#b1e8ec" stroke-opacity=".32"/>'+
    '<text x="150" y="146" fill="#d8eef1" font-size="10" text-anchor="middle">DEEP WATER</text>'+
    '<text x="150" y="161" fill="#b4d5d5" font-size="10" text-anchor="middle">深水区</text>'+circles+
    '<text x="14" y="25" fill="#c0e5d2" font-size="10" letter-spacing="2">LAKE SURVEY</text>'+
    '<text x="285" y="25" fill="#c0e5d2" text-anchor="end" font-size="11">N ↑</text>'+
    '</svg>';
  // Live count derives from actual 3D fish instances, not a fake fixed stat.
  const actualFish=world.shoals.scan(camera.position.x*.62,camera.position.z*.62,19);
  const bars=scout.slice(0,5).map(x=>'<div class="sonar-species"><span>'+x.name+'</span><div class="contract-track"><span style="width:'+Math.max(3,x.percent)+'%"></span></div><b>'+x.percent.toFixed(1)+'%</b></div>').join('');
  const controls=SPOT_NAMES.map((name,i)=>'<button class="sonar-spot'+(i===state.location?' selected':'')+'" type="button" data-spot="'+i+'">'+name+(i===state.location?' · 当前':'')+'</button>').join('');
  openModal('湖泊探鱼仪 · '+SPOT_NAMES[state.location],
   '<p class="contract-intro">这里展示当前时段、天气、水深和所选饵料下的鱼群出现概率。实际抛投会锁定落点水深与当时环境，鱼获按同一套生态模型生成。</p>'+
   '<div class="sonar-layout">'+map+'<section class="sonar-data"><div class="contract-kicker">LIVE ECOLOGY / 水域预测</div>'+
   '<h3>'+environment.conditions.period+' · '+environment.conditions.weather+'</h3>'+
   '<small>当前饵料 '+BAITS[saveData.bait].name+' · 活动指数 '+Math.round(environment.activity*100)+'%</small>'+
   '<div class="sonar-bars">'+bars+'</div><div class="sonar-live"><b>水下实体追踪 · '+actualFish.length+' 条</b><small>这些是附近正在自主游动的 3D 鱼影。实际命中鱼种取决于鱼群位置与生态，远处还有未被发现的深水鱼。</small></div></section></div>'+
   '<h3 class="catalog-title">选择岸线 / MOVE TO FISHING SPOT</h3><div class="sonar-spots">'+controls+'</div>');
  document.querySelectorAll('[data-spot]').forEach(btn=>btn.onclick=()=>{ui('modal').hidden=true;viewLocation(+btn.dataset.spot)});
 }
 ui('close').onclick=()=>ui('modal').hidden=true;
 ui('modal').onclick=e=>{if(e.target===ui('modal'))ui('modal').hidden=true};
 ui('shop').onclick=shop;ui('journal').onclick=journal;ui('location').onclick=locationMenu;ui('contracts').onclick=contractsMenu;
 ui('daytime').onclick=()=>{state.dayPartIndex=((state.dayPartIndex??0)+1)%4;const entries=[['晨光',.30],['正午',.50],['落日',.745],['星夜',.91]];const [name,value]=entries[state.dayPartIndex];world.setTimeOfDay(value,{resumeCycle:true});toast('时段调整 · '+name)};
 ui('weather').onclick=()=>{const w=(state.weatherLevel||0)+1;state.weatherLevel=w%3;world.setWeather([0,.52,.93][state.weatherLevel]);
  world.setWind([.20,.52,.85][state.weatherLevel]);toast(['晴日天气','山谷薄雾','风雨将至'][state.weatherLevel])};
 ui('dragDown').onclick=()=>adjustDrag(-.05);ui('dragUp').onclick=()=>adjustDrag(.05);
 const walkingKeys=new Set();
 document.querySelectorAll('#touchMove button[data-move]').forEach(button=>{
   const key=button.dataset.move;
   button.addEventListener('pointerdown',e=>{
     e.preventDefault();button.setPointerCapture(e.pointerId);
     walkingKeys.add(key);button.classList.add('pressed');
   });
   const release=()=>{walkingKeys.delete(key);button.classList.remove('pressed')};
   button.addEventListener('pointerup',release);
   button.addEventListener('pointercancel',release);
   button.addEventListener('lostpointercapture',release);
 });
 window.addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD'].includes(e.code)){walkingKeys.add(e.code);e.preventDefault()}});
 window.addEventListener('keyup',e=>{walkingKeys.delete(e.code)});
 window.addEventListener('blur',()=>walkingKeys.clear());
 function walk(dt){
  if(walkingKeys.size===0||!['ready','caught','failed'].includes(state.phase)||!state.started)return;
  const fwd=new THREE.Vector3();camera.getWorldDirection(fwd);fwd.y=0;fwd.normalize();
  const right=new THREE.Vector3(-fwd.z,0,fwd.x);
  const dir=new THREE.Vector3();
  if(walkingKeys.has('KeyW'))dir.add(fwd);
  if(walkingKeys.has('KeyS'))dir.sub(fwd);
  if(walkingKeys.has('KeyD'))dir.add(right);
  if(walkingKeys.has('KeyA'))dir.sub(right);
  if(dir.lengthSq()<.01)return;dir.normalize();
  const speed=5.2,step=dir.clone().multiplyScalar(speed*dt);
  const xx=camera.position.x+step.x,zz=camera.position.z+step.z;
  const r=Math.hypot(xx,zz);if(r<59||r>110)return;
  const floor=world.terrain.heightAt(xx,zz)+1.73;
  camera.position.x=xx;camera.position.z=zz;
  camera.position.y=lerp(camera.position.y,floor,Math.min(1,dt*9));
  world.director.controls.target.add(step);
  world.director.controls.target.y+=Math.min(1,dt*9)*(floor-camera.position.y);
 }
 const action=ui('cast');action.addEventListener('pointerdown',e=>{e.preventDefault();action.setPointerCapture(e.pointerId);beginCharge()});
 action.addEventListener('pointerup',e=>{e.preventDefault();endCharge()});
 action.addEventListener('pointercancel',endCharge);
 window.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();if(e.repeat)return;beginCharge()}
 if(e.key==='Escape')ui('modal').hidden=true;if(e.key==='r'||e.key==='R'){if(state.phase==='waiting')reset()}
 if(e.key==='['||e.key==='-')adjustDrag(-.05);if(e.key===']'||e.key==='=')adjustDrag(.05)});
 window.addEventListener('keyup',e=>{if(e.code==='Space'){e.preventDefault();endCharge()}});
 document.addEventListener('visibilitychange',()=>{
   if(document.hidden){state.reeling=false;state.charging=false;ambience.pause()}
   else ambientPlay();
 });
 ui('audioToggle').onclick=()=>{
   audioEnabled=!audioEnabled;
   ui('audioToggle').textContent=audioEnabled?'环境音：开':'环境音：关';
   if(audioEnabled)ambientPlay();else ambience.pause();
 };
 ui('play').onclick=()=>{
  ui('intro').hidden=true;ui('hud').hidden=false;state.started=true;world.setTimeOfDay(.31,{resumeCycle:true});world.setWind(.26);
  world.setMist(.25);world.setCalmness(.78);updateFunds();ambientPlay();
  // User gesture unlocks WebAudio (no autoplay sound).
  viewLocation(state.location);
 };
 updateFunds();setPhase('ready');
 function update(dt){
  totalTime+=dt;state.elapsed+=dt;
  if(!state.started)return;
  walk(dt);
  const aimMarker=ui('aim');
  const showingAim=state.phase==='ready'||state.phase==='charging';
  aimMarker.style.opacity=showingAim?'.86':'0';
  if(showingAim){
    const aim=projectAim(state.phase==='charging'?state.power:.49);
    aimMarker.classList.toggle('bad',!aim.ok);
    ui('aimText').textContent=aim.ok?
      ('预计 '+aim.travel.toFixed(0)+' m · '+(aim.depth>.46?'深水':'浅滩')):
      aim.reason;
  }
  if(state.phase==='caught'&&fishModel.group.parent===camera){
    fishModel.animate(totalTime,.24);
    fishModel.group.rotation.y=1.22+Math.sin(totalTime*.7)*.18;
    fishModel.group.rotation.z=Math.sin(totalTime*1.3)*.045;
    fishModel.group.position.y=-.12+Math.sin(totalTime*1.6)*.055;
    if(state.elapsed>7)fishModel.group.visible=false;
  }
  const sway=(state.phase==='charging'?.31:state.phase==='fighting'?Math.sin(totalTime*7)*.13:.03*Math.sin(totalTime*1.5));
  rodPivot.rotation.x=lerp(rodPivot.rotation.x,-sway,clamp(dt*6));
  rodPivot.rotation.z=lerp(rodPivot.rotation.z,state.phase==='fighting'?Math.sin(totalTime*13)*.033:0,clamp(dt*8));
  if(state.phase==='charging'){
   state.power=clamp(state.power+dt*.54,.03,1);ui('powerFill').style.width=Math.round(state.power*100)+'%';
   if(state.power>=1)ui('powerFill').style.background='#faac79';
  }
  const visible=state.phase==='flying'||state.phase==='waiting'||state.phase==='bite'||state.phase==='fighting';
  if(visible){
   if(state.phase==='flying'){
    state.castT+=dt*1.38;const p=clamp(state.castT);bobber.group.position.copy(from).lerp(target,p);
    bobber.group.position.y=lerp(from.y,0,p)+Math.sin(Math.PI*p)*6.2;
    if(p>=1)beginWaiting();
   }else{
    const oscillation=Math.sin(totalTime*2.4)*.065;
    bobber.group.position.set(state.worldX,oscillation,state.worldZ);
    if(state.phase==='waiting'){
     state.waitT-=dt;if(state.waitT<=0){setPhase('bite');state.biteT=2.8;hint('鱼正在咬钩！','鱼漂突然下沉，立即扬竿！','按空格或点击“提竿” · 窗口只有 2.8 秒');event('鱼漂急剧下沉！','这是提竿时机。请立刻按空格或点击中央按钮。');sound(920,.12)}
    }else if(state.phase==='bite'){
     state.biteT-=dt;bobber.group.position.y=-.1-Math.abs(Math.sin(totalTime*9))*.38;
     if(state.biteT<=0)fail('扬竿过慢，鱼吃掉了鱼饵');
    }else if(state.phase==='fighting'){
     const fish=state.fish,power=fish.pull*(.72+.28*Math.sin(totalTime*1.9));
     const burst=Math.max(0,Math.sin(totalTime*1.26+fish.pull*5))**8;
     const aimed=state.reeling?.25+power*.43*state.drag+burst*.23:.08+power*.18;
     state.tension=clamp(lerp(state.tension,aimed,dt*2.5),0,1.1);
     state.stress=state.tension>.80?state.stress+dt*(state.tension-.80)*4.3:Math.max(0,state.stress-dt*.32);
     state.slack=state.tension<.06?state.slack+dt:Math.max(0,state.slack-dt);
     if(state.reeling){state.distance-=dt*(3.5*GEAR[saveData.gear].reel*(1-state.tension*.42)-burst*power*.55);
       state.stamina=Math.max(0,state.stamina-dt*.047)}
     else{state.distance+=dt*(power*.32+burst*.68);state.stamina=clamp(state.stamina+dt*.004)}
     state.distance=Math.max(0,state.distance);
     bobber.group.position.x=state.worldX+Math.sin(totalTime*.66)*clamp(state.distance*.12,0,3);
     bobber.group.position.z=state.worldZ+Math.cos(totalTime*.77)*clamp(state.distance*.09,0,3);
     bobber.group.position.y=-.2+Math.sin(totalTime*4)*.09;
     fishModel.group.position.set(bobber.group.position.x, -.62+Math.sin(totalTime*1.6)*.1,bobber.group.position.z);
     // Swim and fight rather than spinning the entire fish like a propeller.
     fishModel.animate(totalTime,Math.min(1,.66+burst*.32));
     fishModel.group.rotation.y=Math.sin(totalTime*.79)*.34;
     fishModel.group.rotation.z=Math.sin(totalTime*1.15)*.065;
     const tensionPct=Math.round(state.tension*100);
     ui('tensionFill').style.width=Math.min(100,tensionPct)+'%';ui('tensionNum').textContent=tensionPct+'%';
     ui('distance').textContent=state.distance.toFixed(1)+' m';
     if(state.stress>1.02)fail('张力过高，鱼线断裂');
     else if(state.slack>3.8)fail('鱼线过松，鱼脱钩了');
     else if(state.distance>95)fail('鱼游出了线杯的长度');
     else if(state.distance<=2.2&&state.stamina<.88)land();
    }
   }
   const rp=rodPivot.localToWorld(temp.set(.13,.23,-2.10));
   // Swing of the elastic line, not a straight 2-point rigid tether.
   const fp=bobber.group.position;
   lineCurve(rp,fp,{tension:state.phase==='fighting'?state.tension:.14,
     wind:world.getState().wind,time:totalTime},linePos);
   geom.attributes.position.needsUpdate=true;
   const rt=totalTime*1.25;for(let i=0;i<ripples.length;i++){ripples[i].scale.setScalar(1+((rt+i*.55)%2)*1.6);
     ripples[i].material.opacity=Math.max(0,.21-((rt+i*.55)%2)*.09)}
  }
 }
 return {state,update,viewLocation,reset,beginCharge,endCharge,getState:()=>({
  phase:state.phase,started:state.started,model:state.model,power:state.power,
  distance:state.distance,tension:state.tension,coins:saveData.coins,catches:saveData.catches,
  rodCount:rodPivot.children.length,trophyVisible:state.phase==='caught'&&fishModel.group.visible,fish3DMeshes:fishModel.meshCount,bobberVisible:bobber.group.visible,
  lineVisible:line.visible,fish:state.fish?.name||null,location:state.location,
  hookFromSchool:!!state.hookFromSchool,schoolFishNearFloat:world.shoals.scan(state.worldX,state.worldZ,14).length,
  bait:saveData.bait,baitName:BAITS[saveData.bait].name,activeBait:state.activeBait,baitStock:{...saveData.baitStock},
  contractsReady:availableClaims(saveData.contracts,saveData.catches),contractsCompleted:CONTRACTS.filter(job=>saveData.contracts.claimed[job.id]).length,
  recentCatchCount:saveData.catchLog.length,lineSegments:LINE_SEGMENTS,liveHabitat:habitat({
    bait:saveData.bait,depth:[.30,.22,.72][state.location],location:state.location,
    timeOfDay:world.getState().timeOfDay,weather:world.getState().weather,wind:world.getState().wind}).conditions,
  fishShape:fishModel.getShape().label,fishTailYaw:fishModel.getPose().tailYaw,fishRigScale:{x:fishModel.rig.scale.x,y:fishModel.rig.scale.y,z:fishModel.rig.scale.z}
 }),debug:{forceBite(){if(state.phase==='waiting'){state.waitT=0}},forceFish(){if(state.phase==='bite')hook()},forceCatch(){if(state.phase==='fighting'){state.distance=1;state.stamina=0}},setCoins(n){saveData.coins=n;store();updateFunds()}}};
}
