import test from 'node:test';
import assert from 'node:assert/strict';
import {createLakeSchoolSimulation} from '../next/src/sim/lakeSchools.mjs';

const env={timeOfDay:.31,weather:.05,wind:.2};
const round=f=>[+f.x.toFixed(5),+f.z.toFixed(5),f.species,+f.heading.toFixed(5)];
test('fish cohorts are reproducible from seeds and initialized in actual lake',()=>{
 const a=createLakeSchoolSimulation({seed:123,count:42});
 const b=createLakeSchoolSimulation({seed:123,count:42});
 assert.deepEqual(a.fish.map(round),b.fish.map(round));
 assert.equal(a.fish.length,42);assert.equal(a.activeCount,42);
 assert.ok(a.fish.every(f=>Math.hypot(f.x,f.z)<45 && f.species>=0&&f.species<8));
});
test('simulation is finite, respects actual lake shoreline and does not allocate more fish',()=>{
 const lake=createLakeSchoolSimulation({seed:17,count:48});
 const identities=[...lake.fish],before=lake.fish.map(x=>[x.x,x.z]);
 for(let i=0;i<350;i++)lake.update(.1,{timeOfDay:i%110/110,weather:i%10/10,wind:i%13/13});
 assert.equal(lake.fish.length,48);
 assert.ok(lake.fish.every((f,i)=>f===identities[i]));
 assert.ok(lake.fish.every(f=>Number.isFinite(f.x)&&Number.isFinite(f.z)&&Number.isFinite(f.y)&&
   Number.isFinite(f.heading)&&Number.isFinite(f.speed)&&Math.hypot(f.x,f.z)<=45));
 assert.ok(lake.fish.some((f,i)=>Math.hypot(f.x-before[i][0],f.z-before[i][1])>.7));
});
test('actual submerged hook removes one fish until landed and cooldown expires',()=>{
 const s=createLakeSchoolSimulation({seed:9,count:42});
 const f=s.fish[0];
 const first=s.hookNear(f.x,f.z,env,0);
 assert.ok(first);assert.equal(s.reservedCount,1);
 assert.equal(s.activeCount,41);
 assert.ok(s.scan(f.x,f.z,1).every(x=>x.id!==first.id));
 assert.equal(s.hookNear(f.x,f.z,env,0),null,'one rod cannot hook twice');
 assert.equal(s.settleHook(true),true);
 assert.equal(s.reservedCount,0);assert.equal(s.caughtCount,1);
 assert.equal(s.settleHook(true),false);
 for(let i=0;i<230;i++)s.update(.12,env);
 assert.equal(s.caughtCount,0);
 assert.equal(s.activeCount,42);
});
test('escaping releases live fish instead of recording a successful landing',()=>{
 const s=createLakeSchoolSimulation({seed:41,count:24});
 const f=s.fish[0];
 const hooked=s.hookNear(f.x,f.z,env,0);
 assert.ok(hooked);
 assert.equal(s.settleHook(false),true);
 assert.equal(s.activeCount,24);
 assert.equal(s.caughtCount,0);
 assert.ok(s.fish.find(x=>x.id===hooked.id).scatter>0);
});
test('bait plume attracts fish and alarm scatters them, not static decoration',()=>{
 const a=createLakeSchoolSimulation({seed:63,count:42});
 const b=createLakeSchoolSimulation({seed:63,count:42});
 const sample=a.fish[0],position={x:sample.x+5,z:sample.z+4};
 for(let i=0;i<180;i++){
  a.update(.06,{...env,bait:position});
  b.update(.06,env);
 }
 assert.ok(Math.hypot(a.fish[0].x-b.fish[0].x,a.fish[0].z-b.fish[0].z)>.1,
  'bait should change fish movement, not just their appearance');
 const c=createLakeSchoolSimulation({seed:63,count:42});
 const d=createLakeSchoolSimulation({seed:63,count:42});
 for(let i=0;i<60;i++){c.update(.06,{...env,disturbance:{x:d.fish[0].x,z:d.fish[0].z}});d.update(.06,env)}
 assert.ok(c.fish.some((f,i)=>Math.hypot(f.x-d.fish[i].x,f.z-d.fish[i].z)>.15));
});
test('scan only reveals nearby real fish, validates radius and busy status',()=>{
 const s=createLakeSchoolSimulation({seed:71,count:42});
 assert.equal(s.scan(999,999,10).length,0);
 const near=s.scan(s.fish[0].x,s.fish[0].z,1);
 assert.ok(near.length>=1&&near[0].distance<.00001);
 const hooked=s.hookNear(s.fish[0].x,s.fish[0].z,env,0);
 assert.ok(hooked);
 assert.ok(s.scan(s.fish[0].x,s.fish[0].z,14).every(x=>x.id!==hooked.id));
});
test('mobile and desktop populations can be lowered without changing API',()=>{
 const mobile=createLakeSchoolSimulation({seed:1,count:20});
 const desktop=createLakeSchoolSimulation({seed:1,count:48});
 const off=createLakeSchoolSimulation({seed:1,count:0});
 assert.equal(mobile.activeCount,20);
 assert.equal(desktop.activeCount,48);
 assert.equal(off.activeCount,0);
 assert.equal(off.hookNear(1,1,env,.5),null);
});
