/* WILDLANDS NEXT — actual underwater fish schools.
 * Pure deterministic steering (no Three.js, DOM, timers or global randomness).
 * Groups respond to daylight, weather, real bait locations and line disturbances.
 * Successful fish are removed from their visible school until they respawn.
 */
import {habitat,chooseLakeSpecies} from './ecology.mjs';

const PI2=Math.PI*2;
const PI=Math.PI;
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,finite(v,a)));
const SPOTS=Object.freeze([
  {x:13,z:35},{x:-28,z:15},{x:25,z:-16},{x:-3,z:-28},
  {x:22,z:14},{x:-21,z:-21}
]);
function rng(seed){
 let state=(seed>>>0)||4242;
 return ()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296};
}
function angleDifference(a,b){
 let d=(b-a+PI)%PI2;
 if(d<0)d+=PI2;
 return d-PI;
}
export function createLakeSchoolSimulation({seed=4242,count=40}={}){
 const random=rng(seed),total=clamp(Math.floor(count),0,72);
 const fish=[];
 const groupSpecies=[];
 const now=habitat({});
 for(let i=0;i<SPOTS.length;i++)
  groupSpecies.push(chooseLakeSpecies({bait:0,depth:Math.min(.85,.2+i*.12),location:i%3,timeOfDay:now.timeOfDay,random:random()}));
 for(let i=0;i<total;i++){
  const school=i%SPOTS.length,spot=SPOTS[school],a=random()*PI2,r=1+random()*5.2;
  fish.push({
   id:i+1,school,species:groupSpecies[school],x:spot.x+Math.cos(a)*r,z:spot.z+Math.sin(a)*r,
   y:-.9-random()*1.3,heading:random()*PI2,speed:.55+random()*.38,
   depth:.9+random()*1.15,phase:random()*PI2,scatter:0,
   cooldown:0,reserved:false
  });
 }
 let time=0;
 const conditions={timeOfDay:.36,weather:.05,wind:.26,bait:0,location:0,depth:.3};
 function update(dt,{timeOfDay=.36,weather=.05,wind=.26,bait=null,disturbance=null}={}){
  const delta=clamp(dt,0,.12);time+=delta;
  conditions.timeOfDay=clamp(timeOfDay,0,.999999);
  conditions.weather=clamp(weather,0,1);conditions.wind=clamp(wind,0,1);
  const env=habitat(conditions);
  const night=conditions.timeOfDay<.21||conditions.timeOfDay>.83;
  for(const f of fish){
   if(f.cooldown>0){f.cooldown=Math.max(0,f.cooldown-delta);continue}
   if(f.reserved)continue;
   const c=SPOTS[f.school];
   const orbit=time*(.11+f.school*.012)+f.school*.75;
   const baseX=c.x+Math.sin(orbit)*5,baseZ=c.z+Math.cos(orbit*.87)*4.7;
   const offset=f.phase+time*(.21+f.school*.014);
   let tx=baseX+Math.sin(offset)*3.5, tz=baseZ+Math.cos(offset*1.06)*3.2;
   // The actual submerged hook emits an attractive, short-range bait plume.
   if(bait&&Number.isFinite(bait.x)&&Number.isFinite(bait.z)){
    const d=Math.hypot(f.x-bait.x,f.z-bait.z);
    if(d<20){
     const pull=(1-d/20)*(.46+Math.min(.36,env.activity*.28));
     tx=tx*(1-pull)+bait.x*pull;
     tz=tz*(1-pull)+bait.z*pull;
    }
   }
   if(disturbance&&Number.isFinite(disturbance.x)&&Number.isFinite(disturbance.z)){
    const dx=f.x-disturbance.x,dz=f.z-disturbance.z;
    if(Math.hypot(dx,dz)<9){f.scatter=Math.max(f.scatter,2.8)}
   }
   if(f.scatter>0){
    f.scatter=Math.max(0,f.scatter-delta);
    const dx=f.x-(disturbance?.x??baseX),dz=f.z-(disturbance?.z??baseZ);
    const d=Math.max(.5,Math.hypot(dx,dz));
    tx=f.x+dx/d*10;tz=f.z+dz/d*10;
   }
   // Local fish-to-fish avoidance: prevents a single stack of overlapping props.
   let sx=0,sz=0;
   for(const other of fish){
    if(other===f||other.school!==f.school||other.cooldown>0||other.reserved)continue;
    const dx=f.x-other.x,dz=f.z-other.z,d2=dx*dx+dz*dz;
    if(d2>.001&&d2<2.2){sx+=dx/d2;sz+=dz/d2}
   }
   tx+=sx*1.7;tz+=sz*1.7;
   // The shoreline is solid. Steering aims back to the lake interior before
   // any fish could clip through the bank.
   const edge=Math.hypot(f.x,f.z);
   if(edge>42){tx+=-f.x*.6;tz+=-f.z*.6}
   const desired=Math.atan2(tz-f.z,tx-f.x);
   const turn=clamp(angleDifference(f.heading,desired),-delta*1.3,delta*1.3);
   f.heading+=turn;
   const targetSpeed=(.55+.60*env.activity)*(f.scatter>0?2.35:1);
   f.speed+=(targetSpeed-f.speed)*Math.min(1,delta*2.6);
   f.x+=Math.cos(f.heading)*f.speed*delta;
   f.z+=Math.sin(f.heading)*f.speed*delta;
   const r=Math.hypot(f.x,f.z);
   if(r>45){f.x*=44.8/r;f.z*=44.8/r;f.heading+=PI*.7}
   const targetDepth=(night?1.4:.9)+((f.id%5)*.19)+Math.min(.42,conditions.weather*.25);
   f.depth+=(targetDepth-f.depth)*Math.min(1,delta*.7);
   f.y=-f.depth+.09*Math.sin(time*2.1+f.phase);
  }
  return fish;
 }
 function scan(x,z,radius=13){
  const r=clamp(radius,1,150);
  return fish.filter(f=>!f.reserved&&f.cooldown===0&&Math.hypot(f.x-x,f.z-z)<=r)
   .map(f=>({id:f.id,species:f.species,x:f.x,z:f.z,depth:f.depth,distance:Math.hypot(f.x-x,f.z-z)}))
   .sort((a,b)=>a.distance-b.distance);
 }
 let currentHookId=null;
 function hookNear(x,z,environment={},chance=.5){
  if(currentHookId!==null)return null;
  const nearby=scan(x,z,14);
  if(!nearby.length)return null;
  const env=habitat(environment);
  const weights=nearby.map(f=>Math.max(.00001,(env.probabilities[f.species]||0)*.4+.07)
    *Math.pow(1-f.distance/15,2));
  let n=weights.reduce((a,b)=>a+b,0)*clamp(chance,0,.999999);
  let chosen=nearby.at(-1);
  for(let i=0;i<nearby.length;i++){n-=weights[i];if(n<0){chosen=nearby[i];break}}
  const f=fish[chosen.id-1];f.reserved=true;currentHookId=f.id;
  return {id:f.id,species:f.species,distance:chosen.distance};
 }
 function settleHook(landed=false){
  if(currentHookId===null)return false;
  const f=fish[currentHookId-1];
  f.reserved=false;f.scatter=landed?0:4.5;
  if(landed)f.cooldown=17+f.school*2;
  currentHookId=null;return true;
 }
 return {fish,update,scan,hookNear,settleHook,
  get activeCount(){return fish.filter(f=>f.cooldown===0&&!f.reserved).length},
  get caughtCount(){return fish.filter(f=>f.cooldown>0).length},
  get reservedCount(){return currentHookId===null?0:1},
  get time(){return time}
 };
}
