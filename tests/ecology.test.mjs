import test from 'node:test';
import assert from 'node:assert/strict';
import {habitat,chooseLakeSpecies,biteSeconds,speciesForecast,FISH_NAMES} from '../next/src/sim/ecology.mjs';
const almost=(a,b,eps=1e-9)=>assert.ok(Math.abs(a-b)<=eps,`${a} ≠ ${b}`);
test('all eight probabilities are finite, normalized and nonzero across extreme conditions',()=>{
 for(const t of [0,.27,.5,.75,.98,NaN,Infinity]){
  for(const weather of [0,.5,1]){
   const e=habitat({bait:3,depth:.95,location:2,timeOfDay:t,weather,wind:1});
   almost(e.probabilities.reduce((a,b)=>a+b,0),1);
   assert.equal(e.probabilities.length,8);
   assert.ok(e.weights.every(w=>w>0&&Number.isFinite(w)));
  }
 }
});
test('world climate and daylight actually influence target fish probabilities',()=>{
 const day=habitat({bait:2,depth:.64,location:2,timeOfDay:.5,weather:0});
 const dusk=habitat({bait:2,depth:.64,location:2,timeOfDay:.75,weather:.85});
 assert.ok(dusk.probabilities[6]>day.probabilities[6]*1.4);
 const midnight=habitat({bait:3,depth:.95,timeOfDay:.95});
 const noon=habitat({bait:3,depth:.95,timeOfDay:.5});
 assert.ok(midnight.probabilities[7]>noon.probabilities[7]*1.3);
});
test('a forecast is the same distribution from which casts select fish',()=>{
 const opts={bait:1,location:1,depth:.28,timeOfDay:.29,weather:.2};
 const ranked=speciesForecast(opts);
 assert.equal(ranked.length,8);
 assert.ok(ranked.every(x=>FISH_NAMES.includes(x.name)));
 const hits=Array(8).fill(0);
 const n=12000;
 for(let i=0;i<n;i++)hits[chooseLakeSpecies({...opts,random:(i+.5)/n})]++;
 const e=habitat(opts);
 for(let i=0;i<8;i++)assert.ok(Math.abs(hits[i]/n-e.probabilities[i])<.0025,`${i}: forecast ${e.probabilities[i]} observed ${hits[i]/n}`);
});
test('weather, activity and wind change real bite wait and remain bounded',()=>{
 const at={bait:0,depth:.3,location:0,random:.5};
 const calmNoon=biteSeconds({...at,timeOfDay:.51,weather:0,wind:.2});
 const evening=biteSeconds({...at,timeOfDay:.75,weather:.35,wind:.2});
 assert.ok(evening<calmNoon,{calmNoon,evening});
 for(const v of [-999,0,2,Infinity,NaN])assert.ok(biteSeconds({...at,timeOfDay:v,wind:v,weather:v})>=2.3);
});
test('invalid probability inputs never produce impossible fish indices',()=>{
 assert.ok(speciesForecast({bait:999,depth:NaN,location:999}).length===8);
 assert.ok(chooseLakeSpecies({random:Infinity})>=0&&chooseLakeSpecies({random:Infinity})<8);
});
