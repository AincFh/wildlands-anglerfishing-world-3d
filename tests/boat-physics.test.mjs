import test from 'node:test';
import assert from 'node:assert/strict';
import {DOCKS,MAX_FUEL,NAVIGATION_RADIUS,dockLocation,makeBoatNavigation} from '../next/src/sim/boatPhysics.mjs';
const progress=(sim,steps,controls)=>{for(let i=0;i<steps;i++)sim.update(.06,{...controls,time:i*.06,wind:.2,calmness:.74});return sim.state()};
test('three distinct shore docks start within navigable water and face lake centre',()=>{
 assert.equal(DOCKS.length,3);
 for(let i=0;i<3;i++){
  const spot=dockLocation(i);
  assert.ok(Math.hypot(spot.x,spot.z)<NAVIGATION_RADIUS);
  assert.ok(Math.cos(spot.heading)*spot.x+Math.sin(spot.heading)*spot.z<0);
 }
});
test('boarding transitions ambient boat to driven boat; throttle accelerates gradually',()=>{
 const boat=makeBoatNavigation(),start=boat.board(0,90);
 assert.equal(start.mode,'piloting');assert.equal(start.speed,0);assert.equal(start.fuel,90);
 const moved=progress(boat,60,{forward:true});
 assert.ok(moved.speed>1.5&&moved.speed<8.4,moved);
 assert.ok(moved.speedKmh>5&&moved.speedKmh<=30.3);
 assert.ok(moved.distance>1&&moved.fuel<90);
 assert.ok(Math.hypot(moved.x-start.x,moved.z-start.z)>1);
});
test('rudder genuinely turns the vessel and reverse moves backwards',()=>{
 const a=makeBoatNavigation(),b=makeBoatNavigation();
 a.board(0);b.board(0);
 progress(a,60,{forward:true,left:true});progress(b,60,{forward:true});
 assert.ok(Math.abs(a.state().heading-b.state().heading)>.1);
 assert.ok(Math.hypot(a.state().x-b.state().x,a.state().z-b.state().z)>.2);
 const c=makeBoatNavigation();c.board(0);
 const reverse=progress(c,40,{reverse:true});
 assert.ok(reverse.speed<-.3,reverse);
});
test('shores are collision walls, engine cannot leave radius 52',()=>{
 const b=makeBoatNavigation();b.board(0);
 const anchor=b.state();
 b.setPose({x:51.95,z:0,heading:0});
 const after=progress(b,300,{forward:true,wind:1});
 assert.ok(Math.hypot(after.x,after.z)<=NAVIGATION_RADIUS);
 assert.equal(after.grounded,true);
 assert.ok(after.fuel<100);
 assert.ok(Math.hypot(anchor.x,anchor.z)<NAVIGATION_RADIUS);
});
test('anchor stops and locks the hull, allows trip resume, only dockside permits leaving',()=>{
 const b=makeBoatNavigation();b.board(0);
 progress(b,25,{forward:true});
 assert.equal(b.anchor(),true);
 const spot=b.state();assert.equal(spot.mode,'anchored');assert.equal(spot.speed,0);
 progress(b,100,{forward:true,wind:0});
 assert.equal(b.state().x,spot.x);assert.equal(b.state().z,spot.z);
 assert.equal(b.disembark(),true);assert.equal(b.state().mode,'parked');
 assert.equal(b.resume(),false);
 b.board(0);progress(b,130,{forward:true});assert.ok(Math.hypot(b.state().x,b.state().z)<45);
 b.anchor();assert.equal(b.disembark(),false);
 assert.equal(b.resume(),true);
});
test('fuel does not fall while anchored or parked; empty tank cannot power the boat',()=>{
 const b=makeBoatNavigation();b.board(1,0);
 progress(b,100,{forward:true,wind:0,calmness:1});
 assert.ok(Math.abs(b.state().speed)<.1,b.state());
 assert.equal(b.state().fuel,0);
 assert.equal(b.refuel(100),false,'cannot refuel underway');
 b.anchor();assert.equal(b.refuel(75),true);
 assert.equal(b.state().fuel,75);
 const saved=b.state().fuel;
 progress(b,120,{forward:true});
 assert.equal(b.state().fuel,saved);
});
test('refuel clamps input and invalid dock index falls back safely',()=>{
 assert.equal(dockLocation(-5).name,DOCKS[0].name);
 assert.equal(dockLocation(777).name,DOCKS[0].name);
 const b=makeBoatNavigation();b.board(-20,Infinity);
 assert.equal(b.state().fuel,0);
 b.anchor();b.refuel(5000);assert.equal(b.state().fuel,MAX_FUEL);
 b.refuel(-10);assert.equal(b.state().fuel,0);
});
test('frame time spike is bounded and all navigation telemetry remains finite',()=>{
 const b=makeBoatNavigation();b.board(2);
 for(const dt of [100,NaN,-4,Infinity,.016,.1]){
  const s=b.update(dt,{forward:true,left:true,wind:Infinity,time:0});
  for(const k of ['x','z','speed','fuel','distance','heading','speedKmh'])assert.ok(Number.isFinite(s[k]),k);
  assert.ok(Math.hypot(s.x,s.z)<=NAVIGATION_RADIUS);
 }
 assert.equal(b.setPose({x:1000,z:0}),false);
});
