/* WILDLANDS NEXT — fixed-step friendly motorboat navigation.
 * Pure functions and mutable simulation, independent of rendering/DOM.
 * Angles use the existing boat hull's +X bow axis in the X/Z lake plane.
 */
const PI2=Math.PI*2;
const valid=(v,f=0)=>Number.isFinite(v)?v:f;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,valid(v,a)));
export const DOCKS=Object.freeze([
  Object.freeze({name:'晨雾北岸码头',x:14.2,z:46.7}),
  Object.freeze({name:'白桦浅湾码头',x:-45,z:21.2}),
  Object.freeze({name:'岬角深水码头',x:43,z:-24})
]);
export const NAVIGATION_RADIUS=52;
export const MAX_FUEL=100;
export function dockLocation(index){
 const dock=DOCKS[Number.isInteger(index)&&index>=0&&index<DOCKS.length?index:0];
 return {...dock,heading:Math.atan2(-dock.z,-dock.x)};
}
export function makeBoatNavigation({x=9,z=8,heading=.7,fuel=100}={}){
 const s={
  mode:'ambient',x:valid(x,9),z:valid(z,8),heading:valid(heading,.7),
  speed:0,fuel:clamp(fuel,0,100),distance:0,travelTime:0,grounded:false,
  lastDock:0
 };
 let orbit=.7;
 const state=()=>({...s,speedKmh:Math.round(Math.abs(s.speed)*3.6*10)/10,
   distance:Math.round(s.distance*10)/10,fuel:Math.round(s.fuel*10)/10});
 function board(index=0,remainingFuel=s.fuel){
  const dock=dockLocation(index);
  s.mode='piloting';s.x=dock.x;s.z=dock.z;s.heading=dock.heading;
  s.speed=0;s.fuel=clamp(remainingFuel,0,MAX_FUEL);s.grounded=false;s.lastDock=index;
  return state();
 }
 function anchor(){
  if(s.mode!=='piloting')return false;
  s.speed=0;s.mode='anchored';return true;
 }
 function resume(){
  if(s.mode!=='anchored')return false;
  s.mode='piloting';return true;
 }
 function disembark(){
  if(s.mode!=='anchored'||Math.hypot(s.x,s.z)<45)return false;
  s.mode='parked';s.speed=0;return true;
 }
 function refuel(amount=MAX_FUEL){
  if(s.mode!=='parked'&&s.mode!=='anchored')return false;
  s.fuel=clamp(amount,0,MAX_FUEL);return true;
 }
 function update(dt,{forward=false,reverse=false,left=false,right=false,wind=0,calmness=.7,time=0}={}){
  const delta=clamp(dt,0,.1);
  if(s.mode==='ambient'){
   orbit+=delta*(.032+clamp(wind,0,1)*.03);
   const r=11.5+Math.sin(time*.11)*1.6;
   s.x=Math.cos(orbit)*r;s.z=Math.sin(orbit)*r;
   s.heading=orbit+Math.PI/2;
   s.speed=0;return state();
  }
  if(s.mode!=='piloting')return state();
  s.travelTime+=delta;
  const thrust=(forward&&s.fuel>0?1:0)-(reverse&&s.fuel>0?1:0);
  // A damped low-speed engine, not teleporting on WASD key press.
  const acceleration=thrust>0?4.1:thrust<0?-2.65:0;
  s.speed+=acceleration*delta;
  const drag=thrust? .23:1.22;
  s.speed*=Math.exp(-drag*delta);
  s.speed=clamp(s.speed,-3.0,8.4);
  if(Math.abs(s.speed)<.045&&!thrust)s.speed=0;
  const steer=(right?1:0)-(left?1:0);
  // Turning while stationary still has a little prop wash.
  s.heading+=steer*delta*(.25+Math.min(1,Math.abs(s.speed)/4)*.62)*(s.speed<-.1?-1:1);
  const current=clamp(wind,0,1)*(.12+(1-clamp(calmness,0,1))*.22);
  const dx=Math.cos(s.heading)*s.speed*delta+Math.cos(time*.14)*current*delta;
  const dz=Math.sin(s.heading)*s.speed*delta+Math.sin(time*.13)*current*delta;
  const nx=s.x+dx,nz=s.z+dz,r=Math.hypot(nx,nz);
  if(r>NAVIGATION_RADIUS){
   // Reject shoreline penetration; watercraft stays inside the playable lake.
   s.grounded=true;s.speed=0;
   const ratio=(NAVIGATION_RADIUS-.08)/Math.max(r,.001);
   s.x=nx*ratio;s.z=nz*ratio;
  }else{s.x=nx;s.z=nz;s.grounded=false}
  const travelled=Math.hypot(dx,dz);
  s.distance+=travelled;
  if(thrust&&s.fuel>0){
   s.fuel=Math.max(0,s.fuel-delta*(.45+.07*Math.abs(s.speed)));
   if(s.fuel===0)s.speed*=.5;
  }
  return state();
 }
 function setPose({x,z,heading,speed}={}){
  // Used by deterministic browser/acceptance tests and optional tutorials.
  const px=valid(x,s.x),pz=valid(z,s.z),r=Math.hypot(px,pz);
  if(r>NAVIGATION_RADIUS)return false;
  s.x=px;s.z=pz;s.heading=valid(heading,s.heading);s.speed=clamp(speed??s.speed,-3,8.4);
  return true;
 }
 return {state,board,anchor,resume,disembark,refuel,update,setPose};
}
