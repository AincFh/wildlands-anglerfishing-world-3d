import test from 'node:test';
import assert from 'node:assert/strict';
import {BAITS,baitStock,selectedBait,buyBait,consumeBait,waitForBite,chooseSpecies} from '../next/src/sim/bait.mjs';

test('four locally managed bait types offer sensible price, stock and ecology',()=>{
 assert.equal(BAITS.length,4);
 assert.equal(BAITS[0].price,0);
 assert.ok(BAITS.every(x=>x.weights.length===8));
 assert.ok(BAITS.slice(1).every(x=>x.price>0&&x.pack>0));
});
test('buy, equip and consume are transactions; failed purchase never spends money',()=>{
 const empty={1:0,2:0,3:0};
 assert.equal(selectedBait(2,empty),0);
 const fail=buyBait(100,empty,2);
 assert.equal(fail.ok,false);
 assert.equal(fail.coins,100);
 assert.equal(fail.stock[2],0);
 const purchased=buyBait(600,empty,2);
 assert.equal(purchased.ok,true);
 assert.equal(purchased.coins,320);
 assert.equal(purchased.stock[2],BAITS[2].pack);
 assert.equal(selectedBait(2,purchased.stock),2);
 let stock=purchased.stock;
 for(let i=0;i<BAITS[2].pack;i++){
  const use=consumeBait(stock,2);
  assert.equal(use.id,2);
  stock=use.stock;
 }
 assert.equal(stock[2],0);
 assert.equal(selectedBait(2,stock),0);
 assert.equal(consumeBait(stock,2).id,0);
 assert.equal(consumeBait(stock,0).stock[2],0);
});
test('tampered or old saves normalize missing and corrupted bait inventories',()=>{
 assert.deepEqual(baitStock(null),{1:0,2:0,3:0});
 assert.deepEqual(baitStock({1:-3,2:'4',3:Infinity}),{1:0,2:4,3:0});
 assert.equal(selectedBait(-1,{1:5}),0);
 assert.equal(selectedBait(999,{1:5}),0);
 assert.equal(buyBait(0,{1:2},3).stock[1],2);
});
test('bait changes the wait time for same randomized current and respects range',()=>{
 const c=waitForBite(0,.5),worm=waitForBite(1,.5);
 assert.ok(worm<c);
 assert.ok(waitForBite(3,1)>waitForBite(2,0));
 assert.ok(waitForBite(0,-100)>0);
});
test('depth, cove and bait have statistically meaningful fish distribution differences',()=>{
 function sample(bait,depth,location){
  let seed=246813579;
  const hits=Array(8).fill(0);
  for(let i=0;i<12000;i++){
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;
   const r=seed/4294967296;
   const index=chooseSpecies({bait,depth,location,random:r});
   assert.ok(index>=0&&index<8);
   hits[index]++;
  }
  return hits;
 }
 const normal=sample(0,.15,0),spinner=sample(2,.15,0);
 assert.ok(spinner[4]>normal[4]*2.2,JSON.stringify({normal,spinner}));
 const shallow=sample(0,.15,0),deep=sample(3,.94,2);
 assert.ok(deep[7]>shallow[7]*12,JSON.stringify({shallow,deep}));
 const worm=sample(1,.2,1);
 assert.ok(worm[2]+worm[3]>normal[2]+normal[3],JSON.stringify({worm,normal}));
});
